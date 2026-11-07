"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { SelectMenu } from "@/components/ui/select-menu";
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

const CATEGORIES = [
  "Biryani",
  "Sides",
  "Desserts",
  "Breads",
  "Beverages",
  "Curries",
];

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
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
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
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#433d35]">
              Category
            </label>
            <SelectMenu
              value={category}
              onChange={(val) => setCategory(val)}
              size="md"
              fullWidth
              searchable={false}
              options={CATEGORIES.map((c) => ({
                value: c,
                label: c,
              }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#433d35]">
            Description
          </label>
          <textarea
            required
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Fragrant basmati layered with spices and slow dum cooking."
            className="w-full rounded-xl border border-[#dcd2c2] bg-[#fffdfa] p-3 text-sm font-medium text-[#1f1c18] outline-none focus:border-[#0f352d]"
          />
        </div>

        {/* Dietary & Spice */}
        <div className="grid gap-4 rounded-2xl border border-[#e6dccb] bg-[#faf7f2] p-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#433d35]">
              Dietary classification
            </label>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-emerald-800">
                <input
                  type="radio"
                  name="isVeg"
                  checked={isVeg}
                  onChange={() => setIsVeg(true)}
                  className="accent-emerald-700"
                />
                ● Veg
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-red-800">
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
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#433d35]">
              Spice level ({["Mild", "Gentle", "Medium", "Hot"][spiceLevel]})
            </label>
            <input
              type="range"
              min={0}
              max={3}
              value={spiceLevel}
              onChange={(e) => setSpiceLevel(Number(e.target.value))}
              className="w-full cursor-pointer accent-[#0f352d]"
            />
          </div>
        </div>

        {/* Portion and City Price */}
        <div className="space-y-3 rounded-2xl border border-[#e3d2b4] bg-[#fcf6eb] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4e3f28]">
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
        <div className="space-y-3 rounded-2xl border border-[#e5dbc9] bg-[#faf7f2] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#0f352d]">
                Time-based service window
              </p>
              <p className="text-xs text-[#655c50]">
                Restricts orderability to specific hours (e.g. Haleem dinner
                only)
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={timeRestricted}
                onChange={(e) => setTimeRestricted(e.target.checked)}
                className="h-4 w-4 rounded accent-[#0f352d]"
              />
              <span className="font-bold text-[#0f352d]">Enable</span>
            </label>
          </div>

          {timeRestricted && (
            <div className="grid grid-cols-2 gap-3 border-t border-[#e5dbc9] pt-3">
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
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#433d35]">
            Photo
          </label>
          <div className="mb-3 flex flex-wrap gap-2">
            {PRESET_IMAGES.map((img) => (
              <button
                type="button"
                key={img.url}
                onClick={() => setImageUrl(img.url)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                  imageUrl === img.url
                    ? "border-[#0f352d] bg-[#0f352d] text-white"
                    : "border-[#dfd4c2] bg-[#faf7f2] text-[#544d42] hover:bg-white"
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
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#433d35]">
            Allergens
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGENS.map((allergen) => (
              <label
                key={allergen}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${
                  allergens.includes(allergen)
                    ? "border-[#dec9ec] bg-[#3b1747] text-white"
                    : "border-[#dfd4c2] bg-[#faf7f2] text-[#575046]"
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

        <div className="flex justify-end gap-3 border-t border-[#ece3d5] pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
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
