export interface CateringRequirements {
  guestCount: number; // min 15, max 500
  vegPercentage: number; // 0 to 100
  biryaniChoice: "CHICKEN" | "MUTTON" | "MIXED";
  packageTier: "ROYAL_DAAWAT" | "NIZAMI_FEAST";
  eventDateTime: Date;
}

export interface CateringHandiItem {
  name: string;
  handiSizeKg: number;
  quantity: number;
  servesGuests: number;
  unitPricePaise: number;
  totalPricePaise: number;
  isVeg: boolean;
}

export interface CateringQuoteResult {
  guestCount: number;
  vegCount: number;
  nonVegCount: number;
  handis: CateringHandiItem[];
  accompaniments: string[];
  subtotalPaise: number;
  bulkDiscountPaise: number;
  totalPaise: number;
  includedTaxPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  leadTimeHours: number;
  isValidLeadTime: boolean;
  minLeadTimeHours: number;
}

export const MIN_CATERING_GUESTS = 15;
export const MAX_CATERING_GUESTS = 500;
export const MIN_LEAD_TIME_HOURS = 4;

export function validateCateringLeadTime(eventDateTime: Date, fromTime = new Date()): {
  isValid: boolean;
  leadTimeHours: number;
} {
  const diffMs = eventDateTime.getTime() - fromTime.getTime();
  const leadTimeHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  return {
    isValid: leadTimeHours >= MIN_LEAD_TIME_HOURS,
    leadTimeHours,
  };
}

export function calculateCateringQuote(req: CateringRequirements, fromTime = new Date()): CateringQuoteResult {
  const guests = Math.max(MIN_CATERING_GUESTS, Math.min(MAX_CATERING_GUESTS, req.guestCount));
  const vegPercent = Math.max(0, Math.min(100, req.vegPercentage));
  const vegCount = Math.round((guests * vegPercent) / 100);
  const nonVegCount = guests - vegCount;

  const { isValid: isValidLeadTime, leadTimeHours } = validateCateringLeadTime(req.eventDateTime, fromTime);

  const handis: CateringHandiItem[] = [];

  // 1 kg of dum biryani reliably serves ~2.5 to 3 guests with accompaniments
  // We package into authentic sealed 5 kg, 10 kg, and 20 kg clay dum handis
  function allocateHandis(targetGuests: number, itemName: string, pricePerGuestPaise: number, isVeg: boolean) {
    if (targetGuests <= 0) return;

    let remaining = targetGuests;
    while (remaining > 0) {
      if (remaining >= 40) {
        // 20 kg handi (serves 50)
        const qty = Math.floor(remaining / 50) || 1;
        const serves = qty * 50;
        handis.push({
          name: `${itemName} (20 kg Royal Handi)`,
          handiSizeKg: 20 * qty,
          quantity: qty,
          servesGuests: serves,
          unitPricePaise: 50 * pricePerGuestPaise,
          totalPricePaise: qty * (50 * pricePerGuestPaise),
          isVeg,
        });
        remaining -= serves;
      } else if (remaining >= 20) {
        // 10 kg handi (serves 25)
        const qty = Math.floor(remaining / 25) || 1;
        const serves = qty * 25;
        handis.push({
          name: `${itemName} (10 kg Feast Handi)`,
          handiSizeKg: 10 * qty,
          quantity: qty,
          servesGuests: serves,
          unitPricePaise: 25 * pricePerGuestPaise,
          totalPricePaise: qty * (25 * pricePerGuestPaise),
          isVeg,
        });
        remaining -= serves;
      } else {
        // 5 kg handi (serves 12-15)
        const serves = Math.max(12, remaining);
        handis.push({
          name: `${itemName} (5 kg Daawat Handi)`,
          handiSizeKg: 5,
          quantity: 1,
          servesGuests: serves,
          unitPricePaise: serves * pricePerGuestPaise,
          totalPricePaise: serves * pricePerGuestPaise,
          isVeg,
        });
        remaining = 0;
      }
    }
  }

  // Base pricing per guest (inclusive of 5% GST):
  // Veg: ₹280 / guest
  // Chicken: ₹360 / guest
  // Mutton: ₹480 / guest
  // Nizami Feast tier adds ₹80 / guest (additional Haleem/Starter & desserts)
  const tierAddonPaise = req.packageTier === "NIZAMI_FEAST" ? 8000 : 0;

  if (vegCount > 0) {
    const vegRate = 28000 + tierAddonPaise;
    allocateHandis(vegCount, "Nizami Subz Dum Biryani", vegRate, true);
  }

  if (nonVegCount > 0) {
    if (req.biryaniChoice === "MUTTON") {
      const muttonRate = 48000 + tierAddonPaise;
      allocateHandis(nonVegCount, "Kache Gosht Ki Mutton Dum Biryani", muttonRate, false);
    } else if (req.biryaniChoice === "MIXED") {
      const halfNonVeg = Math.ceil(nonVegCount / 2);
      allocateHandis(halfNonVeg, "Hyderabadi Chicken Dum Biryani", 36000 + tierAddonPaise, false);
      allocateHandis(nonVegCount - halfNonVeg, "Kache Gosht Ki Mutton Dum Biryani", 48000 + tierAddonPaise, false);
    } else {
      const chickenRate = 36000 + tierAddonPaise;
      allocateHandis(nonVegCount, "Hyderabadi Chicken Dum Biryani", chickenRate, false);
    }
  }

  const accompaniments = [
    "Mirchi Ka Salan (slow-simmered peanut & sesame gravy in clay earthen pot)",
    "Burani Dahi Raita (thick hung curd with roasted cumin and garlic)",
    "Shahi Double Ka Meetha (saffron-infused ghee bread pudding with pistachios)",
    "Clay Dum Handi Seals with live dough ring",
    "Eco-friendly serving ladles and disposable leaf platters",
  ];

  if (req.packageTier === "NIZAMI_FEAST") {
    accompaniments.unshift("Shahi Mutton Haleem or Paneer Tikka Platter");
    accompaniments.push("Royal Gulab Jamun steeped in rose cardamom syrup");
  }

  const subtotalPaise = handis.reduce((sum, h) => sum + h.totalPricePaise, 0);

  // Bulk discount for large celebrations: 5% off for 50+ guests, 8% off for 100+ guests
  let discountRate = 0;
  if (guests >= 100) {
    discountRate = 0.08;
  } else if (guests >= 50) {
    discountRate = 0.05;
  }

  const bulkDiscountPaise = Math.round(subtotalPaise * discountRate);
  const totalPaise = subtotalPaise - bulkDiscountPaise;

  // 5% Inclusive GST formula: tax = total - total / 1.05
  const includedTaxPaise = Math.round(totalPaise - totalPaise / 1.05);
  const cgstPaise = Math.floor(includedTaxPaise / 2);
  const sgstPaise = includedTaxPaise - cgstPaise;

  return {
    guestCount: guests,
    vegCount,
    nonVegCount,
    handis,
    accompaniments,
    subtotalPaise,
    bulkDiscountPaise,
    totalPaise,
    includedTaxPaise,
    cgstPaise,
    sgstPaise,
    leadTimeHours,
    isValidLeadTime,
    minLeadTimeHours: MIN_LEAD_TIME_HOURS,
  };
}
