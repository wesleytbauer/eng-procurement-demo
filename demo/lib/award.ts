// PART 2 — the supplier-award mechanism (demo layer).
//
// Deliberately NOT in lib/ and NOT a ratified OPS invariant: a weighted multi-
// criteria scorer is *mechanism* (weights, normalization, tie-breaks), which the
// doctrine forbids inside a constitution. It lives here as a demonstrated *candidate*
// invariant — "an award is explainable and auditable, and selection never overrides
// the standard's conformance gate" — asserted by demo.selftest.ts. It graduates to
// lib/operations.ts + OPS-R-08 only if a second consumer needs it.
//
// Reuses the framework's own pieces: conform() is the eligibility gate (the Standard
// gates the award, not commercials), and PerfMetric (the OPS-R-07 store) is the
// performance input — closing the loop from delivery back to selection.

import { conform } from "../../lib/standard.js";
import type { CatalogEntry } from "../../lib/catalog.js";
import type { SupplierRegistry } from "../../lib/supplier.js";
import type { PerfMetric } from "../../lib/operations.js";
import type { Quote, SlotStandard } from "./types.js";

export interface AwardCriterion {
  key: "price" | "lead" | "risk" | "performance";
  weight: number;
}

export const DEFAULT_CRITERIA: AwardCriterion[] = [
  { key: "price", weight: 0.4 },
  { key: "lead", weight: 0.25 },
  { key: "risk", weight: 0.15 },
  { key: "performance", weight: 0.2 },
];

export interface AwardLine {
  entryId: string;
  supplierId: string;
  eligible: boolean;
  ineligibleReason?: string;
  rawPrice: number;
  rawLead: number;
  rawRisk: number;
  rawPerf: number;
  normPrice: number;
  normLead: number;
  normRisk: number;
  normPerf: number;
  total: number;
  rank: number;
  reasons: string[];
}

export interface Scorecard {
  slotKey: string;
  orderQty: number;
  criteria: AwardCriterion[];
  lines: AwardLine[]; // ranked: eligible by total desc, then ineligible
  winner?: AwardLine;
}

/** Performance in [0,1] from the OPS perf store: on-time rate minus an NCR penalty.
 *  No history → 0 (unknown is treated as weak, not neutral). */
export function perfScore(perf: Map<string, PerfMetric[]>, id: string): number {
  const ms = perf.get(id) ?? [];
  if (ms.length === 0) return 0;
  const onTime = ms.filter((m) => m.onTime).length / ms.length;
  const ncr = ms.reduce((s, m) => s + m.nonconformances, 0);
  return Math.max(0, Math.min(1, onTime - 0.1 * ncr));
}

/** Risk (higher = worse): MOQ commitment relative to the order, plus a single-source
 *  penalty when only one supplier is eligible for the slot. */
function riskScore(moq: number, orderQty: number, eligibleCount: number): number {
  const moqOverhang = orderQty > 0 ? moq / orderQty : 1;
  const single = eligibleCount === 1 ? 0.5 : 0;
  return moqOverhang + single;
}

// Min-max normalize to [0,1]. lowerBetter inverts (cheapest/fastest/safest → 1).
// All-equal → 1 for everyone (the criterion doesn't discriminate).
function normalize(values: number[], lowerBetter: boolean): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 1);
  return values.map((v) => (lowerBetter ? (max - v) / (max - min) : (v - min) / (max - min)));
}

/** Score one slot. Eligibility gate runs first (conform + sourced + qty ≥ MOQ);
 *  ineligible quotes still appear in the scorecard with a reason — auditable. */
export function scoreSlot(
  slot: SlotStandard,
  entries: CatalogEntry[],
  quotes: Quote[],
  reg: SupplierRegistry,
  perf: Map<string, PerfMetric[]>,
  orderQty: number,
  criteria: AwardCriterion[] = DEFAULT_CRITERIA,
): Scorecard {
  const byEntry = new Map(entries.map((e) => [e.id, e]));
  const candidates = quotes
    .filter((q) => q.slotKey === slot.key)
    .map((q) => ({ q, entry: byEntry.get(q.entryId) }))
    .filter((c): c is { q: Quote; entry: CatalogEntry } => c.entry !== undefined);

  // 1. eligibility — the Standard is the gate, exactly as in the catalog.
  const elig = candidates.map(({ q, entry }) => {
    let reason: string | undefined;
    if (!entry.source?.trim() || !entry.supplierId?.trim()) reason = "unsourced (CAT-R-02)";
    else if (!conform(slot.line, slot.std, entry.component).ok) reason = "non-conformant to standard (CAT-R-03)";
    else if (q.moq > orderQty) reason = `MOQ ${q.moq} > order ${orderQty}`;
    return { q, entry, eligible: reason === undefined, reason };
  });

  const eligible = elig.filter((e) => e.eligible);
  const eligibleCount = eligible.length;

  // 2. raw metrics for the eligible set.
  const raw = eligible.map(({ q }) => ({
    price: q.unitPriceUsd,
    lead: q.leadTimeDays,
    risk: riskScore(q.moq, orderQty, eligibleCount),
    perf: perfScore(perf, q.supplierId),
  }));

  const nPrice = normalize(raw.map((r) => r.price), true);
  const nLead = normalize(raw.map((r) => r.lead), true);
  const nRisk = normalize(raw.map((r) => r.risk), true);
  const nPerf = normalize(raw.map((r) => r.perf), false);

  const w = Object.fromEntries(criteria.map((c) => [c.key, c.weight])) as Record<AwardCriterion["key"], number>;

  const eligibleLines: AwardLine[] = eligible.map(({ q }, i) => {
    const total = nPrice[i] * w.price + nLead[i] * w.lead + nRisk[i] * w.risk + nPerf[i] * w.performance;
    return {
      entryId: q.entryId,
      supplierId: q.supplierId,
      eligible: true,
      rawPrice: raw[i].price,
      rawLead: raw[i].lead,
      rawRisk: raw[i].risk,
      rawPerf: raw[i].perf,
      normPrice: nPrice[i],
      normLead: nLead[i],
      normRisk: nRisk[i],
      normPerf: nPerf[i],
      total,
      rank: 0,
      reasons: [
        `price ${nPrice[i].toFixed(2)}×${w.price}`,
        `lead ${nLead[i].toFixed(2)}×${w.lead}`,
        `risk ${nRisk[i].toFixed(2)}×${w.risk}`,
        `perf ${nPerf[i].toFixed(2)}×${w.performance}`,
      ],
    };
  });

  // 3. deterministic rank: total desc, ties broken by entryId for stability.
  eligibleLines.sort((a, b) => b.total - a.total || a.entryId.localeCompare(b.entryId));
  eligibleLines.forEach((l, i) => (l.rank = i + 1));

  const ineligibleLines: AwardLine[] = elig
    .filter((e) => !e.eligible)
    .map(({ q, reason }) => ({
      entryId: q.entryId,
      supplierId: q.supplierId,
      eligible: false,
      ineligibleReason: reason,
      rawPrice: q.unitPriceUsd,
      rawLead: q.leadTimeDays,
      rawRisk: 0,
      rawPerf: perfScore(perf, q.supplierId),
      normPrice: 0,
      normLead: 0,
      normRisk: 0,
      normPerf: 0,
      total: 0,
      rank: eligibleLines.length + 1,
      reasons: [reason ?? "ineligible"],
    }));

  const lines = [...eligibleLines, ...ineligibleLines];
  return { slotKey: slot.key, orderQty, criteria, lines, winner: eligibleLines[0] };
}
