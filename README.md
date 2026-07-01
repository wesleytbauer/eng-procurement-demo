# eng-procurement

A standalone doctrine layer for **engineering–procurement synergy**: turning a
product line's invariants and variables into an algorithmically-defined standard,
a curated vendor catalog, a source-of-record-agnostic supplier abstraction, and a
governed procure-to-pay lifecycle.

It is its own git repository, nested inside `personal-claude-os-v2` for now and
**destined to split out**. It depends on nothing in the parent repo.

Start with [`CONSTITUTION.md`](./CONSTITUTION.md) (framework + the flow + the
4-domain map), then [`STATE.md`](./STATE.md) (where things stand), then the
domain constitutions under [`constitutions/`](./constitutions/).

The doctrine rule, never violated: **one thin constitution per essential
complexity; Spec → Solution Eval → Boundary Eval; eliminate > outsource/reuse >
build.** Constitutions hold invariants only — never mechanism.

## Live demo — the framework applied end to end

A fully synthetic, fully deterministic worked example: a 7-part sealed DC
gearmotor (`cyberdyne-gm`), 120 units across a quarter, 12 suppliers.

```
npm install && npm run demo
```

regenerates every artifact in [`demo/out/`](./demo/out/) and the walkthrough in
[`presentation/STORY.md`](./presentation/STORY.md) — the tables there are the
program's output, not slides. The headline moment: engineering tightens two
requirements (ingress floor IP54→IP65, drop 12V) and the system names, exactly,
what breaks —

| | |
|---|---|
| Catalog entries newly non-conformant | **6** |
| New sourcing gaps | **1** (controller) |
| In-flight POs at risk | **2** |

…and re-awards the affected slots automatically. See
[`demo/out/reconcile.md`](./demo/out/reconcile.md),
[`demo/out/scorecards.md`](./demo/out/scorecards.md), and the ready-to-post
write-ups in [`presentation/`](./presentation/).

There's also a **~77-second animated walkthrough**
([`presentation/demo-walkthrough.mp4`](./presentation/demo-walkthrough.mp4), regenerated
by `npm run video`) — every figure on screen is real output from the demo. See
[`presentation/VIDEO.md`](./presentation/VIDEO.md).

The supplier-award scorer lives in `demo/lib/` on purpose — it is *mechanism*, so
it is demonstrated as a **candidate** invariant (see
`constitutions/procurement-operations.md`), not carved into the doctrine.

## Offline gates

Each domain's Solution Eval is a runnable, offline, deterministic selftest. All
green is the bar. From this directory:

```
npm install      # dev-only: tsx, typescript, @types/node
npm run verify   # runs all four domain gates + reports
npm run typecheck
```

| Gate | Command | Expect |
|---|---|---|
| Product Standard | `npm run standard:selftest` | `selftest PASS` |
| Vendor Catalog | `npm run catalog:selftest` | `selftest PASS` |
| Supplier Truth | `npm run supplier:selftest` | `selftest PASS` |
| Procurement Operations | `npm run operations:selftest` | `selftest PASS` |
| Synthetic demo (end-to-end) | `npm run demo:selftest` | `selftest PASS` |
| All + typecheck | `npm run verify` | `ALL GATES PASS — 5/5` |

## Layout

`constitutions/` doctrine · `docs/` template · `lib/` the four domains +
provenance/check primitives · `scripts/` one Solution-Eval gate per domain plus
`verify-all` · `demo/` the synthetic GM-Series world + the end-to-end run
(`demo/data` fixtures, `demo/lib` award/timeline/report, `demo/out` artifacts) ·
`presentation/` the generated STORY + ready-to-post LinkedIn/X copy.
