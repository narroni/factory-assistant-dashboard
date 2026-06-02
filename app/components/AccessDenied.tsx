"use client";

// Shown when a non-admin user reaches an admin-only page.
// Avoids router.replace("/") which causes an unnecessary navigation event.
export default function AccessDenied({ message = "Admin access required to view this page." }: { message?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-zinc-400">Access Denied</p>
        <p className="text-xs text-zinc-600">{message}</p>
      </div>
    </div>
  );
}
