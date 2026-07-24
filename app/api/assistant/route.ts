import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../lib/session";
import { loadFactoryContext } from "../../lib/factory-context";
import { checkOllamaHealth } from "../../lib/ollama";
import { getAIProvider, type AIMessage } from "../../lib/ai";
import { buildSystemPrompt } from "../../lib/ai/prompt-builder";
import { parseAssistantResponse, ACTION_SEPARATOR, type ActionProposal } from "../../lib/ai/response-parser";

export type ConversationMessage = { role: "user" | "assistant"; content: string };
import { prisma } from "../../lib/prisma";
import { calculatePackaging, formatPackagingResultText, calculateMaxCapacity, formatMaxCapacityResultText, optimizeContainerMix, formatOptimizationResultText, analyzeContainerMix, formatMixAnalysisText } from "../../lib/packaging-calculator";
import { normalizeActionType, isReadOnlyQuestion } from "../../lib/action-types";
import { findRelevantChunks, formatRelevantChunks } from "../../lib/knowledge-search";

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
        ? "Mir geht es gut, danke! Ich bin Ihr Fabrik-Assistent. Womit kann ich Ihnen helfen?"
        : "Hallo! Ich bin Ihr Fabrik-Assistent. Ich kann Fragen zu Materialien, Bestellungen, Lieferanten und Produkten beantworten.";
    }
    return isHowAreYou
      ? "I'm running smoothly and ready to help with your factory operations! What would you like to know?"
      : "Hello! I'm your Factory Operations Assistant. I can answer questions about inventory, orders, suppliers, and products. What can I help you with?";
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

const PACKAGING_KEYWORDS = /pack|crate|tower|container|shipment|shipping|ship|fit|load|capacity|weight|volume|footprint|pieces|pcs|mix|optim|split|fill|how many|how much/i;

