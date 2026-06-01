"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../lib/auth-helpers";
import type {
  TotalMaterialsResult,
  LowStockResult,
  OpenOrdersResult,
  BestSuppliersResult,
  ProductCapacityResult,
  ToolResult,
} from "../../api/assistant/queries";

// ── Types ─────────────────────────────────────────────────────────────────────

type AssistantResponse = {
  question: string;
  intent: string;
  result: ToolResult | null;
  summary: string;
  error?: string;
  respondedAt: string;
};

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; response: AssistantResponse; loading?: false }
  | { role: "assistant"; loading: true };

// ── Suggested questions ───────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: "How many materials do we have?",   icon: "📦" },
  { label: "Which materials are low stock?",   icon: "⚠️" },
  { label: "How many open orders do we have?", icon: "📋" },
  { label: "Which suppliers perform best?",    icon: "🏆" },
  { label: "What is our product capacity?",    icon: "⚙️" },
];

// ── Intent label ──────────────────────────────────────────────────────────────

const INTENT_LABELS: Record<string, string> = {
  total_materials:  "Total Materials",
  low_stock_items:  "Low Stock Items",
  open_orders:      "Open Orders",
  best_suppliers:   "Best Suppliers",
  product_capacity: "Product Capacity",
  unknown:          "Unknown",
};

// ── Result renderers ──────────────────────────────────────────────────────────

