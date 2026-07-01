import { getCustomers } from "./actions";
import CustomersClient from "./CustomersClient";

export default async function CustomersPage() {
  const items = await getCustomers();
  return <CustomersClient initialItems={items} />;
}
