import type { Metadata } from "next";
import { getOverviewData } from "./overview/actions";

export const metadata: Metadata = { title: "Overview — Factory Assistant" };

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-900 text-amber-300",
  IN_PRODUCTION: "bg-blue-900 text-blue-300",
  COMPLETED: "bg-emerald-900 text-emerald-300",
  DELAYED: "bg-red-900 text-red-300",
  CANCELLED: "bg-zinc-700 text-zinc-400",
};

const statusDisplay: Record<string, string> = {
  PENDING: "Pending",
  IN_PRODUCTION: "In Production",
  COMPLETED: "Completed",
  DELAYED: "Delayed",
  CANCELLED: "Cancelled",
};

export default async function OverviewPage() {
  const data = await getOverviewData();

  const kpiCards = [
    { title: "Total Materials", value: data.totalMaterials.toString(), change: `${data.inStockMaterials} in stock`, up: true, accent: "text-blue-400" },
    { title: "Open Orders", value: data.openOrders.toString(), change: `${data.inProductionOrders} in production`, up: data.openOrders === 0, accent: data.openOrders === 0 ? "text-emerald-400" : "text-amber-400" },
    { title: "Out of Stock", value: data.outOfStockItems.toString(), change: "requires restock", up: data.outOfStockItems === 0, accent: data.outOfStockItems === 0 ? "text-emerald-400" : "text-red-400" },
    { title: "Low Stock Items", value: data.lowStockItems.toString(), change: "review inventory", up: data.lowStockItems === 0, accent: data.lowStockItems === 0 ? "text-emerald-400" : "text-amber-400" },
  ];

  return (
    <div className="px-8 py-6 space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.title} className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">{card.title}</p>
            <p className={`text-3xl font-bold ${card.accent} mb-1`}>{card.value}</p>
            <p className={`text-xs ${card.up ? "text-emerald-400" : "text-red-400"}`}>{card.change}</p>
          </div>
        ))}
      </div>

      {/* Middle row: orders table + low stock */}
      {data.recentOrders.length > 0 && (
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
                  {data.recentOrders.map((o, i) => (
                    <tr key={o.orderNumber} className={`hover:bg-zinc-800/50 transition-colors ${i < data.recentOrders.length - 1 ? "border-b border-zinc-800" : ""}`}>
                      <td className="px-6 py-3.5 font-mono text-xs text-blue-400">{o.orderNumber}</td>
                      <td className="px-6 py-3.5 text-zinc-200 text-xs">{o.customer}</td>
                      <td className="px-6 py-3.5 text-zinc-400 text-xs">{o.product}</td>
                      <td className="px-6 py-3.5 text-zinc-300 text-xs">{o.qty.toLocaleString()}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[o.status]}`}>
                          {statusDisplay[o.status]}
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
          {data.lowStockAlerts.length > 0 && (
            <section className="bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-100">Low Stock Alerts</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-red-900 text-red-300 border-red-800">
                  {data.lowStockItems} item{data.lowStockItems !== 1 ? "s" : ""}
                </span>
              </div>
              <ul className="divide-y divide-zinc-800">
                {data.lowStockAlerts.map((item) => (
                  <li key={item.name} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
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
