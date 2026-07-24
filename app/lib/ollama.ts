/**
 * Ollama service layer.
 *
 * All configuration comes from environment variables:
 *   OLLAMA_BASE_URL  (default: http://127.0.0.1:11434)
 *   OLLAMA_MODEL     (default: qwen2.5:7b)
 *
 * Switching models requires only changing OLLAMA_MODEL — no code changes.
 */

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
    headers: {
      "bypass-tunnel-reminder": "true",
      ...options?.headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

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
