"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";
import { t } from "../lib/i18n";

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
function BarChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.126 12.126.707.707M3 12h1m16 0h1M4.22 19.78l.707-.707M18.364 5.636l.707-.707" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

const navItemsConfig = [
  { key: "overview",  href: "/",           Icon: GridIcon },
  { key: "materials", href: "/materials",  Icon: BoxIcon },
  { key: "products",  href: "/products",   Icon: LayersIcon },
  { key: "orders",    href: "/orders",     Icon: ClipboardIcon },
  { key: "suppliers", href: "/suppliers",  Icon: TruckIcon },
  { key: "reports",   href: "/reports",    Icon: BarChartIcon },
  { key: "assistant", href: "/assistant",  Icon: SparkleIcon },
  { key: "settings",  href: "/settings",   Icon: GearIcon },
];

function SidebarNav({ language }: { language: "en" | "de" }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1">
      <p className="px-3 pb-2 text-xs font-medium text-zinc-600 uppercase tracking-wider">Main Menu</p>
      {navItemsConfig.map(({ key, href, Icon }) => {
        const active = isActive(href);
        const label = t(`nav.${key}`, language);
        return (
          <Link
            key={key}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              active
                ? "bg-blue-600 text-white font-medium shadow-sm"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            }`}
          >
            <Icon />
            {label}
            {key === "products" && (
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-medium ${active ? "bg-blue-500 text-blue-100" : "bg-zinc-800 text-zinc-500"}`}>
                10
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1.5">
      <button
        onClick={() => setLanguage("en")}
        className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
          language === "en"
            ? "bg-blue-600 text-white"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("de")}
        className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
          language === "de"
            ? "bg-blue-600 text-white"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        DE
      </button>
    </div>
  );
}

export default function Sidebar() {
  const { language } = useLanguage();

  return (
    <aside className="flex flex-col w-60 shrink-0 bg-zinc-900 border-r border-zinc-800 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white text-sm font-bold shrink-0">
          F
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100 leading-tight">Factory Assistant</p>
          <p className="text-xs text-zinc-500 leading-tight">Production Manager</p>
        </div>
      </div>

      <SidebarNav language={language} />

      {/* Language Switcher & User */}
      <div className="px-4 py-4 border-t border-zinc-800 shrink-0 space-y-3">
        <LanguageSwitcher />
        <Link
          href="/profile"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            NP
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-zinc-200 truncate group-hover:text-blue-400 transition-colors">Narko P.</span>
            <span className="text-xs text-zinc-500 truncate">Administrator</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
