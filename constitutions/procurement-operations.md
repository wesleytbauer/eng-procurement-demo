# Procurement Operations Constitution

**Essential complexity owned:** running the procure-to-pay lifecycle — demand →
quotes/lead-time/risk → selection → PO → lead-time dissemination → receipt →
invoice approval → nonconformance/shortage → supplier performance — with correct
lifecycle state and reversibility gating the irreversible acts.

**Prefix:** `OPS`

> This is the tail of the flow. It consumes the catalog as its demand space and
> Supplier Truth as its identity space, and it is where the system finally
> touches the outside world (POs, payments) — so reversibility lives here.

---

## Spec — invariants

- `OPS-R-01` — **Demand sources from the catalog.** A procurement action targets
  a cataloged, standard-conformant item. An off-catalog buy is a surfaced
  exception, never a silent one (`CAT-R-01` upstream).
- `OPS-R-02` — **Lifecycle state is single-truth and ordered.** Each line has one
  authoritative state advancing through defined transitions
  (demand → quoted → ordered → received → invoiced → closed); states are not
  skipped or silently rewritten.
- `OPS-R-03` — **Irreversible external acts are staged and gated.** Issuing a PO
  and approving/paying an invoice are staged as proposals and executed only after
  authorization. The stager never executes; the executor runs only post-approval.
  (This is the cross-cutting reversibility line for this layer — root §4.)
- `OPS-R-04` — **Three-way match before payment.** Invoice approval requires
  reconciliation of PO ↔ receipt ↔ invoice. An unmatched or out-of-tolerance
  invoice is flagged, never paid.
- `OPS-R-05` — **Commitments are disseminated.** Confirmed lead times and dates
  are propagated to the stakeholders who depend on them; a known slip that isn't
  disseminated is a defect.
- `OPS-R-06` — **Nonconformances and shortages are first-class.** Received goods
  are checked; a nonconformance or shortage opens a tracked exception that blocks
  the affected line's close until resolved.
- `OPS-R-07` — **Performance is recorded against identity.** Lead-time adherence,
  nonconformance rate, fill rate, etc. are captured and attached to a Supplier
  Truth identity (`SUP-R-04`), and feed back into selection.

## Candidate invariant — not yet ratified

The flow names **selection** ("quotes → selection → PO"), but no `OPS-R`
invariant governs *how* a supplier is awarded — and deliberately so: a weighted
multi-criteria scorer is *mechanism* (weights, normalization, tie-breaks), which
a constitution must not hold. There is, however, a latent invariant worth stating
in prose and *demonstrating* before carving it into the Spec:

> **Award is explainable and gated.** Every PO award traces to a recorded,
> reproducible scorecard, and selection never overrides the standard's conformance
> gate — a non-conformant quote can never win.

This is **demonstrated, not ratified.** The reference scorer lives in the demo
layer (`demo/lib/award.ts`) and the claim is asserted empirically by
`demo/demo.selftest.ts` (every award is the rank-1 *eligible, conformant* quote).
It graduates to a ratified `OPS-R-08` + `lib/operations.ts` only if a second
consumer needs the scorer — letting the invariant earn its place (root §4/§5).

## Solution Eval — how we verify the invariants hold

- **What we measure**
  - An invoice cannot reach `paid` without a passing three-way match (OPS-R-04)
    — assertion.
  - A PO or payment cannot transition to `executed` while its proposal is pending
    (OPS-R-03) — assertion.
  - State transitions follow the allowed graph; an illegal jump is rejected
    (OPS-R-02) — assertion.
  - A recorded performance metric resolves to exactly one supplier identity
    (OPS-R-07) — assertion.
- **The bar** — every item above is a safety/correctness assertion that must pass
  100% of the time. Dissemination (OPS-R-05) and nonconformance handling
  (OPS-R-06) are measured against a labeled scenario set (no missed slip, no
  silently-closed exception), bar set before building.
- **How it's checked** — lifecycle + gate assertions and a three-way-match test;
  a scenario eval for dissemination and exception handling.
- **Gate** — `scripts/operations.selftest.ts` (`npm run operations:selftest`).

## Boundary Eval — accidental complexity a solution induces

| Accidental complexity | Decision | Why |
|---|---|---|
| Quote / PO / invoice transport (EDI, email, supplier portals) | **Outsource** | Commodity integration; never differentiating. |
| Lifecycle state machine + three-way match | **Build** | Core domain logic; correctness of the buy is the value. |
| Staging / gate primitive for PO & payment | **Build** (minimal, one primitive) | Core to `OPS-R-03`; reused across every irreversible act rather than re-built per act. |
| Stakeholder notification / delivery | **Outsource / reuse** | Generic delivery channel. |

## Seams

- **→ Vendor Catalog** — demand sources from the catalog (`OPS-R-01` ↔
  `CAT-R-01`).
- **→ Supplier Truth** — performance and observed risk attach by identity
  (`OPS-R-07` ↔ `SUP-R-04`); Operations never mints supplier identity.
- **Cross-cutting** — `OPS-R-03` is the reversibility line that would seed a
  shared Foundation kernel if the gate proves it needs to be shared (root §4).
