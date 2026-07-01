// Procurement Operations (OPS) — the procure-to-pay lifecycle, governed.
//
// Demand sources from the catalog (OPS-R-01); lifecycle state is single-truth and
// ordered (OPS-R-02); issuing a PO and paying an invoice are STAGED proposals the
// stager never executes (OPS-R-03); payment requires a passing three-way match
// (OPS-R-04); known slips must be disseminated (OPS-R-05); nonconformances and
// shortages block close (OPS-R-06); performance is recorded against a resolved
// Supplier Truth identity (OPS-R-07 ↔ SUP-R-04).

import { type SupplierRegistry, type SupplierId } from "./supplier.js";

// ---- OPS-R-02: lifecycle state machine -------------------------------------

export type LineState = "demand" | "quoted" | "ordered" | "received" | "invoiced" | "closed";

const TRANSITIONS: Record<LineState, LineState[]> = {
  demand: ["quoted"],
  quoted: ["ordered"],
  ordered: ["received"],
  received: ["invoiced"],
  invoiced: ["closed"],
  closed: [],
};

export interface Line {
  id: string;
  componentKey: string;
  supplierId: SupplierId;
  orderedQty: number;
  receivedQty: number;
  state: LineState;
  offCatalog: boolean; // surfaced exception when demand wasn't catalog-sourced (OPS-R-01)
  exceptions: string[]; // open nonconformance/shortage exceptions (OPS-R-06)
  leadTimeDays?: number; // last confirmed lead time
  disseminatedLeadTimeDays?: number; // last lead time actually propagated (OPS-R-05)
}

export interface OpsError {
  ok: false;
  error: string;
}
export type Result<T> = ({ ok: true } & T) | OpsError;

/** OPS-R-01: a demand must target a catalog-covered component. An off-catalog key
 *  is not rejected silently — the line is created with `offCatalog` flagged so it
 *  surfaces as an exception. */
export function createDemand(
  catalogKeys: string[],
  args: { id: string; componentKey: string; supplierId: SupplierId; orderedQty: number },
): Line {
  return {
    ...args,
    receivedQty: 0,
    state: "demand",
    offCatalog: !catalogKeys.includes(args.componentKey),
    exceptions: [],
  };
}

/** OPS-R-02: advance one legal step or reject. No skips, no silent rewrites. */
export function advance(line: Line, to: LineState): Result<{ line: Line }> {
  if (!TRANSITIONS[line.state].includes(to)) {
    return { ok: false, error: `OPS-R-02: illegal transition ${line.state} → ${to}` };
  }
  if (to === "closed" && line.exceptions.length > 0) {
    return { ok: false, error: `OPS-R-06: cannot close with ${line.exceptions.length} open exception(s)` };
  }
  line.state = to;
  return { ok: true, line };
}

// ---- OPS-R-05: lead-time dissemination -------------------------------------

export function confirmLeadTime(line: Line, days: number): void {
  line.leadTimeDays = days;
}

/** A confirmed lead time (or a slip from a prior one) counts as disseminated only
 *  once propagated. `undisseminatedSlip` is the defect detector for OPS-R-05. */
export function disseminate(line: Line): void {
  line.disseminatedLeadTimeDays = line.leadTimeDays;
}

export function undisseminatedSlip(line: Line): boolean {
  return line.leadTimeDays !== undefined && line.leadTimeDays !== line.disseminatedLeadTimeDays;
}

// ---- OPS-R-06: receipt, nonconformance, shortage ---------------------------

/** Log receipt. A shortage (received < ordered) or a quality nonconformance opens a
 *  tracked exception that will block close until resolved. */
export function receive(line: Line, receivedQty: number, conforming: boolean): void {
  line.receivedQty = receivedQty;
  if (receivedQty < line.orderedQty) line.exceptions.push(`shortage: received ${receivedQty}/${line.orderedQty}`);
  if (!conforming) line.exceptions.push("nonconformance: quality reject");
}

export function resolveException(line: Line, index: number): void {
  line.exceptions.splice(index, 1);
}

// ---- OPS-R-03: staged gate for irreversible acts (stager ≠ executor) -------

