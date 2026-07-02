# Standard Sourcing Constitution

**Essential complexity owned:** turning the authoritative engineering standards a
design scope selects into faithful, traceable, human-ratified
`(invariants, variables, relationships)` — the very inputs the Product Standard
consumes as given.

**Prefix:** `SRC`

> This is the **new head of the flow**. `STD` begins where its inputs are already
> a clean `(invariants, variables)` pair; it does not own where they come from.
> Real engineering does not invent invariants from nothing — it *derives* them
> from authoritative Standards (MIL-STD, IEC, ISO, NEMA, …) selected by the
> declared design scope. Codifying a standard's prose reasoning into
> machine-checkable elements — faithfully, with provenance to the source clause,
> and ratified by a human before it binds — is a distinct, irreducible problem
> upstream of `STD`. This domain owns exactly that, and nothing downstream of it.

---

## Spec — invariants

- `SRC-R-01` — **The applicable standard set is a function of the declared
  scope.** Which authoritative standards apply is derived from the design scope
  (typically set by the customer/sales dept); changing the scope re-derives the
  set. A standard included without a scope that mandates it, or a scope-mandated
  standard left out, is a defect. (This is the `STD-R-04` ripple, one level up.)
- `SRC-R-02` — **Every codified element traces to an authoritative source
  clause.** Each invariant, variable, and relationship records the external
  authority and clause it came from (provenance to authority, not just to us). An
  element that cannot name its source clause is rejected.
- `SRC-R-03` — **Codification is proposed, never auto-bound.** No codified element
  becomes an `STD` input until a human ratifies it. The trust model is fixed:
  **LLM proposes → deterministic gate verifies → human ratifies.** Nothing skips
  the human, and nothing binds ahead of ratification.
