/** Plain-object deep merge (no Effect). Arrays are replaced, not merged. */
export function deepMerge<
  Base extends Record<string, unknown>,
  Patch extends Record<string, unknown>,
>(base: Base, patch: Patch): Base & Patch {
  const out = { ...base } as Base & Patch;
  for (const key of Object.keys(patch) as Array<keyof Patch>) {
    const pv = patch[key];
    const bv = base[key as keyof Base];
    if (
      pv &&
      typeof pv === "object" &&
      !Array.isArray(pv) &&
      bv &&
      typeof bv === "object" &&
      !Array.isArray(bv)
    ) {
      (out as Record<string, unknown>)[key as string] = deepMerge(
        bv as Record<string, unknown>,
        pv as Record<string, unknown>,
      );
    } else {
      (out as Record<string, unknown>)[key as string] = pv as unknown;
    }
  }
  return out;
}
