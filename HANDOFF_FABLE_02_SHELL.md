# Handoff 02: The app shell

**Read HANDOFF_FABLE.md first.** That defines *what* the app is (patient-centric: Notes + Messages + Results). This defines *the shell* — the frame every feature plugs into, so the app has one consistent skeleton instead of three bolted-on screens. Build the shell before adding more features.

## What "the shell" means here

The shell is everything that is NOT a specific feature: navigation, layout, routing, the persistent chrome, the data/state boundary, and the design system. Get this right and Notes/Messages/Results become simple tabs. Get it wrong and every feature reinvents layout.

## 1. Information architecture (routes)

```
/                       → Ward list (all patients, this is home)
/patient/:id            → Patient shell (redirects to /patient/:id/notes)
/patient/:id/notes      → Notes tab
/patient/:id/messages   → Messages tab
/patient/:id/results    → Results tab
/handover               → Whole-ward handover view (generated from notes)
/settings               → role, demo-data reset
```

Use a router (React Router). The patient route is a **layout route**: it renders the patient shell (header + tab bar) once, and the three tabs render inside an `<Outlet/>`. Tabs must NOT each re-render the patient header.

## 2. Layout skeleton (mobile-first)

```
┌─────────────────────────────┐
│  TopBar (app name · role)   │  ← persistent, ~48px
├─────────────────────────────┤
│                             │
│   <Outlet/>  (page body)    │  ← scrolls
│                             │
├─────────────────────────────┤
│  BottomNav (Ward · Handover)│  ← persistent on mobile, ~56px
└─────────────────────────────┘
```

Inside a patient, a **second-level tab bar** (Notes / Messages / Results) sits under a compact patient header (name, bed, age, one-line status, unread badge). On desktop (≥768px) the ward list becomes a left rail and the patient detail fills the right — same components, responsive.

## 3. Component tree (build in this order)

```
<AppShell>            // TopBar + BottomNav + <Outlet/>
  <WardListPage>      // patient cards → link to /patient/:id
  <PatientShell>      // patient header + tab bar + <Outlet/>
    <NotesTab>
    <MessagesTab>
    <ResultsTab>
  <HandoverPage>
```

Shared primitives to build once and reuse everywhere: `<Card>`, `<Badge>` (unread / abnormal / urgent), `<Avatar>`, `<EmptyState>`, `<Sheet>` (bottom-sheet modal for new note / new message), `<Timeline>` (used by Notes and Results).

## 4. State / data boundary (critical for v2)

All data access goes through provider interfaces so the mock layer can be swapped for a real backend without touching UI:

```
PatientStore    → list(), get(id)
NotesStore      → forPatient(id), add(note)
MessageStore    → forPatient(id), post(msg)
ResultsProvider → forPatient(id)           // FHIR-shaped; MockResultsProvider now
```

For the prototype these read from `seed/*.json` into an in-memory store (React context or a small store like Zustand). No feature component reads a JSON file directly.

## 5. Design system (so "looks nice" is systematic, not per-screen)

- **Tokens**: one Tailwind config — colour scale (a calm clinical blue/slate, one alert red, one warning amber, one success green), spacing scale, radius, one font. Define abnormal-result red and urgent-message red as the SAME token so severity reads consistently.
- **Density**: ward context = information-dense but tappable. Min 44px tap targets. Generous line-height for scan-ability on a round.
- **States**: every list has a designed empty state, loading skeleton, and error state. Build these into the shared primitives, not per page.
- Dark mode optional; if added, drive it from tokens only.

## 6. Non-negotiables carried from Handoff 01

- Synthetic data only. No real PHI.
- No patient data in URLs beyond an opaque `:id`. No third-party analytics.
- Fable authors the shell/UI; it does NOT author clinical seed content (that comes pre-written — see Handoff 01 §10).

## Build order for this handoff

1. Router + `<AppShell>` + TopBar/BottomNav (empty pages).
2. Shared primitives (`Card`, `Badge`, `EmptyState`, `Sheet`, `Timeline`).
3. `<PatientShell>` with the second-level tab bar + `<Outlet/>`.
4. Provider interfaces + in-memory store over seed data.
5. Tabs plug in (Notes → Results → Messages, per Handoff 01 order).
6. Responsive pass (mobile → desktop split view).
7. Empty/loading/error states everywhere.
