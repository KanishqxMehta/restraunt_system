import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { QuoteSnapshot } from "./types";
export const asJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export const fingerprint = (value: QuoteSnapshot) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
