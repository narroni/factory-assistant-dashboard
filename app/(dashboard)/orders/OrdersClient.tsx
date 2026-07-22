"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "../../hooks/useTranslation";
import { generateCSV } from "../../lib/export";
import { ModalShell } from "../../components/ModalShell";
import { DeleteConfirm } from "../../components/DeleteConfirm";
import { useToast, ToastList } from "../../components/Toast";
import { Label, inputCls, SearchInput, AddButton, EditButton, DeleteButton, InlineStatusSelect } from "../../components/ui";
import {
  addOrder, updateOrder, deleteOrder, changeOrderStatus,
  calculateOrderLines,
  type Order, type OrderStatus, type OrderLineData, type OrderLineCalc, type OrderTotals,
} from "./actions";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES: OrderStatus[] = ["Pending", "In Production", "Completed", "Delayed", "Cancelled"];

const statusStyles: Record<OrderStatus, string> = {
  "Pending":       "bg-amber-900/50 text-amber-300 border border-amber-800",
  "In Production": "bg-blue-900/50 text-blue-300 border border-blue-800",
  "Completed":     "bg-emerald-900/50 text-emerald-300 border border-emerald-800",
  "Delayed":       "bg-red-900/50 text-red-300 border border-red-800",
  "Cancelled":     "bg-zinc-800 text-zinc-500 border border-zinc-700",
};

// Mirrors the UI -> DB enum mapping used inside addOrder() in actions.ts —
// worker requests must carry the same fields the direct-save path persists.
const ORDER_STATUS_TO_DB: Record<OrderStatus, string> = {
  "Pending": "PENDING",
  "In Production": "IN_PRODUCTION",
  "Completed": "COMPLETED",
  "Delayed": "DELAYED",
  "Cancelled": "CANCELLED",
};

type BPOption = { id: string; articleCode: string; productName: string; pcsPerCrate: number };
type CustomerOption = { id: string; name: string };

// ── Order Form ─────────────────────────────────────────────────────────────────

type FormState = {
  customer: string; customerId: string;
  product: string; productCode: string; qty: number;
  status: OrderStatus; dueDate: string; value: number;
  lines: Omit<OrderLineData, "id">[];
};

const EMPTY_FORM: FormState = {
  customer: "", customerId: "",
  product: "", productCode: "", qty: 0,
  status: "Pending", dueDate: "", value: 0,
  lines: [],
};

