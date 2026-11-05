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
  ANNUAL_SAVINGS_TARGET_PAISE,
} from "./calculator";
import type { ExecutiveAnalyticsSummary, OutletPerformance, RecentExecutiveOrder } from "./types";

export async function getExecutiveAnalytics(viewer: Viewer): Promise<ExecutiveAnalyticsSummary> {
  requireRole(viewer, ["CENTRAL_ADMIN"]);
  const db = getDatabase();

  const [totalCustomers, marketingOptedInCount, outlets, paidOrders] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { role: "CUSTOMER", marketingOptIn: true } }),
    db.outlet.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        isCloudKitchen: true,
      },
      orderBy: { name: "asc" },
    }),
    db.order.findMany({
      where: { paymentStatus: "PAID" },
      include: {
        customer: { select: { name: true } },
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
  let completedOrders = 0;
  let onTimeOrders = 0;
  let criticalLateOrders = 0;
  let totalPrepMinutesSum = 0;
  let prepMinutesCount = 0;

  // Outlet aggregation map
  const outletMap = new Map<string, {
    totalOrders: number;
    totalRevenuePaise: number;
    cateringOrders: number;
    cateringRevenuePaise: number;
    completedOrders: number;
    onTimeOrders: number;
    prepMinutesSum: number;
    prepCount: number;
  }>();

  for (const o of outlets) {
    outletMap.set(o.id, {
      totalOrders: 0,
      totalRevenuePaise: 0,
      cateringOrders: 0,
      cateringRevenuePaise: 0,
      completedOrders: 0,
      onTimeOrders: 0,
      prepMinutesSum: 0,
      prepCount: 0,
    });
  }

  const now = Date.now();

  for (const order of paidOrders) {
    const isCat = order.isCatering;
    if (isCat) {
      cateringGMVPaise += order.totalPaise;
      cateringOrdersCount += 1;
    } else {
      totalDirectGMVPaise += order.totalPaise;
      directOrdersCount += 1;
    }

    const outletStats = outletMap.get(order.outletId);
    if (outletStats) {
      outletStats.totalOrders += 1;
      outletStats.totalRevenuePaise += order.totalPaise;
      if (isCat) {
        outletStats.cateringOrders += 1;
        outletStats.cateringRevenuePaise += order.totalPaise;
      }
    }

    // Determine completion and SLA
    const isCompleted = order.status === "READY" || order.status === "HANDED_OFF";
    const readyEvent = order.events.find((e) => e.status === "READY");
    const completionTime = readyEvent ? readyEvent.createdAt.getTime() : order.updatedAt.getTime();
    const promisedTime = order.promisedReadyAt.getTime();

    if (isCompleted) {
      completedOrders += 1;
      if (outletStats) outletStats.completedOrders += 1;

      // On-time if completed within promisedReadyAt
      if (completionTime <= promisedTime) {
        onTimeOrders += 1;
        if (outletStats) outletStats.onTimeOrders += 1;
      } else if (completionTime > promisedTime + 10 * 60_000) {
        criticalLateOrders += 1;
      }

      // Prep duration
      const durationMin = Math.max(1, Math.round((completionTime - order.createdAt.getTime()) / 60_000));
      totalPrepMinutesSum += durationMin;
      prepMinutesCount += 1;
      if (outletStats) {
        outletStats.prepMinutesSum += durationMin;
        outletStats.prepCount += 1;
      }
    } else {
      // In-flight order lateness
      if (now > promisedTime + 10 * 60_000) {
        criticalLateOrders += 1;
      }
    }
  }

  const commissionSavedPaise = calculateDirectCommissionSavings(totalDirectGMVPaise);
  const cateringMarginCapturedPaise = calculateCateringMarginCaptured(cateringGMVPaise);
  const totalValueCapturedPaise = calculateTotalValueCaptured(totalDirectGMVPaise, cateringGMVPaise);
  const targetProgressPercent = calculateTargetProgressPercent(totalValueCapturedPaise);

  const marketingOptInPercent = calculateMarketingOptInPercent(marketingOptedInCount, totalCustomers);
  const onTimeSlaPercent = calculateOnTimeSlaPercent(onTimeOrders, completedOrders);
  const avgPrepMinutes = prepMinutesCount > 0 ? Math.round(totalPrepMinutesSum / prepMinutesCount) : 22;

  // Build outlet performances
  const outletPerformances: OutletPerformance[] = outlets.map((outlet) => {
    const stats = outletMap.get(outlet.id) || {
      totalOrders: 0,
      totalRevenuePaise: 0,
      cateringOrders: 0,
      cateringRevenuePaise: 0,
      completedOrders: 0,
      onTimeOrders: 0,
      prepMinutesSum: 0,
      prepCount: 0,
    };

    const regularRevenue = Math.max(0, stats.totalRevenuePaise - stats.cateringRevenuePaise);
    const commSaved = calculateDirectCommissionSavings(regularRevenue);
    const onTimeRate = calculateOnTimeSlaPercent(stats.onTimeOrders, stats.completedOrders);
    const avgPrep = stats.prepCount > 0 ? Math.round(stats.prepMinutesSum / stats.prepCount) : 20;

    return {
      id: outlet.id,
      name: outlet.name,
      city: outlet.city,
      isCloudKitchen: outlet.isCloudKitchen,
      totalOrders: stats.totalOrders,
      totalRevenuePaise: stats.totalRevenuePaise,
      commissionSavedPaise: commSaved,
      cateringOrders: stats.cateringOrders,
      cateringRevenuePaise: stats.cateringRevenuePaise,
      onTimePercent: onTimeRate,
      avgPrepMinutes: avgPrep,
    };
  });

  // Recent orders
  const recentOrders: RecentExecutiveOrder[] = paidOrders.slice(0, 8).map((order) => {
    const isCat = order.isCatering;
    const commSaved = isCat
      ? calculateCateringMarginCaptured(order.totalPaise)
      : calculateDirectCommissionSavings(order.totalPaise);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      outletName: order.outlet.name,
      customerName: order.customer.name,
      totalPaise: order.totalPaise,
      status: order.status,
      isCatering: isCat,
      guestCount: order.guestCount,
      commissionSavedPaise: commSaved,
      createdAt: order.createdAt.toISOString(),
    };
  });

  return {
    totalDirectGMVPaise,
    directOrdersCount,
    commissionSavedPaise,
    cateringGMVPaise,
    cateringOrdersCount,
    cateringMarginCapturedPaise,
    totalValueCapturedPaise,
    annualTargetPaise: ANNUAL_SAVINGS_TARGET_PAISE,
    targetProgressPercent,
    totalCustomers,
    marketingOptedInCount,
    marketingOptInPercent,
    totalPaidOrders: paidOrders.length,
    completedOrders,
    onTimeOrders,
    onTimeSlaPercent,
    criticalLateOrders,
    avgPrepMinutes,
    outlets: outletPerformances,
    recentOrders,
  };
}
