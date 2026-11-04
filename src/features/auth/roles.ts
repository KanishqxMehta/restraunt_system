export const roles = ["CUSTOMER", "KITCHEN_STAFF", "CENTRAL_ADMIN"] as const;
export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  CUSTOMER: "Customer",
  KITCHEN_STAFF: "Kitchen staff",
  CENTRAL_ADMIN: "Central admin",
};

export function homeForRole(role: Role): string {
  if (role === "CENTRAL_ADMIN") return "/admin/menu";
  if (role === "KITCHEN_STAFF") return "/kitchen";
  return "/account";
}
