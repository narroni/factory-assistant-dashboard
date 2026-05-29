"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "../../components/ModalShell";
import { DeleteConfirm } from "../../components/DeleteConfirm";
import { useToast, ToastList } from "../../components/Toast";
import { Label, inputCls, SearchInput, AddButton, EditButton, DeleteButton, InlineStatusSelect } from "../../components/ui";
import {
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  changeSupplierStatus,
  type Supplier,
  type SupplierStatus,
} from "./actions";

// ── Seed data ─────────────────────────────────────────────────────────────────

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: "SUP-001", name: "TorayComposite",      contact: "Hans Müller",    email: "h.muller@toray.eu",           phone: "+49 89 4521 7800",  country: "Germany",     leadTime: "6 weeks",  materials: ["Carbon Fiber Fabric 600g"],           onTimeRate: 98, status: "Active"   },
  { id: "SUP-002", name: "Hexion GmbH",         contact: "Laura Becker",   email: "l.becker@hexion.com",         phone: "+49 221 3344 200",  country: "Germany",     leadTime: "3 weeks",  materials: ["Epoxy Resin LR135"],                  onTimeRate: 95, status: "Active"   },
  { id: "SUP-003", name: "FiberCo SA",          contact: "Marc Dupont",    email: "m.dupont@fiberco.fr",         phone: "+33 1 4523 8800",   country: "France",      leadTime: "4 weeks",  materials: ["Fiberglass Woven 450g"],               onTimeRate: 91, status: "Active"   },
  { id: "SUP-004", name: "3A Composites",       contact: "David Chen",     email: "d.chen@3acomposites.com",     phone: "+41 62 855 3000",   country: "Switzerland", leadTime: "5 weeks",  materials: ["Balsa Wood Core", "Nomex Honeycomb"], onTimeRate: 94, status: "Active"   },
  { id: "SUP-005", name: "Metalmec SRL",        contact: "Antonio Rossi",  email: "a.rossi@metalmec.it",         phone: "+39 02 4521 0099",  country: "Italy",       leadTime: "2 weeks",  materials: ["Steel Sheet D2", "Boron Steel"],      onTimeRate: 96, status: "Active"   },
  { id: "SUP-006", name: "Special Metals Corp", contact: "James Wright",   email: "j.wright@specialmetals.com",  phone: "+1 304 455 5000",   country: "USA",         leadTime: "10 weeks", materials: ["Inconel 718 Bar"],                    onTimeRate: 99, status: "Active"   },
  { id: "SUP-007", name: "Hexcel Corp",         contact: "Sarah Johnson",  email: "s.johnson@hexcel.com",        phone: "+1 203 969 0666",   country: "USA",         leadTime: "8 weeks",  materials: ["Nomex Honeycomb"],                    onTimeRate: 97, status: "Active"   },
  { id: "SUP-008", name: "CopperCo",            contact: "Peter van Dam",  email: "p.vandam@copperco.nl",        phone: "+31 10 4521 200",   country: "Netherlands", leadTime: "2 weeks",  materials: ["Copper Wire 2.5mm"],                  onTimeRate: 88, status: "Warning"  },
  { id: "SUP-009", name: "ChemPro AG",          contact: "Eva Schmidt",    email: "e.schmidt@chempro.de",        phone: "+49 69 7821 500",   country: "Germany",     leadTime: "1 week",   materials: ["Zinc Phosphate Coating"],             onTimeRate: 87, status: "Warning"  },
  { id: "SUP-010", name: "BoltMaster",          contact: "Mikhail Petrov", email: "m.petrov@boltmaster.pl",      phone: "+48 22 5544 100",   country: "Poland",      leadTime: "1 week",   materials: ["M8 Hex Bolts A2-70"],                 onTimeRate: 82, status: "Active"   },
  { id: "SUP-011", name: "Recticel NV",         contact: "Lotte De Smedt", email: "l.desmedt@recticel.com",      phone: "+32 2 775 1811",    country: "Belgium",     leadTime: "3 weeks",  materials: ["PU Foam Core 40kg/m³"],                onTimeRate: 93, status: "Active"   },
];

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
  const isValid = form.name.trim() && form.contact.trim() && form.email.trim();

  function addMaterial()            { onChange("materials", [...form.materials, ""]); }
  function updateMaterial(i: number, v: string) { onChange("materials", form.materials.map((m, idx) => idx === i ? v : m)); }
  function removeMaterial(i: number) { onChange("materials", form.materials.filter((_, idx) => idx !== i)); }

  return (
    <ModalShell
      title={mode === "add" ? "Add Supplier" : "Edit Supplier"}
      subtitle={mode === "add" ? "Add a new supplier to the directory." : "Update supplier information."}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
          <button onClick={onSave} disabled={!isValid} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
            {mode === "add" ? "Add Supplier" : "Save Changes"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Supplier Name <span className="text-red-500">*</span></Label><input className={inputCls} value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. TorayComposite" /></div>
          <div><Label>Status</Label><select className={inputCls} value={form.status} onChange={(e) => onChange("status", e.target.value as SupplierStatus)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Contact Person <span className="text-red-500">*</span></Label><input className={inputCls} value={form.contact} onChange={(e) => onChange("contact", e.target.value)} placeholder="e.g. Hans Müller" /></div>
          <div><Label>Email <span className="text-red-500">*</span></Label><input type="email" className={inputCls} value={form.email} onChange={(e) => onChange("email", e.target.value)} placeholder="e.g. contact@supplier.com" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Phone</Label><input type="tel" className={inputCls} value={form.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="e.g. +49 89 4521 7800" /></div>
          <div><Label>Country</Label><input className={inputCls} value={form.country} onChange={(e) => onChange("country", e.target.value)} placeholder="e.g. Germany" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Lead Time</Label><input className={inputCls} value={form.leadTime} onChange={(e) => onChange("leadTime", e.target.value)} placeholder="e.g. 6 weeks" /></div>
          <div>
            <Label>On-Time Delivery (%)</Label>
            <input type="number" step="1" min={0} max={100} className={inputCls} value={form.onTimeRate === 0 ? "" : form.onTimeRate} onChange={(e) => onChange("onTimeRate", Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} placeholder="90" />
            {form.onTimeRate > 0 && <div className="mt-1.5"><RatingBar value={form.onTimeRate} /></div>}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Materials Supplied</Label>
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

export default function SuppliersPage() {
  const [items, setItems]         = useState<Supplier[]>([]);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState<SupplierStatus | "All">("All");
  const [formMode, setFormMode]   = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const { toasts, showToast }     = useToast();

  // Load suppliers from database on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getSuppliers();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load suppliers");
        showToast("Error loading suppliers", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  const filtered = items.filter((s) => {
    const q = search.toLowerCase();
    return (
      (!q || s.name.toLowerCase().includes(q) || s.contact.toLowerCase().includes(q) || s.country.toLowerCase().includes(q) || s.materials.some((m) => m.toLowerCase().includes(q))) &&
      (statusFilter === "All" || s.status === statusFilter)
    );
  });

  const avgRate = items.length > 0 ? Math.round(items.reduce((a, s) => a + s.onTimeRate, 0) / items.length) : 0;

  const summary = [
    { label: "Total Suppliers",   value: items.length,                                          accent: "text-zinc-100",    sf: null       },
    { label: "Active",            value: items.filter((s) => s.status === "Active").length,     accent: "text-emerald-400", sf: "Active"   },
    { label: "Warning",           value: items.filter((s) => s.status === "Warning").length,    accent: "text-amber-400",   sf: "Warning"  },
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
        setItems((prev) => [...prev, newSupplier]);
        showToast("Supplier added.");
      } else if (editingId) {
        const updated = await updateSupplier(editingId, cleaned);
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
      await deleteSupplier(deleteId);
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
      {loading && (
        <div className="bg-blue-900/50 border border-blue-800 text-blue-300 px-4 py-3 rounded-lg text-sm">
          Loading suppliers...
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
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, contact, country, material…" />
          <select value={statusFilter} onChange={(e) => setStatus(e.target.value as SupplierStatus | "All")} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors">
            {["All", ...STATUSES].map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-zinc-600">{filtered.length} of {items.length}</span>
            <AddButton onClick={openAdd} label="Add Supplier" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <th className="px-6 py-3 font-medium">Supplier</th>
                <th className="px-6 py-3 font-medium">Contact Person</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium">Lead Time</th>
                <th className="px-6 py-3 font-medium">Materials Supplied</th>
                <th className="px-6 py-3 font-medium">On-Time</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center">
                  <p className="text-zinc-500 text-sm">No suppliers match your filters.</p>
                  <button onClick={() => { setSearch(""); setStatus("All"); }} className="text-xs text-blue-400 hover:text-blue-300 mt-2">Clear filters</button>
                </td></tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id} className={`hover:bg-zinc-800/40 transition-colors ${i < filtered.length - 1 ? "border-b border-zinc-800" : ""}`}>
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
                    <InlineStatusSelect value={s.status} options={STATUSES} styles={statusStyles} onChange={(v) => changeStatus(s.id, v)} />
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1">
                      <EditButton onClick={() => openEdit(s)} />
                      <DeleteButton onClick={() => setDeleteId(s.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">{filtered.length} supplier{filtered.length !== 1 ? "s" : ""} shown{(search || statusFilter !== "All") && " · filters active"}</p>
        </div>
      </section>

      {formMode && <SupplierForm mode={formMode} form={form} onChange={setField} onSave={saveItem} onClose={closeForm} />}
      {deleteId && deletingItem && <DeleteConfirm title="Delete Supplier" itemName={deletingItem.name} onConfirm={confirmDelete} onClose={() => setDeleteId(null)} />}
      <ToastList toasts={toasts} />
    </div>
  );
}
