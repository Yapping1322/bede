# Strategy — where Bede goes and why (2026-08-21)

**Status:** decision record. Research below was gathered by four parallel
research passes on live primary sources on 21 Aug 2026. Anything marked ⏱ was
not verifiable from a primary source and must be confirmed before it carries
weight in a funding application, an IG document, or a contract.

Companion docs: `REGULATORY_AU.md` (compliance map), `OPERATIONS.md` (AI
boundary, staffing, integration), `legal/IMAGE_TRANSFER_DESIGN.md` (pixels),
`ROADMAP_ROLES.md` (per-role gaps), `PLAN.md` (Bede/Acutis business plan).

---

## 1. The decision

**Wedge: the structured clinical-data layer for high-acuity and ward settings,
built restate-only.**

Not a scribe. Not a GP tool. Not a hospital-wide system. The three things that
make this the choice:

1. **The incumbents don't do structured data.** RACGP's own guidance says AI
   scribes "predominately only deliver free-text consultation notes and rarely
   populate structured data entry fields." Heidi's documentation concedes it
   cannot write medications, pathology results, immunisations or allergies —
   those "require separate APIs and separate reconciliation workflows."
2. **Nobody reads results.** Across every verified BP Premier integrator
   (Cubiko, HotDoc, Heidi, Lyrebird, Whitecoat), not one reads pathology or
   radiology *result content*. They touch appointments, demographics, billing.
3. **The high-acuity setting is conceded.** SA Health purpose-built its own
   scribe (AUScribe) for the Queen Elizabeth Hospital ED rather than adopt
   Heidi or Lyrebird. Peer-reviewed work notes scribes were "initially tested
   in low-acuity ambulatory settings" and that inpatient deployment raises
   distinct unresolved problems (multi-speaker diarisation on one device).
   Bede is a ward app. Same room.

**Route to market:** WA single-site pilot under the $50,000 verbal-quotation
threshold, sponsored by a clinical champion. Not open tender — see §5.

---

## 2. What is explicitly NOT the plan

**Not an ambient scribe.** Lyrebird has been **free to every BP Premier
customer since 16 Feb 2026** — natively embedded, unlimited consult notes,
zero dollars — and Best Practice holds ~80% of AU GP practice-management-
software share. Heidi sits at ~US$465M valuation on ~US$96M raised, several
hundred staff, 73M consultations, and is now acquiring (AutoMedica, UK, Feb
2026). In hospitals, **Epic shipped native AI Charting Feb 2026** and Oracle
Health has native voice, so any third-party scribe in an Epic site competes
with a bundled zero-integration-cost alternative. NSW selected Epic in 2023 for
its statewide record; that barrier grows, it does not shrink. Independent
adoption data (Healthed/Medical Republic, n=1,535 GPs, May 2026): 18.7% of GPs
personally use a scribe — vendor claims run well ahead of measured use, but the
category is contested by two funded incumbents, not open.

**Not BP Premier first.** Since **1 Jan 2026 Halo Connect is the sole
sanctioned connection method** to BP Premier (old BPSRawData/BPSViewer SQL
logins deprecated; mandatory pairing codes from 1 Feb 2026), and Halo will not
provision an integrator who is not already an approved **Bp Partner Network**
member. Two gates. ⏱ Partner fees, NDA terms and approval timelines are
undisclosed in every public source. Critically: whether Best Practice will
grant a new solo-founder partner read access to the *results and
correspondence* tables has **no public precedent in either direction** — that
single unknown would gate the entire GP path.

*Side door if the GP path is ever revisited:* path and rad results reach BP
Premier via HealthLink or Medical-Objects **before** they are written to the
database. Becoming a secondary copy-to recipient of that HL7 feed sidesteps
Best Practice's read gate entirely. HealthLink's newer FHIR layer (Smart API+/
Helix) is application + waitlist, not open.

**Not a statewide hospital system.** WA's statewide EMR (Stage 2) closed its
EOI May 2025, targets HIMSS EMRAM stage 6, 10-year term + 10-year options,
rollout from ~2028, ⏱ vendor not yet announced publicly. That programme is the
biggest structural unknown hanging over Bede — whatever lands either subsumes a
standalone ward app or becomes the thing it integrates with. Not resolvable
today; revisit when the vendor is named.

---

## 3. The regulatory line, and why the current build sits on the safe side

TGA's **digital scribes** guidance (last updated 30 Jan 2026) draws the test
precisely:

> "Digital scribes intended only to transcribe and translate clinical
> conversations into written records without performing analysis or
> interpretation are not considered medical devices... However, if a digital
> scribe analyses or interprets clinical conversations — for example by
> generating a diagnosis, differential diagnosis or treatment recommendation
> **not explicitly stated by the healthcare practitioner** — it is considered a
> medical device."

