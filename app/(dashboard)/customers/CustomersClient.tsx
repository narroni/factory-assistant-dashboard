"use client";

import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "../../hooks/useTranslation";
import { ModalShell } from "../../components/ModalShell";
import { DeleteConfirm } from "../../components/DeleteConfirm";
import { useToast, ToastList } from "../../components/Toast";
import { Label, inputCls, SearchInput, AddButton, EditButton, DeleteButton } from "../../components/ui";
import { addCustomer, updateCustomer, deleteCustomer, type Customer } from "./actions";

// ── Form ──────────────────────────────────────────────────────────────────────

type FormState = { name: string; contactName: string; email: string; phone: string; notes: string };
const EMPTY: FormState = { name: "", contactName: "", email: "", phone: "", notes: "" };

function CustomerModal({ mode, form, onChange, onSave, onClose }: {
  mode: "add" | "edit"; form: FormState;
  onChange: <K extends keyof FormState>(k: K, v: string) => void;
  onSave: () => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ModalShell
      title={mode === "add" ? t("form.add_customer") : t("form.edit_customer")}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">{t("delete.cancel")}</button>
          <button onClick={onSave} disabled={!form.name.trim()} className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
            {mode === "add" ? t("action.add_customer") : t("btn.save")}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div><Label>{t("form.label_name")} <span className="text-red-500">{t("form.required_field")}</span></Label><input className={inputCls} value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. Vestas Wind Systems" /></div>
        <div><Label>{t("form.label_contact_person")}</Label><input className={inputCls} value={form.contactName} onChange={(e) => onChange("contactName", e.target.value)} placeholder="e.g. Hans Müller" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{t("form.label_email")}</Label><input type="email" className={inputCls} value={form.email} onChange={(e) => onChange("email", e.target.value)} placeholder="contact@company.com" /></div>
          <div><Label>{t("form.label_phone")}</Label><input type="tel" className={inputCls} value={form.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="+49 …" /></div>
        </div>
        <div><Label>{t("table.notes")}</Label><textarea className={`${inputCls} resize-none`} rows={3} value={form.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="Any notes…" /></div>
      </div>
    </ModalShell>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ customer, onClose, onEdit, onDelete }: {
  customer: Customer; onClose: () => void;
  onEdit: (c: Customer) => void; onDelete: (id: string) => void;
}) {
  function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div className="flex justify-between gap-3 py-1.5 border-b border-zinc-800 last:border-b-0">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-xs text-zinc-200">{value ?? "—"}</span>
      </div>
    );
  }
  return (
    <div className="w-80 shrink-0 bg-zinc-900 border border-zinc-700 rounded-xl flex flex-col max-h-[calc(100vh-10rem)] overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-100">{customer.name}</h2>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div>
          <Row label="Contact" value={customer.contactName} />
          <Row label="Email" value={customer.email ? <a href={`mailto:${customer.email}`} className="text-blue-400 hover:text-blue-300">{customer.email}</a> : null} />
          <Row label="Phone" value={customer.phone} />
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Order History</p>
          <Row label="Total Orders" value={customer.orderCount} />
          <Row label="Total Value" value={`€${customer.totalOrderValue.toLocaleString()}`} />
          <Row label="Last Order" value={customer.lastOrderDate} />
        </div>
        {customer.notes && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Notes</p>
            <p className="text-xs text-zinc-400 leading-relaxed">{customer.notes}</p>
          </div>
        )}
      </div>
      <div className="flex gap-2 px-5 py-3 border-t border-zinc-800">
        <button onClick={() => onEdit(customer)} className="flex-1 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Edit</button>
        <button onClick={() => onDelete(customer.id)} className="px-4 py-2 text-xs font-medium text-red-400 hover:text-red-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors">Delete</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomersClient({ initialItems }: { initialItems: Customer[] }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isViewer = user?.role === "VIEWER";
  const [items, setItems]         = useState<Customer[]>(initialItems);
  const [search, setSearch]       = useState("");
  const [formMode, setFormMode]   = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const { toasts, showToast }     = useToast();

  const selected = items.find((c) => c.id === selectedId) ?? null;
  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q) || (c.contactName ?? "").toLowerCase().includes(q);
  });

  function setField<K extends keyof FormState>(k: K, v: string) { setForm((prev) => ({ ...prev, [k]: v })); }
  function openAdd() { setForm(EMPTY); setEditingId(null); setFormMode("add"); }
  function openEdit(c: Customer) { setForm({ name: c.name, contactName: c.contactName ?? "", email: c.email ?? "", phone: c.phone ?? "", notes: c.notes ?? "" }); setEditingId(c.id); setFormMode("edit"); }
  function closeForm() { setFormMode(null); setEditingId(null); }

  async function saveItem() {
    try {
      if (formMode === "add") {
        const nc = await addCustomer(form);
        if ("error" in nc) { showToast(nc.error, "error"); return; }
        setItems((prev) => [...prev, nc].sort((a,b) => a.name.localeCompare(b.name)));
        setSelectedId(nc.id);
        showToast("Customer added.");
      } else if (editingId) {
        const uc = await updateCustomer(editingId, form);
        if ("error" in uc) { showToast(uc.error, "error"); return; }
        setItems((prev) => prev.map((c) => c.id === editingId ? uc : c));
        showToast("Customer updated.");
      }
      closeForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const result = await deleteCustomer(deleteId);
      if (result && "error" in result) { showToast(result.error, "error"); return; }
      setItems((prev) => prev.filter((c) => c.id !== deleteId));
      if (selectedId === deleteId) setSelectedId(null);
      setDeleteId(null);
      showToast("Customer deleted.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  const deletingItem = items.find((c) => c.id === deleteId);

  return (
    <div className="px-6 py-5 flex gap-5">
      <div className="flex-1 min-w-0 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t("summary.total_customers")}</p>
            <p className="text-xl font-bold text-zinc-100">{items.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t("kpi.total_orders")}</p>
            <p className="text-xl font-bold text-zinc-100">{items.reduce((s, c) => s + c.orderCount, 0)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t("table.total_value")}</p>
            <p className="text-xl font-bold text-zinc-100">€{(items.reduce((s, c) => s + c.totalOrderValue, 0) / 1000).toFixed(0)}k</p>
          </div>
        </div>

        {/* Table */}
        <section className="bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800">
            <SearchInput value={search} onChange={setSearch} placeholder={t("search.placeholder_customers")} />
            <div className="ml-auto">
              <AddButton onClick={openAdd} label={t("action.add_customer")} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-600 uppercase tracking-wider border-b border-zinc-800">
                  <th className="px-5 py-2 font-medium">{t("form.label_name")}</th>
                  <th className="px-5 py-2 font-medium">{t("form.label_contact_person")}</th>
                  <th className="px-5 py-2 font-medium">{t("form.label_email")}</th>
                  <th className="px-5 py-2 font-medium">{t("form.label_phone")}</th>
                  <th className="px-5 py-2 font-medium text-right">{t("kpi.total_orders")}</th>
                  <th className="px-5 py-2 font-medium text-right">{t("table.total_value")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.order_date")}</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-xs text-zinc-600">
                    {items.length === 0 ? t("empty.no_customers") : t("filter.no_results")}
                  </td></tr>
                ) : filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                    className={`cursor-pointer transition-colors ${i < filtered.length - 1 ? "border-b border-zinc-800" : ""} ${selectedId === c.id ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
                  >
                    <td className="px-5 py-2.5 text-xs font-medium text-zinc-200">{c.name}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-400">{c.contactName ?? "—"}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-400">{c.email ?? "—"}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-500">{c.phone ?? "—"}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-300 text-right">{c.orderCount}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-300 text-right">€{c.totalOrderValue.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-500">{c.lastOrderDate ?? "—"}</td>
                    <td className="px-5 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {!isViewer && (
                          <>
                            <EditButton onClick={() => openEdit(c)} />
                            <DeleteButton onClick={() => setDeleteId(c.id)} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selected && (
        <DetailPanel customer={selected} onClose={() => setSelectedId(null)} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} />
      )}

      {formMode && <CustomerModal mode={formMode} form={form} onChange={setField} onSave={saveItem} onClose={closeForm} />}
      {deleteId && deletingItem && <DeleteConfirm title={t("delete.title_customer")} itemName={deletingItem.name} onConfirm={confirmDelete} onClose={() => setDeleteId(null)} />}
      <ToastList toasts={toasts} />
    </div>
  );
}
