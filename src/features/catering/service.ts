import "server-only";
import { requireRole, type Viewer } from "@/features/auth/policy";
import { serializable } from "@/server/db/transaction";
import { HttpError } from "@/server/http/errors";
import { calculateCateringQuote } from "./calculator";
import { dispatchOrderNotifications } from "@/features/notifications/dispatcher";

export interface CreateCateringOrderInput {
  outletId: string;
  guestCount: number;
  vegPercentage: number;
  biryaniChoice: "CHICKEN" | "MUTTON" | "MIXED";
  packageTier: "ROYAL_DAAWAT" | "NIZAMI_FEAST";
  eventDateTime: string;
  deliveryAddress: string;
  specialInstructions?: string;
}

export async function createCateringOrder(
  viewer: Viewer,
  input: CreateCateringOrderInput,
) {
  requireRole(viewer, ["CUSTOMER"]);

  if (!input.outletId) throw new HttpError(400, "Please select an outlet for catering.");
  if (!input.deliveryAddress || input.deliveryAddress.trim().length < 10) {
    throw new HttpError(400, "Delivery address must be at least 10 characters.");
  }

  const eventDate = new Date(input.eventDateTime);
  if (isNaN(eventDate.getTime())) {
    throw new HttpError(400, "Invalid event date and time.");
  }

  const quote = calculateCateringQuote({
    guestCount: input.guestCount,
    vegPercentage: input.vegPercentage,
    biryaniChoice: input.biryaniChoice,
    packageTier: input.packageTier,
    eventDateTime: eventDate,
  });

  if (!quote.isValidLeadTime) {
    throw new HttpError(
      400,
      `Catering orders require at least ${quote.minLeadTimeHours} hours preparation lead time. Selected event is in ${quote.leadTimeHours} hours.`,
    );
  }

  const result = await serializable(async (transaction) => {
    const outlet = await transaction.outlet.findUnique({
      where: { id: input.outletId },
      select: { id: true, name: true, city: true },
    });
    if (!outlet) throw new HttpError(404, "Selected outlet not found.");

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `CAT-${Math.floor(1000 + Math.random() * 9000)}-${randomSuffix}`;

    const order = await transaction.order.create({
      data: {
        orderNumber,
        customerId: viewer.id,
        outletId: outlet.id,
        status: "NEW",
        paymentStatus: "PAID",
        paymentMethod: "UPI",
        totalPaise: quote.totalPaise,
        subtotalPaise: quote.subtotalPaise,
        discountPaise: quote.bulkDiscountPaise,
        includedTaxPaise: quote.includedTaxPaise,
        promisedReadyAt: eventDate,
        originalPromiseAt: eventDate,
        estimateSource: "CATERING_SCHEDULED",
        aiExplanation: `Party catering for ${quote.guestCount} guests scheduled for ${eventDate.toLocaleDateString("en-IN")}.`,
        isCatering: true,
        guestCount: quote.guestCount,
        eventDate,
        specialInstructions: input.specialInstructions?.trim() || null,
        deliveryAddress: input.deliveryAddress.trim(),
        items: {
          create: quote.handis.map((handi) => ({
            name: handi.name,
            portionName: `${handi.handiSizeKg} kg Handi (serves ~${handi.servesGuests})`,
            quantity: handi.quantity,
            unitPricePaise: handi.unitPricePaise,
            prepMinutes: 180, // Extended catering batch preparation
            isVeg: handi.isVeg,
            allergens: ["Milk"],
            addons: JSON.stringify(quote.accompaniments.slice(0, 3)),
          })),
        },
        events: {
          create: {
            status: "NEW",
            actorId: viewer.id,
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    return order;
  });

  void dispatchOrderNotifications(result.id, "ORDER_CONFIRMED");

  return result;
}
