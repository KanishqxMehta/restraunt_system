"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { AlertBanner, useAlert } from "@/components/ui/alert-toast";
import { requestJson, errorMessage } from "@/lib/http-client";
import type { AdminMenuItem } from "../types";

interface EditPricesModalProps {
  item: AdminMenuItem;
  onClose: () => void;
  onPricesUpdated: () => void;
}

export function EditPricesModal({
  item,
  onClose,
  onPricesUpdated,
}: EditPricesModalProps) {
  const alert = useAlert();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Keep track of prices per portion
  const [pricesState, setPricesState] = useState<
    Record<string, Record<string, string>>
  >(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const portion of item.portions || []) {
      init[portion.id] = {};
      for (const p of portion.prices || []) {
        init[portion.id][p.city] = (p.pricePaise / 100).toString();
      }
    }
    return init;
  });

  // Adding a new portion state
  const [newPortionName, setNewPortionName] = useState("");
  const [newPortionCity, setNewPortionCity] = useState("Hyderabad");
  const [newPortionRupees, setNewPortionRupees] = useState("");

  function handlePriceChange(portionId: string, city: string, val: string) {
    setPricesState((prev) => ({
      ...prev,
      [portionId]: {
        ...prev[portionId],
        [city]: val,
      },
    }));
  }

  async function handleSavePortionPrices(portionId: string) {
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const cityMap = pricesState[portionId] || {};
      const prices = Object.entries(cityMap).map(([city, val]) => {
        const parsed = parseFloat(val);
        if (isNaN(parsed) || parsed < 0) {
          throw new Error(`Invalid price for ${city}`);
        }
        return {
          city,
          pricePaise: Math.round(parsed * 100),
        };
      });

      if (prices.length === 0) {
        throw new Error("At least one city price is required.");
      }

      await requestJson(`/api/admin/menu/${item.id}/prices`, {
        method: "PUT",
        body: JSON.stringify({
          portionId,
          prices,
        }),
      });

      setSuccess("Price updated successfully.");
      alert.success(
        "City Pricing Updated",
        `Updated city pricing for "${item.name}".`,
      );
      onPricesUpdated();
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      alert.failure("Pricing Update Failed", msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNewPortion(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const price = parseFloat(newPortionRupees);
    if (isNaN(price) || price < 0) {
      const msg = "Please enter a valid price in rupees.";
      setError(msg);
      alert.failure("Invalid Price", msg);
      return;
    }

    setSubmitting(true);
    try {
      await requestJson(`/api/admin/menu/${item.id}/prices`, {
        method: "POST",
        body: JSON.stringify({
          name: newPortionName.trim(),
          prices: [
            {
              city: newPortionCity.trim(),
              pricePaise: Math.round(price * 100),
            },
          ],
        }),
      });

      setSuccess(`Portion "${newPortionName}" added.`);
      alert.success(
        "New Portion Added",
        `Added "${newPortionName.trim()}" portion to "${item.name}".`,
      );
      setNewPortionName("");
      setNewPortionRupees("");
      onPricesUpdated();
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      alert.failure("Could Not Add Portion", msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Manage pricing: ${item.name}`} onClose={onClose}>
      <div className="space-y-6">
        <p className="text-xs leading-5 text-[#5f574c]">
          All city prices include 5% GST. Customer checkout will extract the
          inclusive tax automatically.
        </p>

        {error && (
          <AlertBanner
            variant="failure"
            title="Pricing Error"
            message={error}
            onDismiss={() => setError("")}
          />
        )}
        {success && (
          <AlertBanner
            variant="success"
            title="Pricing Saved"
            message={success}
            onDismiss={() => setSuccess("")}
          />
        )}

        {/* Existing Portions */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f352d]">
            Current portions & city prices
          </h3>
          {(item.portions || []).map((portion) => (
            <div
              key={portion.id}
              className="rounded-2xl border border-[#e5dbc9] bg-[#faf7f2] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display font-bold text-[#0f352d]">
                  {portion.name}
                </span>
                <span className="text-xs text-[#655c50]">
                  {portion.prepMinutesOverride
                    ? `Prep: ${portion.prepMinutesOverride}m`
                    : "Uses base prep"}
                </span>
              </div>

              <div className="space-y-2">
                {(portion.prices || []).map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-28 text-sm font-semibold text-[#4e473d]">
                      {p.city}
                    </span>
                    <div className="relative flex-1">
                      <span className="absolute top-2.5 left-3 text-sm text-[#7a7062]">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={pricesState[portion.id]?.[p.city] ?? ""}
                        onChange={(e) =>
                          handlePriceChange(portion.id, p.city, e.target.value)
                        }
                        className="font-mono-tabular h-10 w-full rounded-xl border border-[#dcd2c2] bg-white pr-3 pl-7 text-sm font-bold outline-none focus:border-[#0f352d]"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-10 px-3.5 text-xs"
                      disabled={submitting}
                      onClick={() => handleSavePortionPrices(portion.id)}
                    >
                      Save
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add New Portion */}
        <form
          onSubmit={handleAddNewPortion}
          className="space-y-3 rounded-2xl border border-dashed border-[#d6c9b6] bg-[#faf7f2]/60 p-4"
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#4a1d5a]">
            + Add new portion
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField
              label="Portion name"
              value={newPortionName}
              onChange={(e) => setNewPortionName(e.target.value)}
              placeholder="e.g. Family pack"
              required
            />
            <InputField
              label="City"
              value={newPortionCity}
              onChange={(e) => setNewPortionCity(e.target.value)}
              placeholder="Hyderabad"
              required
            />
            <InputField
              label="Price (₹)"
              type="number"
              step="1"
              value={newPortionRupees}
              onChange={(e) => setNewPortionRupees(e.target.value)}
              placeholder="940"
              required
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="min-h-10 text-xs"
            >
              Add portion
            </Button>
          </div>
        </form>

        <div className="flex justify-end border-t border-[#ece3d5] pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
