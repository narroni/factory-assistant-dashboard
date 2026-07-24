/**
 * Parser for the assistant's raw model output.
 *
 * Splits the visible prose answer from the machine-readable ---ACTIONS--- block
 * and validates the proposal JSON's shape. Provider-independent — no imports
 * from ollama.ts or any provider. Moved verbatim from app/lib/ollama.ts.
 */

export type ActionProposal = {
  actionType: string;
  payload: Record<string, unknown>;
  reasoning: string;
};

/**
 * Marker that begins the machine-readable action block. Everything before it is
 * the visible prose answer; everything after is JSON. The streaming route uses
 * this to stop emitting visible tokens once the model starts the action block.
 */
export const ACTION_SEPARATOR = "---ACTIONS---";
const ACTION_SEPARATOR_END = "---END---";

export function parseProposals(raw: string): { answer: string; proposals: ActionProposal[] } {
  const idx = raw.indexOf(ACTION_SEPARATOR);
  if (idx === -1) return { answer: raw.trim(), proposals: [] };

  const answer  = raw.slice(0, idx).trim();
  const endIdx  = raw.indexOf(ACTION_SEPARATOR_END, idx);
  const jsonStr = endIdx === -1
    ? raw.slice(idx + ACTION_SEPARATOR.length).trim()
    : raw.slice(idx + ACTION_SEPARATOR.length, endIdx).trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const proposals: ActionProposal[] = Array.isArray(parsed) ? parsed : [];
    return { answer, proposals };
  } catch {
    console.warn("[ai/response-parser] action block parse failed:", jsonStr.slice(0, 200));
    return { answer, proposals: [] };
  }
}

/**
 * Turn a full raw assistant response into a visible answer + validated-shape proposals.
 * Shared by runCopilot() (non-streaming) and the streaming route, which accumulates the
 * raw text during streaming and finalizes here after the last token. When the model
 * returned only an action block with no prose, a brief confirmation is substituted.
 */
export function parseAssistantResponse(raw: string): { answer: string; proposals: ActionProposal[] } {
  const { answer: rawAnswer, proposals } = parseProposals(raw);
  const answer = rawAnswer || (proposals.length > 0
    ? `I've prepared ${proposals.length === 1 ? "an action proposal" : `${proposals.length} action proposals`} for your review. Please check the details below and approve if correct.`
    : "");
  return { answer, proposals };
}
