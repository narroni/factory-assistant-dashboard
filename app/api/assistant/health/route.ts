import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { checkOllamaHealth } from "../../../lib/ollama";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const health = await checkOllamaHealth();
  return NextResponse.json(health);
}
