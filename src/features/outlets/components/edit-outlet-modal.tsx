"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { AlertBanner, useAlert } from "@/components/ui/alert-toast";
import type { UpdateOutletInput } from "../validation";

export interface OutletDetail {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number;
  fssaiLicense: string;
  isCloudKitchen: boolean;
  isActive: boolean;
  minimumPrepMinutes: number;
  packingMinutes: number;
  opensAtMinute: number;
  closesAtMinute: number;
}

interface EditOutletModalProps {
  outlet: OutletDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditOutletModal({
  outlet,
  isOpen,
  onClose,
  onUpdated,
}: EditOutletModalProps) {
  if (!isOpen || !outlet) return null;

  return (
    <EditOutletForm
      key={outlet.id}
      outlet={outlet}
      onClose={onClose}
      onUpdated={onUpdated}
    />
  );
}

function EditOutletForm({
  outlet,
  onClose,
  onUpdated,
}: {
  outlet: OutletDetail;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const alert = useAlert();
  const [name, setName] = useState(outlet.name);
  const [city, setCity] = useState(outlet.city);
  const [address, setAddress] = useState(outlet.address);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(
    outlet.deliveryRadiusKm.toString(),
  );
  const [fssaiLicense, setFssaiLicense] = useState(outlet.fssaiLicense);
  const [isCloudKitchen, setIsCloudKitchen] = useState(outlet.isCloudKitchen);
  const [isActive, setIsActive] = useState(outlet.isActive);
  const [minimumPrepMinutes, setMinimumPrepMinutes] = useState(
    outlet.minimumPrepMinutes.toString(),
  );
  const [packingMinutes, setPackingMinutes] = useState(
    outlet.packingMinutes.toString(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: UpdateOutletInput = {
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        deliveryRadiusKm: parseFloat(deliveryRadiusKm),
        fssaiLicense: fssaiLicense.trim(),
        isCloudKitchen,
        isActive,
        minimumPrepMinutes: parseInt(minimumPrepMinutes, 10),
        packingMinutes: parseInt(packingMinutes, 10),
      };

      const res = await fetch(`/api/admin/outlets/${outlet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update outlet");
      }

      alert.success(
        "Outlet Updated",
        `Configuration saved for "${name.trim()}".`,
      );
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
      alert.failure("Failed to Update Outlet", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} title={`Edit: ${outlet.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <AlertBanner
            variant="failure"
            title="Could Not Save Outlet"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Outlet Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <InputField
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>

        <InputField
          label="Full Street Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="FSSAI Licence Number"
            value={fssaiLicense}
            onChange={(e) => setFssaiLicense(e.target.value)}
            maxLength={14}
            required
          />
          <InputField
            label="Delivery Radius (km)"
            type="number"
            step="0.5"
            min="0.5"
            max="50"
            value={deliveryRadiusKm}
            onChange={(e) => setDeliveryRadiusKm(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Min Kitchen Prep Floor (Minutes)"
            type="number"
            min="5"
            max="120"
            value={minimumPrepMinutes}
            onChange={(e) => setMinimumPrepMinutes(e.target.value)}
            required
          />
          <InputField
            label="Packaging Floor (Minutes)"
            type="number"
            min="1"
            max="30"
            value={packingMinutes}
            onChange={(e) => setPackingMinutes(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
          <label className="flex items-center gap-2.5 rounded-xl border border-[#ded2bf] bg-[#faf7f2] p-3 text-xs font-bold text-[#0f352d] cursor-pointer">
            <input
              type="checkbox"
              checked={isCloudKitchen}
              onChange={(e) => setIsCloudKitchen(e.target.checked)}
              className="h-4 w-4 rounded border-[#ded2bf] text-[#0f352d] focus:ring-[#0f352d]"
            />
            <span>Cloud Kitchen (Delivery Only)</span>
          </label>

          <label className="flex items-center gap-2.5 rounded-xl border border-[#ded2bf] bg-[#faf7f2] p-3 text-xs font-bold text-[#0f352d] cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[#ded2bf] text-[#0f352d] focus:ring-[#0f352d]"
            />
            <span>Active & Accepting Orders</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#ece3d5]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
