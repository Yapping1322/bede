# Handoff 03: decisions, vision parking lot, and the finish line

**Read HANDOFF_FABLE.md (brief + Fable guardrail §10) and HANDOFF_FABLE_02_SHELL.md first.** This file records the decisions and answers from the 2026-07-06 evening session and defines what the next Fable session finishes. Written the night before Gubek pitches at Hollywood Private.

## 0. Coordination rule (learned the hard way)

Two Claude sessions edited this repo concurrently on 2026-07-06 (files vanished mid-`rm`). **One session at a time.** First action every session: `git status` — if there is drift you didn't create, read it, commit it with a message noting it came from another session, then proceed.

## 1. State as of 2026-07-06 ~17:30

- Build green (`npm run build`), TypeScript clean.
- Full click-through verification by a Sonnet agent: **DEMO-READY**, every screen PASS, zero console errors, mobile layout verified. Known intentional quirk: PACS button disabled ("v2").
- Auth persists in sessionStorage (survives refresh, tab-scoped); Settings reset clears it.
- Persistent amber **DEMO badge** in the TopBar ("Synthetic data only — not for clinical use").
- Git initialized, history clean. Vercel deployed (project `ward-app`, team `yapping1322s-projects`).
- **Shareable URL: `https://ward-app-ten.vercel.app`** — the ONLY public alias (HTTP 200, no login). Per-deployment `ward-*-yapping1322s-projects.vercel.app` URLs 302 to Vercel SSO — never share those.
- After any change: build, commit, `npx vercel@latest --prod --yes`, then curl the alias to confirm 200.

## 2. Decisions recorded

### Entity / branding
- Product ships under **Acutis Studio**; Gubek pitches as himself. Sole-trader ABN (registration pending — on his task list) trading as Acutis Studio; register the business name with ASIC. **Pty Ltd + PI/cyber insurance BEFORE any pilot agreement or real PHI** — sole trader means unlimited personal liability on a health product.
- Never imply a company exists yet. Footer/docs: "Acutis Studio" only; no "Pty Ltd", no compliance claims.

### Wedge
- Gubek has confirmed Celo is not the same product. Wedge = patient-scoped **notes + structured ISBAR handover + messaging + results in one surface**. Say it that way in all copy.

### Name (Gubek to pick; then next session renames everywhere)
Criteria: short, medically neutral, covertly Catholic (sibling to Lucan = St Luke, Acutis = Carlo Acutis).
- **Bede** (recommended) — St Bede the Venerable, the meticulous chronicler (= documentation/handover); reads as "bed" → ward beds; 4 letters, zero overt religiosity.
- **Vesper** — the evening office; the liturgy-of-hours ↔ shift-change resonance (handover IS vespers). Bond-martini association is the only downside.
- **Stella** — Stella Maris, the guiding star.
- Before committing: check domain availability (.app / .health / .com.au) and an IP Australia trademark search — route the search to a Sonnet agent with kimi-webbridge. Rename touches: `index.html` title, `Landing.tsx`, `AppShell.tsx` TopBar, `README.md`, `package.json` name, Vercel project name.

## 3. Vision parking lot — record, do NOT build, do NOT pitch tomorrow

Gubek's long-horizon infrastructure vision, with the honest assessment attached so future sessions don't re-litigate:

- **"Government pays for the servers"** — governments do not fund a startup's hosting. The real versions: (a) procurement — hospital/state contracts price hosting into the service; (b) grants (MRFF digital health, NT digital economy programs, NRF); (c) riding certified public infrastructure. The sovereignty story helps win procurement; it is not free servers.
- **NT / Alice Springs solar data centre** — the strong version of this idea is **Indigenous health-data sovereignty**: an NT facility with Indigenous ownership stake aligns with Closing the Gap Priority Reform 4 (shared access to data) and Gubek's reconciliation ambitions, and NT solar is world-class. Honest constraints: NT grid reliability, connectivity (Darwin has subsea cable landings; Alice Springs is weak), workforce. Decade-scale play, genuinely differentiating in the pitch deck's last slide — one line max tomorrow.
- **Ocean data centre** — Microsoft Project Natick proved the concept then shelved it; no commercial subsea offering exists, and IRAP/health certifications require physical access audits a submerged vessel can't pass. **Drop this leg**; the solar-onshore version carries the same sustainability story.
- **Near-term truth (v2):** AU-region, IRAP-assessed cloud (hyperscaler AU regions or CDC), encrypted, onshore. That is what passes hospital governance.

## 4. AI roadmap (v3) — open-source, locally owned, with the tripwires named

- **Transcription (voice → note):** open-source Whisper-family running **on-prem** ("locally owned" = no PHI leaves the hospital — this is the sovereignty story in miniature and a strong pitch line). TGA guidance: **pure transcription stays outside SaMD; summarising/structuring/drafting crosses into regulated SaMD** (see REGULATORY_AU.md AI tripwire). Build transcription-only first; structuring is a deliberately regulated feature later.
- **Translation:** high-risk. Hospitals mandate accredited (NAATI) interpreters for clinical communication; auto-translating clinical instructions = liability + possible SaMD + NSQHS issues. Safe wedges: translate app chrome/UI freely; clinical content only as **"draft for clinician review"**, or integrate interpreter booking. Open models: NLLB / SeamlessM4T, on-prem.
- **Fable guardrail applies:** any prototyping that touches clinical text (sample transcripts, translated clinical content, seed data) → **Sonnet subagent authors it**; Fable wires UI only. See memory `fable5-blocks-medical-content`.

## 5. "As production-ready as possible" — what that means without PHI (build order)

Real production (backend, SSO, encryption at rest, audit logging, PIA pack) is v2 and gated on money + legal — see REGULATORY_AU.md. What the next session CAN do:

1. **PWA**: manifest + icons + theme colour so clinicians can Add to Home Screen and it launches full-screen like a native app. Biggest perceived-quality win per effort.
2. **Print pass**: verify `/handover` print output actually looks right (`no-print` / `print-expand` classes exist — test them, fix page breaks).
3. **Feedback capture**: a "Send feedback" mailto link on Landing + Settings (NO third-party form/analytics — demo posture forbids it).
4. **Security headers** in `vercel.json` (CSP, X-Frame-Options, Referrer-Policy) — cheap, and looks right when a hospital IT person inspects it.
5. **Meta/polish**: favicon, `<title>`, description, og tags with the final name.
6. **Optional passcode gate** (client-side, demo-weight) if Gubek wants the link semi-private; Vercel's real password protection is a paid feature. Decision is his — an open link with synthetic data + DEMO badge is defensible.
7. Rename per §2 once Gubek picks.
8. After all changes: rebuild → commit → redeploy → curl alias → re-run the Sonnet click-through verification agent (prompt pattern in session of 2026-07-06) → update README if structure changed.

## 6. Standing constraints (unchanged)

- Synthetic data only; no real PHI; no third-party requests/analytics; nothing beyond the tab.
- No compliance claims anywhere in copy ("secure", "encrypted", "compliant", "TGA-exempt" are all banned words until true).
- Results flags must remain **lab-sourced, display-only** — the app must never compute abnormality (that's the SaMD line). Keep saying "flags come from the pathology report; we display them."
- REGULATORY_AU.md is the compliance map (corrected 2026-07-06: Class IIa+ post-2021, excluded-vs-exempt, WA PRIS Act, AI tripwire, incumbents).
