import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { getSessionUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";
import { parseXLSX, type XLSXParseResult } from "../../../lib/xlsx-parser";
import { chunkDocument } from "../../../lib/knowledge-search";

const NO_TEXT_FOUND = "[PDF appears to be scanned/image-based - no extractable text found]";

// GET /api/admin/knowledge — list all knowledge files
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const files = await prisma.factoryKnowledge.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(files);
}

// POST /api/admin/knowledge — upload file
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileType = getFileType(file.name);
    let content = "";
    let metadata: Record<string, unknown> = {
      originalSize: file.size,
      uploadedAt: new Date().toISOString(),
    };

    if (fileType === "txt") {
      content = buffer.toString("utf-8");
    } else if (fileType === "csv") {
      content = buffer.toString("utf-8");
    } else if (fileType === "xlsx") {
      // Parse XLSX and extract structured summary
      const parseResult: XLSXParseResult = parseXLSX(buffer);
      content = parseResult.summary;
      metadata = {
        ...metadata,
        sheets: parseResult.sheets.map((s) => ({
          name: s.name,
          headers: s.headers,
          rowCount: s.rowCount,
        })),
        totalRows: parseResult.rowCount,
        parseStatus: "success",
      };
    } else if (fileType === "pdf") {
      try {
        const result = await pdfParse(buffer);
        const text = result.text.trim();
        if (text.length === 0) {
          content = NO_TEXT_FOUND;
          metadata = { ...metadata, parseStatus: "failed", numPages: result.numpages };
        } else {
          content = text;
          metadata = { ...metadata, parseStatus: "success", numPages: result.numpages };
        }
      } catch (err) {
        content = NO_TEXT_FOUND;
        metadata = {
          ...metadata,
          parseStatus: "failed",
          parseError: err instanceof Error ? err.message : String(err),
        };
      }
    }

    // Create knowledge file record
    const knowledge = await prisma.factoryKnowledge.create({
      data: {
        filename: file.name,
        fileType,
        fileSize: file.size,
        content: content.slice(0, 50000), // Limit to 50k chars for summary
        uploadedBy: user.id,
        metadata: metadata as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
      include: { user: { select: { name: true } } },
    });

    // Chunk the document and save chunks for RAG search
    const { chunks } = chunkDocument(content, file.name);
    await Promise.all(
      chunks.map((chunkContent, idx) =>
        prisma.knowledgeChunk.create({
          data: {
            knowledgeId: knowledge.id,
            chunkIndex: idx,
            content: chunkContent,
          },
        }),
      ),
    );

    return NextResponse.json(knowledge, { status: 201 });
  } catch (err) {
    console.error("[knowledge] upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

function getFileType(filename: string): "txt" | "csv" | "xlsx" | "pdf" {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "txt") return "txt";
  if (ext === "csv") return "csv";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "pdf") return "pdf";
  return "txt"; // default
}
