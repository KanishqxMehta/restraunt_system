"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { useBoundaryPopover } from "./use-boundary-popover";
import { cn } from "@/lib/classes";

interface CustomDateTimePickerProps {
  label?: string;
  helperText?: string;
  value: string; // "YYYY-MM-DDTHH:mm" format
  onChange: (value: string) => void;
  minDate?: Date;
  disablePast?: boolean; // defaults to true
  className?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CustomDateTimePicker({
  label,
  helperText,
  value,
  onChange,
  minDate,
  disablePast = true,
  className,
}: CustomDateTimePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const { style: popoverStyle } = useBoundaryPopover({
    triggerRef: buttonRef,
    popoverRef,
    isOpen,
    preferredWidth: 310,
    preferredHeight: 390,
    align: "auto",
    offset: 6,
  });

  // Parse current value
  const parsedDate = new Date(value);
  const isValidDate = !isNaN(parsedDate.getTime());
  const activeDate = isValidDate ? parsedDate : new Date();

  // Derived view month and year
  const viewDate = new Date(
    activeDate.getFullYear(),
    activeDate.getMonth() + monthOffset,
    1,
  );
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Minimum selectable date boundary (default: today 00:00:00)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const minBoundary: Date | null = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : disablePast
      ? todayStart
      : null;

  // Month navigation boundary check
  const isPrevMonthDisabled = minBoundary
    ? new Date(viewYear, viewMonth, 0) < minBoundary
    : false;

  // Derived time state
  const rawHours = activeDate.getHours();
  const selectedHour12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
  const selectedMinute = activeDate.getMinutes();
  const selectedPeriod: "AM" | "PM" = rawHours >= 12 ? "PM" : "AM";

  // Click outside and escape key handling
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Month navigation
  function handlePrevMonth() {
    if (isPrevMonthDisabled) return;
    setMonthOffset((prev) => prev - 1);
  }

  function handleNextMonth() {
    setMonthOffset((prev) => prev + 1);
  }

  // Construct ISO string for selected date & time
  function emitDateTime(
    year: number,
    month: number,
    day: number,
    hour12: number,
    minute: number,
    period: "AM" | "PM",
  ) {
    let hour24 = hour12 % 12;
    if (period === "PM") hour24 += 12;

    const pad = (n: number) => n.toString().padStart(2, "0");
    const formatted = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour24)}:${pad(minute)}`;
    onChange(formatted);
  }

  function handleSelectDay(day: number) {
    if (minBoundary) {
      const thisDayDate = new Date(viewYear, viewMonth, day);
      if (thisDayDate < minBoundary) return;
    }
    emitDateTime(
      viewYear,
      viewMonth,
      day,
      selectedHour12,
      selectedMinute,
      selectedPeriod,
    );
  }

  function handleTimeChange(
    newHour12: number,
    newMinute: number,
    newPeriod: "AM" | "PM",
  ) {
    emitDateTime(
      activeDate.getFullYear(),
      activeDate.getMonth(),
      activeDate.getDate(),
      newHour12,
      newMinute,
      newPeriod,
    );
  }

  // Generate days for grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  // Quick preset shortcuts
  function handlePreset(daysToAdd: number) {
    const base =
      minBoundary && minBoundary > todayStart
        ? new Date(minBoundary)
        : new Date();
    const target = new Date(base);
    target.setDate(target.getDate() + daysToAdd);
    target.setHours(23, 59, 0, 0); // End of day

    setMonthOffset(0);
    const pad = (n: number) => n.toString().padStart(2, "0");
    onChange(
      `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T23:59`,
    );
  }

  // Formatted trigger display
  const displayString = isValidDate
    ? parsedDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "Select date & time";

  return (
    <div ref={containerRef} className={cn("relative space-y-1", className)}>
      {label && (
        <label className="block text-xs font-bold text-[#0f352d]">
          {label}
        </label>
      )}
      {helperText && (
        <p className="text-[10px] text-[#7a6f60]">{helperText}</p>
      )}

      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border bg-[#faf7f2] px-3 text-xs font-bold transition shadow-2xs",
          isOpen
            ? "border-[#0f352d] ring-2 ring-[#0f352d]/15 text-[#0f352d]"
            : "border-[#dfd4c2] text-[#0f352d] hover:border-[#0f352d]",
        )}
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-[#7a6f60]" aria-hidden="true" />
          <span className="font-semibold">{displayString}</span>
        </span>
        <Clock className="h-3.5 w-3.5 text-[#a0907d]" aria-hidden="true" />
      </button>

      {/* Custom Luxury Popover with Boundary-Aware Positioning */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Date and time picker"
          style={popoverStyle}
          className="overflow-y-auto rounded-2xl border border-[#dec9ec] bg-[#fffdfa] p-3.5 text-[#25221e] shadow-[0_24px_60px_rgba(20,15,25,0.28)] ring-1 ring-[#0f352d]/10"
        >
          {/* Month / Year Bar */}
          <div className="flex items-center justify-between border-b border-[#f0e8dc] pb-2.5">
            <span className="font-display text-sm font-bold text-[#0f352d]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isPrevMonthDisabled}
                onClick={handlePrevMonth}
                title="Previous month"
                className={cn(
                  "rounded-lg border border-[#e8dfcf] p-1 transition",
                  isPrevMonthDisabled
                    ? "cursor-not-allowed opacity-25 text-[#a0907d]"
                    : "text-[#635b50] hover:bg-[#faf7f2] hover:text-[#0f352d]",
                )}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next month"
                className="rounded-lg border border-[#e8dfcf] p-1 text-[#635b50] transition hover:bg-[#faf7f2] hover:text-[#0f352d]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-[#7a6f60]">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Days from previous month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = prevMonthDays - firstDayOfWeek + i + 1;
              return (
                <span
                  key={`prev-${i}`}
                  className="py-1 text-[11px] text-[#cfc4b4] select-none opacity-40"
                >
                  {dayNum}
                </span>
              );
            })}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const thisDayDate = new Date(viewYear, viewMonth, day);
              const isPastDisabled = minBoundary
                ? thisDayDate < minBoundary
                : false;

              const isSelected =
                isValidDate &&
                parsedDate.getDate() === day &&
                parsedDate.getMonth() === viewMonth &&
                parsedDate.getFullYear() === viewYear;

              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === viewMonth &&
                new Date().getFullYear() === viewYear;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPastDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition mx-auto",
                    isPastDisabled
                      ? "cursor-not-allowed opacity-30 text-[#b5a998] select-none hover:bg-transparent hover:text-[#b5a998]"
                      : isSelected
                        ? "bg-[#0f352d] text-white shadow-xs font-bold"
                        : isToday
                          ? "border border-[#c99b53] font-bold text-[#0f352d] hover:bg-[#f6efe4]"
                          : "text-[#25221e] hover:bg-[#faf7f2] hover:text-[#0f352d]",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Picker Controls */}
          <div className="mt-3 border-t border-[#f0e8dc] pt-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#4a1d5a]">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#7e3aa3]" />
                <span>Time (HH:MM)</span>
              </span>
              <span className="text-[10px] font-semibold text-[#7a6f60]">
                {selectedHour12.toString().padStart(2, "0")}:
                {selectedMinute.toString().padStart(2, "0")} {selectedPeriod}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              {/* Hour Dropdown */}
              <div className="flex items-center gap-1">
                <select
                  value={selectedHour12}
                  onChange={(e) =>
                    handleTimeChange(
                      Number(e.target.value),
                      selectedMinute,
                      selectedPeriod,
                    )
                  }
                  className="h-8 rounded-lg border border-[#dfd4c2] bg-[#faf7f2] px-2 text-xs font-bold text-[#0f352d] focus:outline-hidden"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      {h.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="font-bold text-[#7a6f60]">:</span>
                {/* Minute Dropdown */}
                <select
                  value={selectedMinute}
                  onChange={(e) =>
                    handleTimeChange(
                      selectedHour12,
                      Number(e.target.value),
                      selectedPeriod,
                    )
                  }
                  className="h-8 rounded-lg border border-[#dfd4c2] bg-[#faf7f2] px-2 text-xs font-bold text-[#0f352d] focus:outline-hidden"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 59].map(
                    (m) => (
                      <option key={m} value={m}>
                        {m.toString().padStart(2, "0")}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* AM / PM Toggle */}
              <div className="flex rounded-lg border border-[#dfd4c2] bg-[#faf7f2] p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() =>
                    handleTimeChange(selectedHour12, selectedMinute, "AM")
                  }
                  className={cn(
                    "rounded px-2 py-1 transition",
                    selectedPeriod === "AM"
                      ? "bg-[#0f352d] text-white shadow-2xs"
                      : "text-[#635b50] hover:text-[#0f352d]",
                  )}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleTimeChange(selectedHour12, selectedMinute, "PM")
                  }
                  className={cn(
                    "rounded px-2 py-1 transition",
                    selectedPeriod === "PM"
                      ? "bg-[#0f352d] text-white shadow-2xs"
                      : "text-[#635b50] hover:text-[#0f352d]",
                  )}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-[#f0e8dc] pt-2 text-[10px]">
            <span className="font-bold text-[#7a6f60]">Presets:</span>
            <button
              type="button"
              onClick={() => handlePreset(0)}
              className="rounded border border-[#e8dfcf] px-1.5 py-0.5 font-bold text-[#635b50] hover:bg-[#faf7f2] hover:text-[#0f352d]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handlePreset(30)}
              className="rounded border border-[#e8dfcf] px-1.5 py-0.5 font-bold text-[#635b50] hover:bg-[#faf7f2] hover:text-[#0f352d]"
            >
              +30d
            </button>
            <button
              type="button"
              onClick={() => handlePreset(90)}
              className="rounded border border-[#e8dfcf] px-1.5 py-0.5 font-bold text-[#635b50] hover:bg-[#faf7f2] hover:text-[#0f352d]"
            >
              +90d
            </button>
            <button
              type="button"
              onClick={() => handlePreset(365)}
              className="rounded border border-[#e8dfcf] px-1.5 py-0.5 font-bold text-[#635b50] hover:bg-[#faf7f2] hover:text-[#0f352d]"
            >
              +1yr
            </button>
          </div>

          {/* Footer Done Button */}
          <div className="mt-3 flex items-center justify-end border-t border-[#f0e8dc] pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#0f352d] px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-[#0a241e]"
            >
              <Check className="h-3 w-3" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
