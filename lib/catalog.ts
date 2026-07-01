// Vendor Catalog (CAT) — curated coverage of the standard's component space by
// selecting sections of supplier catalogs.
//
// The catalog never decides conformance itself: it defers to the Product Standard
// (CAT-R-03 ↔ STD-R-03). Coverage is checked both directions (CAT-R-01), every
// entry traces to a supplier-catalog source AND the standard component it
// satisfies (CAT-R-02), multi-source components must justify equivalence
// (CAT-R-04), and a standard change reconciles to an exact gap/flag diff
// (CAT-R-05 ↔ STD-R-04).

import { type Component, type ProductLine, type Standard, conform, sameStandard } from "./standard.js";

export interface CatalogEntry {
  id: string;
  componentKey: string; // which required component slot this fills
  component: Component; // the concrete component offered (gated against the standard)
  supplierId: string; // resolves to a Supplier Truth identity (SUP-R-02)
  source: string; // the supplier-catalog section it was selected from (provenance)
  equivalenceBasis?: string; // required when a slot has alternates (CAT-R-04)
}

export interface CoverageReport {
  ok: boolean;
  gaps: string[]; // required keys with no conformant source (CAT-R-01)
  outOfStandard: string[]; // entry ids whose key isn't required (CAT-R-01 bounded)
  nonconforming: string[]; // entry ids whose component fails the standard (CAT-R-03)
  unsourced: string[]; // entry ids missing source/supplier/key (CAT-R-02)
  unjustifiedAlternates: string[]; // alternate entry ids missing equivalence basis (CAT-R-04)
}

export function checkCoverage(
  line: ProductLine,
  std: Standard,
  requiredKeys: string[],
  entries: CatalogEntry[],
): CoverageReport {
  const required = new Set(requiredKeys);
  const gaps: string[] = [];
  const outOfStandard: string[] = [];
  const nonconforming: string[] = [];
  const unsourced: string[] = [];
  const unjustifiedAlternates: string[] = [];

  // CAT-R-02: provenance both ways.
  for (const e of entries) {
    if (!e.source?.trim() || !e.supplierId?.trim() || !e.componentKey?.trim()) unsourced.push(e.id);
  }

  // CAT-R-01 (bounded): nothing outside the standard's required space.
  for (const e of entries) {
    if (!required.has(e.componentKey)) outOfStandard.push(e.id);
  }

  // CAT-R-03: the standard is the gate.
  for (const e of entries) {
    if (!conform(line, std, e.component).ok) nonconforming.push(e.id);
  }

  // CAT-R-04: alternates explicit + equivalence-justified.
  const byKey = new Map<string, CatalogEntry[]>();
  for (const e of entries) {
    const list = byKey.get(e.componentKey) ?? [];
    list.push(e);
    byKey.set(e.componentKey, list);
  }
  for (const [, list] of byKey) {
    if (list.length > 1) {
      for (const e of list) if (!e.equivalenceBasis?.trim()) unjustifiedAlternates.push(e.id);
    }
  }

  // CAT-R-01 (forward): every required key has ≥1 conformant, in-scope, sourced entry.
  for (const key of requiredKeys) {
    const covered = entries.some(
      (e) =>
        e.componentKey === key &&
        conform(line, std, e.component).ok &&
        e.source?.trim() &&
        e.supplierId?.trim(),
    );
    if (!covered) gaps.push(key);
  }

  const ok =
    gaps.length === 0 &&
    outOfStandard.length === 0 &&
    nonconforming.length === 0 &&
    unsourced.length === 0 &&
    unjustifiedAlternates.length === 0;

  return { ok, gaps, outOfStandard, nonconforming, unsourced, unjustifiedAlternates };
}

export interface StandardChangeDiff {
  changed: boolean;
  newGaps: string[]; // required keys newly uncovered under the new standard
  newlyInvalid: string[]; // entry ids that conformed before but not after
}

/** CAT-R-05: when the standard changes, re-evaluate coverage to an *exact* diff —
 *  newly-required gaps and newly-invalid entries — never silent drift. */
export function reconcileToStandard(
  line: ProductLine,
  oldStd: Standard,
  newLine: ProductLine,
  newStd: Standard,
  oldRequiredKeys: string[],
  newRequiredKeys: string[],
  entries: CatalogEntry[],
): StandardChangeDiff {
  const changed = !sameStandard(oldStd, newStd) || oldRequiredKeys.join() !== newRequiredKeys.join();

  const before = checkCoverage(line, oldStd, oldRequiredKeys, entries);
  const after = checkCoverage(newLine, newStd, newRequiredKeys, entries);

  const beforeGaps = new Set(before.gaps);
  const newGaps = after.gaps.filter((g) => !beforeGaps.has(g));

  const beforeBad = new Set(before.nonconforming);
  const newlyInvalid = after.nonconforming.filter((id) => !beforeBad.has(id));

  return { changed, newGaps, newlyInvalid };
}
