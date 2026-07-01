# Worked example — codifying MIL-STD-810 (the `SRC` step, made concrete)

This is a demonstration of **Standard Sourcing** (`SRC`) on a *real, public-domain*
engineering standard. It shows one design scope electing one standard, and the
codifier proposing `(invariants, variables, relationships)` — the ratified pair-
plus-relationships that `STD` then consumes.

> **Why MIL-STD-810.** It is a US-Government work (public domain), so its clauses
> are freely citable and reproducible here. It is also a **tailored** standard —
> it prescribes *test methods*, not universal pass/fail thresholds — which makes
> it an honest example of why codification is *proposed and human-ratified*
> (`SRC-R-03`), never turnkey. The engineer owns the real numbers; the codifier
> proposes a faithful starting point with provenance.

This document is **doctrine illustration, not a code gate.** It is prose + a
proposed TypeScript block; it does not run in `npm run verify`. The codifier that
would emit this block is a later **build** (a Boundary-Eval variable — see
`constitutions/standard-sourcing.md`); the Solution Eval bar it must clear
(`scripts/sourcing.selftest.ts`) is defined ahead of it.

---

## INPUT — what the engineer presents

**Design scope (from customer / sales):**
a washdown food-processing conveyor drive; subject to high-pressure **caustic**
washdown; continuous duty at ~40 °C ambient.

**Elected authoritative standard:**
**MIL-STD-810H, Method 507.6 (Humidity).**

**Real clause anchors** (cited below):

- Method 507.6 defines **induced-humidity categories**:
  - **B1 — Induced Constant High Humidity:** relative humidity **above 95 %** at a
    nearly constant **~27 °C (80 °F)** for a day or more.
  - **B2 — Induced Variable-High Humidity.**
  - **B3 — Induced Hot-Humid.**
- The historically-used **aggravated** laboratory condition is **60 °C / 95 % RH**
  — a level the standard itself notes uses more extreme temperature/humidity than
  those found **in nature** (Procedure II is *Aggravated*, run for shorter
  durations to force faster results).
- MIL-STD-810 is a **tailored** standard: it prescribes *methods*, not a single
  universal pass/fail — so category selection and test condition are engineering
  choices, not constants the codifier may harden unbidden.

---

## Codified output (proposed)

The `relationships` layer is the new `SRC-R-05` first-class element — conditional
guards that are **not** invariants and **not** variables. Every element carries a
`src` back to its source clause or to the scope that mandated it (`SRC-R-02`).

```ts
// SOURCE: MIL-STD-810H, Method 507.6 (Humidity) — US-gov work, public domain
slot("drive_enclosure", {
  invariants: [
    { key: "humidity_category_declared",
      required: c => c.attrs.humidity_category !== undefined,
      src: "507.6 — a humidity category must be selected" },
    { key: "ingress_min",
      required: c => ingressRank(c.attrs.ingress) >= rank("IP65"),
      src: "scope: high-pressure washdown ⇒ jetting protection" },
  ],
  variables: [                         // the design space (≙ AC/DC as a variable of "Power Supply")
    { key: "humidity_category",
      domain: ["B1_constant_high","B2_variable_high","B3_hot_humid","none"],
      src: "507.6 — induced humidity categories" },
    { key: "test_condition",
      domain: ["27C_95RH","60C_95RH_aggravated"],
      src: "507.6 — 60°C/95%RH historically used (noted: not naturally occurring)" },
  ],
  relationships: [                     // ← first-class conditional guards (SRC-R-05)
    { when: c => c.attrs.humidity_category !== "none",
      then: c => c.attrs.test_condition !== undefined,
      src: "if a category applies, a test condition must be set" },
    { when: c => c.attrs.humidity_category === "B3_hot_humid",
      then: c => c.attrs.test_condition === "60C_95RH_aggravated",
      src: "507.6 — hot-humid → aggravated cycle" },
    { when: () => scope.caustic_washdown,     // cross-standard pull
      then: c => corrosionResistant(c.attrs.material),
      src: "scope ⇒ Method 509 (salt-fog/corrosion); material domain may need stainless" },
  ],
})
```

**How each element type reads back to the Spec:**

- The **invariants** are the always-true predicates (`STD-R-01`/`STD-R-03` will
  derive conformance from them). Here: a category *must* be declared, and washdown
  scope floors ingress at IP65.
- The **variables** are the surround — the free design space and its allowed
  domains (`humidity_category`, `test_condition`), exactly as voltage/frame are
  variables in the gearmotor line.
- The **relationships** are conditional guards between attributes (`SRC-R-05`).
  They are why the third element type had to exist: `if category applies → a test
  condition is set`, `hot-humid → aggravated cycle`, and a **cross-standard pull**
  (`caustic washdown → corrosion-resistant material`, reaching toward Method 509).
  None of these fit as a plain invariant or a plain variable without losing the
  *when → then* structure — smuggling them into an invariant is exactly what
  `SRC-R-05` forbids.

---

## Ratification flags — the honest human-in-the-loop frontier

Per `SRC-R-03`, the block above is **proposed**, not bound. Before any of it
becomes an `STD` input, the engineer confirms — and these three points are where
the LLM must *defer to a human*, not decide:

1. **Tailoring.** `60 °C / 95 % RH` is a *historical default* the standard itself
   flags as not naturally occurring. The engineer owns the real number for a
   ~40 °C continuous-duty food line. **LLM proposes; human tailors.**
2. **Cross-standard inference.** "Caustic washdown" appears **nowhere in 507.6**;
   the codifier *inferred* the corrosion / Method-509 pull from the scope. That is
   **scope reasoning, not clause reading** — precisely the kind of leap that must
   be confirmed, never auto-bound (`SRC-R-02` demands a real source; a scope
   inference is a weaker provenance than a clause).
3. **Normative vs informative.** Parts of the annex category text are
   *informative* guidance, not *normative* requirement. The codifier must not
   harden guidance into an invariant — an over-reach `SRC-R-04` treats as a defect.

These flags are the point of the domain: codification is a **human-ratified
frontier**, not turnkey automation. The value is a faithful, traceable *proposal*
that collapses the engineer's work to *confirm-or-correct* — not a claim that the
machine got the standard right on its own.

---

## Sources

- MIL-STD-810H, Method 507.6 (Humidity) — full method text (PDF):
  <https://cvgstrategy.com/wp-content/uploads/2019/08/MIL-STD-810H-Method-507.6-Humidity.pdf>
- CVG Strategy — "MIL-STD-810H Humidity Method 507.6, A Deeper Look":
  <https://cvgstrategy.com/mil-std-810h-humidity/>
- Trenton Systems — "MIL-STD-810 Humidity Testing Overview [Method 507.6]":
  <https://www.trentonsystems.com/en-us/resource-hub/blog/mil-std-810-humidity-testing-overview>
