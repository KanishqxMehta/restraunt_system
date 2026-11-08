"use client";

import { useState } from "react";
import { Plus, Trash2, Info, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { SelectMenu } from "@/components/ui/select-menu";
import { AlertBanner, useAlert } from "@/components/ui/alert-toast";
import { DishImage } from "./dish-image";
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

interface PortionRow {
  id: string;
  name: string;
  city: string;
  priceRupees: string;
}

interface CreateDishModalProps {
  onClose: () => void;
  onCreated: (item: AdminMenuItem) => void;
}

export function CreateDishModal({ onClose, onCreated }: CreateDishModalProps) {
  const alert = useAlert();
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

  // Newly created dishes default strictly to inactive/draft as requested
  // Admin must explicitly verify and activate them from the board

  // Multi-portion state with "Regular" portion as initial item
  const [portions, setPortions] = useState<PortionRow[]>([
    { id: "portion-init-1", name: "Regular", city: "Hyderabad", priceRupees: "350" },
  ]);

  function toggleAllergen(item: string) {
    setAllergens((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item],
    );
  }

  function addPortion(portionName = "", defaultPrice = "") {
    setPortions((prev) => [
      ...prev,
      {
        id: `portion-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: portionName,
        city: "Hyderabad",
        priceRupees: defaultPrice,
      },
    ]);
  }

  function removePortion(id: string) {
    if (portions.length <= 1) return;
    setPortions((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePortion(
    id: string,
    field: "name" | "city" | "priceRupees",
    val: string,
  ) {
    setPortions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a dish name.");
      return;
    }

    if (portions.length === 0) {
      setError("Please add at least one portion for this dish.");
      return;
    }

    // Validate portions
    const seenNames = new Set<string>();
    const parsedPortions: { name: string; prices: { city: string; pricePaise: number }[] }[] = [];

    for (let i = 0; i < portions.length; i++) {
      const p = portions[i];
      const trimmedName = p.name.trim();
      if (!trimmedName) {
        setError(`Portion #${i + 1} is missing a name (e.g. Regular, Family Pack, Jumbo).`);
        return;
      }
      const lower = trimmedName.toLowerCase();
      if (seenNames.has(lower)) {
        setError(`Duplicate portion "${trimmedName}". Each portion must have a unique name.`);
        return;
      }
      seenNames.add(lower);

      const trimmedCity = p.city.trim() || "Hyderabad";
      if (trimmedCity.length < 2) {
        setError(`City name for portion "${trimmedName}" must be at least 2 characters.`);
        return;
      }

      const price = parseFloat(p.priceRupees);
      if (isNaN(price) || price < 0) {
        setError(`Invalid price in rupees for portion "${trimmedName}".`);
        return;
      }
      if (price > 50000) {
        setError(`Price for portion "${trimmedName}" cannot exceed ₹50,000.`);
        return;
      }

      parsedPortions.push({
        name: trimmedName,
        prices: [
          {
            city: trimmedCity,
            pricePaise: Math.round(price * 100),
          },
        ],
      });
    }

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
        isActive: false, // Strict default: newly created dishes are deactivated drafts
        portions: parsedPortions,
        addons: [],
      };

      const res = await requestJson<{ item: AdminMenuItem }>("/api/admin/menu", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert.success(
        "Draft Dish Created",
        `"${res.item.name}" saved as Draft (Inactive). Review portions and activate when ready to publish.`,
      );
      onCreated(res.item);
      onClose();
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      alert.failure("Failed to Create Dish", msg);
    } finally {
      setSubmitting(false);
    }
  }

  const existingPortionNames = new Set(
    portions.map((p) => p.name.trim().toLowerCase()),
  );

  return (
    <Modal title="Add menu item" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <AlertBanner
            variant="failure"
            title="Could Not Create Dish"
            message={error}
            onDismiss={() => setError("")}
          />
        )}

        {/* Draft notice banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-[#544d42]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-bold text-amber-900">Draft Verification Safety</p>
            <p className="mt-0.5 leading-relaxed text-[#635b50]">
              New dishes default to <strong>Draft (Inactive)</strong> so customers never see an incomplete menu item. Once you verify all portion pricing and configurations, activate the dish directly on the admin menu board.
            </p>
          </div>
        </div>

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
            className="w-full rounded-xl border border-[#dcd2c2] bg-[#fffdfa] p-3 text-sm font-medium text-[#1f1c18] outline-none transition focus:border-[#0f352d] focus:bg-white"
          />
        </div>

        {/* Portions & City Pricing Section */}
        <div className="space-y-3.5 rounded-2xl border border-[#e3d2b4] bg-[#fcf6eb] p-4.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#4e3f28]">
                Portions & City Pricing (5% GST Included)
              </p>
              <p className="mt-0.5 text-xs text-[#73634b]">
                Add all portions directly (e.g. Regular, Family Pack, Jumbo) with their city prices.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#8a765a]">Quick add:</span>
              <button
                type="button"
                onClick={() => addPortion("Half", "")}
                disabled={existingPortionNames.has("half")}
                className="inline-flex items-center gap-1 rounded-lg border border-[#d8be93] bg-white px-2 py-1 text-[11px] font-bold text-[#4e3f28] shadow-2xs hover:bg-[#f6eedf] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Plus className="h-3 w-3" /> Half
              </button>
              <button
                type="button"
                onClick={() => addPortion("Family Pack", "")}
                disabled={existingPortionNames.has("family pack")}
                className="inline-flex items-center gap-1 rounded-lg border border-[#d8be93] bg-white px-2 py-1 text-[11px] font-bold text-[#4e3f28] shadow-2xs hover:bg-[#f6eedf] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Plus className="h-3 w-3" /> Family Pack
              </button>
              <button
                type="button"
                onClick={() => addPortion("Jumbo", "")}
                disabled={existingPortionNames.has("jumbo")}
                className="inline-flex items-center gap-1 rounded-lg border border-[#d8be93] bg-white px-2 py-1 text-[11px] font-bold text-[#4e3f28] shadow-2xs hover:bg-[#f6eedf] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Plus className="h-3 w-3" /> Jumbo
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {portions.map((portion, idx) => (
              <div
                key={portion.id}
                className="flex flex-col gap-2 rounded-xl border border-[#e8dac1] bg-white p-3 shadow-2xs sm:flex-row sm:items-end sm:gap-3"
              >
                <div className="flex-1">
                  <InputField
                    label={idx === 0 ? "Portion name" : `Portion #${idx + 1}`}
                    value={portion.name}
                    onChange={(e) => updatePortion(portion.id, "name", e.target.value)}
                    placeholder="e.g. Regular, Half, Jumbo"
                    required
                  />
                </div>
                <div className="w-full sm:w-36">
                  <InputField
                    label="City"
                    value={portion.city}
                    onChange={(e) => updatePortion(portion.id, "city", e.target.value)}
                    placeholder="Hyderabad"
                    required
                  />
                </div>
                <div className="w-full sm:w-32">
                  <InputField
                    label="Price (₹)"
                    type="number"
                    step="1"
                    min="0"
                    value={portion.priceRupees}
                    onChange={(e) => updatePortion(portion.id, "priceRupees", e.target.value)}
                    placeholder="350"
                    required
                  />
                </div>
                {portions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePortion(portion.id)}
                    aria-label={`Remove ${portion.name || `portion ${idx + 1}`}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addPortion("", "")}
            className="flex items-center gap-1.5 rounded-xl border border-dashed border-[#bda67f] bg-white/70 px-3.5 py-2 text-xs font-bold text-[#4e3f28] hover:bg-white transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add another portion</span>
          </button>
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
              Spice level ({["No spice (Sweets / Drinks)", "Mild", "Medium", "Hot"][spiceLevel]})
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
                Restricts orderability to specific hours (e.g. Haleem dinner only)
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
          <div className="grid items-center gap-3 sm:grid-cols-[1fr_110px]">
            <InputField
              label="Image URL or local path"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... or /menu/chicken-biryani.jpg"
            />
            <div className="relative h-16 w-full overflow-hidden rounded-xl border border-[#dfd4c2] bg-[#f2ebe0] sm:mt-5">
              <DishImage
                src={imageUrl}
                alt={name || "Dish preview"}
                sizes="110px"
                emptyLabel="Preview"
              />
            </div>
          </div>
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
          <Button type="submit" disabled={submitting} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {submitting ? "Saving dish…" : "Create draft dish"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
