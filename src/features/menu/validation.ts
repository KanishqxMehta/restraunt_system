import { z } from "zod";

export const cityPriceInputSchema = z.object({
  city: z.string().trim().min(2, "City name must be at least 2 characters").max(60),
  pricePaise: z
    .number()
    .int("Price must be an integer in paise")
    .min(0, "Price cannot be negative")
    .max(5000000, "Price exceeds allowable maximum"),
});

export const portionInputSchema = z.object({
  name: z.string().trim().min(1, "Portion name required").max(60),
  prepMinutesOverride: z.number().int().min(1).max(180).nullable().optional(),
  prices: z.array(cityPriceInputSchema).min(1, "At least one city price is required"),
});

export const addonInputSchema = z.object({
  name: z.string().trim().min(1, "Add-on name required").max(60),
  pricePaise: z.number().int().min(0).max(1000000),
  extraPrepMinutes: z.number().int().min(0).max(60).default(0),
  allergens: z.array(z.string().trim().max(40)).default([]),
});

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(2, "Dish name must be at least 2 characters").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens")
    .optional(),
  category: z.string().trim().min(2, "Category is required").max(50),
  description: z.string().trim().min(3, "Description must be at least 3 characters").max(600),
  imageUrl: z.string().trim().max(2048).nullable().optional(),
  isVeg: z.boolean(),
  allergens: z.array(z.string().trim().max(40)).default([]),
  spiceLevel: z.number().int().min(0).max(3).default(1),
  basePrepMinutes: z.number().int().min(1, "Base prep time must be at least 1 minute").max(180),
  prepStation: z.string().trim().min(1).max(40).default("MAIN"),
  batchCapacity: z.number().int().min(1).max(50).default(1),
  isActive: z.boolean().default(false),
  availableFromMinute: z.number().int().min(0).max(1440).nullable().optional(),
  availableToMinute: z.number().int().min(0).max(1440).nullable().optional(),
  portions: z.array(portionInputSchema).min(1, "At least one portion must be provided"),
  addons: z.array(addonInputSchema).default([]),
});

export const updateMenuItemSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  category: z.string().trim().min(2).max(50).optional(),
  description: z.string().trim().min(3).max(600).optional(),
  imageUrl: z.string().trim().max(2048).nullable().optional(),
  isVeg: z.boolean().optional(),
  allergens: z.array(z.string().trim().max(40)).optional(),
  spiceLevel: z.number().int().min(0).max(3).optional(),
  basePrepMinutes: z.number().int().min(1).max(180).optional(),
  prepStation: z.string().trim().min(1).max(40).optional(),
  batchCapacity: z.number().int().min(1).max(50).optional(),
  availableFromMinute: z.number().int().min(0).max(1440).nullable().optional(),
  availableToMinute: z.number().int().min(0).max(1440).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateAvailabilitySchema = z.object({
  outletId: z.string().trim().min(1, "Outlet ID is required"),
  isAvailable: z.boolean(),
});

export const updatePortionPricesSchema = z.object({
  portionId: z.string().trim().min(1, "Portion ID is required"),
  prices: z.array(cityPriceInputSchema).min(1, "At least one city price is required"),
});

export const pauseItemStockSchema = z.object({
  itemId: z.string().trim().min(1, "Item ID is required"),
  outletId: z.string().trim().min(1, "Outlet ID is required"),
  isAvailable: z.boolean(),
});
