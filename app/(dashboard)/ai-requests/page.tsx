import { getSessionUser } from "../../lib/session";
import AccessDenied from "../../components/AccessDenied";
import { getAIRequests } from "./actions";
import AIRequestsClient from "./AIRequestsClient";

export const dynamic = 'force-dynamic';

export default async function AIRequestsPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER")) return <AccessDenied />;

  const requests = await getAIRequests();
  return <AIRequestsClient initialRequests={requests} />;
}
