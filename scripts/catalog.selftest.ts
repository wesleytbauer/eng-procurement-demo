// Solution Eval for Vendor Catalog (CAT). Offline, deterministic. Asserts coverage
// both directions, provenance both ways, the standard as conformance gate, explicit
// equivalence for alternates, and an exact diff on a standard change.
//
//   npx tsx scripts/catalog.selftest.ts

import { pathToFileURL } from "node:url";
import { checker } from "../lib/check.js";
import { type Component, type Invariant, type Variable, buildLine, deriveStandard } from "../lib/standard.js";
import { type CatalogEntry, checkCoverage, reconcileToStandard } from "../lib/catalog.js";

const invariants: Invariant[] = [{ key: "type", required: (c) => c.attrs.type === "dc_motor" }];
const variablesV1: Variable[] = [{ key: "voltage", domain: [12, 24] }];

function comp(attrs: Record<string, string | number>): Component {
  return { line: "gearmotor", attrs };
}

export function selftest(): number {
  const c = checker();

  const line = buildLine("gearmotor", invariants, variablesV1);
  const std = deriveStandard(line);
  const requiredKeys = ["motor", "gearbox"];

  // A fully-covered, conformant, well-sourced catalog with a justified alternate.
  const good: CatalogEntry[] = [
    { id: "e1", componentKey: "motor", component: comp({ type: "dc_motor", voltage: 24 }), supplierId: "tax:111", source: "acme/cat#p12", equivalenceBasis: "primary" },
    { id: "e2", componentKey: "motor", component: comp({ type: "dc_motor", voltage: 12 }), supplierId: "tax:222", source: "globex/cat#m4", equivalenceBasis: "form-fit-function equiv to e1" },
    { id: "e3", componentKey: "gearbox", component: comp({ type: "dc_motor", voltage: 24 }), supplierId: "tax:111", source: "acme/cat#g7" },
  ];
  const okReport = checkCoverage(line, std, requiredKeys, good);
  c.ok("CAT-R-01 full coverage, in-bounds → ok", okReport.ok, JSON.stringify(okReport));

  // CAT-R-01 forward: a gap when a required key has no conformant source.
  const gapReport = checkCoverage(line, std, requiredKeys, good.filter((e) => e.componentKey !== "gearbox"));
  c.ok("CAT-R-01 missing required key surfaces as a gap", gapReport.gaps.includes("gearbox") && !gapReport.ok);

  // CAT-R-01 bounded: an entry outside the standard's required space is flagged.
  const outBound = checkCoverage(line, std, requiredKeys, [
    ...good,
    { id: "x1", componentKey: "bluetooth_module", component: comp({ type: "dc_motor", voltage: 24 }), supplierId: "tax:333", source: "globex/cat#b1" },
  ]);
  c.ok("CAT-R-01 out-of-standard entry flagged", outBound.outOfStandard.includes("x1") && !outBound.ok);

  // CAT-R-03: the standard is the gate — a non-conformant component is rejected.
  const nonconf = checkCoverage(line, std, requiredKeys, [
    ...good,
    { id: "bad", componentKey: "gearbox", component: comp({ type: "ac_motor", voltage: 24 }), supplierId: "tax:444", source: "x/y" },
  ]);
  c.ok("CAT-R-03 standard rejects non-conformant entry", nonconf.nonconforming.includes("bad") && !nonconf.ok);

  // CAT-R-02: provenance both ways — an entry missing source/supplier is flagged.
  const unsourced = checkCoverage(line, std, requiredKeys, [
    ...good,
    { id: "u1", componentKey: "motor", component: comp({ type: "dc_motor", voltage: 24 }), supplierId: "", source: "" },
  ]);
  c.ok("CAT-R-02 unsourced entry flagged", unsourced.unsourced.includes("u1") && !unsourced.ok);

  // CAT-R-04: alternates must justify equivalence.
  const unjustified = checkCoverage(line, std, requiredKeys, [
    { id: "a1", componentKey: "motor", component: comp({ type: "dc_motor", voltage: 24 }), supplierId: "tax:111", source: "acme/p12" }, // alternate w/o basis
    { id: "a2", componentKey: "motor", component: comp({ type: "dc_motor", voltage: 12 }), supplierId: "tax:222", source: "globex/m4" }, // alternate w/o basis
    { id: "a3", componentKey: "gearbox", component: comp({ type: "dc_motor", voltage: 24 }), supplierId: "tax:111", source: "acme/g7" },
  ]);
  c.ok("CAT-R-04 unjustified alternates flagged",
    unjustified.unjustifiedAlternates.includes("a1") && unjustified.unjustifiedAlternates.includes("a2") && !unjustified.ok);

  // CAT-R-05: a standard change reconciles to an EXACT diff.
  // Tighten voltage domain to {24} only → the 12V entry e2 becomes non-conformant;
  // and add a new required key "encoder" → a new gap. Nothing else should move.
  const lineV2 = buildLine("gearmotor", invariants, [{ key: "voltage", domain: [24] }]);
  const stdV2 = deriveStandard(lineV2);
  const diff = reconcileToStandard(line, std, lineV2, stdV2, requiredKeys, [...requiredKeys, "encoder"], good);
  c.ok("CAT-R-05 change detected", diff.changed);
  c.ok("CAT-R-05 newly-invalid entry is exactly e2 (12V)", diff.newlyInvalid.length === 1 && diff.newlyInvalid[0] === "e2", JSON.stringify(diff));
  c.ok("CAT-R-05 new gap is exactly 'encoder'", diff.newGaps.length === 1 && diff.newGaps[0] === "encoder", JSON.stringify(diff));

  return c.done("CAT: catalog covers exactly the standard's space and tracks its changes.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(selftest());
}
