"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "../../components/ModalShell";
import { DeleteConfirm } from "../../components/DeleteConfirm";
import { useToast, ToastList } from "../../components/Toast";
import {
  Label, TextInput, NumberInput, SelectInput,
  SearchInput, AddButton, EditButton, DeleteButton,
  InlineStatusSelect,
} from "../../components/ui";
import {
  getMaterials,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  changeMaterialStatus,
  type Material,
  type MaterialStatus,
} from "./actions";

const CATEGORIES  = ["Composite", "Chemical", "Core Material", "Metal", "Superalloy", "Wire", "Fastener", "Other"];
const UNITS: string[]            = ["kg", "m²", "m³", "m", "L", "pcs", "t"];
const STATUSES: MaterialStatus[] = ["In Stock", "Low Stock", "Out of Stock"];

const statusStyles: Record<MaterialStatus, string> = {
  "In Stock":    "bg-emerald-900/50 text-emerald-300 border border-emerald-800",
  "Low Stock":   "bg-amber-900/50 text-amber-300 border border-amber-800",
  "Out of Stock":"bg-red-900/50 text-red-300 border border-red-800",
};

// ── Form state ────────────────────────────────────────────────────────────────

type FormState = Omit<Material, "id">;

const EMPTY_FORM: FormState = {
  name: "", code: "", category: "Composite",
  quantity: 0, unit: "kg", supplier: "", status: "In Stock",
};

// ── Material Form Modal ───────────────────────────────────────────────────────