`src/lib/reportSummary.ts` and `src/components/ReportSummaryCard.tsx` were built
to exactly that contract, before this research existed:

- the reporting doctor's impression is reproduced **verbatim**, never rewritten
- every restated line carries a `[start, end)` character span back into the
  source report, and the UI highlights it on click
- the source text is always on screen; the summary never replaces it
- sentences are bucketed **grammatically** (positive statement / explicit
  negative / called normal), never clinically — the engine does not decide what
  is abnormal
- verified: all 7 seed imaging reports, every span reproduces its source text
  character-for-character

**This is the product's defensible position, not a compliance afterthought.**
Anything that adds a conclusion of its own crosses the line and needs a written
classification opinion first (`REGULATORY_AU.md` §1: Class IIa minimum
post-2021, ARTG inclusion, ISO 13485 + 14971, clinical safety case).

### The enforcement clock — this is live

**4 Aug 2026:** the TGA moved from twelve months of vendor engagement into
**compliance and enforcement action** against scribe suppliers whose products
meet the medical-device definition without ARTG listing. No Australian scribe is
currently TGA-approved as a device. No vendors named publicly yet. ⏱ Outcomes
pending — watch this, it reprices the whole category.

Related: `Understanding clinical decision support system software regulation`
(TGA, rewritten 7 Oct 2025) confirms AI/black-box CDSS **cannot** be exempt.

---

## 4. Correction to OPERATIONS.md §4 — cloud AI is not banned

`OPERATIONS.md` previously said to assume hospital privacy officers refuse
cloud AI on PHI and not to architect around it. **That is not supported.**

**WA Health Cloud Policy MP 0140/20** (mandatory under s.26(2)(k) Health
Services Act 2016) defines three zones — **A** HealthNext, **B** third-party
Australian-hosted, **C** offshore. Zone B is permitted at medium risk with a
documented risk assessment, compliance with the Cloud Service Requirements and
the ICT Governance and Approvals Process, and notification to HSS infosec. The
only bar is conditional: do not proceed "if the confidentiality of personal
information cannot be adequately understood, managed or controlled." No
on-premise-only rule exists anywhere in the framework.

Corroborated independently: both AU scribe incumbents run AU-region cloud
today, and no state health department ban was found. Note contracted health
entities (SJOG, Ramsay) sit **outside** this policy and set their own — Ramsay
runs a national Google Cloud strategy.

**Consequence for the build:** the `SummaryProvider` seam
(`src/data/providers.ts`) still holds, but a real AU-region model can sit behind
it. The current rules engine is a demo stand-in, not a permanent architecture.

---

## 5. Route to a first site

**WA Health procurement thresholds** (WA Health Procurement Procedures, Rule
D1.1/D1.2):

| Value | Market approach | Contract form |
|---|---|---|
| Up to **$50,000** | **Verbal quotation** | Very Simple Contract Terms |
| $50,000–$249,999 | Written request (RFQ/RFT/EOI) | Simple Contract Terms |
| $250,000+ | Written request | General Conditions of Contract |

A sub-$50k single-site pilot needs only a verbal quotation — no tender.
Realistically 2–4 months with a sponsoring clinician. Anything ≥$50k goes
through Tenders WA (14 days advertising with pre-published Early Tender Advice,
25 days without).

**Every documented precedent got in the same three ways** — and cold entry via
open tender with no relationship and no grant vehicle appears in **zero** cases:

- **Named innovation pathway.** Personify Care entered via SA's Go2Gov: a
  government-funded co-design pilot at Royal Adelaide/QEH from 2021, converted
  to a $5.6M statewide SA Health contract. ~3–4 years PoC to statewide. **WA has
  no Go2Gov equivalent** — its "innovation hubs" are co-working space, not a
  pilot-to-contract mechanism.
- **Insider relationship.** Alcidion's founder was previously head of the SA
  Health Commission; first footholds were in his home state.
- **Single-department clinical champion below threshold.** Ramsay's AI
  documentation pilot ran at one Ipswich site off internal clinical sponsorship,
  no tender.

**Bede's version of door 3:** clinical placement access, and Kalgoorlie 2027 —
a rural site with a short enough decision chain that a clinical champion can
actually carry a sub-$50k pilot.

**WA current systems, for context:** no statewide EMR yet. webPAS is the PAS
backbone. The "Digital Medical Record" (Altera Opal, formerly BOSSnet) is in
~25 WA public hospitals — a scanned-document viewer, **not** an order-entry EMR
with decision support. SSO completed Aug 2025 (NTT, 27,000 clinicians, ~90
clinical apps). $247M invested in EMR Stage 1 to date.