export type ProposalKind = "issue_po" | "charge_payment";
export type ProposalStatus = "pending" | "approved" | "executed" | "rejected";

export interface Proposal {
  id: string;
  kind: ProposalKind;
  lineId: string;
  status: ProposalStatus;
  payload: Record<string, unknown>;
}

export function stage(kind: ProposalKind, lineId: string, payload: Record<string, unknown>): Proposal {
  return { id: `prop-${kind}-${lineId}`, kind, lineId, status: "pending", payload };
}

export function approve(p: Proposal): void {
  if (p.status === "pending") p.status = "approved";
}

export function reject(p: Proposal): void {
  if (p.status === "pending") p.status = "rejected";
}

/** The executor. OPS-R-03: it runs ONLY an approved proposal — never a pending one.
 *  The stager (above) never executes; this is the only path to an external effect. */
export function execute(p: Proposal): Result<{ proposal: Proposal }> {
  if (p.status !== "approved") return { ok: false, error: `OPS-R-03: refusing to execute ${p.status} proposal` };
  p.status = "executed";
  return { ok: true, proposal: p };
}

// ---- OPS-R-04: three-way match before payment ------------------------------

export interface PO {
  lineId: string;
  qty: number;
  unitPriceUsd: number;
}
export interface Receipt {
  lineId: string;
  qty: number;
}
export interface Invoice {
  lineId: string;
  qty: number;
  amountUsd: number;
}

export interface MatchResult {
  ok: boolean;
  reasons: string[];
}

/** PO ↔ receipt ↔ invoice reconcile within tolerance, else flagged. */
export function threeWayMatch(po: PO, receipt: Receipt, invoice: Invoice, tolUsd = 0.01): MatchResult {
  const reasons: string[] = [];
  if (po.lineId !== receipt.lineId || po.lineId !== invoice.lineId) reasons.push("line mismatch across PO/receipt/invoice");
  if (invoice.qty !== receipt.qty) reasons.push(`qty mismatch: invoice ${invoice.qty} ≠ receipt ${receipt.qty}`);
  if (invoice.qty > po.qty) reasons.push(`over-ship: invoice ${invoice.qty} > PO ${po.qty}`);
  if (Math.abs(invoice.amountUsd - invoice.qty * po.unitPriceUsd) > tolUsd) {
    reasons.push(`price mismatch: invoice ${invoice.amountUsd} ≠ ${invoice.qty}×${po.unitPriceUsd}`);
  }
  return { ok: reasons.length === 0, reasons };
}

/** OPS-R-04: stage a payment ONLY behind a passing three-way match. An unmatched
 *  invoice cannot even produce a payment proposal — it is flagged, never paid. */
export function stagePayment(po: PO, receipt: Receipt, invoice: Invoice): Result<{ proposal: Proposal }> {
  const match = threeWayMatch(po, receipt, invoice);
  if (!match.ok) return { ok: false, error: `OPS-R-04: three-way match failed: ${match.reasons.join("; ")}` };
  return { ok: true, proposal: stage("charge_payment", invoice.lineId, { amountUsd: invoice.amountUsd }) };
}

// ---- OPS-R-07: performance recorded against identity -----------------------

export interface PerfMetric {
  supplierId: SupplierId;
  onTime: boolean;
  nonconformances: number;
}

/** Performance attaches to a RESOLVED Supplier Truth identity. An unknown id is
 *  rejected — OPS never mints supplier identity, it references SUP's (OPS-R-07 ↔
 *  SUP-R-04). Returns the running store keyed by id. */
export function recordPerformance(
  reg: SupplierRegistry,
  store: Map<SupplierId, PerfMetric[]>,
  m: PerfMetric,
): Result<{ store: Map<SupplierId, PerfMetric[]> }> {
  if (!reg.get(m.supplierId)) return { ok: false, error: `OPS-R-07: unknown supplier identity ${m.supplierId}` };
  const list = store.get(m.supplierId) ?? [];
  list.push(m);
  store.set(m.supplierId, list);
  return { ok: true, store };
}
