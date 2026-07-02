# Product Standard Constitution

**Essential complexity owned:** deriving and maintaining a coherent,
machine-checkable standard for a product line from its invariants and variables,
such that any change to an invariant or a variable propagates deterministically
to the standard.

**Prefix:** `STD`

> This is the head of the flow. The standard is not authored — it is *derived*
> from a separation of what never changes (invariants) from what surrounds them
> (variables). That derivation is the value; everything downstream (catalog,
> procurement) inherits from it.

---

## Spec — invariants

- `STD-R-01` — **The standard is derived, never hand-authored.** It is a function
  of its inputs: `(invariants, variables) → standard`. A standard that exists
  independent of a stated invariant/variable set is rejected.
- `STD-R-02` — **Every element is exactly one cleanly-typed kind.** Each element
  of the model is exactly one of **invariant**, **variable**, or **relationship**
  (a conditional guard between attributes). No element is ambiguously typed: one
  that is sometimes fixed and sometimes free is mis-modeled and rejected until
  split; a guard smuggled into an invariant is likewise rejected. Relationships
  are produced upstream by `SRC` (`SRC-R-05`) and are evaluated as part of the
  standard's deterministic conformance decision (`STD-R-03`).
- `STD-R-03` — **The standard is algorithmically defined.** Given a candidate
  component, the standard decides deterministically — not by opinion. The verdict
  is **three-valued**, following the obligation level `SRC-R-06` assigns each
  element: *conformant* (all mandatory elements met, no unmet recommendation),
  *conformant-with-recorded-deviation* (a **recommended** element is unmet but a
  ratified waiver is on record), or *non-conformant* (a **mandatory** element is
  unmet — no waiver possible). Informative elements never affect the verdict.
  (This is what lets the catalog be gated, `CAT-R-03`.)
- `STD-R-04` — **Change propagation is total.** Editing an invariant or a
  variable regenerates the standard; no stale standard survives a change to its
  inputs. The lineage from inputs → standard is recorded (provenance).
- `STD-R-05` — **One standard per product line, scoped explicitly.** A product
  line owns exactly one standard; its scope (what's in the line) is stated, so
  conformance questions have a definite answer.

## Solution Eval — how we verify the invariants hold

- **What we measure**
  - On a labeled set of conformant / non-conformant components, the standard
    classifies every one correctly (STD-R-03) — assertion.
  - Flipping one invariant flips the expected classifications, and the
    regenerated standard matches the new expectation (STD-R-01/-R-04), N≥2.
  - Every model element is tagged exactly one of invariant / variable /
    relationship, never more than one (STD-R-02) — assertion.
- **The bar** — classification is exact on the gold set; a single stale artifact
  after an input change is a failure. These are correctness invariants, not
  statistical targets.
- **How it's checked** — a conformance assertion over the gold component set + a
  propagation test that mutates an input and diffs the regenerated standard.
- **Gate** — `scripts/standard.selftest.ts` (`npm run standard:selftest`).

## Boundary Eval — accidental complexity a solution induces

| Accidental complexity | Decision | Why |
|---|---|---|
| Component taxonomy / engineering attribute data | **Outsource / reuse** | Industry standards, existing BOM/PLM data; never differentiating. |
| Invariant/variable separation + standard derivation | **Build** | This *is* the domain. No proven drop-in produces *this* line's standard. |
| Standard storage / versioning | **Reuse** | Generic versioned store; the derivation is the value, not the bytes. |

## Seams

- **→ Vendor Catalog** — the standard defines the component space the catalog
  must cover and is the conformance gate for entries (`STD-R-03` ↔ `CAT-R-03`).
- A change here is *expected* to ripple to Catalog (and onward) per root §2; the
  ripple is governed by `STD-R-04`, not suppressed.
