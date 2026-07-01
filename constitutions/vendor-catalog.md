# Vendor Catalog Constitution

**Essential complexity owned:** maintaining a curated catalog that covers exactly
the standard's component space by selecting sections of supplier catalogs, with
approved equivalents made explicit.

**Prefix:** `CAT`

> **Watch flag (root §5).** This is the domain most likely to be a *seam*
> between Product Standard and Supplier Truth rather than a true domain. It keeps
> its constitution for now and earns it; if it stays thin, it demotes to a
> referenced invariant line.

---

## Spec — invariants

- `CAT-R-01` — **Coverage is complete and bounded, both directions.** Every
  component the standard requires has at least one cataloged source; nothing in
  the catalog falls outside the standard. Uncovered components and out-of-standard
  entries are both defects.
- `CAT-R-02` — **Every entry traces both ways.** A catalog entry records the
  supplier-catalog source it was selected from *and* the standard component it
  satisfies (provenance). An entry that can't name both is rejected.
- `CAT-R-03` — **The standard is the gate.** An entry that does not satisfy the
  standard component it's mapped to is rejected. Conformance is decided by
  `STD-R-03`, not by the catalog's own opinion.
- `CAT-R-04` — **Alternates are explicit and equivalence-justified.** When one
  component has multiple sources, they are recorded as approved equivalents with
  the *basis* for equivalence; sources are never silently interchangeable.
- `CAT-R-05` — **The catalog tracks the standard.** When the standard changes
  (`STD-R-04`), coverage is re-evaluated: newly-required components surface as
  gaps, newly-invalid entries are flagged. No silent drift between the two.

## Solution Eval — how we verify the invariants hold

- **What we measure**
  - Coverage check: every standard component has ≥1 conformant entry, and every
    entry maps to a standard component (CAT-R-01) — assertion.
  - Every entry has both provenance links (CAT-R-02) — assertion.
  - After a simulated standard change, the produced gap/flag set equals the
    expected diff (CAT-R-05) — assertion, N≥2.
- **The bar** — coverage and provenance are 100% assertions; the change-tracking
  diff must be exact (no missed gap, no spurious flag).
- **How it's checked** — a coverage assertion over (standard, catalog) + a
  standard-change reconciliation test.
- **Gate** — `scripts/catalog.selftest.ts` (`npm run catalog:selftest`).

## Boundary Eval — accidental complexity a solution induces

| Accidental complexity | Decision | Why |
|---|---|---|
| Supplier catalog data acquisition (feeds, PDFs, punchout) | **Outsource** | Supplier-provided; commodity ingestion. |
| Curation + equivalence judgement | **Build** | Core domain value; deciding what *covers* a standard component is the work. |
| Mapping standard component ↔ entry | **Build** | Domain-specific; the join that makes coverage checkable. |
| Catalog storage | **Reuse** | Generic store. |

## Seams

- **→ Product Standard** — consumes the standard as the conformance gate
  (`CAT-R-03` ↔ `STD-R-03`) and re-evaluates on its change (`CAT-R-05` ↔
  `STD-R-04`).
- **→ Supplier Truth** — every entry's supplier resolves to a Supplier Truth
  identity (`CAT-R-02` ↔ `SUP-R-02`); the catalog never invents supplier identity.
- **→ Procurement Operations** — the catalog is the demand→source space
  (`OPS-R-01`).
