import { z } from "zod";
import { calculateCateringQuote } from "@/features/catering/calculator";
import { apiError, HttpError } from "@/server/http/errors";

const quoteRequestSchema = z.object({
  guestCount: z.number().int().min(15).max(500),
  vegPercentage: z.number().min(0).max(100),
  biryaniChoice: z.enum(["CHICKEN", "MUTTON", "MIXED"]),
  packageTier: z.enum(["ROYAL_DAAWAT", "NIZAMI_FEAST"]),
  eventDateTime: z.string().datetime(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = quoteRequestSchema.safeParse(json);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || "Invalid quote parameters.");
    }

    const eventDate = new Date(parsed.data.eventDateTime);
    const quote = calculateCateringQuote({
      ...parsed.data,
      eventDateTime: eventDate,
    });

    return Response.json({ quote });
  } catch (err) {
    return apiError(err);
  }
}
