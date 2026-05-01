/**
 * Shared Pierre embed tweaks for file + diff surfaces so the workbench matches
 * typography and line metrics across Files preview and Git diff.
 */
export const PIERRE_WORKBENCH_CODE_UNSAFE_CSS = `
  [data-file-wrapper] {
    --diffs-code-background: var(--background);
    --diffs-code-font-size: 12px;
    --diffs-code-line-height: 18px;
  }

  [data-line] {
    min-height: 18px;
  }

  [data-line]:hover {
    background: color-mix(in srgb, var(--foreground) 5%, transparent);
  }
`;
