import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { getDatabase } from "../src/server/db/client";
import {
  demoAccounts,
  DEMO_PASSWORD,
  getOutletStaffCredentials,
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
        if ("outletId" in user && user.outletId)
          await transaction.outletMembership.upsert({
            where: {
              userId_outletId: { userId: user.id, outletId: user.outletId },
            },
            update: {},
            create: { userId: user.id, outletId: user.outletId },
          });
      }

      // Seed dedicated kitchen staff accounts for all fleet outlets
      for (const outlet of outlets) {
        const creds = getOutletStaffCredentials(outlet);
        const existingStaff = await transaction.user.findUnique({
          where: { email: creds.email },
        });
        const staffUserId = existingStaff?.id ?? `staff-${outlet.id}`;

        await transaction.user.upsert({
          where: { id: staffUserId },
          update: { role: "KITCHEN_STAFF" },
          create: {
            id: staffUserId,
            email: creds.email,
            name: creds.staffName,
            role: "KITCHEN_STAFF",
          },
        });

        await transaction.account.upsert({
          where: {
            providerId_accountId: {
              providerId: "credential",
              accountId: staffUserId,
            },
          },
          update: { password },
          create: {
            id: `credential-${staffUserId}`,
            accountId: staffUserId,
            providerId: "credential",
            userId: staffUserId,
            password,
          },
        });

        await transaction.outletMembership.upsert({
          where: {
            userId_outletId: { userId: staffUserId, outletId: outlet.id },
          },
          update: {},
          create: { userId: staffUserId, outletId: outlet.id },
        });
      }
      for (const item of menu) {
        const { portions, addons, ...details } = item;
        await transaction.menuItem.upsert({
          where: { id: item.id },
          update: details,
          create: details,
        });
        await transaction.menuItem.updateMany({
          where: { id: item.id, imageUrl: null },
          data: { imageUrl: item.imageUrl },
        });
        for (const portion of portions) {
          const { pricePaise, ...portionDetails } = portion;
          await transaction.menuPortion.upsert({
            where: { id: portion.id },
            update: portionDetails,
            create: { ...portionDetails, itemId: item.id },
          });
          await transaction.cityPrice.upsert({
            where: {
              portionId_city: { portionId: portion.id, city: "Hyderabad" },
            },
            update: { pricePaise },
            create: { portionId: portion.id, city: "Hyderabad", pricePaise },
          });
        }
        for (const addon of addons)
          await transaction.menuAddon.upsert({
            where: { id: addon.id },
            update: addon,
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
    },
    { timeout: 60_000 },
  );
  console.log(
    `Demo data ready: 17 outlets (14 dine-in + 3 cloud kitchens), ${menu.length} menu items, 5 accounts, and 0 initial orders across Hyderabad.`,
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
