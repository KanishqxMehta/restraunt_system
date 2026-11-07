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

      const now = Date.now();
      const samples = [
        // --- Kondapur Outlets ---
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
            { name: "Chicken dum biryani", portionName: "Family pack", quantity: 1, unitPricePaise: 94000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
            { name: "Double ka meetha", portionName: "Regular", quantity: 2, unitPricePaise: 12000, prepMinutes: 5, isVeg: true, allergens: ["Wheat", "Milk", "Tree nuts"] },
          ],
        },
        {
          id: "order-web-778150",
          orderNumber: "WEB-778150",
          customerId: "demo-customer",
          outletId: "outlet-kondapur",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 89000,
          placedMinutesAgo: 58,
          promiseMinutesFromNow: -14, // Critical Late by 14m!
          items: [
            { name: "Mutton haleem", portionName: "Regular", quantity: 2, unitPricePaise: 35000, prepMinutes: 12, isVeg: false, allergens: ["Wheat", "Milk"] },
            { name: "Double ka meetha", portionName: "Regular", quantity: 1, unitPricePaise: 12000, prepMinutes: 5, isVeg: true, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778151",
          orderNumber: "WEB-778151",
          customerId: "demo-customer",
          outletId: "outlet-kondapur",
          status: "NEW" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 54000,
          placedMinutesAgo: 4,
          promiseMinutesFromNow: 26,
          items: [
            { name: "Chicken dum biryani", portionName: "Regular", quantity: 1, unitPricePaise: 40000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
            { name: "Mirchi ka salan", portionName: "Regular", quantity: 1, unitPricePaise: 14000, prepMinutes: 8, isVeg: true, allergens: ["Peanuts"] },
          ],
        },
        {
          id: "order-web-778152",
          orderNumber: "WEB-778152",
          customerId: "demo-customer-two",
          outletId: "outlet-kondapur",
          status: "NEW" as const,
          paymentMethod: "CARD" as const,
          totalPaise: 75000,
          placedMinutesAgo: 2,
          promiseMinutesFromNow: 28,
          items: [
            { name: "Veg biryani", portionName: "Family pack", quantity: 1, unitPricePaise: 65000, prepMinutes: 18, isVeg: true, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778153",
          orderNumber: "WEB-778153",
          customerId: "demo-customer",
          outletId: "outlet-kondapur",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 62000,
          placedMinutesAgo: 16,
          promiseMinutesFromNow: 14,
          items: [
            { name: "Chicken dum biryani", portionName: "Regular", quantity: 1, unitPricePaise: 40000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
            { name: "Double ka meetha", portionName: "Regular", quantity: 1, unitPricePaise: 12000, prepMinutes: 5, isVeg: true, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778154",
          orderNumber: "WEB-778154",
          customerId: "demo-customer-two",
          outletId: "outlet-kondapur",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 105000,
          placedMinutesAgo: 22,
          promiseMinutesFromNow: 8,
          items: [
            { name: "Mutton haleem", portionName: "Regular", quantity: 3, unitPricePaise: 35000, prepMinutes: 12, isVeg: false, allergens: ["Wheat", "Milk"] },
          ],
        },
        {
          id: "order-web-778155",
          orderNumber: "WEB-778155",
          customerId: "demo-customer",
          outletId: "outlet-kondapur",
          status: "PREPARING" as const,
          paymentMethod: "CARD" as const,
          totalPaise: 94000,
          placedMinutesAgo: 28,
          promiseMinutesFromNow: 4,
          items: [
            { name: "Chicken dum biryani", portionName: "Family pack", quantity: 1, unitPricePaise: 94000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778156",
          orderNumber: "WEB-778156",
          customerId: "demo-customer-two",
          outletId: "outlet-kondapur",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 80000,
          placedMinutesAgo: 12,
          promiseMinutesFromNow: 18,
          items: [
            { name: "Chicken dum biryani", portionName: "Regular", quantity: 2, unitPricePaise: 40000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778157",
          orderNumber: "WEB-778157",
          customerId: "demo-customer",
          outletId: "outlet-kondapur",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 50000,
          placedMinutesAgo: 15,
          promiseMinutesFromNow: 15,
          items: [
            { name: "Veg biryani", portionName: "Regular", quantity: 2, unitPricePaise: 25000, prepMinutes: 15, isVeg: true, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778158",
          orderNumber: "WEB-778158",
          customerId: "demo-customer-two",
          outletId: "outlet-kondapur",
          status: "PREPARING" as const,
          paymentMethod: "CARD" as const,
          totalPaise: 70000,
          placedMinutesAgo: 19,
          promiseMinutesFromNow: 11,
          items: [
            { name: "Mutton haleem", portionName: "Regular", quantity: 2, unitPricePaise: 35000, prepMinutes: 12, isVeg: false, allergens: ["Wheat", "Milk"] },
          ],
        },
        {
          id: "order-web-778159",
          orderNumber: "WEB-778159",
          customerId: "demo-customer",
          outletId: "outlet-kondapur",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 114000,
          placedMinutesAgo: 24,
          promiseMinutesFromNow: 6,
          items: [
            { name: "Chicken dum biryani", portionName: "Family pack", quantity: 1, unitPricePaise: 94000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
            { name: "Double ka meetha", portionName: "Regular", quantity: 1, unitPricePaise: 12000, prepMinutes: 5, isVeg: true, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778160",
          orderNumber: "WEB-778160",
          customerId: "demo-customer",
          outletId: "outlet-kondapur",
          status: "READY" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 80000,
          placedMinutesAgo: 38,
          promiseMinutesFromNow: 2,
          items: [
            { name: "Chicken dum biryani", portionName: "Regular", quantity: 2, unitPricePaise: 40000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778161",
          orderNumber: "WEB-778161",
          customerId: "demo-customer-two",
          outletId: "outlet-kondapur",
          status: "READY" as const,
          paymentMethod: "CARD" as const,
          totalPaise: 70000,
          placedMinutesAgo: 42,
          promiseMinutesFromNow: -2,
          items: [
            { name: "Mutton haleem", portionName: "Regular", quantity: 2, unitPricePaise: 35000, prepMinutes: 12, isVeg: false, allergens: ["Wheat", "Milk"] },
          ],
        },
        {
          id: "order-cat-9901",
          orderNumber: "CAT-9901-KOND",
          customerId: "demo-customer",
          outletId: "outlet-kondapur",
          status: "NEW" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 2100000, // ₹21,000
          placedMinutesAgo: 10,
          promiseMinutesFromNow: 240,
          isCatering: true,
          guestCount: 50,
          cateringStatus: "PENDING_CONFIRMATION" as const,
          specialInstructions: "Corporate dinner buffet at Mindspace Hitec City. Extra spicy mirchi salan requested.",
          items: [
            { name: "Royal Zafrani Chicken Dum Handi", portionName: "20 kg Handi (serves ~45)", quantity: 1, unitPricePaise: 1800000, prepMinutes: 180, isVeg: false, allergens: ["Milk"] },
            { name: "Double ka meetha", portionName: "Regular", quantity: 25, unitPricePaise: 12000, prepMinutes: 5, isVeg: true, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-cat-9902",
          orderNumber: "CAT-9902-KOND",
          customerId: "demo-customer-two",
          outletId: "outlet-kondapur",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 4200000, // ₹42,000
          placedMinutesAgo: 60,
          promiseMinutesFromNow: 180,
          isCatering: true,
          guestCount: 100,
          cateringStatus: "CONFIRMED" as const,
          cateringConfirmedBy: "Kondapur kitchen",
          cateringNotes: "4x 20kg handis assigned; master dum chef allocated",
          specialInstructions: "Wedding reception catering at Cyber Towers Lawns.",
          items: [
            { name: "Royal Zafrani Chicken Dum Handi", portionName: "20 kg Handi", quantity: 2, unitPricePaise: 1800000, prepMinutes: 180, isVeg: false, allergens: ["Milk"] },
            { name: "Nizami Tarkari Biryani Handi", portionName: "10 kg Handi", quantity: 1, unitPricePaise: 600000, prepMinutes: 120, isVeg: true, allergens: ["Milk"] },
          ],
        },

        // --- Gachibowli Cloud Kitchen Outlets ---
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
            { name: "Veg biryani", portionName: "Regular", quantity: 2, unitPricePaise: 25000, prepMinutes: 15, isVeg: true, allergens: ["Milk"] },
            { name: "Mirchi ka salan", portionName: "Regular", quantity: 1, unitPricePaise: 14000, prepMinutes: 8, isVeg: true, allergens: ["Peanuts", "Sesame"] },
          ],
        },
        {
          id: "order-web-778170",
          orderNumber: "WEB-778170",
          customerId: "demo-customer-two",
          outletId: "outlet-gachibowli",
          status: "NEW" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 40000,
          placedMinutesAgo: 5,
          promiseMinutesFromNow: 25,
          items: [
            { name: "Chicken dum biryani", portionName: "Regular", quantity: 1, unitPricePaise: 40000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778171",
          orderNumber: "WEB-778171",
          customerId: "demo-customer",
          outletId: "outlet-gachibowli",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 75000,
          placedMinutesAgo: 18,
          promiseMinutesFromNow: 12,
          items: [
            { name: "Mutton haleem", portionName: "Regular", quantity: 2, unitPricePaise: 35000, prepMinutes: 12, isVeg: false, allergens: ["Wheat", "Milk"] },
          ],
        },
        {
          id: "order-web-778172",
          orderNumber: "WEB-778172",
          customerId: "demo-customer-two",
          outletId: "outlet-gachibowli",
          status: "PREPARING" as const,
          paymentMethod: "CARD" as const,
          totalPaise: 94000,
          placedMinutesAgo: 52,
          promiseMinutesFromNow: -12, // Critical Late by 12m!
          items: [
            { name: "Chicken dum biryani", portionName: "Family pack", quantity: 1, unitPricePaise: 94000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778173",
          orderNumber: "WEB-778173",
          customerId: "demo-customer",
          outletId: "outlet-gachibowli",
          status: "READY" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 50000,
          placedMinutesAgo: 32,
          promiseMinutesFromNow: 3,
          items: [
            { name: "Veg biryani", portionName: "Regular", quantity: 2, unitPricePaise: 25000, prepMinutes: 15, isVeg: true, allergens: ["Milk"] },
          ],
        },

        // --- Kukatpally Outlets ---
        {
          id: "order-web-778146",
          orderNumber: "WEB-778146",
          customerId: "demo-customer-two",
          outletId: "outlet-kukatpally",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 105000,
          placedMinutesAgo: 54,
          promiseMinutesFromNow: -4, // Late by 4m
          items: [
            { name: "Mutton haleem", portionName: "Regular", quantity: 3, unitPricePaise: 35000, prepMinutes: 12, isVeg: false, allergens: ["Wheat", "Milk"] },
          ],
        },
        {
          id: "order-web-778180",
          orderNumber: "WEB-778180",
          customerId: "demo-customer",
          outletId: "outlet-kukatpally",
          status: "NEW" as const,
          paymentMethod: "CARD" as const,
          totalPaise: 80000,
          placedMinutesAgo: 7,
          promiseMinutesFromNow: 23,
          items: [
            { name: "Chicken dum biryani", portionName: "Regular", quantity: 2, unitPricePaise: 40000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778181",
          orderNumber: "WEB-778181",
          customerId: "demo-customer-two",
          outletId: "outlet-kukatpally",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 94000,
          placedMinutesAgo: 14,
          promiseMinutesFromNow: 16,
          items: [
            { name: "Chicken dum biryani", portionName: "Family pack", quantity: 1, unitPricePaise: 94000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778182",
          orderNumber: "WEB-778182",
          customerId: "demo-customer",
          outletId: "outlet-kukatpally",
          status: "PREPARING" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 54000,
          placedMinutesAgo: 21,
          promiseMinutesFromNow: 9,
          items: [
            { name: "Chicken dum biryani", portionName: "Regular", quantity: 1, unitPricePaise: 40000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
            { name: "Mirchi ka salan", portionName: "Regular", quantity: 1, unitPricePaise: 14000, prepMinutes: 8, isVeg: true, allergens: ["Peanuts"] },
          ],
        },
        {
          id: "order-web-778183",
          orderNumber: "WEB-778183",
          customerId: "demo-customer-two",
          outletId: "outlet-kukatpally",
          status: "READY" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 70000,
          placedMinutesAgo: 36,
          promiseMinutesFromNow: 4,
          items: [
            { name: "Mutton haleem", portionName: "Regular", quantity: 2, unitPricePaise: 35000, prepMinutes: 12, isVeg: false, allergens: ["Wheat", "Milk"] },
          ],
        },
        {
          id: "order-cat-9903",
          orderNumber: "CAT-9903-KUKT",
          customerId: "demo-customer",
          outletId: "outlet-kukatpally",
          status: "NEW" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 1500000, // ₹15,000
          placedMinutesAgo: 12,
          promiseMinutesFromNow: 300,
          isCatering: true,
          guestCount: 35,
          cateringStatus: "PENDING_CONFIRMATION" as const,
          specialInstructions: "Birthday celebration catering. Delivery to JNTU Road.",
          items: [
            { name: "Royal Zafrani Chicken Dum Handi", portionName: "10 kg Handi", quantity: 2, unitPricePaise: 700000, prepMinutes: 120, isVeg: false, allergens: ["Milk"] },
          ],
        },
        // --- Historical Handed-Off & Cancelled Orders for Analytics ---
        {
          id: "order-web-778190",
          orderNumber: "WEB-778190",
          customerId: "demo-customer",
          outletId: "outlet-kondapur",
          status: "HANDED_OFF" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 94000,
          placedMinutesAgo: 95,
          promiseMinutesFromNow: -65,
          items: [
            { name: "Chicken dum biryani", portionName: "Family pack", quantity: 1, unitPricePaise: 94000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778191",
          orderNumber: "WEB-778191",
          customerId: "demo-customer-two",
          outletId: "outlet-gachibowli",
          status: "HANDED_OFF" as const,
          paymentMethod: "CARD" as const,
          totalPaise: 70000,
          placedMinutesAgo: 80,
          promiseMinutesFromNow: -55,
          items: [
            { name: "Mutton haleem", portionName: "Regular", quantity: 2, unitPricePaise: 35000, prepMinutes: 12, isVeg: false, allergens: ["Wheat", "Milk"] },
          ],
        },
        {
          id: "order-web-778192",
          orderNumber: "WEB-778192",
          customerId: "demo-customer-two",
          outletId: "outlet-kondapur",
          status: "CANCELLED" as const,
          paymentMethod: "UPI" as const,
          totalPaise: 40000,
          placedMinutesAgo: 110,
          promiseMinutesFromNow: -80,
          items: [
            { name: "Chicken dum biryani", portionName: "Regular", quantity: 1, unitPricePaise: 40000, prepMinutes: 20, isVeg: false, allergens: ["Milk"] },
          ],
        },
        {
          id: "order-web-778193",
          orderNumber: "WEB-778193",
          customerId: "demo-customer",
          outletId: "outlet-kukatpally",
          status: "CANCELLED" as const,
          paymentMethod: "CARD" as const,
          totalPaise: 50000,
          placedMinutesAgo: 120,
          promiseMinutesFromNow: -90,
          items: [
            { name: "Veg biryani", portionName: "Regular", quantity: 2, unitPricePaise: 25000, prepMinutes: 15, isVeg: true, allergens: ["Milk"] },
          ],
        },
      ];

      for (const sample of samples) {
        const { items, placedMinutesAgo, promiseMinutesFromNow, ...details } =
          sample;
        const promisedReadyAt = new Date(now + promiseMinutesFromNow * 60_000);
        const createdAt = new Date(now - placedMinutesAgo * 60_000);
        const eventDate = sample.isCatering ? promisedReadyAt : undefined;

        await transaction.order.upsert({
          where: { id: sample.id },
          update: {
            status: sample.status,
            promisedReadyAt,
            ...(sample.isCatering
              ? {
                  cateringStatus: sample.cateringStatus,
                  cateringNotes:
                    "cateringNotes" in sample ? sample.cateringNotes : undefined,
                  cateringConfirmedBy:
                    "cateringConfirmedBy" in sample
                      ? sample.cateringConfirmedBy
                      : undefined,
                }
              : {}),
          },
          create: {
            ...details,
            paymentStatus: "PAID",
            includedTaxPaise: Math.round((sample.totalPaise * 5) / 105),
            subtotalPaise: sample.totalPaise,
            promisedReadyAt,
            originalPromiseAt: promisedReadyAt,
            eventDate,
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
    { timeout: 60_000 },
  );
  console.log(
    "Demo data ready: 17 outlets (14 dine-in + 3 cloud kitchens), 5 menu items, 5 accounts and 26 sample orders across Hyderabad.",
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
