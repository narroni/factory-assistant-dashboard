"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "../../hooks/useTranslation";
import { useToast, ToastList } from "../../components/Toast";
import { ModalShell } from "../../components/ModalShell";

<<<<<<< HEAD
export const dynamic = 'force-dynamic';

=======
>>>>>>> e558fa8111053022657c0be3c3c0820c60cb46be
// ── Types ─────────────────────────────────────────────────────────────────────

type RequestType = "CREATE_PRODUCT" | "CREATE_MATERIAL" | "CREATE_ORDER";
type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type WorkerRequest = {
  id: string;
  type: RequestType;
  status: RequestStatus;
  payload: Record<string, unknown>;
  requestedById: string;
  requestedBy: { name: string; email: string };
  requestedAt: string;
  reviewedById: string | null;
  reviewedBy: { name: string } | null;
  reviewedAt: string | null;
  reviewerComment: string | null;
};

const getTypeLabels = (t: (key: string) => string): Record<RequestType, string> => ({
  CREATE_PRODUCT: t("request.type_create_product"),
  CREATE_MATERIAL: t("request.type_create_material"),
  CREATE_ORDER: t("request.type_create_order"),
});

function formatFieldLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useTranslation();
  const styles: Record<RequestStatus, { bg: string; text: string; dot: string; label: string }> = {
    PENDING: { bg: "bg-amber-950/30", text: "text-amber-400", dot: "bg-amber-400", label: t("request.status_pending") },
    APPROVED: { bg: "bg-emerald-950/30", text: "text-emerald-400", dot: "bg-emerald-400", label: t("request.status_approved") },
    REJECTED: { bg: "bg-red-950/30", text: "text-red-400", dot: "bg-red-400", label: t("request.status_rejected") },
  };
  const s = styles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border border-transparent ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ── Details modal ─────────────────────────────────────────────────────────────