// Build a regex matching any of the given (real, DB-backed) article codes.
//
// Two things matter here:
//  1. Longest-first ordering. Regex alternation is first-match-wins, and the
//     codes arrive in unspecified DB order, so without sorting "CF-5" could
//     shadow "CF-55" and silently return another product's packaging figures.
//  2. Code-character boundaries. \b is unusable because codes contain "-", so
//     an explicit lookbehind/lookahead excludes the characters a code is made
//     of. Punctuation such as "," is deliberately NOT excluded, so a list like
//     "CF-55, CF-44" still matches both.
function buildArticleCodePattern(codes: string[], flags: string): RegExp | null {
  if (codes.length === 0) return null;
  const sorted = [...codes].sort((a, b) => b.length - a.length);
  const escapedCodes = sorted.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?<![A-Z0-9-])(?:${escapedCodes.join("|")})(?![A-Z0-9-])`, flags);
}

// Phrases that indicate the question is asking FOR a quantity ("how many fit"), not stating one
const MAX_CAPACITY_KEYWORDS = /how many|how much|maximum|\bmax\b|fit in|can fit|fill a|capacity/i;

// A number carrying an explicit unit — the only form accepted as a stated
// quantity. German units included since the assistant answers in DE too.
const QTY_WITH_UNIT_RX = /\b(\d[\d,\s]*\d|\d+)\s*(?:pieces?|pcs?|units?|stücke?|stk)\b/i;

// Try to extract (articleCode, quantity, containerType) from a free-text question.
// qty is -1 as a sentinel meaning "calculate maximum capacity" (no specific quantity given, e.g. "how many fit").
function detectPackagingQuery(question: string, codes: string[]): { articleCode: string | null; qty: number | null; containerName: string | null } {
  // Container type
  let containerName: string | null = null;
  if (/\b40\s*ft\b|\b40\s*foot\b|\b40-foot\b/i.test(question)) containerName = "40ft";
  else if (/\b20\s*ft\b|\b20\s*foot\b|\b20-foot\b/i.test(question)) containerName = "20ft";

  // Quantity: only accept a number carrying an explicit unit, or one directly
  // introducing an article code ("50,000 of CF-55").
  //
  // There is deliberately NO bare-integer fallback: matching any 4+ digit
  // number turned incidental figures into piece counts — "order ORD-1001"
  // yielded qty=1001 — and the result is injected into the prompt as an
  // authoritative calculation. When no explicit quantity is present, qty stays
  // null and the max-capacity path handles "how many fit" instead.
  let qty: number | null = null;
  const qtyMatch = question.match(QTY_WITH_UNIT_RX)
    ?? question.match(/\b([\d,]+)\s+(?:of|x)\s+[A-Z]/i);
  if (qtyMatch) {
    qty = parseInt(qtyMatch[1].replace(/[,\s]/g, ""), 10) || null;
  }

  // Article code: matched dynamically against the real codes in the database
  let articleCode: string | null = null;
  const codePattern = buildArticleCodePattern(codes, "i");
  const codeMatch = codePattern ? question.match(codePattern) : null;
  if (codeMatch) articleCode = codeMatch[0].trim();

  // "How many X fit in a container?" — asking for the quantity, not stating one
  if (qty === null && articleCode && MAX_CAPACITY_KEYWORDS.test(question)) {
    qty = -1;
  }

  return { articleCode, qty, containerName };
}

// Pull a quantity (supports "100k", "100,000 pieces", "50000 of", "CODE: 100k") out of a text window
function extractQuantityNear(window: string): number | null {
  const kMatch = window.match(/\b(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);

  const pcsMatch = window.match(QTY_WITH_UNIT_RX);
  if (pcsMatch) return parseInt(pcsMatch[1].replace(/[,\s]/g, ""), 10) || null;

  const ofMatch = window.match(/\b([\d,]+)\s+of\b/i) ?? window.match(/\bof\s+([\d,]+)\b/i);
  if (ofMatch) return parseInt(ofMatch[1].replace(/[,\s]/g, ""), 10) || null;

  const colonMatch = window.match(/:\s*([\d,]+)\b/);
  if (colonMatch) return parseInt(colonMatch[1].replace(/[,\s]/g, ""), 10) || null;

  // No bare-integer fallback — see detectPackagingQuery(). Any 4+ digit number
  // inside the ±40-char window used to become that product's quantity, so a
  // year or an order number silently drove the optimizer.
  return null;
}

// Signals a multi-product "mix" question even when no quantities are stated.
// "and" is deliberately excluded: it appears in almost any question naming two
// products ("stock for CF-55 and CF-44"), which sent plain inventory lookups
// down the container-optimization path. A genuine mix question always carries
// one of the words below.
const MIX_KEYWORDS = /\bmix\b|\bcombine[ds]?\b|\btogether\b|\bboth\b|\bsplit\b|\bfill\b/i;

// Detect a multi-product question, e.g.
// "100000 pieces of CF-55 and 50000 of CF-44"  (explicit quantities)
// "Can I mix CF-55 and CF-44 in one container?" (no quantities → optimal split)
// Returns null unless 2+ distinct article codes are present. When 2+ codes are found but no
// quantities are stated, each product's quantity is set to -1 (sentinel: "calculate optimal split").
function detectOptimizationQuery(question: string, codes: string[]): { products: Array<{ articleCode: string; quantity: number }>; containerName?: string } | null {
  let containerName: string | undefined;
  if (/\b40\s*ft\b|\b40\s*foot\b|\b40-foot\b/i.test(question)) containerName = "40ft";
  else if (/\b20\s*ft\b|\b20\s*foot\b|\b20-foot\b/i.test(question)) containerName = "20ft";

  const codePattern = buildArticleCodePattern(codes, "gi");
  if (!codePattern) return null;
  const matches = [...question.matchAll(codePattern)];
  if (matches.length < 2) return null;

  // Collect each unique article code (in order) with any quantity stated near it
  const detected: Array<{ articleCode: string; quantity: number | null }> = [];
  const seen = new Set<string>();

  for (const m of matches) {
    const code = m[0].trim();
    const key = code.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const start = m.index ?? 0;
    const windowStart = Math.max(0, start - 40);
    const windowEnd = Math.min(question.length, start + code.length + 40);
    const window = question.slice(windowStart, windowEnd);

    detected.push({ articleCode: code, quantity: extractQuantityNear(window) });
  }

  if (detected.length < 2) return null;

  // Explicit-quantity path: 2+ products each with a stated quantity
  const withQty = detected.filter((d) => d.quantity !== null && d.quantity > 0);
  if (withQty.length >= 2) {
    return { products: withQty.map((d) => ({ articleCode: d.articleCode, quantity: d.quantity as number })), containerName };
  }

  // Optimal-split path: 2+ codes and a mixing intent, but no explicit quantities.
  // quantity: -1 signals "calculate an even split across the products" downstream.
  if (MIX_KEYWORDS.test(question)) {
    return { products: detected.map((d) => ({ articleCode: d.articleCode, quantity: -1 })), containerName };
  }

  return null;
}

async function buildPackagingContext(question: string): Promise<{ text: string; hasPackagingResult: boolean }> {
  if (!PACKAGING_KEYWORDS.test(question)) return { text: "", hasPackagingResult: false };

  const allSpecs = await prisma.bladeProductSpec.findMany({ select: { articleCode: true } });
  const allCodes = allSpecs.map((s) => s.articleCode);

  const [products, containers] = await Promise.all([
    prisma.bladeProductSpec.findMany({ include: { crateType: true }, orderBy: { articleCode: "asc" } }),
    prisma.containerType.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (products.length === 0) return { text: "", hasPackagingResult: false };

  // Set true only when one of [MAX CAPACITY RESULT] / [CONTAINER OPTIMIZATION RESULT] /
  // [CONTAINER MIX ANALYSIS] was actually injected — signals the caller to strip raw
  // product specs from ctx so the AI can't recalculate over the deterministic result.
  let hasPackagingResult = false;

  const catalog = products.map((p) =>
    `  ${p.articleCode}: ${p.productName}, ${p.lengthMm}×${p.widthMm}×${p.thicknessMm}mm, ` +
    `${p.pcsPerCrate} pcs/crate (${p.crateType.code}), ${p.weightAfterPunchingKg} kg/pc (punched), max ${p.maxCratesPerTower} crates/tower`
  ).join("\n");

  const containerSummary = containers.map((c) =>
    `  ${c.name}: ${c.lengthMeters}m × ${c.widthMeters}m floor, max ${c.maxPayloadKg.toLocaleString()} kg, max ${c.maxVolumeM3} m³`
  ).join("\n");

  let calcBlock = "";

  // Multi-product and single-product detection are mutually exclusive: a multi-product
  // question injects only the optimization block, never also the single-product block.
  const multiResult = detectOptimizationQuery(question, allCodes);

  if (multiResult && multiResult.products.length >= 2) {
    const isSplit = multiResult.products.every((p) => p.quantity === -1);
    if (isSplit) {
      // ── Multi-product mix analysis (no quantities given → optimal split) ─────
      try {
        const mix = await analyzeContainerMix({
          articleCodes: multiResult.products.map((p) => p.articleCode),
          containerName: multiResult.containerName,
        });
        calcBlock += `\n\n[CONTAINER MIX ANALYSIS — use these exact numbers]\n${formatMixAnalysisText(mix)}`;
        hasPackagingResult = true;
        console.info(`[assistant] mix analysis: ${multiResult.products.map((p) => p.articleCode).join(", ")} → ${mix.containerName}: ${mix.combined.fits ? "FITS" : "NO FIT"}`);
      } catch (e) {
        calcBlock += `\n\n[CONTAINER MIX NOTE: Could not compute — ${e instanceof Error ? e.message : "unknown error"}]`;
      }
    } else {
      // ── Multi-product container optimization (explicit quantities) ───────────
      try {
        const optResult = await optimizeContainerMix(multiResult);
        calcBlock += `\n\n[CONTAINER OPTIMIZATION RESULT — use these exact numbers]\n${formatOptimizationResultText(optResult)}`;
        hasPackagingResult = true;
        console.info(`[assistant] optimization calc: ${multiResult.products.map((p) => p.articleCode).join(", ")} → ${optResult.containerType}: ${optResult.fits ? "FITS" : "NO FIT"}`);
      } catch (e) {
        calcBlock += `\n\n[CONTAINER OPTIMIZATION NOTE: Could not compute — ${e instanceof Error ? e.message : "unknown error"}]`;
      }
    }
  } else {
    // ── Single-product calculation ───────────────────────────────────────────
    const { articleCode, qty, containerName } = detectPackagingQuery(question, allCodes);
    if (articleCode && qty === -1) {
      // "How many fit" — no specific quantity given, calculate maximum capacity instead
      const resolvedContainerName = containerName ?? "40ft";
      try {
        const result = await calculateMaxCapacity({ articleCode, containerName: resolvedContainerName });
        calcBlock = `\n\n[MAX CAPACITY RESULT — use these exact numbers]\n${formatMaxCapacityResultText(result)}`;
        hasPackagingResult = true;
        console.info(`[assistant] max capacity calc: ${articleCode} → ${resolvedContainerName}: ${result.maxPieces} pcs max`);
      } catch (e) {
        calcBlock = `\n\n[PACKAGING NOTE: Could not compute max capacity for "${articleCode}" → ${resolvedContainerName}: ${e instanceof Error ? e.message : "unknown error"}]`;
      }
    } else if (articleCode && qty && qty > 0) {
      const resolvedContainerName = containerName ?? "40ft";
      try {
        const result = await calculatePackaging({ articleCode, qty, containerName: resolvedContainerName });
        calcBlock = `\n\n[PACKAGING RESULT — use these exact numbers]\n${formatPackagingResultText(result)}`;
        hasPackagingResult = true;
        console.info(`[assistant] packaging calc: ${articleCode} × ${qty} → ${resolvedContainerName}: ${result.overallFits ? "FITS" : "NO FIT"}`);
      } catch (e) {
        calcBlock = `\n\n[PACKAGING NOTE: Could not compute for "${articleCode}" × ${qty} → ${resolvedContainerName}: ${e instanceof Error ? e.message : "unknown error"}]`;
      }
    }
  }

  // ── Order-level calculation ────────────────────────────────────────────────
  const orderMatch = question.match(/\b(ORD-\d+)\b/i);
  if (orderMatch) {
    const orderNumber = orderMatch[1].toUpperCase();
    const order = await prisma.order.findFirst({
      where: { orderNumber: { equals: orderNumber, mode: "insensitive" } },
      include: { lines: { include: { bladeProduct: { include: { crateType: true } } } } },
    });
    if (order) {
      const linesToCalc = order.lines.length > 0
        ? order.lines.map((l) => ({ articleCode: l.articleCode, qty: l.qty }))
        : order.productCode ? [{ articleCode: order.productCode, qty: order.qty }] : [];

      if (linesToCalc.length > 0) {
        try {
          const [r20, r40] = await Promise.all([
            computeOrderTotals(linesToCalc, "20ft"),
            computeOrderTotals(linesToCalc, "40ft"),
          ]);
          calcBlock += `\n\n[ORDER ${orderNumber} CALCULATION]\nCustomer: ${order.customer}\nLines:\n`;
          for (const l of linesToCalc) {
            calcBlock += `  ${l.articleCode} × ${l.qty.toLocaleString()} pcs\n`;
          }
          calcBlock += formatOrderTotals(orderNumber, r20, r40);
          console.info(`[assistant] order calc injected: ${orderNumber}`);
        } catch (e) {
          calcBlock += `\n\n[ORDER ${orderNumber}: calculation error — ${e instanceof Error ? e.message : "unknown"}]`;
        }
      }
    } else {
      calcBlock += `\n\n[ORDER ${orderNumber}: not found in database]`;
    }
  }

  const text = `[PACKAGING CATALOG — Blade Product Specs]\n${catalog}\n\n[CONTAINERS]\n${containerSummary}` + calcBlock;
  return { text, hasPackagingResult };
}

async function computeOrderTotals(lines: { articleCode: string; qty: number }[], containerName: string) {
  const container = await prisma.containerType.findUnique({ where: { name: containerName } });
  if (!container) return null;

  const bps = await prisma.bladeProductSpec.findMany({
    where: { articleCode: { in: lines.map((l) => l.articleCode) } },
    include: { crateType: true },
  });
  const bpMap = Object.fromEntries(bps.map((p) => [p.articleCode, p]));

  let totalNetWt = 0, totalCrateWt = 0, totalFP = 0, totalVol = 0, totalCrates = 0, totalTowers = 0;

  for (const line of lines) {
    const bp = bpMap[line.articleCode];
    if (!bp) continue;
    const crate = bp.crateType;
    const fullCrates = Math.ceil(line.qty / bp.pcsPerCrate);
    const towers = Math.ceil(fullCrates / bp.maxCratesPerTower);
    totalNetWt += line.qty * bp.weightAfterPunchingKg;
    totalCrateWt += fullCrates * crate.emptyWeightKg;
    totalFP += towers * crate.xMeters * crate.zMeters;
    totalVol += fullCrates * crate.xMeters * crate.yMeters * crate.zMeters;
    totalCrates += fullCrates;
    totalTowers += towers;
  }

  const totalShipmentWt = totalNetWt + totalCrateWt;
  const floorArea = container.lengthMeters * container.widthMeters;
  const limiters: string[] = [];
  if (totalShipmentWt > container.maxPayloadKg) limiters.push("weight");
  if (totalFP > floorArea) limiters.push("floor area");
  if (totalVol > container.maxVolumeM3) limiters.push("volume");

  return {
    containerName, totalNetWt, totalCrateWt, totalShipmentWt, totalCrates, totalTowers,
    totalFP, totalVol, floorArea,
    maxPayload: container.maxPayloadKg, maxVol: container.maxVolumeM3,
    fits: limiters.length === 0, limiters,
  };
}

function formatOrderTotals(orderNumber: string, r20: Awaited<ReturnType<typeof computeOrderTotals>>, r40: Awaited<ReturnType<typeof computeOrderTotals>>) {
  if (!r20 || !r40) return "";
  return [
    ``,
    `Shipment totals:`,
    `  Net weight: ${r20.totalNetWt.toFixed(1)} kg`,
    `  Crate tare: ${r20.totalCrateWt.toFixed(1)} kg`,
    `  Total: ${r20.totalShipmentWt.toFixed(1)} kg`,
    `  Footprint: ${r20.totalFP.toFixed(2)} m²`,
    `  Volume: ${r20.totalVol.toFixed(2)} m³`,
    `  Crates: ${r20.totalCrates}, Towers: ${r20.totalTowers}`,
    ``,
    `Container fit:`,
    `  20ft (${r20.maxPayload.toLocaleString()} kg / ${r20.floorArea.toFixed(1)} m² / ${r20.maxVol} m³): ${r20.fits ? "FITS" : "DOES NOT FIT — " + r20.limiters.join(", ")}`,
    `  40ft (${r40.maxPayload.toLocaleString()} kg / ${r40.floorArea.toFixed(1)} m² / ${r40.maxVol} m³): ${r40.fits ? "FITS" : "DOES NOT FIT — " + r40.limiters.join(", ")}`,
  ].join("\n");
}

// ── SSE streaming helpers ───────────────────────────────────────────────────────

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no", // disable proxy buffering so tokens flush immediately
} as const;

const sseTextEncoder = new TextEncoder();

// Encode one SSE `data:` frame. Strings are sent verbatim (e.g. "[DONE]"); objects are JSON.
function sseEvent(data: unknown): Uint8Array {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return sseTextEncoder.encode(`data: ${payload}\n\n`);
}

// How much of the accumulated raw text is safe to show the user as prose.
// Everything before the ---ACTIONS--- marker is visible; the marker and the JSON
// after it are never shown. A trailing partial-marker prefix is held back so the
// user never briefly sees "---ACTI…" before the token that completes it arrives.
function visibleSafeLength(raw: string): number {
  const sepIdx = raw.indexOf(ACTION_SEPARATOR);
  if (sepIdx !== -1) return sepIdx;
  const maxK = Math.min(raw.length, ACTION_SEPARATOR.length - 1);
  for (let k = maxK; k > 0; k--) {
    if (raw.slice(raw.length - k) === ACTION_SEPARATOR.slice(0, k)) return raw.length - k;
  }
  return raw.length;
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
    if (!existing || (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER" && existing.userId !== user.id)) {
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
  // Streamed as SSE too (one token + done event) so the client has a single response shape.
  const quick = shortCircuit(question, language);
  if (quick) {
    if (chatId) {
      await persistAssistantMessage({ chatId, content: quick, ollamaUsed: false, status: "COMPLETED" });
    }
    await logInteraction({ userId: user.id, prompt: question, response: quick, ollamaUsed: false, proposals: [] });

    const quickStream = new ReadableStream({
      start(controller) {
        controller.enqueue(sseEvent({ token: quick }));
        controller.enqueue(sseEvent({
          done: true, hasActions: false,
          answer: quick, proposals: [], savedRequestIds: [],
          chatId, respondedAt, ollamaUsed: false, messageId: null,
        }));
        controller.enqueue(sseEvent("[DONE]"));
        controller.close();
      },
    });
    return new Response(quickStream, { headers: SSE_HEADERS });
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

  const totalMaterials = ctx.inventory.inStock + ctx.inventory.lowStock + ctx.inventory.outOfStock;
  const fallback =
    `Based on current data: ${totalMaterials} materials (${ctx.inventory.inStock} in stock, ` +
    `${ctx.inventory.lowStock} low, ${ctx.inventory.outOfStock} out of stock). ` +
    `${ctx.orders.pending + ctx.orders.inProduction} open orders. ` +
    `${ctx.suppliers.active} active suppliers.`;

  // ── Load AI Config and Knowledge ────────────────────────────────────────────
  let config;
  let knowledgeText = "";
  let rulesText = "";
  try {
    config = await prisma.aIConfig.findUnique({ where: { id: "singleton" } });

    // Load active rules
    const rules = await prisma.aIRule.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    if (rules.length > 0) {
      rulesText = [
        "ADMIN RULES (must follow):",
        ...rules.map((r, i) => `${i + 1}. ${r.text}`),
      ].join("\n");
    }

    // Load relevant knowledge chunks (RAG)
    const knowledgeFiles = await prisma.factoryKnowledge.findMany({
      where: { enabled: true },
      include: { chunks: { select: { content: true, chunkIndex: true } } },
    });

    // Collect all chunks and search for relevance
    const allChunks: { content: string; filename: string; chunkIndex: number }[] = [];
    for (const file of knowledgeFiles) {
      for (const chunk of file.chunks) {
        allChunks.push({ content: chunk.content, filename: file.filename, chunkIndex: chunk.chunkIndex });
      }
    }

    if (allChunks.length > 0) {
      const relevantChunks = findRelevantChunks(
        allChunks.map((c) => c.content),
        allChunks.map((c) => ({ sourceFile: c.filename, chunkIndex: c.chunkIndex })),
        question,
        5, // top-5 chunks
      );
      knowledgeText = formatRelevantChunks(relevantChunks);
    }
  } catch (err) {
    console.warn("[assistant] rules/knowledge load failed:", err);
  }

  // ── Packaging calculator context ───────────────────────────────────────────
  let packagingContext = "";
  let hasPackagingResult = false;
  try {
    const result = await buildPackagingContext(question);
    packagingContext = result.text;
    hasPackagingResult = result.hasPackagingResult;
  } catch (err) {
    // Non-fatal: packaging context injection is best-effort
    console.warn("[assistant] packaging context failed:", err);
  }
  if (packagingContext) {
    knowledgeText = knowledgeText
      ? `${knowledgeText}\n\n${packagingContext}`
      : packagingContext;
  }

  // A deterministic packaging result is in the context — strip the raw product specs
  // from ctx so the AI can't see dimensions/weights and recalculate its own (wrong) numbers.
  if (hasPackagingResult) {
    (ctx as unknown as { products: unknown }).products =
      "Product packaging data omitted — see [MAX CAPACITY RESULT] / [CONTAINER OPTIMIZATION RESULT] above for accurate calculations.";
  }

  // ── Call Ollama ────────────────────────────────────────────────────────────
  // Build system prompt with company knowledge, focus mode, rules, and custom instructions
  let systemPromptWithRules: string | undefined;
  const promptParts: string[] = [];

  // Add company knowledge first (near top, right after company identity)
  if (config?.companyKnowledge?.trim()) {
    promptParts.push(`## Company Knowledge\n${config.companyKnowledge}`);
  }

  // Add focus mode if present and not "general"
  if (config?.focusMode && config.focusMode !== "general") {
    if (config.focusMode === "production") {
      promptParts.push("Current focus mode: Production & Manufacturing. Prioritize data related to production details in your responses.");
    } else if (config.focusMode === "logistics") {
      promptParts.push("Current focus mode: Orders & Logistics. Prioritize data related to orders and shipping in your responses.");
    }
  }

  // Add admin rules
  if (rulesText) {
    promptParts.push(rulesText);
  }

  // Add custom system prompt
  if (config?.systemPrompt) {
    promptParts.push(config.systemPrompt);
  }

  systemPromptWithRules = promptParts.length > 0 ? promptParts.join("\n\n") : undefined;

  const copilotConfig = config
    ? {
        assistantName: config.assistantName,
        systemPrompt: systemPromptWithRules,
        responseStyle: config.responseStyle,
        allowedActions: (config.allowedActions as string[]) ?? [],
      }
    : systemPromptWithRules
      ? { systemPrompt: systemPromptWithRules }
      : undefined;

  // ── Stream the response via SSE ─────────────────────────────────────────────
  // Tokens are emitted as they arrive; once the LLM stream closes we run the
  // (unchanged) proposal gating / validation / DB-save logic on the accumulated
  // raw text, then emit a final metadata event and close.
  const sseStream = new ReadableStream({
    async start(controller) {
      let rawAccumulated = "";    // full model output, incl. any ---ACTIONS--- block
      let emittedVisibleLen = 0;  // chars of visible prose already sent to the client
      let usedFallback = false;
      let fallbackReason: string | undefined;

      // 1) Stream tokens from the AI provider, forwarding only the visible prose.
      try {
        // Build the messages exactly as streamCopilot() did: system prompt, last 10
        // history messages, then the question with the language instruction appended.
        const langInstruction = language === "de"
          ? "Answer in German (Deutsch). The user is writing in German."
          : "Answer in English.";
        const messages: AIMessage[] = [
          { role: "system", content: buildSystemPrompt(ctx, copilotConfig, knowledgeText || undefined) },
          ...history.slice(-10),
          { role: "user", content: `${question}\n\n[Language instruction: ${langInstruction}]` },
        ];
        const tokenStream = await getAIProvider().stream(messages);
        const reader = tokenStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          rawAccumulated += value;
          const safeEnd = visibleSafeLength(rawAccumulated);
          if (safeEnd > emittedVisibleLen) {
            controller.enqueue(sseEvent({ token: rawAccumulated.slice(emittedVisibleLen, safeEnd) }));
            emittedVisibleLen = safeEnd;
          }
        }
      } catch (err) {
        // Connection failure (no tokens) or a mid-stream error. Keep whatever partial
        // text we received; only substitute the deterministic fallback if we got nothing.
        fallbackReason = err instanceof Error ? err.message : "stream error";
        console.warn(`[assistant] stream failed — ${fallbackReason}`);
      }

      if (rawAccumulated.trim().length === 0) {
        usedFallback = true;
        rawAccumulated = fallback;
        controller.enqueue(sseEvent({ token: fallback }));
        emittedVisibleLen = fallback.length;
      }

      const ollamaUsed = !usedFallback;

      // 2) Finalize: parse the accumulated raw text exactly as the non-streaming path did.
      const { answer, proposals: parsedProposals } = parseAssistantResponse(rawAccumulated);
      let proposals: ActionProposal[] = ollamaUsed ? parsedProposals : [];

      // Gate: read-only/calculation questions must never create proposals
      if (isReadOnlyQuestion(question)) {
        if (proposals.length > 0) {
          console.info(`[assistant] stripping ${proposals.length} proposal(s) — read-only question`);
        }
        proposals = [];
      }

      // Normalize and validate action types
      const validatedProposals: ActionProposal[] = [];
      for (const p of proposals) {
        const normalized = normalizeActionType(p.actionType);
        if (!normalized) {
          console.warn(`[assistant] dropping proposal with unknown actionType: "${p.actionType}"`);
          continue;
        }
        validatedProposals.push({ ...p, actionType: normalized });
      }
      proposals = validatedProposals;

      // 3) Persist proposals + message + log. Wrapped so a DB failure never prevents
      //    us from closing the stream cleanly for the client.
      let savedRequestIds: string[] = [];
      try {
        if (proposals.length > 0 && (user.role === "SUPER_ADMIN" || user.role === "MANAGER" || user.role === "WORKER")) {
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

        if (chatId && assistantMessageId) {
          await prisma.assistantMessage.update({
            where: { id: assistantMessageId },
            data: {
              content: answer,
              ollamaUsed,
              proposals: proposals.length > 0
                ? (proposals as unknown as import("@prisma/client").Prisma.InputJsonValue)
                : undefined,
              savedRequestIds: savedRequestIds.length > 0
                ? (savedRequestIds as unknown as import("@prisma/client").Prisma.InputJsonValue)
                : undefined,
              status: "COMPLETED",
            },
          });
          await prisma.assistantChat.update({ where: { id: chatId }, data: {} });
        } else if (chatId && !assistantMessageId) {
          await persistAssistantMessage({ chatId, content: answer, ollamaUsed, proposals, savedRequestIds, status: "COMPLETED" });
        }

        await logInteraction({ userId: user.id, prompt: question, response: answer, ollamaUsed, proposals });
      } catch (err) {
        console.error("[assistant] post-stream persistence failed:", err);
      }

      if (usedFallback) console.warn(`[assistant] ollama fallback — ${fallbackReason ?? "unknown"}`);

      // 4) Final metadata event, then the [DONE] sentinel.
      //    If the client disconnected/aborted mid-stream the controller is already
      //    closed — enqueuing/closing would throw, so guard the whole finalize block.
      try {
        controller.enqueue(sseEvent({
          done: true,
          hasActions: proposals.length > 0,
          answer,
          proposals,
          savedRequestIds,
          chatId,
          respondedAt,
          ollamaUsed,
          fallbackReason: usedFallback ? fallbackReason : undefined,
          messageId: assistantMessageId,
        }));
        controller.enqueue(sseEvent("[DONE]"));
        controller.close();
      } catch {
        // client disconnected before finalization — safe to ignore
      }
    },
  });

  return new Response(sseStream, { headers: SSE_HEADERS });
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
