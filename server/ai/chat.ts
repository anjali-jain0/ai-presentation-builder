import { GoogleGenAI, Content, Part } from "@google/genai";
import { Deck } from "../../src/types/deck";
import { TOOL_DECLARATIONS } from "./toolDeclarations";
import { toolCallToOp, ToolCallError } from "./applyTools";
import { buildSystemInstruction, UserSelection } from "./systemPrompt";
import { applyDeckOp } from "../../src/store/ops";

export type ChatEvent =
  | { type: "text"; value: string }
  | { type: "op"; op: unknown }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const MAX_ROUNDS = 12;
const MAX_CALLS_PER_TURN = 60;

// hard-enforces two-phase gen: element-creation calls get rejected until the
// outline is actually done (this round added no new slides, and at least
// one exists already). handles multi-round outlines too, not just round 0
const ELEMENT_CREATION_TOOLS = new Set([
  "add_text_element",
  "add_image_element",
  "add_shape_element",
  "add_table_element",
  "add_chart",
]);

export async function streamChat(
  apiKey: string,
  messages: ChatMessage[],
  deck: Deck,
  onEvent: (e: ChatEvent) => void,
  selection?: UserSelection
) {
  const ai = new GoogleGenAI({ apiKey });

  // working copy so ids created mid-turn are resolvable by later tool calls
  const workingDeck: Deck = JSON.parse(JSON.stringify(deck));
  let outlinePhaseActive = workingDeck.slides.length === 0;

  const history: Content[] = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  let totalCalls = 0;

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const stream = await withRetry(() =>
        ai.models.generateContentStream({
          model: MODEL,
          contents: history,
          config: {
            systemInstruction: buildSystemInstruction(workingDeck, selection),
            tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
            temperature: 0.4,
          },
        })
      );

      const modelParts: Part[] = [];
      const pendingCalls: { name: string; args: any }[] = [];
      // gemini 3 only signs the first functionCall in a batch but wants every
      // one signed when echoed back. just reuse the one signature we got
      let lastThoughtSignature: string | undefined;

      for await (const chunk of stream) {
        const parts = chunk.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.thought) continue; // internal reasoning; never shown to the user
          if (part.text) {
            onEvent({ type: "text", value: part.text });
            modelParts.push({ text: part.text });
          }
          if (part.functionCall) {
            lastThoughtSignature = part.thoughtSignature ?? lastThoughtSignature;
            modelParts.push({ functionCall: part.functionCall, thoughtSignature: lastThoughtSignature });
            pendingCalls.push({ name: part.functionCall.name ?? "", args: part.functionCall.args ?? {} });
          }
        }
      }

      if (modelParts.length > 0) {
        history.push({ role: "model", parts: modelParts });
      }

      if (pendingCalls.length === 0) {
        break; // model produced a final text-only response; turn is complete
      }

      // checked before processing this round's calls, so the gate opens in time for them
      const addSlideCallsThisRound = pendingCalls.filter((c) => c.name === "add_slide").length;
      if (outlinePhaseActive && addSlideCallsThisRound === 0 && workingDeck.slides.length > 0) {
        outlinePhaseActive = false;
      }

      const responseParts: Part[] = [];
      for (const call of pendingCalls) {
        totalCalls++;
        if (totalCalls > MAX_CALLS_PER_TURN) {
          responseParts.push({
            functionResponse: { name: call.name, response: { status: "error", error: "Tool call budget exceeded for this turn." } },
          });
          continue;
        }
        if (outlinePhaseActive && ELEMENT_CREATION_TOOLS.has(call.name)) {
          responseParts.push({
            functionResponse: {
              name: call.name,
              response: {
                status: "error",
                error:
                  "The outline isn't finished yet -- finish calling add_slide for every planned slide FIRST, then retry this element-creation call in a later round.",
              },
            },
          });
          continue;
        }
        try {
          const { op, responsePayload } = toolCallToOp(call.name, call.args, workingDeck);
          applyDeckOp(workingDeck, op);
          onEvent({ type: "op", op });
          responseParts.push({ functionResponse: { name: call.name, response: responsePayload } });
        } catch (err) {
          const message = err instanceof ToolCallError ? err.message : "Tool call failed.";
          responseParts.push({ functionResponse: { name: call.name, response: { status: "error", error: message } } });
        }
      }
      history.push({ role: "user", parts: responseParts });
    }

    onEvent({ type: "done" });
  } catch (err: any) {
    onEvent({ type: "error", message: friendlyErrorMessage(err) });
  }
}

const RETRYABLE = /"code":\s*503|UNAVAILABLE|overloaded|high demand/i;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// flash-lite free tier throws a transient 503 sometimes, just retry with backoff
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (!RETRYABLE.test(String(err?.message ?? "")) || i === attempts - 1) throw err;
      await sleep(1000 * Math.pow(2, i)); // 1s, 2s, 4s
    }
  }
  throw lastErr;
}

// err.message from the SDK is often stringified JSON, sometimes nested
// twice -- just dig out the actual message so the chat UI isn't showing raw JSON
function friendlyErrorMessage(err: any): string {
  const raw = String(err?.message ?? "AI request failed.");
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      let parsed = JSON.parse(match[0]);
      if (typeof parsed.error?.message === "string" && parsed.error.message.trim().startsWith("{")) {
        parsed = JSON.parse(parsed.error.message);
      }
      const message = parsed.error?.message;
      const status = parsed.error?.status;
      if (message) {
        if (status === "UNAVAILABLE" || status === "RESOURCE_EXHAUSTED") {
          return `The AI model is temporarily overloaded or rate-limited. Please wait a moment and try again. (${message})`;
        }
        return message;
      }
    }
  } catch {
    // fall through to raw message
  }
  return raw;
}
