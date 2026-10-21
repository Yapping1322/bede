# Bede — prototype (an Acutis concept)

Two surfaces on synthetic data: a patient-centric ward app (structured ISBAR
notes and handover, team message thread, pathology + imaging feed with
lab-reported flags) and a clinic day (appointment book, duration prediction,
group bookings, consent and intake gates, consult clock, billing proposals).
Clickable demo on **synthetic data only** — see `HANDOFF_FABLE.md` for the brief,
`HANDOFF_FABLE_03_FINISH.md` for the earlier decisions/constraints, and
`HANDOFF_FABLE_05_COMPLETE.md` for the 21 Oct 2026 completion pass.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
npm test           # unit tests via Vitest
npx tsc --noEmit   # typecheck
```

## Deploy

Live demo: **https://bede-demo.vercel.app** (also https://ward-app-ten.vercel.app,
kept so older links/QRs survive). Vercel project `bede`, team `yapping1322s-projects`.

```bash
npx vercel@latest deploy --prod --yes    # from this directory
```

## Routes

`/` ward list + "since you last looked" digest (desktop: master–detail split) ·
`/patient/:id/{notes,messages,results,tasks}` (layout route — header/tab bar
render once) · `/tasks` ward-wide task list (filter by owner and kind) ·
`/clinic` the appointment book · `/handover` (printable) · `/settings` (role
switch + demo reset). Unknown routes redirect home; URLs carry nothing beyond
the opaque `:id`.

`/patient/:id/voice` exists **in dev only** (`import.meta.env.DEV`). It is
verified absent from the production bundle.

## Structure

- `src/types.ts` — data model. Patient is the atomic unit on the ward; the clinic
  domain is separate (`ClinicPatient`, `Appointment`) and appended below it.
  Result shapes are FHIR-adjacent for the v2 swap.
- `src/seed/patients.json` — synthetic ward seed (6 oncology patients, staff,
  notes, messages, results, tasks). Entirely fictional.
- `src/seed/clinic.json` — synthetic clinic seed: patients, households,
  per-clinician policies, and history stored as offsets so the demo cannot rot.
- `src/data/providers.ts` — the interfaces the UI depends on: `PatientStore`,
  `NotesStore`, `MessageStore`, `ResultsProvider`, `TaskStore`, `ScheduleStore`,
  `SummaryProvider`.
- `src/data/mockStores.ts`, `src/data/scheduleStore.ts` — implementations over the
  seed JSON. v2 replaces these with real feeds without touching components.
- `src/data/visitStore.ts` — session-scoped "last opened" marks for the ward list.
- `src/lib/persistence.ts` — browser-local snapshots (see Demo posture).
- `src/lib/digest.ts` — "since you last looked", newest-first, display only.
- `src/lib/consultDuration.ts` — the duration predictor: shrinkage from the
  patient's own median toward the clinician's, additive reason tags, a
  sub-additive group rule. Structurally unable to see the fee schedule; that is
  enforced by tests that read its source.
- `src/lib/mbsItems.ts` — item time thresholds only. **No fees anywhere.**
- `src/lib/clinicClock.ts` — running-late arithmetic from the wall clock.
- `src/lib/transcriptExtract.ts` — routes recognised sentences to allergy /
  medication / result fields as verbatim slices; a human accepts every one.
- `src/components/` — `AppShell`, `MasterDetailLayout`, `WardList`, `WardHome`
  (digest), `SinceLastLook`, `PatientShell` + tabs, `TasksPage`, `HandoverPage`,
  `SettingsPage`, `Landing`, `Login` (staged demo sign-in: identity → password →
  2FA → ward scope; none of it is real security), and the clinic components
  (`ClinicDay`, `BookingPanel`, `AddParticipantPanel`, `IntakeForm`,
  `ClinicDaySummary`, `PatientHistory`).
- Companion docs: `ROADMAP_ROLES.md` (per-role gap analysis), `OPERATIONS.md`
  (integration/staffing/AI-boundary answers), `REGULATORY_AU.md` (compliance map),
  `STRATEGY.md` (decision record).
- `src/index.css` — design tokens (`accent`, `alert`, `warn`, `ok`) via Tailwind v4
  `@theme`.

## Demo posture

Even with synthetic data the prototype behaves as if it held PHI: there are no
third-party requests or analytics, and nothing leaves the browser.

State is snapshotted to `localStorage` under `bede.demo.v1.*` so a reload does
not lose a note someone just wrote. The clinic book is stamped with its
calendar day and discarded on the next one. "Reset demo data" in Settings clears
every `bede.demo.v1.*` key and reloads the seed. None of this is a production
persistence layer: a real deployment needs a server-side store under hospital
governance (`OPERATIONS.md` §4).

## Voice capture (dev only)

The recogniser is local: `tools/asr/server.py` (faster-whisper, binds
`127.0.0.1:8756`, no outbound calls). It needs `faster-whisper` installed and a
microphone; the first run downloads the `small.en` model.

```bash
python3 tools/asr/server.py
```

The tab stays dev-only deliberately. A public URL with a live microphone
collecting clinical audio is a governance problem, not a feature: production
capture needs the consent, retention and Zone B work in `STRATEGY.md` §4 and §8
done first. Accepted lines are written to a progress note only when the
clinician presses the button.
