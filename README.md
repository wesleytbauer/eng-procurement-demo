# eng-procurement

> This repo demonstrates how I codify the semantic reasoning of engineering
> standards into deterministic, machine-checkable code, then build a parts catalog
> of approved vendors whose components conform to those standards.
>
> It cuts both ways: it helps procurement maintain supplier relationships that
> satisfy the constraints engineering imposes, and helps engineers design with
> components that are both standard-conformant and sourceable from trusted
> suppliers. Fed demand from the build plan, it recommends trusted suppliers to
> meet it — it recommends; a human awards.
>
> The system relies on LLMs where the work needs flexibility (reading a standard's
> intent and codifying it) and on deterministic code where it needs rigidity (the
> conformance gate every part and supplier must pass).

A standalone doctrine layer for **engineering–procurement synergy**: turning a
product line's invariants and variables into an algorithmically-defined standard,
a curated vendor catalog, a source-of-record-agnostic supplier abstraction, and an
**advisory** layer over the procure-to-pay lifecycle.

> **What this tool does *not* do.** It is advisory: it **recommends, never acts;
> mirrors, never masters; and is never the source of truth.** Issuing POs,
> receiving invoices, and paying live in the company's existing system of record.
> This tool ingests that system's reports **read-only** (no write-back) and helps
> procurement decide what to do next — whom to expedite, which invoice to hold,
> which supplier is late, what a scope change put at risk. A **human acts** and the
> system of record records it.

It is its own git repository, nested inside `personal-claude-os-v2` for now and
**destined to split out**. It depends on nothing in the parent repo.

Start with [`CONSTITUTION.md`](./CONSTITUTION.md) (framework + the flow + the
domain map — SRC, STD, CAT, SUP, OPS), then [`STATE.md`](./STATE.md) (where things
stand), then the domain constitutions under [`constitutions/`](./constitutions/).

The doctrine rule, never violated: **one thin constitution per essential
complexity; Spec → Solution Eval → Boundary Eval; eliminate > outsource/reuse >
build.** Constitutions hold invariants only — never mechanism.

## Live demo — being rebuilt

> **The original showcase demo has been retired** (see [`retired/`](./retired/)).
> It was built for an earlier version of the doctrine — before `SRC`, and while
> `OPS` still *executed* procure-to-pay (staging/firing POs, gating payments).
> `OPS` is now an **advisory** layer (recommends, never acts). Rather than ship a
> demo that contradicts the doctrine, it is being **rebuilt from scratch,
> deliberately**, against the current framework. The end-to-end flow meanwhile is
> drawn and narrated in [`docs/workflow.md`](./docs/workflow.md).

## Offline gates

Each domain's Solution Eval is a runnable, offline, deterministic selftest. All
green is the bar. From this directory:

```
npm install      # dev-only: tsx, typescript, @types/node
npm run verify   # runs the live domain gates + reports
npm run typecheck
```

| Gate | Command | Expect |
|---|---|---|
| Standard Sourcing | `npm run sourcing:selftest` | `selftest PASS` |
| Product Standard | `npm run standard:selftest` | `selftest PASS` |
| Vendor Catalog | `npm run catalog:selftest` | `selftest PASS` |
| Part Identity | `npm run selection:selftest` | `selftest PASS` |
| Supplier Truth | `npm run supplier:selftest` | `selftest PASS` |
| Procurement Operations | `npm run operations:selftest` | `selftest PASS` |
| All + typecheck | `npm run verify` | `ALL GATES PASS — 6/6` |

> All six domain gates are green. One caveat: `SRC`'s gate verifies the
> *deterministic* half of its trust model (provenance, faithfulness, typing,
> obligation, ratification, scope→set); the LLM **codifier** that produces
> proposals is still **envisioned**. The end-to-end *showcase demo* is **retired**
> pending a deliberate rebuild — see [`retired/`](./retired/) and
> [`STATE.md`](./STATE.md).

## Layout

`constitutions/` doctrine · `docs/` template + the MIL-STD-810 codification
example + the workflow + the PCID-minting note · `lib/` the six domains
(`sourcing`, `standard`, `catalog`, `part-identity`, `supplier`, `operations`) +
provenance/check primitives · `scripts/` one Solution-Eval gate per domain plus
`verify-all` · `retired/` the superseded demo, presentation, and executing-OPS
code, frozen pending a rebuild.
