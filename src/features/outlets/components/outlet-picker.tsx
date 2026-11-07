"use client";
import { useState, type FormEvent } from "react";
import {
  LocateFixed,
  MapPin,
  ArrowRight,
  Clock,
  ShieldCheck,
  Navigation,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { Modal } from "@/components/ui/modal";
import { requestJson, errorMessage } from "@/lib/http-client";
import { useCart } from "@/features/cart/context";
import { locationSchema, type Location } from "../serviceability";
import type { CustomerOutlet } from "@/features/menu/types";
import { cn } from "@/lib/classes";

const demoLocations = [
  {
    name: "Kondapur",
    area: "Botanical Garden & HITEC Corridor",
    latitude: 17.4622,
    longitude: 78.3568,
  },
  {
    name: "Gachibowli",
    area: "Financial District & ISB Road",
    latitude: 17.4401,
    longitude: 78.3489,
  },
  {
    name: "Kukatpally",
    area: "KPHB Phase 3 & JNTU",
    latitude: 17.4948,
    longitude: 78.3996,
  },
];

export function OutletPicker({ onSelected }: { onSelected: () => void }) {
  const cart = useCart();
  const [result, setResult] = useState<{
    location: Location;
    outlets: (CustomerOutlet & { distanceKm: number })[];
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmOutletSwitch, setConfirmOutletSwitch] =
    useState<CustomerOutlet | null>(null);

  async function search(location: Location) {
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await requestJson<{
        outlets: (CustomerOutlet & { distanceKm: number })[];
      }>("/api/serviceability", {
        method: "POST",
        body: JSON.stringify(location),
      });
      setResult({ location, outlets: response.outlets });
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setError(
        "Location access is unavailable. Choose a demo area or enter coordinates below.",
      );
      return;
    }
    setPending(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void search({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setPending(false);
        setError(
          "We couldn't access your location. Choose a demo area or enter coordinates below.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function manual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = locationSchema.safeParse({
      latitude: Number(form.get("latitude")),
      longitude: Number(form.get("longitude")),
    });
    if (!parsed.success) {
      setError("Enter valid latitude and longitude values.");
      return;
    }
    void search(parsed.data);
  }

  function select(outlet: CustomerOutlet) {
    if (!result) return;
    if (cart.lines.length > 0 && cart.outletId !== outlet.id) {
      setConfirmOutletSwitch(outlet);
      return;
    }
    cart.selectOutlet(result.location, outlet.id);
    onSelected();
  }

  function confirmSwitch() {
    if (!result || !confirmOutletSwitch) return;
    cart.selectOutlet(result.location, confirmOutletSwitch.id);
    setConfirmOutletSwitch(null);
    onSelected();
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-[0_12px_40px_rgba(20,18,14,0.05)] sm:p-9">
      <div className="h-1.5 w-24 rounded-full bg-gradient-to-r from-[#0f352d] to-[#c99b53] mb-6" />

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ece3d5] pb-6">
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#dec9ec] bg-gradient-to-br from-[#f8f2fc] to-[#ede0f6] text-[#4a1d5a] shadow-2xs"
          >
            <MapPin className="h-6 w-6" />
          </span>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a1d5a]">
              Step 1 · Serviceability & Kitchen Routing
            </span>
            <h2 className="font-display mt-1 text-2xl font-bold text-[#0f352d] sm:text-3xl">
              Where are we delivering?
            </h2>
            <p className="mt-1 text-sm text-[#5c5448]">
              Select your Hyderabad neighbourhood or share GPS to route your
              order to the nearest hot Dum kitchen.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={locate}
          disabled={pending}
          variant="primary"
          className="shrink-0"
        >
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
          Use my location
        </Button>
      </div>

      {/* Quick Demo Locations */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4a1d5a]">
            Or choose a Hyderabad delivery zone
          </p>
          <span className="text-xs text-[#787064]">Instant radius check</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {demoLocations.map((location) => (
            <div
              key={location.name}
              className="flex flex-col justify-between rounded-2xl border border-[#e3d8c6] bg-[#faf7f2] p-4 transition hover:border-[#0f352d]/40 hover:bg-[#fffdfa]"
            >
              <div className="mb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0f352d]">
                    Hyderabad West
                  </span>
                  <Navigation
                    className="h-3.5 w-3.5 text-[#c99b53]"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 text-xs text-[#655c50]">{location.area}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void search({
                    latitude: location.latitude,
                    longitude: location.longitude,
                  })
                }
                disabled={pending}
                className="w-full justify-center"
              >
                {location.name}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Pin Input */}
      <details className="mt-6 rounded-2xl border border-[#e6dccb] bg-[#faf7f2]/70 px-5 py-3.5 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-[#4e473d] select-none hover:text-[#0f352d]">
          <Compass className="h-4 w-4 text-[#4a1d5a]" aria-hidden="true" />
          <span>Enter a location pin manually</span>
        </summary>
        <form
          onSubmit={manual}
          className="mt-4 grid gap-4 border-t border-[#e6dccb] pt-4 sm:grid-cols-2"
        >
          <InputField
            label="Latitude"
            name="latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            placeholder="e.g. 17.4622"
            required
          />
          <InputField
            label="Longitude"
            name="longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            placeholder="e.g. 78.3568"
            required
          />
          <Button className="sm:col-span-2" disabled={pending}>
            Check delivery area
          </Button>
        </form>
      </details>

      {pending && (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 rounded-2xl border border-[#e3d8c6] bg-[#faf7f2] p-4 text-sm font-medium text-[#4e473d]"
        >
          <span className="h-2.5 w-2.5 animate-ping rounded-full bg-[#0f352d]" />
          Finding nearby kitchens…
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
        >
          {error}
        </p>
      )}

      {result &&
        (result.outlets.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center sm:text-left">
            <h3 className="font-display text-lg font-bold text-[#0f352d]">
              We&apos;re not delivering here yet
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-[#5f574c]">
              No open outlet covers this location pin. Select Kondapur,
              Gachibowli, or Kukatpally above to explore today&apos;s menu.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0f352d]">
              Available Kitchens for Your Location ({result.outlets.length})
            </p>
            {result.outlets.map((outlet, index) => (
              <button
                key={outlet.id}
                type="button"
                onClick={() => select(outlet)}
                className={cn(
                  "group flex w-full items-center justify-between gap-4 rounded-2xl border p-5 text-left transition-all focus-visible:outline-2 focus-visible:outline-[#3b1747]",
                  index === 0
                    ? "border-[#0f352d] bg-gradient-to-r from-[#eef6f4]/80 via-[#fffdfa] to-[#fffdfa] shadow-sm hover:shadow-md"
                    : "border-[#dfd4c2] bg-[#fffdfa] hover:border-[#0f352d]/60 hover:bg-[#faf7f2]",
                )}
              >
                <div className="flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                        index === 0
                          ? "bg-[#0f352d] text-[#f4d6a9]"
                          : "border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a]",
                      )}
                    >
                      {index === 0
                        ? "Recommended · nearest"
                        : "Also delivers here"}
                    </span>
                    <span className="font-mono-tabular text-xs font-semibold text-[#5f574c]">
                      {outlet.distanceKm.toFixed(1)} km away
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-[#0f352d] group-hover:text-[#08231d]">
                    {outlet.name}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5f574c]">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0f352d]">
                      <Clock className="h-3.5 w-3.5 text-[#c99b53]" aria-hidden="true" />
                      Provisional prep{" "}
                      {outlet.minimumPrepMinutes + outlet.packingMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#787064]">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      FSSAI {outlet.fssaiLicense}
                    </span>
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dcd0be] bg-[#faf7f2] text-[#0f352d] transition group-hover:bg-[#0f352d] group-hover:text-white"
                >
                  <ArrowRight className="h-5 w-5" />
                </span>
              </button>
            ))}
          </div>
        ))}

      {confirmOutletSwitch && (
        <Modal
          title="Switch Kitchen Outlet?"
          subtitle="Changing outlets resets your active basket"
          onClose={() => setConfirmOutletSwitch(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-[#4f473d]">
              Your basket currently has items from another outlet. Switching to{" "}
              <strong className="text-[#0f352d]">
                {confirmOutletSwitch.name}
              </strong>{" "}
              will clear your current basket so we can show live stock and
              promise times for this kitchen.
            </p>
            <div className="flex justify-end gap-2 border-t border-[#ece3d5] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmOutletSwitch(null)}
              >
                Keep Current Outlet
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={confirmSwitch}
              >
                Switch & Clear Basket
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
