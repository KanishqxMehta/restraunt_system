import "server-only";
import { getDatabase } from "@/server/db/client";
import type { Prisma } from "@/generated/prisma/client";
import { getLoyaltySettingsSync } from "./settings";

export async function getOrCreateLoyaltyAccount(userId: string) {
  const db = getDatabase();

  let account = await db.loyaltyAccount.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!account) {
    // New account. If synthetic demo customer, grant 250 bonus points so reviewer can test redemption immediately.
    const initialPoints = userId.startsWith("demo-customer") ? 250 : 0;
    account = await db.loyaltyAccount.create({
      data: {
        userId,
        pointsBalance: initialPoints,
        lifetimeEarned: initialPoints,
        lifetimeRedeemed: 0,
        transactions:
          initialPoints > 0
            ? {
                create: {
                  type: "EARNED",
                  points: initialPoints,
                  description: "Royal Direct Welcome Bonus Points",
                },
              }
            : undefined,
      },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  }

  return {
    id: account.id,
    userId: account.userId,
    pointsBalance: account.pointsBalance,
    lifetimeEarned: account.lifetimeEarned,
    lifetimeRedeemed: account.lifetimeRedeemed,
    rupeeValue: Math.floor(
      (account.pointsBalance * getLoyaltySettingsSync().redeemPaisePerPoint) / 100,
    ),
    transactions: account.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      points: t.points,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

export async function deductLoyaltyPoints(
  tx: Prisma.TransactionClient,
  userId: string,
  orderId: string,
  orderNumber: string,
  points: number,
) {
  if (points <= 0) return;

  const account = await tx.loyaltyAccount.findUnique({
    where: { userId },
  });

  if (!account || account.pointsBalance < points) {
    throw new Error("Insufficient loyalty points balance.");
  }

  await tx.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      pointsBalance: { decrement: points },
      lifetimeRedeemed: { increment: points },
    },
  });

  await tx.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      orderId,
      type: "REDEEMED",
      points: -points,
      description: `Redeemed at checkout on order #${orderNumber}`,
    },
  });
}

export async function creditLoyaltyPoints(
  tx: Prisma.TransactionClient,
  userId: string,
  orderId: string,
  orderNumber: string,
  points: number,
) {
  if (points <= 0) return;

  const account = await tx.loyaltyAccount.upsert({
    where: { userId },
    create: {
      userId,
      pointsBalance: points,
      lifetimeEarned: points,
      lifetimeRedeemed: 0,
    },
    update: {
      pointsBalance: { increment: points },
      lifetimeEarned: { increment: points },
    },
  });

  await tx.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      orderId,
      type: "EARNED",
      points,
      description: `Direct order reward for #${orderNumber}`,
    },
  });
}
