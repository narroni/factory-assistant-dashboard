"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";
import { t } from "../lib/i18n";

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function GridIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function BoxIcon()       { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
function LayersIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>; }
function ClipboardIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>; }
function TruckIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>; }
function BarChartIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>; }
function GearIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function SparkleIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.126 12.126.707.707M3 12h1m16 0h1M4.22 19.78l.707-.707M18.364 5.636l.707-.707"/><circle cx="12" cy="12" r="4"/></svg>; }
function InboxIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>; }
function HistoryIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>; }
function DownloadIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function PackageIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
function UsersIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }

const mainNav = [
  { key: "overview",   href: "/",           Icon: GridIcon },
  { key: "materials",  href: "/materials",  Icon: BoxIcon },
  { key: "products",   href: "/products",   Icon: LayersIcon },
  { key: "customers",  href: "/customers",  Icon: UsersIcon },
  { key: "suppliers",  href: "/suppliers",  Icon: TruckIcon },
  { key: "reports",    href: "/reports",    Icon: BarChartIcon },
];

const ordersNav = [
  { key: "orders",               href: "/orders",               Icon: ClipboardIcon },
  { key: "packaging_calculator", href: "/packaging-calculator", Icon: PackageIcon },
];

const aiNav = [
  { key: "assistant",   href: "/assistant",   Icon: SparkleIcon },
  { key: "ai_requests", href: "/ai-requests", Icon: InboxIcon },
  { key: "ai_history",  href: "/ai-history",  Icon: HistoryIcon },
  { key: "outputs",     href: "/outputs",     Icon: DownloadIcon },
];

function NavLink({
  href, Icon, label, active, onClick,
}: {
  href: string;
  Icon: () => React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
        active
          ? "bg-blue-600 text-white font-medium"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      }`}
    >
      <Icon />
      <span>{label}</span>
    </Link>
  );
}

export default function MobileNav() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const handleClose = () => setOpen(false);

  return (
    <>
      {/* Menu Button - Only visible on mobile (<lg) */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-zinc-100 transition-colors"
        title="Open menu"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Mobile Menu Drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={handleClose}
          />
          {/* Menu */}
          <nav className="fixed top-0 left-0 h-full w-64 bg-zinc-900 border-r border-zinc-800 z-50 lg:hidden overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-3 py-3.5 border-b border-zinc-800 shrink-0">
              <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                F
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-100">Factory Assistant</p>
              </div>
              <button
                onClick={handleClose}
                className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Nav Links */}
            <div className="flex flex-col gap-0.5 px-2 py-3">
              {mainNav.map(({ key, href, Icon }) => (
                <NavLink
                  key={key}
                  href={href}
                  Icon={Icon}
                  label={t(`nav.${key}`, language)}
                  active={isActive(href)}
                  onClick={handleClose}
                />
              ))}

              {/* Orders */}
              <div className="border-t border-zinc-800 mt-2 pt-2">
                <p className="text-xs font-medium text-zinc-600 px-4 py-2 uppercase tracking-wider">
                  {t("nav.orders", language)}
                </p>
                {ordersNav.map(({ key, href, Icon }) => (
                  <NavLink
                    key={key}
                    href={href}
                    Icon={Icon}
                    label={t(`nav.${key}`, language)}
                    active={isActive(href)}
                    onClick={handleClose}
                  />
                ))}
              </div>

              {/* AI */}
              <div className="border-t border-zinc-800 mt-2 pt-2">
                <p className="text-xs font-medium text-zinc-600 px-4 py-2 uppercase tracking-wider">
                  AI
                </p>
                {aiNav.map(({ key, href, Icon }) => (
                  <NavLink
                    key={key}
                    href={href}
                    Icon={Icon}
                    label={t(`nav.${key}`, language)}
                    active={isActive(href)}
                    onClick={handleClose}
                  />
                ))}
              </div>

              {/* Settings */}
              <div className="border-t border-zinc-800 mt-2 pt-2">
                <NavLink
                  href="/settings"
                  Icon={GearIcon}
                  label={t("nav.settings", language)}
                  active={isActive("/settings")}
                  onClick={handleClose}
                />
              </div>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
