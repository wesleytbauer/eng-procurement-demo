# Constitution Template (v3 — thin)

Copy this to `constitutions/<domain>.md` and fill it in. A constitution is
**thin**: invariants and the eval bar, never mechanism. If you find yourself
describing *how* something is built, it belongs in code, not here.

Keep the whole thing readable in one sitting. If it's long, the domain is
probably two domains, or you've smuggled mechanism into the Spec.

---

```markdown
# <Domain> Constitution

**Essential complexity owned:** <the one irreducible difficulty this domain
keeps solved. One sentence. If you need "and" twice, suspect two domains.>

**Prefix:** `<DOMAIN-CODE>` (used for invariant ids, e.g. INTAKE-R-01)

---

## Spec — invariants

The things that must *always* be true for this essential complexity to count as
solved. Approach-free: true regardless of how it's implemented. Number them.

- `<CODE>-R-01` — <invariant>
- `<CODE>-R-02` — <invariant>
- ...

> A good invariant survives a complete rewrite of the implementation. If a line
> would change when you swap the library, it's mechanism — cut it.

## Solution Eval — how we verify the invariants hold

Defined *before* building, so the bar can't drift to match what got built.

- **What we measure** — the observable signal that each invariant holds.
- **The bar** — the threshold that counts as solved (a number where possible,
  N≥2 trials, an objective gold source — not "looks right").
- **How it's checked** — eval, assertion, or audit. Names the artifact, not the
  code.

## Boundary Eval — the accidental complexity a solution will induce

For each significant piece of accidental complexity a solution introduces,
record the decision in preference order:

1. **Eliminate** — can the need be designed away entirely? (Best outcome.)
2. **Outsource / reuse** — is there a proven external or existing component?
   (Reusing v1's substrate is this.)
3. **Build** — only what is genuinely core and unavailable elsewhere.

| Accidental complexity | Decision | Why |
|---|---|---|
| <e.g. OCR> | Outsource | Commodity; never differentiating |
| <e.g. dedup logic> | Build | Core to the invariant; no proven drop-in |
| <e.g. some v1 machinery> | Eliminate | The need was self-induced |

## Seams (if any)

One line per adjacent domain this one touches, naming the invariant that governs
the hand-off. A seam stays here as a reference until it proves it needs its own
constitution.
```
