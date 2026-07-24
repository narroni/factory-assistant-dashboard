// Server Component — no "use client" needed.
// Sidebar and TopHeader are Client Components and hydrate independently.
// Next.js App Router guarantees this layout is NOT remounted on intra-dashboard navigation.

import { redirect } from "next/navigation";
import { getSessionUser } from "../lib/session";
import Sidebar from "../components/Sidebar";
import TopHeader from "../components/TopHeader";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Covers cases the middleware's cookie-presence check misses: expired,
  // revoked, or deactivated-user sessions where the cookie still exists.
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="h-full flex">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <TopHeader />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
