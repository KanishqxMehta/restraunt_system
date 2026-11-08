import "dotenv/config";
import { getDatabase } from "../src/server/db/client";

async function purge() {
  const db = getDatabase();
  console.log("Starting permanent deletion of all orders and resetting demo accounts...");

  // 1. Delete all coupon redemptions
  const deletedRedemptions = await db.couponRedemption.deleteMany({});
  console.log(`Deleted ${deletedRedemptions.count} coupon redemptions.`);

  // 2. Delete all loyalty transactions
  const deletedLoyaltyTx = await db.loyaltyTransaction.deleteMany({});
  console.log(`Deleted ${deletedLoyaltyTx.count} loyalty transactions.`);

  // 3. Delete all order notifications
  const deletedNotifications = await db.orderNotification.deleteMany({});
  console.log(`Deleted ${deletedNotifications.count} order notifications.`);

  // 4. Delete all payment attempts
  const deletedPaymentAttempts = await db.paymentAttempt.deleteMany({});
  console.log(`Deleted ${deletedPaymentAttempts.count} payment attempts.`);

  // 5. Delete all order items
  const deletedItems = await db.orderItem.deleteMany({});
  console.log(`Deleted ${deletedItems.count} order items.`);

  // 6. Delete all order events
  const deletedEvents = await db.orderEvent.deleteMany({});
  console.log(`Deleted ${deletedEvents.count} order events.`);

  // 7. Delete all orders permanently
  const deletedOrders = await db.order.deleteMany({});
  console.log(`Deleted ${deletedOrders.count} orders permanently.`);

  // 8. Delete all checkout quotes
  const deletedQuotes = await db.checkoutQuote.deleteMany({});
  console.log(`Deleted ${deletedQuotes.count} checkout quotes.`);

  // 9. Reset loyalty accounts to 0 points
  await db.loyaltyAccount.updateMany({
    data: {
      pointsBalance: 0,
      lifetimeEarned: 0,
      lifetimeRedeemed: 0,
    },
  });
  console.log("Reset all loyalty accounts to 0 points.");

  // 10. Reset outlet dish availability to true
  await db.outletAvailability.updateMany({
    data: { isAvailable: true },
  });
  console.log("Reset all dish availabilities to true.");

  // 11. Ensure all outlets are active
  await db.outlet.updateMany({
    data: { isActive: true },
  });
  console.log("Reset all outlets to active.");

  console.log("✅ Complete: All orders permanently removed and demo accounts reset.");
}

purge()
  .catch((e) => {
    console.error("Purge error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await getDatabase().$disconnect();
  });
