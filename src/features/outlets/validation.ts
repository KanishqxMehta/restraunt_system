import { z } from "zod";

export const fssaiLicenseRegex = /^\d{14}$/;

export const createOutletSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and dashes")
      .optional(),
    city: z.string().trim().min(2, "City must be specified").max(50),
    address: z.string().trim().min(5, "Address must be at least 5 characters").max(200),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    deliveryRadiusKm: z.number().min(0.5, "Delivery radius must be at least 0.5 km").max(50),
    fssaiLicense: z
      .string()
      .trim()
      .regex(fssaiLicenseRegex, "FSSAI licence must be exactly 14 digits"),
    isCloudKitchen: z.boolean().default(false),
    minimumPrepMinutes: z.number().int().min(5).max(120).default(20),
    packingMinutes: z.number().int().min(1).max(30).default(5),
    kitchenCapacity: z.number().int().min(1).max(20).default(3),
    opensAtMinute: z.number().int().min(0).max(1439).default(0),
    closesAtMinute: z.number().int().min(1).max(1440).default(1440),
  })
  .refine((data) => data.opensAtMinute < data.closesAtMinute, {
    message: "Opening time must be earlier than closing time",
    path: ["closesAtMinute"],
  });

export const updateOutletSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    city: z.string().trim().min(2).max(50).optional(),
    address: z.string().trim().min(5).max(200).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    deliveryRadiusKm: z.number().min(0.5).max(50).optional(),
    fssaiLicense: z.string().trim().regex(fssaiLicenseRegex, "FSSAI licence must be 14 digits").optional(),
    isCloudKitchen: z.boolean().optional(),
    isActive: z.boolean().optional(),
    minimumPrepMinutes: z.number().int().min(5).max(120).optional(),
    packingMinutes: z.number().int().min(1).max(30).optional(),
    kitchenCapacity: z.number().int().min(1).max(20).optional(),
    opensAtMinute: z.number().int().min(0).max(1439).optional(),
    closesAtMinute: z.number().int().min(1).max(1440).optional(),
  })
  .refine(
    (data) => {
      if (data.opensAtMinute !== undefined && data.closesAtMinute !== undefined) {
        return data.opensAtMinute < data.closesAtMinute;
      }
      return true;
    },
    {
      message: "Opening time must be earlier than closing time",
      path: ["closesAtMinute"],
    },
  );

export type CreateOutletInput = z.infer<typeof createOutletSchema>;
export type UpdateOutletInput = z.infer<typeof updateOutletSchema>;
