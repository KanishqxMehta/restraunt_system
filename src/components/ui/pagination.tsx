"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/classes";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemName?: string;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  itemName = "items",
  onPageChange,
  className,
}: PaginationProps) {
  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to show with ellipsis
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-t border-[#ece3d5] pt-4 text-xs",
        className,
      )}
    >
      <p className="text-[#635b50]">
        Showing <span className="font-bold text-[#0f352d]">{startItem}</span> to{" "}
        <span className="font-bold text-[#0f352d]">{endItem}</span> of{" "}
        <span className="font-bold text-[#0f352d]">{totalItems}</span> {itemName}
      </p>

      <nav aria-label="Pagination" className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-lg border border-[#dfd4c2] px-2.5 font-bold transition",
            currentPage <= 1
              ? "cursor-not-allowed opacity-40 bg-[#faf7f2] text-[#8f8474]"
              : "bg-[#fffdfa] text-[#544d42] hover:border-[#0f352d] hover:bg-[#eef6f4] hover:text-[#0f352d]",
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) =>
            page === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-[#8f8474]"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={currentPage === page ? "page" : undefined}
                className={cn(
                  "flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-xs font-bold transition",
                  currentPage === page
                    ? "bg-[#0f352d] text-white shadow-2xs"
                    : "border border-[#dfd4c2] bg-[#fffdfa] text-[#544d42] hover:border-[#0f352d] hover:bg-[#eef6f4] hover:text-[#0f352d]",
                )}
              >
                {page}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-lg border border-[#dfd4c2] px-2.5 font-bold transition",
            currentPage >= totalPages
              ? "cursor-not-allowed opacity-40 bg-[#faf7f2] text-[#8f8474]"
              : "bg-[#fffdfa] text-[#544d42] hover:border-[#0f352d] hover:bg-[#eef6f4] hover:text-[#0f352d]",
          )}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
