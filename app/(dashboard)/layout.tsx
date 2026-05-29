import Sidebar from "../components/Sidebar";
import TopHeader from "../components/TopHeader";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-full flex">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <TopHeader />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
