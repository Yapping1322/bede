# What each role needs from Bede — gap analysis (2026-07-06)

Method: stand in each job on a ward round and ask "what would make me open this
app instead of paper / the phone tree?" Mapped against what exists today.
Items marked **[shipped today]** landed 2026-07-06 evening; **[v2]** needs a
real backend; **[⚠ SaMD]** = crosses into regulated software-as-a-medical-device
territory — deliberate decision + regulatory work before building (see
REGULATORY_AU.md).

## Medical ladder

### Consultant
- **Ward-at-a-glance before rounds**: who deteriorated overnight, new results, unresolved questions. Today: ward list + abnormal dot + unread badge covers most of it. Gap: an "overnight changes" digest view (what's new since I last looked) — v1-buildable, high value.
- **Delegation with visibility**: says "chase the MRI" on the round and wants to see it happened. Gap: **per-patient task list with owner + done state** — the single biggest missing feature for every role above intern. Workflow, not SaMD.
- Sign-off/countersigning of junior notes (supervision trail). Gap: v2 (needs identity).

### Registrar
- Fast structured handover: **[shipped earlier]** ISBAR + handover view.
- **Escalation clarity**: when a nurse flags something, reg wants one thread, not four pagers. Messages tab covers the thread; gap: message priority level ("FYI" vs "review needed") — careful: auto-triage is **[⚠ SaMD]**, but a *sender-chosen* priority tag is workflow and safe.
- Referral tracking (cardiology seen? anaesthetics reviewed?) → same task-list feature.

### RMO / Intern
- **The jobs list IS the intern's life.** Paper list, rewritten daily, lost at handover. Task list with owner/status/patient-link is the killer feature here.
- Free-text progress notes because real notes aren't always ISBAR: **[shipped today]**.
- Photo of the paper chart so the record follows the patient: **[shipped today]**.
- "Can't read this / what did you mean" → clarification requests: **[shipped today]**.

### Medical student
- Read access + drafting notes for countersign (supervision gap, v2 identity).
- Learning value: seeing structured ISBAR exemplars — already inherent.

## Nursing
- **Obs/EWS trends** are their core data — deliberately absent: charting obs with alert thresholds is **[⚠ SaMD]** and owned by existing systems. Bede should *display* what other systems record, not compute.
- What nursing actually gains today: the patient-scoped thread (no more chasing doctors by phone), clarification requests on unreadable orders, and photo-capture of paper charts.
- Gap: shift-based nursing handover view (same generator, filtered differently) — cheap v1 win.

## Allied health & others
- **Pharmacy**: med-chart questions are half of ward phone traffic. The thread + clarification flow covers the communication; medication reconciliation itself stays in the med-chart system (**[⚠ SaMD]** adjacent — do not rebuild).
- **Physio/OT**: discharge-readiness signals (mobility status, home setup) live in free-text notes today; gap: a discharge-planning tag/section per patient — workflow, v1-cheap.
- **Social work / discharge planner**: wants expected-discharge-date visible per patient — one field, high coordination value.
- **Ward clerk**: bed state, admissions/discharges — v2 (ADT feed from the hospital PAS is the real source; don't hand-maintain).

## Priority order (if building beyond the pitch)
1. **Tasks/jobs list** (owner, patient-link, status) — every role asked for it in some form.
2. Expected discharge date + discharge-planning section.
3. "Since I last looked" digest.
4. Nursing-filtered handover view.
5. Sender-chosen message priority.

Everything above is workflow software. The repeated tripwire: the moment Bede
*computes* anything clinical (EWS, triage, abnormality, med interactions) it
crosses the SaMD line — display other systems' outputs, capture humans'
decisions, never generate clinical judgements.
