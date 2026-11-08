import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const geminiPredictionSchema = z.object({
  estimatedMinutes: z.number().int().min(5).max(180),
  explanation: z.string().min(5).max(400),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]).default("HIGH"),
});

export interface OrderItemPrepInput {
  name: string;
  portionName: string;
  quantity: number;
  prepMinutes: number;
  isVeg: boolean;
}

export interface OutletPrepInfo {
  id: string;
  name: string;
  minimumPrepMinutes: number;
  packingMinutes: number;
}

export interface KitchenLoadSnapshot {
  activeTicketCount: number;
  activeItemCount: number;
  activeOrderNumbers: string[];
}

export interface PrepEstimateResult {
  aiEstimatedMinutes: number;
  promisedMinutes: number;
  explanation: string;
  estimateSource: "GEMINI_AI" | "HEURISTIC_LOAD" | "GEMINI_FALLBACK";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  activeTicketCount: number;
}

/**
 * Deterministic heuristic load calculation used as baseline and fallback.
 */
export function calculateHeuristicPrep(
  orderItems: OrderItemPrepInput[],
  outlet: OutletPrepInfo,
  load: KitchenLoadSnapshot,
): { minutes: number; explanation: string } {
  const maxBasePrep =
    orderItems.length > 0
      ? Math.max(...orderItems.map((i) => i.prepMinutes))
      : outlet.minimumPrepMinutes;

  const totalQuantity = orderItems.reduce((acc, i) => acc + i.quantity, 0);
  const quantityBuffer = Math.min(10, Math.max(0, (totalQuantity - 1) * 2));
  const queueDelay = Math.min(25, load.activeTicketCount * 3);

  const estimated = maxBasePrep + quantityBuffer + queueDelay;
  const explanation =
    load.activeTicketCount > 0
      ? `Queue buffer applied (${load.activeTicketCount} active tickets, +${queueDelay}m) on base prep (${maxBasePrep}m).`
      : `Standard line preparation with ${totalQuantity} items.`;

  return { minutes: estimated, explanation };
}

/**
 * Core estimation function:
 * 1. Calls Gemini if GEMINI_API_KEY is configured (with a 3.5s timeout).
 * 2. Falls back to deterministic load model if Gemini is unconfigured or fails.
 * 3. Enforces the brief constraint: promisedMinutes = max(aiEstimate, outletMinimum) + packingMinutes.
 */
export async function predictKitchenPrepTime(
  orderItems: OrderItemPrepInput[],
  outlet: OutletPrepInfo,
  load: KitchenLoadSnapshot,
): Promise<PrepEstimateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const preferredModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const candidateModels = Array.from(
    new Set([
      preferredModel,
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
    ]),
  );

  let aiMinutes: number;
  let explanation: string;
  let estimateSource: "GEMINI_AI" | "HEURISTIC_LOAD" | "GEMINI_FALLBACK" =
    "HEURISTIC_LOAD";
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "HIGH";

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are an expert kitchen expediter and culinary operations AI for Company A, a high-volume Hyderabadi restaurant chain.
Estimate the realistic preparation time (in integer minutes) for a new order given the current live kitchen load.

OUTLET DETAILS:
- Outlet: ${outlet.name}
- Configured minimum kitchen prep time: ${outlet.minimumPrepMinutes} minutes
- Order packing time: ${outlet.packingMinutes} minutes

CURRENT LIVE KITCHEN LOAD:
- Active tickets currently in prep: ${load.activeTicketCount}
- Active dishes being cooked across line: ${load.activeItemCount}
- Order queue: ${load.activeOrderNumbers.join(", ") || "None (clean station)"}

NEW ORDER ITEMS:
${orderItems.map((i) => `- ${i.quantity}x ${i.name} (${i.portionName}) [base prep: ${i.prepMinutes}m]`).join("\n")}

OPERATIONAL GUIDELINES:
- In Hyderabadi dum cooking, biryanis share dum pots if ready; multiple stations (biryani, sides, desserts) operate in parallel.
- Kitchen queue delay scales with active tickets: each active ticket in front adds queuing/plating latency (approx 2-4 minutes).
- Return an honest estimate for kitchen preparation (excluding packing).

Respond strictly with valid JSON with these keys:
{
  "estimatedMinutes": <integer minutes between 5 and 180>,
  "explanation": "<short 1-2 sentence culinary explanation>",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}`;

      let rawText: string | null = null;
      let lastError: unknown = null;

      for (const modelToTry of candidateModels) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        try {
          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              abortSignal: controller.signal,
            },
          });
          clearTimeout(timeout);
          const t = response.text?.trim();
          if (t) {
            rawText = t;
            break;
          }
        } catch (err) {
          clearTimeout(timeout);
          lastError = err;
          // Continue to next candidate model
        }
      }

      if (rawText) {
        const parsed = geminiPredictionSchema.parse(JSON.parse(rawText));
        aiMinutes = parsed.estimatedMinutes;
        explanation = parsed.explanation;
        estimateSource = "GEMINI_AI";
        confidence = parsed.confidence;
      } else {
        throw lastError || new Error("No response from candidate Gemini models");
      }
    } catch {
      const fallback = calculateHeuristicPrep(orderItems, outlet, load);
      aiMinutes = fallback.minutes;
      explanation = `Gemini fallback: ${fallback.explanation}`;
      estimateSource = "GEMINI_FALLBACK";
      confidence = "MEDIUM";
    }
  } else {
    const fallback = calculateHeuristicPrep(orderItems, outlet, load);
    aiMinutes = fallback.minutes;
    explanation = fallback.explanation;
    estimateSource = "HEURISTIC_LOAD";
    confidence = "HIGH";
  }

  // Brief constraint: "the promised time is the higher of the AI estimate and the outlet's minimum"
  const effectivePrep = Math.max(aiMinutes, outlet.minimumPrepMinutes);
  const promisedMinutes = effectivePrep + outlet.packingMinutes;

  console.log("[AI Prep Estimation]", {
    aiEstimatedMinutes: aiMinutes,
    promisedMinutes,
    explanation,
    estimateSource,
    confidence,
    activeTicketCount: load.activeTicketCount,
  });

  return {
    aiEstimatedMinutes: aiMinutes,
    promisedMinutes,
    explanation,
    estimateSource,
    confidence,
    activeTicketCount: load.activeTicketCount,
  };
}
