"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "../../hooks/useTranslation";
import { generateCSV, generateXLSX } from "../../lib/export";
import { ModalShell } from "../../components/ModalShell";
import { DeleteConfirm } from "../../components/DeleteConfirm";
import { useToast, ToastList } from "../../components/Toast";
import { Label, inputCls, SearchInput, AddButton, EditButton, DeleteButton, InlineStatusSelect } from "../../components/ui";
import {
  addSupplier,
  updateSupplier,
  deleteSupplier,
  changeSupplierStatus,
  type Supplier,
  type SupplierStatus,
} from "./actions";

const STATUSES: SupplierStatus[] = ["Active", "Warning", "Inactive"];

const statusStyles: Record<SupplierStatus, string> = {
  "Active":   "bg-emerald-900/50 text-emerald-300 border border-emerald-800",
  "Warning":  "bg-amber-900/50 text-amber-300 border border-amber-800",
  "Inactive": "bg-zinc-800 text-zinc-500 border border-zinc-700",
};

// ── Form state ────────────────────────────────────────────────────────────────

type FormState = Omit<Supplier, "id">;

const EMPTY_FORM: FormState = {
  name: "", contact: "", email: "", phone: "", country: "",
  leadTime: "", materials: [], onTimeRate: 90, status: "Active",
};


function supplierToForm(s: Supplier): FormState {
  return { name: s.name, contact: s.contact, email: s.email, phone: s.phone, country: s.country, leadTime: s.leadTime, materials: [...s.materials], onTimeRate: s.onTimeRate, status: s.status };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RatingBar({ value }: { value: number }) {
  const color     = value >= 95 ? "bg-emerald-500" : value >= 88 ? "bg-amber-500" : "bg-red-500";
  const textColor = value >= 95 ? "text-emerald-400" : value >= 88 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-zinc-800 rounded-full h-1.5 shrink-0">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{value}%</span>
    </div>
  );
}

// ── Supplier Form Modal ───────────────────────────────────────────────────────

