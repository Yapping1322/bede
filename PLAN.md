# Bede master plan (2026-07-06 night)

Everything planned out, in execution order. Facts below were researched on
live official sources and independently re-verified 2026-07-06 (fees and
policies drift — re-check anything marked ⏱ before paying money).

## 1. This week — registrations (total ≈ $94–$216, one evening)

**You already have an ABN — do NOT apply again.**
ABN **90 176 152 317** — YENGKOPIONG, GUBEK SIMON, sole trader, active since
17 Jan 2026, WA 6104, no GST registration, no business names attached
(verified on the public register: abr.business.gov.au). Individuals hold ONE
ABN; re-applying is refused and is an offence. Everything hangs off this one.

1. **myID to Standard strength** (if not already): myID app + 2 Australian
   identity documents. Needed to update the ABN record online.
2. **Add software development as an additional business activity** on the
   ABN: ABR online services → Update ABN record → additional business
   activity (ANZSIC ~6209 Other Computer Related Services). One ABN carries
   up to 5 activities; tutoring stays as-is. Required within 28 days of
   starting the activity. Free.
3. **Register the business names** against the ABN via ASIC Connect
   (connect.asic.gov.au): **Acutis** and **Bede**. ⏱ Fees from 1 Jul 2026:
   $47/1yr or $108/3yr each (verify on asic.gov.au at checkout — our
   verification could only confirm via secondary sources). Multiple names on
   one ABN is fine. Confirmed within ~24h.
4. **Do NOT register for GST.** Holding an ABN doesn't trigger it; mandatory
   only at $75k aggregate turnover across everything on the ABN (tutoring +
   Lucan + TutorLook + Bede). Voluntary registration below that just buys
   you BAS paperwork.
5. Invoices for any Acutis/Bede work: show the business name + ABN; legally
   you are still trading as yourself until the Pty Ltd gate.

## 2. Trademarks (when ready to spend ~$660–$1,320)

- Classes **9 + 42 only** (downloadable software + SaaS). Class 44 is direct
  medical services to patients — not software sold to hospitals; skip it.
- ⏱ Fees (current since 1 Oct 2024, next review Oct 2028): standard $250/class
  with picklist descriptions ($400/class custom); TM Headstart $330/class
  minimum ($200 pre-assessment + $130 convert), examiner feedback in ~5 days.
- **Bede in 9+42 via Headstart ≈ $660** — do this one first; the name is now
  publicly visible on the demo URL, and registration takes ≥7 months
  (3–4 months examination + 2-month opposition window). Acutis can follow.
- File in **your own name** now; assign into Bede Pty Ltd at the pilot gate
  via Deed of Assignment (no IP Australia fee; deed needs ABN/ACN, addresses,
  authorised signatures — get it drafted properly).
- Word mark, not logo — protects the word in any styling.

## 3. AI-layer name (replacing Stella)

Register screen 2026-07-06 (word-exact, classes 9/42, live marks only):

| Candidate | Verdict | Note |
|---|---|---|
| **CECILIA** | ✅ clear | zero live exact-word marks in 9/42 |
| VERA | crowded | live marks exist; none touch AI/voice |
| CLARE | crowded | eyewear + children's education marks; no AI/voice |
| LUCIA | ❌ conflict | IR 1637829 — software in 9+42 |
| IRIS | ❌ conflict | TM 2130038 — software in 9+42 |
| GEMMA | ❌ conflict | pending AI/NLP mark + it's Google's LLM brand |

**Recommendation: Cecilia** — St Cecilia is the patroness of music and song;
for a voice-transcription assistant the fit is exact, and it matches the
Lucan/Bede/Acutis register. Formal clearance (attorney or Headstart) before
it ever ships in UI or marketing. Until then, docs say "the AI layer".

## 4. Architecture — fast, small, local, nationally reachable

**Goals as stated:** website as fast as possible; data as small as possible;
stored locally in the hospital's own system; national access for treating
doctors.

**Correction that shapes everything: "backed up to Medicare" isn't a thing.**
Medicare (Services Australia) is claims and payments only — it stores no
clinical records. The national clinical rail is **My Health Record (MHR)**,
operated by the Australian Digital Health Agency under the My Health Records
Act 2012. That's where "any treating doctor can see it" actually lives, and
the Sharing-by-Default Act 2025 (in force 14 Feb 2025) is pushing pathology
and imaging into it by law — the interoperability tide is with you.

**Fast:**
- Keep the app shell a static SPA on a CDN (today: ~106 KB gzipped —
  hold a <150 KB budget, code-split if it grows).
