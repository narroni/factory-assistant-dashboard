"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "../components/ModalShell";
import { useToast, ToastList } from "../components/Toast";
import { getAllReports, type Report } from "./actions";

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const content = [[...headers], ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printReport(title: string, headers: string[], rows: string[][]) {
  const ths  = headers.map((h) => `<th>${h}</th>`).join("");
  const trs  = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  const html = `<!DOCTYPE html><html><head><title>${title}</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:32px}
    h1{font-size:18px;font-weight:700;margin-bottom:4px}
    .meta{color:#666;font-size:11px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse}
    th{background:#f3f4f6;text-align:left;padding:8px 10px;border-bottom:2px solid #d1d5db;font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}
    td{padding:7px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}
    tr:last-child td{border-bottom:none}
    @media print{body{padding:0}}
  </style></head><body>
    <h1>${title}</h1>
    <p class="meta">Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} &nbsp;|&nbsp; Narko Industries d.o.o.</p>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

// ── Recent activity (static) ──────────────────────────────────────────────────

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({ report, onClose }: { report: Report; onClose: () => void }) {
  return (
    <ModalShell
      title={report.title}
      subtitle={`Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} · Narko Industries d.o.o.`}
      onClose={onClose}
      maxWidth="max-w-5xl"
      footer={
        <button onClick={onClose} className="px-5 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          Close Preview
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
              {report.headers.map((h) => (
                <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, i) => (
              <tr key={i} className={`${i < report.rows.length - 1 ? "border-b border-zinc-800" : ""} hover:bg-zinc-800/40 transition-colors`}>
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-2.5 text-xs whitespace-nowrap ${j === 0 ? "text-zinc-200 font-medium" : "text-zinc-400"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-600 mt-4">
        {report.rows.length} rows · Report data as of {report.lastGenerated}
      </p>
    </ModalShell>
  );
}

// ── Recent activity (static) ──────────────────────────────────────────────────

const RECENT_ACTIVITY = [
  { report: "Inventory Report",   date: "2026-05-29 06:00", user: "System (auto)", size: "1.2 MB" },
  { report: "Orders Report",      date: "2026-05-29 06:00", user: "System (auto)", size: "560 KB" },
  { report: "Products Report",    date: "2026-05-28 09:14", user: "Narko P.",       size: "840 KB" },
  { report: "Inventory Report",   date: "2026-05-28 06:00", user: "System (auto)", size: "1.1 MB" },
  { report: "Suppliers Report",   date: "2026-05-27 08:30", user: "Narko P.",       size: "320 KB" },
  { report: "Production Capacity","date": "2026-05-27 06:00", user: "System (auto)", size: "290 KB" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [reports, setReports]     = useState<Report[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [preview, setPreview]     = useState<Report | null>(null);
  const { toasts, showToast }     = useToast();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllReports();
        setReports(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
        showToast("Error loading reports", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  function handleCSV(report: Report) {
    downloadCSV(report.filename, report.headers, report.rows);
    showToast(`${report.title} exported as CSV.`);
  }

  function handlePrint(report: Report) {
    printReport(report.title, report.headers, report.rows);
    showToast(`Opening print view for ${report.title}…`, "info");
  }

  return (
    <div className="px-8 py-6 space-y-6">
      {loading && (
        <div className="bg-blue-900/50 border border-blue-800 text-blue-300 px-4 py-3 rounded-lg text-sm">
          Loading reports...
        </div>
      )}
      {error && (
        <div className="bg-red-900/50 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Report cards */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Available Reports</h2>
        <div className="grid grid-cols-3 gap-4">
          {reports.map((r) => (
            <div key={r.id} className={`rounded-xl border p-5 flex flex-col gap-4 ${r.accentBorder}`}>
              <div className="flex items-start justify-between">
                <span className="text-2xl">{r.icon}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.badge}`}>{r.frequency}</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 mb-1">{r.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{r.description}</p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-1">
                <div>
                  <p className="text-xs text-zinc-600">Last generated</p>
                  <p className="text-xs text-zinc-400 font-medium">{r.lastGenerated}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreview(r)}
                    className="px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleCSV(r)}
                    className="px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Download as CSV"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    CSV
                  </button>
                  <button
                    onClick={() => handlePrint(r)}
                    className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Open printable view (PDF via browser print)"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <section className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Recent Report Activity</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
              <th className="px-6 py-3 font-medium">Report</th>
              <th className="px-6 py-3 font-medium">Generated</th>
              <th className="px-6 py-3 font-medium">By</th>
              <th className="px-6 py-3 font-medium">Size</th>
              <th className="px-6 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {RECENT_ACTIVITY.map((a, i) => (
              <tr key={i} className={`hover:bg-zinc-800/40 transition-colors ${i < RECENT_ACTIVITY.length - 1 ? "border-b border-zinc-800" : ""}`}>
                <td className="px-6 py-3.5 text-xs font-medium text-zinc-200">{a.report}</td>
                <td className="px-6 py-3.5 text-xs text-zinc-500 font-mono">{a.date}</td>
                <td className="px-6 py-3.5 text-xs text-zinc-400">{a.user}</td>
                <td className="px-6 py-3.5 text-xs text-zinc-500">{a.size}</td>
                <td className="px-6 py-3.5">
                  <button
                    onClick={() => {
                      const r = reports.find((rp) => rp.title === a.report || rp.title.startsWith(a.report));
                      if (r) { downloadCSV(r.filename, r.headers, r.rows); showToast(`${r.title} re-exported.`); }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Re-export
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {preview && <PreviewModal report={preview} onClose={() => setPreview(null)} />}
      <ToastList toasts={toasts} />
    </div>
  );
}
