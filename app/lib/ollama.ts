/**
 * Ollama service layer.
 *
 * All configuration comes from environment variables:
 *   OLLAMA_BASE_URL  (default: http://127.0.0.1:11434)
 *   OLLAMA_MODEL     (default: qwen2.5:7b)
 *
 * Switching models requires only changing OLLAMA_MODEL — no code changes.
 */

import type { FactoryContext } from "./factory-context";

// ── Config ────────────────────────────────────────────────────────────────────

const RAW_BASE = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").trim();
const MODEL    = (process.env.OLLAMA_MODEL    ?? "qwen2.5:7b").trim();

/**
 * Normalise localhost → 127.0.0.1.
 * Node.js resolves "localhost" to ::1 (IPv6) first; Ollama only binds on
 * IPv4 (127.0.0.1). Node's fetch does NOT retry on IPv4 — this ensures
 * connections always go to the correct address.
 */
function normalise(url: string): string {
  return url.replace(/\blocalhost\b/g, "127.0.0.1");
}

const BASE = normalise(RAW_BASE);

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ActionProposal = {
  actionType: string;
  payload: Record<string, unknown>;
  reasoning: string;
};

export type CopilotResult =
  | { ok: true;  answer: string; proposals: ActionProposal[]; model: string }
  | { ok: false; fallback: string; reason: string };

export type OllamaHealthInfo = {
  online: boolean;
  version: string | null;
  model: string;
  modelLoaded: boolean;
  models: string[];
  resolvedUrl: string;
  configuredBase: string;
  error: string | null;
};

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(
  ctx: FactoryContext,
  config?: { assistantName?: string; systemPrompt?: string; responseStyle?: string; allowedActions?: string[] },
  knowledge?: string,
): string {
  const name = config?.assistantName ?? "Factory Operations Copilot";
  const styleGuide =
    config?.responseStyle === "detailed"
      ? "Provide comprehensive, detailed responses with explanations."
      : "Be concise and direct. Avoid unnecessary details.";

  const customPrompt = config?.systemPrompt ? `\n\nCUSTOM INSTRUCTIONS:\n${config.systemPrompt}` : "";
  const knowledgeSection = knowledge ? `\n\nFACTORY KNOWLEDGE:\n${knowledge}` : "";

  const allowedActionTypes = config?.allowedActions ?? [
    "create_order",
    "create_purchase_request",
    "update_stock",
    "assign_supplier",
    "generate_report",
    "export_data",
  ];

  const actionTypesText = allowedActionTypes.map((t) => {
    const descriptions: Record<string, string> = {
      create_order: '- create_order: {"customer":"...","productCode":"...","qty":0,"dueDate":"YYYY-MM-DD","valueEur":0}',
      create_purchase_request: '- create_purchase_request: {"materialCode":"...","quantity":0,"unit":"...","supplierName":"..."}',
      update_stock: '- update_stock: {"materialCode":"...","newQuantity":0,"reason":"..."}',
      assign_supplier: '- assign_supplier: {"materialCode":"...","supplierCode":"..."}',
      generate_report: '- generate_report: {"reportType":"inventory|orders|suppliers|production","format":"csv|pdf"}',
      export_data: '- export_data: {"entity":"materials|orders|suppliers|products","filters":{}}',
    };
    return descriptions[t] ?? "";
  }).filter(Boolean);

  return `You are ${name} — a local, private AI assistant for industrial manufacturing management.

You have access to real-time factory database data, updated as of ${ctx.asOf}.

YOUR CAPABILITIES:
- Answer questions about inventory, orders, suppliers, and products
- Perform calculations and production estimates
- Assist with planning and scheduling
- Recommend actions based on current data
- Generate operational reports, emails, and summaries
- Explain trends and flag risks

${styleGuide}${customPrompt}

CURRENT FACTORY DATA:
${JSON.stringify(ctx, null, 2)}${knowledgeSection}

SAFETY RULES (never violate):
1. Never fabricate inventory quantities, order values, or performance metrics
2. If data is unavailable or ambiguous, say so explicitly
3. Never execute database changes — only propose them for human approval
4. Base all recommendations strictly on the data provided above

ACTION PROPOSALS:
When proposing a specific action, append it to the END of your answer using exactly this format:
---ACTIONS---
[{"actionType":"TYPE","payload":{...},"reasoning":"brief reason"}]
---END---

Supported action types and payload shapes:
${actionTypesText.join("\n")}

Only propose ${allowedActionTypes.length > 0 ? "allowed" : ""} actions when the user explicitly asks or when it is clearly necessary.
Propose at most 3 actions per response.

TONE: Professional, concise, and helpful. Plain text — no markdown symbols or bullet points.`;
}

