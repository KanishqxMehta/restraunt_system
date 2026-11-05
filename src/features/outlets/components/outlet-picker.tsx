"use client";
import { useState, type FormEvent } from "react";
import { LocateFixed, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { requestJson, errorMessage } from "@/lib/http-client";
import { useCart } from "@/features/cart/context";
import { locationSchema, type Location } from "../serviceability";
import type { CustomerOutlet } from "@/features/menu/types";

const demoLocations = [
  { name: "Kondapur", latitude: 17.4622, longitude: 78.3568 },
  { name: "Gachibowli", latitude: 17.4401, longitude: 78.3489 },
  { name: "Kukatpally", latitude: 17.4948, longitude: 78.3996 },
];
export function OutletPicker({ onSelected }: { onSelected: () => void }) {
  const cart = useCart();
  const [result, setResult] = useState<{
    location: Location;
    outlets: (CustomerOutlet & { distanceKm: number })[];
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
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
    if (
      cart.lines.length > 0 &&
      cart.outletId !== outlet.id &&
      !window.confirm("Changing outlets clears your current basket. Continue?")
    )
      return;
    cart.selectOutlet(result.location, outlet.id);
    onSelected();
  }
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-900">
          <MapPin className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Where are we delivering?</h2>
          <p className="mt-1 text-sm text-stone-500">
            Find an open kitchen within delivery range.
          </p>
        </div>
      </div>
      <Button
        type="button"
        onClick={locate}
        disabled={pending}
        variant="secondary"
      >
        <LocateFixed className="h-4 w-4" />
        Use my location
      </Button>
      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Or try a demo location
        </p>
        <div className="flex flex-wrap gap-2">
          {demoLocations.map((location) => (
            <Button
              key={location.name}
              type="button"
              variant="secondary"
              onClick={() =>
                void search({
                  latitude: location.latitude,
                  longitude: location.longitude,
                })
              }
              disabled={pending}
            >
              {location.name}
            </Button>
          ))}
        </div>
      </div>
      <details className="mt-6 text-sm">
        <summary className="cursor-pointer text-stone-600">
          Enter a location pin manually
        </summary>
        <form onSubmit={manual} className="mt-4 grid gap-4 sm:grid-cols-2">
          <InputField
            label="Latitude"
            name="latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            required
          />
          <InputField
            label="Longitude"
            name="longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            required
          />
          <Button className="sm:col-span-2" disabled={pending}>
            Check delivery area
          </Button>
        </form>
      </details>
      {pending && (
        <p role="status" className="mt-6 text-sm text-stone-500">
          Finding nearby kitchens…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {result &&
        (result.outlets.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-stone-50 p-5">
            <h3 className="font-semibold">
              We&apos;re not delivering here yet
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              No open outlet covers this location. Choose another location to
              see the menu.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {result.outlets.map((outlet, index) => (
              <button
                key={outlet.id}
                type="button"
                onClick={() => select(outlet)}
                className="flex w-full items-center gap-4 rounded-2xl border border-stone-200 p-5 text-left hover:border-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-900"
              >
                <div className="flex-1">
                  <p className="mb-1 text-xs font-medium text-emerald-800">
                    {index === 0
                      ? "Recommended · nearest"
                      : "Also delivers here"}
                  </p>
                  <h3 className="font-semibold">{outlet.name}</h3>
                  <p className="mt-1 text-xs text-stone-500">
                    {outlet.distanceKm.toFixed(1)} km away · Provisional prep{" "}
                    {outlet.minimumPrepMinutes + outlet.packingMinutes} min
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    FSSAI {outlet.fssaiLicense}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-emerald-900" />
              </button>
            ))}
          </div>
        ))}
    </section>
  );
}
