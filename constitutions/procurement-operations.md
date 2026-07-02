# Procurement Operations Constitution

**Essential complexity owned:** turning a *read-only mirror* of the procure-to-pay
lifecycle — demand, quotes, POs, receipts, invoices, performance, ingested from
the system of record — into trustworthy, timely, explainable **action
recommendations** for procurement, without ever being the source of truth or
performing the act.

**Prefix:** `OPS`

> This is the tail of the flow. It consumes the catalog as its demand space and
> Supplier Truth as its identity space. **It is an advisory layer, not an
> executor.** The company already has a system of record that issues POs, receives
> invoices, and pays; this tool ingests that system's reports read-only,
> internalizes what has happened, and **recommends** what procurement should do
> next (whom to expedite, which invoice to hold, which supplier is late, what a
> scope change put at risk). It **recommends, never acts; mirrors, never masters.**
> Because it takes no irreversible external act, there is nothing here to stage or
> gate — reversibility is upheld by *abstention*, not machinery.

---

## Spec — invariants

- `OPS-R-01` — **Demand references a resolvable part identity; its form is
  accidental.** A procurement action targets a cataloged, standard-conformant item
  identified by a **Part Constraint ID (PCID)** — a stable identifier, minted when
  engineering *selects* a conforming part, that binds the part to its **sourcing
  spec**: the standard's codified constraints for it (invariants / variables /
  relationships + obligation levels, `SRC-R-06`) at the scope version they were
  derived from (`SRC-R-07`). Demand may arrive in **any form** (BOM, ERP export,
  CSV, API); the form is a Boundary-Eval/reuse decision, never a Spec line.
  Whatever the form, a referenced PCID resolves — automatically, without
  re-keying — to the constraints the part must be sourced against. A referenced
  PCID is itself a signal: **the part was selected through this tool, so its
  constraints are known and honored.** A demand line with no resolvable PCID, or
  an off-catalog buy, is a surfaced exception, never a silent one (`CAT-R-01`
  upstream).
- `OPS-R-02` — **Lifecycle state is mirrored, never mastered.** Each line's state
  (demand → quoted → ordered → received → invoiced → closed) is *reflected* from
  the system of record's reports; the tool never mints, advances, or rewrites it.
  When a fresh report disagrees with the mirror, the tool re-syncs to the system
  of record — it never overrides it. The single source of truth is the ERP, not
  this tool.
- `OPS-R-03` — **The tool recommends; it never acts, and never writes back.** No
  irreversible external act — issuing a PO, releasing a payment, emailing a
  supplier — is performed by this tool. Such acts belong to the system of record
  and to humans. The tool only *proposes* them as recommended actions with the
  reasoning attached; a human takes the action and the system of record records
  it. Because the tool performs no irreversible act, there is nothing for it to
  stage or gate — reversibility is discharged by abstention (contrast: the old
  stager/executor gate is gone, and with it the reversibility burden — root §4).
- `OPS-R-04` — **Three-way match is checked and recommended, not enforced.** The
  tool reconciles PO ↔ receipt ↔ invoice from ingested reports and **recommends**
  approve or hold; an unmatched or out-of-tolerance invoice is surfaced as a
  recommended hold with the discrepancy shown. The tool does not approve, release,
  or block payment — that gate lives in the system of record.
- `OPS-R-05` — **Actionable commitments are surfaced for outreach.** From the
  mirror, the tool identifies who needs notice — a slip to disseminate, a supplier
  to ask for an updated delivery date, a late supplier to chase — and **recommends
  the outreach**; a human or another system sends it. A known slip the tool fails
  to surface is a defect; the tool sending it itself would be a violation of
  `OPS-R-03`.
- `OPS-R-06` — **Nonconformances and shortages are first-class (as tracked
  recommendations).** From received-goods reports the tool detects nonconformances
  and shortages and opens a *tracked advisory exception*, recommending it block
  the affected line's close until resolved. The tool tracks and recommends; the
  resolution act happens in the system of record.
- `OPS-R-07` — **Performance is computed against identity.** Lead-time adherence,
  nonconformance rate, fill rate, etc. are *derived from the ingested mirror* and
  attached to a Supplier Truth identity (`SUP-R-04`), feeding future
  recommendations. The tool computes performance; it never authors the underlying
  transactional facts.

## Candidate invariant — not yet ratified

The flow names **selection** ("quotes → selection → award"), but no `OPS-R`
invariant governs *how* a supplier is ranked — and deliberately so: a weighted
multi-criteria scorer is *mechanism* (weights, normalization, tie-breaks), which
a constitution must not hold. There is, however, a latent invariant worth stating
in prose and *demonstrating* before carving it into the Spec:

