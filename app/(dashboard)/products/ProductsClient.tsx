"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "../../hooks/useTranslation";
import { generateCSV, generateXLSX } from "../../lib/export";
import { ModalShell } from "../../components/ModalShell";
import { DeleteConfirm } from "../../components/DeleteConfirm";
import { useToast, ToastList } from "../../components/Toast";
import { Label, inputCls, SearchInput, AddButton, EditButton, DeleteButton } from "../../components/ui";
import {
  addBladeProduct,
  updateBladeProduct,
  deleteBladeProduct,
  type BladeProduct,
  type BladeProductFormData,
} from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type CrateType = { id: string; code: string };

const COLORS = ["GOLD", "SILVER"];
const PUNCHED_OPTIONS = ["Both sides", "One side", "No holes"];

// ── Form ──────────────────────────────────────────────────────────────────────

type FormState = Omit<BladeProductFormData, "status">;

const EMPTY_FORM: FormState = {
  articleCode: "", productName: "",
  lengthMm: 0, widthMm: 0, thicknessMm: 0,
  tpi: 17, punchedOn: "Both sides",
  holeDistance: "", holeSize: "",
  color: "GOLD",
  weightBeforePunchingKg: 0, weightAfterPunchingKg: 0,
  pcsPerCrate: 0, crateTypeId: "", maxCratesPerTower: 5,
};

function productToForm(p: BladeProduct): FormState {
  return {
    articleCode: p.articleCode, productName: p.productName,
    lengthMm: p.lengthMm, widthMm: p.widthMm, thicknessMm: p.thicknessMm,
    tpi: p.tpi, punchedOn: p.punchedOn,
    holeDistance: p.holeDistance ?? "", holeSize: p.holeSize ?? "",
    color: p.color,
    weightBeforePunchingKg: p.weightBeforePunchingKg, weightAfterPunchingKg: p.weightAfterPunchingKg,
    pcsPerCrate: p.pcsPerCrate, crateTypeId: p.crateTypeId, maxCratesPerTower: p.maxCratesPerTower,
  };
}

// ── Product Form Modal ────────────────────────────────────────────────────────

