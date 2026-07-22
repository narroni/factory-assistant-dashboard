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
  const name = config?.assistantName ?? "Factory Operations Assistant";
  const styleGuide = "Be direct and give real answers. Analyze the data, don't just repeat it. When something looks wrong, say so and suggest what to do.";

  const customPrompt = config?.systemPrompt ? `\n\nCUSTOM INSTRUCTIONS:\n${config.systemPrompt}` : "";

  // Extract deterministic calculation block and remaining knowledge separately
  let deterministicBlock = "";
  let remainingKnowledge = "";
  if (knowledge) {
    const startIdx = knowledge.indexOf("[DETERMINISTIC CALCULATION");
    if (startIdx !== -1) {
      const endIdx = knowledge.indexOf("]", startIdx);
      if (endIdx !== -1) {
        const calcBlock = knowledge.substring(startIdx, endIdx + 1);
        deterministicBlock = `\n\n>>> PRIORITY: USE THIS CALCULATION RESULT <<<\n${calcBlock}\n>>> END CALCULATION RESULT <<<`;
        remainingKnowledge = (knowledge.substring(0, startIdx) + knowledge.substring(endIdx + 1)).trim();
      } else {
        remainingKnowledge = knowledge;
      }
    } else {
      remainingKnowledge = knowledge;
    }
  }
  const knowledgeSection = remainingKnowledge ? `\n\nFACTORY KNOWLEDGE:\n${remainingKnowledge}` : "";

  const actionTypesText = [
    '- GENERATE_REPORT: {"reportType":"inventory|orders|products|suppliers|capacity","format":"xlsx|csv|pdf","title":"..."}',
    '- GENERATE_XLSX: {"title":"...","description":"..."}',
    '- GENERATE_CSV: {"title":"...","description":"..."}',
    '- GENERATE_PDF: {"title":"...","description":"..."}',
    '- CREATE_PURCHASE_ORDER: {"materialCode":"...","quantity":0,"unit":"...","supplierName":"..."}',
    '- CREATE_PRODUCTION_PLAN: {"products":[{"id":"articleCode","quantity":0}],"notes":"..."}',
    '- INVENTORY_RECOMMENDATION: {"type":"reorder|review","materialCode":"...","reason":"..."}',
  ];

  return `You are ${name}, the in-house AI assistant employed by an industrial blade manufacturing company. You work FOR this factory — you are not a customer, and you do not work for any customer.

You have access to real-time factory database data, updated as of ${ctx.asOf}.

YOUR CAPABILITIES:
- Answer questions about inventory, orders, suppliers, and products
- Perform packaging and container calculations (deterministic — use provided data)
- Explain and summarize data
- Generate reports and exports when explicitly requested

${styleGuide}${customPrompt}

A few things to keep in mind:
- Don't make up inventory quantities, order values, or performance metrics — base answers strictly on the factory data below, and if something isn't in there, just say so.
- For packaging/container/fit/weight/tower/crate questions, give the direct calculated answer from the data — these are read-only lookups, never something to propose an action for.
- Any "customer" name in the data below is a CLIENT placing an order with the factory, never the factory itself. If asked what company this is, you work for the factory (an industrial blade manufacturer) — don't answer with a customer's name.${deterministicBlock}

CURRENT FACTORY DATA:
${JSON.stringify(ctx, null, 2)}${knowledgeSection}

DOCUMENT/REPORT REQUESTS — only relevant if the user explicitly asks to generate, create, or export something:
Trigger phrases: "generate report", "create Excel", "export CSV", "make a PDF", "create purchase order", "create production plan".
If triggered, append ONCE at the END of your answer:
---ACTIONS---
[{"actionType":"GENERATE_REPORT","payload":{...},"reasoning":"brief reason"}]
---END---

Supported action types (use UPPERCASE_SNAKE_CASE exactly):
${actionTypesText.join("\n")}

Propose at most 1 action per response, and only use types from the list above. For everything else — including any calculation or status question like "can this order fit in a container," "how many crates/towers," or "what's the weight/footprint/volume" — just answer directly with no ---ACTIONS--- block.

TONE: Natural and conversational, like a knowledgeable colleague. You can use plain formatting like short paragraphs or simple lists when it helps clarity, but don't force structure where it isn't needed.
Never use LaTeX or mathematical notation like \frac{}{} or \text{} — always write numbers and formulas in plain text (e.g. '31,500 kg ÷ 87.9 kg/crate = 356 crates').

HOW TO USE THE FACTORY DATA:
- The CURRENT FACTORY DATA below is structured JSON — use it to extract specific facts, don't repeat it verbatim
- When asked a question, identify what's relevant in the data and answer in plain language
- For "what should I think about" or "give me your opinion" questions, analyze the data and give a real answer with specific observations and suggestions
- If stock is 0 or low, flag it as a problem and say what to do about it
- If an order quantity exceeds minimum order quantity or has other implications, mention them
- When a [MAX CAPACITY RESULT] or [CONTAINER OPTIMIZATION RESULT] or [CONTAINER MIX ANALYSIS] block is present in the context, you MUST use ONLY those exact numbers in your answer. Never calculate packaging numbers yourself — the deterministic results are always correct. Simply explain what the numbers mean in plain language and give a recommendation.
- Never respond with raw numbers from the JSON without explaining what they mean`;
}

// ── Action proposal parser ─────────────────────────────────────────────────────

/**
 * Marker that begins the machine-readable action block. Everything before it is
 * the visible prose answer; everything after is JSON. The streaming route uses
 * this to stop emitting visible tokens once the model starts the action block.
 */
export const ACTION_SEPARATOR = "---ACTIONS---";
const ACTION_SEPARATOR_END = "---END---";

