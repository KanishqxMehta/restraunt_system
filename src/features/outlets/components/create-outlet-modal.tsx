"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { AlertBanner, useAlert } from "@/components/ui/alert-toast";
import type { CreateOutletInput } from "../validation";

interface CreateOutletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateOutletModal({
  isOpen,
  onClose,
  onCreated,
}: CreateOutletModalProps) {
  const alert = useAlert();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("17.4485");
  const [longitude, setLongitude] = useState("78.3742");
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState("8.0");
  const [fssaiLicense, setFssaiLicense] = useState("13624014000399");
  const [isCloudKitchen, setIsCloudKitchen] = useState(false);
  const [minimumPrepMinutes, setMinimumPrepMinutes] = useState("20");
  const [packingMinutes, setPackingMinutes] = useState("5");
  const [opensAtMinute, setOpensAtMinute] = useState("660"); // 11:00 AM
  const [closesAtMinute, setClosesAtMinute] = useState("1380"); // 11:00 PM
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setName("");
    setCity("Hyderabad");
    setAddress("");
    setLatitude("17.4485");
    setLongitude("78.3742");
    setDeliveryRadiusKm("8.0");
    setFssaiLicense("13624014000399");
    setIsCloudKitchen(false);
    setMinimumPrepMinutes("20");
    setPackingMinutes("5");
    setOpensAtMinute("660");
    setClosesAtMinute("1380");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: CreateOutletInput = {
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        deliveryRadiusKm: parseFloat(deliveryRadiusKm),
        fssaiLicense: fssaiLicense.trim(),
        isCloudKitchen,
        minimumPrepMinutes: parseInt(minimumPrepMinutes, 10),
        packingMinutes: parseInt(packingMinutes, 10),
        kitchenCapacity: 3,
        opensAtMinute: parseInt(opensAtMinute, 10),
        closesAtMinute: parseInt(closesAtMinute, 10),
      };

      const res = await fetch("/api/admin/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create outlet");
      }

      alert.success(
        "Outlet Added to Fleet",
        `"${name.trim()}" (${isCloudKitchen ? "Cloud Kitchen" : "Dine-in"}) is now live.`,
      );
      resetForm();
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
      alert.failure("Failed to Add Outlet", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} title="Add New Outlet / Cloud Kitchen">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <AlertBanner
            variant="failure"
            title="Could Not Create Outlet"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Outlet Name"
            placeholder="e.g. Madhapur Cloud Kitchen"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <InputField
            label="City"
            placeholder="Hyderabad"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>

        <InputField
          label="Full Street Address"
          placeholder="e.g. Ground Floor, Plot 14, Hitec City Phase 2, Madhapur"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InputField
            label="FSSAI Licence Number (14 Digits)"
            placeholder="13624014000399"
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
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2.5 rounded-xl border border-[#ded2bf] bg-[#faf7f2] p-3 text-xs font-bold text-[#0f352d] cursor-pointer">
              <input
                type="checkbox"
                checked={isCloudKitchen}
                onChange={(e) => setIsCloudKitchen(e.target.checked)}
                className="h-4 w-4 rounded border-[#ded2bf] text-[#0f352d] focus:ring-[#0f352d]"
              />
              <span>Cloud Kitchen (Delivery Only)</span>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-[#e8dfcf] bg-[#fbf9f5] p-3.5 space-y-3">
          <span className="block text-xs font-bold text-[#0f352d] uppercase tracking-wider">
            GPS Coordinates (For Distance Routing)
          </span>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Latitude"
              type="number"
              step="0.0001"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
            />
            <InputField
              label="Longitude"
              type="number"
              step="0.0001"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
            />
          </div>
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

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ece3d5]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Provisioning..." : "Provision Outlet"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
