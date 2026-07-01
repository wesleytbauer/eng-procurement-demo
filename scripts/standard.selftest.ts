// Solution Eval for Product Standard (STD). Offline, deterministic. Asserts the
// five invariants: derived-not-authored, invariant/variable separation,
// algorithmic conformance, total propagation, scoped-per-line.
//
//   npx tsx scripts/standard.selftest.ts

import { pathToFileURL } from "node:url";
import { checker } from "../lib/check.js";
import {
  type Component,
  type Invariant,
  type Variable,
  buildLine,
  deriveStandard,
  conform,
  sameStandard,
} from "../lib/standard.js";

// A product line: a 24V/12V DC gearmotor family.
// Invariant (never changes): it must be a DC motor made of an approved structural metal.
// Variables (the surround): nominal voltage and frame size.
const invariants: Invariant[] = [
  { key: "type", required: (c) => c.attrs.type === "dc_motor" },
  { key: "housing", required: (c) => c.attrs.housing === "steel" || c.attrs.housing === "aluminum" },
];
const variablesV1: Variable[] = [
  { key: "voltage", domain: [12, 24] },
  { key: "frame", domain: ["nema17", "nema23"] },
];

function comp(attrs: Record<string, string | number>, line = "gearmotor"): Component {
  return { line, attrs };
}

export function selftest(): number {
  const c = checker();

  const line = buildLine("gearmotor", invariants, variablesV1);
  const std = deriveStandard(line);

  // STD-R-03: deterministic conformance on a labeled set.
  const conformant = comp({ type: "dc_motor", housing: "steel", voltage: 24, frame: "nema23" });
  const wrongType = comp({ type: "ac_motor", housing: "steel", voltage: 24, frame: "nema23" });
  const offVoltage = comp({ type: "dc_motor", housing: "steel", voltage: 48, frame: "nema23" });
  const outOfScope = comp({ type: "dc_motor", housing: "steel", voltage: 24, frame: "nema23" }, "other_line");

  c.ok("STD-R-03 conformant component passes", conform(line, std, conformant).ok);
  c.ok("STD-R-03 invariant violation fails (ac vs dc)", !conform(line, std, wrongType).ok);
  c.ok("STD-R-03 out-of-domain variable fails (48V)", !conform(line, std, offVoltage).ok);
  c.ok("STD-R-05 out-of-scope component rejected", !conform(line, std, outOfScope).ok);

  // STD-R-02: nothing is both invariant and variable.
  let separationEnforced = false;
  try {
    buildLine("bad", invariants, [...variablesV1, { key: "type", domain: ["dc_motor", "ac_motor"] }]);
  } catch {
    separationEnforced = true;
  }
  c.ok("STD-R-02 element declared both invariant & variable is rejected", separationEnforced);

  // STD-R-04: change a VARIABLE → standard changes → classification flips.
  const lineV2 = buildLine("gearmotor", invariants, [
    { key: "voltage", domain: [12, 24, 48] }, // widen the variable domain
    { key: "frame", domain: ["nema17", "nema23"] },
  ]);
  const stdV2 = deriveStandard(lineV2);
  c.ok("STD-R-04 changed variable yields a different standard (lineage)", !sameStandard(std, stdV2));
  c.ok("STD-R-04 widening 48V flips offVoltage non-conformant → conformant",
    !conform(line, std, offVoltage).ok && conform(lineV2, stdV2, offVoltage).ok);

  // STD-R-04 again (N≥2): change an INVARIANT → classification flips the other way.
  const invariantsV3: Invariant[] = [
    { key: "type", required: (cc) => cc.attrs.type === "dc_motor" },
    { key: "housing", required: (cc) => cc.attrs.housing === "steel" }, // drop aluminum
  ];
  const lineV3 = buildLine("gearmotor", invariantsV3, variablesV1);
  const stdV3 = deriveStandard(lineV3);
  const aluminum = comp({ type: "dc_motor", housing: "aluminum", voltage: 24, frame: "nema23" });
  c.ok("STD-R-04 tightening invariant flips aluminum conformant → non-conformant",
    conform(line, std, aluminum).ok && !conform(lineV3, stdV3, aluminum).ok);
  c.ok("STD-R-04 invariant change yields a different standard", !sameStandard(std, stdV3));

  return c.done("STD: standard is derived from invariants+variables and changes propagate.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(selftest());
}
