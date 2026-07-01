import { getSuppliers } from "./actions";
import SuppliersClient from "./SuppliersClient";

export default async function SuppliersPage() {
  const items = await getSuppliers();
  return <SuppliersClient initialItems={items} />;
}
