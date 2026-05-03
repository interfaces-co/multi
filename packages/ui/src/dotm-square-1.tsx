"use client";

import type { CSSProperties, MouseEventHandler } from "react";
import { useCallback } from "react";

import { DotMatrixBase, trBlPathNormFromIndex } from "./dotmatrix-core";
import type { DotAnimationResolver, DotMatrixCommonProps } from "./dotmatrix-core";
import { useDotMatrixPhases, usePrefersReducedMotion } from "./dotmatrix-hooks";

export type DotmSquare1Props = DotMatrixCommonProps;

type DotmSquare1Style = CSSProperties & {
  "--dmx-delay"?: string;
  "--dmx-diagonal-parity"?: number;
  "--dmx-path"?: number;
  "--dmx-rest-opacity"?: number;
  "--dmx-tail-opacity"?: number;
};

const animationResolver: DotAnimationResolver = ({
  isActive,
  index,
  row,
  col,
  reducedMotion,
  phase,
  speed,
}) => {
  if (!isActive) {
    return { className: "dmx-inactive" };
  }

  const path = trBlPathNormFromIndex(index);
  const slice = row + (4 - col);
  const parity = slice % 2;
  const style: DotmSquare1Style = {
    "--dmx-delay": `${((path * -0.72) / speed).toFixed(3)}s`,
    "--dmx-diagonal-parity": parity,
    "--dmx-path": path,
    "--dmx-rest-opacity": parity === 0 ? 0.18 : 0.1,
    "--dmx-tail-opacity": parity === 0 ? 0.42 : 0.22,
  };

  if (reducedMotion || phase === "idle") {
    return {
      style: {
        ...style,
        opacity: parity === 0 ? 0.88 : 0.14,
      },
    };
  }

  return { className: "dmx-diagonal-alt-sweep", style };
};

export function DotmSquare1({
  animated = true,
  hoverAnimated = false,
  onMouseEnter,
  onMouseLeave,
  pattern = "full",
  speed = 1,
  ...rest
}: DotmSquare1Props) {
  const reducedMotion = usePrefersReducedMotion();
  const {
    phase: matrixPhase,
    onMouseEnter: onMatrixMouseEnter,
    onMouseLeave: onMatrixMouseLeave,
  } = useDotMatrixPhases({
    animated: Boolean(animated && !reducedMotion),
    hoverAnimated: Boolean(hoverAnimated && !reducedMotion),
    speed,
  });
  const handleMouseEnter = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      onMouseEnter?.(event);
      onMatrixMouseEnter(event);
    },
    [onMouseEnter, onMatrixMouseEnter],
  );
  const handleMouseLeave = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      onMouseLeave?.(event);
      onMatrixMouseLeave(event);
    },
    [onMouseLeave, onMatrixMouseLeave],
  );

  return (
    <DotMatrixBase
      {...rest}
      animationResolver={animationResolver}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      pattern={pattern}
      phase={matrixPhase}
      reducedMotion={reducedMotion}
      speed={speed}
    />
  );
}
