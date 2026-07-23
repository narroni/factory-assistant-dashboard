import type { Metadata } from "next";
import Link from "next/link";
import { getOverviewData } from "./overview/actions";
import { T } from "../components/ui";

export const metadata: Metadata = { title: "Overview — Factory Assistant" };
export const dynamic = 'force-dynamic';

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-900 text-amber-300",
  IN_PRODUCTION: "bg-blue-900 text-blue-300",
  COMPLETED: "bg-emerald-900 text-emerald-300",
  DELAYED: "bg-red-900 text-red-300",
  CANCELLED: "bg-zinc-700 text-zinc-400",
};

const statusI18nKey: Record<string, string> = {
  PENDING: "status.pending",
  IN_PRODUCTION: "status.in_production",
  COMPLETED: "status.completed",
  DELAYED: "status.delayed",
  CANCELLED: "status.cancelled",
};

export default async function OverviewPage() {
  const data = await getOverviewData();

  const kpiCards = [
    { id: "total-materials", title: "Total Materials", value: data.totalMaterials.toString(), change: `${data.inStockMaterials} in stock`, up: true, accent: "text-blue-400" },
    { id: "open-orders", title: "Open Orders", value: data.openOrders.toString(), change: `${data.inProductionOrders} in production`, up: data.openOrders === 0, accent: data.openOrders === 0 ? "text-emerald-400" : "text-amber-400" },
    { id: "out-of-stock", title: <T k="kpi.out_of_stock" />, value: data.outOfStockItems.toString(), change: "requires restock", up: data.outOfStockItems === 0, accent: data.outOfStockItems === 0 ? "text-emerald-400" : "text-red-400" },
    { id: "low-stock-items", title: <T k="overview.low_stock_items" />, value: data.lowStockItems.toString(), change: "review inventory", up: data.lowStockItems === 0, accent: data.lowStockItems === 0 ? "text-emerald-400" : "text-amber-400" },
  ];

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-4">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <div key={card.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">{card.title}</p>
            <p className={`text-2xl font-bold ${card.accent} mb-0.5`}>{card.value}</p>
            <p className={`text-xs ${card.up ? "text-emerald-400" : "text-red-400"}`}>{card.change}</p>
          </div>
        ))}
      </div>

      {/* Middle row: orders table + low stock */}
      {data.recentOrders.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Orders */}
          <section className="lg:col-span-2 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">Recent Orders</h2>
              <Link href="/orders" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-600 uppercase tracking-wider border-b border-zinc-800">
                    <th className="px-5 py-2 font-medium">Order</th>
                    <th className="px-5 py-2 font-medium">Customer</th>
                    <th className="px-5 py-2 font-medium">Product</th>
                    <th className="px-5 py-2 font-medium">Qty</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o, i) => (
                    <tr key={o.orderNumber} className={`hover:bg-zinc-800/50 transition-colors ${i < data.recentOrders.length - 1 ? "border-b border-zinc-800" : ""}`}>
                      <td className="px-5 py-2.5 font-mono text-xs text-zinc-400">{o.orderNumber}</td>
                      <td className="px-5 py-2.5 text-zinc-200 text-xs">{o.customer}</td>
                      <td className="px-5 py-2.5 text-zinc-400 text-xs truncate max-w-32">{o.product}</td>
                      <td className="px-5 py-2.5 text-zinc-300 text-xs">{o.qty.toLocaleString()}</td>
                      <td className="px-5 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusStyles[o.status]}`}>
                          <T k={statusI18nKey[o.status]} />
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-zinc-500 text-xs">{o.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Low Stock Alerts */}
          {data.lowStockAlerts.length > 0 && (
            <section className="bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-100"><T k="status.low_stock" /></h2>
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-900/50 text-red-400 border border-red-900">
                  {data.lowStockItems}
                </span>
              </div>
              <ul className="divide-y divide-zinc-800">
                {data.lowStockAlerts.map((item) => (
                  <li key={item.name} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-200 truncate pr-2">{item.name}</span>
                      <span className="text-xs text-red-400 shrink-0">{item.stock} {item.unit}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* AI Requests summary card — always shown (server renders for all roles, but only meaningful for admins) */}
      {(data.aiRequests.pending > 0 || data.aiRequests.approvedToday > 0 || data.aiRequests.executedToday > 0) && (
        <Link href="/ai-requests" className="block">
          <section className="bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">Assistant Action Requests</h2>
              <span className="text-xs text-zinc-600">View all →</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800">
              {[
                { id: "pending",  label: <T k="overview.pending_approval" />, value: data.aiRequests.pending, accent: data.aiRequests.pending > 0 ? "text-amber-400" : "text-zinc-500" },
                { id: "approved", label: <T k="overview.approved_today" />,   value: data.aiRequests.approvedToday,  accent: "text-blue-400" },
                { id: "rejected", label: <T k="overview.rejected_today" />,   value: data.aiRequests.rejectedToday,  accent: "text-zinc-500" },
                { id: "executed", label: <T k="overview.executed_today" />,   value: data.aiRequests.executedToday,  accent: "text-emerald-400" },
              ].map((s) => (
                <div key={s.id} className="px-5 py-3">
                  <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.accent}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </section>
        </Link>
      )}

      {/* System Insights - Always show if there are alerts */}
      {data.systemAlerts.length > 0 && (
        <section className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
            <div className="w-6 h-6 rounded-md bg-zinc-700 flex items-center justify-center text-xs text-zinc-300 font-medium shrink-0">⚙</div>
            <h2 className="text-sm font-semibold text-zinc-100">System Status</h2>
            <span className="ml-auto text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <ul className="divide-y divide-zinc-800">
            {data.systemAlerts.map((alert, i) => (
              <li key={i} className="flex items-start gap-4 px-6 py-4">
                <span className={`mt-0.5 text-sm shrink-0 ${alert.type === "warning" ? "text-amber-400" : "text-emerald-400"}`}>
                  {alert.type === "warning" ? "⚠" : "✓"}
                </span>
                <p className="text-sm text-zinc-300 leading-relaxed">{alert.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
