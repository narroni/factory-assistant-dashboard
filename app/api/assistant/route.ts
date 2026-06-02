import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../lib/session";
import { loadFactoryContext } from "../../lib/factory-context";
import { runCopilot, checkOllamaHealth, type ConversationMessage, type ActionProposal } from "../../lib/ollama";
import { prisma } from "../../lib/prisma";
import { calculatePackaging, formatPackagingResultText } from "../../lib/packaging-calculator";

export type AssistantRequest = {
  question: string;
  chatId?: string;           // persist to this chat; omit to use ephemeral mode
  history?: ConversationMessage[];
  language?: string;
};

export type AssistantResponse = {
  question: string;
  answer: string;
  ollamaUsed: boolean;
  fallbackReason?: string;
  proposals: ActionProposal[];
  savedRequestIds: string[];
  chatId?: string;
  respondedAt: string;
};

// ── Conversational short-circuits ─────────────────────────────────────────────

const GREETING = /^(hi|hey|hello|good\s*(morning|afternoon|evening)|howdy|greetings|how\s+are\s+(you|u|ya)|how.*going|how.*doing)[!.,?\s]*$/i;
const THANKS   = /^(thanks?|thank you|ty|cheers|appreciate|great|perfect|awesome|nice)[!.,?\s]*$/i;
const HELP_RX  = /^(help|what can you do|what.*capabilities|how.*use)[?.\s]*$/i;

function shortCircuit(question: string, language: string): string | null {
  const de = language === "de";
  if (GREETING.test(question)) {
    const isHowAreYou = /how\s+(are|r)\s+(you|u|ya)|how.*going|how.*doing/i.test(question);
    if (de) {
      return isHowAreYou
        ? "Mir geht es gut, danke! Ich bin Ihr Fabrik-Copilot. Womit kann ich Ihnen helfen?"
        : "Hallo! Ich bin Ihr Fabrik-Copilot. Ich kann Fragen zu Materialien, Bestellungen, Lieferanten und Produkten beantworten.";
    }
    return isHowAreYou
      ? "I'm running smoothly and ready to help with your factory operations! What would you like to know?"
      : "Hello! I'm your Factory Operations Copilot. I can answer questions about inventory, orders, suppliers, and products. What can I help you with?";
  }
  if (THANKS.test(question)) {
    return de
      ? "Gerne! Lassen Sie mich wissen, wenn ich noch etwas tun kann."
      : "You're welcome! Let me know if you need anything else.";
  }
  if (HELP_RX.test(question)) {
    return de
      ? "Ich kann helfen mit: Lageranalyse, Bestellungsverfolgung, Lieferantenleistung, Produktionsplanung, Kapazitätsschätzungen und Berichterstellung."
      : "I can help with: inventory analysis, order tracking, supplier performance, production planning, capacity estimates, and report generation. Just ask me anything about your factory data.";
  }
  return null;
}

// ── Packaging context helpers ─────────────────────────────────────────────────

const PACKAGING_KEYWORDS = /\b(ship|container|crate|crating|tower|pallet|20ft|40ft|packaging|pack|pieces|pcs|payload|volume|footprint|cargo|load|fit)\b/i;

