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

### Entity / branding (updated 2026-07-06 late)
- Parent brand is **Acutis** — "Studio" DROPPED. Gubek pitches as himself; product ships under Acutis.
- **Structure (decided):** ONE sole-trader ABN (an individual only gets one ABN — brands are *business names*, ~$44/yr each, hanging off it). Register business names: Acutis, Bede (+ Lucan, TutorLook if not already). No company yet — at Gubek's income the marginal rate is below the 25% company rate, so incorporation now costs money for nothing.
- **Pilot gate:** the moment Bede approaches a real hospital pilot or any real PHI → incorporate **Bede Pty Ltd** + PI/cyber insurance, and **assign the IP into the company at that point while its value is nominal** (assigning valuable IP later = CGT pain). Company also unlocks the R&D Tax Incentive (43.5% refundable offset, companies only) for Bede dev spend.
- **GST tripwire:** one ABN aggregates ALL sole-trader turnover (tutoring + Lucan + TutorLook + Bede) toward the $75k GST threshold — crossing it means GST on everything incl. tutoring. If combined revenue approaches $75k, incorporate the software side early to get its own threshold.
- No holding-co structure — premature until multiple entities carry real value.
- Never imply a company exists yet. Footer/docs: "Acutis" only; no "Pty Ltd", no compliance claims.

### Wedge
- Gubek has confirmed Celo is not the same product. Wedge = patient-scoped **notes + structured ISBAR handover + messaging + results in one surface**. Say it that way in all copy.

### Name — DECIDED 2026-07-06
- **App = Bede** (St Bede the chronicler → documentation/handover; reads as "bed" → ward beds). Cleared on the AU register 2026-07-06 (no live marks in 9/42/44); rename executed same night.
- **AI layer = name TBD.** ~~Stella~~ **DROPPED 2026-07-06 night** by Gubek after the register check found TM 2162491 (Telepathy Labs Inc.) — live protection for the exact word "STELLA" covering AI virtual-assistant software with voice/NLP/TTS in classes 9+42. Do not re-litigate. Replacement candidates being screened; until then docs say "the AI layer".
- Next session executes the rename: `index.html` title, `Landing.tsx`, `AppShell.tsx` TopBar (keep the DEMO badge), `README.md`, `package.json` name, Vercel project name (`npx vercel@latest project` or dashboard — note the public alias will change from `ward-app-ten.vercel.app`; re-verify and give Gubek the new URL).
- BEFORE the rename ships: domain availability (bede.app / .health / .com.au) + **IP Australia trademark search for BOTH names** (classes 9/42/44) — route to a Sonnet agent with kimi-webbridge. "Stella" is a crowded AU mark (e.g. Stella insurance); as an in-app assistant name under Bede it's lower-risk, but check.

## 3. Vision parking lot — record, do NOT build, do NOT pitch tomorrow

Gubek's long-horizon infrastructure vision, with the honest assessment attached so future sessions don't re-litigate:

- **"Government pays for the servers"** — governments do not fund a startup's hosting. The real versions: (a) procurement — hospital/state contracts price hosting into the service; (b) grants (MRFF digital health, NT digital economy programs, NRF); (c) riding certified public infrastructure. The sovereignty story helps win procurement; it is not free servers.
- **NT / Alice Springs solar data centre** — the strong version of this idea is **Indigenous health-data sovereignty**: an NT facility with Indigenous ownership stake aligns with Closing the Gap Priority Reform 4 (shared access to data) and Gubek's reconciliation ambitions, and NT solar is world-class. Honest constraints: NT grid reliability, connectivity (Darwin has subsea cable landings; Alice Springs is weak), workforce. Decade-scale play, genuinely differentiating in the pitch deck's last slide — one line max tomorrow. **Gubek confirmed 2026-07-06: this keystone stays** — supporting local Indigenous communities is part of the vision, not a discardable slide.
- **Ocean data centre** — Microsoft Project Natick proved the concept then shelved it; no commercial subsea offering exists, and IRAP/health certifications require physical access audits a submerged vessel can't pass. **Drop this leg**; the solar-onshore version carries the same sustainability story.
- **Near-term truth (v2):** AU-region, IRAP-assessed cloud (hyperscaler AU regions or CDC), encrypted, onshore. That is what passes hospital governance.

## 4. AI roadmap (v3) — open-source, locally owned, with the tripwires named

- **Transcription (voice → note):** open-source Whisper-family running **on-prem** ("locally owned" = no PHI leaves the hospital — this is the sovereignty story in miniature and a strong pitch line). TGA guidance: **pure transcription stays outside SaMD; summarising/structuring/drafting crosses into regulated SaMD** (see REGULATORY_AU.md AI tripwire). Build transcription-only first; structuring is a deliberately regulated feature later.
- **Translation — model DECIDED 2026-07-06: human-in-the-loop, not machine output.** Bede does NOT auto-translate clinical content and Gubek does NOT hire translators (hospitals already contract interpreter services — in WA via WA Health language services; becoming a language-services employer is a different business with NAATI credentialing obligations). Bede's role is **workflow**: Stella drafts a translation locally (open models: NLLB / SeamlessM4T, on-prem), a **NAATI-credentialed human certifies it**, Bede stores and serves only the approved version; plus interpreter-booking integration. App chrome/UI may be machine-translated freely. This keeps Bede outside SaMD and outside the liability chain for a mistranslated discharge instruction.
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

## 7. Synchronisation checklist for the next session (do in this order)

1. `git status` + `git log --oneline` — commit any drift from other sessions before touching anything (§0).
2. Trademark/domain check for **Bede** and **Stella** (Sonnet agent + kimi-webbridge) → report to Gubek before renaming.
3. Execute the rename (§2) — app copy says "Bede", "Acutis" (no "Studio") in the Landing footer; Stella appears nowhere in the UI yet (no AI features exist — don't tease vapourware in a clinical pitch).
4. Finish-line polish tasks (§5): PWA manifest/icons → print pass → feedback mailto → security headers → meta/og tags with final name.
5. Rebuild → commit → `npx vercel@latest --prod --yes` → confirm the new public alias with `curl -sI` → **send Gubek the new share URL** (renaming the Vercel project changes it).
6. Re-run the Sonnet click-through verification agent; fix anything it flags; update README.
7. Update memory `project_ward_app_2026-07` with the new URL + status, and keep the MEMORY.md index line current.
8. Anything clinical (seed data changes, AI/Stella prototyping with clinical text) → Sonnet subagent authors it; Fable wires UI only.
