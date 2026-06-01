import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../lib/session";
import { classifyIntent } from "./intents";
import {
  queryTotalMaterials,
  queryLowStockItems,
  queryOpenOrders,
  queryBestSuppliers,
  queryProductCapacity,
  type ToolResult,
} from "./queries";

export type AssistantRequest = {
  question: string;
};

export type AssistantResponse = {
  question: string;
  intent: string;
  result: ToolResult | null;
  summary: string;
  error?: string;
  respondedAt: string;
};

const SUPPORTED_INTENTS = [
  "total_materials — ask how many materials are in inventory",
  "low_stock_items — ask which materials are low or out of stock",
  "open_orders — ask about pending, in-production, or delayed orders",
  "best_suppliers — ask which suppliers have the best on-time delivery rate",
  "product_capacity — ask how many products are active / in production",
];

// POST /api/assistant
export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: AssistantRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "question must be 500 characters or fewer" }, { status: 400 });
  }

  // ── Classify ────────────────────────────────────────────────────────────────
  const intent = classifyIntent(question);
  const respondedAt = new Date().toISOString();

  if (intent === "unknown") {
    const response: AssistantResponse = {
      question,
      intent: "unknown",
      result: null,
      summary:
        "I couldn't understand that question. I currently support: " +
        SUPPORTED_INTENTS.join("; ") + ".",
      respondedAt,
    };
    console.info(`[assistant] unknown intent — user=${user.email} q="${question}"`);
    return NextResponse.json(response, { status: 200 });
  }

  // ── Execute read-only query ─────────────────────────────────────────────────
  try {
    let result: ToolResult;

    switch (intent) {
      case "total_materials":
        result = await queryTotalMaterials();
        break;
      case "low_stock_items":
        result = await queryLowStockItems();
        break;
      case "open_orders":
        result = await queryOpenOrders();
        break;
      case "best_suppliers":
        result = await queryBestSuppliers();
        break;
      case "product_capacity":
        result = await queryProductCapacity();
        break;
    }

    const response: AssistantResponse = {
      question,
      intent,
      result,
      summary: result.summary,
      respondedAt,
    };

    console.info(
      `[assistant] intent=${intent} user=${user.email} q="${question}" → "${result.summary.slice(0, 80)}…"`
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    console.error(`[assistant] query error intent=${intent} user=${user.email}`, error);
    return NextResponse.json(
      { error: "Failed to execute query", detail: message },
      { status: 500 }
    );
  }
}

// GET /api/assistant — returns capability manifest (no auth needed for discovery)
export async function GET() {
  return NextResponse.json({
    description: "Read-only factory data assistant. POST a question to get structured data.",
    version: "1.0.0",
    capabilities: SUPPORTED_INTENTS,
    usage: {
      method: "POST",
      contentType: "application/json",
      body: { question: "string (max 500 chars)" },
    },
  });
}
