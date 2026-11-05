import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { getDatabase } from "../../src/server/db/client";
import { DEMO_PASSWORD } from "../../src/features/auth/demo-accounts";
import type { CheckoutQuote } from "../../src/features/checkout/types";

let api: APIRequestContext;
const email = `checkout-${randomUUID()}@test.example`;
const location = { latitude: 17.4622, longitude: 78.3568 };
const cart = {
  outletId: "outlet-kondapur",
  location,
  lines: [{ portionId: "portion-chicken-regular", addonIds: [], quantity: 1 }],
};
const db = getDatabase();

test.beforeAll(async ({ playwright }) => {
  const host = new URL(process.env.DATABASE_URL ?? "http://missing").hostname;
  if (
    process.env.ENABLE_DEMO_DATA !== "true" ||
    !["localhost", "127.0.0.1", "db"].includes(host)
  )
    throw new Error(
      "Checkout integration tests require the explicitly enabled local demo database.",
    );
  api = await playwright.request.newContext({
    baseURL: "http://localhost:3000",
    extraHTTPHeaders: { Origin: "http://localhost:3000" },
  });
  const userId = `checkout-user-${randomUUID()}`;
  await db.user.create({
    data: {
      id: userId,
      name: "Synthetic checkout reviewer",
      email,
      accounts: {
        create: {
          id: randomUUID(),
          providerId: "credential",
          accountId: userId,
          password: await hashPassword(DEMO_PASSWORD),
        },
      },
    },
  });
  const response = await api.post("/api/auth/sign-in/email", {
    data: { email, password: DEMO_PASSWORD },
  });
  expect(response.status(), await response.text()).toBe(200);
});
test.afterAll(async () => {
  await api?.dispose();
  await db.$disconnect();
});

