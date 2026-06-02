"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../lib/auth-helpers";
import AccessDenied from "../../components/AccessDenied";

type ActionRequest = {
  id: string;
  createdByUser: { name: string };
  actionType: string;
  payload: Record<string, unknown>;
  reasoning: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED";
  approvedBy?: string;
  approvedAt?: string;
  executedAction?: {
    id: string;
    outputType: string;
    outputFile: string;
    createdAt: string;
  };
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  create_order: "Create Order",
  create_purchase_request: "Purchase Request",
  update_stock: "Update Stock",
  assign_supplier: "Assign Supplier",
  generate_report: "Generate Report",
  export_data: "Export Data",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-amber-950/30", text: "text-amber-400", label: "Pending" },
  APPROVED: { bg: "bg-blue-950/30", text: "text-blue-400", label: "Approved" },
  REJECTED: { bg: "bg-red-950/30", text: "text-red-400", label: "Rejected" },
  EXECUTED: { bg: "bg-emerald-950/30", text: "text-emerald-400", label: "Executed" },
};

const PAGE_SIZE = 15;

export default function AIRequestsPage() {
  const [requests, setRequests] = useState<ActionRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"" | "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED">("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [authState, setAuthState] = useState<"checking" | "admin" | "denied" | "unauth">("checking");
  const router = useRouter();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      const data = await (await fetch(`/api/ai-requests?${qs}`)).json();
      const all: ActionRequest[] = Array.isArray(data) ? data : [];
      setTotal(all.length);
      setRequests(all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace("/login"); return; }
      if (u.role !== "ADMIN") { setAuthState("denied"); return; }
      setAuthState("admin");
      loadRequests();
    });
  }, [router, loadRequests]);

  if (authState === "checking") return null;
  if (authState === "denied") return <AccessDenied />;

  async function approve(id: string) {
    setApproving(id);
    try {
      await fetch(`/api/ai-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      setRequests((prev) => prev.map((r) =>
        r.id === id ? { ...r, status: "APPROVED" as const } : r
      ));
    } finally {
      setApproving(null);
    }
  }

  async function reject(id: string) {
    setApproving(id);
    try {
      await fetch(`/api/ai-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      setRequests((prev) => prev.map((r) =>
        r.id === id ? { ...r, status: "REJECTED" as const } : r
      ));
    } finally {
      setApproving(null);
    }
  }

  async function execute(id: string) {
    setApproving(id);
    try {
      const res = await fetch(`/api/ai-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute" }),
      });
      const updated = await res.json();
      setRequests((prev) => prev.map((r) =>
        r.id === id
          ? { ...r, status: "EXECUTED" as const, executedAction: updated.executedAction }
          : r
      ));
    } finally {
      setApproving(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">AI Action Requests</h1>
          <p className="text-xs text-zinc-500 mt-1">Review and approve AI-proposed actions from the Assistant.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-zinc-600">Filter:</span>
        {(["", "PENDING", "APPROVED", "REJECTED", "EXECUTED"] as const).map((status) => (
          <button
            key={status || "all"}
            onClick={() => { setStatusFilter(status); setPage(0); }}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${
              statusFilter === status
                ? "bg-blue-600 border-blue-600 text-white font-medium"
                : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {status ? STATUS_COLORS[status].label : "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-xs text-zinc-500">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            {statusFilter ? "No requests with this status." : "No action requests yet."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/50">
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Requested By</th>
                  <th className="px-5 py-3 font-medium">Reasoning</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, i) => {
                  const colors = STATUS_COLORS[req.status];
                  const isExpanded = expanded === req.id;
                  return (
                    <Fragment key={req.id}>
                      <tr
                        onClick={() => setExpanded(isExpanded ? null : req.id)}
                        className={`cursor-pointer hover:bg-zinc-800/40 transition-colors ${
                          i < requests.length - 1 && !isExpanded ? "border-b border-zinc-800" : ""
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-medium text-blue-400">
                            {ACTION_LABELS[req.actionType] ?? req.actionType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-zinc-300">{req.createdByUser.name}</td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs text-zinc-400 max-w-xs truncate">{req.reasoning}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border ${colors.bg} ${colors.text}`}>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                req.status === "PENDING" ? "bg-amber-400" :
                                req.status === "APPROVED" ? "bg-blue-400" :
                                req.status === "REJECTED" ? "bg-red-400" :
                                "bg-emerald-400"
                              }`}
                            />
                            {req.status === "PENDING" ? "Waiting for approval" : colors.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-zinc-500">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : req.id); }}
                            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                          >
                            {isExpanded ? "Hide" : "Details"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-zinc-800 bg-zinc-950/40">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs text-zinc-600 mb-1">Payload</p>
                                <pre className="text-xs text-zinc-400 bg-zinc-900 rounded p-2 overflow-x-auto">
                                  {JSON.stringify(req.payload, null, 2)}
                                </pre>
                              </div>
                              {req.status === "PENDING" && (
                                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                                  <button
                                    onClick={() => approve(req.id)}
                                    disabled={approving === req.id}
                                    className="flex-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-900/50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {approving === req.id ? "…" : "✓ Approve"}
                                  </button>
                                  <button
                                    onClick={() => reject(req.id)}
                                    disabled={approving === req.id}
                                    className="flex-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {approving === req.id ? "…" : "✕ Reject"}
                                  </button>
                                </div>
                              )}
                              {req.status === "APPROVED" && (
                                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                                  <button
                                    onClick={() => execute(req.id)}
                                    disabled={approving === req.id}
                                    className="flex-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-950/30 hover:bg-blue-950/50 border border-blue-900/50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {approving === req.id ? "…" : "→ Execute"}
                                  </button>
                                  <button
                                    onClick={() => reject(req.id)}
                                    disabled={approving === req.id}
                                    className="flex-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {approving === req.id ? "…" : "✕ Reject"}
                                  </button>
                                </div>
                              )}
                              {req.status === "EXECUTED" && req.executedAction && (
                                <div className="pt-2 border-t border-zinc-800 space-y-2">
                                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3">
                                    <p className="text-xs font-medium text-emerald-400 mb-2">Output Generated</p>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-xs text-zinc-300">{req.executedAction.outputFile}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">Type: {req.executedAction.outputType}</p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          const url = `/api/outputs/${req.executedAction!.id}/download`;
                                          const a = document.createElement("a");
                                          a.href = url;
                                          a.download = req.executedAction!.outputFile;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                        }}
                                        className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-900/50 px-3 py-1.5 rounded-lg transition-colors"
                                      >
                                        Download
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 px-2 py-1 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-zinc-600">{page + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 px-2 py-1 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
