"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "../components/ModalShell";
import { DeleteConfirm } from "../components/DeleteConfirm";
import { useToast, ToastList } from "../components/Toast";
import { Label, inputCls, SearchInput, AddButton, EditButton, DeleteButton, InlineStatusSelect } from "../components/ui";
import {
  getOrders,
  addOrder,
  updateOrder,
  deleteOrder,
  changeOrderStatus,
  type Order,
  type OrderStatus,
} from "./actions";

// ── Seed data (unused) ────────────────────────────────────────────────────────

const INITIAL_ORDERS: Order[] = [];

const STATUSES: OrderStatus[] = ["Pending", "In Production", "Completed", "Delayed", "Cancelled"];

const statusStyles: Record<OrderStatus, string> = {
  "Pending":       "bg-amber-900/50 text-amber-300 border border-amber-800",
  "In Production": "bg-blue-900/50 text-blue-300 border border-blue-800",
  "Completed":     "bg-emerald-900/50 text-emerald-300 border border-emerald-800",
  "Delayed":       "bg-red-900/50 text-red-300 border border-red-800",
  "Cancelled":     "bg-zinc-800 text-zinc-500 border border-zinc-700",
};

// ── Form state ────────────────────────────────────────────────────────────────

type FormState = Omit<Order, "id">;

const EMPTY_FORM: FormState = {
  customer: "", product: "", productCode: "",
  qty: 1, status: "Pending", dueDate: "", value: 0,
};

// ── Order Form Modal ──────────────────────────────────────────────────────────