function KpiPill({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-zinc-800 rounded-lg px-4 py-3 text-center">
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function SectionTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <p className="text-xs text-zinc-500 py-2">No data.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-700 mt-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-zinc-500 uppercase tracking-wider border-b border-zinc-700 bg-zinc-800/60">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`hover:bg-zinc-700/30 transition-colors ${i < rows.length - 1 ? "border-b border-zinc-700/50" : ""}`}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-zinc-300">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TotalMaterialsCard({ data }: { data: TotalMaterialsResult["data"] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiPill label="Total"        value={data.total}        accent="text-blue-400" />
        <KpiPill label="In Stock"     value={data.inStock}      accent="text-emerald-400" />
        <KpiPill label="Low Stock"    value={data.lowStock}     accent="text-amber-400" />
        <KpiPill label="Out of Stock" value={data.outOfStock}   accent="text-red-400" />
      </div>
      {data.byCategory.length > 0 && (
        <SectionTable
          headers={["Category", "Count"]}
          rows={data.byCategory.map((c) => [c.category, c.count])}
        />
      )}
    </div>
  );
}

function LowStockCard({ data }: { data: LowStockResult["data"] }) {
  if (data.items.length === 0) {
    return <p className="text-sm text-emerald-400">✓ All materials are adequately stocked.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <KpiPill label="Low Stock"    value={data.lowStockCount}    accent="text-amber-400" />
        <KpiPill label="Out of Stock" value={data.outOfStockCount}  accent="text-red-400" />
      </div>
      <SectionTable
        headers={["Material", "Code", "Qty", "Unit", "Status", "Supplier"]}
        rows={data.items.map((m) => [m.name, m.code, m.quantity, m.unit, m.status, m.supplier])}
      />
    </div>
  );
}

function OpenOrdersCard({ data }: { data: OpenOrdersResult["data"] }) {
  if (data.total === 0) {
    return <p className="text-sm text-emerald-400">✓ No open orders at this time.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiPill label="Total Open"    value={data.total}         accent="text-zinc-100" />
        <KpiPill label="Pending"       value={data.pending}       accent="text-amber-400" />
        <KpiPill label="In Production" value={data.inProduction}  accent="text-blue-400" />
        <KpiPill label="Delayed"       value={data.delayed}       accent="text-red-400" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <KpiPill label="Total Value" value={`€${data.totalValueEur.toLocaleString("en")}`} accent="text-emerald-400" />
        <KpiPill label="Earliest Due" value={data.soonestDueDate ?? "—"} accent="text-zinc-300" />
      </div>
      <SectionTable
        headers={["Order No.", "Customer", "Product", "Status", "Due", "Value"]}
        rows={data.orders.map((o) => [
          o.orderNumber,
          o.customer,
          o.product,
          o.status,
          o.dueDate,
          `€${o.valueEur.toLocaleString("en")}`,
        ])}
      />
    </div>
  );
}

function BestSuppliersCard({ data }: { data: BestSuppliersResult["data"] }) {
  if (data.suppliers.length === 0) {
    return <p className="text-sm text-zinc-500">No active suppliers found.</p>;
  }
  return (
    <SectionTable
      headers={["Supplier", "On-Time Rate", "Lead Time (days)", "Country", "Status"]}
      rows={data.suppliers.map((s, i) => [
        `${i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : "   "}${s.name}`,
        `${s.onTimeRate}%`,
        s.leadTimeDays,
        s.country,
        s.status,
      ])}
    />
  );
}

function ProductCapacityCard({ data }: { data: ProductCapacityResult["data"] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiPill label="Total"     value={data.total}     accent="text-zinc-100" />
        <KpiPill label="Active"    value={data.active}    accent="text-emerald-400" />
        <KpiPill label="Prototype" value={data.prototype} accent="text-purple-400" />
        <KpiPill label="Inactive"  value={data.inactive}  accent="text-zinc-500" />
      </div>
      {data.activeProducts.length > 0 && (
        <SectionTable
          headers={["Product", "Code", "Primary Material"]}
          rows={data.activeProducts.map((p) => [p.name, p.code, p.primaryMaterial])}
        />
      )}
    </div>
  );
}

function ResultCard({ result }: { result: ToolResult }) {
  switch (result.tool) {
    case "total_materials":
      return <TotalMaterialsCard data={result.data} />;
    case "low_stock_items":
      return <LowStockCard data={result.data} />;
    case "open_orders":
      return <OpenOrdersCard data={result.data} />;
    case "best_suppliers":
      return <BestSuppliersCard data={result.data} />;
    case "product_capacity":
      return <ProductCapacityCard data={result.data} />;
  }
}

// ── Message bubbles ───────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-lg bg-blue-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm">
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ response }: { response: AssistantResponse }) {
  const intentLabel = INTENT_LABELS[response.intent] ?? response.intent;
  const isUnknown = response.intent === "unknown";

  return (
    <div className="flex justify-start">
      <div className="max-w-full w-full space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shrink-0" style={{ fontSize: 11 }}>
            ✦
          </div>
          <span className="text-xs text-zinc-500">Factory Assistant</span>
          {!isUnknown && (
            <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
              {intentLabel}
            </span>
          )}
        </div>

        {/* Summary */}
        <p className="text-sm text-zinc-200 leading-relaxed pl-8">{response.summary}</p>

        {/* Structured result */}
        {response.result && !isUnknown && (
          <div className="pl-8">
            <ResultCard result={response.result} />
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-zinc-600 pl-8">
          {new Date(response.respondedAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shrink-0" style={{ fontSize: 11 }}>
          ✦
        </div>
        <div className="flex gap-1 px-3 py-2 bg-zinc-800 rounded-2xl rounded-tl-sm">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) router.replace("/login");
      else setAuthed(true);
    });
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendQuestion(question: string) {
    const q = question.trim();
    if (!q || sending) return;

    setInput("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "assistant", loading: true },
    ]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const data: AssistantResponse = await res.json();

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", response: data };
        return next;
      });
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          response: {
            question: q,
            intent: "unknown",
            result: null,
            summary: "Something went wrong. Please try again.",
            respondedAt: new Date().toISOString(),
          },
        };
        return next;
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  }

  if (authed === null) return null;

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Empty state / welcome */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center pt-16 pb-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-900/30">
                ✦
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-100 mb-1">Factory Assistant</h2>
                <p className="text-sm text-zinc-500 max-w-sm">
                  Ask questions about your factory data. I can look up materials, orders, suppliers, and products.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-900 text-amber-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Read-only · No database writes
              </div>
            </div>
          )}

          {/* Message thread */}
          {messages.map((msg, i) => {
            if (msg.role === "user") return <UserBubble key={i} text={msg.text} />;
            if ("loading" in msg && msg.loading) return <LoadingBubble key={i} />;
            if ("response" in msg) return <AssistantBubble key={i} response={msg.response} />;
            return null;
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggested questions */}
      {isEmpty && (
        <div className="px-6 pb-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => sendQuestion(s.label)}
                  disabled={sending}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-zinc-900 border border-zinc-700 focus-within:border-blue-500 rounded-xl px-4 py-3 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about materials, orders, suppliers, or products…"
              rows={1}
              disabled={sending}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={() => sendQuestion(input)}
              disabled={!input.trim() || sending}
              className="shrink-0 w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
            >
              {sending ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-zinc-600 text-center mt-2">
            Press Enter to send · Shift+Enter for new line · Read-only queries only
          </p>
        </div>
      </div>
    </div>
  );
}
