// Solution Eval for Procurement Operations (OPS) — the ADVISORY layer. Offline,
// deterministic. Asserts: demand resolves via a PCID (OPS-R-01); state is mirrored,
// never mastered (OPS-R-02); recommend-only, no execution/write-back (OPS-R-03);
// three-way match is recommended, not enforced (OPS-R-04); outreach is surfaced
// (OPS-R-05); nonconformance/shortage are tracked (OPS-R-06); performance resolves
// to one supplier identity (OPS-R-07); and the award is a conformance-bounded
// recommendation (candidate).
//
//   npx tsx scripts/operations.selftest.ts

import { pathToFileURL } from "node:url";
import { checker } from "../lib/check.js";
import { localRegistry } from "../lib/supplier.js";
import { type ConstraintSet } from "../lib/sourcing.js";
import { createMinter } from "../lib/part-identity.js";
import {
  type SorLine,
  type Quote,
  ingest,
  resync,
  resolveDemand,
  reconcileInvoice,
  recommendOutreach,
  detectExceptions,
  computePerformance,
  recommendAward,
} from "../lib/operations.js";

const registry = localRegistry([
  { canonicalName: "Acme Corp", taxIds: ["11-111"], aka: ["Acme", "Acme Incorporated"] },
  { canonicalName: "Globex LLC", taxIds: ["22-222"] },
  { canonicalName: "Initech", taxIds: ["33-333"] },
]);

function report(): SorLine[] {
  return [
    { pcid: "PCID-000001", state: "invoiced", supplierRef: { name: "Acme" }, po: { qty: 100, unitPrice: 5 }, receipt: { qty: 100 }, invoice: { amount: 500 }, promisedDate: 10, actualDate: 9 },
    { pcid: "PCID-000002", state: "received", supplierRef: { name: "Acme Incorporated" }, po: { qty: 100, unitPrice: 5 }, receipt: { qty: 100, nonconforming: true }, promisedDate: 10, actualDate: 12 },
    { pcid: "PCID-000003", state: "invoiced", supplierRef: { name: "Globex" }, po: { qty: 50, unitPrice: 2 }, receipt: { qty: 40 }, invoice: { amount: 80 }, promisedDate: 5, actualDate: 5 },
  ];
}

export function selftest(): number {
  const c = checker();

  // OPS-R-02: the mirror reflects the SoR report exactly and is frozen (no mutator).
  const mirror = ingest(report());
  c.ok("OPS-R-02 mirror reflects the SoR report", mirror.length === 3 && mirror[0].pcid === "PCID-000001");
  let frozen = false;
  try {
    // @ts-expect-error — deliberately attempt to advance state on the mirror
    mirror[0].state = "closed";
  } catch {
    frozen = true;
  }
  c.ok("OPS-R-02 the tool cannot advance mirrored state", frozen && mirror[0].state === "invoiced");
  const resynced = resync([{ ...report()[0], state: "closed" }]);
  c.ok("OPS-R-02 re-sync defers to the SoR (state comes from the report)", resynced[0].state === "closed");

  // OPS-R-01: demand references a PCID that resolves to constraints; unknown → surfaced.
  const minter = createMinter();
  const cs: ConstraintSet = { slot: "motor", scopeVersion: "v1", elements: [
    { kind: "invariant", key: "ingress_min", obligation: "mandatory", expr: "ingressRank(attrs.ingress) >= rank('IP65')", src: "scope", ratified: true },
  ] };
  const rec = minter.approve({ part: { partNo: "MTR-24-A" }, constraints: cs });
  const resolved = resolveDemand(rec.pcid, minter.resolve);
  c.ok("OPS-R-01 a resolvable PCID yields the part's constraints", resolved.ok && resolved.constraints?.slot === "motor");
  const missing = resolveDemand("PCID-NOPE", minter.resolve);
  c.ok("OPS-R-01 an unresolvable PCID is a surfaced exception", !missing.ok && missing.recommendation?.kind === "demand-exception");

  // OPS-R-04: three-way match RECOMMENDS approve/hold; never pays, never a "paid" state.
  const approve = reconcileInvoice(report()[0]); // 100@5 = 500, received 100, invoice 500
  const hold = reconcileInvoice(report()[2]); // received 40 ≠ 50, invoice 80 ≠ 100
  c.ok("OPS-R-04 a matched invoice is recommended for approval", approve.action === "approve" && approve.status === "proposed");
  c.ok("OPS-R-04 a mismatched invoice is recommended for hold (never paid)", hold.action === "hold" && hold.status === "proposed");

  // OPS-R-03: recommend-only — every output is a proposal; the mirror is untouched.
  const outreach = recommendOutreach(mirror);
  const exceptions = detectExceptions(mirror);
  const allProposed = [approve, hold, ...outreach, ...exceptions].every((r) => r.status === "proposed");
  c.ok("OPS-R-03 every recommendation is a proposal, never an executed act", allProposed);
  c.ok("OPS-R-03 generating recommendations does not mutate the mirror", mirror[0].state === "invoiced");

  // OPS-R-05: a late line surfaces outreach.
  c.ok("OPS-R-05 a late delivery surfaces a chase recommendation",
    outreach.some((r) => r.pcid === "PCID-000002" && r.action === "chase"));

  // OPS-R-06: nonconformance and shortage open tracked exceptions.
  c.ok("OPS-R-06 a nonconformance opens a block-close exception",
    exceptions.some((r) => r.pcid === "PCID-000002" && r.action === "block-close"));
  c.ok("OPS-R-06 a shortage opens a block-close exception",
    exceptions.some((r) => r.pcid === "PCID-000003" && r.reason.startsWith("shortage")));

  // OPS-R-07: performance is computed against a resolved identity; aliases collapse.
  const perf = computePerformance(mirror, registry);
  const acmeId = registry.resolve({ name: "Acme" });
  c.ok("OPS-R-07 aliased suppliers resolve to exactly one identity", perf.has(acmeId) && perf.get(acmeId)?.deliveries === 2);
  c.ok("OPS-R-07 every performance record maps to a known single identity",
    [...perf.keys()].every((id) => registry.get(id) !== undefined));
  c.ok("OPS-R-07 on-time is computed from the mirror (Acme 1/2 on time)", perf.get(acmeId)?.onTime === 1);

  // Candidate: recommendation is explainable and conformance-bounded.
  const globexId = registry.resolve({ name: "Globex" });
  const initechId = registry.resolve({ name: "Initech" });
  const quotes: Quote[] = [
    { supplierRef: { name: "Acme" }, unitPrice: 10, leadTimeDays: 5, conformant: true },
    { supplierRef: { name: "Globex" }, unitPrice: 8, leadTimeDays: 3, conformant: false }, // cheapest but NON-conformant
    { supplierRef: { name: "Initech" }, unitPrice: 12, leadTimeDays: 2, conformant: true },
  ];
  const award = recommendAward(quotes, registry);
  c.ok("candidate award is a proposal, not an executed award", award.status === "proposed");
  c.ok("candidate a non-conformant quote is never recommended", award.winner !== globexId);
  c.ok("candidate the rank-1 eligible conformant quote is recommended", award.winner === initechId);
  c.ok("candidate the scorecard shows the excluded non-conformant quote with reason",
    award.scorecard.some((r) => r.supplierId === globexId && !r.included));

  return c.done("OPS: advisory layer mirrors the SoR read-only and recommends — it never acts or masters truth.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(selftest());
}
