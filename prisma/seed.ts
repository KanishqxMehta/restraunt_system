import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { getDatabase } from "../src/server/db/client";
import {
  demoAccounts,
  DEMO_PASSWORD,
} from "../src/features/auth/demo-accounts";
import { menu, outlets } from "./seed-data";

async function seed() {
  if (process.env.ENABLE_DEMO_DATA !== "true")
    throw new Error(
      "Demo seeding requires ENABLE_DEMO_DATA=true. Do not enable on a real deployment.",
    );
  const db = getDatabase();
  const password = await hashPassword(DEMO_PASSWORD);
  await db.$transaction(
    async (transaction) => {
      for (const outlet of outlets) {
        await transaction.outlet.upsert({
          where: { id: outlet.id },
          update: {},
          create: outlet,
        });
      }
      for (const user of demoAccounts) {
        // Seed only missing identities. Restarts must never reset passwords or promote existing accounts.
        const existing = await transaction.user.findUnique({
          where: { email: user.email },
        });
        if (existing && existing.id !== user.id)
          throw new Error(
            "A demo email is already registered to another account; seed aborted.",
          );
        await transaction.user.upsert({
          where: { id: user.id },
          update: {},
          create: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        });
        await transaction.account.upsert({
          where: {
            providerId_accountId: {
              providerId: "credential",
              accountId: user.id,
            },
          },
          update: {},
          create: {
            id: `credential-${user.id}`,
            accountId: user.id,
            providerId: "credential",
            userId: user.id,
            password,
          },
        });
        if ("outletId" in user)
          await transaction.outletMembership.upsert({
            where: {
              userId_outletId: { userId: user.id, outletId: user.outletId },
            },
            update: {},
            create: { userId: user.id, outletId: user.outletId },
          });
      }
      for (const item of menu) {
        const { portions, addons, ...details } = item;
        await transaction.menuItem.upsert({
          where: { id: item.id },
          update: {},
          create: details,
        });
        // Backfill only missing photos when upgrading an existing demo database.
        await transaction.menuItem.updateMany({
          where: { id: item.id, imageUrl: null },
          data: { imageUrl: item.imageUrl },
        });
        for (const portion of portions) {
          const { pricePaise, ...details } = portion;
          await transaction.menuPortion.upsert({
            where: { id: portion.id },
            update: {},
            create: { ...details, itemId: item.id },
          });
          await transaction.cityPrice.upsert({
            where: {
              portionId_city: { portionId: portion.id, city: "Hyderabad" },
            },
            update: {},
            create: { portionId: portion.id, city: "Hyderabad", pricePaise },
          });
        }
        for (const addon of addons)
          await transaction.menuAddon.upsert({
            where: { id: addon.id },
            update: {},
            create: { ...addon, itemId: item.id },
          });
        for (const outlet of outlets)
          await transaction.outletAvailability.upsert({
            where: {
              outletId_itemId: { outletId: outlet.id, itemId: item.id },
            },
            update: {},
            create: { outletId: outlet.id, itemId: item.id },
          });
      }
      await transaction.coupon.upsert({
        where: { code: "DIRECT10" },
        update: {},
        create: {
          code: "DIRECT10",
          discountType: "PERCENT",
          value: 10,
          minOrderPaise: 30000,
          maxDiscountPaise: 10000,
          startsAt: new Date("2020-01-01T00:00:00Z"),
          expiresAt: new Date("2099-01-01T00:00:00Z"),
        },
      });
      // Keep the brief's IDs/items/totals. Relative timestamps keep the first demo run inspectable.
      const now = Date.now();
      const samples = [
        {
          id: "order-web-778120",
          orderNumber: "WEB-778120",
          customerId: "demo-customer",
          outletId: "outlet-kondapur",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 118000,
          placedMinutesAgo: 25,
          promiseMinutesFromNow: 20,
          items: [
            {
              name: "Chicken dum biryani",
              portionName: "Family pack",
              quantity: 1,
              unitPricePaise: 94000,
              prepMinutes: 20,
              isVeg: false,
              allergens: ["Milk"],
            },
            {
              name: "Double ka meetha",
              portionName: "Regular",
              quantity: 2,
              unitPricePaise: 12000,
              prepMinutes: 5,
              isVeg: true,
              allergens: ["Wheat", "Milk", "Tree nuts"],
            },
          ],
        },
        {
          id: "order-web-778131",
          orderNumber: "WEB-778131",
          customerId: "demo-customer",
          outletId: "outlet-gachibowli",
          status: "READY" as const,
          paymentMethod: "CARD" as const,
          totalPaise: 64000,
          placedMinutesAgo: 39,
          promiseMinutesFromNow: 1,
          items: [
            {
              name: "Veg biryani",
              portionName: "Regular",
              quantity: 2,
              unitPricePaise: 25000,
              prepMinutes: 15,
              isVeg: true,
              allergens: ["Milk"],
            },
            {
              name: "Mirchi ka salan",
              portionName: "Regular",
              quantity: 1,
              unitPricePaise: 14000,
              prepMinutes: 8,
              isVeg: true,
              allergens: ["Peanuts", "Sesame"],
            },
          ],
        },
        {
          id: "order-web-778146",
          orderNumber: "WEB-778146",
          customerId: "demo-customer-two",
          outletId: "outlet-kukatpally",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 105000,
          placedMinutesAgo: 54,
          promiseMinutesFromNow: -4,
          items: [
            {
              name: "Mutton haleem",
              portionName: "Regular",
              quantity: 3,
              unitPricePaise: 35000,
              prepMinutes: 12,
              isVeg: false,
              allergens: ["Wheat", "Milk"],
            },
          ],
        },
      ];
      for (const sample of samples) {
        const { items, placedMinutesAgo, promiseMinutesFromNow, ...details } =
          sample;
        const promisedReadyAt = new Date(now + promiseMinutesFromNow * 60_000);
        const createdAt = new Date(now - placedMinutesAgo * 60_000);
        await transaction.order.upsert({
          where: { id: sample.id },
          update: {},
          create: {
            ...details,
            paymentStatus: "PAID",
            includedTaxPaise: Math.round((sample.totalPaise * 5) / 105),
            subtotalPaise: sample.totalPaise,
            promisedReadyAt,
            originalPromiseAt: promisedReadyAt,
            createdAt,
            items: { create: items },
            events: {
              create: [
                { status: "NEW", createdAt },
                {
                  status: sample.status,
                  createdAt: new Date(createdAt.getTime() + 60_000),
                },
              ],
            },
          },
        });
      }
    },
    { timeout: 30_000 },
  );
  console.log(
    "Demo data ready: 3 outlets, 5 menu items, 5 accounts and 3 sample orders. Existing records preserved.",
  );
}

seed()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await getDatabase().$disconnect();
  });
