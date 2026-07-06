# Operations, integration and AI-boundary answers (2026-07-06)

Gubek's questions, answered honestly. Companion to REGULATORY_AU.md.

## 1. How do I actually get the SKG / PRC / Clinipath data?

There is no public API to call. The real routes, in order of realism:

1. **Secure clinical messaging endpoint** — Medical-Objects / HealthLink.
   Pathology and radiology providers already deliver results as HL7 v2 (ORU)
   messages to any registered, conformant receiving system — that is how GP
   software gets them. Bede (or the clinic/hospital running it) registers as
   a receiving endpoint; results flow in; Bede maps HL7 → its FHIR-shaped
   store (`ResultsProvider` was designed for exactly this swap).
2. **Hospital integration engine** — inside Hollywood, results already land
   in the hospital's systems. Integration there means connecting to *their*
   interface engine under *their* governance. The pitch conversation with
   hospital IT IS the integration conversation.
3. **Direct agreements** with each provider for delivery to a named system —
   what route 1 formalises; they will ask about conformance and security.

None of this is buildable before the pilot gate (entity, insurance, security
posture). The demo's mock feed deliberately matches the shapes these routes
deliver.

## 2. "Everyone knows who wrote/edited what"

Current design is already the clinically correct model: **append-only**.
Every note and message carries author + timestamp; nothing is silently
editable; corrections happen as clarification replies or new notes. Keep it —
edit-in-place is what hospitals fear. v2 adds a server-side immutable audit
log (every read and write, who/when/what) — hospital governance requires it
regardless.

## 3. Staffing to run it without Fable

The repo is deliberately boring tech (React + TypeScript + Vite; no backend
yet). Any competent mid-level web developer can maintain it; the HANDOFF_*
docs are the onboarding.

- **Demo stage (now):** zero employees. A freelance senior React/TS
  contractor on an hours-as-needed basis (a few hours/month) covers anything
  Gubek doesn't want to touch.
- **Pilot stage:** ~1 senior full-stack contractor (0.4–0.6 FTE), managed
  AU-region hosting (the cloud provider is the "ops team"), a fractional
  security/privacy consultant for the PIA + pen-test (engagements, not
  hires). Total ≈ 1–1.5 FTE equivalent.
- **Do not** hire a team pre-revenue; do not run own servers pre-pilot.

## 4. Using AI without violating privacy

The boundary is **the data, not the tool**:

- **AI on the codebase = always fine.** The repo contains no PHI — only
  synthetic seed data. Claude/Copilot can build, refactor and maintain Bede
  forever without a privacy question, because the code never contains
  patient data. That separation is the reason the demo was built this way.
- **AI on patient data = on-prem only.** The Stella plan: open-weight models
  (Whisper for transcription) running on hospital-controlled hardware, PHI
  never leaves the network. This is the only version hospital governance
  passes today.
- **Cloud AI APIs on PHI** — even with zero-retention enterprise contracts,
  assume hospital privacy officers say no in 2026. Don't architect around it.
- **De-identification** as a boundary is fragile (re-identification risk);
  don't rely on it early.

Breach prevention is mostly not about AI: least-privilege access, SSO + MFA,
encryption in transit/at rest, audit logging, no third-party scripts, and a
tested incident-response plan (OAIC notifiable-breach scheme applies). The
demo already practises the posture: no analytics, no data in URLs, nothing
stored outside the tab.
