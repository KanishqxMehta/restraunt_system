/** Public credentials for synthetic local demo accounts only. Never use in production. */
export const DEMO_PASSWORD = "DemoAccess!2026";
export const demoAccounts = [
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
    id: "demo-kondapur",
    name: "Kondapur kitchen",
    email: "kondapur@demo.example",
    role: "KITCHEN_STAFF",
    outletId: "outlet-kondapur",
    summary: "Live KDS for Kondapur Dine-in (WEB-778120 + high-volume queue)",
  },
  {
    id: "demo-gachibowli",
    name: "Gachibowli kitchen",
    email: "gachibowli@demo.example",
    role: "KITCHEN_STAFF",
    outletId: "outlet-gachibowli",
    summary: "Live KDS for Gachibowli Cloud Kitchen (WEB-778131 + rider handoff)",
  },
  {
    id: "demo-admin",
    name: "Central menu team",
    email: "admin@demo.example",
    role: "CENTRAL_ADMIN",
    summary: "Outlet analytics, central menu CMS, 17-outlet fleet & multi-KDS",
  },
] as const;
