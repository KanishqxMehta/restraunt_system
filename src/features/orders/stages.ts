export const kitchenStages = ["NEW", "PREPARING", "READY"] as const;
export type KitchenStage = (typeof kitchenStages)[number];

export const stageActions = {
  NEW: { next: "PREPARING", label: "Start preparing" },
  PREPARING: { next: "READY", label: "Mark ready" },
  READY: { next: "HANDED_OFF", label: "Confirm handoff" },
} as const;

export const customerStages = [
  { status: "NEW", label: "Order received" },
  { status: "PREPARING", label: "In the kitchen" },
  { status: "READY", label: "Ready for pickup" },
  { status: "HANDED_OFF", label: "With delivery partner" },
] as const;
