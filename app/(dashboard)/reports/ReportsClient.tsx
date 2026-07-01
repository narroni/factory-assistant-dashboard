"use client";

import { useState } from "react";
import { ModalShell } from "../../components/ModalShell";
import { useToast, ToastList } from "../../components/Toast";
import { type Report } from "./actions";

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

const REPORT_TYPE_ALL = "All";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsClient({ initialReports }: { initialReports: Report[] }) {
  const [reports]                     = useState<Report[]>(initialReports);
  const [preview, setPreview]         = useState<Report | null>(null);
  const [typeFilter, setTypeFilter]   = useState<string>(REPORT_TYPE_ALL);
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const { toasts, showToast }         = useToast();

  function handleCSV(report: Report) {
    downloadCSV(report.filename, report.headers, report.rows);
    showToast(`${report.title} exported as CSV.`);
  }

  function handlePrint(report: Report) {
    printReport(report.title, report.headers, report.rows);
    showToast(`Opening print view for ${report.title}…`, "info");
  }

  const reportTypes = [REPORT_TYPE_ALL, ...Array.from(new Set(reports.map((r) => r.title.split(" ")[0])))];

  const filteredReports = reports.filter((r) => {
    if (typeFilter !== REPORT_TYPE_ALL && !r.title.startsWith(typeFilter)) return false;
    return true;
  });

  const filteredActivity = RECENT_ACTIVITY.filter((a) => {
    if (typeFilter !== REPORT_TYPE_ALL && !a.report.startsWith(typeFilter)) return false;
    if (dateFrom && a.date < dateFrom) return false;
    if (dateTo && a.date > dateTo + " 99") return false;
    return true;
  });

  const hasFilters = typeFilter !== REPORT_TYPE_ALL || dateFrom || dateTo;

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 transition-colors"
        >
          {reportTypes.map((t) => <option key={t}>{t}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 transition-colors"
          />
          <span className="text-xs text-zinc-500">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setTypeFilter(REPORT_TYPE_ALL); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-zinc-600">{filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Report cards */}
      <div>
        <div className="grid grid-cols-3 gap-4">
          {filteredReports.map((r) => {
            const icons: Record<string, React.ReactNode> = {
              inventory: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
              products: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/></svg>,
              orders: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
              suppliers: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
              capacity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
            };
            return (
            <div key={r.id} className={`rounded-xl border p-5 flex flex-col gap-4 ${r.accentBorder}`}>
              <div className="flex items-start justify-between">
                {icons[r.id]}
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
          );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <section className="bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Recent Report Activity</h2>
          {filteredActivity.length !== RECENT_ACTIVITY.length && (
            <span className="text-xs text-zinc-500">{filteredActivity.length} of {RECENT_ACTIVITY.length}</span>
          )}
        </div>
        {filteredActivity.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-zinc-600">No activity matches the current filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-600 uppercase tracking-wider border-b border-zinc-800">
                <th className="px-5 py-2 font-medium">Report</th>
                <th className="px-5 py-2 font-medium">Generated</th>
                <th className="px-5 py-2 font-medium">By</th>
                <th className="px-5 py-2 font-medium">Size</th>
                <th className="px-5 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredActivity.map((a, i) => (
                <tr key={i} className={`hover:bg-zinc-800/40 transition-colors ${i < filteredActivity.length - 1 ? "border-b border-zinc-800" : ""}`}>
                  <td className="px-5 py-2.5 text-xs font-medium text-zinc-200">{a.report}</td>
                  <td className="px-5 py-2.5 text-xs text-zinc-500 font-mono">{a.date}</td>
                  <td className="px-5 py-2.5 text-xs text-zinc-400">{a.user}</td>
                  <td className="px-5 py-2.5 text-xs text-zinc-500">{a.size}</td>
                  <td className="px-5 py-2.5">
                    <button
                      onClick={() => {
                        const r = reports.find((rp) => rp.title === a.report || rp.title.startsWith(a.report));
                        if (r) { downloadCSV(r.filename, r.headers, r.rows); showToast(`${r.title} re-exported.`); }
                      }}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Re-export
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {preview && <PreviewModal report={preview} onClose={() => setPreview(null)} />}
      <ToastList toasts={toasts} />
    </div>
  );
}
