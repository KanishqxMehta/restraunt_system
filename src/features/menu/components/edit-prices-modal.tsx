"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
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
      onPricesUpdated();
    } catch (err) {
      setError(errorMessage(err));
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
      setError("Please enter a valid price in rupees.");
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
      setNewPortionName("");
      setNewPortionRupees("");
      onPricesUpdated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Manage pricing: ${item.name}`} onClose={onClose}>
      <div className="space-y-6">
        <p className="text-xs text-stone-500">
          All city prices include 5% GST. Customer checkout will extract the inclusive tax automatically.
        </p>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        {/* Existing Portions */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-stone-900">Current portions & city prices</h3>
          {(item.portions || []).map((portion) => (
            <div key={portion.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-stone-900">{portion.name}</span>
                <span className="text-xs text-stone-500">
                  {portion.prepMinutesOverride ? `Prep: ${portion.prepMinutesOverride}m` : "Uses base prep"}
                </span>
              </div>

              <div className="space-y-2">
                {(portion.prices || []).map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-stone-700 font-medium">{p.city}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-stone-400 text-sm">₹</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={pricesState[portion.id]?.[p.city] ?? ""}
                        onChange={(e) => handlePriceChange(portion.id, p.city, e.target.value)}
                        className="h-10 w-full rounded-lg border border-stone-300 pl-7 pr-3 text-sm outline-none focus:border-stone-800 bg-white"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-10 px-3 text-xs"
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
        <form onSubmit={handleAddNewPortion} className="rounded-xl border border-dashed border-stone-300 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-stone-800">+ Add new portion</h4>
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
            <Button type="submit" disabled={submitting} className="min-h-10 text-xs">
              Add portion
            </Button>
          </div>
        </form>

        <div className="flex justify-end pt-3 border-t border-stone-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
