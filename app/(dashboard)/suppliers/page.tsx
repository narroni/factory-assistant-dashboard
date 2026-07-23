import { getSuppliers } from "./actions";
import SuppliersClient from "./SuppliersClient";

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const items = await getSuppliers();
  return <SuppliersClient initialItems={items} />;
}