function parseProposals(raw: string): { answer: string; proposals: ActionProposal[] } {
  const idx = raw.indexOf(ACTION_SEPARATOR);
  if (idx === -1) return { answer: raw.trim(), proposals: [] };

  const answer  = raw.slice(0, idx).trim();
  const endIdx  = raw.indexOf(ACTION_SEPARATOR_END, idx);
  const jsonStr = endIdx === -1
    ? raw.slice(idx + ACTION_SEPARATOR.length).trim()
    : raw.slice(idx + ACTION_SEPARATOR.length, endIdx).trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const proposals: ActionProposal[] = Array.isArray(parsed) ? parsed : [];
    return { answer, proposals };
  } catch {
    console.warn("[ollama] action block parse failed:", jsonStr.slice(0, 200));
    return { answer, proposals: [] };
  }
}

/**
 * Turn a full raw assistant response into a visible answer + validated-shape proposals.
 * Shared by runCopilot() (non-streaming) and the streaming route, which accumulates the
 * raw text during streaming and finalizes here after the last token. When the model
 * returned only an action block with no prose, a brief confirmation is substituted.
 */
export function parseAssistantResponse(raw: string): { answer: string; proposals: ActionProposal[] } {
  const { answer: rawAnswer, proposals } = parseProposals(raw);
  const answer = rawAnswer || (proposals.length > 0
    ? `I've prepared ${proposals.length === 1 ? "an action proposal" : `${proposals.length} action proposals`} for your review. Please check the details below and approve if correct.`
    : "");
  return { answer, proposals };
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

  const payload = {
    model: MODEL,
    messages,
    stream: false,
    options: {
      temperature: 0.1,
      top_k: 10,
      top_p: 0.5,
      num_ctx: 8192,
    },
  };

  console.info(`[ollama] → POST /api/chat model=${MODEL} history=${history.length} q="${question.slice(0, 60)}"`);

  const t0 = Date.now();
  let res: Response;

  try {
    res = await ollamaFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 90_000);
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

  const { answer, proposals } = parseAssistantResponse(raw);
  console.info(`[ollama] ✓ model=${MODEL} ms=${ms} proposals=${proposals.length} answer="${answer.slice(0, 80)}"`);
  return { ok: true, answer, proposals, model: MODEL };
}

/**
 * Streaming variant of runCopilot(). Sends the same system prompt + factory context +
 * conversation history to Ollama with stream:true and returns a ReadableStream of raw
 * content deltas (tokens) as they arrive from /api/chat's NDJSON body.
 *
 * The caller is responsible for accumulating the full text and finalizing it with
 * parseAssistantResponse() once the stream closes (see design decision #3). This
 * function NEVER writes to the database and does NOT parse proposals itself.
 *
 * Throws on connection/HTTP failure *before* any token is emitted, so the caller can
 * fall back cleanly. A failure that occurs mid-stream surfaces as a stream error on
 * the returned ReadableStream.
 */
export async function streamCopilot({
  question,
  history,
  ctx,
  language = "en",
  config,
  knowledge,
}: {
  question: string;
  history: ConversationMessage[];
  ctx: FactoryContext;
  language?: string;
  config?: { assistantName?: string; systemPrompt?: string; responseStyle?: string; allowedActions?: string[] };
  knowledge?: string;
}): Promise<ReadableStream<string>> {
  const langInstruction = language === "de"
    ? "Answer in German (Deutsch). The user is writing in German."
    : "Answer in English.";

  const messages = [
    { role: "system" as const, content: buildSystemPrompt(ctx, config, knowledge) },
    ...history.slice(-10),
    { role: "user" as const, content: `${question}\n\n[Language instruction: ${langInstruction}]` },
  ];

  const payload = {
    model: MODEL,
    messages,
    stream: true,
    options: {
      temperature: 0.1,
      top_k: 10,
      top_p: 0.5,
      num_ctx: 8192,
    },
  };

  console.info(`[ollama] → POST /api/chat (stream) model=${MODEL} history=${history.length} q="${question.slice(0, 60)}"`);
  const t0 = Date.now();

  // Connection / header phase — failures here throw so the caller can fall back.
  const res = await ollamaFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 90_000);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const reason = res.status === 404 ? "model not found" : `HTTP ${res.status}: ${text.slice(0, 100)}`;
    console.error(`[ollama] ✗ ${reason}`);
    throw new Error(reason);
  }
  if (!res.body) {
    console.error("[ollama] ✗ no response body from /api/chat (stream)");
    throw new Error("no response body");
  }

  const upstream = res.body;

  // Wrap the NDJSON byte stream into a token (string) stream.
  return new ReadableStream<string>({
    async start(controller) {
      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let tokenCount = 0;

      const handleLine = (line: string): boolean => {
        // Returns true when Ollama signals done:true (stream complete).
        const trimmed = line.trim();
        if (!trimmed) return false;
        let obj: { message?: { content?: string }; done?: boolean };
        try {
          obj = JSON.parse(trimmed);
        } catch {
          return false; // skip partial / non-JSON line
        }
        const token = obj.message?.content ?? "";
        if (token) { controller.enqueue(token); tokenCount++; }
        return obj.done === true;
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (handleLine(line)) {
              console.info(`[ollama] ✓ stream complete ms=${Date.now() - t0} tokens=${tokenCount}`);
              controller.close();
              return;
            }
          }
        }
        // Flush any trailing buffered line after the byte stream ends.
        if (buffer.trim()) handleLine(buffer);
        console.info(`[ollama] ✓ stream ended ms=${Date.now() - t0} tokens=${tokenCount}`);
        controller.close();
      } catch (err) {
        console.error(`[ollama] ✗ stream error after ${Date.now() - t0}ms:`, err instanceof Error ? err.message : err);
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
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