// Try to extract (articleCode, quantity, containerType) from a free-text question
function detectPackagingQuery(question: string): { articleCode: string | null; qty: number | null; containerName: string | null } {
  // Container type
  let containerName: string | null = null;
  if (/\b40\s*ft\b|\b40\s*foot\b|\b40-foot\b/i.test(question)) containerName = "40ft";
  else if (/\b20\s*ft\b|\b20\s*foot\b|\b20-foot\b/i.test(question)) containerName = "20ft";

  // Quantity: look for number followed by "pieces", "pcs", "units", or just a large standalone number
  let qty: number | null = null;
  const qtyMatch = question.match(/\b(\d[\d,\s]*\d|\d+)\s*(?:pieces?|pcs?|units?)/i)
    ?? question.match(/\b([\d,]+)\s+(?:of|x)\s+[A-Z]/i)
    ?? question.match(/\b(\d{4,})\b/);
  if (qtyMatch) {
    qty = parseInt(qtyMatch[1].replace(/[,\s]/g, ""), 10) || null;
  }

  // Article code: known codes or pattern like RD..., RR..., RL...
  let articleCode: string | null = null;
  const codeMatch = question.match(/\b(RD001\s+EURO\s+PALET|RDG500\/1[,.]25|RDG600\/1[,.]25|RDL002|RDL011\s+LARSSON|RDL011\/1[,.]4|RDL011\/1[,.]6|RLG500\/1[,.]6s|RDL400[^,\s"]+|RR021\/150|RR030|RR031)\b/i);
  if (codeMatch) articleCode = codeMatch[1].trim();

  return { articleCode, qty, containerName };
}

async function buildPackagingContext(question: string): Promise<string> {
  // Always include a summary of available blade products if question is packaging-related
  if (!PACKAGING_KEYWORDS.test(question)) return "";

  const products = await prisma.bladeProductSpec.findMany({
    include: { crateType: true },
    orderBy: { articleCode: "asc" },
  });
  const containers = await prisma.containerType.findMany({ orderBy: { name: "asc" } });

  if (products.length === 0) return "";

  const catalog = products.map((p) =>
    `  ${p.articleCode}: ${p.productName}, ${p.lengthMm}×${p.widthMm}×${p.thicknessMm}mm, ` +
    `${p.pcsPerCrate} pcs/crate (${p.crateType.code}), ${p.weightAfterPunchingKg} kg/pc (punched), max ${p.maxCratesPerTower} crates/tower`
  ).join("\n");

  const containerSummary = containers.map((c) =>
    `  ${c.name}: ${c.lengthMeters}m × ${c.widthMeters}m floor, max ${c.maxPayloadKg.toLocaleString()} kg, max ${c.maxVolumeM3} m³`
  ).join("\n");

  let calcBlock = "";
  const { articleCode, qty, containerName } = detectPackagingQuery(question);
  if (articleCode && qty && qty > 0 && containerName) {
    try {
      const result = await calculatePackaging({ articleCode, qty, containerName });
      calcBlock = `\n\n[DETERMINISTIC CALCULATION RESULT — use these exact numbers]\n${formatPackagingResultText(result)}`;
      console.info(`[assistant] packaging calc injected: ${articleCode} × ${qty} → ${containerName}: ${result.overallFits ? "FITS" : "NO FIT"}`);
    } catch (e) {
      calcBlock = `\n\n[PACKAGING NOTE: Could not compute for "${articleCode}" × ${qty} → ${containerName}: ${e instanceof Error ? e.message : "unknown error"}]`;
    }
  }

  return `[PACKAGING CATALOG — Blade Product Specs]\n${catalog}\n\n[CONTAINERS]\n${containerSummary}` + calcBlock;
}

// ── POST /api/assistant ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  let body: AssistantRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });
  if (question.length > 1000) return NextResponse.json({ error: "question too long" }, { status: 400 });

  const language = (body.language ?? "en").trim();
  const respondedAt = new Date().toISOString();

  // ── Resolve / create chat ─────────────────────────────────────────────────
  let chatId = body.chatId;
  if (chatId) {
    const existing = await prisma.assistantChat.findUnique({ where: { id: chatId } });
    if (!existing || (user.role !== "ADMIN" && existing.userId !== user.id)) {
      chatId = undefined; // invalid → fall back to no persistence
    }
  }

  // Build conversation history: load last 10 messages from DB if we have a chatId,
  // otherwise use the client-supplied history
  let history: ConversationMessage[];
  if (chatId) {
    const dbMessages = await prisma.assistantMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    history = dbMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  } else {
    history = (body.history ?? []).slice(-20);
  }

  console.info(`[assistant] user=${user.email} chat=${chatId ?? "ephemeral"} q="${question.slice(0, 80)}"`);

  // ── Persist the user message ───────────────────────────────────────────────
  if (chatId) {
    await prisma.assistantMessage.create({
      data: { chatId, role: "user", content: question },
    });
    // Auto-title from first user message
    const chat = await prisma.assistantChat.findUnique({ where: { id: chatId } });
    if (chat?.title === "New Chat") {
      await prisma.assistantChat.update({
        where: { id: chatId },
        data: { title: question.slice(0, 60) },
      });
    }
  }

  // ── Short-circuit conversational inputs ────────────────────────────────────
  const quick = shortCircuit(question, language);
  if (quick) {
    if (chatId) {
      await persistAssistantMessage({ chatId, content: quick, ollamaUsed: false, status: "COMPLETED" });
    }
    await logInteraction({ userId: user.id, prompt: question, response: quick, ollamaUsed: false, proposals: [] });
    return NextResponse.json({
      question, answer: quick, ollamaUsed: false,
      proposals: [], savedRequestIds: [], chatId, respondedAt,
    } satisfies AssistantResponse);
  }

  // ── Create PENDING assistant message (before generation) ────────────────────
  let assistantMessageId: string | null = null;
  if (chatId) {
    const pendingMsg = await prisma.assistantMessage.create({
      data: { chatId, role: "assistant", content: "", status: "PENDING" },
    });
    assistantMessageId = pendingMsg.id;
  }

  // ── Load factory context ───────────────────────────────────────────────────
  let ctx;
  try {
    ctx = await loadFactoryContext();
  } catch (err) {
    console.error("[assistant] factory context load failed:", err);
    if (assistantMessageId && chatId) {
      await prisma.assistantMessage.update({
        where: { id: assistantMessageId },
        data: { status: "FAILED", content: "Failed to load factory data" },
      });
    }
    return NextResponse.json({ error: "Failed to load factory data" }, { status: 500 });
  }

  const fallback =
    `Based on current data: ${ctx.inventory.totalMaterials} materials (${ctx.inventory.inStock} in stock, ` +
    `${ctx.inventory.lowStock} low, ${ctx.inventory.outOfStock} out of stock). ` +
    `${ctx.orders.pending + ctx.orders.inProduction} open orders. ` +
    `${ctx.suppliers.active} active suppliers.`;

  // ── Load AI Config and Knowledge ────────────────────────────────────────────
  let config;
  let knowledgeText = "";
  try {
    config = await prisma.aIConfig.findUnique({ where: { id: "singleton" } });
    const knowledge = await prisma.factoryKnowledge.findMany({
      where: { enabled: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    });
    knowledgeText = knowledge.map((k) => `[${k.filename}]\n${k.content}`).join("\n\n");
  } catch (err) {
    // Silently fail; config is optional
  }

  // ── Packaging calculator context ───────────────────────────────────────────
  let packagingContext = "";
  try {
    packagingContext = await buildPackagingContext(question);
  } catch (err) {
    // Non-fatal: packaging context injection is best-effort
    console.warn("[assistant] packaging context failed:", err);
  }
  if (packagingContext) {
    knowledgeText = knowledgeText
      ? `${knowledgeText}\n\n${packagingContext}`
      : packagingContext;
  }

  // ── Call Ollama ────────────────────────────────────────────────────────────
  const result = await runCopilot({
    question,
    history,
    ctx,
    fallback,
    language,
    config: config
      ? {
          assistantName: config.assistantName,
          systemPrompt: config.systemPrompt,
          responseStyle: config.responseStyle,
          allowedActions: (config.allowedActions as string[]) ?? [],
        }
      : undefined,
    knowledge: knowledgeText || undefined,
  });

  const answer = result.ok ? result.answer : result.fallback;
  const proposals: ActionProposal[] = result.ok ? result.proposals : [];

  // ── Persist action proposals ───────────────────────────────────────────────
  let savedRequestIds: string[] = [];
  if (proposals.length > 0 && (user.role === "ADMIN" || user.role === "WORKER")) {
    for (const p of proposals) {
      try {
        const saved = await prisma.aIActionRequest.create({
          data: {
            createdByUserId: user.id,
            actionType: p.actionType,
            payload: p.payload as Record<string, string | number | boolean | null>,
            reasoning: p.reasoning,
            status: "PENDING",
          },
        });
        savedRequestIds.push(saved.id);
      } catch (err) {
        console.error("[assistant] failed to save action request:", err);
      }
    }
  }

  // ── Persist or update AI message ────────────────────────────────────────────
  if (chatId && assistantMessageId) {
    await prisma.assistantMessage.update({
      where: { id: assistantMessageId },
      data: {
        content: answer,
        ollamaUsed: result.ok,
        proposals: proposals.length > 0
          ? (proposals as unknown as import("@prisma/client").Prisma.InputJsonValue)
          : undefined,
        savedRequestIds: savedRequestIds.length > 0
          ? (savedRequestIds as unknown as import("@prisma/client").Prisma.InputJsonValue)
          : undefined,
        status: "COMPLETED",
      },
    });
    // Touch updatedAt
    await prisma.assistantChat.update({ where: { id: chatId }, data: {} });
  } else if (chatId && !assistantMessageId) {
    // Fallback for non-persisted mode
    await persistAssistantMessage({ chatId, content: answer, ollamaUsed: result.ok, proposals, savedRequestIds, status: "COMPLETED" });
  }

  await logInteraction({ userId: user.id, prompt: question, response: answer, ollamaUsed: result.ok, proposals });
  if (!result.ok) console.warn(`[assistant] ollama fallback — ${result.reason}`);

  return NextResponse.json({
    question, answer,
    ollamaUsed: result.ok,
    fallbackReason: result.ok ? undefined : result.reason,
    proposals,
    savedRequestIds,
    chatId,
    respondedAt,
  } satisfies AssistantResponse);
}

// ── GET /api/assistant ─────────────────────────────────────────────────────────

export async function GET() {
  const health = await checkOllamaHealth();
  return NextResponse.json({
    version: "3.1.0",
    description: "Factory Operations Copilot",
    ollama: health,
    capabilities: [
      "Inventory analysis and alerts",
      "Order tracking and planning",
      "Supplier performance ranking",
      "Production capacity estimates",
      "Report and email generation",
      "Risk identification",
      "Action proposal (requires human approval)",
    ],
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function persistAssistantMessage({
  chatId,
  content,
  ollamaUsed,
  proposals = [],
  savedRequestIds = [],
  status = "COMPLETED",
}: {
  chatId: string;
  content: string;
  ollamaUsed: boolean;
  proposals?: ActionProposal[];
  savedRequestIds?: string[];
  status?: "PENDING" | "COMPLETED" | "FAILED";
}) {
  await prisma.assistantMessage.create({
    data: {
      chatId,
      role: "assistant",
      content: content.slice(0, 8000),
      ollamaUsed,
      proposals: proposals.length > 0
        ? (proposals as unknown as import("@prisma/client").Prisma.InputJsonValue)
        : undefined,
      savedRequestIds: savedRequestIds.length > 0
        ? (savedRequestIds as unknown as import("@prisma/client").Prisma.InputJsonValue)
        : undefined,
      status,
    },
  });
}

async function logInteraction({
  userId, prompt, response, ollamaUsed, proposals,
}: {
  userId: string;
  prompt: string;
  response: string;
  ollamaUsed: boolean;
  proposals: ActionProposal[];
}) {
  try {
    await prisma.aIInteractionLog.create({
      data: {
        userId,
        prompt,
        response: response.slice(0, 4000),
        ollamaUsed,
        actionsProposed: proposals.length > 0
          ? (proposals as unknown as import("@prisma/client").Prisma.InputJsonValue)
          : undefined,
      },
    });
  } catch (err) {
    console.error("[assistant] log failed:", err);
  }
}