function OrderForm({
  mode, orderId, form, bladeProducts, customers, onChange, onSave, onClose,
}: {
  mode: "add" | "edit"; orderId: string; form: FormState;
  bladeProducts: BPOption[]; customers: CustomerOption[];
  onChange: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onSave: () => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const statusLabels: Record<OrderStatus, string> = {
    "Pending": t("status.pending"),
    "In Production": t("status.in_production"),
    "Completed": t("status.completed"),
    "Delayed": t("status.delayed"),
    "Cancelled": t("status.cancelled"),
  };
  const hasLines = form.lines.length > 0;
  const isValid = form.customer.trim() && form.dueDate &&
    (hasLines || (form.product.trim() && form.qty > 0));

  function addLine() {
    const first = bladeProducts[0];
    if (!first) return;
    onChange("lines", [...form.lines, { bladeProductId: first.id, articleCode: first.articleCode, productName: first.productName, qty: 0 }]);
  }
  function removeLine(i: number) { onChange("lines", form.lines.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, field: keyof Omit<OrderLineData, "id">, value: string | number) {
    const next = [...form.lines];
    if (field === "bladeProductId") {
      const bp = bladeProducts.find((p) => p.id === value);
      if (bp) next[i] = { ...next[i], bladeProductId: bp.id, articleCode: bp.articleCode, productName: bp.productName };
    } else {
      (next[i] as Record<string, unknown>)[field] = value;
    }
    onChange("lines", next);
  }

  return (
    <ModalShell
      title={mode === "add" ? t("form.add_order") : t("form.edit_order")}
      subtitle={`${t("table.order_no")}: ${orderId}`}
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">{t("delete.cancel")}</button>
          <button onClick={onSave} disabled={!isValid} className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
            {mode === "add" ? t("action.add_order") : t("action.save_changes")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Customer + status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t("form.label_customer_name")} <span className="text-red-500">{t("form.required_field")}</span></Label>
            {customers.length > 0 ? (
              <select
                className={inputCls}
                value={form.customerId}
                onChange={(e) => {
                  const c = customers.find((c) => c.id === e.target.value);
                  onChange("customerId", e.target.value);
                  if (c) onChange("customer", c.name);
                }}
              >
                <option value="">— type or select —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : null}
            <input
              className={`${inputCls} mt-1.5`}
              value={form.customer}
              onChange={(e) => { onChange("customer", e.target.value); onChange("customerId", ""); }}
              placeholder="Customer name"
            />
          </div>
          <div>
            <Label>{t("table.status")}</Label>
            <select className={inputCls} value={form.status} onChange={(e) => onChange("status", e.target.value as OrderStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t("form.label_due_date")} <span className="text-red-500">{t("form.required_field")}</span></Label>
            <input type="date" className={inputCls} value={form.dueDate} onChange={(e) => onChange("dueDate", e.target.value)} />
          </div>
          <div>
            <Label>{t("form.label_total_price")} (€)</Label>
            <input type="number" step="any" min="0" className={inputCls} value={form.value || ""} onChange={(e) => onChange("value", parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
        </div>

        {/* Order Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Order Lines</p>
            <button onClick={addLine} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add line
            </button>
          </div>

          {form.lines.length === 0 && (
            <div className="border border-dashed border-zinc-700 rounded-lg p-3 mb-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>{t("form.label_product")} (legacy single-line)</Label>
                  <input className={inputCls} value={form.product} onChange={(e) => onChange("product", e.target.value)} placeholder="Product name" />
                </div>
                <div>
                  <Label>{t("table.qty")}</Label>
                  <input type="number" min="1" className={inputCls} value={form.qty || ""} onChange={(e) => onChange("qty", parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          )}

          {form.lines.map((line, i) => (
            <div key={i} className="flex items-start gap-2 mb-2 p-2.5 bg-zinc-800 rounded-lg">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <Label>{t("table.article_code")}</Label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:border-zinc-500"
                    value={line.bladeProductId}
                    onChange={(e) => updateLine(i, "bladeProductId", e.target.value)}
                  >
                    {bladeProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.articleCode}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Qty (pcs)</Label>
                  <input
                    type="number" min="1"
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:border-zinc-500"
                    value={line.qty || ""}
                    onChange={(e) => updateLine(i, "qty", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <button onClick={() => removeLine(i)} className="mt-5 w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}

          {form.lines.length === 0 && (
            <button onClick={addLine} className="w-full py-2.5 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 hover:border-zinc-600 transition-colors">
              + Add product line
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

// ── Order Detail Panel ────────────────────────────────────────────────────────

function OrderDetailPanel({
  order, onClose, onEdit, onDelete, isWorker,
}: {
  order: Order; onClose: () => void;
  onEdit: (o: Order) => void; onDelete: (id: string) => void; isWorker: boolean;
}) {
  const { t } = useTranslation();
  const statusLabels: Record<OrderStatus, string> = {
    "Pending": t("status.pending"),
    "In Production": t("status.in_production"),
    "Completed": t("status.completed"),
    "Delayed": t("status.delayed"),
    "Cancelled": t("status.cancelled"),
  };
  const [lineCalcs, setLineCalcs] = useState<OrderLineCalc[]>([]);
  const [totals, setTotals] = useState<OrderTotals | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const linesToCalc = order.lines.length > 0
    ? order.lines.map((l) => ({ articleCode: l.articleCode, qty: l.qty }))
    : order.productCode ? [{ articleCode: order.productCode, qty: order.qty }] : [];

  useEffect(() => {
    if (linesToCalc.length === 0) return;
    setCalcLoading(true);
    calculateOrderLines(linesToCalc)
      .then(({ lineCalcs: lc, totals: t }) => { setLineCalcs(lc); setTotals(t); })
      .catch(() => {})
      .finally(() => setCalcLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div className="flex justify-between gap-3 py-1 border-b border-zinc-800 last:border-b-0">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-xs text-zinc-200">{value}</span>
      </div>
    );
  }

  return (
    <div className="w-96 shrink-0 bg-zinc-900 border border-zinc-700 rounded-xl flex flex-col max-h-[calc(100vh-10rem)] overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
        <div>
          <span className="text-xs font-mono text-zinc-400">{order.orderNumber}</span>
          <h2 className="text-sm font-semibold text-zinc-100 mt-0.5">{order.customer}</h2>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${statusStyles[order.status]}`}>{statusLabels[order.status]}</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Basic info */}
        <div>
          <Row label="Due Date" value={order.dueDate} />
          <Row label="Value" value={`€${order.value.toLocaleString()}`} />
        </div>

        {/* Lines */}
        {(order.lines.length > 0) ? (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Order Lines</p>
            <div className="space-y-1.5">
              {order.lines.map((l, i) => {
                const calc = lineCalcs.find((c) => c.articleCode === l.articleCode);
                return (
                  <div key={i} className="bg-zinc-800 rounded-lg px-3 py-2.5 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs font-mono text-zinc-200">{l.articleCode}</span>
                      <span className="text-xs text-zinc-400">{l.qty.toLocaleString()} pcs</span>
                    </div>
                    {calc && (
                      <div className="grid grid-cols-2 gap-x-3 text-xs text-zinc-500 pt-1 border-t border-zinc-700">
                        <span>Crates: <span className="text-zinc-300">{calc.cratesRequired}</span></span>
                        <span>Towers: <span className="text-zinc-300">{calc.towersRequired}</span></span>
                        <span>Net: <span className="text-zinc-300">{calc.netWeightKg.toFixed(1)} kg</span></span>
                        <span>Total: <span className="text-zinc-300">{calc.totalWeightKg.toFixed(1)} kg</span></span>
                        <span>Area: <span className="text-zinc-300">{calc.footprintM2.toFixed(2)} m²</span></span>
                        <span>Vol: <span className="text-zinc-300">{calc.volumeM3.toFixed(2)} m³</span></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : order.product ? (
          <div>
            <Row label="Product" value={order.product} />
            <Row label="Qty" value={order.qty.toLocaleString()} />
          </div>
        ) : null}

        {/* Totals */}
        {totals && !calcLoading && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Shipment Summary</p>
            <div className="space-y-1">
              <Row label="Total pieces" value={totals.totalPcs.toLocaleString()} />
              <Row label="Total crates" value={totals.totalCrates.toLocaleString()} />
              <Row label="Total towers" value={totals.totalTowers.toLocaleString()} />
              <Row label="Net weight" value={`${totals.totalNetWeightKg.toFixed(1)} kg`} />
              <Row label="Total shipment wt." value={`${totals.totalShipmentWeightKg.toFixed(1)} kg`} />
              <Row label="Total footprint" value={`${totals.totalFootprintM2.toFixed(2)} m²`} />
              <Row label="Total volume" value={`${totals.totalVolumeM3.toFixed(2)} m³`} />
            </div>
            <div className="mt-2 flex gap-2">
              <span className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${totals.fits20ft ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-900 text-red-400 border-red-900"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${totals.fits20ft ? "bg-emerald-500" : "bg-red-500"}`} />
                20ft {totals.fits20ft ? "fits" : `(${totals.limitingFactor20ft.join(", ")})`}
              </span>
              <span className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${totals.fits40ft ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-900 text-red-400 border-red-900"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${totals.fits40ft ? "bg-emerald-500" : "bg-red-500"}`} />
                40ft {totals.fits40ft ? "fits" : `(${totals.limitingFactor40ft.join(", ")})`}
              </span>
            </div>
          </div>
        )}
        {calcLoading && <div className="text-xs text-zinc-600">Calculating…</div>}
      </div>

      {!isWorker && (
        <div className="flex items-center gap-2 px-5 py-3 border-t border-zinc-800 shrink-0">
          <button onClick={() => onEdit(order)} className="flex-1 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Edit</button>
          <button onClick={() => onDelete(order.id)} className="px-4 py-2 text-xs font-medium text-red-400 hover:text-red-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors">Delete</button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersClient({ initialItems, bladeProducts, customers }: {
  initialItems: Order[]; bladeProducts: BPOption[]; customers: CustomerOption[];
}) {
  const { user } = useAuth();
  const { t, language }             = useTranslation();
  const statusLabels: Record<OrderStatus, string> = {
    "Pending": t("status.pending"),
    "In Production": t("status.in_production"),
    "Completed": t("status.completed"),
    "Delayed": t("status.delayed"),
    "Cancelled": t("status.cancelled"),
  };
  const isViewer = user?.role === "VIEWER";
  const isWorker = user?.role === "WORKER";
  const [items, setItems]           = useState<Order[]>(initialItems);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<OrderStatus | "All">("All");
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(10);
  const [formMode, setFormMode]     = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const { toasts, showToast }       = useToast();

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const selectedOrder = items.find((o) => o.id === selectedId) ?? null;

  const filtered = items.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch = !q || o.orderNumber.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) ||
      o.product.toLowerCase().includes(q) || o.lines.some((l) => l.articleCode.toLowerCase().includes(q));
    return matchSearch && (statusFilter === "All" || o.status === statusFilter);
  });
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const totalValue = items.reduce((s, o) => s + o.value, 0);

  const summary = [
    { label: "Total Orders",   value: items.length,                                              sf: "All" as const },
    { label: statusLabels["In Production"], value: items.filter((o) => o.status === "In Production").length,  sf: "In Production" as const },
    { label: statusLabels["Pending"],        value: items.filter((o) => o.status === "Pending").length,        sf: "Pending" as const },
    { label: "Order Value",    value: `€${(totalValue/1000).toFixed(0)}k`,                       sf: null },
  ];

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((prev) => ({ ...prev, [k]: v })); }
  function openAdd() {
    setForm({ ...EMPTY_FORM, lines: bladeProducts.length > 0 ? [{ bladeProductId: bladeProducts[0].id, articleCode: bladeProducts[0].articleCode, productName: bladeProducts[0].productName, qty: 0 }] : [] });
    setEditingId(null); setFormMode("add");
  }
  function openEdit(o: Order) {
    setForm({
      customer: o.customer, customerId: o.customerId ?? "",
      product: o.product, productCode: o.productCode, qty: o.qty,
      status: o.status, dueDate: o.dueDate, value: o.value,
      lines: o.lines.map(({ id: _id, ...rest }) => rest),
    });
    setEditingId(o.id); setFormMode("edit");
  }
  function closeForm() { setFormMode(null); setEditingId(null); }

  async function saveItem() {
    if (!form.customer.trim() || !form.dueDate) return;
    const hasLines = form.lines.length > 0;
    const linesQtyOk = form.lines.every((l) => l.qty > 0);
    if (hasLines && !linesQtyOk) { showToast("All order lines need a quantity > 0", "error"); return; }

    if (isWorker && formMode === "add") {
      try {
        const res = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "CREATE_ORDER",
            payload: {
              orderNumber: `ORD-${Date.now()}`,
              customer: form.customer,
              customerId: form.customerId || null,
              productName: form.product,
              productCode: form.productCode,
              qty: form.qty,
              status: ORDER_STATUS_TO_DB[form.status],
              dueDate: new Date(`${form.dueDate}T00:00:00Z`).toISOString(),
              valueEur: form.value,
              lines: form.lines.length > 0
                ? { create: form.lines.map((l) => ({ bladeProductId: l.bladeProductId, articleCode: l.articleCode, productName: l.productName, qty: l.qty })) }
                : undefined,
            },
          }),
        });
        if (!res.ok) throw new Error("Request failed");
        showToast("Request submitted — waiting for manager approval");
        closeForm();
      } catch {
        showToast("Failed to submit request", "error");
      }
      return;
    }

    try {
      if (formMode === "add") {
        const o = await addOrder(form);
        if ("error" in o) { showToast(o.error, "error"); return; }
        setItems((prev) => [o, ...prev]);
        setSelectedId(o.id);
        showToast("Order created.");
      } else if (editingId) {
        const o = await updateOrder(editingId, form);
        if ("error" in o) { showToast(o.error, "error"); return; }
        setItems((prev) => prev.map((x) => x.id === editingId ? o : x));
        showToast("Order updated.");
      }
      closeForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  async function changeStatus(id: string, status: OrderStatus) {
    try {
      const o = await changeOrderStatus(id, status);
      if ("error" in o) { showToast(o.error, "error"); return; }
      setItems((prev) => prev.map((x) => x.id === id ? o : x));
      showToast("Status updated.");
    } catch { showToast("Status update failed", "error"); }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const result = await deleteOrder(deleteId);
      if (result && "error" in result) { showToast(result.error, "error"); return; }
      setItems((prev) => prev.filter((o) => o.id !== deleteId));
      if (selectedId === deleteId) setSelectedId(null);
      setDeleteId(null);
      showToast("Order deleted.");
    } catch { showToast("Delete failed", "error"); }
  }

  const deletingItem = items.find((o) => o.id === deleteId);
  const pendingOrderId = formMode === "add" ? `ORD-${Date.now()}` : (editingId ?? "");

  return (
    <div className="px-6 py-5 flex gap-5">
      <div className="flex-1 min-w-0 space-y-4">
        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-3">
          {summary.map((s) => (
            <button
              key={s.label}
              onClick={() => s.sf && setStatus(statusFilter === s.sf ? "All" : s.sf)}
              className={`text-left rounded-lg border px-4 py-3 transition-colors ${s.sf ? "cursor-pointer hover:border-zinc-600" : "cursor-default"} ${s.sf && statusFilter === s.sf && s.sf !== "All" ? "bg-zinc-800 border-zinc-600" : "bg-zinc-900 border-zinc-800"}`}
            >
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-xl font-bold text-zinc-100">{s.value}</p>
            </button>
          ))}
        </div>

        {/* Table */}
        <section className="bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder="Search order, customer, article…" />
            <select value={statusFilter} onChange={(e) => setStatus(e.target.value as OrderStatus | "All")} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500">
              {["All", ...STATUSES].map((s) => <option key={s} value={s}>{s === "All" ? t("filter.all") : statusLabels[s as OrderStatus]}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-zinc-600">{filtered.length} / {items.length}</span>
              <button
                onClick={() => generateCSV(
                  filtered.map((o) => ({
                    "Order No.": o.orderNumber, Customer: o.customer,
                    Lines: o.lines.length > 0 ? o.lines.map((l) => `${l.articleCode}×${l.qty}`).join("; ") : `${o.product} ×${o.qty}`,
                    Status: o.status, "Due Date": o.dueDate, "Value (€)": o.value,
                  })),
                  ["Order No.", "Customer", "Lines", "Status", "Due Date", "Value (€)"],
                  "orders"
                )}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
              >{t("btn.csv")}</button>
              <AddButton onClick={openAdd} label={isWorker ? t("request.request_new_order") : t("action.add_order")} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-600 uppercase tracking-wider border-b border-zinc-800">
                  <th className="px-5 py-2 font-medium">{t("table.order_no")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.customer")}</th>
                  <th className="px-5 py-2 font-medium">Lines / {t("form.label_product")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.status")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.due_date")}</th>
                  <th className="px-5 py-2 font-medium text-right">{t("table.value")}</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-xs text-zinc-600">
                    {t("empty.no_orders")}{(search || statusFilter !== "All") && <button onClick={() => { setSearch(""); setStatus("All"); }} className="ml-2 text-zinc-500 hover:text-zinc-300 underline">{t("filter.clear_filters")}</button>}
                  </td></tr>
                ) : paged.map((o, i) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelectedId(selectedId === o.id ? null : o.id)}
                    className={`cursor-pointer transition-colors ${i < paged.length - 1 ? "border-b border-zinc-800" : ""} ${selectedId === o.id ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
                  >
                    <td className="px-5 py-2.5 font-mono text-xs text-zinc-400">{o.orderNumber}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-200">{o.customer}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-400">
                      {o.lines.length > 0 ? (
                        <div className="space-y-0.5">
                          {o.lines.slice(0, 2).map((l, i) => (
                            <div key={i} className="font-mono">{l.articleCode} <span className="text-zinc-500">×{l.qty.toLocaleString()}</span></div>
                          ))}
                          {o.lines.length > 2 && <div className="text-zinc-600">+{o.lines.length - 2} more</div>}
                        </div>
                      ) : (
                        <span>{o.product} <span className="text-zinc-500">×{o.qty.toLocaleString()}</span></span>
                      )}
                    </td>
                    <td className="px-5 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {(isViewer || isWorker) ? (
                        <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${statusStyles[o.status]}`}>{statusLabels[o.status]}</span>
                      ) : (
                        <InlineStatusSelect value={o.status} options={STATUSES} styles={statusStyles} onChange={(v) => changeStatus(o.id, v)} labels={statusLabels} />
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-zinc-500">{o.dueDate}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-300 text-right">€{o.value.toLocaleString()}</td>
                    <td className="px-5 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {!isViewer && !isWorker && (
                          <>
                            <EditButton onClick={() => openEdit(o)} />
                            <DeleteButton onClick={() => setDeleteId(o.id)} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-2.5 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{t("pagination.rows")}</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded focus:outline-none">
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <span className="text-xs text-zinc-500">{Math.min((page-1)*pageSize+1, filtered.length)}–{Math.min(page*pageSize, filtered.length)} {t("pagination.of")} {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1,p-1))} disabled={page===1} className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 px-2 py-1">{t("pagination.previous")}</button>
              <span className="text-xs text-zinc-500">{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages,p+1))} disabled={page>=totalPages} className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 px-2 py-1">{t("pagination.next")}</button>
            </div>
          </div>
        </section>
      </div>

      {/* Detail panel */}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedId(null)}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
          isWorker={isWorker}
        />
      )}

      {/* Modals */}
      {formMode && (
        <OrderForm
          mode={formMode}
          orderId={pendingOrderId}
          form={form}
          bladeProducts={bladeProducts}
          customers={customers}
          onChange={setField}
          onSave={saveItem}
          onClose={closeForm}
        />
      )}
      {deleteId && deletingItem && (
        <DeleteConfirm title={t("delete.title_order")} itemName={deletingItem.orderNumber} onConfirm={confirmDelete} onClose={() => setDeleteId(null)} />
      )}
      <ToastList toasts={toasts} />
    </div>
  );
}