function OrderForm({ mode, orderId, form, onChange, onSave, onClose }: {
  mode: "add" | "edit"; orderId: string; form: FormState;
  onChange: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onSave: () => void; onClose: () => void;
}) {
  const isValid = form.customer.trim() && form.product.trim() && form.dueDate && form.qty > 0;
  return (
    <ModalShell
      title={mode === "add" ? "Add Order" : "Edit Order"}
      subtitle={mode === "add" ? "Create a new customer order." : `Editing ${orderId}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
          <button onClick={onSave} disabled={!isValid} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
            {mode === "add" ? "Add Order" : "Save Changes"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-lg">
          <span className="text-zinc-600">Order No.</span>
          <span className="font-mono text-zinc-300 font-medium">{orderId}</span>
          {mode === "add" && <span className="ml-auto text-zinc-600">auto-assigned</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Customer <span className="text-red-500">*</span></Label><input className={inputCls} value={form.customer} onChange={(e) => onChange("customer", e.target.value)} placeholder="e.g. Vestas Wind Systems" /></div>
          <div><Label>Status</Label><select className={inputCls} value={form.status} onChange={(e) => onChange("status", e.target.value as OrderStatus)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Product Name <span className="text-red-500">*</span></Label><input className={inputCls} value={form.product} onChange={(e) => onChange("product", e.target.value)} placeholder="e.g. Wind Turbine Blade B-52" /></div>
          <div><Label>Product Code</Label><input className={inputCls} value={form.productCode} onChange={(e) => onChange("productCode", e.target.value)} placeholder="e.g. WTB-52" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Quantity <span className="text-red-500">*</span></Label>
            <input type="number" step="1" min="1" className={inputCls} value={form.qty === 0 ? "" : form.qty} onChange={(e) => onChange("qty", parseInt(e.target.value) || 1)} placeholder="1" />
          </div>
          <div>
            <Label>Order Value (€)</Label>
            <input type="number" step="any" min="0" className={inputCls} value={form.value === 0 ? "" : form.value} onChange={(e) => onChange("value", parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          <div>
            <Label>Due Date <span className="text-red-500">*</span></Label>
            <input type="date" className={inputCls} value={form.dueDate} onChange={(e) => onChange("dueDate", e.target.value)} />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [items, setItems]         = useState<Order[]>([]);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState<OrderStatus | "All">("All");
  const [formMode, setFormMode]   = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const { toasts, showToast }     = useToast();

  // Load orders from database on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getOrders();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
        showToast("Error loading orders", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  const pendingOrderId = formMode === "add" ? `ORD-${Date.now()}` : (editingId ?? "");

  const filtered = items.filter((o) => {
    const q = search.toLowerCase();
    return (
      (!q || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.product.toLowerCase().includes(q)) &&
      (statusFilter === "All" || o.status === statusFilter)
    );
  });

  const totalValue = items.reduce((s, o) => s + o.value, 0);

  const summary = [
    { label: "Total Orders",      value: items.length,                                             accent: "text-zinc-100",    sf: "All"           },
    { label: "In Production",     value: items.filter((o) => o.status === "In Production").length, accent: "text-blue-400",    sf: "In Production" },
    { label: "Pending",           value: items.filter((o) => o.status === "Pending").length,       accent: "text-amber-400",   sf: "Pending"       },
    { label: "Total Order Value", value: `€${(totalValue / 1000).toFixed(0)}k`,                    accent: "text-emerald-400", sf: null            },
  ];

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((prev) => ({ ...prev, [k]: v })); }
  function openAdd() { setForm(EMPTY_FORM); setEditingId(null); setFormMode("add"); }
  function openEdit(o: Order) { setForm({ customer: o.customer, product: o.product, productCode: o.productCode, qty: o.qty, status: o.status, dueDate: o.dueDate, value: o.value }); setEditingId(o.id); setFormMode("edit"); }
  function closeForm() { setFormMode(null); setEditingId(null); }

  async function saveItem() {
    if (!form.customer.trim() || !form.product.trim() || !form.dueDate) return;
    try {
      if (formMode === "add") {
        const newOrder = await addOrder(form);
        setItems((prev) => [newOrder, ...prev]);
        showToast("Order created.");
      } else if (editingId) {
        const updated = await updateOrder(editingId, form);
        setItems((prev) => prev.map((o) => o.id === editingId ? updated : o));
        showToast("Order updated.");
      }
      closeForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Operation failed", "error");
    }
  }

  async function changeStatus(id: string, status: OrderStatus) {
    try {
      const updated = await changeOrderStatus(id, status);
      setItems((prev) => prev.map((o) => o.id === id ? updated : o));
      showToast("Status updated.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Status update failed", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const label = items.find((o) => o.id === deleteId)?.id ?? "Order";
      await deleteOrder(deleteId);
      setItems((prev) => prev.filter((o) => o.id !== deleteId));
      setDeleteId(null);
      showToast(`${label} deleted.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  const deletingItem = items.find((o) => o.id === deleteId);

  return (
    <div className="px-8 py-6 space-y-6">
      {loading && (
        <div className="bg-blue-900/50 border border-blue-800 text-blue-300 px-4 py-3 rounded-lg text-sm">
          Loading orders...
        </div>
      )}
      {error && (
        <div className="bg-red-900/50 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4">
        {summary.map((s) => (
          <button
            key={s.label}
            onClick={() => s.sf ? setStatus(statusFilter === s.sf ? "All" : (s.sf as OrderStatus | "All")) : undefined}
            className={`text-left rounded-xl border px-6 py-4 transition-colors ${s.sf ? "hover:border-zinc-600 cursor-pointer" : "cursor-default"} ${s.sf && statusFilter === s.sf && s.sf !== "All" ? "bg-zinc-800 border-zinc-600" : "bg-zinc-900 border-zinc-800"}`}
          >
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <section className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Search order, customer, product…" />
          <select value={statusFilter} onChange={(e) => setStatus(e.target.value as OrderStatus | "All")} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors">
            {["All", ...STATUSES].map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-zinc-600">{filtered.length} of {items.length}</span>
            <AddButton onClick={openAdd} label="New Order" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <th className="px-6 py-3 font-medium">Order No.</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">Code</th>
                <th className="px-6 py-3 font-medium text-right">Qty</th>
                <th className="px-6 py-3 font-medium text-right">Value</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Due Date</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center">
                  <p className="text-zinc-500 text-sm">No orders match your filters.</p>
                  <button onClick={() => { setSearch(""); setStatus("All"); }} className="text-xs text-blue-400 hover:text-blue-300 mt-2">Clear filters</button>
                </td></tr>
              ) : filtered.map((o, i) => (
                <tr key={o.id} className={`hover:bg-zinc-800/40 transition-colors ${i < filtered.length - 1 ? "border-b border-zinc-800" : ""}`}>
                  <td className="px-6 py-3.5 font-mono text-xs text-blue-400 font-medium">{o.id}</td>
                  <td className="px-6 py-3.5 text-xs font-medium text-zinc-200">{o.customer}</td>
                  <td className="px-6 py-3.5 text-xs text-zinc-400">{o.product}</td>
                  <td className="px-6 py-3.5 font-mono text-xs text-zinc-600">{o.productCode}</td>
                  <td className="px-6 py-3.5 text-xs text-zinc-300 text-right tabular-nums">{o.qty.toLocaleString()}</td>
                  <td className="px-6 py-3.5 text-xs text-zinc-300 text-right font-medium tabular-nums">{o.value > 0 ? `€${o.value.toLocaleString()}` : "—"}</td>
                  <td className="px-6 py-3.5">
                    <InlineStatusSelect value={o.status} options={STATUSES} styles={statusStyles} onChange={(v) => changeStatus(o.id, v)} />
                  </td>
                  <td className="px-6 py-3.5 text-xs text-zinc-500">{o.dueDate}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1">
                      <EditButton onClick={() => openEdit(o)} />
                      <DeleteButton onClick={() => setDeleteId(o.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-600">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""} shown
            {(search || statusFilter !== "All") && " · filters active"}
          </p>
          {filtered.length > 0 && (
            <p className="text-xs text-zinc-600">Filtered value: <span className="text-zinc-400 font-medium">€{filtered.reduce((s, o) => s + o.value, 0).toLocaleString()}</span></p>
          )}
        </div>
      </section>

      {formMode && <OrderForm mode={formMode} orderId={pendingOrderId} form={form} onChange={setField} onSave={saveItem} onClose={closeForm} />}
      {deleteId && deletingItem && <DeleteConfirm title="Delete Order" itemName={`${deletingItem.id} — ${deletingItem.customer}`} onConfirm={confirmDelete} onClose={() => setDeleteId(null)} />}
      <ToastList toasts={toasts} />
    </div>
  );
}
