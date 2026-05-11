/** Shared Pierre embed tweaks that do not override Shiki theme colors. */
export const PIERRE_WORKBENCH_CODE_UNSAFE_CSS = `
  [data-line] {
    min-height: 1lh;
  }

  [data-line-type='change-addition'] [data-diff-span],
  [data-line-type='change-deletion'] [data-diff-span] {
    background-color: inherit;
  }

  [data-background] [data-line-type='change-addition'][data-line],
  [data-background] [data-line-type='change-addition'][data-no-newline],
  [data-background] [data-line-type='change-addition'][data-gutter-buffer] {
    background-color: var(--diffs-bg-addition);
  }

  [data-background] [data-line-type='change-deletion'][data-line],
  [data-background] [data-line-type='change-deletion'][data-no-newline],
  [data-background] [data-line-type='change-deletion'][data-gutter-buffer] {
    background-color: var(--diffs-bg-deletion);
  }

  [data-line-type='change-addition']:is([data-column-number], [data-gutter-buffer]) {
    background:
      linear-gradient(
        to right,
        var(--multi-git-diff-addition, var(--diffs-addition-base)) 0 2px,
        var(--diffs-bg-addition) 2px 100%
      );
  }

  [data-line-type='change-deletion']:is([data-column-number], [data-gutter-buffer]) {
    background:
      linear-gradient(
        to right,
        var(--multi-git-diff-deletion, var(--diffs-deletion-base)) 0 2px,
        var(--diffs-bg-deletion) 2px 100%
      );
  }
`;
