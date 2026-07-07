# HANDOFF_FABLE_04 — legal-transfer follow-ups (2 small tasks)

> **STATUS: DONE 2026-07-07.** Both edits applied, build green, all greps pass.
> Uncommitted in the working tree along with a same-day UI polish pass
> (Login full-height, WardList Bed/Recent sort, ResultsTab imaging filter).

Two surgical, non-clinical edits that fall out of the `legal/` research
(`legal/EXTERNAL_TRANSFER_LAW.md`, `legal/IMAGE_TRANSFER_DESIGN.md`). Both are
mechanical. Do exactly these two edits and nothing else. Match existing style.
Do not refactor, reformat, or touch adjacent code.

**Before editing:** open each target file and Read it first (contents may have
moved). The `old_string` blocks below must match byte-for-byte; if they don't,
re-locate by the surrounding context and adjust, do not force.

---

## Task A — collision-proof attachment IDs

**File:** `src/components/NotesTab.tsx` (inside `readFiles`, ~line 42)

**Why:** attachment IDs are currently built from `filename-size-lastModified`,
which collides if the same photo is attached twice. In a medical record, silently
de-duplicating two photos could hide a change in condition between encounters.
Use a random UUID so every attachment is unique. `crypto.randomUUID()` is
available in the browser (secure context / PWA over https) and typed by the DOM
lib — no import needed.

**Edit — replace exactly:**

```
          id: `a-${file.name}-${file.size}-${file.lastModified}`,
```

**with:**

```
          id: crypto.randomUUID(),
```

**Note (do NOT "fix" this):** the caller at the `onAdd={...}` prop de-dupes by
`id`. With a random UUID that de-dupe becomes a harmless no-op — this is the
intended behaviour (two attaches of the same photo should both be kept). Leave
the `onAdd` line as-is.

---

## Task C — point PLAN.md at the legal research

**File:** `PLAN.md` (append a new section 7 after the end of section 6)

**Why:** the `legal/` folder now holds the external-transfer research + the
downloaded Acts. The master plan should point at it.

**Edit — find the last bullet of section 6 (exactly):**

```
- **SaMD line:** Bede displays lab-sourced flags and captures human
  decisions; it never computes clinical judgements. AI transcription-only
  first; anything that summarises/structures/drafts is a deliberate,
  regulated step.
```

**Replace it with that same block followed by the new section (i.e. keep the
block, add everything below it):**

```
- **SaMD line:** Bede displays lab-sourced flags and captures human
  decisions; it never computes clinical judgements. AI transcription-only
  first; anything that summarises/structures/drafts is a deliberate,
  regulated step.

## 7. External transfer of images + health info (see `legal/`)

Full detail: `legal/EXTERNAL_TRANSFER_LAW.md` (the lawful gateways) and
`legal/IMAGE_TRANSFER_DESIGN.md` (the channel + mechanics). The primary Acts are
downloaded under `legal/`. Not legal advice — verify the `[verify]`-tagged items
with a health-law solicitor before any real PHI.

**Thesis:** the law does not prohibit sending a patient's info/images to another
treating provider — it conditions it. Make every transfer land inside a named
lawful gateway (APP 6.2(a), the directly-related-secondary-purpose / treating-team
referral gateway) and keep every hop onshore.

- **Two image cases.** Radiology (`ImagingResult`) never needs pixels to leave —
  the PACS deep-link + the MHR text report already cover it. Only clinical photos
  (`NoteAttachment`) are ever "pixels out", and those scenarios are rare.
- **Onshore is the whole game.** AU-region deploy (ap-southeast-2) + a DPA meeting
  the OAIC three-condition "use" test → APP 8 / s 16C never engage. The AI layer
  sending images to an overseas LLM would re-trigger APP 8 — keep inference
  onshore or de-identify.
- **Channel: do not become the transfer operator.** Integrate the hospital's
  existing secure-messaging rail (HealthLink / Medical-Objects) — already
  CISO-approved, and it handles recipient auth, encryption, and audit. Kiteworks
  is bulk IT-to-IT only; MHR carries reports, not pixels.
- **Stage 1 (now): no outbound photo transfer.** Pixels stay in the hospital.
  Correct scope for a solo founder pre-pilot; do not build the pixel-out path yet.
- **Build to stay lawful (v1 of a real deploy):** consent capture as a log event
  (photography needs its own consent line, not just treatment consent); a
  purpose/gateway flag + an immutable audit event per outbound item; AU-region
  residency; a per-image selector that defaults to single-image (minimum
  necessary).
```

---

## Verify

From the repo root:

```
npm run build
```

- Build must pass (this runs `tsc` + `vite build`). A `crypto.randomUUID` type
  error means the DOM lib is not picking up — check `tsconfig.json` `lib`
  includes `DOM`; it should already.
- `grep -n "crypto.randomUUID" src/components/NotesTab.tsx` → one hit.
- `grep -n "a-\${file.name}" src/components/NotesTab.tsx` → no hits.
- `grep -n "## 7. External transfer" PLAN.md` → one hit.

## Done when

- Both edits applied, `npm run build` green, greps as above.
- Nothing else changed. `git diff --stat` shows only `NotesTab.tsx` and `PLAN.md`.
- Do NOT commit unless Gubek asks.