function ProductModal({
  mode, form, crateTypes, onChange, onSave, onClose,
}: {
  mode: "add" | "edit"; form: FormState; crateTypes: CrateType[];
  onChange: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onSave: () => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const isValid = form.articleCode.trim() && form.productName.trim() && form.crateTypeId;
  const n = (v: string, fallback = 0) => parseFloat(v) || fallback;

  return (
    <ModalShell
      title={mode === "add" ? t("form.add_product") : t("form.edit_product")}
      subtitle={mode === "add" ? t("form.add_product_subtitle") : t("form.edit_product_subtitle")}
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">{t("delete.cancel")}</button>
          <button onClick={onSave} disabled={!isValid} className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
            {mode === "add" ? t("action.add_product") : t("action.save_changes")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Identity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t("form.label_article_code")} <span className="text-red-500">{t("form.required_field")}</span></Label>
            <input className={inputCls} value={form.articleCode} onChange={(e) => onChange("articleCode", e.target.value)} placeholder="e.g. RDG600/1,25" />
          </div>
          <div>
            <Label>{t("form.label_product_name")} <span className="text-red-500">{t("form.required_field")}</span></Label>
            <input className={inputCls} value={form.productName} onChange={(e) => onChange("productName", e.target.value)} placeholder="e.g. Rasperblade" />
          </div>
        </div>

        {/* Dimensions */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t("form.section_dimensions")}</p>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>{t("form.label_length")}</Label><input type="number" className={inputCls} value={form.lengthMm || ""} onChange={(e) => onChange("lengthMm", n(e.target.value))} placeholder="600" /></div>
            <div><Label>{t("form.label_width")}</Label><input type="number" className={inputCls} value={form.widthMm || ""} onChange={(e) => onChange("widthMm", n(e.target.value))} placeholder="21" /></div>
            <div><Label>{t("form.label_thickness")}</Label><input type="number" step="0.01" className={inputCls} value={form.thicknessMm || ""} onChange={(e) => onChange("thicknessMm", n(e.target.value))} placeholder="1.25" /></div>
          </div>
        </div>

        {/* Blade spec */}
        <div className="grid grid-cols-4 gap-3">
          <div><Label>{t("form.label_tpi")}</Label><input type="number" className={inputCls} value={form.tpi || ""} onChange={(e) => onChange("tpi", parseInt(e.target.value) || 17)} placeholder="17" /></div>
          <div>
            <Label>{t("form.label_punched_on")}</Label>
            <select className={inputCls} value={form.punchedOn} onChange={(e) => onChange("punchedOn", e.target.value)}>
              {PUNCHED_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div><Label>{t("form.label_hole_distance")}</Label><input className={inputCls} value={form.holeDistance ?? ""} onChange={(e) => onChange("holeDistance", e.target.value)} placeholder="100-200-100" /></div>
          <div><Label>{t("form.label_hole_size")}</Label><input className={inputCls} value={form.holeSize ?? ""} onChange={(e) => onChange("holeSize", e.target.value)} placeholder="Ø5" /></div>
        </div>

        {/* Color */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("form.label_color")}</Label>
            <select className={inputCls} value={form.color} onChange={(e) => onChange("color", e.target.value)}>
              {COLORS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Weight */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t("form.section_weight")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("form.label_weight_before")}</Label><input type="number" step="0.0001" className={inputCls} value={form.weightBeforePunchingKg || ""} onChange={(e) => onChange("weightBeforePunchingKg", n(e.target.value))} placeholder="0.1260" /></div>
            <div><Label>{t("form.label_weight_after")}</Label><input type="number" step="0.0001" className={inputCls} value={form.weightAfterPunchingKg || ""} onChange={(e) => onChange("weightAfterPunchingKg", n(e.target.value))} placeholder="0.1055" /></div>
          </div>
        </div>

        {/* Crating */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t("form.section_crating")}</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t("form.label_crate_type")} <span className="text-red-500">{t("form.required_field")}</span></Label>
              <select className={inputCls} value={form.crateTypeId} onChange={(e) => onChange("crateTypeId", e.target.value)}>
                <option value="">{t("form.placeholder_select_crate")}</option>
                {crateTypes.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
            </div>
            <div><Label>{t("form.label_pcs_per_crate")}</Label><input type="number" className={inputCls} value={form.pcsPerCrate || ""} onChange={(e) => onChange("pcsPerCrate", parseInt(e.target.value) || 0)} placeholder="2000" /></div>
            <div><Label>{t("form.label_max_crates_tower")}</Label><input type="number" className={inputCls} value={form.maxCratesPerTower || ""} onChange={(e) => onChange("maxCratesPerTower", parseInt(e.target.value) || 5)} placeholder="5" /></div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ product, onClose, onEdit, onDelete, isViewer, isWorker }: {
  product: BladeProduct; onClose: () => void;
  onEdit: (p: BladeProduct) => void; onDelete: (id: string) => void; isViewer: boolean; isWorker: boolean;
}) {
  function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div className="flex justify-between items-baseline gap-3 py-1.5 border-b border-zinc-800 last:border-b-0">
        <span className="text-xs text-zinc-500 shrink-0">{label}</span>
        <span className="text-xs text-zinc-200 text-right font-medium">{value}</span>
      </div>
    );
  }

  return (
    <div className="w-96 shrink-0 bg-zinc-900 border border-zinc-700 rounded-xl flex flex-col max-h-[calc(100vh-10rem)] overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
        <div className="min-w-0 pr-3">
          <span className="text-xs text-zinc-500 font-mono">{product.articleCode}</span>
          <h2 className="text-sm font-bold text-zinc-100 mt-0.5">{product.productName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{product.color}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{product.crateCode}</span>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Dimensions</p>
          <Row label="Length" value={`${product.lengthMm.toLocaleString()} mm`} />
          <Row label="Width" value={`${product.widthMm} mm`} />
          <Row label="Thickness" value={`${product.thicknessMm} mm`} />
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Blade Specification</p>
          <Row label="TPI" value={product.tpi} />
          <Row label="Punched On" value={product.punchedOn} />
          {product.holeDistance && <Row label="Hole Distance" value={product.holeDistance} />}
          {product.holeSize && <Row label="Hole Size" value={product.holeSize} />}
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Weight (per piece)</p>
          <Row label="Before Punching" value={`${product.weightBeforePunchingKg.toFixed(4)} kg`} />
          <Row label="After Punching" value={`${product.weightAfterPunchingKg.toFixed(4)} kg`} />
          <Row label="Weight Loss" value={`${((1 - product.weightAfterPunchingKg / product.weightBeforePunchingKg) * 100).toFixed(1)}%`} />
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Crating</p>
          <Row label="Crate Type" value={product.crateCode} />
          <Row label="Pcs per Crate" value={product.pcsPerCrate.toLocaleString()} />
          <Row label="Max Crates / Tower" value={product.maxCratesPerTower} />
        </div>
      </div>
      {!isWorker && (
        <div className="flex items-center gap-2 px-5 py-3 border-t border-zinc-800 shrink-0">
          <button onClick={() => onEdit(product)} disabled={isViewer} className={`flex-1 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors ${isViewer ? "opacity-50 cursor-not-allowed" : ""}`}>Edit</button>
          <button onClick={() => onDelete(product.id)} disabled={isViewer} className={`px-4 py-2 text-xs font-medium text-red-400 hover:text-red-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors ${isViewer ? "opacity-50 cursor-not-allowed" : ""}`}>Delete</button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductsClient({ initialItems, crateTypes }: { initialItems: BladeProduct[]; crateTypes: CrateType[] }) {
  const { user } = useAuth();
  const isViewer = user?.role === "VIEWER";
  const isWorker = user?.role === "WORKER";
  const [items, setItems]         = useState<BladeProduct[]>(initialItems);
  const [search, setSearch]       = useState("");
  const [colorFilter, setColor]   = useState<string>("All");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(25);
  const [formMode, setFormMode]   = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const { t }                     = useTranslation();
  const { toasts, showToast }     = useToast();

  useEffect(() => { setPage(1); }, [search, colorFilter]);

  const selectedProduct = items.find((p) => p.id === selectedId) ?? null;

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    return (
      (!q || p.articleCode.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q) || p.color.toLowerCase().includes(q) || p.crateCode.toLowerCase().includes(q)) &&
      (colorFilter === "All" || p.color === colorFilter)
    );
  });
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((prev) => ({ ...prev, [k]: v })); }
  function openAdd() { setForm({ ...EMPTY_FORM, crateTypeId: crateTypes[0]?.id ?? "" }); setEditingId(null); setFormMode("add"); }
  function openEdit(p: BladeProduct) { setForm(productToForm(p)); setEditingId(p.id); setFormMode("edit"); }
  function closeForm() { setFormMode(null); setEditingId(null); }

  async function saveItem() {
    if (!form.articleCode.trim() || !form.productName.trim() || !form.crateTypeId) return;

    if (isWorker && formMode === "add") {
      try {
        const res = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "CREATE_PRODUCT", payload: form }),
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
        const np = await addBladeProduct({ ...form, status: "Active" });
        if ("error" in np) { showToast(np.error, "error"); return; }
        setItems((prev) => [...prev, np].sort((a, b) => a.articleCode.localeCompare(b.articleCode)));
        setSelectedId(np.id);
        showToast("Product added.");
      } else if (editingId) {
        const up = await updateBladeProduct(editingId, { ...form, status: "Active" });
        if ("error" in up) { showToast(up.error, "error"); return; }
        setItems((prev) => prev.map((p) => p.id === editingId ? up : p));
        showToast("Product updated.");
      }
      closeForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const result = await deleteBladeProduct(deleteId);
      if (result && "error" in result) { showToast(result.error, "error"); return; }
      setItems((prev) => prev.filter((p) => p.id !== deleteId));
      if (selectedId === deleteId) setSelectedId(null);
      setDeleteId(null);
      showToast("Product deleted.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  const deletingItem = items.find((p) => p.id === deleteId);

  return (
    <div className="px-6 py-5 flex gap-5">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("summary.total_products"), value: items.length },
            { label: "GOLD", value: items.filter((p) => p.color === "GOLD").length },
            { label: "SILVER", value: items.filter((p) => p.color === "SILVER").length },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-xl font-bold text-zinc-100">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <section className="bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder={t("search.placeholder_products")} />
            <select value={colorFilter} onChange={(e) => setColor(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 transition-colors">
              {["All", ...COLORS].map((c) => <option key={c}>{c === "All" ? t("filter.all") : c}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-zinc-600">{filtered.length} / {items.length}</span>
              <button
                onClick={() => generateCSV(
                  filtered.map((p) => ({
                    "Article Code": p.articleCode, "Product Name": p.productName,
                    "Length (mm)": p.lengthMm, "Width (mm)": p.widthMm, "Thickness (mm)": p.thicknessMm,
                    TPI: p.tpi, "Punched On": p.punchedOn, "Hole Distance": p.holeDistance ?? "",
                    "Hole Size": p.holeSize ?? "", Color: p.color,
                    "Weight Before (kg)": p.weightBeforePunchingKg, "Weight After (kg)": p.weightAfterPunchingKg,
                    "Pcs/Crate": p.pcsPerCrate, "Crate": p.crateCode, "Max Crates/Tower": p.maxCratesPerTower,
                  })),
                  ["Article Code", "Product Name", "Length (mm)", "Width (mm)", "Thickness (mm)", "TPI", "Punched On", "Hole Distance", "Hole Size", "Color", "Weight Before (kg)", "Weight After (kg)", "Pcs/Crate", "Crate", "Max Crates/Tower"],
                  "products"
                )}
                disabled={isViewer}
                className={`px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors ${isViewer ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {t("btn.csv")}
              </button>
              <button
                onClick={() => generateXLSX(
                  filtered.map((p) => ({
                    "Article Code": p.articleCode, "Product Name": p.productName,
                    "Length (mm)": p.lengthMm, "Width (mm)": p.widthMm, "Thickness (mm)": p.thicknessMm,
                    TPI: p.tpi, Color: p.color,
                    "Weight Before (kg)": p.weightBeforePunchingKg, "Weight After (kg)": p.weightAfterPunchingKg,
                    "Pcs/Crate": p.pcsPerCrate, "Crate": p.crateCode,
                  })),
                  ["Article Code", "Product Name", "Length (mm)", "Width (mm)", "Thickness (mm)", "TPI", "Color", "Weight Before (kg)", "Weight After (kg)", "Pcs/Crate", "Crate"],
                  "products"
                )}
                disabled={isViewer}
                className={`px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors ${isViewer ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                XLSX
              </button>
              <AddButton onClick={openAdd} label={isWorker ? t("request.request_new_product") : t("action.add_product")} disabled={isViewer} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-600 uppercase tracking-wider border-b border-zinc-800">
                  <th className="px-5 py-2 font-medium">{t("table.article_code")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.product_name")}</th>
                  <th className="px-5 py-2 font-medium">L × W × T (mm)</th>
                  <th className="px-5 py-2 font-medium">{t("table.tpi")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.hole_pattern")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.color")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.wt_after")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.pcs_crate")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.crate")}</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="px-5 py-12 text-center text-xs text-zinc-600">
                    {t("empty.no_products")}
                    {(search || colorFilter !== "All") && (
                      <button onClick={() => { setSearch(""); setColor("All"); }} className="ml-2 text-zinc-500 hover:text-zinc-300 underline">{t("filter.clear_filters")}</button>
                    )}
                  </td></tr>
                ) : paged.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                    className={`cursor-pointer transition-colors ${i < paged.length - 1 ? "border-b border-zinc-800" : ""} ${selectedId === p.id ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
                  >
                    <td className="px-5 py-2.5 font-mono text-xs text-zinc-300">{p.articleCode}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-200">{p.productName}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-400 font-mono">{p.lengthMm.toLocaleString()}×{p.widthMm}×{p.thicknessMm}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-400">{p.tpi}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-500">{p.holeDistance ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${p.color === "GOLD" ? "bg-zinc-800 text-yellow-500 border-zinc-700" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>{p.color}</span>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-zinc-300 font-mono">{p.weightAfterPunchingKg.toFixed(4)}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-300">{p.pcsPerCrate.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-xs text-zinc-400">{p.crateCode}</td>
                    <td className="px-5 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {!isWorker && (
                          <>
                            <EditButton onClick={() => openEdit(p)} disabled={isViewer} />
                            <DeleteButton onClick={() => setDeleteId(p.id)} disabled={isViewer} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{t("pagination.rows")}</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded focus:outline-none">
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <span className="text-xs text-zinc-500">{Math.min((page-1)*pageSize+1, filtered.length)}–{Math.min(page*pageSize, filtered.length)} {t("pagination.of")} {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page === 1} className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 px-2 py-1">{t("pagination.previous")}</button>
              <span className="text-xs text-zinc-500">{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page >= totalPages} className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 px-2 py-1">{t("pagination.next")}</button>
            </div>
          </div>
        </section>
      </div>

      {/* Detail panel */}
      {selectedProduct && (
        <DetailPanel
          product={selectedProduct}
          onClose={() => setSelectedId(null)}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
          isViewer={isViewer}
          isWorker={isWorker}
        />
      )}

      {/* Modals */}
      {formMode && (
        <ProductModal
          mode={formMode}
          form={form}
          crateTypes={crateTypes}
          onChange={setField}
          onSave={saveItem}
          onClose={closeForm}
        />
      )}
      {deleteId && deletingItem && (
        <DeleteConfirm
          title={t("delete.title_product")}
          itemName={deletingItem.articleCode}
          onConfirm={confirmDelete}
          onClose={() => setDeleteId(null)}
        />
      )}
      <ToastList toasts={toasts} />
    </div>
  );
}
