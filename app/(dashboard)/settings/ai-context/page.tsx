"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-helpers";
import AccessDenied from "../../../components/AccessDenied";

export default function AIContextPage() {
  const [authState, setAuthState] = useState<"checking" | "ok" | "denied">("checking");
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState<any>(null);
  const [tab, setTab] = useState<"rules" | "knowledge" | "factory">("rules");
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace("/login"); return; }
      if (u.role !== "ADMIN") { setAuthState("denied"); return; }
      setAuthState("ok");
      setLoading(false);
    });
  }, [router]);

  async function fetchContext() {
    try {
      const res = await fetch("/api/assistant/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setContext(data);
    } catch (err) {
      console.error("Failed to fetch context:", err);
    }
  }

  if (authState === "checking" || loading) return null;
  if (authState === "denied") return <AccessDenied />;

  return (
    <div className="px-6 py-5 space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">AI Context Viewer</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          See what context and rules are sent to the AI for a given question.
        </p>
      </div>

      {/* Question input */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 space-y-3">
        <p className="text-xs font-medium text-zinc-400">Query</p>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question to see what context will be sent to the AI…"
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 resize-none"
        />
        <button
          onClick={fetchContext}
          disabled={!question.trim()}
          className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-100 text-xs font-medium rounded-lg transition-colors"
        >
          Load Context
        </button>
      </div>

      {/* Context tabs */}
      {context && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800 bg-zinc-950">
            {(["rules", "knowledge", "factory"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
                  tab === t
                    ? "text-zinc-100 border-b-2 border-zinc-400"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {t === "rules" && "Rules"}
                {t === "knowledge" && "Relevant Knowledge"}
                {t === "factory" && "Factory Context"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {tab === "rules" && (
              <div className="space-y-2">
                {context.rules && context.rules.length > 0 ? (
                  <ul className="space-y-1.5">
                    {context.rules.map((rule: any, idx: number) => (
                      <li key={rule.id} className="text-xs text-zinc-300">
                        <span className="text-zinc-600">{idx + 1}.</span> {rule.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-600">No active rules.</p>
                )}
              </div>
            )}

            {tab === "knowledge" && (
              <div className="space-y-2">
                {context.knowledge ? (
                  <pre className="text-xs text-zinc-400 bg-zinc-800 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                    {context.knowledge}
                  </pre>
                ) : (
                  <p className="text-xs text-zinc-600">No relevant knowledge found for this question.</p>
                )}
              </div>
            )}

            {tab === "factory" && (
              <div className="space-y-2">
                <pre className="text-xs text-zinc-400 bg-zinc-800 p-3 rounded overflow-x-auto max-h-80">
                  {JSON.stringify(context.factoryContext, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
