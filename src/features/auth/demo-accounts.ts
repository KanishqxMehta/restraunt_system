/** Public credentials for synthetic local demo accounts only. Never use in production. */
export const DEMO_PASSWORD = "DemoAccess!2026";

/** Production credentials for non-demo evaluation accounts (2 customers, 2 kitchens, admin). */
export const PRODUCTION_PASSWORD = "CompanyA!Secure2026";

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "KITCHEN_STAFF" | "CENTRAL_ADMIN";
  summary: string;
  outletId?: string;
  pin?: string;
}

export const productionAccounts = [
  {
    id: "prod-customer-1",
    name: "Rahul Sharma",
    email: "rahul.sharma@companya-orders.in",
    role: "CUSTOMER" as const,
    summary: "Real Customer Account 1 - Order placement, checkout & loyalty",
  },
  {
    id: "prod-customer-2",
    name: "Priya Reddy",
    email: "priya.reddy@companya-orders.in",
    role: "CUSTOMER" as const,
    summary: "Real Customer Account 2 - Multi-user isolation & party catering",
  },
  {
    id: "prod-kondapur-chef",
    name: "Kondapur Head Chef",
    email: "chef.kondapur@companya-kitchens.in",
    role: "KITCHEN_STAFF" as const,
    outletId: "outlet-kondapur",
    pin: "4512",
    summary: "Kondapur Dine-in Kitchen - Production KDS & Stock Management",
  },
  {
    id: "prod-gachibowli-expediter",
    name: "Gachibowli Expediter",
    email: "expediter.gachibowli@companya-kitchens.in",
    role: "KITCHEN_STAFF" as const,
    outletId: "outlet-gachibowli",
    pin: "6834",
    summary: "Gachibowli Cloud Kitchen - Production KDS & Tenant Isolation",
  },
  {
    id: "prod-admin",
    name: "Operations Director",
    email: "ops.director@companya.in",
    role: "CENTRAL_ADMIN" as const,
    summary: "Central Operations Director - Menu, Fleet, Coupons & BI",
  },
];

export function getOutletStaffEmail(outletSlug: string): string {
  const cleanSlug = outletSlug
    .toLowerCase()
    .replace(/^outlet-/, "")
    .replace(/[^a-z0-9-]/g, "");
  return `${cleanSlug}@demo.example`;
}

export function getOutletStaffPin(outletId: string): string {
  let hash = 0;
  for (let i = 0; i < outletId.length; i++) {
    hash = (hash << 5) - hash + outletId.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  return String(1000 + (abs % 9000));
}

export function getOutletStaffCredentials(outlet: {
  id: string;
  slug?: string;
  name: string;
}) {
  const slug = outlet.slug || outlet.id.replace(/^outlet-/, "");
  return {
    outletId: outlet.id,
    outletName: outlet.name,
    staffName: `${outlet.name} Kitchen Staff`,
    email: getOutletStaffEmail(slug),
    password: DEMO_PASSWORD,
    pin: getOutletStaffPin(outlet.id),
    role: "KITCHEN_STAFF" as const,
  };
}

export const demoAccounts: DemoAccount[] = [
  {
    id: "demo-customer",
    name: "Demo customer",
    email: "customer@demo.example",
    role: "CUSTOMER",
    summary: "Order food, redeem Royal Rewards points, or book party catering",
  },
  {
    id: "demo-customer-two",
    name: "Second demo customer",
    email: "customer2@demo.example",
    role: "CUSTOMER",
    summary: "Secondary customer account for order isolation testing",
  },
  {
    id: "demo-customer-three",
    name: "Third demo customer",
    email: "customer3@demo.example",
    role: "CUSTOMER",
    summary: "Third customer account for catering, coupon testing & multi-user flows",
  },
  {
    id: "demo-kondapur",
    name: "Kondapur kitchen",
    email: "kondapur@demo.example",
    role: "KITCHEN_STAFF",
    outletId: "outlet-kondapur",
    pin: "7821",
    summary: "Live KDS for Kondapur Dine-in (WEB-778120 + high-volume queue)",
  },
  {
    id: "demo-gachibowli",
    name: "Gachibowli kitchen",
    email: "gachibowli@demo.example",
    role: "KITCHEN_STAFF",
    outletId: "outlet-gachibowli",
    pin: "8342",
    summary: "Live KDS for Gachibowli Cloud Kitchen (WEB-778131 + rider handoff)",
  },
  {
    id: "demo-admin",
    name: "Central menu team",
    email: "admin@demo.example",
    role: "CENTRAL_ADMIN",
    summary: "Outlet analytics, central menu CMS, 17-outlet fleet & multi-KDS",
  },
];
