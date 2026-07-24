import { getSessionUser } from "../../lib/session";
import AccessDenied from "../../components/AccessDenied";
import { getCrateTypes, getContainerTypes } from "./actions";
import CratesContainersClient from "./CratesContainersClient";

export const dynamic = 'force-dynamic';

export default async function CratesContainersPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER")) return <AccessDenied />;

  const [crates, containers] = await Promise.all([getCrateTypes(), getContainerTypes()]);
  return <CratesContainersClient initialCrates={crates} initialContainers={containers} />;
}
