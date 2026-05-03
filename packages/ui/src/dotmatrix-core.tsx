"use client";

import type { CSSProperties, ComponentPropsWithoutRef, MouseEventHandler } from "react";

import { cn } from "./utils";

export const DOT_MATRIX_GRID_SIZE = 5;

export type DotMatrixPhase = "idle" | "active";

export type DotMatrixPattern = "full" | "ring" | "checker" | "cross" | "slash" | "backslash";

export interface DotMatrixCommonProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  animated?: boolean;
  boxSize?: number;
  cellPadding?: number;
  dotSize?: number;
  hoverAnimated?: boolean;
  minSize?: number;
  pattern?: DotMatrixPattern;
  speed?: number;
}

export interface DotAnimationResolverInput {
  col: number;
  index: number;
  isActive: boolean;
  phase: DotMatrixPhase;
  reducedMotion: boolean;
  row: number;
  speed: number;
}

export interface DotAnimationOutput {
  className?: string;
  style?: CSSProperties;
}

export type DotAnimationResolver = (input: DotAnimationResolverInput) => DotAnimationOutput;

interface DotMatrixBaseProps extends Omit<DotMatrixCommonProps, "animated" | "hoverAnimated"> {
  animationResolver: DotAnimationResolver;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
  phase: DotMatrixPhase;
  reducedMotion: boolean;
}

type DotMatrixStyle = CSSProperties & {
  "--dmx-cell-size"?: string;
  "--dmx-dot-size"?: string;
  "--dmx-duration"?: string;
};

export function trBlPathNormFromIndex(index: number, gridSize = DOT_MATRIX_GRID_SIZE) {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const maxPath = Math.max(1, (gridSize - 1) * 2);

  return (row + (gridSize - 1 - col)) / maxPath;
}

export function DotMatrixBase({
  animationResolver,
  boxSize = 64,
  cellPadding = 2,
  className,
  dotSize = 3,
  minSize = 48,
  onMouseEnter,
  onMouseLeave,
  pattern = "full",
  phase,
  reducedMotion,
  speed = 1,
  style,
  ...props
}: DotMatrixBaseProps) {
  const normalizedDotSize = positiveNumber(dotSize, 3);
  const normalizedCellPadding = nonNegativeNumber(cellPadding, 2);
  const normalizedBoxSize = positiveNumber(boxSize, 64);
  const normalizedMinSize = positiveNumber(minSize, 48);
  const normalizedSpeed = positiveNumber(speed, 1);
  const cellSize = normalizedDotSize + normalizedCellPadding * 2;
  const rootStyle: DotMatrixStyle = {
    ...style,
    "--dmx-cell-size": `${cellSize}px`,
    "--dmx-dot-size": `${normalizedDotSize}px`,
    "--dmx-duration": `${Math.max(0.24, 1.2 / normalizedSpeed).toFixed(3)}s`,
    height: `${normalizedBoxSize}px`,
    minHeight: `${normalizedMinSize}px`,
    minWidth: `${normalizedMinSize}px`,
    width: `${normalizedBoxSize}px`,
  };
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${DOT_MATRIX_GRID_SIZE}, var(--dmx-cell-size))`,
    gridTemplateRows: `repeat(${DOT_MATRIX_GRID_SIZE}, var(--dmx-cell-size))`,
  };

  return (
    <div
      aria-hidden={props["aria-label"] === undefined ? true : props["aria-hidden"]}
      className={cn("inline-grid shrink-0 place-items-center", className)}
      data-phase={phase}
      data-slot="dot-matrix"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={rootStyle}
      {...props}
    >
      <span aria-hidden className="grid" style={gridStyle}>
        {Array.from({ length: DOT_MATRIX_GRID_SIZE * DOT_MATRIX_GRID_SIZE }, (_, index) => {
          const row = Math.floor(index / DOT_MATRIX_GRID_SIZE);
          const col = index % DOT_MATRIX_GRID_SIZE;
          const isActive = dotMatchesPattern(pattern, row, col);
          const resolved = animationResolver({
            col,
            index,
            isActive,
            phase,
            reducedMotion,
            row,
            speed: normalizedSpeed,
          });

          return (
            <span className="grid place-items-center" key={index}>
              <span
                className={cn("dmx-dot", resolved.className)}
                data-active={isActive ? "true" : "false"}
                style={resolved.style}
              />
            </span>
          );
        })}
      </span>
    </div>
  );
}

function dotMatchesPattern(pattern: DotMatrixPattern, row: number, col: number) {
  const last = DOT_MATRIX_GRID_SIZE - 1;

  switch (pattern) {
    case "backslash":
      return row === col;
    case "checker":
      return (row + col) % 2 === 0;
    case "cross":
      return row === Math.floor(last / 2) || col === Math.floor(last / 2);
    case "ring":
      return row === 0 || col === 0 || row === last || col === last;
    case "slash":
      return row + col === last;
    case "full":
      return true;
  }
}

function nonNegativeNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function positiveNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
