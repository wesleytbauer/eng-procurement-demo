# LinkedIn — long-form post (ready to publish)

> Lead attachment: **`demo-walkthrough.mp4`** (~77s animated walkthrough — the strongest
> single asset; LinkedIn autoplays video). Alternative/supporting stills: (1) the pipeline
> diagram from `demo/out/diagrams.md`, (2) the **motor scorecard** from
> `demo/out/scorecards.md`, (3) the **v1→v2** table from `demo/out/reconcile.md`.

---

Engineering and procurement usually live in two spreadsheets that never talk to each other.

Engineering decides what the product *is*. Procurement decides who *supplies* it. When engineering changes a requirement, someone has to manually figure out which parts are now non-compliant, which suppliers are off the table, and which open POs just became a problem. That translation is slow, it's error-prone, and it's where margin quietly leaks out.

So I built a small, dependency-free reference implementation that closes the loop — and a fully synthetic worked example you can run in one command.

The idea is one move: **separate a product line's invariants from its variables.**

- **Invariants** are what never changes (a motor must be DC; a housing must meet an ingress-protection floor).
- **Variables** are what's free to range (voltage, frame size, gear ratio).

Once you've named those two things, a **standard** falls out *algorithmically*. And because the standard is derived — not hand-typed — a change to an invariant or a variable automatically ripples through everything downstream:

→ the standard becomes the **conformance gate** for a curated vendor catalog
→ the catalog feeds **demand** into procurement
→ suppliers are resolved to **one identity** no matter how many names/feeds they show up under
→ every **PO award** is a transparent, auditable scorecard — not a gut call
→ delivery **performance** flows back and changes the next award

I ran it on a synthetic 7-part sealed DC gearmotor — 120 units across a quarter, 12 suppliers (three of which are the same company under different spellings, to prove identity resolution). Here's the moment that makes the point:

**Engineering tightens two requirements** — raise the ingress floor (IP54 → IP65) and drop the 12V option. The system instantly reports, exactly:

- **6 catalog entries** now non-conformant
- **1 new sourcing gap** (a whole slot lost every option)
- **2 in-flight POs at risk**

…and it re-awards the affected slots automatically. The punchline: the cheapest, fastest motor supplier in the quarter was *exactly* the part the engineering change eliminated. No human had to chase that down — the system named it.

One deliberate design choice I'll call out, because it's the interesting part: I did **not** bake the award algorithm into the doctrine. A weighted scorer is *mechanism* — weights and tie-breaks are policy, not law. So the constitution stays thin (invariants only), the scorer lives in the demo layer, and the rule it embodies — *"an award is explainable, and selection can never override the standard"* — is **demonstrated by a test, not declared**. It earns its way into the doctrine only if a second use case needs it.

The whole thing is offline, deterministic, and green under one command: `npm run demo`. The tables in the repo aren't screenshots of a slide deck — they're the program's actual output.

Repo + the full walkthrough in the comments. 👇

Curious what the supply-chain and manufacturing folks here think: where would this break against your real-world procurement reality?

#procurement #manufacturing #supplychain #engineering #systemsthinking
