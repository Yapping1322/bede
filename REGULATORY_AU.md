# Regulatory & compliance map — becoming the trusted clinical app in Australia

**Purpose:** the laws, standards, and certifications a patient-data clinical app must satisfy to be safely and lawfully deployed in Australia — and the ones that, once achieved, become a **moat** (hard for competitors to match, and what hospital procurement demands).

**Status of this document:** researched map, NOT legal advice. Every item below must be confirmed with a **health-law solicitor** and, for device classification, a **TGA regulatory consultant**. Treat as a checklist to verify, not settled fact. See memory `validate-100-percent-for-accuracy`.

---

## Tier 1 — the four that decide whether you can legally exist

### 1. TGA — is it a medical device? (Software as a Medical Device, SaMD)
- The **Therapeutic Goods Administration** regulates software that has a *medical purpose*. Since Feb 2021, "software-based medical devices" are explicitly in scope.
- **The pivotal question:** does the app **influence a clinical decision**, or is it **communication/administration only**?
  - Pure **secure messaging, note storage, results *display*** may fall under the TGA's **clinical-communication / administrative exclusions** (carve-outs introduced 2021 for software that just enables communication, storage, or display without processing/interpreting for a clinical conclusion).
  - The moment it **flags/interprets** results (e.g. auto-highlights a critical potassium, triages, alerts), it likely becomes a **Class I or higher SaMD** and needs **ARTG inclusion**.
- **Action:** get a written **classification opinion** early. Design the MVP to sit *inside* the exclusion (display + communicate, don't interpret) to defer device regulation — then add clinical-decision features as a deliberately regulated v2.

### 2. Privacy Act 1988 + Australian Privacy Principles (APPs)
- Health information is **"sensitive information"** under the Act — the highest protection tier.
- Key APPs: APP 3 & 6 (collection/use limited to purpose + consent), APP 6 & the health carve-outs, APP 8 (**cross-border disclosure** — matters if any cloud region is offshore), APP 11 (**security** — reasonable steps to protect), APP 5 (collection notices), APP 12/13 (access & correction).
- **Notifiable Data Breaches (NDB) scheme** — mandatory breach notification to the OAIC and affected individuals.
- **2024–25 Privacy Act reforms** are tightening this (statutory tort for serious invasions of privacy, higher penalties) — verify current state at build time.
- **Action:** APP-compliant privacy policy + collection notices, data-flow map, breach-response plan, and a decision on **data residency (keep it onshore)**.

### 3. My Health Records Act 2012 + Healthcare Identifiers Act 2010
- If the app ever connects to **My Health Record** or uses **IHIs (Individual Healthcare Identifiers)** / HPI-I / HPI-O identifiers, these Acts impose strict, criminal-penalty-backed rules on handling.
- Connecting to the national infrastructure requires **conformance/registration with the Australian Digital Health Agency (ADHA)**.
- **Action:** for the prototype, **do not touch** My Health Record or real IHIs — it massively raises the compliance bar. Flag as a deliberate v3 integration.

### 4. State/territory health records law
- On top of federal law: e.g. **Health Records and Information Privacy Act (NSW)**, **Health Records Act 2001 (Vic)**. WA has no standalone health-privacy Act (federal APPs + WA Dept of Health policy apply), but **public hospital data is governed by WA Health's own information governance** — and private hospitals (SJOG, Hollywood/Ramsay) each have their **own IT & privacy governance** you must pass.
- **Action:** any real deployment = that specific site's **information-governance / privacy-impact-assessment (PIA)** sign-off. This is the practical gate, more than any statute.

---

## Tier 2 — the certifications that make you "the one and only" (the moat)

These are what hospital procurement and CISOs demand. Achieving them is expensive and slow — which is exactly why they're a competitive moat.

- **ISO/IEC 27001** (information security management) — the baseline enterprise-security certification. Table stakes for selling to any hospital.
- **ISO 27799** — health-specific information security.
- **Essential Eight (ACSC)** maturity — the Australian Cyber Security Centre's mitigation framework; government/health procurement increasingly requires a maturity level.
- **IRAP assessment** — if you ever host government/public-health data, Information Security Registered Assessors Program.
- **ISO 13485** (medical-device quality management) — required *if* you become regulated SaMD.
- **ISO 14971** (medical-device risk management) + a **clinical safety case** — Australia is aligning with clinical-risk-management practice (cf. UK DCB0129/0160); demonstrating clinical safety management is a differentiator.
- **National Safety and Quality Health Service (NSQHS) Standards** alignment — the ACSQHC standards hospitals are accredited against; showing your app *supports* Standard 1 (clinical governance), Standard 6 (communicating for safety — **clinical handover is literally Standard 6**), and the Comprehensive Care standard is a direct sales argument.
- **HL7 FHIR AU (AU Core / AU Base) conformance** — building to the **Australian FHIR implementation guides** is what lets you interoperate with Best Practice, MedicalDirector, Genie, hospital EMRs, and pathology/imaging feeds. This is both a technical requirement and a moat.

## Tier 3 — operational / commercial

- **Cyber & professional indemnity insurance** covering a health-tech product.
- **Medical indemnity implications** — if the app is used in clinical care and fails (missed result, lost handover), liability exposure. Contracts must allocate this.
- **Terms of service + clinical disclaimer** (educational/tool-only where applicable; not a substitute for clinical judgement) — lawyer-drafted.
- **Data Processing Agreements** with any sub-processors (cloud, push-notification, error-logging vendors) — and vendors must themselves be onshore/compliant.
- **Accessibility** — WCAG 2.1 AA (procurement often requires it).
- **Company + governance** — appropriate entity, a named clinical safety officer, an information security officer.

---

## The strategic sequence (how to actually win, cheaply first)

1. **MVP inside the exclusions** — display + communicate on synthetic data → NO device regulation, NO real PHI, NO certification needed to *demonstrate*. Build the pitch artifact.
2. **Pilot with one site** — pass ONE hospital's PIA + information-governance (start with the private group you're placed at). One real reference site is worth more than any certification for early credibility.
3. **Then buy the moat** — ISO 27001 → FHIR AU conformance → NSQHS Standard 6 alignment. These take 6–18 months and real money; do them once you have a paying/committed pilot, not before.
4. **Regulate deliberately** — only add interpreting/alerting features (and take on SaMD/ARTG + ISO 13485) when the clinical value justifies the regulatory load.

**The honest contrarian read:** "the one and only in Australia" is won less by having every certificate and more by being the **first to pass a real hospital's governance and prove it in a live handover workflow**. Certifications are the *cost of scaling* that beachhead, not the thing that creates it. Sequence accordingly — don't spend a year on ISO 27001 before a single ward has said yes.

**Immediate action for Gubek:** book 30 min with a **health-law solicitor** and a **TGA regulatory consultant** to (a) get the device-classification opinion and (b) confirm the current post-2024-reform Privacy Act position. Those two conversations de-risk the entire build.
