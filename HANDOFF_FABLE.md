# Handoff: Integrated Ward Companion — prototype build

**Working name:** Ward Companion (provisional — Gubek to rename). Also floated: WardLink, Handover, Chart. Pick later; do not block on this.
**Author of handoff:** Opus (Gubek dictated the raw idea from Hollywood Private placement, 2026-07-06).
**Who builds:** Fable 5 in a Claude Code session, pointed at `~/Code/ward-app/`.
**What this is:** scope + build brief for a **clickable prototype on synthetic data**. NOT a production system, NOT connected to real patient data. Read the "Hard constraints" section before writing code — it defines the boundary.

---

## 1. One-line vision

A **patient-centric** ward app where, for each patient, the team shares **structured notes/handover**, a **secure message thread**, and an **auto-populated results feed** (pathology + imaging) — replacing paper notes and scattered phone messages with one patient-scoped surface.

## 2. The integration insight (why it's ONE app, not two)

Gubek's two ideas fuse around a single atomic unit: **the patient**.

- Idea 1 was "electronic note-taking to replace paper + improve handover."
- Idea 2 was "patient-specific group messaging that pulls in path (Clinipath) + imaging (SKG, PRC)."

They are the same product viewed from two angles. The data model makes this explicit:

```
Patient (the core entity)
 ├── Notes / Handover   (structured, ISBAR-style, versioned)
 ├── Team thread        (group chat scoped to THIS patient)
 └── Results feed       (pathology + imaging, newest first)
```

One patient = one screen with three tabs (Notes / Messages / Results). The team, not the individual, owns the patient record. **Build the patient object first; everything hangs off it.**

## 3. Users & setting

- Primary: junior doctors, registrars, med students on a ward round (oncology ward at Hollywood Private is the origin context).
- Core jobs-to-be-done: (a) capture a note fast on the round, (b) hand over cleanly at shift change, (c) message the team about a specific patient without losing context, (d) see the latest bloods/imaging without logging into three separate portals.
- Device reality: phones + tablets on the ward, some desktop at the station. **Mobile-first, responsive web** for the prototype (no native app needed to prove the concept).

## 4. Prior art — decide the wedge before building (don't skip)

This space is NOT empty. Name these so the differentiation is deliberate:

- **Celo** (AU/NZ) — patient-centric secure clinical messaging. Closest competitor. Does team chat + patient context.
- **Foxo**, **TigerConnect**, **Halo** — clinical secure messaging / handover.
- Hospital EMRs (Cerner, MetaVision, Epic) — own the note + results but are heavy, station-bound, poor at ad-hoc team messaging.

**Candidate wedge (Gubek to confirm):** the *fusion* — Celo does messaging but not structured handover; EMRs do notes+results but not fluid messaging. The bet is that **notes + handover + messaging + results, all patient-scoped, in one lightweight surface** is the gap. If Celo already does "good enough" handover, the wedge weakens — Gubek to sanity-check against a real Celo demo before over-investing.

## 5. Feature scope

### MVP (what Fable builds now — synthetic data only)
- **Patient list** — ward view: name, bed, one-line status, unread badge.
- **Patient → Notes tab** — structured note using **ISBAR** (Identify, Situation, Background, Assessment, Recommendation) or a SOAP option. New note appends to a timeline; notes are versioned/timestamped/authored. A "generate handover" view that rolls the latest notes into a printable/shareable shift-handover list for the whole ward.
- **Patient → Messages tab** — group thread scoped to that patient. Post, reply, @mention. Read receipts optional.
- **Patient → Results tab** — a feed of pathology + imaging results (mock data), newest first, with abnormal flags. Tapping a result shows detail (path: analyte/value/range/flag; imaging: modality, report text, link-out placeholder to PACS).
- **Auth stub** — simple role login (doctor / student), no real identity provider yet.
- **All data is synthetic/seed data loaded from local JSON.** No backend PHI.

