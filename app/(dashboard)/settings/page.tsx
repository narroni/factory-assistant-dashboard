"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { useToast, ToastList } from "../../components/Toast";
import { getCurrentUser } from "../../lib/auth-helpers";
import { ModalShell } from "../../components/ModalShell";
import { DeleteConfirm } from "../../components/DeleteConfirm";
import { getUsers, createUser, updateUser, deactivateUser, activateUser, resetUserPassword, setForcePasswordChange, type UserInfo } from "./actions";
import { getAuditLogs } from "../../lib/audit";
import type { UserRole } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type BackupRecord = {
  id: string;
  filename: string;
  sizeBytes: number;
  createdBy: string;
  note: string | null;
  createdAt: string;
};

type UserFormState = {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
};

type AIConfig = {
  id: string;
  assistantName: string;
  systemPrompt: string;
  defaultLanguage: string;
  focusMode?: string;
  companyKnowledge?: string;
};

type KnowledgeFile = {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  content: string;
  enabled: boolean;
  uploadedBy: string;
  user: { name: string };
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type AIRule = {
  id: string;
  text: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
};

type UserLastAction = {
  userId: string;
  actionType: string;
  entity: string;
  entityId: string;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLES: UserRole[] = ["MANAGER", "WORKER", "VIEWER"];
const RULE_SUGGESTIONS = [
  "Never create orders automatically without explicit user confirmation.",
  "Always show packaging calculations when discussing container shipments.",
  "Use metric units (kg, m, m²) in all calculations.",
  "Always ask for approval before proposing actions.",
  "When answering order fit questions, show weight, footprint, and volume separately.",
  "Respond in the same language the user is writing in.",
  "When data is missing, say so clearly instead of estimating.",
];

// ── Helper Functions ──────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="px-6 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, value, type = "text", hint }: { label: string; value: string; type?: string; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      <input
        type={type}
        defaultValue={value}
        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
      />
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

// ── User Modal ─────────────────────────────────────────────────────────────────

function UserModal({
  mode,
  user,
  form,
  onChange,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  user?: UserInfo;
  form: UserFormState;
  onChange: (field: keyof UserFormState, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isValid = form.name.trim() && form.email.trim() && (mode === "edit" || form.password?.trim());

  return (
    <ModalShell
      title={mode === "add" ? t("settings.btn_add_user") : t("settings.btn_edit_user")}
      subtitle={mode === "add" ? "Create a new user account." : `Update ${user?.name}'s information.`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">{t("delete.cancel")}</button>
          <button
            onClick={onSave}
            disabled={!isValid}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {mode === "add" ? t("settings.btn_add_user") : t("action.save_changes")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="e.g. john@factory.local"
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Role</label>
          <select
            value={form.role}
            onChange={(e) => onChange("role", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {mode === "add" && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
            <input
              type="password"
              value={form.password || ""}
              onChange={(e) => onChange("password", e.target.value)}
              placeholder="Set initial password"
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
            />
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ── Reset Password Modal ───────────────────────────────────────────────────────

function ResetPasswordModal({
  user,
  password,
  onPasswordChange,
  onReset,
  onClose,
}: {
  user: UserInfo;
  password: string;
  onPasswordChange: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isValid = password.trim().length > 0;

  return (
    <ModalShell
      title={t("settings.label_new_password")}
      subtitle={`Set a new password for ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">{t("delete.cancel")}</button>
          <button
            onClick={onReset}
            disabled={!isValid}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t("settings.label_new_password")}
          </button>
        </>
      }
    >
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("settings.label_new_password")}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Enter new password"
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
        />
      </div>
    </ModalShell>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toasts, showToast } = useToast();

  // Auth state
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"general" | "users" | "ai-assistant" | "ai-context" | "backups">("general");

  // General tab state
  const [generalLoading, setGeneralLoading] = useState(true);

  // Users tab state
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>({ name: "", email: "", role: "VIEWER" });
  const [resetPasswordUser, setResetPasswordUser] = useState<UserInfo | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);
  const [userLastActions, setUserLastActions] = useState<Record<string, UserLastAction | null>>({});

  // Backups tab state
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [backupNote, setBackupNote] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupCreating, setBackupCreating] = useState(false);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [deleteBackupId, setDeleteBackupId] = useState<string | null>(null);

  // AI Config tab state
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [aiConfigLoading, setAIConfigLoading] = useState(true);
  const [aiConfigSaving, setAIConfigSaving] = useState(false);
  const [aiConfigMessage, setAIConfigMessage] = useState("");

  // AI Knowledge tab state
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [knowledgeUploading, setKnowledgeUploading] = useState(false);
  const [knowledgeMessage, setKnowledgeMessage] = useState("");
  const [knowledgePreviewId, setKnowledgePreviewId] = useState<string | null>(null);
  const knowledgeFileInputRef = useRef<HTMLInputElement>(null);

  // AI Rules tab state
  const [rules, setRules] = useState<AIRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesNewText, setRulesNewText] = useState("");
  const [rulesAdding, setRulesAdding] = useState(false);
  const [rulesEditingId, setRulesEditingId] = useState<string | null>(null);
  const [rulesEditText, setRulesEditText] = useState("");

  // AI Context tab state
  const [contextQuestion, setContextQuestion] = useState("");
  const [contextData, setContextData] = useState<any>(null);
  const [contextTabView, setContextTabView] = useState<"rules" | "knowledge" | "factory">("rules");

  // Auth check and initial data loading
  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace("/login"); return; }
        if (user.role !== "SUPER_ADMIN") { router.replace("/"); return; }
        setIsAdmin(true);
        setAuthChecked(true);

        // Load all initial data
        const [userData, backupData, configData, knowledgeData, rulesData] = await Promise.all([
          getUsers(),
          (async () => {
            try {
              const res = await fetch("/api/backup");
              return res.ok ? await res.json() : [];
            } catch {
              return [];
            }
          })(),
          (async () => {
            try {
              const res = await fetch("/api/admin/ai-config");
              return await res.json();
            } catch {
              return null;
            }
          })(),
          (async () => {
            try {
              const res = await fetch("/api/admin/knowledge");
              return await res.json();
            } catch {
              return [];
            }
          })(),
          (async () => {
            try {
              const res = await fetch("/api/admin/rules");
              return await res.json();
            } catch {
              return [];
            }
          })(),
        ]);

        setUsers(userData);
        setBackups(backupData);
        setAIConfig(configData);
        setKnowledgeFiles(Array.isArray(knowledgeData) ? knowledgeData : []);
        setRules(Array.isArray(rulesData) ? rulesData : []);

        // Load last action for each user
        const lastActionsMap: Record<string, UserLastAction | null> = {};
        for (const u of userData) {
          try {
            const { logs } = await getAuditLogs({ userId: u.id, limit: 1 });
            if (logs.length > 0) {
              const log = logs[0];
              lastActionsMap[u.id] = {
                userId: u.id,
                actionType: log.action,
                entity: log.entity,
                entityId: log.entityId,
              };
            } else {
              lastActionsMap[u.id] = null;
            }
          } catch {
            lastActionsMap[u.id] = null;
          }
        }
        setUserLastActions(lastActionsMap);
      } catch {
        router.replace("/");
      } finally {
        setGeneralLoading(false);
        setUsersLoading(false);
        setAIConfigLoading(false);
        setKnowledgeLoading(false);
        setRulesLoading(false);
      }
    })();
  }, [router]);

  // ── Backup Handlers ────────────────────────────────────────────────────────

  const loadBackups = useCallback(async () => {
    try {
      setBackupLoading(true);
      const res = await fetch("/api/backup");
      if (res.ok) setBackups(await res.json());
    } catch {
      // silently fail
    } finally {
      setBackupLoading(false);
    }
  }, []);

  if (!authChecked) return null;

  async function handleCreateBackup() {
    try {
      setBackupCreating(true);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: backupNote }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create backup");
      }
      setBackupNote("");
      await loadBackups();
      showToast(t("settings.msg_backup_created"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("settings.error_backup_failed"), "error");
    } finally {
      setBackupCreating(false);
    }
  }

  async function handleDownloadBackup(backup: BackupRecord) {
    try {
      const res = await fetch(`/api/backup/${backup.id}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backup.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast(t("settings.error_backup_download_failed"), "error");
    }
  }

  async function handleRestoreBackup() {
    if (!restoreConfirmId) return;
    try {
      const res = await fetch(`/api/backup/${restoreConfirmId}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Restore failed");
      }
      showToast(t("settings.msg_backup_restored"));
      setRestoreConfirmId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Restore failed", "error");
      setRestoreConfirmId(null);
    }
  }

  async function handleDeleteBackup() {
    if (!deleteBackupId) return;
    try {
      const res = await fetch(`/api/backup/${deleteBackupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadBackups();
      showToast(t("settings.msg_backup_deleted"));
      setDeleteBackupId(null);
    } catch {
      showToast(t("settings.error_backup_delete_failed"), "error");
      setDeleteBackupId(null);
    }
  }

  // ── User Handlers ──────────────────────────────────────────────────────────

  function setUserField(field: keyof UserFormState, value: string) {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveUser() {
    try {
      if (formMode === "add") {
        await createUser({ ...userForm, password: userForm.password || "" });
        const data = await getUsers();
        setUsers(data);
        showToast("User created successfully.");
      } else if (formMode === "edit" && editingUser) {
        await updateUser(editingUser.id, userForm);
        const data = await getUsers();
        setUsers(data);
        showToast("User updated.");
      }
      setFormMode(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save user", "error");
    }
  }

  async function handleResetPassword() {
    if (!resetPasswordUser) return;
    try {
      await resetUserPassword(resetPasswordUser.id, resetPassword);
      showToast(t("settings.msg_backup_created"));
      setResetPasswordUser(null);
      setResetPassword("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reset password", "error");
    }
  }

  async function handleToggleUserStatus() {
    if (!deactivateUserId) return;
    try {
      const user = users.find((u) => u.id === deactivateUserId);
      if (!user) return;

      if (user.status === "ACTIVE") {
        await deactivateUser(deactivateUserId);
      } else {
        await activateUser(deactivateUserId);
      }

      const data = await getUsers();
      setUsers(data);
      showToast(user.status === "ACTIVE" ? "User deactivated." : "User activated.");
      setDeactivateUserId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update user status", "error");
    }
  }

  // ── AI Config Handlers ─────────────────────────────────────────────────────

  async function loadAIConfig() {
    try {
      const data = await (await fetch("/api/admin/ai-config")).json();
      setAIConfig(data);
    } finally {
      setAIConfigLoading(false);
    }
  }

  async function handleSaveAIConfig() {
    if (!aiConfig) return;
    setAIConfigSaving(true);
    try {
      const data = await (
        await fetch("/api/admin/ai-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiConfig),
        })
      ).json();
      setAIConfig(data);
      setAIConfigMessage(t("settings.msg_profile_updated"));
      setTimeout(() => setAIConfigMessage(""), 3000);
    } catch {
      setAIConfigMessage("Failed to save configuration");
    } finally {
      setAIConfigSaving(false);
    }
  }

  // ── Knowledge Handlers ─────────────────────────────────────────────────────

  async function loadKnowledgeFiles() {
    try {
      const data = await (await fetch("/api/admin/knowledge")).json();
      setKnowledgeFiles(Array.isArray(data) ? data : []);
    } finally {
      setKnowledgeLoading(false);
    }
  }

  async function handleKnowledgeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["txt", "csv", "xlsx", "pdf"].includes(ext ?? "")) {
      setKnowledgeMessage("Only TXT, CSV, XLSX, and PDF files are supported.");
      return;
    }

    setKnowledgeUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/knowledge", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setKnowledgeFiles((prev) => [data, ...prev]);
        setKnowledgeMessage(`Uploaded: ${file.name}`);
        setTimeout(() => setKnowledgeMessage(""), 3000);
        if (knowledgeFileInputRef.current) knowledgeFileInputRef.current.value = "";
      } else {
        setKnowledgeMessage(data.error ?? "Upload failed");
      }
    } finally {
      setKnowledgeUploading(false);
    }
  }

  async function toggleKnowledgeEnabled(id: string, currentEnabled: boolean) {
    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const updated = await res.json();
      setKnowledgeFiles((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch {
      setKnowledgeMessage("Failed to toggle file");
    }
  }

  async function deleteKnowledgeFile(id: string) {
    if (!confirm("Delete this knowledge file?")) return;
    try {
      await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
      setKnowledgeFiles((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setKnowledgeMessage("Failed to delete file");
    }
  }

  // ── Rules Handlers ─────────────────────────────────────────────────────────

  async function loadRules() {
    try {
      const data = await (await fetch("/api/admin/rules")).json();
      setRules(Array.isArray(data) ? data : []);
    } finally {
      setRulesLoading(false);
    }
  }

  async function addRule(text: string) {
    if (!text.trim()) return;
    setRulesAdding(true);
    try {
      const res = await fetch("/api/admin/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), sortOrder: rules.length }),
      });
      if (!res.ok) throw new Error("Failed to add rule");
      const rule = await res.json();
      setRules((prev) => [...prev, rule]);
      setRulesNewText("");
      showToast("Rule added.");
    } catch {
      showToast("Failed to add rule", "error");
    } finally {
      setRulesAdding(false);
    }
  }

  async function toggleRule(id: string, enabled: boolean) {
    try {
      await fetch(`/api/admin/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled } : r));
    } catch {
      showToast("Failed to update rule", "error");
    }
  }

  async function saveRuleEdit(id: string) {
    if (!rulesEditText.trim()) return;
    try {
      await fetch(`/api/admin/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rulesEditText.trim() }),
      });
      setRules((prev) => prev.map((r) => r.id === id ? { ...r, text: rulesEditText.trim() } : r));
      setRulesEditingId(null);
      showToast("Rule updated.");
    } catch {
      showToast("Failed to update rule", "error");
    }
  }

  async function deleteRule(id: string) {
    try {
      await fetch(`/api/admin/rules/${id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== id));
      showToast("Rule deleted.");
    } catch {
      showToast("Failed to delete rule", "error");
    }
  }

  // ── Context Handlers ──────────────────────────────────────────────────────

  async function fetchContext() {
    try {
      const res = await fetch("/api/assistant/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: contextQuestion }),
      });
      const data = await res.json();
      setContextData(data);
    } catch (err) {
      console.error("Failed to fetch context:", err);
    }
  }

  // ── Tab Bar ────────────────────────────────────────────────────────────────

  const tabs: Array<{ id: "general" | "users" | "ai-assistant" | "ai-context" | "backups"; label: string }> = [
    { id: "general", label: "General" },
    { id: "users", label: "Users" },
    { id: "ai-assistant", label: "AI Assistant" },
    { id: "ai-context", label: "AI Context" },
    { id: "backups", label: "Backups" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-5">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage your system configuration, users, and AI assistant</p>
      </div>

      {/* Tab Bar */}
      <div className="mb-6 border-b border-zinc-800">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-zinc-100 border-b-blue-500"
                  : "text-zinc-500 border-b-transparent hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: General */}
      {activeTab === "general" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-4">
              <Section title={t("settings.section_company")}>
                <div className="space-y-3">
                  <Field label={t("settings.label_company_name")} value="Narko Industries d.o.o." />
                  <Field label={t("settings.label_factory_name")} value="Production Facility — Line A/B" />
                  <Field label={t("settings.label_factory_code")} value="FAC-001" hint="Internal factory identifier used in reports and labels." />
                  <Field label={t("settings.label_location")} value="Zagreb, Croatia" />
                </div>
              </Section>

              <Section title={t("settings.section_thresholds")}>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Low Stock (%)" value="25" type="number" />
                  <Field label={t("settings.label_critical_pct")} value="10" type="number" />
                  <Field label={t("settings.label_buffer_days")} value="7" type="number" />
                </div>
              </Section>
            </div>

            <div className="lg:col-span-2">
              <Link href="/settings/audit-logs">
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-zinc-700 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">Audit Logs</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Create, update, delete history.</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Users */}
      {activeTab === "users" && (
        <div>
          {usersLoading ? (
            <div className="text-xs text-zinc-500">Loading users...</div>
          ) : (
            <>
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-100">{t("settings.tab_users")}</h3>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm({ name: "", email: "", role: "VIEWER", password: "" });
                      setFormMode("add");
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add User
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/50">
                        <th className="px-4 py-3 font-medium">User</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Last Login</th>
                        <th className="px-4 py-3 font-medium">Last Action</th>
                        <th className="px-4 py-3 font-medium">Created</th>
                        <th className="px-4 py-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-xs text-zinc-500">No users found</td>
                        </tr>
                      ) : (
                        users.map((u, i) => (
                          <tr key={u.id} className={`hover:bg-zinc-800/40 transition-colors ${i < users.length - 1 ? "border-b border-zinc-800" : ""}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                  {u.name[0]}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-zinc-200">{u.name}</p>
                                  <p className="text-xs text-zinc-600">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded">{u.role}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${u.status === "ACTIVE" ? "bg-emerald-900/50 text-emerald-300" : "bg-zinc-800 text-zinc-500"}`}>
                                {u.status === "ACTIVE" ? t("settings.status_active") : t("settings.status_inactive")}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-500">{u.lastLoginAt || "Never"}</td>
                            <td className="px-4 py-3 text-xs text-zinc-500">
                              {userLastActions[u.id] ? `${userLastActions[u.id].actionType} ${userLastActions[u.id].entity}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-500">{u.createdAt}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingUser(u);
                                    setUserForm({ name: u.name, email: u.email, role: u.role });
                                    setFormMode("edit");
                                  }}
                                  className="text-xs text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-700 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setResetPasswordUser(u)}
                                  className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded hover:bg-zinc-700 transition-colors"
                                >
                                  Reset Pwd
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await setForcePasswordChange(u.id, !u.forcePasswordChange);
                                      const updated = await getUsers();
                                      setUsers(updated);
                                      showToast(u.forcePasswordChange ? "Password change requirement cleared" : "Password change required on next login", "success");
                                    } catch {
                                      showToast("Failed to update password change setting", "error");
                                    }
                                  }}
                                  className={`text-xs px-2 py-1 rounded transition-colors ${
                                    u.forcePasswordChange
                                      ? "text-purple-500 hover:text-purple-400 hover:bg-zinc-700"
                                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700"
                                  }`}
                                >
                                  {u.forcePasswordChange ? "Force ✓" : "Force"}
                                </button>
                                <button
                                  onClick={() => setDeactivateUserId(u.id)}
                                  className={`text-xs px-2 py-1 rounded transition-colors ${
                                    u.status === "ACTIVE"
                                      ? "text-red-500 hover:text-red-400 hover:bg-zinc-700"
                                      : "text-green-500 hover:text-green-400 hover:bg-zinc-700"
                                  }`}
                                >
                                  {u.status === "ACTIVE" ? t("settings.btn_deactivate") : t("settings.btn_activate")}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: AI Assistant */}
      {activeTab === "ai-assistant" && (
        <div className="space-y-6">
          {/* AI Config Section */}
          {aiConfigLoading ? (
            <div className="text-xs text-zinc-500">Loading…</div>
          ) : aiConfig ? (
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 mb-4">AI Configuration</h3>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Assistant Name</label>
                  <input
                    type="text"
                    value={aiConfig.assistantName}
                    onChange={(e) => setAIConfig({ ...aiConfig, assistantName: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Factory Copilot"
                  />
                  <p className="text-xs text-zinc-600">Used in system prompt to identify the assistant.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Default Language</label>
                  <select
                    value={aiConfig.defaultLanguage}
                    onChange={(e) => setAIConfig({ ...aiConfig, defaultLanguage: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="de">German</option>
                  </select>
                  <p className="text-xs text-zinc-600">Language preference when user intention is unclear.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Focus Mode</label>
                  <select
                    value={aiConfig.focusMode || "general"}
                    onChange={(e) => setAIConfig({ ...aiConfig, focusMode: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="general">General Assistant</option>
                    <option value="production">Production & Manufacturing</option>
                    <option value="logistics">Orders & Logistics</option>
                  </select>
                  <p className="text-xs text-zinc-600">
                    {(aiConfig.focusMode || "general") === "production"
                      ? "The AI prioritizes product specs, materials, and manufacturing data in its responses."
                      : (aiConfig.focusMode || "general") === "logistics"
                        ? "The AI prioritizes orders, shipping, packaging calculations, and delivery data in its responses."
                        : "The AI gives equal attention to all areas — products, orders, materials, and customers."}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Custom System Instructions</label>
                  <textarea
                    value={aiConfig.systemPrompt}
                    onChange={(e) => setAIConfig({ ...aiConfig, systemPrompt: e.target.value })}
                    rows={6}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Add custom instructions for the assistant (e.g., 'Always consider cost first', 'Be cautious about supplier changes')"
                  />
                  <p className="text-xs text-zinc-600">Appended to the system prompt. Keep concise.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Company Knowledge</label>
                  <textarea
                    value={aiConfig.companyKnowledge || ""}
                    onChange={(e) => setAIConfig({ ...aiConfig, companyKnowledge: e.target.value })}
                    rows={6}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Enter anything the AI should always know about this company — payment terms, key contacts, shipping policies, important customers, working hours, certifications, etc."
                  />
                  <p className="text-xs text-zinc-600">Injected into every AI response as permanent background knowledge.</p>
                </div>

                {aiConfigMessage && (
                  <div
                    className={`text-xs px-3 py-2 rounded-lg ${
                      aiConfigMessage.includes("success")
                        ? "bg-emerald-950 border border-emerald-900 text-emerald-400"
                        : "bg-red-950 border border-red-900 text-red-400"
                    }`}
                  >
                    {aiConfigMessage}
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                  <button
                    onClick={handleSaveAIConfig}
                    disabled={aiConfigSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {aiConfigSaving ? "Saving…" : "Save Configuration"}
                  </button>
                  <button
                    onClick={() => loadAIConfig()}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Divider */}
          <div className="h-px bg-zinc-800" />

          {/* AI Rules Section */}
          {rulesLoading ? (
            <div className="text-xs text-zinc-500">Loading…</div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 mb-4">AI Rules</h3>
              <div className="space-y-4">
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 space-y-3">
                  <p className="text-xs font-medium text-zinc-400">Add Rule</p>
                  <textarea
                    value={rulesNewText}
                    onChange={(e) => setRulesNewText(e.target.value)}
                    placeholder="Type a rule or pick a suggestion below…"
                    rows={2}
                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 resize-none placeholder:text-zinc-600"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) { e.preventDefault(); addRule(rulesNewText); } }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addRule(rulesNewText)}
                      disabled={rulesAdding || !rulesNewText.trim()}
                      className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-100 text-xs font-medium rounded-lg transition-colors"
                    >
                      {rulesAdding ? "Adding…" : "Add Rule"}
                    </button>
                    <span className="text-xs text-zinc-600">or pick a suggestion:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {RULE_SUGGESTIONS.filter((s) => !rules.some((r) => r.text === s)).map((s) => (
                      <button
                        key={s}
                        onClick={() => addRule(s)}
                        className="text-xs text-zinc-500 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2.5 py-1 rounded-lg transition-colors text-left"
                      >
                        {s.length > 60 ? s.slice(0, 60) + "…" : s}
                      </button>
                    ))}
                  </div>
                </div>

                <section className="bg-zinc-900 rounded-lg border border-zinc-800">
                  {rules.length === 0 ? (
                    <div className="px-5 py-10 text-center space-y-1">
                      <p className="text-xs text-zinc-500">No rules yet.</p>
                      <p className="text-xs text-zinc-700">Add your first rule above or pick a suggestion.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-zinc-800">
                      {rules.map((rule) => (
                        <li key={rule.id} className="px-4 py-3">
                          {rulesEditingId === rule.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={rulesEditText}
                                onChange={(e) => setRulesEditText(e.target.value)}
                                rows={2}
                                className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-400 resize-none"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button onClick={() => saveRuleEdit(rule.id)} className="text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg transition-colors">{t("btn.save")}</button>
                                <button onClick={() => setRulesEditingId(null)} className="text-xs px-3 py-1 text-zinc-500 hover:text-zinc-300 transition-colors">{t("delete.cancel")}</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleRule(rule.id, !rule.enabled)}
                                className={`mt-0.5 w-8 h-4 rounded-full flex items-center shrink-0 transition-colors ${rule.enabled ? "bg-zinc-500 justify-end pr-0.5" : "bg-zinc-700 justify-start pl-0.5"}`}
                              >
                                <span className="w-3 h-3 bg-zinc-100 rounded-full" />
                              </button>
                              <p className={`flex-1 text-xs leading-relaxed ${rule.enabled ? "text-zinc-200" : "text-zinc-600 line-through"}`}>
                                {rule.text}
                              </p>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => { setRulesEditingId(rule.id); setRulesEditText(rule.text); }}
                                  className="text-xs text-zinc-600 hover:text-zinc-300 px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
                                >
                                  {t("ai_rules.btn_edit")}
                                </button>
                                <button
                                  onClick={() => deleteRule(rule.id)}
                                  className="text-xs text-zinc-700 hover:text-red-400 px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-zinc-800" />

          {/* Knowledge Base Section */}
          {knowledgeLoading ? (
            <div className="text-xs text-zinc-500">Loading…</div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 mb-4">Knowledge Base</h3>
              <div className="space-y-6">
                <div className="bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-700 p-8">
                  <label className="cursor-pointer block">
                    <input
                      ref={knowledgeFileInputRef}
                      type="file"
                      accept=".txt,.csv,.xlsx,.pdf"
                      onChange={handleKnowledgeUpload}
                      disabled={knowledgeUploading}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <div className="text-center">
                        <p className="text-sm font-medium text-zinc-300">
                          {knowledgeUploading ? "Uploading…" : "Click to upload or drag files"}
                        </p>
                        <p className="text-xs text-zinc-600">TXT, CSV, XLSX, or PDF (max 10MB each)</p>
                      </div>
                    </div>
                  </label>
                </div>

                {knowledgeMessage && (
                  <div
                    className={`text-xs px-4 py-3 rounded-lg border ${
                      knowledgeMessage.includes("Upload") || knowledgeMessage.includes("Uploaded")
                        ? "bg-emerald-950 border-emerald-900 text-emerald-400"
                        : "bg-red-950 border-red-900 text-red-400"
                    }`}
                  >
                    {knowledgeMessage}
                  </div>
                )}

                {knowledgeFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-zinc-500">No knowledge files uploaded yet.</p>
                    <p className="text-xs text-zinc-600 mt-1">Start by uploading a factory knowledge document.</p>
                  </div>
                ) : (
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/50">
                          <th className="px-5 py-3 font-medium">File</th>
                          <th className="px-5 py-3 font-medium">Type</th>
                          <th className="px-5 py-3 font-medium">Size</th>
                          <th className="px-5 py-3 font-medium">Uploaded By</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {knowledgeFiles.map((file, i) => (
                          <tr key={file.id} className={`${i < knowledgeFiles.length - 1 ? "border-b border-zinc-800" : ""}`}>
                            <td className="px-5 py-3">
                              <p className="text-xs font-medium text-zinc-200 truncate">{file.filename}</p>
                              <p className="text-xs text-zinc-600 mt-0.5">{file.content.length} chars</p>
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">{file.fileType.toUpperCase()}</span>
                            </td>
                            <td className="px-5 py-3 text-xs text-zinc-400">{Math.round(file.fileSize / 1024)} KB</td>
                            <td className="px-5 py-3 text-xs text-zinc-400">{file.user.name}</td>
                            <td className="px-5 py-3">
                              <button
                                onClick={() => toggleKnowledgeEnabled(file.id, file.enabled)}
                                className={`text-xs px-2 py-1 rounded border transition-colors ${
                                  file.enabled
                                    ? "bg-emerald-950 border-emerald-900 text-emerald-400"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-500"
                                }`}
                              >
                                {file.enabled ? "Enabled" : "Disabled"}
                              </button>
                            </td>
                            <td className="px-5 py-3 text-right flex items-center justify-end gap-2">
                              {file.fileType === "xlsx" && (
                                <button
                                  onClick={() => setKnowledgePreviewId(knowledgePreviewId === file.id ? null : file.id)}
                                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  {knowledgePreviewId === file.id ? "Hide" : "Preview"}
                                </button>
                              )}
                              <button
                                onClick={() => deleteKnowledgeFile(file.id)}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                              >
                                {t("knowledge.btn_delete")}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {knowledgePreviewId && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setKnowledgePreviewId(null)} />
                        <div className="fixed inset-4 z-50 flex flex-col bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
                            <h2 className="text-sm font-semibold text-zinc-100">
                              {knowledgeFiles.find((f) => f.id === knowledgePreviewId)?.filename} — Parsed Preview
                            </h2>
                            <button
                              onClick={() => setKnowledgePreviewId(null)}
                              className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex-1 overflow-auto">
                            <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono p-6">
                              {knowledgeFiles.find((f) => f.id === knowledgePreviewId)?.content}
                            </pre>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: AI Context */}
      {activeTab === "ai-context" && (
        <div className="space-y-5 max-w-5xl">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">AI Debug — Context Preview</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Type any question to preview exactly what data and instructions the AI receives before answering.
            </p>
          </div>

          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 space-y-3">
            <p className="text-xs font-medium text-zinc-400">Query</p>
            <textarea
              value={contextQuestion}
              onChange={(e) => setContextQuestion(e.target.value)}
              placeholder="Ask a question to see what context will be sent to the AI…"
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 resize-none"
            />
            <button
              onClick={fetchContext}
              disabled={!contextQuestion.trim()}
              className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-100 text-xs font-medium rounded-lg transition-colors"
            >
              Load Context
            </button>
          </div>

          {contextData && (
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
              <div className="flex border-b border-zinc-800 bg-zinc-950">
                {(["rules", "knowledge", "factory"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setContextTabView(t)}
                    className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
                      contextTabView === t
                        ? "text-zinc-100 border-b-2 border-zinc-400"
                        : "text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {t === "rules" && "Rules"}
                    {t === "knowledge" && "Relevant Knowledge"}
                    {t === "factory" && "Factory Context"}
                  </button>
                ))}
              </div>

              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {contextTabView === "rules" && (
                  <div className="space-y-2">
                    {contextData.rules && contextData.rules.length > 0 ? (
                      <ul className="space-y-1.5">
                        {contextData.rules.map((rule: any, idx: number) => (
                          <li key={rule.id} className="text-xs text-zinc-300">
                            <span className="text-zinc-600">{idx + 1}.</span> {rule.text}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-600">No active rules.</p>
                    )}
                  </div>
                )}

                {contextTabView === "knowledge" && (
                  <div className="space-y-2">
                    {contextData.knowledge ? (
                      <pre className="text-xs text-zinc-400 bg-zinc-800 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                        {contextData.knowledge}
                      </pre>
                    ) : (
                      <p className="text-xs text-zinc-600">No relevant knowledge found for this question.</p>
                    )}
                  </div>
                )}

                {contextTabView === "factory" && (
                  <div className="space-y-2">
                    <pre className="text-xs text-zinc-400 bg-zinc-800 p-3 rounded overflow-x-auto max-h-80">
                      {JSON.stringify(contextData.factoryContext, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Backups */}
      {activeTab === "backups" && (
        <div>
          <section className="bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Database Backup</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Create and manage PostgreSQL backups (.sql). Stored locally on the server.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={backupNote}
                  onChange={(e) => setBackupNote(e.target.value)}
                  placeholder="Optional note…"
                  className="w-48 bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
                />
                <button
                  onClick={handleCreateBackup}
                  disabled={backupCreating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {backupCreating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12l7 7 7-7" />
                      </svg>
                      {t("settings.btn_create_backup")}
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {backupLoading ? (
                <div className="px-6 py-8 text-center text-xs text-zinc-500">Loading backups…</div>
              ) : backups.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-xs text-zinc-500">No backups yet. Click "{t("settings.btn_create_backup")}" to generate your first backup.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/40">
                      <th className="px-6 py-3 font-medium">Filename</th>
                      <th className="px-6 py-3 font-medium">Note</th>
                      <th className="px-6 py-3 font-medium">Size</th>
                      <th className="px-6 py-3 font-medium">Created By</th>
                      <th className="px-6 py-3 font-medium">Created At</th>
                      <th className="px-6 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b, i) => (
                      <tr key={b.id} className={`hover:bg-zinc-800/40 transition-colors ${i < backups.length - 1 ? "border-b border-zinc-800" : ""}`}>
                        <td className="px-6 py-3.5 font-mono text-xs text-zinc-300">{b.filename}</td>
                        <td className="px-6 py-3.5 text-xs text-zinc-500">{b.note || <span className="text-zinc-700">—</span>}</td>
                        <td className="px-6 py-3.5 text-xs text-zinc-400">{formatBytes(b.sizeBytes)}</td>
                        <td className="px-6 py-3.5 text-xs text-zinc-400">{b.createdBy}</td>
                        <td className="px-6 py-3.5 text-xs text-zinc-500">{new Date(b.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleDownloadBackup(b)}
                              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-zinc-700 transition-colors"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              Download
                            </button>
                            <button
                              onClick={() => setRestoreConfirmId(b.id)}
                              className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded hover:bg-zinc-700 transition-colors"
                            >
                              {t("settings.btn_restore")}
                            </button>
                            <button
                              onClick={() => setDeleteBackupId(b.id)}
                              className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-zinc-700 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Modals */}
      {formMode && (
        <UserModal
          mode={formMode}
          user={editingUser || undefined}
          form={userForm}
          onChange={setUserField}
          onSave={handleSaveUser}
          onClose={() => setFormMode(null)}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          password={resetPassword}
          onPasswordChange={setResetPassword}
          onReset={handleResetPassword}
          onClose={() => {
            setResetPasswordUser(null);
            setResetPassword("");
          }}
        />
      )}

      {deactivateUserId && (
        <DeleteConfirm
          title={users.find((u) => u.id === deactivateUserId)?.status === "ACTIVE" ? t("settings.btn_deactivate") : t("settings.btn_activate")}
          itemName={users.find((u) => u.id === deactivateUserId)?.name || "User"}
          onConfirm={handleToggleUserStatus}
          onClose={() => setDeactivateUserId(null)}
        />
      )}

      {restoreConfirmId && (
        <ModalShell
          title="Restore Database"
          subtitle="This will overwrite all current data with the selected backup. This action cannot be undone."
          onClose={() => setRestoreConfirmId(null)}
          footer={
            <>
              <button onClick={() => setRestoreConfirmId(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
              <button
                onClick={handleRestoreBackup}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Yes, Restore
              </button>
            </>
          }
        >
          <div className="p-4 bg-red-950/30 border border-red-900 rounded-lg">
            <p className="text-xs text-red-300 leading-relaxed">
              <span className="font-semibold">Warning:</span> All materials, products, orders, suppliers, users, and audit logs will be replaced with the data from the selected backup. The application will need to be reloaded after the restore completes.
            </p>
          </div>
        </ModalShell>
      )}

      {deleteBackupId && (
        <DeleteConfirm
          title={t("settings.btn_delete_backup")}
          itemName={backups.find((b) => b.id === deleteBackupId)?.filename || "backup"}
          onConfirm={handleDeleteBackup}
          onClose={() => setDeleteBackupId(null)}
        />
      )}

      <ToastList toasts={toasts} />
    </div>
  );
}
