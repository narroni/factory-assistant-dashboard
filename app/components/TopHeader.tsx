"use client";

import { usePathname } from "next/navigation";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/":           { title: "Overview",   subtitle: "Factory operations at a glance" },
  "/materials":  { title: "Materials",  subtitle: "Raw material inventory and stock management" },
  "/products":   { title: "Products",   subtitle: "Product catalog, dimensions, and specifications" },
  "/orders":     { title: "Orders",     subtitle: "Customer orders and production fulfillment" },
  "/suppliers":  { title: "Suppliers",  subtitle: "Supplier directory and performance tracking" },
  "/reports":    { title: "Reports",    subtitle: "Analytics, exports, and operational reports" },
  "/settings":   { title: "Settings",   subtitle: "System configuration and preferences" },
};

export default function TopHeader() {
  const pathname = usePathname();
  const meta = pageMeta[pathname] ?? { title: "Dashboard", subtitle: "" };

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-zinc-800 bg-zinc-950 shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">{meta.title}</h1>
        <p className="text-xs text-zinc-500 mt-0.5">{meta.subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950 border border-emerald-900 px-3 py-1.5 rounded-full font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          All systems operational
        </span>
        <button className="relative w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 transition-colors">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-zinc-950" />
        </button>
        <div className="text-right">
          <p className="text-xs font-medium text-zinc-300">29 May 2026</p>
          <p className="text-xs text-zinc-600">Thursday</p>
        </div>
      </div>
    </header>
  );
}
