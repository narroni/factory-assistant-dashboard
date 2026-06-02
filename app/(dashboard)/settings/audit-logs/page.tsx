"use client";

import { useState, useEffect } from "react";
import { getCurrentUser } from "../../../lib/auth-helpers";
import { getAuditLogs } from "../../../lib/audit";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import AccessDenied from "../../../components/AccessDenied";

type AuditLog = {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  userId: string | null;
  before: string | null;
  after: string | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export default function AuditLogsPage() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [authState, setAuthState] = useState<"checking" | "ok" | "denied">("checking");
  const router = useRouter();

  const pageSize = 20;

  // Check permission and load logs
  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace("/login"); return; }
        if (user.role !== "ADMIN") { setAuthState("denied"); setLoading(false); return; }
        setUserRole(user.role);
        setAuthState("ok");
        fetchLogs(1);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (authState === "checking") return null;
  if (authState === "denied") return <AccessDenied />;

  async function fetchLogs(pageNum: number) {
    const { logs: newLogs, total: newTotal } = await getAuditLogs({
      entity: entityFilter || undefined,
      action: actionFilter || undefined,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });

    setLogs(newLogs as AuditLog[]);
    setTotal(newTotal);
    setPage(pageNum);
  }

  async function handleFilterChange() {
    await fetchLogs(1);
  }

  if (loading) {
    return <div className="px-8 py-6 text-sm text-zinc-400">Loading...</div>;
  }

  if (userRole !== "ADMIN") {
    return (
      <div className="px-8 py-6">
        <div className="bg-red-900/50 border border-red-800 text-red-300 px-6 py-4 rounded-lg">
          <p className="text-sm font-medium">Access Denied</p>
          <p className="text-xs text-red-400 mt-1">Only administrators can view audit logs.</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Audit Logs</h1>
        <p className="text-sm text-zinc-400">Track all system changes and user actions</p>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-100">Filters</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Entity</label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">All Entities</option>
              <option value="Material">Materials</option>
              <option value="Product">Products</option>
              <option value="Order">Orders</option>
              <option value="Supplier">Suppliers</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-2">
            <p className="text-xs text-zinc-500 mt-8">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} logs
            </p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/50">
                <th className="px-6 py-3 font-medium">Date & Time</th>
                <th className="px-6 py-3 font-medium">Entity</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={log.id} className={`hover:bg-zinc-800/40 transition-colors ${i < logs.length - 1 ? "border-b border-zinc-800" : ""}`}>
                    <td className="px-6 py-3 text-xs text-zinc-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-medium bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                        {log.entity}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          log.action === "CREATE"
                            ? "bg-emerald-900/50 text-emerald-300"
                            : log.action === "UPDATE"
                            ? "bg-blue-900/50 text-blue-300"
                            : "bg-red-900/50 text-red-300"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-zinc-400">
                      {log.user?.name || "System"}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowModal(true);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        View Changes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page === 1}
              className="text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page === totalPages}
              className="text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">
                {selectedLog.entity} {selectedLog.action}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Entity ID</p>
                  <p className="text-sm font-mono text-zinc-300">{selectedLog.entityId}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">User</p>
                  <p className="text-sm text-zinc-300">
                    {selectedLog.user?.name} ({selectedLog.user?.email || "System"})
                  </p>
                </div>
              </div>

              {selectedLog.before && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Before</p>
                  <pre className="bg-zinc-800 rounded-lg p-4 text-xs text-zinc-300 overflow-auto max-h-48">
                    {JSON.stringify(JSON.parse(selectedLog.before), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">After</p>
                  <pre className="bg-zinc-800 rounded-lg p-4 text-xs text-zinc-300 overflow-auto max-h-48">
                    {JSON.stringify(JSON.parse(selectedLog.after), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