async function quote(
  overrides: Record<string, unknown> = {},
): Promise<CheckoutQuote> {
  const response = await api.post("/api/checkout/quote", {
    data: { ...cart, ...overrides },
  });
  expect(response.status(), await response.text()).toBe(201);
  return response.json();
}
async function pending(quoteId: string, key = randomUUID()) {
  const response = await api.post("/api/orders", {
    data: {
      quoteId,
      idempotencyKey: key,
      deliveryAddress: "Synthetic building 12, Kondapur, Hyderabad",
      paymentMethod: "UPI",
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  return response.json() as Promise<{ id: string }>;
}
function pay(
  orderId: string,
  outcome: "SUCCESS" | "FAILED" | "CANCELLED" = "SUCCESS",
  idempotencyKey = randomUUID(),
  method: "UPI" | "CARD" = "UPI",
) {
  return api.post(`/api/orders/${orderId}/mock-payment`, {
    data: { outcome, idempotencyKey, method },
  });
}

test("serviceability recommends the nearest eligible outlet and handles unsupported pins", async ({
  request,
}) => {
  const response = await request.post("/api/serviceability", {
    data: location,
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).outlets[0].id).toBe("outlet-kondapur");
  expect(
    (
      await (
        await request.post("/api/serviceability", {
          data: { latitude: 0, longitude: 0 },
        })
      ).json()
    ).outlets,
  ).toEqual([]);
  expect(
    (
      await request.post("/api/serviceability", {
        data: { latitude: 99, longitude: 0 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/serviceability", {
        headers: { Origin: "https://hostile.example" },
        data: location,
      })
    ).status(),
  ).toBe(403);
});

test("customer menu has local photos, portions and allergen details", async ({
  request,
}) => {
  const response = await request.get("/api/outlets/outlet-kondapur/menu");
  expect(response.status()).toBe(200);
  const { items, outlet } = await response.json();
  expect(outlet.fssaiLicense).toMatch(/^\d{14}$/);
  expect(items).toHaveLength(5);
  expect(
    items.every((item: { imageUrl: string }) =>
      item.imageUrl?.startsWith("/menu/"),
    ),
  ).toBe(true);
  expect((await request.get("/menu/chicken-biryani.jpg")).status()).toBe(200);
});

test("quote is authoritative, extracts GST and validates coupon rules", async () => {
  const result = await quote({ couponCode: "direct10" });
  expect(result.subtotalPaise).toBe(35000);
  expect(result.discountPaise).toBe(3500);
  expect(result.totalPaise).toBe(31500);
  expect(result.includedTaxPaise).toBe(1500);
  expect(
    (
      await api.post("/api/checkout/quote", {
        data: { ...cart, totalPaise: 1 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await api.post("/api/checkout/quote", {
        data: { ...cart, couponCode: "NOTREAL" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await api.post("/api/checkout/quote", {
        data: {
          ...cart,
          couponCode: "DIRECT10",
          lines: [{ portionId: "portion-meetha", addonIds: [], quantity: 1 }],
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await api.post("/api/checkout/quote", {
        data: { ...cart, location: { latitude: 0, longitude: 0 } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (await api.post("/api/orders", { data: { totalPaise: 1 } })).status(),
  ).toBe(400);
});

test("concurrent duplicate submissions create one order and one kitchen event", async () => {
  const q = await quote({ couponCode: "DIRECT10" });
  const key = randomUUID();
  const [a, b] = await Promise.all([pending(q.id, key), pending(q.id, key)]);
  expect(a.id).toBe(b.id);
  expect(await db.order.count({ where: { quoteId: q.id } })).toBe(1);
  const paymentKey = randomUUID();
  const results = await Promise.all([
    pay(a.id, "SUCCESS", paymentKey),
    pay(a.id, "SUCCESS", paymentKey),
  ]);
  for (const result of results)
    expect(result.status(), await result.text()).toBe(200);
  const order = await db.order.findUniqueOrThrow({
    where: { id: a.id },
    include: { events: true, paymentAttempts: true },
  });
  expect(order.paymentStatus).toBe("PAID");
  expect(order.status).toBe("NEW");
  expect(order.events.filter((event) => event.status === "NEW")).toHaveLength(
    1,
  );
  expect(order.paymentAttempts).toHaveLength(1);
  expect(await db.couponRedemption.count({ where: { orderId: a.id } })).toBe(1);
});

test("failed and cancelled payments can retry successfully without duplicate fulfillment", async () => {
  const order = await pending((await quote()).id);
  expect((await pay(order.id, "FAILED")).status()).toBe(200);
  let saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
  expect(saved.status).toBe("PENDING_PAYMENT");
  expect(saved.paymentStatus).toBe("FAILED");
  expect((await pay(order.id, "CANCELLED")).status()).toBe(200);
  saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
  expect(saved.status).toBe("PENDING_PAYMENT");
  expect((await pay(order.id, "SUCCESS", randomUUID(), "CARD")).status()).toBe(
    200,
  );
  expect((await pay(order.id, "FAILED")).status()).toBe(200);
  saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
  expect(saved.paymentStatus).toBe("PAID");
  expect(saved.paymentMethod).toBe("CARD");
});

test("idempotency keys cannot be reused for different orders or payment outcomes", async () => {
  const q = await quote();
  const key = randomUUID();
  const order = await pending(q.id, key);
  const other = await quote();
  expect(
    (
      await api.post("/api/orders", {
        data: {
          quoteId: other.id,
          idempotencyKey: key,
          deliveryAddress: "Synthetic building 12, Kondapur, Hyderabad",
          paymentMethod: "UPI",
        },
      })
    ).status(),
  ).toBe(409);
  const paymentKey = randomUUID();
  expect((await pay(order.id, "FAILED", paymentKey)).status()).toBe(200);
  expect((await pay(order.id, "SUCCESS", paymentKey)).status()).toBe(409);
});

test("stock pauses block order creation and successful payment", async () => {
  const q = await quote();
  const order = await pending((await quote()).id);
  const where = {
    outletId_itemId: {
      outletId: "outlet-kondapur",
      itemId: "item-chicken-biryani",
    },
  };
  const original = await db.outletAvailability.findUniqueOrThrow({ where });
  try {
    await db.outletAvailability.update({ where, data: { isAvailable: false } });
    expect(
      (
        await api.post("/api/orders", {
          data: {
            quoteId: q.id,
            idempotencyKey: randomUUID(),
            deliveryAddress: "Synthetic building 12, Kondapur, Hyderabad",
            paymentMethod: "UPI",
          },
        })
      ).status(),
    ).toBe(409);
    expect((await pay(order.id)).status()).toBe(409);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } }))
        .paymentStatus,
    ).toBe("PENDING");
  } finally {
    await db.outletAvailability.update({
      where,
      data: { isAvailable: original.isAvailable },
    });
  }
});

test("price changes invalidate stale quotes and pending payment snapshots", async () => {
  const q = await quote();
  const order = await pending((await quote()).id);
  const where = {
    portionId_city: { portionId: "portion-chicken-regular", city: "Hyderabad" },
  };
  const original = await db.cityPrice.findUniqueOrThrow({ where });
  try {
    await db.cityPrice.update({
      where,
      data: { pricePaise: original.pricePaise + 100 },
    });
    expect(
      (
        await api.post("/api/orders", {
          data: {
            quoteId: q.id,
            idempotencyKey: randomUUID(),
            deliveryAddress: "Synthetic building 12, Kondapur, Hyderabad",
            paymentMethod: "UPI",
          },
        })
      ).status(),
    ).toBe(409);
    expect((await pay(order.id)).status()).toBe(409);
  } finally {
    await db.cityPrice.update({
      where,
      data: { pricePaise: original.pricePaise },
    });
  }
});

test("expired quotes and payment holds cannot be used", async () => {
  const q = await quote();
  await db.checkoutQuote.update({
    where: { id: q.id },
    data: { expiresAt: new Date(0) },
  });
  expect(
    (
      await api.post("/api/orders", {
        data: {
          quoteId: q.id,
          idempotencyKey: randomUUID(),
          deliveryAddress: "Synthetic building 12, Kondapur, Hyderabad",
          paymentMethod: "UPI",
        },
      })
    ).status(),
  ).toBe(409);
  const order = await pending((await quote()).id);
  await db.order.update({
    where: { id: order.id },
    data: { paymentExpiresAt: new Date(0) },
  });
  expect((await pay(order.id)).status()).toBe(410);
});

test("coupon usage is only consumed once at successful payment, including concurrent orders", async () => {
  const code = `ONE${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.coupon.create({
    data: {
      code,
      discountType: "FLAT",
      value: 1000,
      minOrderPaise: 0,
      usageLimit: 1,
      perCustomerLimit: 1,
      startsAt: new Date("2020-01-01"),
      expiresAt: new Date("2099-01-01"),
    },
  });
  const first = await pending((await quote({ couponCode: code })).id);
  const second = await pending((await quote({ couponCode: code })).id);
  expect((await pay(first.id, "FAILED")).status()).toBe(200);
  const results = await Promise.all([pay(first.id), pay(second.id)]);
  expect(results.map((response) => response.status()).sort()).toEqual([
    200, 409,
  ]);
  expect(await db.couponRedemption.count({ where: { coupon: { code } } })).toBe(
    1,
  );
});

test("inactive, future and expired coupons are rejected", async () => {
  for (const timing of [
    {
      isActive: false,
      startsAt: new Date("2020-01-01"),
      expiresAt: new Date("2099-01-01"),
    },
    {
      isActive: true,
      startsAt: new Date("2098-01-01"),
      expiresAt: new Date("2099-01-01"),
    },
    {
      isActive: true,
      startsAt: new Date("2020-01-01"),
      expiresAt: new Date("2021-01-01"),
    },
  ]) {
    const code = `INVALID${randomUUID().slice(0, 8).toUpperCase()}`;
    await db.coupon.create({
      data: {
        code,
        discountType: "PERCENT",
        value: 10,
        minOrderPaise: 0,
        ...timing,
      },
    });
    expect(
      (
        await api.post("/api/checkout/quote", {
          data: { ...cart, couponCode: code },
        })
      ).status(),
    ).toBe(400);
  }
});

test("another customer and kitchen staff cannot pay this customer's order", async ({
  request,
}) => {
  const order = await pending((await quote()).id);
  await request.post("/api/auth/sign-in/email", {
    data: { email: "customer2@demo.example", password: DEMO_PASSWORD },
  });
  expect((await request.get(`/api/orders/${order.id}`)).status()).toBe(404);
  expect(
    (
      await request.post(`/api/orders/${order.id}/mock-payment`, {
        data: {
          method: "UPI",
          outcome: "SUCCESS",
          idempotencyKey: randomUUID(),
        },
      })
    ).status(),
  ).toBe(404);
  await request.post("/api/auth/sign-out", { data: {} });
  await request.post("/api/auth/sign-in/email", {
    data: { email: "kondapur@demo.example", password: DEMO_PASSWORD },
  });
  expect(
    (await request.post("/api/checkout/quote", { data: cart })).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`/api/orders/${order.id}/mock-payment`, {
        data: {
          method: "UPI",
          outcome: "SUCCESS",
          idempotencyKey: randomUUID(),
        },
      })
    ).status(),
  ).toBe(403);
  const { orders } = await (await request.get("/api/kitchen/orders")).json();
  expect(orders.some((entry: { id: string }) => entry.id === order.id)).toBe(
    false,
  );
});

test("mobile customer can configure a dish, restore a basket and complete test checkout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/order$/);
  await page.getByRole("button", { name: "Kondapur", exact: true }).click();
  await page.getByRole("button", { name: /Recommended · nearest/ }).click();
  await page
    .getByRole("button", { name: "Add Chicken dum biryani", exact: true })
    .click();
  await page.getByRole("radio", { name: /Regular/ }).check();
  await page.getByRole("checkbox", { name: /Extra raita/ }).check();
  await page.getByRole("button", { name: /Add to basket/ }).click();
  await page.reload();
  await expect(page.getByRole("link", { name: /View basket/ })).toBeVisible();
  await page.getByRole("link", { name: /View basket/ }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page
    .getByLabel("Delivery address")
    .fill("Synthetic building 12, Kondapur, Hyderabad");
  await page.getByLabel("Coupon", { exact: false }).fill("DIRECT10");
  await page.getByRole("button", { name: "Review total", exact: true }).click();
  await expect(page.getByText("To pay", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue to test payment" }).click();
  await expect(
    page.getByRole("heading", { name: "Finish your order" }),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: "Declined payment", exact: true })
    .check();
  await page.getByRole("button", { name: "Run test payment" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Test payment was declined" }),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: "Successful payment", exact: true })
    .check();
  await page.getByRole("button", { name: "Run test payment" }).click();
  await expect(page).toHaveURL(/\/orders\//);
  await expect(
    page.getByRole("heading", { name: "Your order is in good hands." }),
  ).toBeVisible();
  await expect(page.getByText("Extra raita", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
