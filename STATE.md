# STATE — Engineering–Procurement

Phase tracker for this standalone doctrine layer.

## Where things stand

- **Doctrine:** complete. Root framework + 5 domain constitutions, all thin
  (Spec → Solution Eval → Boundary Eval), zero mechanism. `SRC` (Standard
  Sourcing) is the newest, the new head of the flow above `STD`.
- **Build:** the four downstream domains (`STD`, `CAT`, `SUP`, `OPS`) are
  implemented behind their invariants, each with its Solution Eval as a runnable
  offline gate. `npm run verify` → **ALL GATES PASS — 5/5 green** (4 domains +
  the end-to-end demo). `tsc --noEmit` clean. `SRC` is **doctrine-only for now**:
  its Solution Eval bar is written (`scripts/sourcing.selftest.ts`), but the LLM
  codifier that would satisfy it is **envisioned, not built** — a later
  Boundary-Eval build. `SRC` carries seven invariants: `SRC-R-01..05` (scope→set,
  provenance, ratification, two-way faithfulness, first-class relationships) plus
  `SRC-R-06` (obligation level — shall/should/may/informative, making `STD`'s
  verdict three-valued) and `SRC-R-07` (versioned immutable scope + replayable
  impact record). A concrete, hand-worked illustration of the `SRC` step on a real
  public-domain standard lives in `docs/mil-std-810-codification.md`, and the
  end-to-end flow is drawn + narrated in `docs/workflow.md`. `OPS-R-01` now keys
  demand on a **Part Constraint ID (PCID)** — a resolvable part identity minted at
  selection that binds a part to its constraints (scope-version provenance) — so
  demand can arrive in any form (BOM/ERP/CSV/API); the form is a Boundary-Eval
  reuse call, carried as a referenced line, not yet its own domain (root §5).
- **Showcase demo:** `demo/` applies the whole framework to a synthetic 7-slot DC
  gearmotor (`cyberdyne-gm`), 120 units / quarter, 12 suppliers. `npm run demo`
  emits byte-stable artifacts to `demo/out/` + a generated `presentation/STORY.md`;
  `npm run demo:selftest` asserts the narrative (coverage green, identity resolves,
  awards are conformant rank-1, the closed loop flips an award, no unmatched
  payment, and the v1→v2 change is exactly 6 invalid / 1 gap / 2 POs at risk).
  The award scorer is demo-layer mechanism (candidate, unratified `OPS` invariant).
  Ready-to-post LinkedIn + X copy in `presentation/`.
  **Note (doctrine ahead of demo):** `OPS` doctrine was reframed to an *advisory*
  layer — it recommends over a read-only mirror of the system of record and never
  performs POs/payments (`OPS-R-02/-R-03`). The showcase demo still *simulates* the
  full ecosystem including the system-of-record's acts (it carries an advisory
  disclaimer in `STORY.md`); re-skinning the demo's lifecycle so those transitions
  read explicitly as *observed-from-the-SoR* is a follow-up, not yet done.
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
| Standard Sourcing | `SRC` | doctrine only — gate defined, codifier envisioned | `npm run sourcing:selftest` *(envisioned)* |
| Product Standard | `STD` | built | `npm run standard:selftest` |
| Vendor Catalog | `CAT` | built — **flagged** as possible seam, not yet proven a domain | `npm run catalog:selftest` |
| Supplier Truth | `SUP` | built | `npm run supplier:selftest` |
| Procurement Operations | `OPS` | built | `npm run operations:selftest` |

All four, plus typecheck, run from `npm run verify`.

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