> **Recommendation is explainable and conformance-bounded.** Every *recommended*
> award traces to a recorded, reproducible scorecard, and a recommendation never
> overrides the standard's conformance gate — a non-conformant quote can never be
> recommended. The tool recommends the rank-1 eligible, conformant option; a
> **human awards** (in the system of record).

This is **demonstrated, not ratified.** A reference recommender lives in
`lib/operations.ts` (`recommendAward`) and the claim is asserted by
`scripts/operations.selftest.ts` (a non-conformant quote is never recommended; the
rank-1 eligible conformant quote is; every award is a *proposal*, never executed).
It graduates to a ratified `OPS-R-08` only if a second consumer needs the scorer —
letting the invariant earn its place (root §4/§5).

## Solution Eval — how we verify the invariants hold

- **What we measure**
  - No code path performs an irreversible external act or writes back to the
    system of record; every output is a recommendation (OPS-R-03) — assertion.
  - The mirrored state equals the ingested system-of-record report and is never
    advanced by the tool itself (OPS-R-02) — assertion.
  - A mismatched or out-of-tolerance invoice yields a *recommended hold*, never an
    approval (OPS-R-04) — assertion.
  - A recommended award is the rank-1 eligible, conformant quote and traces to a
    reproducible scorecard; a non-conformant quote is never recommended (candidate
    invariant) — assertion.
  - A computed performance metric resolves to exactly one supplier identity
    (OPS-R-07) — assertion.
- **The bar** — every item above is a safety/correctness assertion that must pass
  100% of the time. Dissemination (OPS-R-05) and nonconformance handling
  (OPS-R-06) are measured against a labeled scenario set (no missed slip, no
  silently-untracked exception), bar set before building.
- **How it's checked** — mirror-fidelity and recommend-only assertions, a
  three-way-match recommendation test, and a scenario eval for outreach and
  exception handling.
- **Gate** — `scripts/operations.selftest.ts` (`npm run operations:selftest`) —
  **rebuilt to the advisory spec and green.** Implemented in `lib/operations.ts`
  (mirror ingest, three-way-match *recommendation*, outreach, exceptions,
  performance, conformance-bounded award). It asserts recommend-only, mirror
  fidelity, and no write-back — and there is deliberately no PO/pay/execute path.

## Boundary Eval — accidental complexity a solution induces

| Accidental complexity | Decision | Why |
|---|---|---|
| Demand intake form / transport (BOM, ERP export, CSV, API) | **Outsource / reuse** | Commodity ingestion; the invariant is a *resolvable PCID* (`OPS-R-01`), not the carrier. Which form is a reuse call, never a Spec line. |
| System-of-record ingestion (PO / receipt / invoice reports) | **Outsource / reuse** | Read-only feed from the ERP; the ERP is the master, the tool mirrors it (`OPS-R-02`). |
| Irreversible-act execution (issue PO, release payment, send email) | **Eliminate** | The tool performs no external act — execution belongs to the system of record and to humans (`OPS-R-03`). Eliminating the act eliminates all the staging/gating machinery it would need. |
| Reconciliation + recommendation engine (match, rank, exception tracking) | **Build** | Core domain value; turning the mirror into correct, explainable recommendations is the work. |
| Notification / delivery channel | **Outsource / reuse** | When a human elects to act on a recommended outreach, delivery is a generic channel. |

## Seams

- **→ Vendor Catalog** — demand sources from the catalog (`OPS-R-01` ↔
  `CAT-R-01`); a demand line's **PCID** resolves through the catalog entry to the
  standard component it satisfies and thence to its constraints (`OPS-R-01` ↔
  `CAT-R-02`/`CAT-R-03`).
- **→ Part Identity** — the **PCID** a demand line references is minted by `PID` at
  the engineer's approval (`PID-R-01`) and resolves deterministically to the part's
  constraints and scope version (`PID-R-03`); `OPS` consumes and resolves it, never
  mints it. It rides the ripple — a scope change re-resolves the constraints a PCID
  points at and flags any in-flight PO whose part is now non-conformant.
- **→ Supplier Truth** — performance and observed risk attach by identity
  (`OPS-R-07` ↔ `SUP-R-04`); Operations never mints supplier identity.
- **→ System of record (external)** — the tool ingests the ERP's procure-to-pay
  reports read-only and never writes back (`OPS-R-02`/`OPS-R-03`); this is the same
  read-only, source-of-record-agnostic posture `SUP` takes (`SUP-R-01`/`SUP-R-05`),
  extended from supplier master data to the whole operational lifecycle.
- **Cross-cutting** — with `OPS-R-03` reframed to *abstention*, this layer no
  longer performs irreversible acts, so it no longer seeds a reversibility kernel.
  Integrity and provenance still recur; reversibility now lives entirely with the
  system of record (root §4 updated accordingly).
