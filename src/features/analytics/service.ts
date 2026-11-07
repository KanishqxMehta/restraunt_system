import "server-only";
import { getDatabase } from "@/server/db/client";
import { requireRole, type Viewer } from "@/features/auth/policy";
import {
  calculateDirectCommissionSavings,
  calculateCateringMarginCaptured,
  calculateTotalValueCaptured,
  calculateTargetProgressPercent,
  calculateMarketingOptInPercent,
  calculateOnTimeSlaPercent,
  calculateCancellationRatePercent,
  calculateRepeatCustomerRatePercent,
  ANNUAL_SAVINGS_TARGET_PAISE,
} from "./calculator";
import type { ExecutiveAnalyticsSummary, OutletPerformance, RecentExecutiveOrder } from "./types";

export async function getExecutiveAnalytics(viewer: Viewer): Promise<ExecutiveAnalyticsSummary> {
  requireRole(viewer, ["CENTRAL_ADMIN"]);
  const db = getDatabase();

  const [totalCustomers, marketingOptedInCount, outlets, allOrders] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { role: "CUSTOMER", marketingOptIn: true } }),
    db.outlet.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        isCloudKitchen: true,
        minimumPrepMinutes: true,
      },
      orderBy: { name: "asc" },
    }),
    db.order.findMany({
      where: {
        OR: [{ paymentStatus: "PAID" }, { status: "CANCELLED" }],
      },
      include: {
        customer: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true, city: true, isCloudKitchen: true } },
        events: { select: { status: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  let totalDirectGMVPaise = 0;
  let directOrdersCount = 0;
  let cateringGMVPaise = 0;
  let cateringOrdersCount = 0;
  let totalPaidOrders = 0;
  let activeKitchenOrdersCount = 0;
  let completedOrders = 0;
  let cancelledOrdersCount = 0;
  let onTimeOrders = 0;
  let criticalLateOrders = 0;
  let totalPrepMinutesSum = 0;
  let prepMinutesCount = 0;

  // Chain-wide customer order counts (for repeat customer rate)
  const chainCustomerOrderCounts = new Map<string, number>();

  // Outlet aggregation map
  const outletMap = new Map<
    string,
    {
      totalOrders: number;
      paidOrders: number;
      activeKitchenOrders: number;
      completedOrders: number;
      cancelledOrders: number;
      totalRevenuePaise: number;
      cateringOrders: number;
      cateringRevenuePaise: number;
      onTimeOrders: number;
      lateOrders: number;
      prepMinutesSum: number;
      prepCount: number;
      customerOrderCounts: Map<string, number>;
    }
  >();

  for (const o of outlets) {
    outletMap.set(o.id, {
      totalOrders: 0,
      paidOrders: 0,
      activeKitchenOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalRevenuePaise: 0,
      cateringOrders: 0,
      cateringRevenuePaise: 0,
      onTimeOrders: 0,
      lateOrders: 0,
      prepMinutesSum: 0,
      prepCount: 0,
      customerOrderCounts: new Map<string, number>(),
    });
  }

  const now = Date.now();

  for (const order of allOrders) {
    const outletStats = outletMap.get(order.outletId);
    if (outletStats) {
      outletStats.totalOrders += 1;
    }

    if (order.status === "CANCELLED") {
      cancelledOrdersCount += 1;
      if (outletStats) outletStats.cancelledOrders += 1;
      continue;
    }

    // Paid non-cancelled order
    totalPaidOrders += 1;
    if (outletStats) {
      outletStats.paidOrders += 1;
      outletStats.totalRevenuePaise += order.totalPaise;
    }

    // Track customer repeat frequency
    chainCustomerOrderCounts.set(
      order.customerId,
      (chainCustomerOrderCounts.get(order.customerId) ?? 0) + 1,
    );
    if (outletStats) {
      outletStats.customerOrderCounts.set(
        order.customerId,
        (outletStats.customerOrderCounts.get(order.customerId) ?? 0) + 1,
      );
    }

    const isCat = order.isCatering;
    if (isCat) {
      cateringGMVPaise += order.totalPaise;
      cateringOrdersCount += 1;
      if (outletStats) {
        outletStats.cateringOrders += 1;
        outletStats.cateringRevenuePaise += order.totalPaise;
      }
    } else {
      totalDirectGMVPaise += order.totalPaise;
      directOrdersCount += 1;
    }

    const isActive =
      order.status === "NEW" || order.status === "PREPARING" || order.status === "READY";
    if (isActive) {
      activeKitchenOrdersCount += 1;
      if (outletStats) outletStats.activeKitchenOrders += 1;
    }

    // Determine completion and SLA
    const isCompleted = order.status === "READY" || order.status === "HANDED_OFF";
    const readyEvent = order.events.find((e) => e.status === "READY");
    const completionTime = readyEvent ? readyEvent.createdAt.getTime() : order.updatedAt.getTime();
    const promisedTime = order.promisedReadyAt.getTime();

    if (isCompleted) {
      completedOrders += 1;
      if (outletStats) outletStats.completedOrders += 1;

      if (completionTime <= promisedTime) {
        onTimeOrders += 1;
        if (outletStats) outletStats.onTimeOrders += 1;
      } else {
        if (outletStats) outletStats.lateOrders += 1;
        if (completionTime > promisedTime + 10 * 60_000) {
          criticalLateOrders += 1;
        }
      }

      const durationMin = Math.max(
        1,
        Math.round((completionTime - order.createdAt.getTime()) / 60_000),
      );
      totalPrepMinutesSum += durationMin;
      prepMinutesCount += 1;
      if (outletStats) {
        outletStats.prepMinutesSum += durationMin;
        outletStats.prepCount += 1;
      }
    } else {
      // In-flight order lateness & estimated prep time
      if (now > promisedTime) {
        if (outletStats) outletStats.lateOrders += 1;
        if (now > promisedTime + 10 * 60_000) {
          criticalLateOrders += 1;
        }
      }
      if (!isCat) {
        const estimatedMin =
          order.aiEstimatedMinutes ??
          Math.max(10, Math.round((promisedTime - order.createdAt.getTime()) / 60_000));
        totalPrepMinutesSum += estimatedMin;
        prepMinutesCount += 1;
        if (outletStats) {
          outletStats.prepMinutesSum += estimatedMin;
          outletStats.prepCount += 1;
        }
      }
    }
  }

  const totalOrdersCount = allOrders.length;
  const totalRevenuePaise = totalDirectGMVPaise + cateringGMVPaise;
  const averageOrderValuePaise =
    totalPaidOrders > 0 ? Math.round(totalRevenuePaise / totalPaidOrders) : 0;
  const cancellationRatePercent = calculateCancellationRatePercent(
    cancelledOrdersCount,
    totalOrdersCount,
  );

  // Repeat customers calculation (customers with >= 2 paid orders)
  const orderingCustomersCount = chainCustomerOrderCounts.size;
  let repeatCustomersCount = 0;
  for (const count of chainCustomerOrderCounts.values()) {
    if (count >= 2) repeatCustomersCount += 1;
  }
  const repeatCustomerRatePercent = calculateRepeatCustomerRatePercent(
    repeatCustomersCount,
    orderingCustomersCount,
  );

  const commissionSavedPaise = calculateDirectCommissionSavings(totalDirectGMVPaise);
  const cateringMarginCapturedPaise = calculateCateringMarginCaptured(cateringGMVPaise);
  const totalValueCapturedPaise = calculateTotalValueCaptured(
    totalDirectGMVPaise,
    cateringGMVPaise,
  );
  const targetProgressPercent = calculateTargetProgressPercent(totalValueCapturedPaise);

  const marketingOptInPercent = calculateMarketingOptInPercent(
    marketingOptedInCount,
    totalCustomers,
  );
  const onTimeSlaPercent = calculateOnTimeSlaPercent(onTimeOrders, completedOrders);
  const avgPrepMinutes =
    prepMinutesCount > 0 ? Math.round(totalPrepMinutesSum / prepMinutesCount) : 22;

  // Build outlet performances
  const outletPerformances: OutletPerformance[] = outlets.map((outlet) => {
    const stats = outletMap.get(outlet.id);
    if (!stats) {
      return {
        id: outlet.id,
        name: outlet.name,
        city: outlet.city,
        isCloudKitchen: outlet.isCloudKitchen,
        minimumPrepMinutes: outlet.minimumPrepMinutes,
        totalOrders: 0,
        paidOrders: 0,
        activeKitchenOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        cancellationRatePercent: 0,
        totalRevenuePaise: 0,
        directRegularRevenuePaise: 0,
        averageOrderValuePaise: 0,
        commissionSavedPaise: 0,
        cateringOrders: 0,
        cateringRevenuePaise: 0,
        onTimeOrders: 0,
        lateOrders: 0,
        onTimePercent: 100,
        avgPrepMinutes: outlet.minimumPrepMinutes,
        uniqueCustomers: 0,
        repeatCustomers: 0,
        repeatCustomerRatePercent: 0,
      };
    }

    const regularRevenue = Math.max(0, stats.totalRevenuePaise - stats.cateringRevenuePaise);
    const commSaved = calculateDirectCommissionSavings(regularRevenue);
    const onTimeRate = calculateOnTimeSlaPercent(stats.onTimeOrders, stats.completedOrders);
    const avgPrep =
      stats.prepCount > 0
        ? Math.round(stats.prepMinutesSum / stats.prepCount)
        : outlet.minimumPrepMinutes;
    const cancelRate = calculateCancellationRatePercent(
      stats.cancelledOrders,
      stats.totalOrders,
    );

    const uniqueCustomers = stats.customerOrderCounts.size;
    let outletRepeatCustomers = 0;
    for (const c of stats.customerOrderCounts.values()) {
      if (c >= 2) outletRepeatCustomers += 1;
    }
    const repeatRate = calculateRepeatCustomerRatePercent(
      outletRepeatCustomers,
      uniqueCustomers,
    );
    const aov =
      stats.paidOrders > 0 ? Math.round(stats.totalRevenuePaise / stats.paidOrders) : 0;

    return {
      id: outlet.id,
      name: outlet.name,
      city: outlet.city,
      isCloudKitchen: outlet.isCloudKitchen,
      minimumPrepMinutes: outlet.minimumPrepMinutes,
      totalOrders: stats.totalOrders,
      paidOrders: stats.paidOrders,
      activeKitchenOrders: stats.activeKitchenOrders,
      completedOrders: stats.completedOrders,
      cancelledOrders: stats.cancelledOrders,
      cancellationRatePercent: cancelRate,
      totalRevenuePaise: stats.totalRevenuePaise,
      directRegularRevenuePaise: regularRevenue,
      averageOrderValuePaise: aov,
      commissionSavedPaise: commSaved,
      cateringOrders: stats.cateringOrders,
      cateringRevenuePaise: stats.cateringRevenuePaise,
      onTimeOrders: stats.onTimeOrders,
      lateOrders: stats.lateOrders,
      onTimePercent: onTimeRate,
      avgPrepMinutes: avgPrep,
      uniqueCustomers,
      repeatCustomers: outletRepeatCustomers,
      repeatCustomerRatePercent: repeatRate,
    };
  });

  // Recent orders (include up to 20 so outlet filtering has rich data)
  const recentOrders: RecentExecutiveOrder[] = allOrders.slice(0, 20).map((order) => {
    const isCat = order.isCatering;
    const commSaved =
      order.status === "CANCELLED"
        ? 0
        : isCat
          ? calculateCateringMarginCaptured(order.totalPaise)
          : calculateDirectCommissionSavings(order.totalPaise);

    const promisedTime = order.promisedReadyAt.getTime();
    const isLate =
      order.status !== "CANCELLED" &&
      order.status !== "HANDED_OFF" &&
      order.status !== "READY" &&
      now > promisedTime;
    const prepMinutes =
      order.aiEstimatedMinutes ??
      Math.max(10, Math.round((promisedTime - order.createdAt.getTime()) / 60_000));

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      outletId: order.outletId,
      outletName: order.outlet.name,
      customerName: order.customer.name,
      totalPaise: order.totalPaise,
      status: order.status,
      isCatering: isCat,
      guestCount: order.guestCount,
      commissionSavedPaise: commSaved,
      prepMinutes,
      isLate,
      createdAt: order.createdAt.toISOString(),
    };
  });

  return {
    totalOrdersCount,
    totalPaidOrders,
    activeKitchenOrdersCount,
    completedOrders,
    cancelledOrdersCount,
    cancellationRatePercent,
    totalDirectGMVPaise,
    directOrdersCount,
    cateringGMVPaise,
    cateringOrdersCount,
    totalRevenuePaise,
    averageOrderValuePaise,
    commissionSavedPaise,
    cateringMarginCapturedPaise,
    totalValueCapturedPaise,
    annualTargetPaise: ANNUAL_SAVINGS_TARGET_PAISE,
    targetProgressPercent,
    totalCustomers,
    orderingCustomersCount,
    repeatCustomersCount,
    repeatCustomerRatePercent,
    marketingOptedInCount,
    marketingOptInPercent,
    onTimeOrders,
    onTimeSlaPercent,
    criticalLateOrders,
    avgPrepMinutes,
    outlets: outletPerformances,
    recentOrders,
  };
}
