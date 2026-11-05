export interface OutletPerformance {
  id: string;
  name: string;
  city: string;
  isCloudKitchen: boolean;
  totalOrders: number;
  totalRevenuePaise: number;
  commissionSavedPaise: number;
  cateringOrders: number;
  cateringRevenuePaise: number;
  onTimePercent: number;
  avgPrepMinutes: number;
}

export interface RecentExecutiveOrder {
  id: string;
  orderNumber: string;
  outletName: string;
  customerName: string;
  totalPaise: number;
  status: string;
  isCatering: boolean;
  guestCount?: number | null;
  commissionSavedPaise: number;
  createdAt: string;
}

export interface ExecutiveAnalyticsSummary {
  // Financial Impact (₹1.14 Cr Target)
  totalDirectGMVPaise: number;
  directOrdersCount: number;
  commissionSavedPaise: number; // 15% net savings on direct regular orders
  cateringGMVPaise: number;
  cateringOrdersCount: number;
  cateringMarginCapturedPaise: number; // 30% margin on bulk catering
  totalValueCapturedPaise: number; // commissionSaved + cateringMargin
  annualTargetPaise: number; // ₹1,14,48,000
  targetProgressPercent: number;

  // First-party Customer Relationship Ownership (DPDP 2023)
  totalCustomers: number;
  marketingOptedInCount: number;
  marketingOptInPercent: number;

  // Kitchen SLA & Operations
  totalPaidOrders: number;
  completedOrders: number;
  onTimeOrders: number;
  onTimeSlaPercent: number;
  criticalLateOrders: number; // >10 min late
  avgPrepMinutes: number;

  // Outlets breakdown
  outlets: OutletPerformance[];

  // Recent activity
  recentOrders: RecentExecutiveOrder[];
}
