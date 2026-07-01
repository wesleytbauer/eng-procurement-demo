// PART 1 — the invented product standard.
//
// Product line `cyberdyne-gm`: a sealed DC gearmotor family, expanded from the
// original gearmotor seed into a 7-slot BOM. Each slot is its OWN ProductLine
// (because conform() applies every invariant to every component), so the product
// standard is a Map<slot, SlotStandard>.
//
// The v1→v2 change (passed as `v2`) makes exactly two engineering edits:
//   1. tighten the ingress-protection FLOOR on motor + housing (ip54 → ip65)  — an
//      invariant tightening (the predicate text changes → new fingerprint).
//   2. drop 12V on motor + controller (voltage domain {12,24} → {24})        — a
//      variable narrowing.

import { buildLine, deriveStandard, type Invariant, type Variable } from "../../lib/standard.js";
import type { SlotStandard } from "../lib/types.js";

export const LINE = "cyberdyne-gm";
export const REQUIRED_KEYS = ["motor", "gearbox", "encoder", "controller", "housing", "harness", "fasteners"];

const INGRESS_RANK: Record<string, number> = { ip54: 1, ip65: 2, ip67: 3 };
export function ingressRank(v: unknown): number {
  return INGRESS_RANK[String(v)] ?? 0;
}

function slot(key: string, invariants: Invariant[], variables: Variable[]): SlotStandard {
  const line = buildLine(`${LINE}/${key}`, invariants, variables);
  return { key, line, std: deriveStandard(line), requiredKeys: [key] };
}

/** Build the full set of per-slot standards for a version. */
export function buildSlots(v2: boolean): Map<string, SlotStandard> {
  const m = new Map<string, SlotStandard>();

  m.set(
    "motor",
    slot(
      "motor",
      [
        { key: "type", required: (c) => c.attrs.type === "dc_motor" },
        { key: "housing_metal", required: (c) => c.attrs.housing === "steel" || c.attrs.housing === "aluminum" },
        v2
          ? { key: "ingress_floor", required: (c) => ingressRank(c.attrs.ingress) >= 2 }
          : { key: "ingress_floor", required: (c) => ingressRank(c.attrs.ingress) >= 1 },
      ],
      [
        { key: "voltage", domain: v2 ? [24] : [12, 24] },
        { key: "frame", domain: ["nema17", "nema23"] },
      ],
    ),
  );

  m.set(
    "gearbox",
    slot(
      "gearbox",
      [
        { key: "type", required: (c) => c.attrs.type === "planetary" },
        { key: "ratio_num", required: (c) => typeof c.attrs.ratio === "number" },
      ],
      [
        { key: "ratio", domain: [5, 10, 20, 50] },
        { key: "backlash_arcmin", domain: [15, 30] },
      ],
    ),
  );

  m.set(
    "encoder",
    slot(
      "encoder",
      [
        { key: "type", required: (c) => c.attrs.type === "incremental" },
        { key: "output", required: (c) => c.attrs.output === "abz" || c.attrs.output === "uvw" },
      ],
      [{ key: "ppr", domain: [500, 1000, 2000] }],
    ),
  );

  m.set(
    "controller",
    slot(
      "controller",
      [
        { key: "type", required: (c) => c.attrs.type === "dc_driver" },
        { key: "protocol", required: (c) => c.attrs.protocol === "canopen" || c.attrs.protocol === "modbus" },
      ],
      [
        { key: "voltage", domain: v2 ? [24] : [12, 24] },
        { key: "current_a", domain: [5, 10] },
      ],
    ),
  );

  m.set(
    "housing",
    slot(
      "housing",
      [
        { key: "material", required: (c) => c.attrs.material === "steel" || c.attrs.material === "aluminum" },
        v2
          ? { key: "ingress_floor", required: (c) => ingressRank(c.attrs.ingress) >= 2 }
          : { key: "ingress_floor", required: (c) => ingressRank(c.attrs.ingress) >= 1 },
      ],
      [{ key: "finish", domain: ["anodized", "powdercoat"] }],
    ),
  );

  m.set(
    "harness",
    slot(
      "harness",
      [
        { key: "type", required: (c) => c.attrs.type === "wiring_harness" },
        { key: "awg_num", required: (c) => typeof c.attrs.awg === "number" },
      ],
      [
        { key: "awg", domain: [18, 20, 22] },
        { key: "length_mm", domain: [150, 300] },
      ],
    ),
  );

  m.set(
    "fasteners",
    slot(
      "fasteners",
      [
        { key: "type", required: (c) => c.attrs.type === "fastener" },
        { key: "grade", required: (c) => c.attrs.grade === "a2" || c.attrs.grade === "a4" },
      ],
      [{ key: "size", domain: ["m3", "m4", "m5"] }],
    ),
  );

  return m;
}
