// Solution Eval for Procurement Operations (OPS). Offline, deterministic. Asserts
// catalog-sourced demand, ordered single-truth state, the staged gate (stager ≠
// executor), three-way match before payment, lead-time dissemination, nonconformance
// blocking close, and performance recorded against a resolved supplier identity.
//
//   npx tsx scripts/operations.selftest.ts

import { pathToFileURL } from "node:url";
import { checker } from "../lib/check.js";
import { type SupplierId, localRegistry } from "../lib/supplier.js";
import {
  type PO,
  type Receipt,
  type Invoice,
  type PerfMetric,
  createDemand,
  advance,
  stage,
  approve,
  execute,
  threeWayMatch,
  stagePayment,
  confirmLeadTime,
  disseminate,
  undisseminatedSlip,
  receive,
  resolveException,
  recordPerformance,
} from "../lib/operations.js";

const catalogKeys = ["motor", "gearbox"];

export function selftest(): number {
  const c = checker();

  // OPS-R-01: demand sources from the catalog; an off-catalog key is surfaced.
  const line = createDemand(catalogKeys, { id: "L1", componentKey: "motor", supplierId: "tax:111", orderedQty: 10 });
  const offCat = createDemand(catalogKeys, { id: "L2", componentKey: "wifi_chip", supplierId: "tax:111", orderedQty: 1 });
  c.ok("OPS-R-01 catalog-sourced demand is not flagged", !line.offCatalog);
  c.ok("OPS-R-01 off-catalog demand surfaces as exception (not silent)", offCat.offCatalog);

  // OPS-R-02: ordered transitions only; illegal jump rejected.
  c.ok("OPS-R-02 legal step demand→quoted", advance(line, "quoted").ok);
  const skip = advance(line, "closed");
  c.ok("OPS-R-02 illegal skip quoted→closed rejected", !skip.ok);
  c.ok("OPS-R-02 legal step quoted→ordered", advance(line, "ordered").ok);

  // OPS-R-05: a confirmed lead time must be disseminated; a slip without
  // dissemination is a defect.
  confirmLeadTime(line, 21);
  c.ok("OPS-R-05 confirmed lead time undisseminated is a defect", undisseminatedSlip(line));
  disseminate(line);
  c.ok("OPS-R-05 after dissemination, no outstanding slip", !undisseminatedSlip(line));

  // OPS-R-03: PO is staged; the executor refuses a pending proposal; runs only once approved.
  const po = stage("issue_po", line.id, { qty: 10, unitPriceUsd: 5 });
  c.ok("OPS-R-03 PO is staged pending (not auto-issued)", po.status === "pending");
  c.ok("OPS-R-03 executor refuses a pending proposal (stager ≠ executor)", !execute(po).ok);
  approve(po);
  c.ok("OPS-R-03 executor runs the approved proposal", execute(po).ok && po.status === "executed");

  // OPS-R-06: shortage opens an exception that blocks close until resolved.
  advance(line, "received");
  receive(line, 8, true); // 8 of 10 → shortage
  c.ok("OPS-R-06 shortage opens an exception", line.exceptions.length === 1);
  advance(line, "invoiced");
  const blocked = advance(line, "closed");
  c.ok("OPS-R-06 cannot close with an open exception", !blocked.ok && line.state === "invoiced");
  resolveException(line, 0);
  c.ok("OPS-R-06 close allowed once exception resolved", advance(line, "closed").ok && line.state === "closed");

  // OPS-R-04: three-way match gates payment.
  const goodPO: PO = { lineId: "L9", qty: 10, unitPriceUsd: 5 };
  const goodReceipt: Receipt = { lineId: "L9", qty: 10 };
  const goodInvoice: Invoice = { lineId: "L9", qty: 10, amountUsd: 50 };
  const badInvoice: Invoice = { lineId: "L9", qty: 10, amountUsd: 75 }; // price mismatch
  c.ok("OPS-R-04 matching PO/receipt/invoice passes", threeWayMatch(goodPO, goodReceipt, goodInvoice).ok);
  c.ok("OPS-R-04 mismatched invoice fails the match", !threeWayMatch(goodPO, goodReceipt, badInvoice).ok);
  c.ok("OPS-R-04 unmatched invoice cannot stage a payment (flagged, never paid)",
    !stagePayment(goodPO, goodReceipt, badInvoice).ok);
  const pay = stagePayment(goodPO, goodReceipt, goodInvoice);
  c.ok("OPS-R-04 matched invoice stages a payment proposal (pending the gate)",
    pay.ok && pay.proposal.status === "pending");
  // and that payment still passes through the OPS-R-03 gate before executing
  if (pay.ok) {
    c.ok("OPS-R-03 payment refuses to execute while pending", !execute(pay.proposal).ok);
    approve(pay.proposal);
    c.ok("OPS-R-03 payment executes once approved", execute(pay.proposal).ok);
  }

  // OPS-R-07: performance attaches to a RESOLVED supplier identity; unknown id rejected.
  const reg = localRegistry([{ canonicalName: "Acme Steel Inc", taxIds: ["11-1111111"] }]);
  const acmeId: SupplierId = reg.resolve({ name: "Acme Steel Inc", taxId: "11-1111111" });
  const store = new Map<SupplierId, PerfMetric[]>();
  const okPerf = recordPerformance(reg, store, { supplierId: acmeId, onTime: false, nonconformances: 1 });
  const badPerf = recordPerformance(reg, store, { supplierId: "tax:999", onTime: true, nonconformances: 0 });
  c.ok("OPS-R-07 performance recorded against a known identity", okPerf.ok && store.get(acmeId)?.length === 1);
  c.ok("OPS-R-07 performance against unknown identity rejected", !badPerf.ok);

  return c.done("OPS: procure-to-pay lifecycle is ordered, gated, matched, and identity-anchored.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(selftest());
}
