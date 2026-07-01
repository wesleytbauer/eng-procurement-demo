# Supplier Truth Constitution

**Essential complexity owned:** a trustworthy, identity-resolved abstraction of
suppliers that is *source-of-record-agnostic* — consumers depend on the
abstraction, not on whether the master data is built here or integrated from an
external system of record.

**Prefix:** `SUP`

> **Why this is its own domain.** Whether the system builds its own supplier
> master or integrates a company's ERP/system of record is a real-world
> *variable* — most adopters already have one. That variability is a Boundary
> Eval decision, not a Spec line. Isolating it here keeps Procurement Operations
> dependent on the *abstraction* and free of any assumption about *where*
> supplier data lives. This is the same move the parent OS makes with its
> substrate (reuse-vs-build) and its Finance domain (truth from outside the
> system).

---

## Spec — invariants

- `SUP-R-01` — **Supplier Truth is an interface, not a store.** Consumers depend
  on the abstraction; whether it is backed by a local master or an external
  system of record is invisible to them and may change without changing the
  contract. This is the domain's reason to exist.
- `SUP-R-02` — **Identity is resolved and stable.** Each real-world supplier has
  exactly one canonical identity; the same supplier arriving under different
  names or feeds resolves to that one identity; distinct suppliers never collapse
  into one.
- `SUP-R-03` — **Every attribute carries provenance and a trust level.** A
  supplier attribute (tax ID, certification, intrinsic risk) records where it
  came from and how far it's trusted. An unsourced attribute may be recorded but
  is never treated as authoritative.
- `SUP-R-04` — **Truth, not behavior.** Supplier Truth holds *who a supplier is*
  and *how trustworthy its master data is*. It does **not** hold
  procurement-generated performance or observed transactional risk — those are
  produced by Operations and attach by identity (`OPS-R-07`). This line is what
  keeps the domain from swelling into Operations.
- `SUP-R-05` — **Source-of-record authority is explicit.** Where an external
  system of record is authoritative, Supplier Truth reflects it and does not
  silently override it; where the system builds its own master, the same contract
  holds. Build-vs-integrate is a recorded Boundary Eval decision, never a change
  to this Spec.

## Solution Eval — how we verify the invariants hold

- **What we measure**
  - Identity resolution on a labeled set: same-supplier variants collapse to one
    identity; distinct suppliers stay distinct (SUP-R-02) — measured rate against
    a gold set, bar set *before* building, N≥2.
  - Every attribute has provenance + a trust level (SUP-R-03) — assertion.
  - Swapping the backing store (local master ↔ external-SoR mock) leaves the
    consumer-facing contract unchanged (SUP-R-01/-R-05) — assertion.
- **The bar** — provenance and contract-stability are 100% assertions;
  identity-resolution meets a pre-set measured bar (collapse/separation rates),
  not "looks right."
- **How it's checked** — a resolution eval over the gold supplier set + a
  provenance assertion + a backing-store-swap contract test.
- **Gate** — `scripts/supplier.selftest.ts` (`npm run supplier:selftest`).

## Boundary Eval — accidental complexity a solution induces

| Accidental complexity | Decision | Why |
|---|---|---|
| The system of record / master-data store | **Outsource / integrate where one exists; build only if none** | The whole point of the domain — this is the variable, isolated behind `SUP-R-01`. |
| Identity resolution / de-dup | **Build** | Core; correctness can't be assumed from any single feed. |
| The abstraction / interface itself | **Build** (thin) | Small, but it's what makes build-vs-integrate a swap instead of a rewrite. |
| Intrinsic risk / certification / registration data | **Outsource** | Third-party risk and registration providers; commodity. |

## Seams

- **→ Procurement Operations** — performance and observed risk attach to a
  Supplier Truth identity, never live inside it (`SUP-R-04` ↔ `OPS-R-07`).
- **→ Vendor Catalog** — catalog entries' suppliers resolve to identities here
  (`CAT-R-02` ↔ `SUP-R-02`).
