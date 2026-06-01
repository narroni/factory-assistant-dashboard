import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";

// GET /api/admin/knowledge — list all knowledge files
export async function GET(req: NextRequest) {
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

    if (fileType === "txt") {
      content = buffer.toString("utf-8");
    } else if (fileType === "csv") {
      content = buffer.toString("utf-8");
    } else if (fileType === "xlsx") {
      // For now, store filename and size; actual parsing happens on upload
      content = `[XLSX file: ${file.name}]\nSize: ${Math.round(file.size / 1024)} KB\nPlease parse manually or implement xlsx parser.`;
    } else if (fileType === "pdf") {
      content = `[PDF file: ${file.name}]\nSize: ${Math.round(file.size / 1024)} KB\nPDF parsing available later.`;
    }

    const knowledge = await prisma.factoryKnowledge.create({
      data: {
        filename: file.name,
        fileType,
        fileSize: file.size,
        content: content.slice(0, 50000), // Limit to 50k chars
        uploadedBy: user.id,
        metadata: {
          originalSize: file.size,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

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
