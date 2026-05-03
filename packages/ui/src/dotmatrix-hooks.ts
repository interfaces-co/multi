"use client";

import { useCallback, useEffect, useState, type MouseEventHandler } from "react";

import type { DotMatrixPhase } from "./dotmatrix-core";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updateReducedMotion = () => setReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);

    return () => {
      mediaQuery.removeEventListener("change", updateReducedMotion);
    };
  }, []);

  return reducedMotion;
}

export function useDotMatrixPhases(options: {
  animated: boolean;
  hoverAnimated: boolean;
  speed: number;
}) {
  const { animated, hoverAnimated } = options;
  const [isHovered, setIsHovered] = useState(false);
  const onMouseEnter = useCallback<MouseEventHandler<HTMLDivElement>>(() => {
    setIsHovered(true);
  }, []);
  const onMouseLeave = useCallback<MouseEventHandler<HTMLDivElement>>(() => {
    setIsHovered(false);
  }, []);
  const phase: DotMatrixPhase = hoverAnimated
    ? isHovered
      ? "active"
      : "idle"
    : animated
      ? "active"
      : "idle";

  return {
    onMouseEnter,
    onMouseLeave,
    phase,
  };
}
