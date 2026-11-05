import { describe, expect, it } from "vitest";
import {
  distanceKm,
  eligibleOutlets,
  isOpenAt,
  locationSchema,
} from "@/features/outlets/serviceability";
const location = { latitude: 17.4622, longitude: 78.3568 };
const outlet = {
  ...location,
  id: "near",
  isActive: true,
  deliveryRadiusKm: 5,
  opensAtMinute: 0,
  closesAtMinute: 1440,
};
const now = new Date("2026-11-04T12:00:00Z");
describe("delivery routing", () => {
  it("measures identical pins as zero distance", () => {
    expect(distanceKm(location, location)).toBe(0);
  });
  it("sorts overlapping outlets by distance", () => {
    expect(
      eligibleOutlets(
        [{ ...outlet, id: "far", latitude: 17.48 }, outlet],
        location,
        now,
      ).map((entry) => entry.id),
    ).toEqual(["near", "far"]);
  });
  it("excludes inactive, closed and out-of-radius outlets", () => {
    expect(
      eligibleOutlets(
        [
          { ...outlet, isActive: false },
          { ...outlet, opensAtMinute: 0, closesAtMinute: 1 },
          { ...outlet, latitude: 18 },
        ],
        location,
        now,
      ),
    ).toEqual([]);
  });
  it("accepts a point exactly on the radius boundary", () => {
    const point = {
      latitude: location.latitude + 0.01,
      longitude: location.longitude,
    };
    const radius = distanceKm(location, point);
    expect(
      eligibleOutlets(
        [{ ...outlet, ...point, deliveryRadiusKm: radius }],
        location,
        now,
      ),
    ).toHaveLength(1);
  });
  it("supports overnight hours and exclusive closing times in IST", () => {
    expect(isOpenAt(1320, 120, new Date("2026-11-04T18:00:00Z"))).toBe(true);
    expect(isOpenAt(1320, 120, new Date("2026-11-04T20:30:00Z"))).toBe(false);
    expect(isOpenAt(600, 600, now)).toBe(false);
  });
  it("rejects non-finite and out-of-bounds coordinates", () => {
    expect(
      locationSchema.safeParse({ latitude: 91, longitude: 0 }).success,
    ).toBe(false);
    expect(
      locationSchema.safeParse({ latitude: NaN, longitude: 0 }).success,
    ).toBe(false);
  });
});
