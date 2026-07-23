import { getCustomers } from "./actions";
import CustomersClient from "./CustomersClient";

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const items = await getCustomers();
  return <CustomersClient initialItems={items} />;
}
