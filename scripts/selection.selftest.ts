// Solution Eval for Part Identity (PID). Offline, deterministic. Asserts: a PCID
// is minted at approval and never before (PID-R-01); it is unique and immutable
// (PID-R-02); it binds part ↔ constraint fingerprint ↔ scope version and resolves
// deterministically (PID-R-03); and constraint-set equality is decided by
// fingerprint, never by similarity (PID-R-04).
//
//   npx tsx scripts/selection.selftest.ts

import { pathToFileURL } from "node:url";
import { checker } from "../lib/check.js";
import { type CodifiedElement, type ConstraintSet } from "../lib/sourcing.js";
import { type Recommendation, createMinter, fingerprint, sameConstraints } from "../lib/part-identity.js";

function elements(): CodifiedElement[] {
  return [
    { kind: "invariant", key: "ingress_min", obligation: "mandatory", expr: "ingressRank(attrs.ingress) >= rank('IP65')", src: "scope: washdown", ratified: true },
    { kind: "variable", key: "voltage", obligation: "permissive", expr: "one of [24]", src: "line spec", ratified: true },
  ];
}

function cset(slot: string, scopeVersion: string, els = elements()): ConstraintSet {
  return { slot, scopeVersion, elements: els };
}

export function selftest(): number {
  const c = checker();

  // PID-R-01: before approval, nothing is minted.
  const minter = createMinter();
  c.ok("PID-R-01 no PCID exists before any approval", minter.minted().length === 0);

  const recs: Recommendation[] = [
    { part: { partNo: "MTR-24-A" }, constraints: cset("motor", "v1") },
    { part: { partNo: "ENC-1000" }, constraints: cset("encoder", "v1") },
  ];
  // A recommendation carries no pcid (enforced structurally — Recommendation has no
  // pcid field); approval is the mint trigger.
  const records = minter.approveAll(recs);
  c.ok("PID-R-01 approval mints exactly one PCID per approved part", records.length === 2 && minter.minted().length === 2);

  // PID-R-02: unique + immutable.
  c.ok("PID-R-02 minted PCIDs are pairwise distinct", records[0].pcid !== records[1].pcid);
  let immutable = false;
  try {
    // @ts-expect-error — deliberately attempt to mutate a frozen record
    records[0].pcid = "PCID-HACKED";
  } catch {
    immutable = true;
  }
  c.ok("PID-R-02 a minted record is immutable", immutable && records[0].pcid !== "PCID-HACKED");

  // PID-R-02: superseding mints a NEW pcid; the old one is untouched and still resolves.
  const superseded = minter.supersede(records[0].pcid, { part: { partNo: "MTR-24-B" }, constraints: cset("motor", "v1") });
  c.ok("PID-R-02 supersede mints a new, distinct PCID", superseded.pcid !== records[0].pcid && superseded.supersedes === records[0].pcid);
  const oldResolved = minter.resolve(records[0].pcid);
  c.ok("PID-R-02 the superseded PCID still resolves to what it meant", oldResolved?.part.partNo === "MTR-24-A");

  // PID-R-03: resolve returns the exact constraints + scope version bound at mint.
  const r = minter.resolve(records[1].pcid);
  c.ok("PID-R-03 resolve returns the exact bound scope version", r?.scopeVersion === "v1");
  c.ok("PID-R-03 resolve returns the exact bound constraints", r?.constraints.slot === "encoder" && r?.constraints.elements.length === 2);
  c.ok("PID-R-03 an unknown PCID does not resolve", minter.resolve("PCID-999999") === undefined);

  // PID-R-04: equality by fingerprint — exact, order-independent, never fuzzy.
  const a = cset("motor", "v1");
  const bReordered: ConstraintSet = { slot: "motor", scopeVersion: "v1", elements: [elements()[1], elements()[0]] };
  c.ok("PID-R-04 identical constraints (reordered) share a fingerprint", fingerprint(a) === fingerprint(bReordered) && sameConstraints(a, bReordered));

  const changed = cset("motor", "v1", [
    { ...elements()[0], expr: "ingressRank(attrs.ingress) >= rank('IP67')" }, // tightened
    elements()[1],
  ]);
  c.ok("PID-R-04 a changed constraint yields a different fingerprint", fingerprint(a) !== fingerprint(changed) && !sameConstraints(a, changed));

  // PID-R-04: scope version and provenance are NOT what defines constraint equality;
  // the same enforced content under a different scope version fingerprints the same.
  const sameContentDiffScope = cset("motor", "v2");
  c.ok("PID-R-04 equality is over enforced content, not scope/provenance", fingerprint(a) === fingerprint(sameContentDiffScope));

  return c.done("PID: PCIDs mint at approval, are unique+immutable, resolve exactly, and equality is by fingerprint.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(selftest());
}
