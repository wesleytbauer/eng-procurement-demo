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
product line
  → identify INVARIANTS          (what never changes in the line)
  → identify VARIABLES           (what surrounds the invariants)
  → a STANDARD emerges           (algorithmically defined; changing an
                                   invariant or variable changes the standard)
  → the standard defines a curated VENDOR CATALOG
       (sections of supplier catalogs covering the standard's components)
  → PROCUREMENT OPERATIONS take over
       (demand → quotes/lead-time/risk → selection → PO → dissemination →
        receipt → invoice approval → nonconformance/shortage → performance)
```

Supplier identity underlies the last two stages but is **not** part of them: it
is its own truth, source-of-record-agnostic.

## 3. The map

| Domain | Essential complexity owned | Prefix |
|---|---|---|
| **Product Standard** | Deriving a coherent, machine-checkable standard from a product line's invariants + variables; a change in either propagates to the standard. | `STD` |
| **Vendor Catalog** | A curated catalog that covers exactly the standard's component space by selecting sections of supplier catalogs. | `CAT` |
| **Supplier Truth** | A trustworthy, identity-resolved abstraction of suppliers — source-of-record-agnostic. Build-vs-integrate is a Boundary Eval variable, not a Spec line. | `SUP` |
| **Procurement Operations** | The demand → PO → receipt → invoice → nonconformance lifecycle, with reversibility gating the irreversible acts (POs, payments). | `OPS` |

Domains are flat and independent. A domain owns exactly one essential
complexity. Nothing is owned twice; nothing is unowned.

## 4. Cross-cutting concerns (flagged, not yet a domain)

Integrity (single source of truth per fact), **provenance** (every fact traces
to its origin), and **reversibility** (irreversible external acts are staged and
gated) recur in every domain. For now they are carried as **referenced invariant
lines inside the domains that need them** (notably `OPS-R-03` for the
PO/payment gate and the `*-provenance` lines in `STD`, `CAT`, `SUP`).

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
