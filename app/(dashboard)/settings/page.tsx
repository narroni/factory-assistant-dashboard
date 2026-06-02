"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getCurrentUser } from "../../lib/auth-helpers";
import { useToast, ToastList } from "../../components/Toast";
import { ModalShell } from "../../components/ModalShell";
import { DeleteConfirm } from "../../components/DeleteConfirm";
import { getUsers, createUser, updateUser, deactivateUser, activateUser, resetUserPassword, setForcePasswordChange, type UserInfo } from "./actions";
import type { UserRole } from "@prisma/client";

type BackupRecord = {
  id: string;
  filename: string;
  sizeBytes: number;
  createdBy: string;
  note: string | null;
  createdAt: string;
};

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

function SelectField({ label, value, options, hint }: { label: string; value: string; options: string[]; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      <select
        defaultValue={value}
        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

type UserFormState = {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
};

const ROLES: UserRole[] = ["ADMIN", "WORKER", "VIEWER"];

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
  const isValid = form.name.trim() && form.email.trim() && (mode === "edit" || form.password?.trim());

  return (
    <ModalShell
      title={mode === "add" ? "Add User" : "Edit User"}
      subtitle={mode === "add" ? "Create a new user account." : `Update ${user?.name}'s information.`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
          <button
            onClick={onSave}
            disabled={!isValid}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {mode === "add" ? "Add User" : "Save Changes"}
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
  const isValid = password.trim().length > 0;

  return (
    <ModalShell
      title="Reset Password"
      subtitle={`Set a new password for ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
          <button
            onClick={onReset}
            disabled={!isValid}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            Reset Password
          </button>
        </>
      }
    >
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">New Password</label>
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

export default function SettingsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [form, setForm] = useState<UserFormState>({ name: "", email: "", role: "VIEWER" });
  const [resetPasswordUser, setResetPasswordUser] = useState<UserInfo | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);
  // Backup state
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [backupNote, setBackupNote] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupCreating, setBackupCreating] = useState(false);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [deleteBackupId, setDeleteBackupId] = useState<string | null>(null);
  const { toasts, showToast } = useToast();

  const loadBackups = useCallback(async () => {
    try {
      setBackupLoading(true);
      const res = await fetch("/api/backup");
      if (res.ok) setBackups(await res.json());
    } catch {
      // silently fail — backups section just stays empty
    } finally {
      setBackupLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (user?.role !== "ADMIN") {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);
        const [userData] = await Promise.all([getUsers(), loadBackups()]);
        setUsers(userData);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadBackups]);

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
      showToast("Backup created successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Backup failed", "error");
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
    } catch (err) {
      showToast("Failed to download backup", "error");
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
      showToast("Database restored successfully. Reload the page to see changes.");
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
      showToast("Backup deleted.");
      setDeleteBackupId(null);
    } catch (err) {
      showToast("Failed to delete backup", "error");
      setDeleteBackupId(null);
    }
  }

  function setField(field: keyof UserFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveUser() {
    try {
      if (formMode === "add") {
        await createUser({ ...form, password: form.password || "" });
        const data = await getUsers();
        setUsers(data);
        showToast("User created successfully.");
      } else if (formMode === "edit" && editingUser) {
        await updateUser(editingUser.id, form);
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
      showToast("Password reset successfully.");
      setResetPasswordUser(null);
      setResetPassword("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reset password", "error");
    }
  }

  async function handleToggleStatus() {
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

  return (
    <div className="px-6 py-5">

      {/* Main Content Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Left Column: Company settings */}
        <div className="lg:col-span-1 space-y-4">
          <Section title="Company Settings">
            <div className="space-y-3">
              <Field label="Company Name" value="Narko Industries d.o.o." />
              <Field label="Factory Name" value="Production Facility — Line A/B" />
              <Field label="Factory Code" value="FAC-001" hint="Internal factory identifier used in reports and labels." />
              <Field label="Location" value="Zagreb, Croatia" />
            </div>
          </Section>

          {/* Inventory & Alerts */}
          <Section title="Inventory Thresholds">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Low Stock (%)" value="25" type="number" />
              <Field label="Critical (%)" value="10" type="number" />
              <Field label="Buffer (days)" value="7" type="number" />
            </div>
          </Section>
        </div>

        {/* Right Column: Admin links */}
        <div className="lg:col-span-2 space-y-4">
          {isAdmin && (
            <div className="grid grid-cols-2 gap-3">
              <Link href="/settings/audit-logs">
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-zinc-700 transition-colors cursor-pointer h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">Audit Logs</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Create, update, delete history.</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </Link>
              <Link href="/settings/ai-config">
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-zinc-700 transition-colors cursor-pointer h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">AI Configuration</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Model, Ollama, and assistant settings.</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </Link>
              <Link href="/settings/ai-knowledge">
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-zinc-700 transition-colors cursor-pointer h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">Knowledge Base</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Factory context for the AI assistant.</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </Link>
              <Link href="/settings/ai-rules">
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-zinc-700 transition-colors cursor-pointer h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">AI Rules</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Constraints and guidelines for AI behavior.</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </Link>
              <Link href="/settings/ai-context">
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-zinc-700 transition-colors cursor-pointer h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">AI Context Viewer</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Preview rules and knowledge sent to AI.</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Database Backup — full width, admin only */}
      {isAdmin && (
        <div className="mt-4">
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
                      Create Backup
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Backup history table */}
            <div className="overflow-x-auto">
              {backupLoading ? (
                <div className="px-6 py-8 text-center text-xs text-zinc-500">Loading backups…</div>
              ) : backups.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-xs text-zinc-500">No backups yet. Click &quot;Create Backup&quot; to generate your first backup.</p>
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
                              Restore
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

      {/* User Management - Full Width */}
      {isAdmin && (
        <div className="mt-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-zinc-100">User Management</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Add, edit, and manage user accounts and permissions</p>
          </div>
          {loading ? (
            <div className="text-xs text-zinc-500">Loading users...</div>
          ) : (
            <>
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-100">Users</h3>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setForm({ name: "", email: "", role: "VIEWER", password: "" });
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
                              {u.status === "ACTIVE" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500">{u.lastLoginAt || "Never"}</td>
                          <td className="px-4 py-3 text-xs text-zinc-500">{u.createdAt}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setForm({ name: u.name, email: u.email, role: u.role });
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
                                  } catch (err) {
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
                                {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
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

      {/* Modals */}
      {formMode && (
        <UserModal
          mode={formMode}
          user={editingUser || undefined}
          form={form}
          onChange={setField}
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
          title={users.find((u) => u.id === deactivateUserId)?.status === "ACTIVE" ? "Deactivate User" : "Activate User"}
          itemName={users.find((u) => u.id === deactivateUserId)?.name || "User"}
          onConfirm={handleToggleStatus}
          onClose={() => setDeactivateUserId(null)}
        />
      )}

      {/* Restore confirmation modal */}
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

      {/* Delete backup confirmation */}
      {deleteBackupId && (
        <DeleteConfirm
          title="Delete Backup"
          itemName={backups.find((b) => b.id === deleteBackupId)?.filename || "backup"}
          onConfirm={handleDeleteBackup}
          onClose={() => setDeleteBackupId(null)}
        />
      )}

      <ToastList toasts={toasts} />
    </div>
  );
}