// ── Action proposal parser ─────────────────────────────────────────────────────

function parseProposals(raw: string): { answer: string; proposals: ActionProposal[] } {
  const sepStart = "---ACTIONS---";
  const sepEnd   = "---END---";
  const idx = raw.indexOf(sepStart);
  if (idx === -1) return { answer: raw.trim(), proposals: [] };

  const answer  = raw.slice(0, idx).trim();
  const endIdx  = raw.indexOf(sepEnd, idx);
  const jsonStr = endIdx === -1
    ? raw.slice(idx + sepStart.length).trim()
    : raw.slice(idx + sepStart.length, endIdx).trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const proposals: ActionProposal[] = Array.isArray(parsed) ? parsed : [];
    return { answer, proposals };
  } catch {
    console.warn("[ollama] action block parse failed:", jsonStr.slice(0, 200));
    return { answer, proposals: [] };
  }
}

// ── Error classifier ──────────────────────────────────────────────────────────

function classifyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/TimeoutError|timeout|AbortError/i.test(msg)) return "timeout";
  if (/ECONNREFUSED|Connection refused|fetch failed|ENOTFOUND/i.test(msg)) return "connection failed";
  return msg;
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function ollamaFetch(
  path: string,
  options?: RequestInit,
  timeoutMs = 5_000
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run the full copilot cycle: send factory context + conversation history to
 * Ollama, parse the natural-language answer and any action proposals.
 * NEVER writes to the database.
 */
export async function runCopilot({
  question,
  history,
  ctx,
  fallback,
  language = "en",
  config,
  knowledge,
}: {
  question: string;
  history: ConversationMessage[];
  ctx: FactoryContext;
  fallback: string;
  language?: string;
  config?: { assistantName?: string; systemPrompt?: string; responseStyle?: string; allowedActions?: string[] };
  knowledge?: string;
}): Promise<CopilotResult> {
  const langInstruction = language === "de"
    ? "Answer in German (Deutsch). The user is writing in German."
    : "Answer in English.";

  const messages = [
    { role: "system"    as const, content: buildSystemPrompt(ctx, config, knowledge) },
    ...history.slice(-10),
    { role: "user"      as const, content: `${question}\n\n[Language instruction: ${langInstruction}]` },
  ];

  const payload = { model: MODEL, messages, stream: false };

  console.info(`[ollama] → POST /api/chat model=${MODEL} history=${history.length} q="${question.slice(0, 60)}"`);

  const t0 = Date.now();
  let res: Response;

  try {
    res = await ollamaFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 60_000);
  } catch (err) {
    const ms = Date.now() - t0;
    const reason = classifyError(err);
    console.error(`[ollama] ✗ ${reason} after ${ms}ms`);
    return { ok: false, fallback, reason };
  }

  const ms = Date.now() - t0;
  console.info(`[ollama] ← HTTP ${res.status} in ${ms}ms`);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const reason = res.status === 404 ? "model not found"
      : `HTTP ${res.status}: ${text.slice(0, 100)}`;
    console.error(`[ollama] ✗ ${reason}`);
    return { ok: false, fallback, reason };
  }

  let body: { message?: { content?: string }; done?: boolean };
  try {
    body = await res.json();
  } catch {
    console.error("[ollama] ✗ invalid json from /api/chat");
    return { ok: false, fallback, reason: "invalid json" };
  }

  const raw = body.message?.content?.trim() ?? "";
  if (!raw) {
    console.error("[ollama] ✗ empty response content");
    return { ok: false, fallback, reason: "empty response" };
  }

  const { answer: rawAnswer, proposals } = parseProposals(raw);
  // If model only returned the action block with no prose, provide a brief confirmation
  const answer = rawAnswer || (proposals.length > 0
    ? `I've prepared ${proposals.length === 1 ? "an action proposal" : `${proposals.length} action proposals`} for your review. Please check the details below and approve if correct.`
    : "");
  console.info(`[ollama] ✓ model=${MODEL} ms=${ms} proposals=${proposals.length} answer="${answer.slice(0, 80)}"`);
  return { ok: true, answer, proposals, model: MODEL };
}

