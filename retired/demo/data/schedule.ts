// PART 1 — the production environment that creates demand.
//
// Build 120 GM-Series units across Q3-2026 in 3 monthly batches of 40. Each unit
// consumes one of each slot, except fasteners at 6 per unit. The award and POs are
// placed against the quarter total per slot (so MOQs are satisfiable).

import { REQUIRED_KEYS } from "./product.js";

export const QUARTER = "Q3-2026";
export const UNITS = 120;
export const BATCHES = 3;
export const PER_UNIT: Record<string, number> = { fasteners: 6 };

/** Quarter-total demand quantity per slot (what each PO is sized to). */
export function orderQtyForSlot(slot: string): number {
  return UNITS * (PER_UNIT[slot] ?? 1);
}

export function demandBySlot(): Map<string, number> {
  return new Map(REQUIRED_KEYS.map((k) => [k, orderQtyForSlot(k)]));
}
