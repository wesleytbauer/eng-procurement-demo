// Solution Eval for the demo. Asserts the NARRATIVE invariants (not the lib's — those
// have their own gates): coverage green, the gate rejects each bad submission, identity
// resolves, awards are conformant rank-1, the closed loop flips an award, payments
// never run without a passing match, and the v1→v2 diff is exactly the engineered set.
// Also a determinism guard: two runs produce identical state.
//
//   npx tsx demo/demo.selftest.ts

import { pathToFileURL } from "node:url";
import { checker } from "../lib/check.js";
import { conform } from "../lib/standard.js";
import { runScenario } from "./scenario.js";

const EXPECT_WINNERS: Record<string, string> = {
  motor: "m-soylent-54",
  gearbox: "g-tyrell-20",
  encoder: "e-umbrella-1000",
  controller: "c-soylent-12",
  housing: "h-acme-65",
  harness: "hn-stark-20",
  fasteners: "f-wayne-a2",
};

export function selftest(): number {
  const c = checker();
  const r = runScenario(0xc0ffee);

  // Coverage + gate
  c.ok("v1 catalog coverage is green across all slots", r.coverageGreen);
  c.ok("every rejected submission is caught by its expected rule", r.rejections.every((x) => x.ok), JSON.stringify(r.rejections.filter((x) => !x.ok)));

  // Supplier identity (SUP-R-02 / -R-01 / -R-05)
  c.ok("3 Acme references resolve to one identity", r.resolution.acmeOneId);
  c.ok("local master and external SoR induce the same partition", r.resolution.partitionEqual);

  // Awards are conformant rank-1 (the candidate award-auditability invariant)
  let allConformantWinners = true;
  for (const [slot, w] of r.winnersV1) {
    const s = r.world.slotsV1.get(slot)!;
    const entry = r.world.accepted.find((e) => e.id === w.entryId)!;
    if (w.rank !== 1 || !w.eligible || !conform(s.line, s.std, entry.component).ok) allConformantWinners = false;
  }
  c.ok("every award is the rank-1 eligible, standard-conformant quote", allConformantWinners);
  const winnersMatch = Object.entries(EXPECT_WINNERS).every(([slot, id]) => r.winnersV1.get(slot)?.entryId === id);
  c.ok("awards match the engineered scenario", winnersMatch, JSON.stringify(Object.fromEntries([...r.winnersV1].map(([s, w]) => [s, w.entryId]))));

  // Closed loop: performance flips the gearbox award
  c.ok("closed loop — gearbox award flips when performance counts", r.closedLoop.changed && r.closedLoop.withoutPerf === "g-globex-10" && r.closedLoop.withPerf === "g-tyrell-20", JSON.stringify(r.closedLoop));

  // Payment safety (OPS-R-04): the mismatched invoice is never paid; clean ones are
  const encoder = r.timeline.runs.get("encoder")!;
  const motor = r.timeline.runs.get("motor")!;
  c.ok("mismatched invoice is flagged and never paid", encoder.paid === false && !!encoder.paymentBlocked);
  c.ok("a matched invoice is paid", motor.paid === true);

  // Planted exceptions surfaced (OPS-R-05/-06)
  c.ok("harness shortage opened (then resolved) an exception", r.timeline.runs.get("harness")!.shortage);
  c.ok("controller NCR opened (then resolved) an exception", r.timeline.runs.get("controller")!.ncr);

  // The v1→v2 headline numbers are exact
  c.ok("exactly 6 entries newly non-conformant at v2", r.totals.newlyInvalid === 6, String(r.totals.newlyInvalid));
  c.ok("exactly 1 new sourcing gap at v2", r.totals.newGaps === 1, String(r.totals.newGaps));
  c.ok("controller is the new gap", (r.diffs.get("controller")?.newGaps ?? []).includes("controller"));
  c.ok("exactly 2 in-flight POs at risk", r.totals.posAtRisk === 2, JSON.stringify(r.posAtRisk));
  const controllerReaward = r.reawards.find((x) => x.slot === "controller");
  c.ok("controller re-award reports a GAP (re-source required)", controllerReaward?.gap === true);
  const motorReaward = r.reawards.find((x) => x.slot === "motor");
  c.ok("motor re-awards to a surviving conformant supplier", motorReaward?.gap === false && !!motorReaward?.winnerEntryId);

  // Determinism: a second run yields identical state
  const a = JSON.stringify(snapshot(runScenario(0xc0ffee)));
  const b = JSON.stringify(snapshot(runScenario(0xc0ffee)));
  c.ok("two runs produce byte-identical state (deterministic)", a === b);

  return c.done("Demo: synthetic GM-Series runs end-to-end and the v1→v2 change is exact.");
}

function snapshot(r: ReturnType<typeof runScenario>) {
  return {
    winners: Object.fromEntries([...r.winnersV1].map(([s, w]) => [s, w.entryId])),
    totals: r.totals,
    posAtRisk: r.posAtRisk,
    reawards: r.reawards,
    closedLoop: r.closedLoop,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(selftest());
}
