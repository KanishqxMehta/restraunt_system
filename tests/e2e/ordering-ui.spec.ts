import { test, expect, type APIRequestContext } from "@playwright/test";
import { DEMO_PASSWORD } from "../../src/features/auth/demo-accounts";
let api: APIRequestContext;
let cookies: Awaited<ReturnType<APIRequestContext["storageState"]>>["cookies"];
test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({
    baseURL: "http://localhost:3000",
    extraHTTPHeaders: { Origin: "http://localhost:3000" },
  });
  expect(
    (
      await api.post("/api/auth/sign-in/email", {
        data: { email: "customer@demo.example", password: DEMO_PASSWORD },
      })
    ).status(),
  ).toBe(200);
  cookies = (await api.storageState()).cookies;
});
test.beforeEach(async ({ context }) => {
  await context.addCookies(cookies);
});
test.afterAll(async () => {
  await api?.dispose();
});

test("denied geolocation and an unsupported pin can recover through a demo area", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (
          _success: unknown,
          error: (value: { code: number }) => void,
        ) => error({ code: 1 }),
      },
    });
  });
  await page.goto("/order");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "couldn't access your location" }),
  ).toBeVisible();
  await page
    .getByText("Enter a location pin manually", { exact: true })
    .click();
  await page.getByLabel("Latitude", { exact: true }).fill("0");
  await page.getByLabel("Longitude", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Check delivery area" }).click();
  await expect(
    page.getByRole("heading", { name: "We're not delivering here yet" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kondapur", exact: true }).click();
  await page.getByRole("button", { name: /Recommended · nearest/ }).click();
  await expect(
    page.getByRole("heading", { name: "Find your favourite" }),
  ).toBeVisible();
});

test("switching outlets confirms basket loss and allows keeping the original outlet", async ({
  page,
}) => {
  await page.goto("/order");
  await page.getByRole("button", { name: "Kondapur", exact: true }).click();
  await page.getByRole("button", { name: /Recommended · nearest/ }).click();
  await page
    .getByRole("button", { name: "Add Chicken dum biryani", exact: true })
    .click();
  await page.getByRole("button", { name: /Add to basket/ }).click();
  await page.getByRole("button", { name: "Change outlet" }).click();
  await page.getByRole("button", { name: "Gachibowli", exact: true }).click();
  page.once("dialog", (dialog) => {
    void dialog.dismiss();
  });
  await page.getByRole("button", { name: /Recommended · nearest/ }).click();
  await page.getByRole("button", { name: "Keep current outlet" }).click();
  await expect(
    page
      .getByRole("region", { name: "Your basket" })
      .getByText("Chicken dum biryani", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change outlet" }).click();
  await page.getByRole("button", { name: "Gachibowli", exact: true }).click();
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await page.getByRole("button", { name: /Recommended · nearest/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Gachibowli cloud kitchen",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Something delicious belongs here.", { exact: false }),
  ).toBeVisible();
});
