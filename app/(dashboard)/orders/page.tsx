import { getOrders, getBladeProductOptions, getCustomerOptions } from "./actions";
import OrdersClient from "./OrdersClient";

export default async function OrdersPage() {
  const [items, bladeProducts, customers] = await Promise.all([
    getOrders(),
    getBladeProductOptions(),
    getCustomerOptions(),
  ]);
  return <OrdersClient initialItems={items} bladeProducts={bladeProducts} customers={customers} />;
}
