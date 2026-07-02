# X / Twitter thread (ready to publish)

> Best lead: attach **`demo-walkthrough.mp4`** (~77s) to post 1 — video lifts reach and
> tells the whole story. Other attachments are screenshots of the named tables/diagrams
> from the rendered GitHub page (`demo/out/*.md` and `presentation/STORY.md`).

---

**1/**
Engineering and procurement are usually two spreadsheets that never talk.

Change one engineering requirement → someone manually hunts down which parts are now non-compliant and which POs are at risk.

I built a system that does it automatically. One command. Fully synthetic demo. 🧵
[attach: demo-walkthrough.mp4]

**2/**
The whole thing rests on one move:

Separate a product line's INVARIANTS (what never changes) from its VARIABLES (what's free to range).

Name those two things and a *standard* falls out algorithmically — derived, not hand-typed.
[attach: pipeline diagram from diagrams.md]

**3/**
Because the standard is derived, it becomes a live conformance GATE:

product line → standard → vendor catalog → supplier truth → procure-to-pay

Each arrow is enforced in code, not in a process doc.

**4/**
Example: a 7-part sealed DC gearmotor. Each slot (motor, gearbox, encoder, controller, housing, harness, fasteners) gets its own derived standard.

The catalog has to cover every slot, both directions: no gaps, nothing outside the standard.
[attach: coverage table from coverage.md]

**5/**
12 suppliers — and three of them are the SAME company under different names, tax IDs, and feeds ("Acme Steel Inc" / "ACME STEEL" / "Acme Steel Incorporated").

They resolve to ONE identity. Swap in a different system-of-record → identical behavior.
[attach: suppliers.md]

**6/**
Every award *recommendation* is a transparent scorecard, not a gut call.

Price / lead time / risk / past performance, weighted, normalized, ranked — with the reasons shown. Ineligible quotes still appear, with WHY. The tool recommends; a human awards.
[attach: motor scorecard from scorecards.md]

**7/**
The tool doesn't run the buy — it mirrors it. It ingests the ERP's reports
read-only and recommends over that mirror:

demand → PO → receipt → 3-way match → invoice → close.

A mismatched invoice? It recommends a HOLD, with the discrepancy shown. The tool
recommends; a human acts and the ERP records it. It never writes back, and it's
never the source of truth.
[attach: lifecycle diagram from diagrams.md]

**8/**
Closed loop: a supplier's delivery performance is recorded against its identity and feeds the NEXT award.

In the demo, the gearbox award flips the moment performance counts — the cheaper-on-paper vendor loses to the reliable one.

**9/**
Now the payoff. Engineering tightens two requirements: raise the ingress floor (IP54→IP65), drop 12V.

The system instantly names, exactly:
• 6 entries now non-conformant
• 1 new sourcing gap
• 2 in-flight POs at risk

…and re-awards automatically.
[attach: reconcile.md]

**10/**
The kicker: the cheapest, fastest motor supplier of the quarter was *exactly* the part the engineering change eliminated.

No one chased it down. The system surfaced it the instant the requirement changed.

**11/**
Design note I like: the award algorithm is deliberately NOT in the doctrine.

Weights/tie-breaks are mechanism, not law. So the rule — "an award is explainable, and can never override the standard" — is proven by a test, not declared. It earns its way in.

**12/**
It's offline, deterministic, dependency-free. `npm run demo` regenerates every table you saw — they're the program's output, not slides.

Repo 👇 What breaks this against your real procurement world?
[attach: STORY.md top]
