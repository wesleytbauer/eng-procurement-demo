// PART 1 — the curated vendor catalog.
//
// `ACCEPTED` is the curated catalog: every required slot covered, every entry
// conformant to the v1 standard, sourced, and (where a slot has alternates)
// equivalence-justified — so coverage is green at v1.
//
// `REJECTED` are submissions the gate turns away, one per CAT failure mode, used to
// demonstrate the catalog invariants (CAT-R-02/03/04 and the bounded side of -R-01).

import type { CatalogEntry } from "../../lib/catalog.js";
import { LINE } from "./product.js";
import { SID } from "./suppliers.js";

const comp = (slot: string, attrs: Record<string, string | number>) => ({ line: `${LINE}/${slot}`, attrs });

export const ACCEPTED: CatalogEntry[] = [
  // motor — 4 alternates (all basis-justified). Two are v2 casualties (12V / ip54).
  { id: "m-acme-24", componentKey: "motor", supplierId: SID.acme, source: "acme/cat#m24", equivalenceBasis: "primary", component: comp("motor", { type: "dc_motor", housing: "steel", ingress: "ip65", voltage: 24, frame: "nema23" }) },
  { id: "m-acme-12", componentKey: "motor", supplierId: SID.acme, source: "acme/cat#m12", equivalenceBasis: "12V variant of m-acme-24", component: comp("motor", { type: "dc_motor", housing: "steel", ingress: "ip65", voltage: 12, frame: "nema17" }) },
  { id: "m-globex-24", componentKey: "motor", supplierId: SID.globex, source: "globex/cat#g24", equivalenceBasis: "form-fit-function equivalent to m-acme-24", component: comp("motor", { type: "dc_motor", housing: "aluminum", ingress: "ip65", voltage: 24, frame: "nema23" }) },
  { id: "m-soylent-54", componentKey: "motor", supplierId: SID.soylent, source: "soylent/cat#s54", equivalenceBasis: "budget alternate", component: comp("motor", { type: "dc_motor", housing: "steel", ingress: "ip54", voltage: 12, frame: "nema17" }) },

  // gearbox — 2 alternates.
  { id: "g-globex-10", componentKey: "gearbox", supplierId: SID.globex, source: "globex/cat#gb10", equivalenceBasis: "primary", component: comp("gearbox", { type: "planetary", ratio: 10, backlash_arcmin: 15 }) },
  { id: "g-tyrell-20", componentKey: "gearbox", supplierId: SID.tyrell, source: "tyrell/cat#t20", equivalenceBasis: "higher-ratio equivalent", component: comp("gearbox", { type: "planetary", ratio: 20, backlash_arcmin: 30 }) },

  // encoder — 2 alternates.
  { id: "e-umbrella-1000", componentKey: "encoder", supplierId: SID.umbrella, source: "umbrella/cat#u1k", equivalenceBasis: "primary", component: comp("encoder", { type: "incremental", output: "abz", ppr: 1000 }) },
  { id: "e-wonka-1000", componentKey: "encoder", supplierId: SID.wonka, source: "wonka/cat#w1k", equivalenceBasis: "second source, equal ppr/output", component: comp("encoder", { type: "incremental", output: "abz", ppr: 1000 }) },

  // controller — 2 alternates, BOTH 12V → both become v2 casualties → slot opens a GAP.
  { id: "c-soylent-12", componentKey: "controller", supplierId: SID.soylent, source: "soylent/cat#c12", equivalenceBasis: "budget primary", component: comp("controller", { type: "dc_driver", protocol: "modbus", voltage: 12, current_a: 5 }) },
  { id: "c-acme-12", componentKey: "controller", supplierId: SID.acme, source: "acme/cat#c12", equivalenceBasis: "higher-current alternate", component: comp("controller", { type: "dc_driver", protocol: "canopen", voltage: 12, current_a: 10 }) },

  // housing — 3 alternates. The two ip54 ones are v2 casualties; the ip65 survives.
  { id: "h-acme-65", componentKey: "housing", supplierId: SID.acme, source: "acme/cat#h65", equivalenceBasis: "primary", component: comp("housing", { material: "steel", ingress: "ip65", finish: "anodized" }) },
  { id: "h-acme-54", componentKey: "housing", supplierId: SID.acme, source: "acme/cat#h54", equivalenceBasis: "budget variant", component: comp("housing", { material: "aluminum", ingress: "ip54", finish: "powdercoat" }) },
  { id: "h-hooli-54", componentKey: "housing", supplierId: SID.hooli, source: "hooli/cat#h54", equivalenceBasis: "second source", component: comp("housing", { material: "steel", ingress: "ip54", finish: "anodized" }) },

  // harness — single source.
  { id: "hn-stark-20", componentKey: "harness", supplierId: SID.stark, source: "stark/cat#h20", component: comp("harness", { type: "wiring_harness", awg: 20, length_mm: 300 }) },

  // fasteners — 2 alternates.
  { id: "f-wayne-a2", componentKey: "fasteners", supplierId: SID.wayne, source: "wayne/cat#a2", equivalenceBasis: "primary", component: comp("fasteners", { type: "fastener", grade: "a2", size: "m4" }) },
  { id: "f-cyberdyne-a4", componentKey: "fasteners", supplierId: SID.cyberdyne, source: "mro/cat#a4", equivalenceBasis: "internal MRO second source", component: comp("fasteners", { type: "fastener", grade: "a4", size: "m4" }) },
];

/** Submissions the gate rejects — one per failure mode (see report's rejection table). */
export interface RejectedCandidate {
  entry: CatalogEntry;
  expect: "nonconforming" | "unsourced" | "out-of-standard" | "unjustified-alternate";
  rule: string;
}

export const REJECTED: RejectedCandidate[] = [
  {
    rule: "CAT-R-03 (standard is the gate)",
    expect: "nonconforming",
    entry: { id: "f-cyberdyne-bad", componentKey: "fasteners", supplierId: SID.cyberdyne, source: "mro/cat#bad", component: comp("fasteners", { type: "fastener", grade: "m8", size: "m4" }) },
  },
  {
    rule: "CAT-R-02 (provenance both ways)",
    expect: "unsourced",
    entry: { id: "e-ghost", componentKey: "encoder", supplierId: "", source: "", component: comp("encoder", { type: "incremental", output: "abz", ppr: 1000 }) },
  },
  {
    rule: "CAT-R-01 (bounded — nothing outside the standard)",
    expect: "out-of-standard",
    entry: { id: "x-bluetooth", componentKey: "bluetooth_module", supplierId: SID.globex, source: "globex/cat#bt", component: comp("bluetooth_module", { type: "radio" }) },
  },
  {
    rule: "CAT-R-04 (alternates equivalence-justified)",
    expect: "unjustified-alternate",
    entry: { id: "m-rogue-24", componentKey: "motor", supplierId: SID.globex, source: "globex/cat#r24", component: comp("motor", { type: "dc_motor", housing: "steel", ingress: "ip67", voltage: 24, frame: "nema23" }) },
  },
];
