import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  demoAccounts,
  DEMO_PASSWORD,
} from "../../src/features/auth/demo-accounts";

async function signIn(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/sign-in/email", {
    data: { email, password: DEMO_PASSWORD },
  });
  expect(response.status(), await response.text()).toBe(200);
}

test("anonymous API requests are rejected and protected pages redirect", async ({
  request,
}) => {
  for (const path of [
    "/api/me",
    "/api/orders",
    "/api/kitchen/orders",
    "/api/admin/menu",
    "/api/outlets",
  ])
    expect((await request.get(path)).status()).toBe(401);
  const page = await request.get("/kitchen", { maxRedirects: 0 });
  // Next streams a redirect after the loading boundary has started the response.
  expect([200, 307]).toContain(page.status());
  expect(await page.text()).not.toContain("WEB-778120");
});

test("bad credentials do not create a session", async ({ request }) => {
  const response = await request.post("/api/auth/sign-in/email", {
    data: { email: "customer@demo.example", password: "incorrect-password" },
  });
  expect(response.status()).toBe(401);
  expect((await request.get("/api/me")).status()).toBe(401);
});

test("customer order queries cannot be widened by supplied user/outlet parameters", async ({
  request,
}) => {
  await signIn(request, "customer@demo.example");
  const response = await request.get(
    "/api/orders?customerId=demo-customer-two&outletId=outlet-kukatpally&role=CENTRAL_ADMIN",
  );
  expect(response.status()).toBe(200);
  const { orders } = await response.json();
  expect(
    orders.map((order: { orderNumber: string }) => order.orderNumber).sort(),
  ).toEqual(["WEB-778120", "WEB-778131"]);
  expect((await request.get("/api/orders/order-web-778146")).status()).toBe(
    404,
  );
  expect((await request.get("/api/orders/missing-order")).status()).toBe(404);
  expect((await request.get("/api/kitchen/orders")).status()).toBe(403);
  expect((await request.get("/api/admin/menu")).status()).toBe(403);
});

for (const [email, outletId, orderNumber] of [
  ["kondapur@demo.example", "outlet-kondapur", "WEB-778120"],
  ["gachibowli@demo.example", "outlet-gachibowli", "WEB-778131"],
]) {
  test(`${email} can only read its assigned kitchen`, async ({ request }) => {
    await signIn(request, email);
    const { orders } = await (
      await request.get("/api/kitchen/orders?outletId=outlet-kukatpally")
    ).json();
    expect(
      orders.map((order: { orderNumber: string }) => order.orderNumber),
    ).toEqual([orderNumber]);
    const { outlets } = await (await request.get("/api/outlets")).json();
    expect(outlets.map((outlet: { id: string }) => outlet.id)).toEqual([
      outletId,
    ]);
    expect((await request.get("/api/orders/order-web-778146")).status()).toBe(
      404,
    );
    expect((await request.get("/api/admin/menu")).status()).toBe(403);
  });
}

test("central admin can inspect the shared menu and all sample orders", async ({
  request,
}) => {
  await signIn(request, "admin@demo.example");
  const response = await request.get("/api/admin/menu");
  expect(response.status()).toBe(200);
  const { items } = await response.json();
  expect(items).toHaveLength(5);
  expect(
    items.every(
      (item: { basePrepMinutes: number }) => item.basePrepMinutes > 0,
    ),
  ).toBe(true);
  expect((await (await request.get("/api/orders")).json()).orders).toHaveLength(
    3,
  );
});

test("sign-up and user updates cannot grant staff privileges", async ({
  request,
}) => {
  const response = await request.post("/api/auth/sign-up/email", {
    data: {
      email: `signup-${randomUUID()}@test.example`,
      name: "Synthetic test customer",
      password: DEMO_PASSWORD,
      role: "CENTRAL_ADMIN",
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  let profile = await (await request.get("/api/me")).json();
  expect(profile.user.role).toBe("CUSTOMER");
  expect(profile.user.outletIds).toEqual([]);
  await request.post("/api/auth/update-user", {
    data: { role: "CENTRAL_ADMIN" },
  });
  profile = await (await request.get("/api/me")).json();
  expect(profile.user.role).toBe("CUSTOMER");
  expect((await request.get("/api/admin/menu")).status()).toBe(403);
  expect((await (await request.get("/api/orders")).json()).orders).toEqual([]);
});

test("hostile origins cannot sign in", async ({ request }) => {
  const response = await request.post("/api/auth/sign-in/email", {
    headers: { Origin: "https://untrusted.example" },
    data: { email: "customer@demo.example", password: DEMO_PASSWORD },
  });
  expect(response.status()).toBe(403);
});

test("sign-out revokes the stored session", async ({ request }) => {
  await signIn(request, "customer@demo.example");
  const cookie = (await request.storageState()).cookies.find((entry) =>
    entry.name.includes("session_token"),
  );
  expect(cookie?.httpOnly).toBe(true);
  const signedOut = await request.post("/api/auth/sign-out", { data: {} });
  expect(signedOut.ok()).toBe(true);
  expect((await request.get("/api/me")).status()).toBe(401);
  if (cookie)
    expect(
      (
        await request.get("/api/me", {
          headers: { Cookie: `${cookie.name}=${cookie.value}` },
        })
      ).status(),
    ).toBe(401);
});

test("server rejects short passwords and oversized registration names", async ({
  request,
}) => {
  for (const data of [
    { name: "Test customer", password: "short" },
    { name: "a".repeat(81), password: DEMO_PASSWORD },
  ]) {
    const response = await request.post("/api/auth/sign-up/email", {
      data: { ...data, email: `invalid-${randomUUID()}@test.example` },
    });
    expect(response.ok()).toBe(false);
  }
});

// A reference used by documentation and smoke tests; all identities are synthetic.
test("all demo identities are explicitly non-real addresses", () => {
  expect(
    demoAccounts.every((account) => account.email.endsWith("@demo.example")),
  ).toBe(true);
});
