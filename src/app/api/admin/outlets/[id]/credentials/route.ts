import { requireViewer } from "@/features/auth/session";
import { getOutletStaffCredentials } from "@/features/auth/demo-accounts";
import { getDatabase } from "@/server/db/client";
import { apiError, HttpError } from "@/server/http/errors";
import { hashPassword } from "better-auth/crypto";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireViewer(["CENTRAL_ADMIN"]);
    const { id } = await context.params;
    if (!id) throw new HttpError(400, "Outlet ID is required.");

    const db = getDatabase();
    const outlet = await db.outlet.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        isCloudKitchen: true,
        fssaiLicense: true,
      },
    });

    if (!outlet) {
      throw new HttpError(404, "Outlet not found.");
    }

    const creds = getOutletStaffCredentials({
      id: outlet.id,
      slug: outlet.slug || undefined,
      name: outlet.name,
    });

    // Check if staff user exists or auto-provision
    let staffUser = await db.user.findUnique({
      where: { email: creds.email },
      include: { memberships: true },
    });

    if (!staffUser) {
      const staffUserId = `staff-${outlet.id}`;
      const hashedPassword = await hashPassword(creds.password);

      staffUser = await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: staffUserId,
            email: creds.email,
            name: creds.staffName,
            role: "KITCHEN_STAFF",
          },
          include: { memberships: true },
        });

        await tx.account.create({
          data: {
            id: `credential-${staffUserId}`,
            accountId: staffUserId,
            providerId: "credential",
            userId: staffUserId,
            password: hashedPassword,
          },
        });

        await tx.outletMembership.create({
          data: {
            userId: staffUserId,
            outletId: outlet.id,
          },
        });

        return user;
      });
    } else {
      // Ensure outlet membership is attached
      const hasMembership = staffUser.memberships.some(
        (m) => m.outletId === outlet.id,
      );
      if (!hasMembership) {
        await db.outletMembership.create({
          data: {
            userId: staffUser.id,
            outletId: outlet.id,
          },
        });
      }
    }

    return Response.json(
      {
        outletId: outlet.id,
        outletName: outlet.name,
        slug: outlet.slug,
        isCloudKitchen: outlet.isCloudKitchen,
        fssaiLicense: outlet.fssaiLicense,
        staffName: creds.staffName,
        email: creds.email,
        password: creds.password,
        pin: creds.pin,
        role: "KITCHEN_STAFF",
        kdsUrl: `/kitchen?outlet=${outlet.id}`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
