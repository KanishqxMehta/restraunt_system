import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "@/features/auth/validation";
const valid = {
  name: "Demo person",
  email: "new@test.example",
  password: "StrongDemoPassword!2026",
};
describe("registration inputs", () => {
  it("defaults marketing consent to false", () => {
    expect(signUpSchema.parse(valid).marketingOptIn).toBe(false);
  });
  it("accepts explicit consent", () => {
    expect(
      signUpSchema.parse({ ...valid, marketingOptIn: true }).marketingOptIn,
    ).toBe(true);
  });
  it("rejects short passwords and invalid names", () => {
    expect(
      signUpSchema.safeParse({ ...valid, password: "short" }).success,
    ).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, name: " " }).success).toBe(false);
  });
  it("rejects invalid email and oversized passwords", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "invalid" }).success).toBe(
      false,
    );
    expect(
      signUpSchema.safeParse({ ...valid, password: "a".repeat(129) }).success,
    ).toBe(false);
  });
  it("does not accept a role from form data", () => {
    expect(
      signUpSchema.parse({ ...valid, role: "CENTRAL_ADMIN" }),
    ).not.toHaveProperty("role");
  });
  it("does not trim passwords", () => {
    expect(
      signInSchema.parse({ email: valid.email, password: " space " }).password,
    ).toBe(" space ");
  });
});
