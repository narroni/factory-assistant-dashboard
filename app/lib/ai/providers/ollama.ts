/**
 * Ollama implementation of the AIProvider interface.
 *
 * Additive abstraction over the same Ollama HTTP API used by app/lib/ollama.ts.
 * That file remains the live service layer for the assistant routes; this class
 * exists so callers can be migrated to the provider-agnostic interface
 * incrementally.
 */

import type { AIMessage, AIOptions, AIProvider, AIResponse } from "../provider";

export interface OllamaProviderConfig {
  baseUrl: string;
  model: string;
}

/**
 * Normalise localhost → 127.0.0.1.
 * Node.js resolves "localhost" to ::1 (IPv6) first; Ollama only binds on
 * IPv4 (127.0.0.1). Node's fetch does NOT retry on IPv4 — this ensures
 * connections always go to the correct address.
 */
function normalise(url: string): string {
  return url.replace(/\blocalhost\b/g, "127.0.0.1");
}

function classifyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/TimeoutError|timeout|AbortError/i.test(msg)) return "timeout";
  if (/ECONNREFUSED|Connection refused|fetch failed|ENOTFOUND/i.test(msg)) return "connection failed";
  return msg;
}

export class OllamaProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: OllamaProviderConfig) {
    this.baseUrl = normalise(config.baseUrl.trim());
    this.model = config.model.trim();
  }

  supportsTools(): boolean {
    // Tool calling is handled via the ---ACTIONS--- prompt convention for now;
    // native Ollama tool calls are not wired up yet.
    return false;
  }

  private fetch(path: string, options?: RequestInit, timeoutMs = 5_000): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "bypass-tunnel-reminder": "true",
        ...options?.headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  private buildPayload(messages: AIMessage[], options: AIOptions | undefined, stream: boolean) {
    return {
      model: options?.model ?? this.model,
      messages,
      stream,
      options: {
        temperature: options?.temperature ?? 0.1,
        top_k: 10,
        top_p: 0.5,
        num_ctx: 8192,
        ...(options?.maxTokens !== undefined ? { num_predict: options.maxTokens } : {}),
      },
    };
  }

  async chat(messages: AIMessage[], options?: AIOptions): Promise<AIResponse> {
    const payload = this.buildPayload(messages, options, false);
    const t0 = Date.now();

    let res: Response;
    try {
      res = await this.fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, 90_000);
    } catch (err) {
      throw new Error(classifyError(err));
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(res.status === 404 ? "model not found" : `HTTP ${res.status}: ${text.slice(0, 100)}`);
    }

    let body: { message?: { content?: string }; done_reason?: string };
    try {
      body = await res.json();
    } catch {
      throw new Error("invalid json");
    }

    const content = body.message?.content?.trim() ?? "";
    if (!content) throw new Error("empty response");

    console.info(`[ai/ollama] ✓ chat model=${payload.model} ms=${Date.now() - t0}`);
    return {
      content,
      model: payload.model,
      finishReason: body.done_reason === "length" ? "length" : "stop",
    };
  }

  async stream(messages: AIMessage[], options?: AIOptions): Promise<ReadableStream<string>> {
    const payload = this.buildPayload(messages, options, true);
    const t0 = Date.now();

    // Connection / header phase — failures here throw so the caller can fall back.
    const res = await this.fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 90_000);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(res.status === 404 ? "model not found" : `HTTP ${res.status}: ${text.slice(0, 100)}`);
    }
    if (!res.body) throw new Error("no response body");

    const upstream = res.body;

    // Wrap the NDJSON byte stream into a token (string) stream.
    return new ReadableStream<string>({
      async start(controller) {
        const reader = upstream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handleLine = (line: string): boolean => {
          const trimmed = line.trim();
          if (!trimmed) return false;
          let obj: { message?: { content?: string }; done?: boolean };
          try {
            obj = JSON.parse(trimmed);
          } catch {
            return false; // skip partial / non-JSON line
          }
          const token = obj.message?.content ?? "";
          if (token) controller.enqueue(token);
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
                controller.close();
                return;
              }
            }
          }
          if (buffer.trim()) handleLine(buffer);
          controller.close();
        } catch (err) {
          console.error(`[ai/ollama] ✗ stream error after ${Date.now() - t0}ms:`, err instanceof Error ? err.message : err);
          controller.error(err);
        } finally {
          reader.releaseLock();
        }
      },
    });
  }

  async healthCheck(): Promise<{ reachable: boolean; modelExists: boolean; error?: string }> {
    try {
      const res = await this.fetch("/api/tags");
      if (!res.ok) {
        return { reachable: false, modelExists: false, error: `HTTP ${res.status} from /api/tags` };
      }
      const data = await res.json();
      const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name);
      const modelExists = models.some(
        (n) => n === this.model || n.split(":")[0] === this.model.split(":")[0]
      );
      return { reachable: true, modelExists };
    } catch (err) {
      return { reachable: false, modelExists: false, error: classifyError(err) };
    }
  }
}
