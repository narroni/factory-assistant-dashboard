/**
 * Central registry of supported AI action types.
 * All strings are uppercase_snake_case.
 * The executor, system prompt, and proposal validator all reference this file.
 */

export const SUPPORTED_ACTION_TYPES = [
  "GENERATE_REPORT",
  "GENERATE_XLSX",
  "GENERATE_CSV",
  "GENERATE_PDF",
  "CREATE_PURCHASE_ORDER",
  "CREATE_PRODUCTION_PLAN",
  "INVENTORY_RECOMMENDATION",
] as const;

export type SupportedActionType = (typeof SUPPORTED_ACTION_TYPES)[number];

// Aliases the LLM might emit → normalized form
const ALIASES: Record<string, SupportedActionType> = {
  generate_report:          "GENERATE_REPORT",
  "Generate Report":        "GENERATE_REPORT",
  "generate report":        "GENERATE_REPORT",
  generate_xlsx:            "GENERATE_XLSX",
  "Generate XLSX":          "GENERATE_XLSX",
  generate_csv:             "GENERATE_CSV",
  "Generate CSV":           "GENERATE_CSV",
  generate_pdf:             "GENERATE_PDF",
  "Generate PDF":           "GENERATE_PDF",
  create_purchase_request:  "CREATE_PURCHASE_ORDER",
  create_purchase_order:    "CREATE_PURCHASE_ORDER",
  "Create Purchase Order":  "CREATE_PURCHASE_ORDER",
  "Purchase Request":       "CREATE_PURCHASE_ORDER",
  create_production_plan:   "CREATE_PRODUCTION_PLAN",
  "Create Production Plan": "CREATE_PRODUCTION_PLAN",
  inventory_recommendation: "INVENTORY_RECOMMENDATION",
  "Inventory Recommendation": "INVENTORY_RECOMMENDATION",
};

/**
 * Normalizes any casing/alias the LLM outputs → uppercase enum key.
 * Returns null if the action type is not recognized.
 */
export function normalizeActionType(raw: string): SupportedActionType | null {
  const upper = raw.toUpperCase() as SupportedActionType;
  if ((SUPPORTED_ACTION_TYPES as readonly string[]).includes(upper)) return upper;
  if (ALIASES[raw]) return ALIASES[raw];
  return null;
}

export function isSupportedActionType(raw: string): boolean {
  return normalizeActionType(raw) !== null;
}

// Patterns for questions that are purely read-only/calculation.
// The assistant should NEVER propose an action for these.
const READ_ONLY_PATTERNS = [
  /\b(can|does|will|would|could)\s+(this\s+)?order\s+(fit|go|work|ship)/i,
  /\bfit\s+in\s+a?\s*(20ft|40ft|container)/i,
  /\b(how\s+many)\s+(crates?|towers?|pieces?|pcs)/i,
  /\b(what\s+(is|are)|show)\s+(the\s+)?(weight|footprint|volume|net\s+weight|total\s+weight)/i,
  /\bis\s+(this\s+)?(limited|constrained|blocked)\s+by/i,
  /\b(which|what)\s+container\s+(should|to|can|will)/i,
  /\b(explain|summarize|show|describe)\s+order\s+(ORD-[\w\d]+)/i,
  /\b(calculate|compute|estimate)\s+(the\s+)?(packaging|crating|shipment)/i,
  /\bcontainer\s+(fit|capacity|utilization)/i,
  /\b(max|maximum)\s+(pieces?|pcs|quantity)\s+(that\s+)?fits?/i,
];

/**
 * Returns true if the question is a read-only calculation/fit question
 * that should NEVER produce action proposals.
 */
export function isReadOnlyQuestion(question: string): boolean {
  return READ_ONLY_PATTERNS.some((p) => p.test(question));
}