function DetailsModal({ request, onClose }: { request: WorkerRequest; onClose: () => void }) {
  const { t } = useTranslation();
  const typeLabels = getTypeLabels(t);
  const entries = Object.entries(request.payload ?? {});
  return (
    <ModalShell
      title={typeLabels[request.type]}
      subtitle={`${t("request.submitted_by")} ${request.requestedBy.name}`}
      onClose={onClose}
      footer={
        <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          {t("request.close")}
        </button>
      }
    >
      <div className="space-y-2.5">
        {entries.length === 0 ? (
          <p className="text-xs text-zinc-500">{t("request.no_details")}</p>
        ) : (
          entries.map(([key, value]) => (
            <div key={key} className="flex items-start justify-between gap-4 py-1.5 border-b border-zinc-800 last:border-b-0">
              <span className="text-xs text-zinc-500 shrink-0">{formatFieldLabel(key)}</span>
              <span className="text-xs text-zinc-200 text-right break-all">
                {value === null || value === undefined || value === "" ? "—" : String(value)}
              </span>
            </div>
          ))
        )}
      </div>

      {request.status !== "PENDING" && (
        <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2.5">
          {request.status === "APPROVED" && (
            <>
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-zinc-500 shrink-0">{t("request.approved_by")}</span>
                <span className="text-xs text-zinc-200 text-right">{request.reviewedBy?.name ?? "—"}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-zinc-500 shrink-0">{t("request.approved_at")}</span>
                <span className="text-xs text-zinc-200 text-right">{request.reviewedAt ? formatDateTime(request.reviewedAt) : "—"}</span>
              </div>
            </>
          )}
          {request.status === "REJECTED" && (
            <>
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-zinc-500 shrink-0">{t("request.rejected_by")}</span>
                <span className="text-xs text-zinc-200 text-right">{request.reviewedBy?.name ?? "—"}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-zinc-500 shrink-0">{t("request.rejected_at")}</span>
                <span className="text-xs text-zinc-200 text-right">{request.reviewedAt ? formatDateTime(request.reviewedAt) : "—"}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-zinc-500 shrink-0">{t("request.reason")}</span>
                <span className="text-xs text-zinc-200 text-right break-all">{request.reviewerComment || "—"}</span>
              </div>
            </>
          )}
        </div>
      )}
    </ModalShell>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;
type Filter = (typeof FILTERS)[number];

export default function RequestsInboxPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { toasts, showToast } = useToast();
  const typeLabels = getTypeLabels(t);

  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [detailsRequest, setDetailsRequest] = useState<WorkerRequest | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  // Auth check on load
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "WORKER") { router.replace("/my-requests"); return; }
    if (user.role === "VIEWER") { router.replace("/"); return; }
  }, [authLoading, user, router]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {
      showToast(t("request.load_failed"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    if (!authLoading && user && (user.role === "SUPER_ADMIN" || user.role === "MANAGER")) {
      loadRequests();
    }
  }, [authLoading, user, loadRequests]);

  async function handleApprove(req: WorkerRequest) {
    setActingId(req.id);
    try {
      const res = await fetch(`/api/requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      if (!res.ok) throw new Error("Approve failed");
      showToast(t("request.approve_success"), "success");
      await loadRequests();
    } catch {
      showToast(t("request.approve_error"), "error");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(req: WorkerRequest) {
    setActingId(req.id);
    try {
      const res = await fetch(`/api/requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", comment: rejectComment }),
      });
      if (!res.ok) throw new Error("Reject failed");
      showToast(t("request.reject_success"), "success");
      setRejectingId(null);
      setRejectComment("");
      await loadRequests();
    } catch {
      showToast(t("request.reject_error"), "error");
    } finally {
      setActingId(null);
    }
  }

  if (authLoading || !user || user.role === "WORKER" || user.role === "VIEWER") {
    return <div className="px-8 py-6 text-xs text-zinc-500">{t("request.loading")}</div>;
  }

  const filtered = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <ToastList toasts={toasts} />

      <div>
        <h1 className="text-xl font-semibold text-zinc-100">{t("request.inbox_title")}</h1>
        <p className="text-xs text-zinc-500 mt-1">{t("request.inbox_subtitle")}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${
              filter === f
                ? "bg-blue-600 border-blue-600 text-white font-medium"
                : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {f === "ALL" ? t("filter.all") : f === "PENDING" ? t("request.status_pending") : f === "APPROVED" ? t("request.status_approved") : t("request.status_rejected")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">{t("request.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">{t("request.empty_inbox")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/50">
                  <th className="px-5 py-3 font-medium">{t("request.type_header")}</th>
                  <th className="px-5 py-3 font-medium">{t("request.submitted_by")}</th>
                  <th className="px-5 py-3 font-medium">{t("request.submitted_at")}</th>
                  <th className="px-5 py-3 font-medium">{t("table.status")}</th>
                  <th className="px-5 py-3 font-medium">{t("request.details_header")}</th>
                  <th className="px-5 py-3 font-medium text-right">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req, i) => (
                  <tr key={req.id} className={`hover:bg-zinc-800/40 transition-colors ${i < filtered.length - 1 ? "border-b border-zinc-800" : ""}`}>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-blue-400">{typeLabels[req.type]}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-zinc-200">{req.requestedBy.name}</p>
                      <p className="text-xs text-zinc-600">{req.requestedBy.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-500">{formatDateTime(req.requestedAt)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={req.status} /></td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setDetailsRequest(req)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-md transition-colors"
                      >
                        {t("request.view_details")}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      {req.status === "PENDING" && (
                        rejectingId === req.id ? (
                          <div className="flex items-center gap-2 justify-end">
                            <input
                              type="text"
                              value={rejectComment}
                              onChange={(e) => setRejectComment(e.target.value)}
                              placeholder={t("request.comment_placeholder")}
                              className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-red-500 transition-colors w-40"
                            />
                            <button
                              onClick={() => handleReject(req)}
                              disabled={actingId === req.id}
                              className="text-xs font-medium text-white bg-red-600 hover:bg-red-500 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {actingId === req.id ? "…" : t("request.confirm_reject")}
                            </button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectComment(""); }}
                              className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-1.5 transition-colors"
                            >
                              {t("btn.cancel")}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={actingId === req.id}
                              className="text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {actingId === req.id ? "…" : t("request.btn_approve")}
                            </button>
                            <button
                              onClick={() => setRejectingId(req.id)}
                              disabled={actingId === req.id}
                              className="text-xs font-medium text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {t("request.btn_reject")}
                            </button>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailsRequest && (
        <DetailsModal request={detailsRequest} onClose={() => setDetailsRequest(null)} />
      )}
    </div>
  );
}
