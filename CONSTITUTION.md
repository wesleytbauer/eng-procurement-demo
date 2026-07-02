# Engineering–Procurement — Root Constitution

This is the **root** of a standalone doctrine layer for engineering–procurement
synergy. It is thin on purpose: it states the framework, the domains, and how
they compose. Everything else lives in a domain constitution under
`constitutions/`.

It is its own git repository, nested inside `personal-claude-os-v2` for now and
**destined to split out**. It depends on nothing in the parent repo.

---

## 1. The framework

Every problem this layer takes on is decomposed by **essential complexity** — the
irreducible difficulty inherent to the problem — and separated from **accidental
complexity** — the difficulty a particular *solution* introduces.

- **One thin constitution per essential complexity.** It exists to keep that
  complexity solved as the system changes around it.
- **Constitutions are invariants, not mechanisms.** They say what must always be
  true and how we'll verify it. They never say how to build it.
- **Each constitution is shaped Spec → Solution Eval → Boundary Eval**
  (`docs/constitution-template.md`):
  - **Spec** — the invariants. Approach-free.
  - **Solution Eval** — how we verify the invariants hold. *Defined before
    building*, so the bar can't be moved to match whatever got built.
  - **Boundary Eval** — for the accidental complexity any solution induces, the
    decision in order of preference: **eliminate > outsource/reuse > build**.

## 2. The flow this layer encodes

The synergy runs in one direction, and each arrow is a seam between domains:

```
design scope (customer/sales) — VERSIONED, immutable; each change records a
                                 replayable impact record (SRC-R-07)
  → applicable authoritative STANDARDS selected
                                 (a function of the scope; the engineer confirms)
  → faithful, traceable, RATIFIED codification
                                 (LLM proposes → gate verifies → human ratifies;
                                  each element cited AND typed by obligation level
                                  shall/should/may/informative — SRC-R-06)
  → (INVARIANTS, VARIABLES, RELATIONSHIPS)
                                 (the ratified inputs the standard derives from)
  → a STANDARD emerges           (algorithmically defined; changing an
                                   invariant, variable, or relationship changes
                                   the standard)
  → the standard defines a curated VENDOR CATALOG
       (sections of supplier catalogs covering the standard's components)
  → the engineer APPROVES recommended, conformant parts → mint a PCID per part
       (binds part ↔ constraint FINGERPRINT ↔ scope version; constraint sets are
        content-addressed and deduped by fingerprint; a PCID is minted only at
        approval, so IDs don't proliferate — PID-R-01..04)
  → PROCUREMENT OPERATIONS (advisory) take over
       (demand — ANY form, referencing a PCID that resolves to the part's
        constraints; ingest the system-of-record's reports read-only — POs,
        receipts, invoices → reconcile → RECOMMEND actions: selection, expedites,
        invoice holds, supplier outreach, performance. Recommends only; the
        system of record executes and remains the source of truth.)
```

Supplier identity underlies the last two stages but is **not** part of them: it
is its own truth, source-of-record-agnostic.

## 3. The map

| Domain | Essential complexity owned | Prefix |
|---|---|---|
| **Standard Sourcing** | Turning the authoritative standards a design scope selects into faithful, traceable, human-ratified `(invariants, variables, relationships)` — the inputs `STD` consumes as given. | `SRC` |
| **Product Standard** | Deriving a coherent, machine-checkable standard from a product line's invariants + variables + relationships; a change in any propagates to the standard. | `STD` |
| **Vendor Catalog** | A curated catalog that covers exactly the standard's component space by selecting sections of supplier catalogs. | `CAT` |
| **Part Identity** | Minting, at an engineer's approval, a unique immutable Part Constraint ID (PCID) that binds a selected part to the exact constraints (by fingerprint) and scope version it was approved against, and resolves them deterministically. Newly carved (root §5). | `PID` |
| **Supplier Truth** | A trustworthy, identity-resolved abstraction of suppliers — source-of-record-agnostic. Build-vs-integrate is a Boundary Eval variable, not a Spec line. | `SUP` |
| **Procurement Operations** | An advisory layer over a read-only mirror of the procure-to-pay lifecycle: reconciles POs/receipts/invoices ingested from the system of record and recommends actions. Recommends, never acts; mirrors, never masters — never the source of truth. | `OPS` |

Domains are flat and independent. A domain owns exactly one essential
complexity. Nothing is owned twice; nothing is unowned.

## 4. Cross-cutting concerns (flagged, not yet a domain)

Integrity (single source of truth per fact) and **provenance** (every fact traces
to its origin) recur in every domain, carried as **referenced invariant lines**
(the `*-provenance` lines in `SRC`, `STD`, `CAT`, `SUP`). **Reversibility** used
to be a third such concern, seeded by a PO/payment staging gate in `OPS` — but
`OPS` is now an *advisory* layer that performs no irreversible external act
(`OPS-R-03`). The tool reversibility concern is therefore discharged by
*abstention*: there is nothing to stage or gate because the tool never acts.
Reversibility of the actual POs and payments lives entirely with the external
system of record, outside this layer.

They **graduate to a shared Foundation kernel only when proven hard** — when the
referenced lines stop being thin and start being copied. Flagged now, not built
now. This mirrors the rule below.

## 5. Seams earn constitutions only when proven

Where two domains touch, the coupling is a *referenced invariant line* in the two
adjacent constitutions — not a new constitution. A seam graduates to its own
domain only after it demonstrably resists being a thin reference.

**Open question, decided by evidence:** `Vendor Catalog` is the domain most
likely to be a *seam* (Product Standard ↔ Supplier Truth) rather than a true
domain. It keeps its constitution for now; if it stays thin, it demotes to a
referenced invariant line. We let it earn the domain.

## 6. Amendment

A constitution changes by editing its file with a clear rationale in the commit.
A change to a domain's **invariants or variables** is expected to ripple
downstream (that is the whole flow in §2) — the ripple is a feature, not drift.
There is no governance department and no self-audit of doctrine shape. The check
that doctrine is honoured is the **Solution Eval** of each domain — run the eval,
not a paperwork audit.
