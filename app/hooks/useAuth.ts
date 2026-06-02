"use client";

import { useEffect, useState } from "react";
import type { SessionUser } from "../lib/session";
import type { Permission } from "../lib/permissions";
import { hasPermission } from "../lib/permissions";

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current user from API
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return { user, loading };
}

export function usePermission(permission: Permission) {
  const { user } = useAuth();
  return user ? hasPermission(user.role, permission) : false;
}

export function useCanDelete() {
  const { user } = useAuth();
  return user?.role === "ADMIN";
}

export function useCanEdit() {
  const { user } = useAuth();
  return user?.role === "ADMIN" || user?.role === "WORKER";
}

export function useCanCreate() {
  const { user } = useAuth();
  return user?.role === "ADMIN" || user?.role === "WORKER";
}
