"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../lib/auth-helpers";
import { useToast } from "../../components/Toast";
import { changePassword } from "./actions";
import type { User } from "@prisma/client";

export default function ProfilePage() {
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);
        setLoading(false);
      } catch (error) {
        showToast("Failed to load user profile", "error");
        setLoading(false);
      }
    })();
  }, [router, showToast]);

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("All password fields are required", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    try {
      setChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      showToast("Password changed successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to change password", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return <div className="px-8 py-6">Loading...</div>;
  }

  if (!user) {
    return <div className="px-8 py-6">User not found</div>;
  }

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="px-8 py-6 max-w-2xl">
      {/* Profile Header */}
      <div className="space-y-6">
        {/* User Card */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-2xl font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-zinc-100 mb-1">{user.name}</h1>
              <p className="text-sm text-zinc-500 mb-3">{user.email}</p>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  user.status === "ACTIVE"
                    ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                    : "bg-red-900/50 text-red-300 border border-red-800"
                }`}>
                  {user.status === "ACTIVE" ? "Active" : "Inactive"}
                </span>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-900/50 text-blue-300 border border-blue-800">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* User Info Grid */}
          <div className="mt-8 pt-8 border-t border-zinc-800 grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-medium">Email</p>
              <p className="text-sm text-zinc-300">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-medium">Role</p>
              <p className="text-sm text-zinc-300">{user.role}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-medium">Account Created</p>
              <p className="text-sm text-zinc-300">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-medium">Last Login</p>
              <p className="text-sm text-zinc-300">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
              </p>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-6">Change Password</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={changingPassword}
                placeholder="Enter your current password"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={changingPassword}
                placeholder="Enter a new password (min. 6 characters)"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={changingPassword}
                placeholder="Confirm your new password"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="w-full mt-6 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {changingPassword ? "Changing Password..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
