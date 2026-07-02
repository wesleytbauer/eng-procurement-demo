# PCID minting — the fingerprint / PCID split

How a **Part Constraint ID (PCID)** comes to exist, and why constraints can flow
early without a proliferation of IDs. This is the design note behind the
**Part Identity (`PID`)** constitution.

## The two things people conflate

- **Constraint set** — "the constraints a part in this slot must meet." Derived
  from the standard's codified elements (invariants / variables / relationships +
  obligation levels) at a scope version. Many candidate parts can satisfy one
  constraint set.
- **Constraint fingerprint** — a **content hash** of a constraint set. Identical
  constraints always produce the identical fingerprint, so fingerprints **dedupe by
  construction**. They are cheap, derived, and reusable — and carry **no identity**.
- **PCID** — the durable, unique identifier an engineer's *approval* creates,
  binding a chosen part to the fingerprint (and scope version) it was approved
  against.

The key point: **a fingerprint is not a PCID.** Fingerprints flow freely down the
pipeline; a PCID is minted only at the moment of commitment. That split is what
resolves "know the constraints early" vs. "don't proliferate unique IDs."

## The walkthrough — up to the mint

1. **Scope arrives (versioned).** The customer/sales scope is recorded as an
   immutable version. Nothing minted.
2. **Standards selected; engineer confirms.** The applicable standards fall out of
   the scope; the engineer confirms the set. Nothing minted.
3. **Codification → constraints → fingerprints.** The system proposes the codified
   elements per slot (each cited and obligation-typed); a human ratifies them. Each
   slot's constraint set is hashed into a **fingerprint**. Identical constraints
   collapse to the same fingerprint — no IDs are stamped, so nothing proliferates.
4. **The system recommends parts.** With the standard derived and the catalog
   covering the constraint space, the engineer is shown a **ranked, conformant,
   sourceable recommendation** per slot. What exists now: constraint fingerprints +
   a recommendation. **Still no PCID** — nothing has been committed.
5. **The engineer reviews and approves.** The engineer decides the recommended list
   is good and **approves it**, recording the parts into the drawing / bill of
   materials.
6. **Approval is the trigger.** *That act* mints the PCIDs. For each approved part,
   the system creates **one unique, immutable PCID** and permanently binds three
   things to it: the **part identity**, the **constraint fingerprint** it was
   approved against, and the **scope version**. The count of PCIDs equals the parts
   an engineer actually committed to — never the candidate space.

## After the mint (in one line)

Demand — in any form — references a PCID; procurement resolves the exact
constraints from it deterministically, without re-keying (`OPS-R-01`). A scope
change re-resolves what a PCID points at and flags affected in-flight buys
(the `SRC-R-07` impact record).

## Explicitly out of scope

Equality of constraint sets is decided **only** by fingerprint (`PID-R-04`) —
exact and deterministic. There is **no** semantic search, embedding, vector store,
or nearest-neighbor "essentially the same part" detection. That was considered and
deliberately **eliminated** (see the `PID` Boundary Eval): it would make sameness
fuzzy, and it isn't needed.
