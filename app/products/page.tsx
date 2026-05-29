"use client";

import { useState } from "react";
import { ModalShell } from "../components/ModalShell";
import { DeleteConfirm } from "../components/DeleteConfirm";
import { useToast, ToastList } from "../components/Toast";
import {
  Label, TextInput, NumberInput, SelectInput,
  SearchInput, AddButton, InlineStatusSelect,
} from "../components/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductStatus = "Active" | "Inactive" | "Prototype";
type MaterialReq   = { name: string; qty: string };

type Product = {
  id: string;
  name: string;
  code: string;
  length: number;
  width: number;
  thickness: number;
  weight: number;
  volume: number;
  material: string;
  status: ProductStatus;
  notes: string;
  materialRequirements: MaterialReq[];
};

// ── Seed data ─────────────────────────────────────────────────────────────────

const INITIAL_PRODUCTS: Product[] = [
  { id: "PRD-001", name: "Wind Turbine Blade B-52", code: "WTB-52", length: 52000, width: 2800, thickness: 180, weight: 6500, volume: 11.5, material: "Carbon Fiber / Fiberglass", status: "Active", notes: "Large-scale wind energy blade. Requires precision mold alignment. Cure time: 48h at 80°C. Post-cure NDT inspection mandatory on every production run. Shell + spar cap construction.", materialRequirements: [{ name: "Carbon Fiber Fabric 600g/m²", qty: "420 m²" }, { name: "Fiberglass Woven 450g/m²", qty: "680 m²" }, { name: "Epoxy Resin LR135", qty: "310 kg" }, { name: "Balsa Wood Core", qty: "4.2 m³" }] },
  { id: "PRD-002", name: "Industrial Cutting Blade IC-300", code: "ICB-300", length: 300, width: 80, thickness: 6, weight: 2.4, volume: 0.000144, material: "Hardened Steel D2", status: "Active", notes: "High-speed cutting application. Edge hardness: 58–62 HRC. Ground to ±0.01mm tolerance. TiN coating optional. Packaged in sets of 10.", materialRequirements: [{ name: "Steel Sheet D2 3mm", qty: "3.2 kg" }, { name: "Zinc Phosphate Coating", qty: "0.2 L" }] },
  { id: "PRD-003", name: "Agricultural Mower Blade AM-600", code: "AMB-600", length: 600, width: 50, thickness: 4, weight: 0.94, volume: 0.00012, material: "Boron Steel 27MnCrB5", status: "Active", notes: "Rotary mower blade. Heat treated to 42–46 HRC. Balanced to ISO 1940 G6.3. Replaces OEM part for Claas Corto and similar series. High-volume production item.", materialRequirements: [{ name: "Boron Steel 27MnCrB5", qty: "1.1 kg" }, { name: "M8 Hex Bolt A2-70", qty: "2 pcs" }] },
  { id: "PRD-004", name: "Wind Turbine Blade B-38", code: "WTB-38", length: 38000, width: 2100, thickness: 150, weight: 3800, volume: 6.8, material: "Fiberglass / Epoxy Resin", status: "Active", notes: "Mid-range wind blade for 1.5–2 MW class turbines. Glass fiber infusion process (VARTM). Shell + shear web construction. Lightning protection system integrated.", materialRequirements: [{ name: "Fiberglass Woven 450g/m²", qty: "920 m²" }, { name: "Epoxy Resin LR135", qty: "240 kg" }, { name: "Balsa Wood Core", qty: "2.8 m³" }, { name: "Copper Wire 2.5mm", qty: "4.5 kg" }] },
  { id: "PRD-005", name: "Shredder Blade SB-200", code: "SHB-200", length: 200, width: 120, thickness: 15, weight: 2.8, volume: 0.00036, material: "Manganese Steel X120Mn12", status: "Active", notes: "Industrial shredder blade for wood and plastic. Work-hardening material improves durability under impact loads. Bolt pattern: 4×M10. Sold in pairs.", materialRequirements: [{ name: "Manganese Steel X120Mn12", qty: "3.2 kg" }, { name: "M8 Hex Bolt A2-70", qty: "4 pcs" }] },
  { id: "PRD-006", name: "Gas Turbine Blade TB-80", code: "GTB-80", length: 80, width: 25, thickness: 8, weight: 0.12, volume: 0.000016, material: "Inconel 718", status: "Prototype", notes: "High-temperature gas turbine blade. Operating temp: up to 950°C. Thermal barrier coating required. 5-axis CNC machined from forged billet. Currently in design validation phase.", materialRequirements: [{ name: "Inconel 718 Bar", qty: "0.18 kg" }] },
  { id: "PRD-007", name: "Helicopter Rotor Blade HR-14", code: "HRB-14", length: 14000, width: 380, thickness: 40, weight: 245, volume: 0.142, material: "Carbon Fiber / Nomex Honeycomb", status: "Active", notes: "Main rotor blade for medium-class helicopter. NACA 0012 airfoil profile. Stainless steel leading edge erosion shield. Dynamic balancing to ±5 g·cm. Full fatigue test program required.", materialRequirements: [{ name: "Carbon Fiber Fabric 600g/m²", qty: "48 m²" }, { name: "Nomex Honeycomb 48kg/m³", qty: "12 m²" }, { name: "Epoxy Resin LR135", qty: "22 kg" }] },
  { id: "PRD-008", name: "Bandsaw Blade BS-4000", code: "BSB-4000", length: 4000, width: 34, thickness: 0.9, weight: 0.8, volume: 0.000122, material: "Bimetal M42 HSS", status: "Active", notes: "General-purpose bandsaw blade. 4 TPI for structural steel up to 150mm. Electron beam welded joint. Set configuration: raker. Fatigue life tested to 500k cycles.", materialRequirements: [{ name: "Bimetal Strip M42", qty: "4.2 m" }] },
  { id: "PRD-009", name: "Pellet Knife PK-150", code: "PKN-150", length: 150, width: 45, thickness: 12, weight: 0.6, volume: 0.000081, material: "Tool Steel H13", status: "Active", notes: "Plastic pelletizing knife for underwater pelletizer systems. Tungsten carbide edge available. Re-grindable 5–7 times. Matched set of 8 required per machine.", materialRequirements: [{ name: "Tool Steel H13 Bar", qty: "0.75 kg" }] },
  { id: "PRD-010", name: "Wind Turbine Blade B-65", code: "WTB-65", length: 65000, width: 3800, thickness: 220, weight: 14500, volume: 24.8, material: "Carbon Fiber / Balsa Wood Core", status: "Inactive", notes: "Next-generation offshore wind blade for 5 MW+ turbines. Spar cap: pultruded CFRP. Core: end-grain balsa. Trailing edge: glass fabric. Mold design phase. First article target: Q3 2026.", materialRequirements: [{ name: "Carbon Fiber Fabric 600g/m²", qty: "820 m²" }, { name: "Balsa Wood Core", qty: "9.6 m³" }, { name: "Fiberglass Woven 450g/m²", qty: "440 m²" }, { name: "Epoxy Resin LR135", qty: "620 kg" }] },
];

