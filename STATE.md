# STATE — Engineering–Procurement

Phase tracker for this standalone doctrine layer.

## Where things stand

- **Doctrine:** complete. Root framework + 6 domain constitutions, all thin
  (Spec → Solution Eval → Boundary Eval), zero mechanism. `SRC` (Standard
  Sourcing) is the head of the flow above `STD`; `PID` (Part Identity) is the
  newest, carved at the engineering-selection seam (root §5 watch flag).
- **Build:** all six domains have a runnable, offline Solution-Eval gate.
  `npm run verify` → **ALL GATES PASS — 6/6 green**. `tsc --noEmit` clean.
  `SRC`, `PID`, and the advisory `OPS` are now implemented (`lib/sourcing.ts`,
  `lib/part-identity.ts`, `lib/operations.ts`) alongside `STD`/`CAT`/`SUP`. One
  honest caveat: `SRC`'s gate verifies the *deterministic* half of its trust model
  (provenance, faithfulness, typing, obligation, ratification, scope→set); the LLM
  **codifier** that produces proposals is still **envisioned, not built** — a
  Boundary-Eval build. The end-to-end *showcase demo* remains **retired** (see
  `retired/`), to be rebuilt from a proof that the domains work. `SRC` carries eight invariants: `SRC-R-01..05` (scope→set,
  provenance, ratification, two-way faithfulness, first-class relationships) plus
  `SRC-R-06` (obligation level — shall/should/may/informative, making `STD`'s
  verdict three-valued), `SRC-R-07` (versioned immutable scope + replayable
  impact record), and `SRC-R-08` (semantic fidelity independently verified —
  flagged, never self-attested; the independent prose↔code checker is **envisioned**,
  like the LLM codifier, and calibrated against owner-validated pairs before its
  flags gate). A concrete, hand-worked illustration of the `SRC` step on a real
  public-domain standard lives in `docs/mil-std-810-codification.md`, and the
  end-to-end flow is drawn + narrated in `docs/workflow.md`. Demand is keyed on a
  **Part Constraint ID (PCID)**, owned by its own thin domain **`PID` (Part
  Identity)** — **built**, four invariants (`PID-R-01..04`): minted at the
  engineer's approval, unique/immutable, binds part ↔ constraint **fingerprint** ↔
  scope version, and equality decided by fingerprint (never similarity — no vector
  search). Gate `scripts/selection.selftest.ts`; design note `docs/pcid-minting.md`.
  `OPS-R-01` consumes/resolves a PCID, so demand can arrive in any form
  (BOM/ERP/CSV/API) — the form is a Boundary-Eval reuse call.
- **Showcase demo:** **retired, pending a deliberate rebuild.** The original
  synthetic GM-Series demo + presentation (and the executing-`OPS` code it leaned
  on) were built for an earlier doctrine — before `SRC`, and while `OPS` still
  *executed* procure-to-pay (staging/firing POs, gating payments). `OPS` is now an
  *advisory* layer (recommends over a read-only mirror; never acts —
  `OPS-R-02/-R-03/-R-04`). Rather than keep a demo that contradicts the doctrine,
  it was moved to `retired/` (see `retired/README.md`) to be rebuilt from scratch
  against the current framework. The end-to-end flow meanwhile is drawn + narrated
  in `docs/workflow.md`.
- **Standalone:** own nested git repo, own `package.json`/`tsconfig`, deps are
  dev-only (`tsx`, `typescript`, `@types/node`) — no runtime dependency on the
  parent `personal-claude-os-v2`. Parent `.gitignore` excludes this directory so
  the two histories stay separate until the split.
- **Substrate:** still unchosen — deliberately. Every "Build" piece runs on plain
  in-memory data; nothing is persisted yet. `SUP-R-01` keeps build-vs-integrate a
  later Boundary Eval call.

## The map

| Domain | Prefix | Status | Gate |
|---|---|---|---|
| Standard Sourcing | `SRC` | gate **built**; LLM codifier envisioned | `npm run sourcing:selftest` |
| Product Standard | `STD` | built | `npm run standard:selftest` |
| Vendor Catalog | `CAT` | built — **flagged** as possible seam, not yet proven a domain | `npm run catalog:selftest` |
| Part Identity | `PID` | **built** — newly carved (root §5) | `npm run selection:selftest` |
| Supplier Truth | `SUP` | built | `npm run supplier:selftest` |
| Procurement Operations | `OPS` | **built** (advisory: recommend-only, mirror, no write-back) | `npm run operations:selftest` |

All six domain gates, plus typecheck, run from `npm run verify` (6/6).

## Open decisions (by evidence, not now)

1. **Vendor Catalog: domain or seam?** Keeps its constitution; demotes to a
   referenced invariant line if it stays thin (root §5).
2. **Foundation kernel?** Integrity / provenance are carried as referenced lines
   inside domains. Graduates to a shared kernel only when those lines stop being
   thin (root §4). (Reversibility is no longer a candidate here: `OPS` is advisory
   and takes no irreversible act — `OPS-R-03` — so there is nothing to gate; that
   concern lives with the external system of record. *Lineage/versioning* is now
   the strongest kernel candidate — `SRC-R-07`/`STD-R-04`/`CAT-R-05`.)
3. **Substrate.** Unchosen. Supplier Truth's `SUP-R-01` is deliberately written
   so build-vs-integrate the system of record is a later Boundary Eval call.

## Next step

The doctrine and a working reference implementation both exist. Open choices,
each a deliberate Boundary Eval still owed:

1. **Substrate.** Pick persistence. `SUP-R-01` is written so this is a swap, not
   a rewrite.
2. **Vendor Catalog: domain or seam?** Watch whether `catalog.ts` stays thin; if
   it does, demote to a referenced invariant line (root §5).
3. **Foundation kernel?** Lineage/versioning (`SRC-R-07`, `STD-R-04`, `CAT-R-05`)
   is the seed; promote to a shared kernel only when a second domain needs the
   same primitive. (The former reversibility seed is retired — `OPS` is advisory.)
4. **Split out** into its own repository when ready (it already has no parent
   dependency).
