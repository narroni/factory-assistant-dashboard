"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-helpers";
import AccessDenied from "../../../components/AccessDenied";
import { useToast, ToastList } from "../../../components/Toast";

type AIRule = {
  id: string;
  text: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
};

const RULE_SUGGESTIONS = [
  "Never create orders automatically without explicit user confirmation.",
  "Always show packaging calculations when discussing container shipments.",
  "Use metric units (kg, m, m²) in all calculations.",
  "Always ask for approval before proposing actions.",
  "When answering order fit questions, show weight, footprint, and volume separately.",
  "Respond in the same language the user is writing in.",
  "When data is missing, say so clearly instead of estimating.",
];

export default function AIRulesPage() {
  const [rules, setRules] = useState<AIRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<"checking" | "ok" | "denied">("checking");
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const router = useRouter();
  const { toasts, showToast } = useToast();

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace("/login"); return; }
      if (u.role !== "ADMIN") { setAuthState("denied"); return; }
      setAuthState("ok");
      loadRules();
    });
  }, [router]);

  async function loadRules() {
    try {
      const data = await (await fetch("/api/admin/rules")).json();
      setRules(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function addRule(text: string) {
    if (!text.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), sortOrder: rules.length }),
      });
      if (!res.ok) throw new Error("Failed to add rule");
      const rule = await res.json();
      setRules((prev) => [...prev, rule]);
      setNewText("");
      showToast("Rule added.");
    } catch {
      showToast("Failed to add rule", "error");
    } finally {
      setAdding(false);
    }
  }

  async function toggleRule(id: string, enabled: boolean) {
    try {
      await fetch(`/api/admin/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled } : r));
    } catch {
      showToast("Failed to update rule", "error");
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    try {
      await fetch(`/api/admin/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText.trim() }),
      });
      setRules((prev) => prev.map((r) => r.id === id ? { ...r, text: editText.trim() } : r));
      setEditingId(null);
      showToast("Rule updated.");
    } catch {
      showToast("Failed to update rule", "error");
    }
  }

  async function deleteRule(id: string) {
    try {
      await fetch(`/api/admin/rules/${id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== id));
      showToast("Rule deleted.");
    } catch {
      showToast("Failed to delete rule", "error");
    }
  }

  if (authState === "checking") return null;
  if (authState === "denied") return <AccessDenied />;

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="px-6 py-5 space-y-5 max-w-3xl">

      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">AI Rules</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Rules are injected into every AI request. {activeCount} of {rules.length} active.
        </p>
      </div>

      {/* Add new rule */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 space-y-3">
        <p className="text-xs font-medium text-zinc-400">Add Rule</p>
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Type a rule or pick a suggestion below…"
          rows={2}
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 resize-none placeholder:text-zinc-600"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) { e.preventDefault(); addRule(newText); } }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => addRule(newText)}
            disabled={adding || !newText.trim()}
            className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-100 text-xs font-medium rounded-lg transition-colors"
          >
            {adding ? "Adding…" : "Add Rule"}
          </button>
          <span className="text-xs text-zinc-600">or pick a suggestion:</span>
        </div>
        {/* Suggestions */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {RULE_SUGGESTIONS.filter((s) => !rules.some((r) => r.text === s)).map((s) => (
            <button
              key={s}
              onClick={() => addRule(s)}
              className="text-xs text-zinc-500 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2.5 py-1 rounded-lg transition-colors text-left"
            >
              {s.length > 60 ? s.slice(0, 60) + "…" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Rules list */}
      <section className="bg-zinc-900 rounded-lg border border-zinc-800">
        {loading ? (
          <div className="px-5 py-8 text-xs text-zinc-600 text-center">Loading rules…</div>
        ) : rules.length === 0 ? (
          <div className="px-5 py-10 text-center space-y-1">
            <p className="text-xs text-zinc-500">No rules yet.</p>
            <p className="text-xs text-zinc-700">Add your first rule above or pick a suggestion.</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {rules.map((rule, idx) => (
              <li key={rule.id} className="px-4 py-3">
                {editingId === rule.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-400 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(rule.id)} className="text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg transition-colors">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1 text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleRule(rule.id, !rule.enabled)}
                      className={`mt-0.5 w-8 h-4 rounded-full flex items-center shrink-0 transition-colors ${rule.enabled ? "bg-zinc-500 justify-end pr-0.5" : "bg-zinc-700 justify-start pl-0.5"}`}
                    >
                      <span className="w-3 h-3 bg-zinc-100 rounded-full" />
                    </button>
                    {/* Text */}
                    <p className={`flex-1 text-xs leading-relaxed ${rule.enabled ? "text-zinc-200" : "text-zinc-600 line-through"}`}>
                      {rule.text}
                    </p>
                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingId(rule.id); setEditText(rule.text); }}
                        className="text-xs text-zinc-600 hover:text-zinc-300 px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-xs text-zinc-700 hover:text-red-400 px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ToastList toasts={toasts} />
    </div>
  );
}
