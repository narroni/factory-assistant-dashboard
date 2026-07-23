import { getMaterials } from "./actions";
import MaterialsClient from "./MaterialsClient";

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const items = await getMaterials();
  return <MaterialsClient initialItems={items} />;
}