---

## 6. Dated clocks

| Date | What |
|---|---|
| **28 Sept 2026, 11:59pm AEST** | **ANDHealth+ second 2026 intake closes.** Up to A$5M, milestone-tranched, **non-dilutive — no equity, no IP transfer**. Wants proof-of-concept-stage evidence-based digital/connected health. Opened 20 Aug 2026. No flip, no relocation, no batch. **The single most actionable funding lever.** |
| **1 Jan 2027** | WA **PRIS Act 2024** breach-notification scheme commences |
| **1 Jul 2027** | PRIS Act core obligations commence. Imposes specific obligations where an automated process makes a "significant decision" about a person's healthcare — i.e. clinical AI, named in statute |
| **~2028** | WA statewide EMR Stage 2 rollout begins |
| ongoing | TGA scribe enforcement action (opened 4 Aug 2026), outcomes pending |

---

## 7. Costs, corrected

- **ISO 27001**, 1–5 person AU company: **A$12,000–30,000 first year, 4–9
  months**, then A$5–15k/year surveillance. This was previously framed as a
  years-and-real-money moat. It is a fundable line item, and it is the one
  certification AU hospital CISOs actually ask for. ⏱ sourced from AU security
  consultancies (consistent across four), not primary pricing.
- **Essential Eight** Maturity Level 2 is the appropriate target for health.
- **IRAP and SOC 2** are not proportionate unless chasing Commonwealth/Defence
  work or a site demands it explicitly.
- **AU R&D Tax Incentive**: 43.5% refundable offset under A$20M turnover.
- **Delaware flip** (only if YC is ever pursued): ~US$30k to A$80k with proper
  AU+US advice, A$10–20k/year ongoing, 4–8 weeks. Div 615 or Sub-div 124-M can
  defer CGT but relief is not automatic and may need an ATO private ruling. R&D
  Tax Incentive usually survives if the AU entity genuinely performs and owns
  the R&D. ⏱ ESIC almost certainly does **not** survive (new investors buy into
  a US parent; ESIC requires Australian incorporation) — this is an inference
  from a confirmed rule, not a sourced statement about flips. Confirm with an
  accountant before relying on it.

**On YC:** the gate is not acceptance odds, deal terms, or the regulated
product. Solo founders get in (~10–15% of a batch ⏱, secondary-sourced) and
YC's own writing treats regulatory difficulty as a moat, not a red flag
(Graham, "Schlep Blindness"). The gate is the **three-month in-person San
Francisco batch**, which collides with a clinical degree. YC's own off-ramp is
**Early Decision** — apply while enrolled, get funded, spot held until
graduation. That, not "get more traction," is the mechanism if YC is ever the
plan. Standard deal: US$500k = $125k for 7% + $375k uncapped MFN SAFE.

---

## 8. Medico-legal notes that double as sales arguments

- **WA is an all-party consent state** for recording private conversations
  (with ACT, NSW, SA, Tas). Criminal implications. Verbal consent documented in
  the record at the start of each consult is the accepted mechanic; written
  consent is not mandatory. A waiting-room sign is explicitly **not** sufficient
  (MDA National, 29 Jul 2026).
- **Liability sits with the clinician, always.** Avant: *"It will not be a
  defence to say that it was produced by an AI scribe."*
- **Documented harm exists.** ABC News, 14 Aug 2026: a scribe fabricated a
  patient's psychedelic-mushroom use, which a urologist's post-op letter then
  used to explain kidney bleeding. Clinicians at an Avant webinar describe
  hallucinations as "frequent" — one scribe "made up a whole neurological exam
  when I didn't perform one." A 2025 study ⏱ found up to 20% of notes contained
  major errors, ~75% of them omissions. Prof. Enrico Coiera has publicly asked
  vendors to publish hallucination rates; none have.

Provenance-linked restatement — every line traceable to source, source always
on screen — is the direct answer to all three. That is a sales argument, not
just a safety posture.

---

## 9. Next actions

1. **ANDHealth+ application** — 38 days. The only funded path that costs no
   equity and no IP.
2. **Find the clinical champion.** Door 3 is the only door. Sub-$50k, one site.
3. **Write the Zone B risk assessment** rather than assuming on-prem. It is now
   the cheaper path and the policy supports it.
4. **Structured write-back is the differentiator** — nobody has solved it,
   both incumbents concede it. Build toward it, restate-only.
5. **Do not** pursue Bp Partner Network until 1–3 are moving.
