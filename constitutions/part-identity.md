# Part Identity Constitution

**Essential complexity owned:** minting, at an engineer's approval, a unique and
immutable **Part Constraint ID (PCID)** that permanently binds a selected part to
the exact constraints — by content **fingerprint** — and the scope version it was
approved against, and resolves those constraints deterministically for downstream
procurement.

**Prefix:** `PID`

> **Newly carved (watch flag, root §5).** This is the seam between engineering
> *selection* and procurement: the moment an engineer approves a recommended part
> is where a durable, constraint-bound identity has to be created. It is given its
> own thin constitution because that minting/binding is a distinct essential
> complexity — not the ranking of parts (that is a recommendation, upstream) and
> not the procure-to-pay mirror (that is `OPS`, downstream). If it stays thin it
> may demote to a referenced line; it earns the domain.
>
> The design tension it resolves: constraints must be known *early* (so procurement
> can work proactively) without a proliferation of unique IDs. It splits the two —
> **constraint sets flow freely as cheap, deduped fingerprints; a PCID is minted
> only at approval.** See `docs/pcid-minting.md` for the walkthrough.

---

## Spec — invariants

- `PID-R-01` — **A PCID is minted at approval, never before.** A PCID is created
  only when an engineer approves and records a recommended part (the ratification
  act). Candidate parts, recommendations, and derived constraint sets carry **no**
  PCID. This is what keeps identities proportional to parts actually committed, not
  to the candidate space — no proliferation.
- `PID-R-02` — **A PCID is unique and immutable.** Once minted it is never reused
  and never mutated — an opaque, non-repeating identifier. Correcting or
  superseding a selection mints a *new* PCID; it never edits an existing one, so a
  PCID always means exactly what it meant when it was minted.
- `PID-R-03` — **A PCID permanently binds part ↔ constraint fingerprint ↔ scope
  version, and resolves deterministically.** From a PCID, procurement recovers the
  exact constraints the part was approved against (via the fingerprint) and the
  scope version they came from — without re-keying. The binding carries provenance
  (`SRC-R-07`); the resolution is deterministic, never a guess.
- `PID-R-04` — **Constraint-set equality is decided by fingerprint, never by
  similarity.** A constraint set is content-addressed to a **fingerprint** such
  that identical constraints always yield the identical fingerprint (dedup by
  construction) and different constraints yield different fingerprints. Sameness of
  constraints is exact and deterministic — **never fuzzy, semantic, or
  nearest-neighbor.** (This reuses `STD-R-04`'s lineage-fingerprint idea at the
  granularity of a slot's constraint set.)

## Solution Eval — how we verify the invariants hold

Defined *before* building, so the bar cannot drift to match what gets built.

- **What we measure**
  - **Approval-triggered.** No PCID exists for any un-approved recommendation;
    approving a recommended list mints exactly one PCID per approved part
    (PID-R-01) — assertion.
  - **Unique & immutable.** Minted PCIDs are pairwise distinct across all history;
    an attempt to mutate a PCID's binding is rejected (supersede → new PCID)
    (PID-R-02) — assertion.
  - **Resolvable.** From any PCID, the recovered constraint set and scope version
    equal the exact set/version approved (PID-R-03) — assertion.
  - **Fingerprint determinism.** Identical constraint sets hash to the identical
    fingerprint; a changed constraint changes the fingerprint; equality is decided
    only by fingerprint, never by similarity (PID-R-04) — assertion.
- **The bar** — every item is a correctness assertion that must hold 100% of the
  time; these are invariants, not statistical targets.
- **How it's checked** — a mint-on-approval assertion, a uniqueness/immutability
  assertion over minted history, a resolve-round-trip assertion, and a
  fingerprint-determinism assertion.
- **Gate** — `scripts/selection.selftest.ts` (`npm run selection:selftest`). The
  gate defines the bar now; the minting/binding implementation is a later
  **build** — the eval exists first, on purpose (as with `SRC`).

## Boundary Eval — accidental complexity a solution induces

| Accidental complexity | Decision | Why |
|---|---|---|
| The identifier scheme (UUID / ULID / sequential) | **Reuse** | An opaque, unique key from a proven generator. Meaning lives in the *bound row*, never encoded into the number — human-meaningful IDs rot. |
| Identity + fingerprint storage | **Reuse** | A generic store with unique-key enforcement; the binding and its provenance are the value, not the bytes. |
| Near-duplicate / "essentially the same part" detection | **Eliminate** | Deliberately out of scope. Equality is exact and deterministic by fingerprint (`PID-R-04`). No semantic search, embeddings, or nearest-neighbor — those would make sameness fuzzy and are not built. |
| Mint + bind + resolve logic | **Build** (small) | Core to the domain; it is what makes a PCID a trustworthy, resolvable key. |

## Seams

- **← Standard Sourcing / Product Standard** — consumes the ratified constraints
  (and their fingerprints) and the scope version they were derived under
  (`SRC-R-07`); it does not author constraints, only binds them.
- **← Recommendation (upstream of `OPS`)** — the engineer approves a *recommended,
  standard-conformant* part; approval is the mint trigger (`PID-R-01`). Ranking a
  recommendation is not owned here.
- **→ Procurement Operations** — `OPS` demand references a PCID and resolves the
  part's constraints from it (`OPS-R-01`); `OPS` never mints identity.
- **Ripple** — a scope change re-resolves the constraints a PCID points at (via the
  `SRC-R-07` impact record) and flags any in-flight buy whose part is now
  non-conformant.
