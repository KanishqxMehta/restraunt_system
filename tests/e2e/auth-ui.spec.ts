import { test, expect } from "@playwright/test";
import { DEMO_PASSWORD } from "../../src/features/auth/demo-accounts";

test("customer can sign in, reload a private workspace, and sign out", async ({
  page,
}) => {
  await page.goto("/kitchen");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill("customer@demo.example");
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/order$/);
  await page.getByRole("link", { name: "My orders", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "WEB-778120" })).toBeVisible();
  await expect(page.getByText("WEB-778146")).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("phone registration is usable, consent is optional, and empty history is clear", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Your name").fill("New demo customer");
  await page
    .getByLabel("Email address")
    .fill(`mobile-${Date.now()}@test.example`);
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("button", { name: "Create customer account" }).click();
  await expect(page).toHaveURL(/\/order$/);
  await page.getByRole("link", { name: "My orders", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No orders yet" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

for (const account of [
  {
    email: "kondapur@demo.example",
    path: "/kitchen",
    heading: "Kitchen display",
    expected: "WEB-778120",
    hidden: "WEB-778131",
  },
  {
    email: "admin@demo.example",
    path: "/admin/menu",
    heading: "One menu. Every outlet.",
    expected: "Chicken dum biryani",
    hidden: "WEB-778120",
  },
]) {
  test(`${account.email} opens its assigned workspace`, async ({ page }) => {
    const response = await page.request.post("/api/auth/sign-in/email", {
      data: { email: account.email, password: DEMO_PASSWORD },
    });
    expect(response.status()).toBe(200);
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`${account.path}$`));
    await expect(
      page.getByRole("heading", { name: account.heading, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: account.expected, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(account.hidden, { exact: true })).toHaveCount(
      0,
    );
  });
}
