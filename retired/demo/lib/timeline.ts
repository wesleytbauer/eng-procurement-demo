// PART 2 — the procure-to-pay driver.
//
// Replays the REAL OPS lifecycle functions for each awarded slot, in order, with four
// planted defects: a lead-time slip (motor/Soylent), a shortage (harness/Stark), a
// quality NCR (controller/Soylent), and an invoice price-mismatch (encoder/Umbrella)
// that the three-way match refuses to pay. Delivery outcomes are written back through
// recordPerformance — the same store the award reads next quarter.

import {
  createDemand,
  advance,
  stage,
  approve,
  execute,
  confirmLeadTime,
  disseminate,
  undisseminatedSlip,
  receive,
  resolveException,
  threeWayMatch,
  stagePayment,
  recordPerformance,
  type Line,
  type Proposal,
  type PerfMetric,
} from "../../lib/operations.js";
import type { SupplierId } from "../../lib/supplier.js";
import { REQUIRED_KEYS } from "../data/product.js";
import { orderQtyForSlot } from "../data/schedule.js";
import type { AwardLine } from "./award.js";
import type { World } from "./world.js";
import type { Quote } from "./types.js";

export interface SlotRun {
  slot: string;
  supplierId: SupplierId;
  awardEntryId: string;
  orderedQty: number;
  receivedQty: number;
  line: Line;
  po: Proposal;
  payment?: Proposal;
  paymentBlocked?: string;
  leadTimeDays: number;
  slipped: boolean;
  ncr: boolean;
  shortage: boolean;
  paid: boolean;
  closed: boolean;
}

export interface Event {
  seq: number;
  slot: string;
  kind: string;
  detail: string;
}

export interface TimelineResult {
  events: Event[];
  runs: Map<string, SlotRun>;
}

// Which slot carries which planted defect.
const SLIP = "motor";
const SHORTAGE = "harness";
const NCR = "controller";
const MISMATCH = "encoder";

export function runTimeline(world: World, winners: Map<string, AwardLine>): TimelineResult {
  const events: Event[] = [];
  const runs = new Map<string, SlotRun>();
  let seq = 0;
  const log = (slot: string, kind: string, detail: string) => events.push({ seq: seq++, slot, kind, detail });
  const quoteFor = (entryId: string): Quote => world.quotes.find((q) => q.entryId === entryId)!;

  for (const slot of REQUIRED_KEYS) {
    const award = winners.get(slot);
    if (!award) {
      log(slot, "no-award", "no eligible supplier — sourcing gap");
      continue;
    }
    const q = quoteFor(award.entryId);
    const orderedQty = orderQtyForSlot(slot);
    const unitPriceUsd = q.unitPriceUsd;

    // demand → quoted (catalog-sourced demand, OPS-R-01)
    const line = createDemand(REQUIRED_KEYS, { id: `L-${slot}`, componentKey: slot, supplierId: award.supplierId, orderedQty });
    log(slot, "demand", `${orderedQty} units, awarded ${award.entryId}`);
    advance(line, "quoted");

    // PO staged → approved → executed (OPS-R-03: stager ≠ executor)
    const po = stage("issue_po", line.id, { qty: orderedQty, unitPriceUsd });
    log(slot, "po-staged", `PO for ${orderedQty} @ $${unitPriceUsd} (pending approval)`);
    approve(po);
    execute(po);
    log(slot, "po-issued", `PO executed after approval`);
    advance(line, "ordered");

    // lead time confirmed + disseminated (OPS-R-05); the slip slot slips first
    let leadTimeDays = q.leadTimeDays;
    const slipped = slot === SLIP;
    confirmLeadTime(line, leadTimeDays);
    if (slipped) {
      leadTimeDays = q.leadTimeDays + 7;
      confirmLeadTime(line, leadTimeDays);
      log(slot, "lead-slip", `lead time slipped ${q.leadTimeDays}d → ${leadTimeDays}d (undisseminated: ${undisseminatedSlip(line)})`);
    }
    disseminate(line);
    log(slot, "disseminate", `confirmed ${leadTimeDays}d propagated to stakeholders`);

    // receipt with planted shortage / NCR (OPS-R-06)
    advance(line, "received");
    const shortage = slot === SHORTAGE;
    const ncr = slot === NCR;
    const receivedQty = shortage ? orderedQty - 5 : orderedQty;
    receive(line, receivedQty, !ncr);
    if (shortage) log(slot, "shortage", `received ${receivedQty}/${orderedQty} — exception opened`);
    if (ncr) log(slot, "ncr", `quality nonconformance — exception opened`);
    if (!shortage && !ncr) log(slot, "receipt", `received ${receivedQty}/${orderedQty}, conforming`);

    // invoice → three-way match → payment (OPS-R-04 + OPS-R-03)
    advance(line, "invoiced");
    const mismatch = slot === MISMATCH;
    const amountUsd = receivedQty * unitPriceUsd + (mismatch ? 50 : 0);
    const poDoc = { lineId: line.id, qty: orderedQty, unitPriceUsd };
    const receipt = { lineId: line.id, qty: receivedQty };
    const invoice = { lineId: line.id, qty: receivedQty, amountUsd };
    const match = threeWayMatch(poDoc, receipt, invoice);
    let payment: Proposal | undefined;
    let paymentBlocked: string | undefined;
    let paid = false;
    if (!match.ok) {
      paymentBlocked = match.reasons.join("; ");
      log(slot, "match-fail", `three-way match failed — invoice flagged, NOT paid (${paymentBlocked})`);
    } else {
      const staged = stagePayment(poDoc, receipt, invoice);
      if (staged.ok) {
        payment = staged.proposal;
        approve(payment);
        execute(payment);
        paid = true;
        log(slot, "paid", `three-way match passed → payment executed ($${amountUsd})`);
      }
    }

    // resolve any open exception, then close (OPS-R-06 blocks close until resolved)
    while (line.exceptions.length > 0) {
      log(slot, "resolve", `resolved: ${line.exceptions[0]}`);
      resolveException(line, 0);
    }
    let closed = false;
    if (paid) {
      const c = advance(line, "closed");
      closed = c.ok;
      if (closed) log(slot, "closed", `line closed`);
    } else {
      log(slot, "open", `line left at '${line.state}' — payment unresolved`);
    }

    // performance written back (OPS-R-07) — closes the loop to the next award
    recordPerformance(world.registry, world.perf, { supplierId: award.supplierId, onTime: !slipped, nonconformances: ncr ? 1 : 0 });
    log(slot, "perf", `recorded onTime=${!slipped}, nonconformances=${ncr ? 1 : 0} for ${award.supplierId}`);

    runs.set(slot, {
      slot, supplierId: award.supplierId, awardEntryId: award.entryId, orderedQty, receivedQty,
      line, po, payment, paymentBlocked, leadTimeDays, slipped, ncr, shortage, paid, closed,
    });
  }

  return { events, runs };
}
