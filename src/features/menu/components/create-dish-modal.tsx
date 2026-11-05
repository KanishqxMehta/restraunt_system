"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { parseTimeToMinute } from "../time-windows";
import { requestJson, errorMessage } from "@/lib/http-client";
import type { AdminMenuItem } from "../types";

const COMMON_ALLERGENS = [
  "Milk",
  "Peanuts",
  "Tree nuts",
  "Gluten",
  "Sesame",
  "Soy",
  "Eggs",
  "Mustard",
];

const PRESET_IMAGES = [
  { label: "Chicken biryani", url: "/menu/chicken-biryani.jpg" },
  { label: "Veg biryani", url: "/menu/veg-biryani.jpg" },
  { label: "Mutton haleem", url: "/menu/haleem.jpg" },
  { label: "Mirchi ka salan", url: "/menu/salan.jpg" },
  { label: "Double ka meetha", url: "/menu/meetha.jpg" },
];

const CATEGORIES = ["Biryani", "Sides", "Desserts", "Breads", "Beverages", "Curries"];

interface CreateDishModalProps {
  onClose: () => void;
  onCreated: (item: AdminMenuItem) => void;
}

export function CreateDishModal({ onClose, onCreated }: CreateDishModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Biryani");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("/menu/chicken-biryani.jpg");
  const [isVeg, setIsVeg] = useState(false);
  const [spiceLevel, setSpiceLevel] = useState(2);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [basePrepMinutes, setBasePrepMinutes] = useState(20);
  const [prepStation, setPrepStation] = useState("MAIN");
  const [batchCapacity, setBatchCapacity] = useState(2);

  const [timeRestricted, setTimeRestricted] = useState(false);
  const [fromTime, setFromTime] = useState("17:00");
  const [toTime, setToTime] = useState("23:30");

  const [portionName, setPortionName] = useState("Regular");
  const [city, setCity] = useState("Hyderabad");
  const [priceRupees, setPriceRupees] = useState("350");

  function toggleAllergen(item: string) {
    setAllergens((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const price = parseFloat(priceRupees);
    if (isNaN(price) || price < 0) {
      setError("Please enter a valid price in rupees.");
      return;
    }
    const pricePaise = Math.round(price * 100);

    let fromMinute: number | null = null;
    let toMinute: number | null = null;

    if (timeRestricted) {
      fromMinute = parseTimeToMinute(fromTime);
      toMinute = parseTimeToMinute(toTime);
      if (fromMinute === null || toMinute === null) {
        setError("Invalid time window. Use HH:MM format (e.g. 17:00).");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim() || null,
        isVeg,
        spiceLevel,
        allergens,
        basePrepMinutes: Number(basePrepMinutes),
        prepStation: prepStation.trim(),
        batchCapacity: Number(batchCapacity),
        availableFromMinute: fromMinute,
        availableToMinute: toMinute,
        portions: [
          {
            name: portionName.trim() || "Regular",
            prices: [{ city: city.trim(), pricePaise }],
          },
        ],
        addons: [],
      };

      const res = await requestJson<{ item: AdminMenuItem }>("/api/admin/menu", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onCreated(res.item);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add menu item" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="Dish name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mutton Rogan Josh"
          />
          <div>
            <label className="block text-sm font-medium text-stone-800 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-800"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-800 mb-2">Description</label>
          <textarea
            required
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Fragrant basmati layered with spices and slow dum cooking."
            className="w-full rounded-xl border border-stone-300 p-3 text-sm outline-none focus:border-stone-800"
          />
        </div>

        {/* Dietary & Spice */}
        <div className="grid gap-4 sm:grid-cols-2 rounded-xl bg-stone-50 p-4 border border-stone-200">
          <div>
            <label className="block text-sm font-medium text-stone-800 mb-2">Dietary classification</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800 cursor-pointer">
                <input
                  type="radio"
                  name="isVeg"
                  checked={isVeg}
                  onChange={() => setIsVeg(true)}
                  className="accent-emerald-700"
                />
                ▣ Veg
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-red-800 cursor-pointer">
                <input
                  type="radio"
                  name="isVeg"
                  checked={!isVeg}
                  onChange={() => setIsVeg(false)}
                  className="accent-red-700"
                />
                ▲ Non-veg
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-800 mb-2">
              Spice level ({["Mild", "Gentle", "Medium", "Hot"][spiceLevel]})
            </label>
            <input
              type="range"
              min={0}
              max={3}
              value={spiceLevel}
              onChange={(e) => setSpiceLevel(Number(e.target.value))}
              className="w-full accent-orange-700 cursor-pointer"
            />
          </div>
        </div>

        {/* Portion and City Price */}
        <div className="rounded-xl bg-amber-50/50 p-4 border border-amber-200 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">
            Initial portion & city pricing (GST included)
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField
              label="Portion name"
              value={portionName}
              onChange={(e) => setPortionName(e.target.value)}
              placeholder="Regular"
              required
            />
            <InputField
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Hyderabad"
              required
            />
            <InputField
              label="Price (₹)"
              type="number"
              step="1"
              value={priceRupees}
              onChange={(e) => setPriceRupees(e.target.value)}
              placeholder="350"
              required
            />
          </div>
        </div>

        {/* Kitchen Parameters */}
        <div className="grid gap-3 sm:grid-cols-3">
          <InputField
            label="Base prep (min)"
            type="number"
            min={1}
            max={180}
            value={basePrepMinutes}
            onChange={(e) => setBasePrepMinutes(Number(e.target.value))}
            required
          />
          <InputField
            label="Prep station"
            value={prepStation}
            onChange={(e) => setPrepStation(e.target.value)}
            placeholder="MAIN"
            required
          />
          <InputField
            label="Batch capacity"
            type="number"
            min={1}
            max={50}
            value={batchCapacity}
            onChange={(e) => setBatchCapacity(Number(e.target.value))}
            required
          />
        </div>

        {/* Time-based Service Window */}
        <div className="rounded-xl border border-stone-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Time-based service window</p>
              <p className="text-xs text-stone-500">Restricts orderability to specific hours (e.g. Haleem dinner only)</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={timeRestricted}
                onChange={(e) => setTimeRestricted(e.target.checked)}
                className="h-4 w-4 rounded accent-stone-900"
              />
              <span className="font-semibold text-stone-700">Enable</span>
            </label>
          </div>

          {timeRestricted && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100">
              <InputField
                label="Available from (HH:MM)"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                placeholder="17:00"
              />
              <InputField
                label="Available until (HH:MM)"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                placeholder="23:30"
              />
            </div>
          )}
        </div>

        {/* Photo Selection */}
        <div>
          <label className="block text-sm font-medium text-stone-800 mb-2">Photo</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_IMAGES.map((img) => (
              <button
                type="button"
                key={img.url}
                onClick={() => setImageUrl(img.url)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  imageUrl === img.url
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                }`}
              >
                {img.label}
              </button>
            ))}
          </div>
          <InputField
            label="Image URL or local path"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/menu/chicken-biryani.jpg"
          />
        </div>

        {/* Allergens */}
        <div>
          <label className="block text-sm font-medium text-stone-800 mb-2">Allergens</label>
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGENS.map((allergen) => (
              <label
                key={allergen}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer border transition ${
                  allergens.includes(allergen)
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-stone-50 text-stone-600 border-stone-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={allergens.includes(allergen)}
                  onChange={() => toggleAllergen(allergen)}
                  className="sr-only"
                />
                {allergen}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving dish…" : "Create menu dish"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