function MaterialModal({
  mode, form, onChange, onSave, onClose,
}: {
  mode: "add" | "edit";
  form: FormState;
  onChange: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const isValid = form.name.trim() && form.code.trim() && form.supplier.trim();
  return (
    <ModalShell
      title={mode === "add" ? "Add Material" : "Edit Material"}
      subtitle={mode === "add" ? "Add a new raw material to inventory." : "Update material information."}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
          <button onClick={onSave} disabled={!isValid} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
            {mode === "add" ? "Add Material" : "Save Changes"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Material Name <span className="text-red-500">*</span></Label><TextInput value={form.name} onChange={(v) => onChange("name", v)} placeholder="e.g. Carbon Fiber Fabric" /></div>
          <div><Label>Material Code <span className="text-red-500">*</span></Label><TextInput value={form.code} onChange={(v) => onChange("code", v)} placeholder="e.g. CF-600" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Category</Label><SelectInput value={form.category} onChange={(v) => onChange("category", v)} options={CATEGORIES} /></div>
          <div><Label>Unit</Label><SelectInput value={form.unit} onChange={(v) => onChange("unit", v)} options={UNITS} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Quantity</Label><NumberInput value={form.quantity} onChange={(v) => onChange("quantity", v)} /></div>
          <div><Label>Supplier <span className="text-red-500">*</span></Label><TextInput value={form.supplier} onChange={(v) => onChange("supplier", v)} placeholder="e.g. TorayComposite" /></div>
        </div>
        <div><Label>Stock Status</Label><SelectInput value={form.status} onChange={(v) => onChange("status", v as MaterialStatus)} options={STATUSES} /></div>
      </div>
    </ModalShell>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MaterialsPage() {
  const [items, setItems]         = useState<Material[]>([]);
  const [search, setSearch]       = useState("");
  const [categoryFilter, setCat]  = useState("All");
  const [statusFilter, setStatus] = useState("All");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [formMode, setFormMode]   = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const { toasts, showToast }     = useToast();

  // Load materials from database on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMaterials();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load materials");
        showToast("Error loading materials", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  const categories = ["All", ...Array.from(new Set(items.map((m) => m.category))).sort()];

  const filtered = items.filter((m) => {
    const q = search.toLowerCase();
    return (
      (!q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || m.supplier.toLowerCase().includes(q)) &&
      (categoryFilter === "All" || m.category === categoryFilter) &&
      (statusFilter === "All" || m.status === statusFilter)
    );
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const counts = {
    total:      items.length,
    inStock:    items.filter((m) => m.status === "In Stock").length,
    lowStock:   items.filter((m) => m.status === "Low Stock").length,
    outOfStock: items.filter((m) => m.status === "Out of Stock").length,
  };

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function openAdd() { setForm(EMPTY_FORM); setEditingId(null); setFormMode("add"); }

  function openEdit(m: Material) {
    setForm({ name: m.name, code: m.code, category: m.category, quantity: m.quantity, unit: m.unit, supplier: m.supplier, status: m.status });
    setEditingId(m.id);
    setFormMode("edit");
  }

  function closeForm() { setFormMode(null); setEditingId(null); }

  async function saveItem() {
    if (!form.name.trim() || !form.code.trim()) return;
    try {
      if (formMode === "add") {
        const newMaterial = await addMaterial(form);
        setItems((prev) => [newMaterial, ...prev]);
        showToast("Material added successfully.");
      } else if (editingId) {
        const updated = await updateMaterial(editingId, form);
        setItems((prev) => prev.map((m) => m.id === editingId ? updated : m));
        showToast("Material updated.");
      }
      closeForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Operation failed", "error");
    }
  }

  async function changeStatus(id: string, status: MaterialStatus) {
    try {
      const updated = await changeMaterialStatus(id, status);
      setItems((prev) => prev.map((m) => m.id === id ? updated : m));
      showToast("Status updated.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Status update failed", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const name = items.find((m) => m.id === deleteId)?.name ?? "Material";
      await deleteMaterial(deleteId);
      setItems((prev) => prev.filter((m) => m.id !== deleteId));
      setDeleteId(null);
      showToast(`"${name}" deleted.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  const deletingItem = items.find((m) => m.id === deleteId);

  return (
    <div className="px-8 py-6 space-y-6">
      {loading && (
        <div className="bg-blue-900/50 border border-blue-800 text-blue-300 px-4 py-3 rounded-lg text-sm">
          Loading materials...
        </div>
      )}
      {error && (
        <div className="bg-red-900/50 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Materials", value: counts.total,      accent: "text-zinc-100",    sf: "All"          },
          { label: "In Stock",        value: counts.inStock,    accent: "text-emerald-400", sf: "In Stock"     },
          { label: "Low Stock",       value: counts.lowStock,   accent: "text-amber-400",   sf: "Low Stock"    },
          { label: "Out of Stock",    value: counts.outOfStock, accent: "text-red-400",     sf: "Out of Stock" },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setStatus(statusFilter === s.sf ? "All" : s.sf)}
            className={`text-left rounded-xl border px-6 py-4 transition-colors hover:border-zinc-600 ${
              statusFilter === s.sf && s.sf !== "All" ? "bg-zinc-800 border-zinc-600" : "bg-zinc-900 border-zinc-800"
            }`}
          >
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <section className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, code, supplier…" />
          <select value={categoryFilter} onChange={(e) => setCat(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors">
            {["All", ...STATUSES].map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-zinc-600">{filtered.length} of {items.length}</span>
            <AddButton onClick={openAdd} label="Add Material" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <th className="px-6 py-3 font-medium">Material Name</th>
                <th className="px-6 py-3 font-medium">Code</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium text-right">Quantity</th>
                <th className="px-6 py-3 font-medium">Unit</th>
                <th className="px-6 py-3 font-medium">Supplier</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center">
                  <p className="text-zinc-500 text-sm">No materials match your filters.</p>
                  <button onClick={() => { setSearch(""); setCat("All"); setStatus("All"); }} className="text-xs text-blue-400 hover:text-blue-300 mt-2">Clear filters</button>
                </td></tr>
              ) : paged.map((m, i) => (
                <tr key={m.id} className={`hover:bg-zinc-800/40 transition-colors ${i < paged.length - 1 ? "border-b border-zinc-800" : ""}`}>
                  <td className="px-6 py-3.5 text-xs font-medium text-zinc-200">{m.name}</td>
                  <td className="px-6 py-3.5 font-mono text-xs text-zinc-500">{m.code}</td>
                  <td className="px-6 py-3.5"><span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{m.category}</span></td>
                  <td className="px-6 py-3.5 text-xs text-zinc-300 text-right font-medium tabular-nums">{m.quantity.toLocaleString()}</td>
                  <td className="px-6 py-3.5 text-xs text-zinc-500">{m.unit}</td>
                  <td className="px-6 py-3.5 text-xs text-zinc-400">{m.supplier}</td>
                  <td className="px-6 py-3.5">
                    <InlineStatusSelect
                      value={m.status}
                      options={STATUSES}
                      styles={statusStyles}
                      onChange={(v) => changeStatus(m.id, v)}
                    />
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1">
                      <EditButton onClick={() => openEdit(m)} />
                      <DeleteButton onClick={() => setDeleteId(m.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            >
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <span className="text-xs text-zinc-500">
            Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-zinc-400">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {formMode && (
        <MaterialModal mode={formMode} form={form} onChange={setField} onSave={saveItem} onClose={closeForm} />
      )}
      {deleteId && deletingItem && (
        <DeleteConfirm title="Delete Material" itemName={deletingItem.name} onConfirm={confirmDelete} onClose={() => setDeleteId(null)} />
      )}
      <ToastList toasts={toasts} />
    </div>
  );
}
