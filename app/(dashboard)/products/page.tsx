import { getBladeProducts, getCrateTypes } from "./actions";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage() {
  const [items, crateTypes] = await Promise.all([getBladeProducts(), getCrateTypes()]);
  return <ProductsClient initialItems={items} crateTypes={crateTypes} />;
}
