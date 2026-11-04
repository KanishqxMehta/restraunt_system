/** Public credentials for synthetic local demo accounts only. Never use in production. */
export const DEMO_PASSWORD = "DemoAccess!2026";
export const demoAccounts = [
  {
    id: "demo-customer",
    name: "Demo customer",
    email: "customer@demo.example",
    role: "CUSTOMER",
  },
  {
    id: "demo-customer-two",
    name: "Second demo customer",
    email: "customer2@demo.example",
    role: "CUSTOMER",
  },
  {
    id: "demo-kondapur",
    name: "Kondapur kitchen",
    email: "kondapur@demo.example",
    role: "KITCHEN_STAFF",
    outletId: "outlet-kondapur",
  },
  {
    id: "demo-gachibowli",
    name: "Gachibowli kitchen",
    email: "gachibowli@demo.example",
    role: "KITCHEN_STAFF",
    outletId: "outlet-gachibowli",
  },
  {
    id: "demo-admin",
    name: "Central menu team",
    email: "admin@demo.example",
    role: "CENTRAL_ADMIN",
  },
] as const;
