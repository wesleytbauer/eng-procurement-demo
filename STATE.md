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
  Boundary-Eval build. A concrete, hand-worked illustration of the `SRC` step on a
  real public-domain standard lives in `docs/mil-std-810-codification.md`.
- **Showcase demo:** `demo/` applies the whole framework to a synthetic 7-slot DC
  gearmotor (`cyberdyne-gm`), 120 units / quarter, 12 suppliers. `npm run demo`
  emits byte-stable artifacts to `demo/out/` + a generated `presentation/STORY.md`;
  `npm run demo:selftest` asserts the narrative (coverage green, identity resolves,
  awards are conformant rank-1, the closed loop flips an award, no unmatched
  payment, and the v1→v2 change is exactly 6 invalid / 1 gap / 2 POs at risk).
  The award scorer is demo-layer mechanism (candidate, unratified `OPS` invariant).
  Ready-to-post LinkedIn + X copy in `presentation/`.
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
2. **Foundation kernel?** Integrity / provenance / reversibility are carried as
   referenced lines inside domains (notably `OPS-R-03`). Graduates to a shared
   kernel only when those lines stop being thin (root §4).
3. **Substrate.** Unchosen. Supplier Truth's `SUP-R-01` is deliberately written
   so build-vs-integrate the system of record is a later Boundary Eval call.

## Next step

The doctrine and a working reference implementation both exist. Open choices,
each a deliberate Boundary Eval still owed:

1. **Substrate.** Pick persistence. `SUP-R-01` is written so this is a swap, not
   a rewrite.
2. **Vendor Catalog: domain or seam?** Watch whether `catalog.ts` stays thin; if
   it does, demote to a referenced invariant line (root §5).
3. **Foundation kernel?** `OPS-R-03`'s stager≠executor gate is the seed; promote
   to a shared kernel only when a second domain needs the same primitive.
4. **Split out** into its own repository when ready (it already has no parent
   dependency).
