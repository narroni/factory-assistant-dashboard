import { getMaterials } from "./actions";
import MaterialsClient from "./MaterialsClient";

export default async function MaterialsPage() {
  const items = await getMaterials();
  return <MaterialsClient initialItems={items} />;
}
