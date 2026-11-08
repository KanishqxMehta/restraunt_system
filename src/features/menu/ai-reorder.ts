import "server-only";
import { GoogleGenAI } from "@google/genai";
import { getDatabase } from "@/server/db/client";

export interface ReorderSuggestion {
  itemId: string;
  name: string;
  category: string;
  imageUrl: string | null;
  isVeg: boolean;
  spiceLevel: number;
  reason: string;
}

export async function getCustomerReorderSuggestions(
  customerId: string,
  outletId?: string,
): Promise<{
  suggestions: ReorderSuggestion[];
  aiNote: string | null;
  noteSource: "GEMINI_AI" | "HISTORY_FALLBACK";
}> {
  const db = getDatabase();

  // Find customer's completed or paid orders
  const pastOrders = await db.order.findMany({
    where: {
      customerId,
      paymentStatus: "PAID",
    },
    select: {
      items: {
        select: {
          name: true,
          isVeg: true,
        },
      },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (pastOrders.length === 0) {
    return { suggestions: [], aiNote: null, noteSource: "HISTORY_FALLBACK" };
  }

  // Count dish frequencies
  const frequencies = new Map<string, { count: number; isVeg: boolean }>();
  for (const order of pastOrders) {
    for (const item of order.items) {
      const existing = frequencies.get(item.name) || { count: 0, isVeg: item.isVeg };
      frequencies.set(item.name, {
        count: existing.count + 1,
        isVeg: item.isVeg,
      });
    }
  }

  // Find corresponding active menu items
  const activeItems = await db.menuItem.findMany({
    where: {
      isActive: true,
      ...(outletId
        ? {
            availability: {
              some: { outletId, isAvailable: true },
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      category: true,
      imageUrl: true,
      isVeg: true,
      spiceLevel: true,
    },
  });

  // Match past favourites to active catalog
  const matched = activeItems.filter((item) => frequencies.has(item.name));
  matched.sort(
    (a, b) => (frequencies.get(b.name)?.count ?? 0) - (frequencies.get(a.name)?.count ?? 0),
  );

  const topItems = matched.slice(0, 3);
  if (topItems.length === 0) {
    return { suggestions: [], aiNote: null, noteSource: "HISTORY_FALLBACK" };
  }

  let aiNote: string | null = null;
  let noteSource: "GEMINI_AI" | "HISTORY_FALLBACK" = "HISTORY_FALLBACK";
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && topItems.length > 0) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const pastDishNames = Array.from(frequencies.keys()).slice(0, 5);
      const prompt = `A loyal restaurant customer frequently orders: ${pastDishNames.join(", ")}.
In 1 friendly, appetizing sentence (max 18 words), suggest a reorder for today. Do not output quotes.`;

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

      for (const modelToTry of candidateModels) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);

        try {
          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: prompt,
            config: {
              abortSignal: controller.signal,
            },
          });
          clearTimeout(timeout);
          const t = response.text?.trim();
          if (t) {
            aiNote = t;
            noteSource = "GEMINI_AI";
            break;
          }
        } catch {
          clearTimeout(timeout);
        }
      }

      if (!aiNote) {
        aiNote = `Based on your ${pastOrders.length} previous orders, here are your favourites ready to reorder.`;
      }
    } catch {
      aiNote = `Based on your ${pastOrders.length} previous orders, here are your favourites ready to reorder.`;
    }
  } else {
    aiNote = `Welcome back! Based on your recent orders, here are your favourites ready to reorder.`;
  }

  const suggestions: ReorderSuggestion[] = topItems.map((item) => ({
    itemId: item.id,
    name: item.name,
    category: item.category,
    imageUrl: item.imageUrl,
    isVeg: item.isVeg,
    spiceLevel: item.spiceLevel,
    reason: `Ordered ${frequencies.get(item.name)?.count ?? 1} time${(frequencies.get(item.name)?.count ?? 1) > 1 ? "s" : ""} recently`,
  }));

  return { suggestions, aiNote, noteSource };
}
