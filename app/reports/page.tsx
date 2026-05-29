"use client";

import { useState } from "react";
import { ModalShell } from "../components/ModalShell";
import { useToast, ToastList } from "../components/Toast";

// ── Types & helpers ───────────────────────────────────────────────────────────

type Report = {
  id: string;
  title: string;
  description: string;
  lastGenerated: string;
  frequency: "Daily" | "Weekly" | "Monthly";
  icon: string;
  accentBorder: string;
  badge: string;
  filename: string;
  headers: string[];
  rows: string[][];
};

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

// ── Report definitions ────────────────────────────────────────────────────────

const REPORTS: Report[] = [
  {
    id: "inventory",
    title: "Inventory Report",
    description: "Full snapshot of raw material stock levels, reorder points, and supplier lead times.",
    lastGenerated: "2026-05-29",
    frequency: "Daily",
    icon: "📦",
    accentBorder: "border-blue-800 bg-blue-950/30",
    badge: "bg-blue-900 text-blue-300",
    filename: "inventory-report",
    headers: ["Material Name", "Code", "Qty", "Unit", "Min. Threshold", "Supplier", "Status"],
    rows: [
      ["Carbon Fiber Fabric 600g/m²", "CF-600",  "1,240", "m²",  "500",  "TorayComposite", "In Stock"],
      ["Epoxy Resin LR135",           "EP-135",  "850",   "kg",  "300",  "Hexion GmbH",    "In Stock"],
      ["Fiberglass Woven 450g/m²",    "FG-450",  "2,100", "m²",  "800",  "FiberCo SA",     "In Stock"],
      ["Balsa Wood Core 80kg/m³",     "BW-80",   "45",    "m³",  "20",   "3A Composites",  "Low Stock"],
      ["Steel Sheet D2 3mm",          "SS-D2-3", "420",   "kg",  "150",  "Metalmec SRL",   "In Stock"],
      ["Boron Steel 27MnCrB5",        "BS-27",   "680",   "kg",  "200",  "Metalmec SRL",   "In Stock"],
      ["Inconel 718 Bar",             "IN-718",  "8",     "kg",  "30",   "Special Metals", "Out of Stock"],
      ["Nomex Honeycomb 48kg/m³",     "NH-48",   "28",    "m²",  "50",   "Hexcel Corp",    "Low Stock"],
      ["Copper Wire 2.5mm",           "CW-2.5",  "18",    "kg",  "50",   "CopperCo",       "Out of Stock"],
      ["Zinc Phosphate Coating",      "ZP-100",  "5",     "L",   "20",   "ChemPro AG",     "Out of Stock"],
      ["M8 Hex Bolt A2-70",           "M8-A2",   "120",   "pcs", "500",  "BoltMaster",     "Low Stock"],
      ["PU Foam Core 40kg/m³",        "PU-40",   "95",    "m³",  "40",   "Recticel NV",    "In Stock"],
    ],
  },
  {
    id: "products",
    title: "Products Report",
    description: "Product catalog with full technical specifications, dimensions, weights, and volumes.",
    lastGenerated: "2026-05-28",
    frequency: "Weekly",
    icon: "🔧",
    accentBorder: "border-purple-800 bg-purple-950/30",
    badge: "bg-purple-900 text-purple-300",
    filename: "products-report",
    headers: ["Product Name", "Code", "Length (mm)", "Width (mm)", "Thick. (mm)", "Weight (kg)", "Volume", "Material", "Status"],
    rows: [
      ["Wind Turbine Blade B-52",        "WTB-52",   "52,000", "2,800", "180",   "6,500",  "11.50 m³",      "Carbon Fiber / Fiberglass",      "Active"],
      ["Industrial Cutting Blade IC-300","ICB-300",  "300",    "80",    "6",     "2.4",    "144,000 cm³",   "Hardened Steel D2",              "Active"],
      ["Agricultural Mower Blade AM-600","AMB-600",  "600",    "50",    "4",     "0.94",   "120,000 cm³",   "Boron Steel 27MnCrB5",           "Active"],
      ["Wind Turbine Blade B-38",        "WTB-38",   "38,000", "2,100", "150",   "3,800",  "6.80 m³",       "Fiberglass / Epoxy Resin",       "Active"],
      ["Shredder Blade SB-200",          "SHB-200",  "200",    "120",   "15",    "2.8",    "360,000 cm³",   "Manganese Steel X120Mn12",       "Active"],
      ["Gas Turbine Blade TB-80",        "GTB-80",   "80",     "25",    "8",     "0.12",   "16,000 cm³",    "Inconel 718",                    "Prototype"],
      ["Helicopter Rotor Blade HR-14",   "HRB-14",   "14,000", "380",   "40",    "245",    "0.14 m³",       "Carbon Fiber / Nomex Honeycomb", "Active"],
      ["Bandsaw Blade BS-4000",          "BSB-4000", "4,000",  "34",    "0.9",   "0.8",    "122,000 cm³",   "Bimetal M42 HSS",                "Active"],
      ["Pellet Knife PK-150",            "PKN-150",  "150",    "45",    "12",    "0.6",    "81,000 cm³",    "Tool Steel H13",                 "Active"],
      ["Wind Turbine Blade B-65",        "WTB-65",   "65,000", "3,800", "220",   "14,500", "24.80 m³",      "Carbon Fiber / Balsa Core",      "Inactive"],
    ],
  },
  {
    id: "orders",
    title: "Orders Report",
    description: "Open, in-progress, and completed orders with customer, product, status, and value totals.",
    lastGenerated: "2026-05-29",
    frequency: "Daily",
    icon: "📋",
    accentBorder: "border-amber-800 bg-amber-950/30",
    badge: "bg-amber-900 text-amber-300",
    filename: "orders-report",
    headers: ["Order No.", "Customer", "Product", "Code", "Qty", "Status", "Due Date", "Value (€)"],
    rows: [
      ["ORD-4821", "Vestas Wind Systems",  "Wind Turbine Blade B-52",         "WTB-52",   "6",     "In Production", "2026-06-15", "890,000"],
      ["ORD-4820", "Siemens Gamesa",       "Wind Turbine Blade B-38",         "WTB-38",   "12",    "Pending",       "2026-07-01", "720,000"],
      ["ORD-4819", "Claas Group",          "Agricultural Mower Blade AM-600", "AMB-600",  "2,000", "Completed",     "2026-05-28", "42,000"],
      ["ORD-4818", "Renault SA",           "Industrial Cutting Blade IC-300", "ICB-300",  "500",   "Completed",     "2026-05-20", "18,500"],
      ["ORD-4817", "Airbus Helicopters",   "Helicopter Rotor Blade HR-14",    "HRB-14",   "4",     "In Production", "2026-06-30", "540,000"],
      ["ORD-4816", "GE Vernova",           "Wind Turbine Blade B-65",         "WTB-65",   "3",     "Pending",       "2026-09-15", "1,200,000"],
      ["ORD-4815", "Andritz AG",           "Shredder Blade SB-200",           "SHB-200",  "80",    "Completed",     "2026-05-10", "12,800"],
      ["ORD-4814", "John Deere",           "Agricultural Mower Blade AM-600", "AMB-600",  "1,500", "In Production", "2026-06-05", "31,500"],
      ["ORD-4813", "Hexcel Corp",          "Bandsaw Blade BS-4000",           "BSB-4000", "200",   "Completed",     "2026-05-22", "9,600"],
      ["ORD-4812", "Rolls-Royce PLC",      "Gas Turbine Blade TB-80",         "GTB-80",   "20",    "In Production", "2026-07-30", "380,000"],
      ["ORD-4811", "AGCO Corporation",     "Agricultural Mower Blade AM-600", "AMB-600",  "3,000", "Pending",       "2026-07-15", "63,000"],
      ["ORD-4810", "Nordex Group",         "Wind Turbine Blade B-52",         "WTB-52",   "9",     "Completed",     "2026-04-30", "1,335,000"],
    ],
  },
  {
    id: "suppliers",
    title: "Suppliers Report",
    description: "Supplier directory with contact details, lead times, on-time rates, and materials supplied.",
    lastGenerated: "2026-05-27",
    frequency: "Weekly",
    icon: "🚛",
    accentBorder: "border-emerald-800 bg-emerald-950/30",
    badge: "bg-emerald-900 text-emerald-300",
    filename: "suppliers-report",
    headers: ["Supplier", "Country", "Contact", "Lead Time", "On-Time %", "Materials Supplied", "Status"],
    rows: [
      ["TorayComposite",      "Germany",     "Hans Müller",    "6 weeks",  "98%", "Carbon Fiber Fabric 600g",           "Active"],
      ["Hexion GmbH",         "Germany",     "Laura Becker",   "3 weeks",  "95%", "Epoxy Resin LR135",                  "Active"],
      ["FiberCo SA",          "France",      "Marc Dupont",    "4 weeks",  "91%", "Fiberglass Woven 450g",               "Active"],
      ["3A Composites",       "Switzerland", "David Chen",     "5 weeks",  "94%", "Balsa Wood Core, Nomex Honeycomb",   "Active"],
      ["Metalmec SRL",        "Italy",       "Antonio Rossi",  "2 weeks",  "96%", "Steel Sheet D2, Boron Steel",         "Active"],
      ["Special Metals Corp", "USA",         "James Wright",   "10 weeks", "99%", "Inconel 718 Bar",                    "Active"],
      ["Hexcel Corp",         "USA",         "Sarah Johnson",  "8 weeks",  "97%", "Nomex Honeycomb",                    "Active"],
      ["CopperCo",            "Netherlands", "Peter van Dam",  "2 weeks",  "88%", "Copper Wire 2.5mm",                  "Warning"],
      ["ChemPro AG",          "Germany",     "Eva Schmidt",    "1 week",   "87%", "Zinc Phosphate Coating",             "Warning"],
      ["BoltMaster",          "Poland",      "Mikhail Petrov", "1 week",   "82%", "M8 Hex Bolts A2-70",                 "Active"],
      ["Recticel NV",         "Belgium",     "Lotte De Smedt", "3 weeks",  "93%", "PU Foam Core 40kg/m³",              "Active"],
    ],
  },
  {
    id: "capacity",
    title: "Production Capacity Report",
    description: "Production line utilization, throughput rates, and capacity percentages per line.",
    lastGenerated: "2026-05-28",
    frequency: "Weekly",
    icon: "🏭",
    accentBorder: "border-zinc-700 bg-zinc-800/30",
    badge: "bg-zinc-700 text-zinc-300",
    filename: "production-capacity-report",
    headers: ["Production Line", "Product Category", "Throughput / Month", "Capacity Util.", "Status", "Shift"],
    rows: [
      ["Line A — Wind Blades",  "Large Wind Turbine Blades",  "4 units",      "83%", "Running",     "2-shift"],
      ["Line B — Small Blades", "Agricultural / Industrial",  "2,400 units",  "91%", "Running",     "3-shift"],
      ["Line C — Composite",    "Rotor / Turbine Blades",     "8 units",      "68%", "Maintenance", "1-shift"],
      ["Line D — Metal Works",  "Industrial / Shredder",      "320 units",    "77%", "Running",     "2-shift"],
      ["Line E — Bandsaw",      "Bandsaw / Pellet Knives",    "1,200 units",  "95%", "Running",     "3-shift"],
      ["Line F — Prototype",    "Prototype & R&D",            "—",            "40%", "R&D Mode",   "1-shift"],
    ],
  },
];

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
  const [preview, setPreview]     = useState<Report | null>(null);
  const { toasts, showToast }     = useToast();

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

      {/* Report cards */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Available Reports</h2>
        <div className="grid grid-cols-3 gap-4">
          {REPORTS.map((r) => (
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
                      const r = REPORTS.find((rp) => rp.title === a.report || rp.title.startsWith(a.report));
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
