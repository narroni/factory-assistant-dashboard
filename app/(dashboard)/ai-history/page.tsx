import { getSessionUser } from "../../lib/session";
import AccessDenied from "../../components/AccessDenied";
import { getChats } from "./actions";
import AIHistoryClient from "./AIHistoryClient";

export default async function AIHistoryPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return <AccessDenied />;

  const chats = await getChats();
  return <AIHistoryClient initialChats={chats} />;
}
