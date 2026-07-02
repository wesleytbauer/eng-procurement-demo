// Assembles the synthetic world from data/* and derives both standard versions.
// Performance history is seeded through the real OPS recordPerformance() gate, so
// the award scorer reads the same OPS-R-07 store the lifecycle writes to — the loop
// is closed by construction, not by a parallel store.

import type { CatalogEntry } from "../../lib/catalog.js";
import type { SupplierRegistry, SupplierId } from "../../lib/supplier.js";
import { recordPerformance, type PerfMetric } from "../../lib/operations.js";
import { buildSlots } from "../data/product.js";
import { ACCEPTED, REJECTED, type RejectedCandidate } from "../data/catalog.js";
import { QUOTES } from "../data/quotes.js";
import { registry, sor, SID } from "../data/suppliers.js";
import type { Quote, SlotStandard } from "./types.js";

export interface World {
  slotsV1: Map<string, SlotStandard>;
  slotsV2: Map<string, SlotStandard>;
  registry: SupplierRegistry;
  sor: SupplierRegistry;
  accepted: CatalogEntry[];
  rejected: RejectedCandidate[];
  quotes: Quote[];
  perf: Map<SupplierId, PerfMetric[]>;
}

// Prior on-time rates per supplier (the seeded history the first awards see).
const ONTIME_RATE: Array<[SupplierId, number, number]> = [
  // [id, rate, nonconformances-over-the-window]
  [SID.acme, 0.9, 0],
  [SID.globex, 0.6, 1],
  [SID.initech, 0.85, 0],
  [SID.umbrella, 0.85, 0],
  [SID.stark, 0.8, 0],
  [SID.wayne, 0.95, 0],
  [SID.wonka, 0.7, 0],
  [SID.soylent, 0.8, 0],
  [SID.tyrell, 0.9, 0],
  [SID.cyberdyne, 0.75, 1],
  [SID.hooli, 0.7, 0],
  [SID.vandelay, 0.8, 0],
];

const WINDOW = 10; // deliveries of recorded history per supplier

// Exact-count history (no randomness): on-time count = round(rate × window). Keeps
// the seeded performance unambiguous — e.g. Globex (0.6) is strictly worse than
// Tyrell (0.9) — which the closed-loop award proof depends on.
function seedPerf(reg: SupplierRegistry): Map<SupplierId, PerfMetric[]> {
  const store = new Map<SupplierId, PerfMetric[]>();
  for (const [id, rate, ncr] of ONTIME_RATE) {
    const onTimeCount = Math.round(rate * WINDOW);
    for (let i = 0; i < WINDOW; i++) {
      recordPerformance(reg, store, { supplierId: id, onTime: i < onTimeCount, nonconformances: i < ncr ? 1 : 0 });
    }
  }
  return store;
}

// `seed` is accepted for API symmetry; the world is fully deterministic without it.
export function buildWorld(_seed: number): World {
  return {
    slotsV1: buildSlots(false),
    slotsV2: buildSlots(true),
    registry,
    sor,
    accepted: ACCEPTED,
    rejected: REJECTED,
    quotes: QUOTES,
    perf: seedPerf(registry),
  };
}

/** Accepted catalog entries for one slot. */
export function entriesForSlot(world: World, slot: string): CatalogEntry[] {
  return world.accepted.filter((e) => e.componentKey === slot);
}
