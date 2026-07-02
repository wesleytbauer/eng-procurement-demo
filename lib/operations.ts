// Procurement Operations (OPS) — an ADVISORY layer over a read-only mirror of the
// system of record. It recommends, never acts; mirrors, never masters; and is
// never the source of truth.
//
// There is deliberately NO issuePO / pay / send / advance here: the tool performs
// no irreversible external act (OPS-R-03). Every output is a `Recommendation` with
// status "proposed" — a human acts and the system of record records it.
//
// Implements: OPS-R-01 (demand references a resolvable PCID; form is accidental),
// OPS-R-02 (state mirrored, never mastered), OPS-R-03 (recommend-only, no
// write-back), OPS-R-04 (three-way match checked + recommended, not enforced),
// OPS-R-05 (surface outreach), OPS-R-06 (nonconformance/shortage tracked), OPS-R-07
// (performance computed against a resolved supplier identity). Plus the candidate
// "recommendation is explainable and conformance-bounded".

import { type SupplierRegistry, type SupplierId, type SupplierRef } from "./supplier.js";
import { type ConstraintSet } from "./sourcing.js";
import { type ResolvedPcid, type Pcid } from "./part-identity.js";

export type LineState = "demand" | "quoted" | "ordered" | "received" | "invoiced" | "closed";

/** One line ingested from the system of record's report. Read-only truth the tool
 *  reflects — it never authors these facts. */
export interface SorLine {
  pcid: Pcid;
  state: LineState;
  supplierRef: SupplierRef;
  po?: { qty: number; unitPrice: number };
  receipt?: { qty: number; nonconforming?: boolean };
  invoice?: { amount: number };
  promisedDate?: number; // day index the supplier committed to
  actualDate?: number; // day index goods actually arrived
}

/** The mirror: a frozen reflection of the SoR report. There is no mutator. */
export type Mirror = ReadonlyArray<Readonly<SorLine>>;

/** OPS-R-02: reflect the SoR report as-is. Deep-frozen so nothing advances it. */
export function ingest(report: SorLine[]): Mirror {
  return Object.freeze(report.map((l) => Object.freeze({ ...l })));
}

/** OPS-R-02: on a fresh report, re-sync to the SoR. The tool always defers to the
 *  system of record; it never overrides it. (Same operation as ingest — that is
 *  the point: there is no independent state to preserve.) */
export function resync(report: SorLine[]): Mirror {
  return ingest(report);
}

/** Every OPS output. status is the literal "proposed": the tool recommends, the
 *  human/SoR executes (OPS-R-03). */
export interface Recommendation {
  kind: "award" | "invoice" | "outreach" | "exception" | "demand-exception";
  action: string;
  reason: string;
  pcid?: Pcid;
  readonly status: "proposed";
}

function propose(kind: Recommendation["kind"], action: string, reason: string, pcid?: Pcid): Recommendation {
  return { kind, action, reason, status: "proposed", ...(pcid ? { pcid } : {}) };
}

export interface DemandResolution {
  ok: boolean;
  pcid: Pcid;
  constraints?: ConstraintSet;
  recommendation?: Recommendation; // set when the PCID doesn't resolve (surfaced)
}

/** OPS-R-01: a demand line references a PCID that resolves (via PID) to the part's
 *  constraints. An unresolvable PCID is a surfaced exception, never silent. */
export function resolveDemand(pcid: Pcid, resolve: (p: Pcid) => ResolvedPcid | undefined): DemandResolution {
  const r = resolve(pcid);
  if (!r) return { ok: false, pcid, recommendation: propose("demand-exception", "surface", `no resolvable PCID: ${pcid}`, pcid) };
  return { ok: true, pcid, constraints: r.constraints };
}

/** OPS-R-04: reconcile PO ↔ receipt ↔ invoice from the mirror and RECOMMEND
 *  approve or hold. The tool never approves, releases, or blocks payment — that
 *  gate lives in the SoR. */