const STATUSES: ProductStatus[] = ["Active", "Inactive", "Prototype"];

const statusStyles: Record<ProductStatus, string> = {
  "Active":   "bg-emerald-900/50 text-emerald-300 border border-emerald-800",
  "Inactive": "bg-zinc-800 text-zinc-500 border border-zinc-700",
  "Prototype":"bg-purple-900/50 text-purple-300 border border-purple-800",
};

function formatVolume(v: number): string {
  if (v >= 1) return `${v.toFixed(2)} m³`;
  return `${Math.round(v * 1_000_000).toLocaleString()} cm³`;
}

// ── Form state ────────────────────────────────────────────────────────────────

type FormState = {
  name: string; code: string;
  length: number; width: number; thickness: number;
  weight: number; volume: number;
  material: string; status: ProductStatus;
  notes: string; materialRequirements: MaterialReq[];
};

const EMPTY_FORM: FormState = {
  name: "", code: "", length: 0, width: 0, thickness: 0,
  weight: 0, volume: 0, material: "", status: "Active",
  notes: "", materialRequirements: [],
};

function productToForm(p: Product): FormState {
  return { name: p.name, code: p.code, length: p.length, width: p.width, thickness: p.thickness, weight: p.weight, volume: p.volume, material: p.material, status: p.status, notes: p.notes, materialRequirements: p.materialRequirements.map((r) => ({ ...r })) };
}

