export interface OutletPerformance {
  id: string;
  name: string;
  city: string;
  isCloudKitchen: boolean;
  minimumPrepMinutes: number;
  // Orders breakdown
  totalOrders: number; // All paid + cancelled orders
  paidOrders: number;
  activeKitchenOrders: number; // NEW + PREPARING + READY
  completedOrders: number; // READY + HANDED_OFF
  cancelledOrders: number;
  cancellationRatePercent: number;
  // Revenue
  totalRevenuePaise: number;
  directRegularRevenuePaise: number;
  averageOrderValuePaise: number;
  commissionSavedPaise: number;
  // Catering
  cateringOrders: number;
  cateringRevenuePaise: number;
  // Prep Time & SLA
  onTimeOrders: number;
  lateOrders: number;
  onTimePercent: number;
  avgPrepMinutes: number;
  // Repeat Customer Retention
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatCustomerRatePercent: number;
}

export interface RecentExecutiveOrder {
  id: string;
  orderNumber: string;
  outletId: string;
  outletName: string;
  customerName: string;
  totalPaise: number;
  status: string;
  isCatering: boolean;
  guestCount?: number | null;
  commissionSavedPaise: number;
  prepMinutes?: number;
  isLate?: boolean;
  createdAt: string;
}

export interface ExecutiveAnalyticsSummary {
  // Core Operational Metrics (100% database-driven)
  totalOrdersCount: number; // All paid + cancelled orders
  totalPaidOrders: number;
  activeKitchenOrdersCount: number;
  completedOrders: number;
  cancelledOrdersCount: number;
  cancellationRatePercent: number;

  // Revenue & Average Order Value
  totalDirectGMVPaise: number; // Direct regular GMV
  directOrdersCount: number;
  cateringGMVPaise: number;
  cateringOrdersCount: number;
  totalRevenuePaise: number; // Direct + Catering GMV
  averageOrderValuePaise: number;

  // Default Financial Benchmarks (recalculated dynamically on client when admin customizes rates)
  commissionSavedPaise: number;
  cateringMarginCapturedPaise: number;
  totalValueCapturedPaise: number;
  annualTargetPaise: number;
  targetProgressPercent: number;

  // Customer Retention & First-Party DPDP Database
  totalCustomers: number;
  orderingCustomersCount: number;
  repeatCustomersCount: number;
  repeatCustomerRatePercent: number;
  marketingOptedInCount: number;
  marketingOptInPercent: number;

  // Kitchen SLA & Prep Time Operations
  onTimeOrders: number;
  onTimeSlaPercent: number;
  criticalLateOrders: number; // >10 min late
  avgPrepMinutes: number;

  // Outlets breakdown
  outlets: OutletPerformance[];

  // Recent activity
  recentOrders: RecentExecutiveOrder[];
}