export function reconcileInvoice(line: SorLine): Recommendation {
  const { po, receipt, invoice } = line;
  if (!po || !receipt || !invoice) {
    return propose("invoice", "hold", "incomplete three-way set (missing PO/receipt/invoice)", line.pcid);
  }
  const qtyOk = receipt.qty === po.qty;
  const amtOk = invoice.amount === po.qty * po.unitPrice;
  if (qtyOk && amtOk) return propose("invoice", "approve", "PO↔receipt↔invoice reconcile", line.pcid);
  const disc = [
    qtyOk ? null : `qty ${receipt.qty}≠${po.qty}`,
    amtOk ? null : `amount ${invoice.amount}≠${po.qty * po.unitPrice}`,
  ]
    .filter(Boolean)
    .join("; ");
  return propose("invoice", "hold", `mismatch: ${disc}`, line.pcid);
}

/** OPS-R-05: surface who needs outreach — a slip to disseminate or a missing
 *  delivery date to request. The tool identifies; a human sends. */
export function recommendOutreach(mirror: Mirror): Recommendation[] {
  const out: Recommendation[] = [];
  for (const l of mirror) {
    if (l.promisedDate !== undefined && l.actualDate !== undefined && l.actualDate > l.promisedDate) {
      out.push(propose("outreach", "chase", `late by ${l.actualDate - l.promisedDate}d`, l.pcid));
    } else if (l.promisedDate === undefined && l.state !== "closed" && l.state !== "demand") {
      out.push(propose("outreach", "request-date", "no confirmed delivery date", l.pcid));
    }
  }
  return out;
}

/** OPS-R-06: nonconformances and shortages from received-goods reports open a
 *  tracked advisory exception recommending the line's close be blocked. */
export function detectExceptions(mirror: Mirror): Recommendation[] {
  const out: Recommendation[] = [];
  for (const l of mirror) {
    if (l.receipt?.nonconforming) out.push(propose("exception", "block-close", "nonconformance on receipt", l.pcid));
    if (l.po && l.receipt && l.receipt.qty < l.po.qty) {
      out.push(propose("exception", "block-close", `shortage ${l.receipt.qty}/${l.po.qty}`, l.pcid));
    }
  }
  return out;
}

export interface Perf {
  supplierId: SupplierId;
  onTime: number;
  deliveries: number;
  nonconforming: number;
}

/** OPS-R-07: performance is COMPUTED from the mirror and attached to a resolved
 *  Supplier Truth identity — the tool never authors the underlying facts. */
export function computePerformance(mirror: Mirror, registry: SupplierRegistry): Map<SupplierId, Perf> {
  const m = new Map<SupplierId, Perf>();
  for (const l of mirror) {
    const id = registry.resolve(l.supplierRef);
    const p = m.get(id) ?? { supplierId: id, onTime: 0, deliveries: 0, nonconforming: 0 };
    if (l.promisedDate !== undefined && l.actualDate !== undefined) {
      p.deliveries += 1;
      if (l.actualDate <= l.promisedDate) p.onTime += 1;
    }
    if (l.receipt?.nonconforming) p.nonconforming += 1;
    m.set(id, p);
  }
  return m;
}

// ---- Candidate invariant: recommendation is explainable and conformance-bounded -

export interface Quote {
  supplierRef: SupplierRef;
  unitPrice: number;
  leadTimeDays: number;
  conformant: boolean; // decided upstream by the standard (STD-R-03) — never here
  eligible?: boolean; // e.g. not blocked; defaults true
}

export interface ScorecardRow {
  supplierId: SupplierId;
  score: number;
  conformant: boolean;
  eligible: boolean;
  included: boolean; // false ⇒ excluded from the recommendation, with the reason visible
}

export interface AwardRecommendation {
  winner?: SupplierId; // undefined when no eligible, conformant quote exists
  scorecard: ScorecardRow[];
  readonly status: "proposed";
}

/** Recommend (never award) the rank-1 eligible, conformant supplier, with a
 *  reproducible scorecard. A non-conformant quote can never be recommended. A human
 *  awards, in the system of record. */
export function recommendAward(quotes: Quote[], registry: SupplierRegistry): AwardRecommendation {
  const scorecard: ScorecardRow[] = quotes
    .map((q) => {
      const eligible = q.eligible ?? true;
      const included = q.conformant && eligible;
      // Transparent, reproducible score: cheaper + shorter lead ranks higher.
      const score = included ? 1000 - q.unitPrice - q.leadTimeDays : -1;
      return { supplierId: registry.resolve(q.supplierRef), score, conformant: q.conformant, eligible, included };
    })
    .sort((a, b) => b.score - a.score);
  const winner = scorecard.find((r) => r.included)?.supplierId;
  return { winner, scorecard, status: "proposed" };
}
