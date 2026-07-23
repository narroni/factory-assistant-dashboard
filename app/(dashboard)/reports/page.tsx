import { getAllReports } from "./actions";
import ReportsClient from "./ReportsClient";

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const reports = await getAllReports();
  return <ReportsClient initialReports={reports} />;
}
