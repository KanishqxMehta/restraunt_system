"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
  type ReactNode,
} from "react";

export interface FloatingBlobModalProps {
  id?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (props: {
    isOpen: boolean;
    toggle: () => void;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
  }) => ReactNode;
  children: ReactNode;
  anchorClassName?: string;
  contentClassName?: string;
  blobColor?: string;
  ariaLabel?: string;
}

export function FloatingBlobModal({
  id: customId,
  isOpen,
  onOpenChange,
  trigger,
  children,
  anchorClassName = "fixed bottom-6 right-6 z-40",
  contentClassName = "w-[calc(100vw-2rem)] sm:w-[440px] max-h-[82vh]",
  blobColor = "#0f352d",
  ariaLabel = "Floating Action Dialog",
}: FloatingBlobModalProps) {
  const generatedId = useId().replace(/:/g, "_");
  const filterId = `blob_filter_${customId || generatedId}`;

  const [isClosing, setIsClosing] = useState(false);
  const isRendered = isOpen || isClosing;

  // Refs for 60fps liquid water-blob metaball & morph engine
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const gooLayerRef = useRef<HTMLDivElement | null>(null);
  const reservoirBlobRef = useRef<HTMLDivElement | null>(null);
  const tendrilBlobRef = useRef<HTMLDivElement | null>(null);
  const dropletBlobRef = useRef<HTMLDivElement | null>(null);
  const mainBlobRef = useRef<HTMLDivElement | null>(null);
  const menuShellRef = useRef<HTMLDivElement | null>(null);
  const colorOverlayRef = useRef<HTMLDivElement | null>(null);
  const menuMeasureRef = useRef<HTMLDivElement | null>(null);

  const applyLiquidFrame = useCallback(
    (rawP: number) => {
      const clamp = (v: number, min = 0, max = 1) =>
        Math.min(max, Math.max(min, v));
      const seg = (v: number, a: number, b: number) =>
        clamp((v - a) / (b - a), 0, 1);
      const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
      const easeInOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      // Overall smooth ease-in-and-out progress p in [0, 1]
      const p = easeInOutSine(clamp(rawP, 0, 1));

      const btnEl = buttonRef.current;
      const measureEl = menuMeasureRef.current;
      const btnW = btnEl ? btnEl.offsetWidth : 216;
      const btnH = btnEl ? btnEl.offsetHeight : 44;
      const targetW = measureEl ? measureEl.offsetWidth : 440;
      const targetH = measureEl ? measureEl.offsetHeight : 580;
      const targetBottom = btnH + 14;

      // 1. Backdrop smooth fade
      if (backdropRef.current) {
        const bgAlpha = smootherstep(seg(p, 0.05, 0.75));
        backdropRef.current.style.opacity = String(bgAlpha);
      }

      // 2. Trigger button & reservoir liquid recoil / bulge
      const pull = Math.sin(seg(p, 0.0, 0.44) * Math.PI);
      const snapRipple =
        Math.sin(seg(p, 0.36, 0.72) * Math.PI * 2) *
        0.035 *
        (1 - seg(p, 0.36, 0.72));
      if (btnEl) {
        const btnScaleX = 1 - pull * 0.06 + snapRipple;
        const btnScaleY = 1 + pull * 0.14 - snapRipple;
        const btnShiftY = -pull * 3;
        btnEl.style.transform = `translate3d(0, ${btnShiftY.toFixed(2)}px, 0) scale(${btnScaleX.toFixed(4)}, ${btnScaleY.toFixed(4)})`;
      }

      if (reservoirBlobRef.current) {
        const resScaleX = 1 - pull * 0.1;
        const resScaleY = 1 + pull * 0.42;
        const resShiftY = -pull * 7;
        reservoirBlobRef.current.style.width = `${btnW}px`;
        reservoirBlobRef.current.style.height = `${btnH}px`;
        reservoirBlobRef.current.style.transform = `translate3d(0, ${resShiftY.toFixed(2)}px, 0) scale(${resScaleX.toFixed(4)}, ${resScaleY.toFixed(4)})`;
      }

      // 3. Main Blob Geometry:
      // Stage A (0 -> 0.38): Oozes upward out of the button as a bulbous water droplet
      // Stage B (0.34 -> 0.84): Detaches and expands smoothly into target modal dimensions
      const tRise = smootherstep(seg(p, 0.0, 0.38));
      const tExpand = smootherstep(seg(p, 0.34, 0.84));

      const midW = Math.min(targetW * 0.56, Math.max(btnW * 0.88, 200));
      const midH = Math.min(targetH * 0.42, 220);

      // Subtle squeeze in width at start as liquid pushes upward out of button
      const earlySqueeze = Math.sin(seg(p, 0.0, 0.24) * Math.PI) * 28;
      const currentW =
        p < 0.36
          ? lerp(btnW, midW, tRise) - earlySqueeze
          : lerp(midW, targetW, tExpand);

      const currentH =
        p < 0.36 ? lerp(btnH, midH, tRise) : lerp(midH, targetH, tExpand);

      const midBottom = targetBottom * 0.82;
      const floatOvershoot = Math.sin(tExpand * Math.PI) * 4;
      const currentBottom =
        p < 0.36
          ? lerp(0, midBottom, tRise)
          : lerp(midBottom, targetBottom, tExpand) + floatOvershoot;

      // Keep emerging droplet centered over the button while narrow, then align right: 0
      const centeredRight = Math.max(0, (btnW - currentW) * 0.5);
      const currentRight = lerp(centeredRight, 0, tExpand);

      // Organic water droplet border-radius
      const morphToRect = smootherstep(seg(p, 0.42, 0.82));
      const wobble1 = Math.sin(p * Math.PI * 3.5) * 0.11 * (1 - morphToRect);
      const wobble2 = Math.cos(p * Math.PI * 3.0) * 0.09 * (1 - morphToRect);

      const tlX = lerp(currentW * (0.53 + wobble1), 24, morphToRect);
      const trX = lerp(currentW * (0.47 - wobble1), 24, morphToRect);
      const brX = lerp(currentW * (0.46 + wobble2), 24, morphToRect);
      const blX = lerp(currentW * (0.54 - wobble2), 24, morphToRect);

      const tlY = lerp(currentH * (0.56 + wobble2), 24, morphToRect);
      const trY = lerp(currentH * (0.54 - wobble2), 24, morphToRect);
      const brY = lerp(currentH * (0.44 - wobble1), 24, morphToRect);
      const blY = lerp(currentH * (0.46 + wobble1), 24, morphToRect);

      const radiusStr = `${tlX.toFixed(1)}px ${trX.toFixed(1)}px ${brX.toFixed(1)}px ${blX.toFixed(1)}px / ${tlY.toFixed(1)}px ${trY.toFixed(1)}px ${brY.toFixed(1)}px ${blY.toFixed(1)}px`;

      if (mainBlobRef.current) {
        mainBlobRef.current.style.width = `${currentW.toFixed(1)}px`;
        mainBlobRef.current.style.height = `${currentH.toFixed(1)}px`;
        mainBlobRef.current.style.bottom = `${currentBottom.toFixed(1)}px`;
        mainBlobRef.current.style.right = `${currentRight.toFixed(1)}px`;
        mainBlobRef.current.style.borderRadius = radiusStr;
      }

      // 4. Viscous Liquid Neck Tendril connecting button & rising blob
      if (tendrilBlobRef.current) {
        if (p > 0.01 && p < 0.46) {
          const tNeck = seg(p, 0.01, 0.46);
          const neckW = lerp(btnW * 0.54, 8, smootherstep(tNeck));
          const neckBottom = btnH * 0.28;
          const neckTop = currentBottom + currentH * 0.28;
          const neckH = Math.max(12, neckTop - neckBottom);
          const neckRight = (btnW - neckW) * 0.5;

          tendrilBlobRef.current.style.opacity = "1";
          tendrilBlobRef.current.style.width = `${neckW.toFixed(1)}px`;
          tendrilBlobRef.current.style.height = `${neckH.toFixed(1)}px`;
          tendrilBlobRef.current.style.bottom = `${neckBottom.toFixed(1)}px`;
          tendrilBlobRef.current.style.right = `${neckRight.toFixed(1)}px`;
        } else {
          tendrilBlobRef.current.style.opacity = "0";
        }
      }

      // 5. Satellite Water Droplet
      if (dropletBlobRef.current) {
        if (p > 0.2 && p < 0.58) {
          const tDrop = smootherstep(seg(p, 0.2, 0.58));
          const dropW = lerp(54, 22, tDrop);
          const dropH = lerp(68, 22, tDrop);
          const dropBottom = lerp(btnH * 0.25, targetBottom + 32, tDrop);
          const dropRight = (btnW - dropW) * 0.5;

          dropletBlobRef.current.style.opacity = "1";
          dropletBlobRef.current.style.width = `${dropW.toFixed(1)}px`;
          dropletBlobRef.current.style.height = `${dropH.toFixed(1)}px`;
          dropletBlobRef.current.style.bottom = `${dropBottom.toFixed(1)}px`;
          dropletBlobRef.current.style.right = `${dropRight.toFixed(1)}px`;
        } else {
          dropletBlobRef.current.style.opacity = "0";
        }
      }

      // 6. Gooey Layer cross-fade
      if (gooLayerRef.current) {
        const gooFadeOut = smootherstep(seg(p, 0.54, 0.78));
        gooLayerRef.current.style.opacity = String(1 - gooFadeOut);
      }

      // 7. Morphing Content Shell
      if (menuShellRef.current) {
        const shellFadeIn = smootherstep(seg(p, 0.44, 0.62));
        menuShellRef.current.style.opacity = String(shellFadeIn);
        menuShellRef.current.style.width = `${currentW.toFixed(1)}px`;
        menuShellRef.current.style.height = `${currentH.toFixed(1)}px`;
        menuShellRef.current.style.bottom = `${currentBottom.toFixed(1)}px`;
        menuShellRef.current.style.right = `${currentRight.toFixed(1)}px`;
        menuShellRef.current.style.borderRadius = radiusStr;
      }

      // Color overlay bloom from blobColor to transparent
      if (colorOverlayRef.current) {
        const tColor = smootherstep(seg(p, 0.5, 0.86));
        const bloomRadius = lerp(0, 145, tColor);
        colorOverlayRef.current.style.opacity = String(
          1 - smootherstep(seg(p, 0.6, 0.88)),
        );
        colorOverlayRef.current.style.background = `radial-gradient(circle at 82% 92%, #fffdfa 0%, #f4d6a9 ${Math.max(0, bloomRadius - 18).toFixed(1)}%, ${blobColor} ${bloomRadius.toFixed(1)}%)`;
      }

      // 8. Inner Content glide & fade
      if (measureEl) {
        const tContent = smootherstep(seg(p, 0.64, 0.98));
        const shiftY = lerp(14, 0, tContent);
        const scale = lerp(0.97, 1, tContent);
        measureEl.style.opacity = String(tContent);
        measureEl.style.transform = `translate3d(0, ${shiftY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      }
    },
    [blobColor],
  );

  // Drive animation timeline with requestAnimationFrame
  useEffect(() => {
    if (!isRendered) return;

    const target = isOpen ? 1 : 0;
    const startVal = progressRef.current;
    const distance = Math.abs(target - startVal);

    const totalDuration = Math.max(16, (isOpen ? 740 : 640) * distance);
    let startTime: number | null = null;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / totalDuration);
      const nextP = startVal + (target - startVal) * t;
      progressRef.current = nextP;
      applyLiquidFrame(nextP);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        progressRef.current = target;
        applyLiquidFrame(target);
        rafRef.current = null;
        if (target === 0) {
          setIsClosing(false);
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, isRendered, applyLiquidFrame]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onOpenChange]);

  const toggle = useCallback(() => {
    if (isOpen) {
      setIsClosing(true);
      onOpenChange(false);
    } else {
      setIsClosing(false);
      onOpenChange(true);
    }
  }, [isOpen, onOpenChange]);

  return (
    <>
      {/* Hidden SVG Gooey / Metaball Filter for Liquid Surface Tension */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed h-0 w-0 overflow-hidden opacity-0"
      >
        <defs>
          <filter
            id={filterId}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="13" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Transparent Click-Outside Overlay */}
      {isRendered && (
        <div
          ref={backdropRef}
          style={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
          onClick={() => {
            setIsClosing(true);
            onOpenChange(false);
          }}
          aria-hidden="true"
        />
      )}

      {/* Anchor Container */}
      <div className={anchorClassName}>
        {/* Gooey Liquid Water Layer Filtered with SVG Metaball Goo */}
        {isRendered && (
          <div
            ref={gooLayerRef}
            aria-hidden="true"
            style={{ filter: `url(#${filterId})` }}
            className="water-goo-layer pointer-events-none absolute -bottom-24 -right-24 h-[95vh] w-[100vw] max-w-[640px] p-24"
          >
            <div className="relative h-full w-full">
              {/* Button Liquid Reservoir */}
              <div
                ref={reservoirBlobRef}
                style={{
                  width: 216,
                  height: 44,
                  bottom: 0,
                  right: 0,
                  backgroundColor: blobColor,
                }}
                className="absolute rounded-full"
              />
              {/* Stretching Liquid Neck Tendril */}
              <div
                ref={tendrilBlobRef}
                style={{
                  opacity: 0,
                  bottom: 10,
                  right: 60,
                  width: 80,
                  height: 30,
                  backgroundColor: blobColor,
                }}
                className="absolute rounded-full"
              />
              {/* Pinching Satellite Water Droplet */}
              <div
                ref={dropletBlobRef}
                style={{
                  opacity: 0,
                  bottom: 14,
                  right: 80,
                  width: 48,
                  height: 58,
                  backgroundColor: blobColor,
                }}
                className="absolute rounded-full"
              />
              {/* Primary Emerging & Morphing Water Blob */}
              <div
                ref={mainBlobRef}
                style={{
                  width: 216,
                  height: 44,
                  bottom: 0,
                  right: 0,
                  backgroundColor: blobColor,
                  boxShadow: `0 18px 45px rgba(15, 53, 45, 0.45)`,
                }}
                className="absolute"
              />
            </div>
          </div>
        )}

        {/* Morphing Modal Shell */}
        {isRendered && (
          <div
            ref={menuShellRef}
            style={{ opacity: 0, width: 216, height: 44, bottom: 0, right: 0 }}
            className="absolute z-20 flex flex-col items-end justify-end border border-[#c99b53]/45 bg-[#fffdfa]/98 backdrop-blur-xl shadow-[0_25px_60px_-15px_rgba(15,53,45,0.4)] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
          >
            {/* Liquid Transition Overlay blooming into Content */}
            <div
              ref={colorOverlayRef}
              style={{ opacity: 1, background: blobColor }}
              className="pointer-events-none absolute inset-0 z-30"
              aria-hidden="true"
            />

            {/* Measured Inner Container */}
            <div
              ref={menuMeasureRef}
              style={{ opacity: 0 }}
              className={`${contentClassName} flex flex-col shrink-0 origin-bottom-right overflow-hidden`}
            >
              {children}
            </div>
          </div>
        )}

        {/* Floating Trigger Button */}
        {trigger({ isOpen, toggle, buttonRef })}
      </div>
    </>
  );
}
