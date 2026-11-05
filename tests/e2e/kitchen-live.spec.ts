import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { DEMO_PASSWORD } from "../../src/features/auth/demo-accounts";

const origin = "http://localhost:3000";

async function signIn(context: BrowserContext, email: string) {
  const response = await context.request.post("/api/auth/sign-in/email", {
    // Isolate this multi-user scenario from the other local sign-in tests.
    headers: { "X-Forwarded-For": "192.0.2.33" },
    data: { email, password: DEMO_PASSWORD },
  });
  expect(response.status(), await response.text()).toBe(200);
}

test("a paid order reaches its kitchen and updates the customer through rider handoff", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const options = { baseURL: origin, extraHTTPHeaders: { Origin: origin } };
  const customer = await browser.newContext(options);
  const kitchen = await browser.newContext(options);
  const otherOutlet = await browser.newContext(options);
  const admin = await browser.newContext(options);
  try {
    await signIn(customer, "customer@demo.example");
    await signIn(kitchen, "kondapur@demo.example");
    await signIn(otherOutlet, "gachibowli@demo.example");
    await signIn(admin, "admin@demo.example");

    const quote = await customer.request.post("/api/checkout/quote", {
      data: {
        outletId: "outlet-kondapur",
        location: { latitude: 17.4622, longitude: 78.3568 },
        lines: [
          { portionId: "portion-chicken-regular", addonIds: [], quantity: 1 },
        ],
      },
    });
    expect(quote.status(), await quote.text()).toBe(201);
    const created = await customer.request.post("/api/orders", {
      data: {
        quoteId: (await quote.json()).id,
        idempotencyKey: randomUUID(),
        deliveryAddress: "Synthetic kitchen review address, Kondapur",
        paymentMethod: "UPI",
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { id, orderNumber } = await created.json();

    const board = await kitchen.newPage();
    const tracking = await customer.newPage();
    await Promise.all([board.goto("/kitchen"), tracking.goto("/orders/" + id)]);
    await expect(
      board.getByRole("status").filter({ hasText: /^Live$/ }),
    ).toBeVisible();
    await expect(
      tracking.getByRole("status").filter({ hasText: /^Live$/ }),
    ).toBeVisible();
    await expect(board.getByRole("heading", { name: orderNumber })).toHaveCount(
      0,
    );
    await expect(
      tracking.getByRole("heading", {
        name: "Your order is awaiting payment.",
      }),
    ).toBeVisible();

    const stageUrl = "/api/kitchen/orders/" + id + "/stage";
    const change = (expectedStage: string) =>
      kitchen.request.post(stageUrl, { data: { expectedStage } });
    expect((await change("NEW")).status()).toBe(404);
    expect((await customer.request.get("/api/orders/live")).status()).toBe(403);
    expect(
      (
        await customer.request.get("/api/orders/live?orderId=order-web-778146")
      ).status(),
    ).toBe(404);

    const payment = await customer.request.post(
      "/api/orders/" + id + "/mock-payment",
      {
        data: {
          idempotencyKey: randomUUID(),
          method: "UPI",
          outcome: "SUCCESS",
        },
      },
    );
    expect(payment.status(), await payment.text()).toBe(200);
    const card = (lane: string) =>
      board
        .getByRole("region", { name: lane })
        .getByRole("article")
        .filter({ hasText: orderNumber });
    const step = (label: string) =>
      tracking
        .getByRole("listitem")
        .filter({ hasText: label })
        .and(tracking.locator('[aria-current="step"]'));
    await expect(card("New orders")).toBeVisible({ timeout: 8000 });
    await expect(step("Order received")).toBeVisible({ timeout: 8000 });
    expect(
      (
        await otherOutlet.request.post(stageUrl, {
          data: { expectedStage: "NEW" },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await admin.request.post(stageUrl, { data: { expectedStage: "NEW" } })
      ).status(),
    ).toBe(403);
    expect(
      (
        await customer.request.post(stageUrl, {
          data: { expectedStage: "NEW" },
        })
      ).status(),
    ).toBe(403);
    expect((await change("READY")).status()).toBe(409);

    const competing = await Promise.all([change("NEW"), change("NEW")]);
    expect(competing.map((response) => response.status()).sort()).toEqual([
      200, 409,
    ]);
    await expect(card("Preparing")).toBeVisible({ timeout: 8000 });
    await expect(step("In the kitchen")).toBeVisible({ timeout: 8000 });

    // Lose the event stream while keeping regular HTTP available.
    const live = "**/api/orders/live?orderId=*";
    await tracking.route(live, (route) => route.abort());
    await tracking.reload();
    await expect(
      tracking.getByRole("status").filter({ hasText: "Reconnecting" }),
    ).toBeVisible();
    await card("Preparing").getByRole("button", { name: "Mark ready" }).click();
    await expect(card("Ready for pickup")).toBeVisible();
    await expect(step("Ready for pickup")).toBeVisible({ timeout: 22_000 });

    await tracking.unroute(live);
    await expect(
      tracking.getByRole("status").filter({ hasText: /^Live$/ }),
    ).toBeVisible();
    await card("Ready for pickup")
      .getByRole("button", { name: "Confirm handoff" })
      .click();
    await board
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(card("Ready for pickup")).toBeVisible();
    await card("Ready for pickup")
      .getByRole("button", { name: "Confirm handoff" })
      .click();
    await board
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm collected" })
      .click();
    await expect(board.getByRole("heading", { name: orderNumber })).toHaveCount(
      0,
    );
    await expect(step("With delivery partner")).toBeVisible({ timeout: 8000 });
    expect((await change("READY")).status()).toBe(409);
  } finally {
    await Promise.all([
      customer.close(),
      kitchen.close(),
      otherOutlet.close(),
      admin.close(),
    ]);
  }
});