- v2 is **local-first**: the client keeps a replica of its ward
  (IndexedDB); every read is instant; writes queue and sync in the
  background. The PWA + service worker (started) makes launches instant and
  rounds survivable in wifi dead zones.
- Bede's clinical model is **append-only** (notes are never edited — the
  audit-correct design). Append-only logs sync trivially: no conflict
  resolution, no CRDT machinery, just an ordered event log per patient.
  The compliance property and the speed property are the same property.

**Small:**
- Text is nothing: an ISBAR note is ~1–2 KB; a full ward-year of notes and
  messages is tens of MB. The only heavy thing is photos: compress
  client-side (WebP/AVIF, cap ~2048px, ~200–400 KB each).
- Results stay structured (FHIR resources), never PDFs/images of reports;
  imaging stays a deep-link to the provider's PACS viewer, never copied
  pixels. That single decision keeps the database ~100× smaller.

**Local (per hospital):**
- Single-tenant deployment: one small server (API + Postgres) per hospital,
  on their VMs or a dedicated AU-region IRAP-assessed cloud tenant they
  control. No shared multi-tenant database. This IS the sovereignty pitch,
  and it's what hospital governance can approve.
- Real backups: encrypted nightly into the hospital's backup infrastructure
  (+ optional AU-region object storage), with tested restores.

**National access (staged, honest):**
- **Stage 1 (pilot):** Bede lives inside one hospital; "everyone can access
  it" means the treating team, ward-scoped. Nothing leaves.
- **Stage 2:** integrate with the hospital's EMR and let the EMR's existing
  conformant MHR rails carry discharge/event summaries up. The hospital EMR
  stays the system of record; Bede makes the summaries excellent and
  effortless. This avoids a 12–24-month solo conformance project.
- **Stage 3 (scale, if ever needed):** become a conformant MHR uploader
  directly: HPI-O registration, NASH PKI certificates (issued by Services
  Australia), HI Service integration (IHI/HPI-I/HPI-O), conformance testing,
  clinical safety sign-off. Before building anything here, ask ADHA whether
  a FHIR-first pathway is available — the legacy CDA/SOAP stack is being
  replaced by the Sparked AU FHIR standards, and you don't want to build the
  dying stack. ADHA's reference code: github.com/AuDigitalHealth.
- Ward chatter (messages, clarifications) never goes national — only
  summary documents do. That's both correct and what the law contemplates.
- Grants: MRFF digital-health streams need a research-institution partner —
  Curtin is the obvious one; ADHA runs an industry partnership program.

## 5. Your IP and Claude — the straight answer

- Under Anthropic's Consumer Terms you **retain ownership of your inputs**,
  and Anthropic **assigns you its rights in the outputs**. There is no
  clause letting Anthropic take a user's business plan and sell or
  commercialise it; the privacy policy states it does not sell personal
  data. The model also does not learn from your chats live — another user
  cannot pull your plan out of Claude.
- **The real exposure is the training toggle.** Since Sept 2025, consumer
  plans (Free/Pro/**Max** — including Claude Code) train on conversations
  **by default** unless you opt out. Opted in = up to 5-year retention and
  your sessions can inform future model training. **Action: check
  claude.ai/settings/data-privacy-controls and turn "Help improve Claude"
  off.** Off = 30-day retention on new/resumed sessions. Two carve-outs
  survive opting out: `/feedback` submissions (user-invoked, uploads session
  transcript, 5-year retention — just don't use it on this project) and
  safety-flagged content.
- Perspective: copyright never protected *ideas* anyway — only expression.
  Your protection stack is: trade-secret hygiene (repo stays private; it
  is), trademarks (§2), copyright in the code (automatic, yours), the IP
  assignment into Bede Pty Ltd at the pilot gate, and above all speed of
  execution and clinical relationships. Nobody wins this market by copying
  a plan; they'd have to out-execute you inside WA hospitals.

## 6. Standing gates (unchanged, from HANDOFF_03/REGULATORY_AU)

- **Pilot gate:** real hospital pilot or any real PHI → Bede Pty Ltd +
  PI/cyber insurance + IP assignment + PIA. Unlocks R&DTI (43.5% refundable,
  companies only).
- **GST tripwire:** $75k aggregate across the one ABN.
- **SaMD line:** Bede displays lab-sourced flags and captures human
  decisions; it never computes clinical judgements. AI transcription-only
  first; anything that summarises/structures/drafts is a deliberate,
  regulated step.
