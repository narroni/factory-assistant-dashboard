// Server Component — no "use client" needed.
// Sidebar and TopHeader are Client Components and hydrate independently.
// Next.js App Router guarantees this layout is NOT remounted on intra-dashboard navigation.

import Sidebar from "../components/Sidebar";
import TopHeader from "../components/TopHeader";
import LayoutMountProbe from "../components/LayoutMountProbe";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-full flex">
      <LayoutMountProbe />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <TopHeader />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
