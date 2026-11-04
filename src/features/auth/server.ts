import "server-only";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";
import { z } from "zod";
import { getDatabase } from "@/server/db/client";
import { roles } from "./roles";

const configuration = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
});

function createAuth() {
  const parsed = configuration.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      "Set BETTER_AUTH_URL and a BETTER_AUTH_SECRET of at least 32 characters.",
    );
  }
  const environment = parsed.data;
  return betterAuth({
    appName: "Restaurant System",
    baseURL: environment.BETTER_AUTH_URL,
    secret: environment.BETTER_AUTH_SECRET,
    trustedOrigins: [environment.BETTER_AUTH_URL],
    database: prismaAdapter(getDatabase(), { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    user: {
      additionalFields: {
        role: { type: [...roles], defaultValue: "CUSTOMER", input: false },
        marketingOptIn: {
          type: "boolean",
          defaultValue: false,
          required: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const name = z.string().trim().min(2).max(80).safeParse(user.name);
            if (!name.success)
              throw new APIError("BAD_REQUEST", {
                message: "Name must contain 2 to 80 characters.",
              });
            return { data: { ...user, name: name.data } };
          },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 15 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
// Lazy configuration allows a production build without access to deployment secrets.
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
