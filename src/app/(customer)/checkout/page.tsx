import { redirect } from "next/navigation";
import { requirePageViewer } from "@/features/auth/session";
import { loadOrderPage } from "@/features/orders/page-loader";
import { listAvailableCustomerCoupons } from "@/features/coupons/service";
import { CheckoutExperience } from "@/features/checkout/components/checkout-experience";
import { MockPayment } from "@/features/checkout/components/mock-payment";
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const viewer = await requirePageViewer(["CUSTOMER"]);
  const { order: id } = await searchParams;
  if (!id) {
    const availableCoupons = await listAvailableCustomerCoupons(viewer.id);
    return <CheckoutExperience initialAvailableCoupons={availableCoupons} />;
  }
  const order = await loadOrderPage(viewer, id);
  if (order.paymentStatus === "PAID") redirect(`/orders/${order.id}`);
  return <MockPayment key={order.id} order={order} />;
}
