export interface PricedLine {
  portionId: string;
  addonIds: string[];
  itemId: string;
  name: string;
  portionName: string;
  quantity: number;
  unitPricePaise: number;
  prepMinutes: number;
  isVeg: boolean;
  allergens: string[];
  addons: { id: string; name: string; pricePaise: number }[];
}
export interface PriceSummary {
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  includedTaxPaise: number;
  cgstPaise: number;
  sgstPaise: number;
}
export interface QuoteSnapshot extends PriceSummary {
  items: PricedLine[];
  couponCode: string | null;
  provisionalMinutes: number;
  outletId: string;
}
export interface CheckoutQuote extends QuoteSnapshot {
  id: string;
  expiresAt: string;
}