function nextId(items: Product[]) {
  const nums = items.map((p) => parseInt(p.id.replace("PRD-", ""), 10)).filter((n) => !isNaN(n));
  return `PRD-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
}

// ── Product Form Modal ────────────────────────────────────────────────────────

function ProductModal({ mode, form, onChange, onSave, onClose }: {
  mode: "add" | "edit"; form: FormState;
  onChange: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onSave: () => void; onClose: () => void;
}) {
  const isValid = form.name.trim() && form.code.trim() && form.material.trim();

  function updateReq(i: number, field: keyof MaterialReq, v: string) {
    onChange("materialRequirements", form.materialRequirements.map((r, idx) => idx === i ? { ...r, [field]: v } : r));
  }
  function addReq() { onChange("materialRequirements", [...form.materialRequirements, { name: "", qty: "" }]); }
  function removeReq(i: number) { onChange("materialRequirements", form.materialRequirements.filter((_, idx) => idx !== i)); }

  return (
    <ModalShell
      title={mode === "add" ? "Add Product" : "Edit Product"}
      subtitle={mode === "add" ? "Add a new product to the catalog." : "Update product specifications."}
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
          <button onClick={onSave} disabled={!isValid} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
            {mode === "add" ? "Add Product" : "Save Changes"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Product Name <span className="text-red-500">*</span></Label><TextInput value={form.name} onChange={(v) => onChange("name", v)} placeholder="e.g. Wind Turbine Blade B-52" /></div>
          <div><Label>Product Code <span className="text-red-500">*</span></Label><TextInput value={form.code} onChange={(v) => onChange("code", v)} placeholder="e.g. WTB-52" /></div>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Dimensions</p>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Length (mm)</Label><NumberInput value={form.length} onChange={(v) => onChange("length", v)} placeholder="e.g. 52000" /></div>
            <div><Label>Width (mm)</Label><NumberInput value={form.width} onChange={(v) => onChange("width", v)} placeholder="e.g. 2800" /></div>
            <div><Label>Thickness (mm)</Label><NumberInput value={form.thickness} onChange={(v) => onChange("thickness", v)} placeholder="e.g. 180" /></div>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Physical Properties</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Weight (kg)</Label><NumberInput value={form.weight} onChange={(v) => onChange("weight", v)} placeholder="e.g. 6500" /></div>
            <div><Label>Volume (m³)</Label><NumberInput value={form.volume} onChange={(v) => onChange("volume", v)} placeholder="e.g. 11.5" hint="Use decimal notation, e.g. 0.000144 for 144 cm³" /></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2"><Label>Primary Material <span className="text-red-500">*</span></Label><TextInput value={form.material} onChange={(v) => onChange("material", v)} placeholder="e.g. Carbon Fiber / Fiberglass" /></div>
          <div><Label>Status</Label><SelectInput value={form.status} onChange={(v) => onChange("status", v as ProductStatus)} options={STATUSES} /></div>
        </div>
        <div>
          <Label>Production Notes</Label>
          <textarea value={form.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="Describe processing requirements, tolerances, quality specifications…" rows={3} className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600 resize-none" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Material Requirements <span className="text-zinc-600 font-normal normal-case tracking-normal">(per unit)</span></p>
            <button onClick={addReq} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add requirement
            </button>
          </div>
          {form.materialRequirements.length === 0 ? (
            <button onClick={addReq} className="w-full py-4 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 hover:border-zinc-600 transition-colors">+ Add first material requirement</button>
          ) : (
            <div className="space-y-2">
              {form.materialRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={req.name} onChange={(e) => updateReq(i, "name", e.target.value)} placeholder="Material name" className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600" />
                  <input type="text" value={req.qty} onChange={(e) => updateReq(i, "qty", e.target.value)} placeholder="Qty (e.g. 420 m²)" className="w-36 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600" />
                  <button onClick={() => removeReq(i)} className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors shrink-0">
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

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ product, onClose, onEdit, onDelete }: {
  product: Product; onClose: () => void;
  onEdit: (p: Product) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="w-[440px] shrink-0 bg-zinc-900 border border-zinc-700 rounded-xl flex flex-col max-h-[calc(100vh-10rem)] overflow-hidden">
      <div className="flex items-start justify-between px-6 py-5 border-b border-zinc-800 shrink-0">
        <div className="min-w-0 pr-3">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1.5 ${statusStyles[product.status]}`}>{product.status}</span>
          <h2 className="text-sm font-bold text-zinc-100 leading-snug">{product.name}</h2>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">{product.code}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Dimensions</h3>
          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Length", value: product.length.toLocaleString(), unit: "mm" }, { label: "Width", value: product.width.toLocaleString(), unit: "mm" }, { label: "Thickness", value: product.thickness.toLocaleString(), unit: "mm" }].map((d) => (
              <div key={d.label} className="bg-zinc-800 rounded-lg px-3 py-3 text-center">
                <p className="text-xs text-zinc-500 mb-1">{d.label}</p>
                <p className="text-base font-bold text-zinc-100 tabular-nums">{d.value}</p>
                <p className="text-xs text-zinc-600">{d.unit}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Weight & Volume</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-800 rounded-lg px-4 py-3">
              <p className="text-xs text-zinc-500 mb-1">Weight</p>
              <p className="text-xl font-bold text-zinc-100 tabular-nums">{product.weight >= 1000 ? `${(product.weight / 1000).toFixed(2)} t` : `${product.weight} kg`}</p>
              {product.weight >= 1000 && <p className="text-xs text-zinc-600">{product.weight.toLocaleString()} kg</p>}
            </div>
            <div className="bg-zinc-800 rounded-lg px-4 py-3">
              <p className="text-xs text-zinc-500 mb-1">Volume</p>
              <p className="text-xl font-bold text-zinc-100">{formatVolume(product.volume)}</p>
              {product.volume > 0 && <p className="text-xs text-zinc-600">≈ {(product.weight / (product.volume * 1000)).toFixed(0)} kg/m³ density</p>}
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Primary Material</h3>
          <div className="bg-zinc-800 rounded-lg px-4 py-3"><p className="text-sm font-medium text-zinc-200">{product.material}</p></div>
        </div>
        {product.materialRequirements.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Material Requirements <span className="text-zinc-600 font-normal">(per unit)</span></h3>
            <ul className="space-y-1.5">
              {product.materialRequirements.map((r) => (
                <li key={r.name} className="flex items-center justify-between bg-zinc-800 rounded-lg px-4 py-2.5">
                  <span className="text-xs text-zinc-300">{r.name}</span>
                  <span className="text-xs font-medium text-zinc-100 font-mono">{r.qty}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {product.notes && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Production Notes</h3>
            <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-800 rounded-lg px-4 py-3">{product.notes}</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-6 py-4 border-t border-zinc-800 shrink-0">
        <button onClick={() => onEdit(product)} className="flex-1 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">Edit Product</button>
        <button onClick={() => onDelete(product.id)} className="px-4 py-2 text-xs font-medium text-red-400 hover:text-red-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Delete</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [items, setItems]           = useState<Product[]>(INITIAL_PRODUCTS);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<ProductStatus | "All">("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode]     = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const { toasts, showToast }       = useToast();

  const selected = items.find((p) => p.id === selectedId) ?? null;

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    return (
      (!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.material.toLowerCase().includes(q)) &&
      (statusFilter === "All" || p.status === statusFilter)
    );
  });

  const counts = {
    total:     items.length,
    active:    items.filter((p) => p.status === "Active").length,
    inactive:  items.filter((p) => p.status === "Inactive").length,
    prototype: items.filter((p) => p.status === "Prototype").length,
  };

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function openAdd() { setForm(EMPTY_FORM); setEditingId(null); setFormMode("add"); }

  function openEdit(p: Product) { setForm(productToForm(p)); setEditingId(p.id); setFormMode("edit"); }

  function closeForm() { setFormMode(null); setEditingId(null); }

  function saveItem() {
    if (!form.name.trim() || !form.code.trim() || !form.material.trim()) return;
    if (formMode === "add") {
      const np: Product = { id: nextId(items), ...form };
      setItems((prev) => [...prev, np]);
      setSelectedId(np.id);
      showToast("Product added successfully.");
    } else if (editingId) {
      setItems((prev) => prev.map((p) => p.id === editingId ? { ...p, ...form } : p));
      showToast("Product updated.");
    }
    closeForm();
  }

  function changeStatus(id: string, status: ProductStatus) {
    setItems((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    showToast("Status updated.");
  }

  function confirmDelete() {
    const name = items.find((p) => p.id === deleteId)?.name ?? "Product";
    if (selectedId === deleteId) setSelectedId(null);
    setItems((prev) => prev.filter((p) => p.id !== deleteId));
    setDeleteId(null);
    showToast(`"${name}" deleted.`);
  }

  const deletingItem = items.find((p) => p.id === deleteId);

  return (
    <div className="px-8 py-6 space-y-5">

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: counts.total,     accent: "text-zinc-100",    filter: "All" as const },
          { label: "Active",         value: counts.active,    accent: "text-emerald-400", filter: "Active" as const },
          { label: "Inactive",       value: counts.inactive,  accent: "text-zinc-400",    filter: "Inactive" as const },
          { label: "Prototype",      value: counts.prototype, accent: "text-purple-400",  filter: "Prototype" as const },
        ].map((s) => (
          <button key={s.label} onClick={() => setStatus(statusFilter === s.filter ? "All" : s.filter)} className={`text-left rounded-xl border px-6 py-4 transition-colors hover:border-zinc-600 ${statusFilter === s.filter && s.filter !== "All" ? "bg-zinc-800 border-zinc-600" : "bg-zinc-900 border-zinc-800"}`}>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Master-detail */}
      <div className="flex gap-5 items-start">
        <section className="flex-1 min-w-0 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
            <SearchInput value={search} onChange={setSearch} placeholder="Search products, codes, materials…" />
            <select value={statusFilter} onChange={(e) => setStatus(e.target.value as ProductStatus | "All")} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors">
              {["All", ...STATUSES].map((s) => <option key={s}>{s}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-zinc-600">{filtered.length} of {items.length}</span>
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Add Product
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                  <th className="px-5 py-3 font-medium">Product Name</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium text-right">Length (mm)</th>
                  <th className="px-5 py-3 font-medium text-right">Width (mm)</th>
                  <th className="px-5 py-3 font-medium text-right">Thick. (mm)</th>
                  <th className="px-5 py-3 font-medium text-right">Weight (kg)</th>
                  <th className="px-5 py-3 font-medium text-right">Volume</th>
                  <th className="px-5 py-3 font-medium">Material</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-16 text-center">
                    <p className="text-zinc-500 text-sm">No products match your filters.</p>
                    <button onClick={() => { setSearch(""); setStatus("All"); }} className="text-xs text-blue-400 hover:text-blue-300 mt-2">Clear filters</button>
                  </td></tr>
                ) : filtered.map((p, i) => {
                  const isSel = selectedId === p.id;
                  return (
                    <tr key={p.id} onClick={() => setSelectedId(isSel ? null : p.id)} className={`cursor-pointer transition-colors ${i < filtered.length - 1 ? "border-b border-zinc-800" : ""} ${isSel ? "bg-blue-950/40" : "hover:bg-zinc-800/40"}`}>
                      <td className="px-5 py-3.5"><p className="text-xs font-semibold text-zinc-100">{p.name}</p></td>
                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">{p.code}</td>
                      <td className="px-5 py-3.5 text-xs text-zinc-300 text-right tabular-nums font-medium">{p.length.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-xs text-zinc-300 text-right tabular-nums">{p.width.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-xs text-zinc-300 text-right tabular-nums">{p.thickness}</td>
                      <td className="px-5 py-3.5 text-xs text-zinc-300 text-right tabular-nums font-medium">{p.weight.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-xs text-zinc-400 text-right font-mono">{formatVolume(p.volume)}</td>
                      <td className="px-5 py-3.5 text-xs text-zinc-500 max-w-[140px] truncate">{p.material}</td>
                      <td className="px-5 py-3.5">
                        <InlineStatusSelect value={p.status} options={STATUSES} styles={statusStyles} onChange={(v) => changeStatus(p.id, v)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-600">Click a row to view full product details and specifications</p>
          </div>
        </section>

        {selected && (
          <DetailPanel product={selected} onClose={() => setSelectedId(null)} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} />
        )}
      </div>

      {formMode && <ProductModal mode={formMode} form={form} onChange={setField} onSave={saveItem} onClose={closeForm} />}
      {deleteId && deletingItem && <DeleteConfirm title="Delete Product" itemName={deletingItem.name} onConfirm={confirmDelete} onClose={() => setDeleteId(null)} />}
      <ToastList toasts={toasts} />
    </div>
  );
}
