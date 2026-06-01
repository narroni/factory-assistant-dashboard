"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-helpers";

type AIConfig = {
  id: string;
  assistantName: string;
  systemPrompt: string;
  responseStyle: "concise" | "detailed";
  defaultLanguage: string;
  allowedActions: string[];
};

const ACTION_OPTIONS = [
  "create_order",
  "create_purchase_request",
  "update_stock",
  "assign_supplier",
  "generate_report",
  "export_data",
];

export default function AIConfigPage() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace("/login"); return; }
      if (u.role !== "ADMIN") { router.replace("/"); return; }
      loadConfig();
    });
  }, [router]);

  async function loadConfig() {
    try {
      const data = await (await fetch("/api/admin/ai-config")).json();
      setConfig(data);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const data = await (
        await fetch("/api/admin/ai-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        })
      ).json();
      setConfig(data);
      setMessage("Configuration saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="px-8 py-6 text-sm text-zinc-500">Loading…</div>;
  if (!config) return <div className="px-8 py-6 text-sm text-zinc-500">Failed to load configuration</div>;

  return (
    <div className="px-8 py-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">AI Configuration</h1>
        <p className="text-xs text-zinc-500 mt-1">Customize the AI Assistant behavior and capabilities.</p>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-6">
        {/* Assistant Name */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Assistant Name</label>
          <input
            type="text"
            value={config.assistantName}
            onChange={(e) => setConfig({ ...config, assistantName: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            placeholder="e.g., Factory Copilot"
          />
          <p className="text-xs text-zinc-600">Used in system prompt to identify the assistant.</p>
        </div>

        {/* Response Style */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Response Style</label>
          <div className="flex gap-3">
            {(["concise", "detailed"] as const).map((style) => (
              <button
                key={style}
                onClick={() => setConfig({ ...config, responseStyle: style })}
                className={`flex-1 text-xs font-medium px-4 py-2 rounded-lg border transition-colors ${
                  config.responseStyle === style
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-600">
            {config.responseStyle === "concise" ? "Direct, brief answers." : "Detailed, comprehensive explanations."}
          </p>
        </div>

        {/* Default Language */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Default Language</label>
          <select
            value={config.defaultLanguage}
            onChange={(e) => setConfig({ ...config, defaultLanguage: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
          >
            <option value="en">English</option>
            <option value="de">German</option>
          </select>
          <p className="text-xs text-zinc-600">Language preference when user intention is unclear.</p>
        </div>

        {/* Allowed Actions */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Allowed Action Types</label>
          <div className="space-y-2">
            {ACTION_OPTIONS.map((action) => (
              <label key={action} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={config.allowedActions.includes(action)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      allowedActions: e.target.checked
                        ? [...config.allowedActions, action]
                        : config.allowedActions.filter((a) => a !== action),
                    })
                  }
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600"
                />
                <span className="text-zinc-300">{action.replace(/_/g, " ")}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-zinc-600">AI can propose only checked action types.</p>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Custom System Instructions</label>
          <textarea
            value={config.systemPrompt}
            onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
            rows={6}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Add custom instructions for the assistant (e.g., 'Always consider cost first', 'Be cautious about supplier changes')"
          />
          <p className="text-xs text-zinc-600">Appended to the system prompt. Keep concise.</p>
        </div>

        {message && (
          <div
            className={`text-xs px-3 py-2 rounded-lg ${
              message.includes("success")
                ? "bg-emerald-950 border border-emerald-900 text-emerald-400"
                : "bg-red-950 border border-red-900 text-red-400"
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save Configuration"}
          </button>
          <button
            onClick={() => loadConfig()}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
