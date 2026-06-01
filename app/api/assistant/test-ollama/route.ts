import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { testGeneration } from "../../../lib/ollama";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const result = await testGeneration();
  return NextResponse.json(result);
}
