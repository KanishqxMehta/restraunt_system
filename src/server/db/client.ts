import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDatabase = globalThis as unknown as { database?: PrismaClient };

/** One pool per process, including development hot reloads. */
export function getDatabase(): PrismaClient {
  if (!globalDatabase.database) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL must be configured.");
    globalDatabase.database = new PrismaClient({
      adapter: new PrismaPg({
        connectionString,
        max: 10,
        connectionTimeoutMillis: 5000,
      }),
    });
  }
  return globalDatabase.database;
}