- `SRC-R-04` — **Faithfulness is two-way.** Nothing is codified beyond what the
  source supports (no invented constraint), and nothing the scope mandates is left
  un-codified (no silent gap). Both over-reach and under-coverage are defects.
  (This mirrors `CAT-R-01`'s two-way coverage, one flow-stage up.)
- `SRC-R-05` — **Relationships are a first-class, cleanly-typed element.** A
  conditional guard between attributes (e.g. `if washdown → ingress ≥ IP65 ∧
  material ∈ corrosion-resistant`) is codified as a distinct `relationship`, never
  smuggled into an invariant or a variable. It is the third element type `STD`
  now admits (`STD-R-02`), produced here.
- `SRC-R-06` — **Obligation level is a first-class, cited property.** Every
  codified element records its normative strength — **mandatory** (shall/must),
  **recommended** (should), **permissive** (may/optional), or **informative**
  (typically/generally/note) — traced to the source language it came from
  (reusing the RFC 2119 / ISO-IEC-Directives modal vocabulary, not a private one).
  Enforcement follows from strength: mandatory elements gate as hard invariants;
  recommended elements are surfaced as advisories and may be set aside **only** by
  a recorded, justified, human-ratified **deviation**; informative text never
  gates. Strength is never silently promoted (guidance hardened into a shall) nor
  demoted (a shall softened to slip a part through) — a change of level is itself
  a ratified act with a cited reason. This is the typed form of the "normative vs
  informative" ratification frontier, and it makes `STD`'s conformance verdict
  three-valued (`STD-R-03`).
- `SRC-R-07` — **Scope is versioned and immutable; derivation is traceable to a
  scope version.** Every scope revision is recorded with provenance (who, when,
  why) and never overwritten — history is append-only. Every downstream artifact
  is stamped with the scope version it derives from, so anything derived from a
  superseded scope is detectable as **stale** (the `STD-R-04` fingerprint chain,
  rooted at a scope version). Each scope transition records a **replayable impact
  record**: standards added/dropped, codified elements changed (with their
  obligation level, `SRC-R-06`), and the downstream conformance / coverage / PO
  deltas the change induces. Because every state is a deterministic function of
  `(scope version, ratified inputs)`, any past state is re-derivable and any two
  versions are diffable — history is *reproducible*, not merely logged.

## Solution Eval — how we verify the invariants hold

Defined *before* any codifier is built, so the bar cannot drift to match whatever
an LLM happens to emit.

- **What we measure**
  - **Gold classification set.** On a labeled set of `(source clause → expected
    element)` pairs, the codified output reproduces every expected classification
    — the clause maps to the expected invariant / variable / relationship, with
    the expected shape (SRC-R-02/-R-04/-R-05) — assertion.
  - **Scope-change ripple.** Changing the declared scope re-derives the applicable
    standard set *and* the codified elements to the expected new set; no stale
    codification survives a scope change (SRC-R-01) — assertion, N≥2.
  - **Provenance completeness.** Every codified element carries a resolvable
    source-clause reference; an element without one fails (SRC-R-02) — assertion.
  - **Ratification gate.** No element is presented as an `STD` input while still in
    the *proposed* state; only ratified elements cross the seam (SRC-R-03) —
    assertion.
  - **Obligation level.** Every codified element carries a strength drawn from the
    fixed set {mandatory, recommended, permissive, informative}, cited to source;
    a recommended element that is unmet yields a *deviation requiring a ratified
    waiver*, never a silent pass or a hard fail; informative text gates nothing
    (SRC-R-06) — assertion, plus a gold-set check that source modal words map to
    the expected strength.
  - **Scope lineage & impact.** Scope history is append-only (no in-place edit);
    every artifact resolves to exactly one scope version; a simulated scope
    transition produces an impact record whose deltas equal the expected set, and
    re-deriving from an earlier scope version reproduces that version's state
    byte-for-byte (SRC-R-07) — assertion, N≥2.
- **The bar** — gold-set reproduction, provenance, and the ratification gate are
  100% assertions (correctness invariants, not statistical targets); the
  ripple diff must be exact — no missed re-derivation, no spurious element.
- **How it's checked** — a gold-set reproduction assertion + a scope-change ripple
  test + a provenance-and-ratification assertion over the proposed set.
- **Gate** — `scripts/sourcing.selftest.ts` (`npm run sourcing:selftest`). The
  gate defines the bar now; the codifier that satisfies it is a later **build**
  (see Boundary Eval) — the eval exists first, on purpose.

## Boundary Eval — accidental complexity a solution induces

| Accidental complexity | Decision | Why |
|---|---|---|
| The authoritative standards themselves (MIL-STD, IEC, ISO, …) | **Reuse — never rebuild** | They are the external authority; the domain reads them, it does not author them. |
| Scope / standard-set storage **and version history** | **Reuse** | A git-like log, an event store, or a temporal DB all satisfy `SRC-R-07`; the invariant is immutability + traceability + replayable impact, not the bytes. The derivation and the provenance are the value. |
| The LLM codifier (prose → proposed elements) | **Build-vs-reuse variable (accidental)** | *How* prose is turned into proposals is mechanism — which model, which prompt, build vs. an off-the-shelf extractor is a recorded Boundary Eval call, **not** a Spec line. This mirrors how `SUP` treats build-vs-integrate the system of record: the variability is isolated below the invariants, which only require that whatever proposes is verified and ratified before it binds (SRC-R-03). |
| The deterministic verify gate | **Build** (minimal) | Core to `SRC-R-03`; it is what makes an LLM proposal trustworthy enough to hand a human. |

## Seams

- **→ Product Standard** — `SRC` **produces** the ratified
  `(invariants, variables, relationships)` that `STD` **consumes** as given
  inputs. The seam is *the ratified codified input*: `STD-R-01` treats it as the
  `(invariants, variables)` it derives from, and `STD-R-02` now types the
  `relationship` element `SRC-R-05` produces. A codified element is only across
  the seam once `SRC-R-03` has ratified it.
- **Ripple** — a scope change is *expected* to ripple `SRC → STD → CAT → OPS`:
  re-derive the applicable standards and codification here (`SRC-R-01`), which
  re-derives the standard (`STD-R-04`), which re-evaluates coverage (`CAT-R-05`)
  and flags in-flight buys (`OPS`). The ripple is the whole flow (root §2), not
  drift. `SRC-R-07`'s **impact record** is exactly this ripple captured per scope
  transition — the (now-retired) demo showed it in miniature for one v1→v2 change
  (6 newly non-conformant, 1 gap, 2 POs at risk); re-demonstrating it is part of
  the demo rebuild.
- **Cross-cutting (flagged, not built)** — *lineage / versioning* now recurs in
  `SRC-R-07`, `STD-R-04`, and `CAT-R-05`. Per root §4, a cross-cutting concern
  graduates to a shared Foundation kernel only once its referenced lines stop
  being thin and start being copied. Scope versioning is the strongest evidence
  yet for a **lineage kernel** — flagged here, earned later, not built now.
