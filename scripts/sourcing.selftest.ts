// Solution Eval for Standard Sourcing (SRC). Offline, deterministic. Asserts the
// checkable invariants of the "LLM proposes → gate verifies → human ratifies"
// trust model: applicable set is a function of scope (SRC-R-01), provenance to an
// authoritative clause (SRC-R-02), proposed-not-auto-bound (SRC-R-03), two-way
// faithfulness (SRC-R-04), relationships first-class not smuggled (SRC-R-05),
// obligation classified from modal language (SRC-R-06).
//
//   npx tsx scripts/sourcing.selftest.ts

import { pathToFileURL } from "node:url";
import { checker } from "../lib/check.js";
import {
  type CodifiedElement,
  type Scope,
  applicableStandards,
  classifyObligation,
  verifyCodification,
  ratifiedInputs,
  hasUnratified,
} from "../lib/sourcing.js";

// A proposed codification for a "drive_enclosure" slot (as an LLM might propose,
// then a human ratifies). The mandated keys are what the scope + its standards
// require be codified.
const mandatedKeys = ["humidity_category_declared", "ingress_min", "humidity_category", "test_condition", "hot_humid_guard"];

function proposal(): CodifiedElement[] {
  return [
    { kind: "invariant", key: "humidity_category_declared", obligation: "mandatory", expr: "attrs.humidity_category !== undefined", src: "507.6 — a category must be selected", ratified: true },
    { kind: "invariant", key: "ingress_min", obligation: "mandatory", expr: "ingressRank(attrs.ingress) >= rank('IP65')", src: "scope: high-pressure washdown ⇒ jetting protection", ratified: true },
    { kind: "variable", key: "humidity_category", obligation: "permissive", expr: "one of [B1,B2,B3,none]", src: "507.6 — induced humidity categories", ratified: true },
    { kind: "variable", key: "test_condition", obligation: "recommended", expr: "one of [27C_95RH, 60C_95RH_aggravated]", src: "507.6 — 60C/95RH historically used (not naturally occurring)", ratified: true },
    { kind: "relationship", key: "hot_humid_guard", obligation: "mandatory", expr: "when humidity_category=B3 then test_condition=60C_95RH_aggravated", src: "507.6 — hot-humid → aggravated cycle", ratified: true },
  ];
}

export function selftest(): number {
  const c = checker();

  // SRC-R-06: modal language → obligation (gold set).
  c.ok("SRC-R-06 'shall' → mandatory", classifyObligation("the enclosure shall provide IP65") === "mandatory");
  c.ok("SRC-R-06 'should' → recommended", classifyObligation("the test should use 60C/95RH") === "recommended");
  c.ok("SRC-R-06 'may' → permissive", classifyObligation("a category may be selected") === "permissive");
  c.ok("SRC-R-06 'typically' → informative", classifyObligation("typically used in transit") === "informative");

  // SRC-R-01: applicable standards are a function of scope; change scope → re-derive.
  const scopeV1: Scope = { version: "v1", tags: ["humidity", "ingress"] };
  const scopeV2: Scope = { version: "v2", tags: ["humidity", "ingress", "washdown"] }; // customer adds washdown
  const setV1 = applicableStandards(scopeV1);
  const setV2 = applicableStandards(scopeV2);
  c.ok("SRC-R-01 standard set derives from scope", setV1.includes("MIL-STD-810H:507.6") && setV1.includes("IEC-60529"));
  c.ok("SRC-R-01 scope change re-derives the set (adds corrosion)",
    !setV1.includes("MIL-STD-810H:509-corrosion") && setV2.includes("MIL-STD-810H:509-corrosion"));
  c.ok("SRC-R-01 re-derivation is deterministic (same scope → same set)",
    applicableStandards(scopeV1).join() === setV1.join());

  // SRC-R-02/-R-04/-R-05: a faithful, fully-sourced, cleanly-typed codification passes.
  const good = proposal();
  const rep = verifyCodification(mandatedKeys, good);
  c.ok("SRC-R-02/-R-04/-R-05 a faithful sourced codification verifies", rep.ok, JSON.stringify(rep));

  // SRC-R-02: an element with no source clause is rejected.
  const noSrc = proposal();
  noSrc[0] = { ...noSrc[0], src: "  " };
  c.ok("SRC-R-02 unsourced element is caught", verifyCodification(mandatedKeys, noSrc).unsourced.includes("humidity_category_declared"));

  // SRC-R-04: two-way faithfulness — overreach (invented) and undercoverage (gap).
  const overreach = [...proposal(), { kind: "invariant" as const, key: "invented_rule", obligation: "mandatory" as const, expr: "attrs.x === 1", src: "nowhere", ratified: true }];
  c.ok("SRC-R-04 overreach (codified beyond mandate) is caught",
    verifyCodification(mandatedKeys, overreach).faithfulness.overreach.includes("invented_rule"));
  const undercovered = proposal().filter((e) => e.key !== "ingress_min");
  c.ok("SRC-R-04 undercoverage (mandated left un-codified) is caught",
    verifyCodification(mandatedKeys, undercovered).faithfulness.undercovered.includes("ingress_min"));

  // SRC-R-05: a guard smuggled into an invariant (not typed as a relationship) is caught.
  const smuggled = proposal();
  smuggled[1] = { ...smuggled[1], expr: "when attrs.washdown then ingressRank(attrs.ingress) >= rank('IP65')" };
  c.ok("SRC-R-05 guard smuggled into an invariant is caught",
    verifyCodification(mandatedKeys, smuggled).smuggledGuards.includes("ingress_min"));
  c.ok("SRC-R-05 relationship element is accepted as first-class",
    good.some((e) => e.kind === "relationship") && verifyCodification(mandatedKeys, good).smuggledGuards.length === 0);

  // SRC-R-03: proposed, never auto-bound — only ratified elements cross to STD.
  const proposedNotRatified = proposal().map((e) => ({ ...e, ratified: false }));
  c.ok("SRC-R-03 un-ratified proposal is flagged as not-yet-binding", hasUnratified(proposedNotRatified));
  c.ok("SRC-R-03 nothing un-ratified crosses to STD", ratifiedInputs(proposedNotRatified).length === 0);
  const mixed = proposal();
  mixed[2] = { ...mixed[2], ratified: false };
  c.ok("SRC-R-03 only the ratified subset crosses", ratifiedInputs(mixed).length === good.length - 1 && hasUnratified(mixed));

  return c.done("SRC: proposals are provenance-checked, faithful, cleanly-typed, and cross only once ratified.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(selftest());
}
