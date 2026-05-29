import type { Metadata } from "next";

export const metadata: Metadata = { title: "Overview — Factory Assistant" };

const kpiCards = [
  { title: "Total Materials",      value: "1,284",  change: "+12 this week",     up: true,  accent: "text-blue-400",    bar: "bg-blue-600",    dim: "bg-blue-950" },
  { title: "Open Orders",          value: "47",     change: "+3 today",          up: true,  accent: "text-amber-400",   bar: "bg-amber-500",   dim: "bg-amber-950" },
  { title: "Low Stock Items",      value: "9",      change: "Needs attention",   up: false, accent: "text-red-400",     bar: "bg-red-500",     dim: "bg-red-950" },
  { title: "Production Capacity",  value: "83%",    change: "−4% vs last week",  up: false, accent: "text-emerald-400", bar: "bg-emerald-500", dim: "bg-emerald-950" },
];

const recentOrders = [
  { id: "ORD-4821", customer: "Vestas Wind Systems",  product: "Wind Turbine Blade B-52",       qty: 6,    status: "In Production", date: "2026-05-28" },
  { id: "ORD-4820", customer: "Siemens Gamesa",       product: "Wind Turbine Blade B-38",       qty: 12,   status: "Pending",       date: "2026-05-27" },
  { id: "ORD-4819", customer: "Claas Group",          product: "Agricultural Mower Blade AM-600", qty: 2000, status: "Shipped",      date: "2026-05-26" },
  { id: "ORD-4818", customer: "Renault SA",           product: "Industrial Cutting Blade IC-300", qty: 500,  status: "Completed",    date: "2026-05-25" },
  { id: "ORD-4817", customer: "Airbus Helicopters",   product: "Helicopter Rotor Blade HR-14",   qty: 4,    status: "QC Review",    date: "2026-05-24" },
];

const statusStyles: Record<string, string> = {
  "In Production": "bg-blue-900 text-blue-300",
  "Pending":       "bg-amber-900 text-amber-300",
  "Shipped":       "bg-emerald-900 text-emerald-300",
  "Completed":     "bg-zinc-700 text-zinc-300",
  "QC Review":     "bg-purple-900 text-purple-300",
};

const lowStockItems = [
  { name: "Copper Wire 2.5mm",      stock: 18,  unit: "kg",  threshold: 50,  pct: 36 },
  { name: "Inconel 718 Bar",        stock: 8,   unit: "kg",  threshold: 30,  pct: 27 },
  { name: "Zinc Phosphate Coating", stock: 5,   unit: "L",   threshold: 20,  pct: 25 },
  { name: "Nomex Honeycomb 48kg",   stock: 28,  unit: "m²",  threshold: 80,  pct: 35 },
];

const aiInsights = [
  { type: "warning", text: "ORD-4821 is at risk of delay — Copper Wire stock at 36% of minimum threshold. Reorder from CopperCo immediately." },
  { type: "info",    text: "Supplier Metalmec SRL has a 96% on-time delivery rate over the last 90 days — recommended for priority contracts." },
  { type: "info",    text: "Production capacity drop correlates with Line 3 scheduled maintenance window (22–24 May). Capacity expected to recover to 89% by 2 June." },
];

export default function OverviewPage() {
  return (
    <div className="px-8 py-6 space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.title} className={`${card.dim} rounded-xl p-5 border border-zinc-800`}>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">{card.title}</p>
            <p className={`text-3xl font-bold ${card.accent} mb-1`}>{card.value}</p>
            <p className={`text-xs ${card.up ? "text-emerald-400" : "text-red-400"}`}>{card.change}</p>
          </div>
        ))}
      </div>

      {/* Middle row: orders table + low stock */}
      <div className="grid grid-cols-3 gap-6">

        {/* Recent Orders */}
        <section className="col-span-2 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-100">Recent Orders</h2>
            <a href="/orders" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View all →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                  <th className="px-6 py-3 font-medium">Order ID</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-6 py-3 font-medium">Qty</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o, i) => (
                  <tr key={o.id} className={`hover:bg-zinc-800/50 transition-colors ${i < recentOrders.length - 1 ? "border-b border-zinc-800" : ""}`}>
                    <td className="px-6 py-3.5 font-mono text-xs text-blue-400">{o.id}</td>
                    <td className="px-6 py-3.5 text-zinc-200 text-xs">{o.customer}</td>
                    <td className="px-6 py-3.5 text-zinc-400 text-xs">{o.product}</td>
                    <td className="px-6 py-3.5 text-zinc-300 text-xs">{o.qty.toLocaleString()}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[o.status]}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-zinc-500 text-xs">{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Low Stock Alerts */}
        <section className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-100">Low Stock Alerts</h2>
            <span className="text-xs bg-red-900 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-medium">
              {lowStockItems.length} items
            </span>
          </div>
          <ul className="divide-y divide-zinc-800">
            {lowStockItems.map((item) => (
              <li key={item.name} className="px-6 py-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-zinc-200 truncate pr-2">{item.name}</span>
                  <span className="text-xs text-red-400 shrink-0">{item.stock} {item.unit}</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
                <p className="text-xs text-zinc-600 mt-1">{item.pct}% of min. threshold</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* AI Insights */}
      <section className="bg-zinc-900 rounded-xl border border-blue-900/40">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-xs text-white font-bold shrink-0">AI</div>
          <h2 className="text-sm font-semibold text-zinc-100">AI Insights</h2>
          <span className="ml-auto text-xs text-blue-400 bg-blue-950 border border-blue-900 px-2 py-0.5 rounded-full">
            Factory Assistant · Live
          </span>
        </div>
        <ul className="divide-y divide-zinc-800">
          {aiInsights.map((insight, i) => (
            <li key={i} className="flex items-start gap-4 px-6 py-4">
              <span className={`mt-0.5 text-sm shrink-0 ${insight.type === "warning" ? "text-amber-400" : "text-blue-400"}`}>
                {insight.type === "warning" ? "⚠" : "→"}
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed">{insight.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