### v2 (documented, NOT built now)
- Real results ingestion via **FHIR** (`DiagnosticReport`, `Observation`, `ImagingStudy`) received through secure clinical messaging (HealthLink / Medical-Objects / Argus) — see §6.
- Deep-links into SKG / PRC referrer PACS viewers (InteleViewer-type) instead of embedding images.
- Real auth (hospital SSO / AHPRA-linked identity), audit logging, encryption at rest + in transit.
- Push notifications for critical/abnormal results.

### Explicitly out of scope for the prototype
- Real patient data, real integrations, e-prescribing, billing, TGA-cleared clinical decision support.

## 6. Hard constraints (read before coding)

1. **No real PHI.** The prototype uses synthetic patients only. Do not wire it to any real path/imaging source.
2. **Integrations are not open APIs.** Clinipath (pathology; Australian Clinical Labs), SKG Radiology, and Perth Radiological Clinic (PRC) deliver results via **secure clinical messaging (HL7 v2 / FHIR) into the receiving EMR** or via their own **referrer portals** — there is no public "call our API." Model the results feed against a clean **FHIR-shaped interface** so v2 can swap mock data for real feeds without a rewrite. Provide a `ResultsProvider` interface with a `MockResultsProvider` implementation now.
3. **Governance gate.** Any real deployment needs Hollywood Private's IT/privacy approval (Australian Privacy Principles) and possibly **TGA** assessment (Software as a Medical Device vs clinical-communication carve-out — get legal advice; do not assert it's exempt). The prototype's job is to be the artifact Gubek shows admin to *start* that conversation.
4. **Security posture even in the demo.** Even with synthetic data, build as if PHI: no data in URLs, no third-party analytics, local-only storage for the prototype.

## 7. Suggested stack (Fable's call, but bias toward speed)

- **Frontend:** React + Vite + TypeScript, Tailwind. Mobile-first responsive. (Matches Gubek's existing Lucan stack — familiar to maintain.)
- **State/data:** local JSON seed files + a thin in-memory store; a `ResultsProvider` / `NotesStore` / `MessageStore` interface layer so a real backend can slot in later.
- **No backend for MVP** — everything client-side against seed data. If persistence is wanted, use browser storage, clearly flagged as demo-only.
- Keep it deployable to Vercel as a private demo link Gubek can show on a phone.

## 8. Build order (for Fable)

1. Patient data model + seed JSON (5–6 synthetic oncology-ward patients). ← foundation
2. Patient list + patient detail shell with 3 tabs.
3. Notes tab: ISBAR note capture + timeline + "generate ward handover" view.
4. Results tab: mock path + imaging feed with abnormal flagging + detail view, behind a `ResultsProvider` interface.
5. Messages tab: patient-scoped thread.
6. Polish: mobile layout, empty states, a one-screen "why this exists" landing for the pitch.
7. Deploy private demo link.

## 9. Open decisions for Gubek (resolve as you go)

- Name.
- Wedge confirmation vs Celo (§4) — is the handover+messaging+results fusion real, or does Celo already cover it?
- ISBAR vs SOAP (or both) for the note structure.
- Is the real target a **product to sell** (startup) or an **internal tool to pitch to Hollywood**? This changes v2 heavily (multi-tenant SaaS vs single-site). Flag: ties to Gubek's founder-clinician track.

## 10. Fable guardrail (important)

Building the app scaffolding is software work — fine for Fable. **BUT** Fable's safety filter blocks authoring **clinical/medical content** (notes, pathology values, drug doses) mid-task. So: the synthetic seed data (fake patient notes, mock path values, mock imaging reports, any palliative dosing examples like midazolam/morphine) must be **provided to Fable pre-written** (Gubek or a Sonnet subagent authors `seed/patients.json`), NOT generated by Fable. Fable wires up the UI around seed data it is handed. If Fable hits a "Request was blocked" while writing seed clinical text, that's the filter — hand that file off to Sonnet/Opus and continue. See memory `fable5-blocks-medical-content`.

---

**First action for Fable:** read this file, then build step 1 (patient model + seed JSON) — but wait for Gubek to hand over `seed/patients.json` rather than authoring clinical content itself.
