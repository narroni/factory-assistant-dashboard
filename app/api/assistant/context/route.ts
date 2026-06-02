import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";
import { loadFactoryContext } from "../../../lib/factory-context";
import { findRelevantChunks, formatRelevantChunks } from "../../../lib/knowledge-search";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const question = (body.question ?? "").trim();

  const ctx = await loadFactoryContext();
  const rules = await prisma.aIRule.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  // Load relevant knowledge for the question
  let knowledgeText = "";
  try {
    const knowledgeFiles = await prisma.factoryKnowledge.findMany({
      where: { enabled: true },
      include: { chunks: { select: { content: true, chunkIndex: true } } },
    });

    const allChunks: { content: string; filename: string; chunkIndex: number }[] = [];
    for (const file of knowledgeFiles) {
      for (const chunk of file.chunks) {
        allChunks.push({ content: chunk.content, filename: file.filename, chunkIndex: chunk.chunkIndex });
      }
    }

    if (allChunks.length > 0 && question) {
      const relevantChunks = findRelevantChunks(
        allChunks.map((c) => c.content),
        allChunks.map((c) => ({ sourceFile: c.filename, chunkIndex: c.chunkIndex })),
        question,
        5,
      );
      knowledgeText = formatRelevantChunks(relevantChunks);
    }
  } catch (err) {
    console.warn("[context] knowledge search failed:", err);
  }

  const rulesText = rules.length > 0
    ? ["ADMIN RULES:", ...rules.map((r, i) => `${i + 1}. ${r.text}`)].join("\n")
    : null;

  return NextResponse.json({
    rules: rules.map((r) => ({ id: r.id, text: r.text, enabled: r.enabled })),
    rulesText,
    knowledge: knowledgeText || null,
    factoryContext: ctx,
  });
}
