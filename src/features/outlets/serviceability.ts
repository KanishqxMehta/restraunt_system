import { z } from "zod";
export const locationSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();
export type Location = z.infer<typeof locationSchema>;
export function distanceKm(a: Location, b: Location): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const latitude = rad(b.latitude - a.latitude);
  const longitude = rad(b.longitude - a.longitude);
  const arc =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(longitude / 2) ** 2;
  return (
    6371 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, arc)), Math.sqrt(Math.max(0, 1 - arc)))
  );
}
export function isOpenAt(
  opensAtMinute: number,
  closesAtMinute: number,
  now: Date,
): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const minute =
    Number(parts.find((p) => p.type === "hour")?.value) * 60 +
    Number(parts.find((p) => p.type === "minute")?.value);
  if (opensAtMinute === 0 && closesAtMinute === 1440) return true;
  if (opensAtMinute === closesAtMinute) return false;
  return opensAtMinute < closesAtMinute
    ? minute >= opensAtMinute && minute < closesAtMinute
    : minute >= opensAtMinute || minute < closesAtMinute;
}
export function eligibleOutlets<
  T extends Location & {
    id: string;
    isActive: boolean;
    deliveryRadiusKm: number;
    opensAtMinute: number;
    closesAtMinute: number;
  },
>(outlets: T[], location: Location, now: Date) {
  return outlets
    .map((outlet) => ({ ...outlet, distanceKm: distanceKm(location, outlet) }))
    .filter(
      (outlet) =>
        outlet.isActive &&
        isOpenAt(outlet.opensAtMinute, outlet.closesAtMinute, now) &&
        outlet.distanceKm <= outlet.deliveryRadiusKm,
    )
    .sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
}
