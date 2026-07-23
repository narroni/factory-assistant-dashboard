"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "../../hooks/useTranslation";
import { useToast, ToastList } from "../../components/Toast";

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
  requestedAt: string;
  reviewedBy: { name: string } | null;
  reviewerComment: string | null;
};

const getTypeLabels = (t: (key: string) => string): Record<RequestType, string> => ({
  CREATE_PRODUCT: t("request.type_create_product"),
  CREATE_MATERIAL: t("request.type_create_material"),
  CREATE_ORDER: t("request.type_create_order"),
});

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

// ── Page ──────────────────────────────────────────────────────────────────────

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;
type Filter = (typeof FILTERS)[number];

export default function MyRequestsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { toasts, showToast } = useToast();
  const typeLabels = getTypeLabels(t);

  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");

  // Auth check on load — any logged-in role can view, but only their own requests
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
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
    if (!authLoading && user) loadRequests();
  }, [authLoading, user, loadRequests]);

  if (authLoading || !user) {
    return <div className="px-8 py-6 text-xs text-zinc-500">{t("request.loading")}</div>;
  }

  const filtered = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <ToastList toasts={toasts} />

      <div>
        <h1 className="text-xl font-semibold text-zinc-100">{t("nav.my_requests")}</h1>
        <p className="text-xs text-zinc-500 mt-1">{t("request.my_requests_subtitle")}</p>
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
          <div className="px-6 py-12 text-center text-sm text-zinc-500">{t("request.empty_mine")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/50">
                  <th className="px-5 py-3 font-medium">{t("request.type_header")}</th>
                  <th className="px-5 py-3 font-medium">{t("request.submitted_at")}</th>
                  <th className="px-5 py-3 font-medium">{t("table.status")}</th>
                  <th className="px-5 py-3 font-medium">{t("request.reviewer")}</th>
                  <th className="px-5 py-3 font-medium">{t("request.comment")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req, i) => (
                  <tr key={req.id} className={`hover:bg-zinc-800/40 transition-colors ${i < filtered.length - 1 ? "border-b border-zinc-800" : ""}`}>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-blue-400">{typeLabels[req.type]}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-500">{formatDateTime(req.requestedAt)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={req.status} /></td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400">{req.reviewedBy?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400">
                      {req.status === "REJECTED" ? (req.reviewerComment || "—") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
