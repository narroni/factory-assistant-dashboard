"use client";

import { useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { ModalShell } from "../../components/ModalShell";
import { DeleteConfirm } from "../../components/DeleteConfirm";
import { useToast, ToastList } from "../../components/Toast";
import { Label, inputCls, NumberInput, AddButton, EditButton, DeleteButton } from "../../components/ui";
import {
  addCrateType, updateCrateType, deleteCrateType,
  addContainerType, updateContainerType, deleteContainerType,
  type CrateType, type ContainerType,
} from "./actions";

type Tab = "crates" | "containers";

// ── Crate form ────────────────────────────────────────────────────────────────

type CrateFormState = Omit<CrateType, "id">;

const EMPTY_CRATE_FORM: CrateFormState = {
  code: "", emptyWeightKg: 0, xMeters: 0, yMeters: 0, zMeters: 0, hasLegs: false, legsDescription: "",
};

function crateToForm(c: CrateType): CrateFormState {
  return { code: c.code, emptyWeightKg: c.emptyWeightKg, xMeters: c.xMeters, yMeters: c.yMeters, zMeters: c.zMeters, hasLegs: c.hasLegs, legsDescription: c.legsDescription };
}

function CrateForm({ mode, form, onChange, onSave, onClose }: {
  mode: "add" | "edit"; form: CrateFormState;
  onChange: <K extends keyof CrateFormState>(k: K, v: CrateFormState[K]) => void;
  onSave: () => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const isValid = form.code.trim().length > 0;

  return (
    <ModalShell
      title={mode === "add" ? t("form.add_crate") : t("form.edit_crate")}
      subtitle={mode === "add" ? t("form.subtitle_add_crate") : t("form.subtitle_edit_crate")}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">{t("delete.cancel")}</button>
          <button onClick={onSave} disabled={!isValid} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
            {mode === "add" ? t("action.add_crate") : t("action.save_changes")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>{t("table.code")} <span className="text-red-500">{t("form.required_field")}</span></Label>
          <input className={inputCls} value={form.code} onChange={(e) => onChange("code", e.target.value)} placeholder="e.g. CR-STD-01" />
        </div>
        <div>
          <Label>{t("table.weight_kg")}</Label>
          <NumberInput value={form.emptyWeightKg} onChange={(v) => onChange("emptyWeightKg", v)} min={0} step="0.1" placeholder="0.0" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>{t("table.x_m")}</Label><NumberInput value={form.xMeters} onChange={(v) => onChange("xMeters", v)} min={0} step="0.01" placeholder="0.00" /></div>
          <div><Label>{t("table.y_m")}</Label><NumberInput value={form.yMeters} onChange={(v) => onChange("yMeters", v)} min={0} step="0.01" placeholder="0.00" /></div>
          <div><Label>{t("table.z_m")}</Label><NumberInput value={form.zMeters} onChange={(v) => onChange("zMeters", v)} min={0} step="0.01" placeholder="0.00" /></div>
        </div>
        <div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.hasLegs}
              onChange={(e) => onChange("hasLegs", e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
            />
            <span className="text-sm text-zinc-300">{t("table.has_legs")}</span>
          </label>
        </div>
        {form.hasLegs && (
          <div>
            <Label>{t("form.label_legs_description")}</Label>
            <input className={inputCls} value={form.legsDescription} onChange={(e) => onChange("legsDescription", e.target.value)} placeholder="e.g. 4 steel legs, 15cm height" />
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ── Container form ────────────────────────────────────────────────────────────

type ContainerFormState = Omit<ContainerType, "id">;

const EMPTY_CONTAINER_FORM: ContainerFormState = {
  name: "", lengthMeters: 0, widthMeters: 0, maxVolumeM3: 0, maxPayloadKg: 0,
};

function containerToForm(c: ContainerType): ContainerFormState {
  return { name: c.name, lengthMeters: c.lengthMeters, widthMeters: c.widthMeters, maxVolumeM3: c.maxVolumeM3, maxPayloadKg: c.maxPayloadKg };
}

function ContainerForm({ mode, form, onChange, onSave, onClose }: {
  mode: "add" | "edit"; form: ContainerFormState;
  onChange: <K extends keyof ContainerFormState>(k: K, v: ContainerFormState[K]) => void;
  onSave: () => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const isValid = form.name.trim().length > 0;

  return (
    <ModalShell
      title={mode === "add" ? t("form.add_container") : t("form.edit_container")}
      subtitle={mode === "add" ? t("form.subtitle_add_container") : t("form.subtitle_edit_container")}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">{t("delete.cancel")}</button>
          <button onClick={onSave} disabled={!isValid} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
            {mode === "add" ? t("action.add_container") : t("action.save_changes")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>{t("table.name")} <span className="text-red-500">{t("form.required_field")}</span></Label>
          <input className={inputCls} value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. 40ft High Cube" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>{t("table.length_m")}</Label><NumberInput value={form.lengthMeters} onChange={(v) => onChange("lengthMeters", v)} min={0} step="0.01" placeholder="0.00" /></div>
          <div><Label>{t("table.width_m")}</Label><NumberInput value={form.widthMeters} onChange={(v) => onChange("widthMeters", v)} min={0} step="0.01" placeholder="0.00" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>{t("table.max_volume_m3")}</Label><NumberInput value={form.maxVolumeM3} onChange={(v) => onChange("maxVolumeM3", v)} min={0} step="0.01" placeholder="0.00" /></div>
          <div><Label>{t("table.max_payload_kg")}</Label><NumberInput value={form.maxPayloadKg} onChange={(v) => onChange("maxPayloadKg", v)} min={0} step="0.1" placeholder="0.0" /></div>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CratesContainersClient({
  initialCrates, initialContainers,
}: { initialCrates: CrateType[]; initialContainers: ContainerType[] }) {
  const { t } = useTranslation();
  const { toasts, showToast } = useToast();

  const [tab, setTab] = useState<Tab>("crates");

  // Crates state
  const [crates, setCrates] = useState<CrateType[]>(initialCrates);
  const [crateFormMode, setCrateFormMode] = useState<"add" | "edit" | null>(null);
  const [crateEditingId, setCrateEditingId] = useState<string | null>(null);
  const [crateForm, setCrateForm] = useState<CrateFormState>(EMPTY_CRATE_FORM);
  const [crateDeleteId, setCrateDeleteId] = useState<string | null>(null);

  // Containers state
  const [containers, setContainers] = useState<ContainerType[]>(initialContainers);
  const [containerFormMode, setContainerFormMode] = useState<"add" | "edit" | null>(null);
  const [containerEditingId, setContainerEditingId] = useState<string | null>(null);
  const [containerForm, setContainerForm] = useState<ContainerFormState>(EMPTY_CONTAINER_FORM);
  const [containerDeleteId, setContainerDeleteId] = useState<string | null>(null);

  function setCrateField<K extends keyof CrateFormState>(k: K, v: CrateFormState[K]) { setCrateForm((prev) => ({ ...prev, [k]: v })); }
  function openAddCrate() { setCrateForm(EMPTY_CRATE_FORM); setCrateEditingId(null); setCrateFormMode("add"); }
  function openEditCrate(c: CrateType) { setCrateForm(crateToForm(c)); setCrateEditingId(c.id); setCrateFormMode("edit"); }
  function closeCrateForm() { setCrateFormMode(null); setCrateEditingId(null); }

  async function saveCrate() {
    if (!crateForm.code.trim()) return;
    try {
      if (crateFormMode === "add") {
        const created = await addCrateType(crateForm);
        if ("error" in created) { showToast(created.error, "error"); return; }
        setCrates((prev) => [created, ...prev]);
        showToast(t("toast.crate_added"));
      } else if (crateEditingId) {
        const updated = await updateCrateType(crateEditingId, crateForm);
        if ("error" in updated) { showToast(updated.error, "error"); return; }
        setCrates((prev) => prev.map((c) => c.id === crateEditingId ? updated : c));
        showToast(t("toast.crate_updated"));
      }
      closeCrateForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Operation failed", "error");
    }
  }

  async function confirmDeleteCrate() {
    if (!crateDeleteId) return;
    try {
      const code = crates.find((c) => c.id === crateDeleteId)?.code ?? "Crate";
      const result = await deleteCrateType(crateDeleteId);
      if (result && "error" in result) { showToast(result.error, "error"); return; }
      setCrates((prev) => prev.filter((c) => c.id !== crateDeleteId));
      setCrateDeleteId(null);
      showToast(`"${code}" ${t("toast.deleted_suffix")}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  function setContainerField<K extends keyof ContainerFormState>(k: K, v: ContainerFormState[K]) { setContainerForm((prev) => ({ ...prev, [k]: v })); }
  function openAddContainer() { setContainerForm(EMPTY_CONTAINER_FORM); setContainerEditingId(null); setContainerFormMode("add"); }
  function openEditContainer(c: ContainerType) { setContainerForm(containerToForm(c)); setContainerEditingId(c.id); setContainerFormMode("edit"); }
  function closeContainerForm() { setContainerFormMode(null); setContainerEditingId(null); }

  async function saveContainer() {
    if (!containerForm.name.trim()) return;
    try {
      if (containerFormMode === "add") {
        const created = await addContainerType(containerForm);
        if ("error" in created) { showToast(created.error, "error"); return; }
        setContainers((prev) => [created, ...prev]);
        showToast(t("toast.container_added"));
      } else if (containerEditingId) {
        const updated = await updateContainerType(containerEditingId, containerForm);
        if ("error" in updated) { showToast(updated.error, "error"); return; }
        setContainers((prev) => prev.map((c) => c.id === containerEditingId ? updated : c));
        showToast(t("toast.container_updated"));
      }
      closeContainerForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Operation failed", "error");
    }
  }

  async function confirmDeleteContainer() {
    if (!containerDeleteId) return;
    try {
      const name = containers.find((c) => c.id === containerDeleteId)?.name ?? "Container";
      const result = await deleteContainerType(containerDeleteId);
      if (result && "error" in result) { showToast(result.error, "error"); return; }
      setContainers((prev) => prev.filter((c) => c.id !== containerDeleteId));
      setContainerDeleteId(null);
      showToast(`"${name}" ${t("toast.deleted_suffix")}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  const deletingCrate = crates.find((c) => c.id === crateDeleteId);
  const deletingContainer = containers.find((c) => c.id === containerDeleteId);

  return (
    <div className="px-8 py-6 space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-800">
        <button
          onClick={() => setTab("crates")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "crates" ? "border-blue-500 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {t("tab.crates")}
        </button>
        <button
          onClick={() => setTab("containers")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "containers" ? "border-blue-500 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {t("tab.containers")}
        </button>
      </div>

      {tab === "crates" ? (
        <section className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 flex-wrap">
            <span className="text-xs text-zinc-600">{crates.length} {t("tab.crates").toLowerCase()}</span>
            <div className="ml-auto"><AddButton onClick={openAddCrate} label={t("action.add_crate")} /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                  <th className="px-6 py-3 font-medium">{t("table.code")}</th>
                  <th className="px-6 py-3 font-medium">{t("table.weight_kg")}</th>
                  <th className="px-6 py-3 font-medium">{t("table.x_m")}</th>
                  <th className="px-6 py-3 font-medium">{t("table.y_m")}</th>
                  <th className="px-6 py-3 font-medium">{t("table.z_m")}</th>
                  <th className="px-6 py-3 font-medium">{t("table.has_legs")}</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {crates.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center">
                    <p className="text-zinc-500 text-sm">{t("empty.no_crates")}</p>
                  </td></tr>
                ) : crates.map((c, i) => (
                  <tr key={c.id} className={`hover:bg-zinc-800/40 transition-colors ${i < crates.length - 1 ? "border-b border-zinc-800" : ""}`}>
                    <td className="px-6 py-3.5 text-xs font-medium text-zinc-200">{c.code}</td>
                    <td className="px-6 py-3.5 text-xs text-zinc-400">{c.emptyWeightKg}</td>
                    <td className="px-6 py-3.5 text-xs text-zinc-400">{c.xMeters}</td>
                    <td className="px-6 py-3.5 text-xs text-zinc-400">{c.yMeters}</td>
                    <td className="px-6 py-3.5 text-xs text-zinc-400">{c.zMeters}</td>
                    <td className="px-6 py-3.5 text-xs text-zinc-400">{c.hasLegs ? t("common.yes") : t("common.no")}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1">
                        <EditButton onClick={() => openEditCrate(c)} />
                        <DeleteButton onClick={() => setCrateDeleteId(c.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 flex-wrap">
            <span className="text-xs text-zinc-600">{containers.length} {t("tab.containers").toLowerCase()}</span>
            <div className="ml-auto"><AddButton onClick={openAddContainer} label={t("action.add_container")} /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                  <th className="px-6 py-3 font-medium">{t("table.name")}</th>
                  <th className="px-6 py-3 font-medium">{t("table.length_m")}</th>
                  <th className="px-6 py-3 font-medium">{t("table.width_m")}</th>
                  <th className="px-6 py-3 font-medium">{t("table.max_volume_m3")}</th>
                  <th className="px-6 py-3 font-medium">{t("table.max_payload_kg")}</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {containers.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center">
                    <p className="text-zinc-500 text-sm">{t("empty.no_containers")}</p>
                  </td></tr>
                ) : containers.map((c, i) => (
                  <tr key={c.id} className={`hover:bg-zinc-800/40 transition-colors ${i < containers.length - 1 ? "border-b border-zinc-800" : ""}`}>
                    <td className="px-6 py-3.5 text-xs font-medium text-zinc-200">{c.name}</td>
                    <td className="px-6 py-3.5 text-xs text-zinc-400">{c.lengthMeters}</td>
                    <td className="px-6 py-3.5 text-xs text-zinc-400">{c.widthMeters}</td>
                    <td className="px-6 py-3.5 text-xs text-zinc-400">{c.maxVolumeM3}</td>
                    <td className="px-6 py-3.5 text-xs text-zinc-400">{c.maxPayloadKg}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1">
                        <EditButton onClick={() => openEditContainer(c)} />
                        <DeleteButton onClick={() => setContainerDeleteId(c.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {crateFormMode && <CrateForm mode={crateFormMode} form={crateForm} onChange={setCrateField} onSave={saveCrate} onClose={closeCrateForm} />}
      {crateDeleteId && deletingCrate && <DeleteConfirm title={t("delete.title_crate")} itemName={deletingCrate.code} onConfirm={confirmDeleteCrate} onClose={() => setCrateDeleteId(null)} />}

      {containerFormMode && <ContainerForm mode={containerFormMode} form={containerForm} onChange={setContainerField} onSave={saveContainer} onClose={closeContainerForm} />}
      {containerDeleteId && deletingContainer && <DeleteConfirm title={t("delete.title_container")} itemName={deletingContainer.name} onConfirm={confirmDeleteContainer} onClose={() => setContainerDeleteId(null)} />}

      <ToastList toasts={toasts} />
    </div>
  );
}
