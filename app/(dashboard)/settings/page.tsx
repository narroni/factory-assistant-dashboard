"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCurrentUser } from "../../lib/auth-helpers";
import { useToast, ToastList } from "../../components/Toast";
import { ModalShell } from "../../components/ModalShell";
import { DeleteConfirm } from "../../components/DeleteConfirm";
import { getUsers, createUser, updateUser, deactivateUser, activateUser, resetUserPassword, type UserInfo } from "./actions";
import type { Metadata } from "next";
import type { UserRole } from "@prisma/client";

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
  const { toasts, showToast } = useToast();

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
        const data = await getUsers();
        setUsers(data);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
    <div className="px-8 py-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Configure your dashboard and manage users</p>
      </div>

      {/* Main Content Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column: Company & AI Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Factory Identity */}
          <Section title="Company Settings">
            <div className="space-y-4">
              <Field label="Company Name" value="Narko Industries d.o.o." />
              <Field label="Factory Name" value="Production Facility — Line A/B" />
              <Field label="Factory Code" value="FAC-001" hint="Internal factory identifier used in reports and labels." />
              <Field label="Location" value="Zagreb, Croatia" />
            </div>
          </Section>

          {/* AI Assistant */}
          <Section title="AI Assistant">
            <div className="space-y-4">
              <Field
                label="Assistant Name"
                value="Factory Assistant"
                hint="The name displayed in the dashboard header."
              />
              <SelectField
                label="AI Model"
                value="claude-sonnet-4-6"
                options={["claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5"]}
                hint="Model used for AI-generated insights."
              />
              <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-zinc-200">AI Insights Panel</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Show AI recommendations on Overview.</p>
                </div>
                <div className="w-10 h-5 bg-blue-600 rounded-full flex items-center justify-end pr-0.5 cursor-pointer shrink-0">
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Right Column: Inventory & Alerts + Audit & Compliance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inventory & Alerts */}
          <Section title="Inventory & Alerts">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Field
                  label="Low Stock (%)"
                  value="25"
                  type="number"
                  hint="Alert when stock below minimum."
                />
                <Field
                  label="Critical Stock (%)"
                  value="10"
                  type="number"
                  hint="Trigger critical alert."
                />
                <Field
                  label="Lead Buffer (days)"
                  value="7"
                  type="number"
                  hint="Extra buffer days for lead time."
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-zinc-200">Email Notifications</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Send low-stock alerts to admin email.</p>
                </div>
                <div className="w-10 h-5 bg-blue-600 rounded-full flex items-center justify-end pr-0.5 cursor-pointer shrink-0">
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </Section>

          {/* Audit & Compliance */}
          {isAdmin && (
            <Link href="/settings/audit-logs">
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 hover:border-zinc-700 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">Audit Logs</h3>
                    <p className="text-xs text-zinc-500 mt-1">View create, update, delete, and status change history.</p>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* User Management - Full Width */}
      {isAdmin && (
        <div className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">User Management</h2>
            <p className="text-xs text-zinc-500 mt-1">Add, edit, and manage user accounts and permissions</p>
          </div>
          {loading ? (
            <div className="text-xs text-zinc-500">Loading users...</div>
          ) : (
            <>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
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
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-xs text-zinc-500">No users found</td>
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

      <ToastList toasts={toasts} />
    </div>
  );
}
