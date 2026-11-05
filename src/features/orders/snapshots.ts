import { z } from "zod";
const addonsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    pricePaise: z.number().int().nonnegative(),
  }),
);
export function snapshotAddons(value: unknown) {
  const result = addonsSchema.safeParse(value);
  return result.success ? result.data : [];
}
