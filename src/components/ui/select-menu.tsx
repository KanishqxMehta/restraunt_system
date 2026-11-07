"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/classes";

export interface SelectMenuOption {
  value: string;
  label: string;
  badge?: string;
  description?: string;
  group?: string;
}

interface SelectMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  ariaLabel?: string;
  size?: "sm" | "md";
  align?: "left" | "right";
  fullWidth?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  menuClassName?: string;
}

export function SelectMenu({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  ariaLabel,
  size = "sm",
  align = "left",
  fullWidth = false,
  searchable,
  searchPlaceholder = "Search options...",
  className,
  menuClassName,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const isSearchEnabled = searchable ?? options.length > 6;
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && isSearchEnabled) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [open, isSearchEnabled]);

  const filteredOptions = query.trim()
    ? options.filter((opt) => {
        const q = query.toLowerCase();
        return (
          opt.label.toLowerCase().includes(q) ||
          (opt.group && opt.group.toLowerCase().includes(q)) ||
          (opt.badge && opt.badge.toLowerCase().includes(q)) ||
          (opt.description && opt.description.toLowerCase().includes(q))
        );
      })
    : options;

  // Group options while preserving order
  const ungrouped: SelectMenuOption[] = [];
  const groupedMap = new Map<string, SelectMenuOption[]>();

  for (const opt of filteredOptions) {
    if (!opt.group) {
      ungrouped.push(opt);
    } else {
      const list = groupedMap.get(opt.group) ?? [];
      list.push(opt);
      groupedMap.set(opt.group, list);
    }
  }

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-block text-left",
        fullWidth && "block w-full",
      )}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => {
          setOpen((prev) => !prev);
          if (open) setQuery("");
        }}
        className={cn(
          "inline-flex items-center justify-between gap-3 rounded-xl border transition select-none focus:border-[#0f352d] focus:outline-none focus:ring-3 focus:ring-[#0f352d]/12",
          size === "sm"
            ? "min-h-9 border-[#dfd4c2] bg-[#faf7f2] px-3.5 py-1.5 text-xs font-bold text-[#0f352d] shadow-2xs hover:border-[#0f352d]/40 hover:bg-[#fffdfa]"
            : "min-h-12 w-full border-[#dcd2c2] bg-[#fffdfa] px-4 py-2.5 text-sm font-medium text-[#1f1c18] hover:border-[#0f352d]/50",
          open && "border-[#0f352d] bg-[#fffdfa] ring-3 ring-[#0f352d]/10",
          fullWidth && " flex w-full",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 rounded-full border border-[#dfd4c2] bg-[#f3ece0] px-2 py-0.5 font-mono text-[10px] font-bold text-[#4e473d]">
              {selectedOption.badge}
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-[#635b50] transition-transform duration-200",
            open && "rotate-180 text-[#0f352d]",
          )}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute z-50 mt-2 min-w-[260px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#dfd4c2] bg-[#fffdfa] shadow-[0_20px_50px_rgba(20,15,25,0.22)] ring-1 ring-[#0f352d]/5",
            align === "right" ? "right-0" : "left-0",
            fullWidth && "w-full",
            menuClassName,
          )}
        >
          {/* Top Royal Accent Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#0f352d] via-[#c99b53] to-[#3b1747]" />

          {isSearchEnabled && (
            <div className="border-b border-[#ece3d5] bg-[#faf7f2]/90 p-2.5">
              <label className="flex items-center gap-2 rounded-xl border border-[#dfd4c2] bg-[#fffdfa] px-3 py-1.5 text-xs focus-within:border-[#0f352d]">
                <Search
                  className="h-3.5 w-3.5 shrink-0 text-[#7a6f60]"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-xs font-medium text-[#1f1c18] outline-none placeholder:text-[#8f8474]"
                />
              </label>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto p-1.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-[#7a6f60]">
                No matching options found.
              </div>
            ) : (
              <>
                {ungrouped.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    option={opt}
                    selected={opt.value === value}
                    onSelect={handleSelect}
                  />
                ))}

                {Array.from(groupedMap.entries()).map(([groupName, groupOpts]) => (
                  <div
                    key={groupName}
                    className="mt-1.5 border-t border-[#ece3d5] pt-1.5 first:mt-0 first:border-t-0 first:pt-0"
                  >
                    <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#7a6f60]">
                      {groupName}
                    </div>
                    {groupOpts.map((opt) => (
                      <OptionRow
                        key={opt.value}
                        option={opt}
                        selected={opt.value === value}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionRow({
  option,
  selected,
  onSelect,
}: {
  option: SelectMenuOption;
  selected: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(option.value)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition",
        selected
          ? "bg-[#eef6f4] font-bold text-[#0f352d]"
          : "font-medium text-[#2c2823] hover:bg-[#faf7f2] hover:text-[#0f352d]",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition",
            selected
              ? "border-[#0f352d] bg-[#0f352d] text-[#f4d6a9]"
              : "border-[#dfd4c2] bg-white text-transparent",
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <span className="block truncate">{option.label}</span>
          {option.description && (
            <span className="block truncate text-[10px] font-normal text-[#6e6456]">
              {option.description}
            </span>
          )}
        </div>
      </div>

      {option.badge && (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold",
            selected
              ? "bg-[#0f352d] text-[#f4d6a9]"
              : "bg-[#f3ece0] text-[#544d42]",
          )}
        >
          {option.badge}
        </span>
      )}
    </button>
  );
}
