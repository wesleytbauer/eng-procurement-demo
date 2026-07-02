// Solution Eval for Supplier Truth (SUP). Offline, deterministic. Asserts stable
// resolved identity (collapse variants / separate distinct), mandatory attribute
// provenance + trust, truth-not-behavior, and contract-stability across a swap of
// the backing store (local master ↔ external system of record).
//
//   npx tsx scripts/supplier.selftest.ts

import { pathToFileURL } from "node:url";
import { checker } from "../lib/check.js";
import { authoritative } from "../lib/provenance.js";
import {
  type SupplierRef,
  type Supplier,
  localRegistry,
  externalSoRRegistry,
  sourced,
  partition,
  partitionsEqual,
} from "../lib/supplier.js";

// Gold identity set: three real suppliers, several refs each (different names/feeds).
const acmeRefs: SupplierRef[] = [
  { name: "Acme Steel Inc", taxId: "11-1111111", feed: "ariba" },
  { name: "ACME STEEL", taxId: "111111111", feed: "email" }, // same tax id, different formatting/name
  { name: "Acme Steel Incorporated", feed: "manual" }, // no tax id → falls back to normalized name
];
const globexRefs: SupplierRef[] = [
  { name: "Globex Plastics LLC", taxId: "22-2222222", feed: "ariba" },
  { name: "Globex Plastics", taxId: "222222222", feed: "edi" },
];
const initechRefs: SupplierRef[] = [{ name: "Initech Co", taxId: "33-3333333" }];

export function selftest(): number {
  const c = checker();

  // Build a LOCAL registry (the "build" branch of SUP-R-05). Each supplier is
  // registered with its canonical name + tax id; resolution links every variant.
  const local = localRegistry([
    { canonicalName: "Acme Steel Inc", taxIds: ["11-1111111"], attributes: { duns: sourced("00-111-0000", "dnb-feed", "asserted"), tier: sourced(1, "owner", "authoritative") } },
    { canonicalName: "Globex Plastics LLC", taxIds: ["22-2222222"], attributes: { duns: sourced("00-222-0000", "dnb-feed", "asserted") } },
    { canonicalName: "Initech Co", taxIds: ["33-3333333"] },
    { canonicalName: "Umbrella Corporation", taxIds: ["44-4444444"] },
  ]);

  // SUP-R-02: variants of the same supplier collapse to one identity...
  const acmeIds = new Set(acmeRefs.map((r) => local.resolve(r)));
  c.ok("SUP-R-02 same supplier under different names/feeds → one identity", acmeIds.size === 1, [...acmeIds].join(" | "));
  // ...and distinct suppliers never collapse.
  const allIds = new Set([...acmeRefs, ...globexRefs, ...initechRefs].map((r) => local.resolve(r)));
  c.ok("SUP-R-02 three distinct suppliers stay three identities", allIds.size === 3, `got ${allIds.size}`);
  // SUP-R-02: collapse that hinges SPECIFICALLY on tax-id normalization — two refs
  // sharing only a differently-formatted tax id, whose names do NOT normalize alike,
  // so the name path cannot mask broken tax matching.
  const umbrellaRefs: SupplierRef[] = [
    { name: "Umbrella Corporation", taxId: "44-4444444", feed: "ariba" },
    { name: "Umbrella Corp Global Holdings", taxId: "444444444", feed: "edi" },
  ];
  const umbrellaIds = new Set(umbrellaRefs.map((r) => local.resolve(r)));
  c.ok("SUP-R-02 differently-formatted tax id unifies non-matching names (tax normalization)",
    umbrellaIds.size === 1, [...umbrellaIds].join(" | "));

  // SUP-R-03: every attribute carries provenance; an unsourced attribute is rejected
  // at construction time.
  let provenanceEnforced = false;
  try {
    sourced("value-without-source", "");
  } catch {
    provenanceEnforced = true;
  }
  c.ok("SUP-R-03 unsourced attribute rejected at construction", provenanceEnforced);
  const acme: Supplier | undefined = local.get(local.resolve(acmeRefs[0]));
  c.ok("SUP-R-03 trust gating: asserted attr is not authoritative", authoritative(acme?.attributes.duns) === undefined);
  c.ok("SUP-R-03 trust gating: owner-set tier is authoritative", authoritative(acme?.attributes.tier) === 1);

  // SUP-R-04: truth, not behavior — the Supplier type has no performance field.
  // (Compile-time guarantee; assert structurally that master data carries no perf.)
  const masterKeys = Object.keys(acme?.attributes ?? {});
  c.ok("SUP-R-04 master record holds no performance/behavior attribute",
    !masterKeys.some((k) => /perf|ontime|leadtime|nonconform|score/i.test(k)), masterKeys.join(","));

  // SUP-R-01 / SUP-R-05: swap the backing store for an EXTERNAL system of record.
  // Same refs → identical partition (the observable contract consumers depend on).
  const external = externalSoRRegistry([
    { canonicalName: "ACME STEEL CORP", taxIds: ["11-1111111"] }, // SoR's own spelling, same identity
    { canonicalName: "Globex Plastics Limited", taxIds: ["22-2222222"] },
    { canonicalName: "Initech Company", taxIds: ["33-3333333"] },
  ]);
  const allRefs = [...acmeRefs, ...globexRefs, ...initechRefs];
  const pLocal = partition(local, allRefs);
  const pExternal = partition(external, allRefs);
  c.ok("SUP-R-01/-R-05 backing-store swap leaves the consumer contract unchanged",
    partitionsEqual(pLocal, pExternal), `local=${pLocal.size} groups, external=${pExternal.size} groups`);

  return c.done("SUP: supplier identity is stable, sourced, behavior-free, and store-agnostic.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(selftest());
}
