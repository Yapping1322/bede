# Bede — prototype (an Acutis concept)

Patient-centric ward app prototype: per patient, the team shares structured
ISBAR notes/handover, a message thread, and a pathology + imaging results
feed (lab-reported flags, display-only). Clickable demo on **synthetic data
only** — see `HANDOFF_FABLE.md` for the brief and `HANDOFF_FABLE_03_FINISH.md`
for decisions/constraints. Formerly "Ward Companion".

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
```

## Deploy (private demo link)

```bash
npx vercel@latest login
npx vercel@latest --yes    # from this directory
```

## Structure (shell per HANDOFF_FABLE_02_SHELL.md)

Routes: `/` ward list (desktop: master–detail split) · `/patient/:id/{notes,messages,results}` (layout route — header/tab bar render once) · `/handover` · `/settings` (role switch + demo reset). Unknown routes redirect home; URLs carry nothing beyond the opaque `:id`.

- `src/types.ts` — data model; Patient is the atomic unit, everything hangs off `patientId`. Result shapes are FHIR-adjacent for the v2 swap.
- `src/seed/patients.json` — synthetic seed data (6 oncology patients, staff, notes, messages, results). Authored separately; entirely fictional.
- `src/data/providers.ts` — `PatientStore` / `NotesStore` / `MessageStore` / `ResultsProvider` interfaces the UI depends on.
- `src/data/mockStores.ts` — in-memory implementations over the seed JSON. v2 replaces these with real feeds without touching components.
- `src/components/ui.tsx` — shared primitives: `Card`, `Badge` (abnormal results and urgent share one `alert` token), `CountBadge`, `Avatar`, `EmptyState`, `ErrorState`, `Skeleton`, `Sheet`, `Timeline`.
- `src/components/` — `AppShell` (TopBar + BottomNav), `MasterDetailLayout`, `WardList`, `PatientShell` + three tabs, `HandoverPage` (printable), `SettingsPage`, `Landing`, `Login`.
- `src/index.css` — design tokens (`accent`, `alert`, `warn`, `ok`) via Tailwind v4 `@theme`.

## Demo posture

Even with synthetic data the prototype behaves as if it held PHI: navigation
state never touches the URL, there are no third-party requests or analytics,
and nothing persists beyond the tab.
