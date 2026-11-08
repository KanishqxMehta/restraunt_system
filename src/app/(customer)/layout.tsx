import type { ReactNode } from "react";
import { requirePageViewer } from "@/features/auth/session";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CartProvider } from "@/features/cart/context";
export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await requirePageViewer(["CUSTOMER"]);
  return (
    <CartProvider key={viewer.id} userId={viewer.id}>
      <WorkspaceShell viewer={viewer}>
        {children}
      </WorkspaceShell>
    </CartProvider>
  );
}
