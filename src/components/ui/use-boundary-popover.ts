"use client";

import { useCallback, useEffect, useState, type CSSProperties, type RefObject } from "react";

export interface BoundaryPopoverOptions {
  triggerRef: RefObject<HTMLElement | null>;
  popoverRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  preferredWidth?: number;
  preferredHeight?: number;
  align?: "left" | "right" | "auto";
  offset?: number;
  matchTriggerWidth?: boolean;
}

export interface BoundaryPopoverResult {
  style: CSSProperties;
  placement: "top" | "bottom";
  align: "left" | "right";
  updatePosition: () => void;
}

export function useBoundaryPopover({
  triggerRef,
  popoverRef,
  isOpen,
  preferredWidth,
  preferredHeight = 360,
  align = "auto",
  offset = 6,
  matchTriggerWidth = false,
}: BoundaryPopoverOptions): BoundaryPopoverResult {
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    visibility: "hidden",
  });
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [activeAlign, setActiveAlign] = useState<"left" | "right">("left");

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Detect enclosing modal dialog or boundary container
    const dialogEl = trigger.closest("dialog");
    const dialogRect = dialogEl ? dialogEl.getBoundingClientRect() : null;

    // Inner safe margins
    const boundLeft = dialogRect ? Math.max(12, dialogRect.left + 12) : 12;
    const boundRight = dialogRect
      ? Math.min(viewportW - 12, dialogRect.right - 12)
      : viewportW - 12;
    const boundTop = dialogRect ? Math.max(12, dialogRect.top + 12) : 12;
    const boundBottom = dialogRect
      ? Math.min(viewportH - 12, dialogRect.bottom - 12)
      : viewportH - 12;

    const availableWidth = Math.max(200, boundRight - boundLeft);

    // Compute width
    const targetWidth = matchTriggerWidth
      ? Math.min(rect.width, availableWidth)
      : preferredWidth
        ? Math.min(preferredWidth, availableWidth)
        : popoverRef.current
          ? Math.min(popoverRef.current.offsetWidth, availableWidth)
          : Math.min(310, availableWidth);

    const targetHeight = preferredHeight;

    // Vertical boundary detection
    const spaceBelow = boundBottom - rect.bottom - offset;
    const spaceAbove = rect.top - boundTop - offset;

    // Flip above if space below is too tight and above has more room
    const shouldFlipUp = spaceBelow < targetHeight && spaceAbove > spaceBelow;

    // Horizontal boundary detection
    const overflowsRightIfLeftAligned = rect.left + targetWidth > boundRight;
    const shouldAlignRight =
      align === "right" || (align === "auto" && overflowsRightIfLeftAligned);

    let leftPos: number | undefined;
    let rightPos: number | undefined;

    if (shouldAlignRight) {
      setActiveAlign("right");
      const anchorRight = Math.min(rect.right, boundRight);
      rightPos = Math.max(12, viewportW - anchorRight);

      // Guard against crossing left boundary
      if (targetWidth > anchorRight - boundLeft) {
        rightPos = undefined;
        leftPos = boundLeft;
      }
    } else {
      setActiveAlign("left");
      leftPos = Math.max(boundLeft, rect.left);
      if (leftPos + targetWidth > boundRight) {
        leftPos = Math.max(boundLeft, boundRight - targetWidth);
      }
    }

    if (shouldFlipUp) {
      setPlacement("top");
      const maxH = Math.max(180, Math.min(targetHeight, spaceAbove - 8));
      setStyle({
        position: "fixed",
        bottom: Math.max(12, viewportH - rect.top + offset),
        left: leftPos,
        right: rightPos,
        width: targetWidth,
        maxHeight: maxH,
        zIndex: 9999,
        visibility: "visible",
      });
    } else {
      setPlacement("bottom");
      const maxH = Math.max(180, Math.min(targetHeight, spaceBelow - 8));
      setStyle({
        position: "fixed",
        top: Math.max(12, rect.bottom + offset),
        left: leftPos,
        right: rightPos,
        width: targetWidth,
        maxHeight: maxH,
        zIndex: 9999,
        visibility: "visible",
      });
    }
  }, [
    triggerRef,
    popoverRef,
    preferredWidth,
    preferredHeight,
    align,
    offset,
    matchTriggerWidth,
  ]);

  // Recalculate on open, scroll (including nested dialog scroll), and resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    // Capture phase listener catches scrolls inside scrollable modals/dialogs
    window.addEventListener("scroll", updatePosition, { capture: true, passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });

    return () => {
      window.removeEventListener("scroll", updatePosition, { capture: true });
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  return { style, placement, align: activeAlign, updatePosition };
}