function SupplierForm({ mode, form, onChange, onSave, onClose }: {
  mode: "add" | "edit"; form: FormState;
  onChange: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onSave: () => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const statusLabels: Record<SupplierStatus, string> = {
    "Active": t("status.active"),
    "Warning": t("status.warning"),
    "Inactive": t("status.inactive"),
  };
  const isValid = form.name.trim() && form.contact.trim() && form.email.trim();

  function addMaterial()            { onChange("materials", [...form.materials, ""]); }
  function updateMaterial(i: number, v: string) { onChange("materials", form.materials.map((m, idx) => idx === i ? v : m)); }
  function removeMaterial(i: number) { onChange("materials", form.materials.filter((_, idx) => idx !== i)); }

  return (
    <ModalShell
      title={mode === "add" ? t("form.add_supplier") : t("form.edit_supplier")}
      subtitle={mode === "add" ? "Add a new supplier to the directory." : "Update supplier information."}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">{t("delete.cancel")}</button>
          <button onClick={onSave} disabled={!isValid} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
            {mode === "add" ? t("action.add_supplier") : t("action.save_changes")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>{t("form.label_name")} <span className="text-red-500">{t("form.required_field")}</span></Label><input className={inputCls} value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. TorayComposite" /></div>
          <div><Label>{t("table.status")}</Label><select className={inputCls} value={form.status} onChange={(e) => onChange("status", e.target.value as SupplierStatus)}>{STATUSES.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>{t("form.label_contact_person")} <span className="text-red-500">{t("form.required_field")}</span></Label><input className={inputCls} value={form.contact} onChange={(e) => onChange("contact", e.target.value)} placeholder="e.g. Hans Müller" /></div>
          <div><Label>{t("form.label_email")} <span className="text-red-500">{t("form.required_field")}</span></Label><input type="email" className={inputCls} value={form.email} onChange={(e) => onChange("email", e.target.value)} placeholder="e.g. contact@supplier.com" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>{t("form.label_phone")}</Label><input type="tel" className={inputCls} value={form.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="e.g. +49 89 4521 7800" /></div>
          <div><Label>{t("table.country")}</Label><input className={inputCls} value={form.country} onChange={(e) => onChange("country", e.target.value)} placeholder="e.g. Germany" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>{t("table.lead_time")}</Label><input className={inputCls} value={form.leadTime} onChange={(e) => onChange("leadTime", e.target.value)} placeholder="e.g. 6 weeks" /></div>
          <div>
            <Label>{t("table.on_time_rate")}</Label>
            <input type="number" step="1" min={0} max={100} className={inputCls} value={form.onTimeRate === 0 ? "" : form.onTimeRate} onChange={(e) => onChange("onTimeRate", Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} placeholder="90" />
            {form.onTimeRate > 0 && <div className="mt-1.5"><RatingBar value={form.onTimeRate} /></div>}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>{t("form.section_specifications")}</Label>
            <button onClick={addMaterial} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add material
            </button>
          </div>
          {form.materials.length === 0 ? (
            <button onClick={addMaterial} className="w-full py-3 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 hover:border-zinc-600 transition-colors">+ Add first material</button>
          ) : (
            <div className="space-y-2">
              {form.materials.map((mat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600" value={mat} onChange={(e) => updateMaterial(i, e.target.value)} placeholder="e.g. Carbon Fiber Fabric 600g" />
                  <button onClick={() => removeMaterial(i)} className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuppliersClient({ initialItems }: { initialItems: Supplier[] }) {
  const { t, language } = useTranslation();
  const statusLabels: Record<SupplierStatus, string> = {
    "Active": t("status.active"),
    "Warning": t("status.warning"),
    "Inactive": t("status.inactive"),
  };
  const { user } = useAuth();
  const isViewer = user?.role === "VIEWER";
  const [items, setItems]         = useState<Supplier[]>(initialItems);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState<SupplierStatus | "All">("All");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [formMode, setFormMode]   = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const { toasts, showToast }     = useToast();

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filtered = items.filter((s) => {
    const q = search.toLowerCase();
    return (
      (!q || s.name.toLowerCase().includes(q) || s.contact.toLowerCase().includes(q) || s.country.toLowerCase().includes(q) || s.materials.some((m) => m.toLowerCase().includes(q))) &&
      (statusFilter === "All" || s.status === statusFilter)
    );
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const avgRate = items.length > 0 ? Math.round(items.reduce((a, s) => a + s.onTimeRate, 0) / items.length) : 0;

  const summary = [
    { label: "Total Suppliers",   value: items.length,                                          accent: "text-zinc-100",    sf: null       },
    { label: statusLabels["Active"],  value: items.filter((s) => s.status === "Active").length,     accent: "text-emerald-400", sf: "Active"   },
    { label: statusLabels["Warning"], value: items.filter((s) => s.status === "Warning").length,    accent: "text-amber-400",   sf: "Warning"  },
    { label: "Avg. On-Time Rate", value: `${avgRate}%`,                                         accent: "text-blue-400",    sf: null       },
  ];

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((prev) => ({ ...prev, [k]: v })); }
  function openAdd() { setForm(EMPTY_FORM); setEditingId(null); setFormMode("add"); }
  function openEdit(s: Supplier) { setForm(supplierToForm(s)); setEditingId(s.id); setFormMode("edit"); }
  function closeForm() { setFormMode(null); setEditingId(null); }

  async function saveItem() {
    if (!form.name.trim() || !form.contact.trim() || !form.email.trim()) return;
    const cleaned: FormState = { ...form, materials: form.materials.filter((m) => m.trim()) };
    try {
      if (formMode === "add") {
        const newSupplier = await addSupplier(cleaned);
        if ("error" in newSupplier) { showToast(newSupplier.error, "error"); return; }
        setItems((prev) => [newSupplier, ...prev]);
        showToast("Supplier added.");
      } else if (editingId) {
        const updated = await updateSupplier(editingId, cleaned);
        if ("error" in updated) { showToast(updated.error, "error"); return; }
        setItems((prev) => prev.map((s) => s.id === editingId ? updated : s));
        showToast("Supplier updated.");
      }
      closeForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Operation failed", "error");
    }
  }

  async function changeStatus(id: string, status: SupplierStatus) {
    try {
      const updated = await changeSupplierStatus(id, status);
      if ("error" in updated) { showToast(updated.error, "error"); return; }
      setItems((prev) => prev.map((s) => s.id === id ? updated : s));
      showToast("Status updated.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Status update failed", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const name = items.find((s) => s.id === deleteId)?.name ?? "Supplier";
      const result = await deleteSupplier(deleteId);
      if (result && "error" in result) { showToast(result.error, "error"); return; }
      setItems((prev) => prev.filter((s) => s.id !== deleteId));
      setDeleteId(null);
      showToast(`"${name}" deleted.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  const deletingItem = items.find((s) => s.id === deleteId);

  return (
    <div className="px-8 py-6 space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4">
        {summary.map((s) => (
          <button
            key={s.label}
            onClick={() => s.sf ? setStatus(statusFilter === s.sf ? "All" : (s.sf as SupplierStatus)) : undefined}
            className={`text-left rounded-xl border px-6 py-4 transition-colors ${s.sf ? "hover:border-zinc-600 cursor-pointer" : "cursor-default"} ${s.sf && statusFilter === s.sf ? "bg-zinc-800 border-zinc-600" : "bg-zinc-900 border-zinc-800"}`}
          >
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <section className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder={t("search.placeholder_suppliers")} />
          <select value={statusFilter} onChange={(e) => setStatus(e.target.value as SupplierStatus | "All")} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors">
            {["All", ...STATUSES].map((s) => <option key={s} value={s}>{s === "All" ? t("filter.all") : statusLabels[s as SupplierStatus]}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-zinc-600">{filtered.length} of {items.length}</span>
            <button
              onClick={() => generateCSV(
                filtered.map(s => ({
                  Supplier: s.name,
                  "Contact Person": s.contact,
                  Email: s.email,
                  Phone: s.phone || "",
                  Country: s.country,
                  "Lead Time": s.leadTime,
                  "On-Time Rate": `${s.onTimeRate}%`,
                  Status: s.status,
                })),
                ["Supplier", "Contact Person", "Email", "Phone", "Country", "Lead Time", "On-Time Rate", "Status"],
                "suppliers"
              )}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs font-medium rounded-lg transition-colors"
            >
              {t("btn.csv")}
            </button>
            <button
              onClick={() => generateXLSX(
                filtered.map(s => ({
                  Supplier: s.name,
                  "Contact Person": s.contact,
                  Email: s.email,
                  Phone: s.phone || "",
                  Country: s.country,
                  "Lead Time": s.leadTime,
                  "On-Time Rate": `${s.onTimeRate}%`,
                  Status: s.status,
                })),
                ["Supplier", "Contact Person", "Email", "Phone", "Country", "Lead Time", "On-Time Rate", "Status"],
                "suppliers"
              )}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs font-medium rounded-lg transition-colors"
            >
              {t("btn.pdf")}
            </button>
            <AddButton onClick={openAdd} label={t("action.add_supplier")} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <th className="px-6 py-3 font-medium">{t("form.label_supplier")}</th>
                <th className="px-6 py-3 font-medium">{t("form.label_contact_person")}</th>
                <th className="px-6 py-3 font-medium">{t("form.label_email")}</th>
                <th className="px-6 py-3 font-medium">{t("form.label_phone")}</th>
                <th className="px-6 py-3 font-medium">{t("table.lead_time")}</th>
                <th className="px-6 py-3 font-medium">{t("form.section_specifications")}</th>
                <th className="px-6 py-3 font-medium">{t("table.on_time_rate")}</th>
                <th className="px-6 py-3 font-medium">{t("table.status")}</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center">
                  <p className="text-zinc-500 text-sm">{t("empty.no_suppliers")}</p>
                  <button onClick={() => { setSearch(""); setStatus("All"); }} className="text-xs text-blue-400 hover:text-blue-300 mt-2">{t("filter.clear_filters")}</button>
                </td></tr>
              ) : paged.map((s, i) => (
                <tr key={s.id} className={`hover:bg-zinc-800/40 transition-colors ${i < paged.length - 1 ? "border-b border-zinc-800" : ""}`}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">{s.name[0]}</div>
                      <div><p className="text-xs font-medium text-zinc-200">{s.name}</p><p className="text-xs text-zinc-600">{s.country}</p></div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-zinc-400">{s.contact}</td>
                  <td className="px-6 py-3.5 text-xs text-blue-400">{s.email}</td>
                  <td className="px-6 py-3.5 text-xs text-zinc-500 font-mono">{s.phone}</td>
                  <td className="px-6 py-3.5 text-xs text-zinc-400">{s.leadTime}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {s.materials.length === 0 ? <span className="text-xs text-zinc-700">—</span> : s.materials.map((m) => <span key={m} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{m}</span>)}
                    </div>
                  </td>
                  <td className="px-6 py-3.5"><RatingBar value={s.onTimeRate} /></td>
                  <td className="px-6 py-3.5">
                    <InlineStatusSelect value={s.status} options={STATUSES} styles={statusStyles} onChange={(v) => changeStatus(s.id, v)} labels={statusLabels} />
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1">
                      {!isViewer && (
                        <>
                          <EditButton onClick={() => openEdit(s)} />
                          <DeleteButton onClick={() => setDeleteId(s.id)} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">{t("pagination.rows_per_page")}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            >
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <span className="text-xs text-zinc-500">
            {t("pagination.showing")} {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} {t("pagination.of")} {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 transition-colors"
            >
              {t("pagination.previous")}
            </button>
            <span className="text-xs text-zinc-400">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 transition-colors"
            >
              {t("pagination.next")}
            </button>
          </div>
        </div>
      </section>

      {formMode && <SupplierForm mode={formMode} form={form} onChange={setField} onSave={saveItem} onClose={closeForm} />}
      {deleteId && deletingItem && <DeleteConfirm title={t("delete.title_supplier")} itemName={deletingItem.name} onConfirm={confirmDelete} onClose={() => setDeleteId(null)} />}
      <ToastList toasts={toasts} />
    </div>
  );
}