/**
 * Health check: connectivity, model availability, Ollama version.
 * Used by diagnostics routes and the GET /api/assistant manifest.
 */
export async function checkOllamaHealth(): Promise<OllamaHealthInfo> {
  const info: OllamaHealthInfo = {
    online: false,
    version: null,
    model: MODEL,
    modelLoaded: false,
    models: [],
    resolvedUrl: BASE,
    configuredBase: RAW_BASE,
    error: null,
  };

  // Tags (model list)
  try {
    const res = await ollamaFetch("/api/tags");
    if (!res.ok) {
      info.error = `HTTP ${res.status} from /api/tags`;
      return info;
    }
    const data = await res.json();
    info.online = true;
    info.models = (data.models ?? []).map((m: { name: string }) => m.name);
    info.modelLoaded = info.models.some(
      (n) => n === MODEL || n.split(":")[0] === MODEL.split(":")[0]
    );
  } catch (err) {
    info.error = classifyError(err);
    return info;
  }

  // Version (best-effort, don't fail health if unavailable)
  try {
    const vRes = await ollamaFetch("/api/version");
    if (vRes.ok) {
      const vData = await vRes.json();
      info.version = vData.version ?? null;
    }
  } catch { /* version is optional */ }

  return info;
}

/**
 * One-shot generation test. Sends a fixed prompt and returns the raw result.
 * Used by the diagnostics "Test Ollama" button.
 */
export async function testGeneration(): Promise<{
  ok: boolean;
  content: string | null;
  durationMs: number;
  httpStatus: number | null;
  error: string | null;
  model: string;
  resolvedUrl: string;
}> {
  const payload = {
    model: MODEL,
    messages: [{ role: "user", content: "Reply with exactly: OLLAMA OK" }],
    stream: false,
  };

  const t0 = Date.now();
  const result = {
    ok: false,
    content: null as string | null,
    durationMs: 0,
    httpStatus: null as number | null,
    error: null as string | null,
    model: MODEL,
    resolvedUrl: `${BASE}/api/chat`,
  };

  console.info(`[test-ollama] POST ${BASE}/api/chat model=${MODEL}`);

  try {
    const res = await ollamaFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 30_000);

    result.durationMs = Date.now() - t0;
    result.httpStatus = res.status;
    console.info(`[test-ollama] HTTP ${res.status} in ${result.durationMs}ms`);

    const text = await res.text();
    if (!res.ok) {
      result.error = `HTTP ${res.status}: ${text.slice(0, 200)}`;
      return result;
    }

    const body = JSON.parse(text);
    result.content = body.message?.content?.trim() ?? null;
    result.ok = Boolean(result.content);
    if (!result.ok) result.error = "empty content in response";
  } catch (err) {
    result.durationMs = Date.now() - t0;
    result.error = classifyError(err);
    console.error(`[test-ollama] error after ${result.durationMs}ms — ${result.error}`);
  }

  return result;
}
