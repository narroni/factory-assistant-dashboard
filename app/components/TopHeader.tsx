"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { t } from "../lib/i18n";
import MobileNav from "./MobileNav";

const pageKeys: Record<string, string> = {
  "/":           "overview",
  "/materials":  "materials",
  "/products":   "products",
  "/orders":     "orders",
  "/suppliers":  "suppliers",
  "/reports":    "reports",
  "/settings":   "settings",
  "/profile":    "profile",
  "/assistant":   "assistant",
  "/ai-requests": "ai_requests",
  "/ai-history":  "ai_history",
  "/packaging-calculator": "packaging_calculator",
  "/customers": "customers",
};

type Alert = { type: "warning" | "info"; title: string; description: string };

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <div className="w-24" />;
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className="text-right leading-none">
      <p className="text-xs font-medium text-zinc-300">{dateStr}</p>
      <p className="text-xs text-zinc-500 mt-0.5 font-mono">{timeStr}</p>
    </div>
  );
}

export default function TopHeader() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const pageKey = pageKeys[pathname];
  const title = pageKey ? t(`page.${pageKey}`, language) : "Dashboard";
  const subtitle = pageKey ? t(`subtitle.${pageKey}`, language) : "";
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/alerts");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data);
        }
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      }
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const hasAlerts = alerts.length > 0;

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <MobileNav />
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-zinc-100 leading-tight truncate">{title}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="relative w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {hasAlerts && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-zinc-950" />}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-100">{t("header.notifications", language)}</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-zinc-500">{t("header.no_notifications", language)}</p>
                  </div>
                ) : (
                  alerts.map((alert, i) => (
                    <div key={i} className={`px-4 py-3 border-b border-zinc-800 last:border-b-0 ${alert.type === "warning" ? "bg-amber-950/20" : "bg-blue-950/20"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.type === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium ${alert.type === "warning" ? "text-amber-300" : "text-blue-300"}`}>{alert.title}</p>
                          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{alert.description}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <LiveClock />
      </div>
    </header>
  );
}
