import { getOutputs } from "./actions";
import OutputsClient from "./OutputsClient";

export default async function OutputsPage() {
  const { outputs, total } = await getOutputs(1, 10);
  return <OutputsClient initialOutputs={outputs} initialTotal={total} />;
}
