/**
 * Deterministic intent classifier.
 * Matches a raw question string to one of the supported read-only intents.
 * No external model is called at this stage.
 */

export type Intent =
  | "total_materials"
  | "low_stock_items"
  | "open_orders"
  | "best_suppliers"
  | "product_capacity"
  | "unknown";

type IntentRule = {
  intent: Intent;
  // Any single pattern match is sufficient
  patterns: RegExp[];
};

const RULES: IntentRule[] = [
  {
    intent: "total_materials",
    patterns: [
      /how many material/i,
      /total material/i,
      /material count/i,
      /number of material/i,
      /how much material/i,
    ],
  },
  {
    intent: "low_stock_items",
    patterns: [
      /low.?stock/i,
      /running low/i,
      /need.?reorder/i,
      /below.?(threshold|minimum|min)/i,
      /stock.?alert/i,
      /out.?of.?stock/i,
      /critical.?stock/i,
    ],
  },
  {
    intent: "open_orders",
    patterns: [
      /open order/i,
      /pending order/i,
      /active order/i,
      /unfulfilled order/i,
      /order.?status/i,
      /how many order/i,
      /order.?count/i,
      /in.?production/i,
      /orders?.+due/i,
    ],
  },
  {
    intent: "best_suppliers",
    patterns: [
      /best supplier/i,
      /top supplier/i,
      /supplier.*(perform|rank|rate|reliab)/i,
      /(perform|rank|rate|reliab).*supplier/i,
      /on.?time.*(rate|deliver|supplier)/i,
      /(rate|deliver).*on.?time/i,
      /which supplier/i,
      /supplier.*deliver/i,
    ],
  },
  {
    intent: "product_capacity",
    patterns: [
      /product.*(capac|availab|produc)/i,
      /(capac|availab|produc).*product/i,
      /how many product/i,
      /active product/i,
      /product.+status/i,
      /production.+status/i,
      /what.*produc/i,
    ],
  },
];

export function classifyIntent(question: string): Intent {
  const q = question.trim();
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(q))) {
      return rule.intent;
    }
  }
  return "unknown";
}
