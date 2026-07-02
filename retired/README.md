# retired/ — frozen, superseded by doctrine changes

This folder holds artifacts that were built against an **earlier version of the
doctrine** and are now stale. They are kept for reference and history; they are
**not** part of the live build, are **excluded from `tsconfig.json`**, and are
**not run by `npm run verify`**. The demo will be **rebuilt from scratch**,
deliberately and slowly, against the current doctrine.

> Nothing here should be treated as an accurate description of the system. When
> in doubt, the `constitutions/`, `CONSTITUTION.md`, and `docs/` at the repo root
> are the source of truth.

## Why each item was retired

| Retired | Why it's stale |
|---|---|
| `demo/` (whole synthetic GM-Series showcase, code + `demo/out/` artifacts + `demo/video/`) | Built for the original **4-domain** framing (no `SRC`) and, critically, models **OPS *executing*** procure-to-pay — staging and firing POs, gating payments. OPS is now an **advisory** layer (recommends, never acts; mirrors, never masters — `OPS-R-02/-R-03/-R-04`). The demo also predates PCID, obligation levels, the three-valued verdict, and versioned scope. To be rebuilt. |
| `presentation/` (`STORY.md`, `VIDEO.md`, `demo-walkthrough.mp4/.webm`, `linkedin.md`, `x-thread.md`) | Narrate the retired framing ("PO awards", "staged + approved, never auto-fired", "flagged, never paid", 4-domain map). Superseded. |
| `lib/operations.ts` | Implements the executing-OPS lifecycle (`stage`/`approve`/`execute`/`stagePayment`/`threeWayMatch` as a payment gate). Directly contradicts the advisory `OPS` spec. |
| `scripts/operations.selftest.ts` | The OPS Solution-Eval gate that **asserts the retired invariants** (stager ≠ executor, three-way match gates payment). Keeping it green would misrepresent the doctrine. |

## What replaced / covers them now

- OPS doctrine: `constitutions/procurement-operations.md` (advisory layer).
- The end-to-end flow, drawn + narrated: `docs/workflow.md`.
- Live gates (`npm run verify`): the three still-valid domains — Product Standard
  (STD), Vendor Catalog (CAT), Supplier Truth (SUP).

## Reviving anything here

Paths inside this folder are **frozen as of retirement**; some relative imports
(e.g. into the old `lib/operations.js`) point at files that also moved here or
have since changed. Treat these as a reference to port from, not to run as-is.
When we rebuild the demo, we start from the current doctrine and bring pieces
across intentionally.
