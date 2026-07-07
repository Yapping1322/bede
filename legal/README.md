# legal/ — external transfer of health information + images in Bede

Research map for how Bede lawfully and securely moves clinical content (notes,
results, and clinical photos) outside a hospital. **Not legal advice.** Verify
every `[verify]`-tagged item with a health-law solicitor before any real PHI.

Produced 2026-07-07 from primary sources (Acts below) + OAIC/ADHA guidance.

## Read these two first

- **`EXTERNAL_TRANSFER_LAW.md`** — the legal gateways. Which lawful basis permits
  each external transfer (APP 6.2 directly-related secondary purpose, consent,
  s 16B permitted health situations, MHR rail), the APP 8 / s 16C cross-border
  tripwire, a per-scenario decision tree, and what Bede must build to stay lawful
  (v1/v2/v3). Contains the full download manifest of OAIC/ADHA/state guidance URLs.
- **`IMAGE_TRANSFER_DESIGN.md`** — the channel + mechanics. Kiteworks vs the AU
  secure-messaging rails vs native envelope encryption; the outbound flow;
  concrete `types.ts` / `NotesTab.tsx` changes; what NOT to build now.

## The one-line thesis

The law does not prohibit sending a patient's info/images to another treating
provider — it **conditions** it. Make every transfer land inside a named lawful
gateway, keep every hop **onshore**, integrate the hospital's existing
SMD-conformant rail rather than becoming a transfer operator yourself.

## Primary sources on disk (authorised compilations)

| File | Instrument | Version |
|---|---|---|
| `Privacy_Act_1988_Cth.pdf` | Privacy Act 1988 (Cth) + APPs | comp. 4 Jun 2026 (472pp) |
| `My_Health_Records_Act_2012_Cth.pdf` | My Health Records Act 2012 (Cth) | comp. 5 Dec 2025 (183pp) |
| `Healthcare_Identifiers_Act_2010_Cth.pdf` | Healthcare Identifiers Act 2010 (Cth) | comp. 5 Dec 2025 (109pp) |
| `Privacy_Responsible_Info_Sharing_Act_2024_WA.pdf` | PRIS Act 2024 (WA) | as passed (31pp) |

Sources: legislation.gov.au (Cth), legislation.wa.gov.au (WA). Re-download the
latest compilation before any legal review — legislation drifts.

## The load-bearing facts

- **Radiology never needs pixels to leave Bede** — PACS deep-link + MHR text
  report already cover it. Only clinical photos (`NoteAttachment`) are ever the
  "pixels out" case, and those scenarios are occasional-to-rare.
- **Onshore is the whole game.** AU-region deployment (ap-southeast-2 / australiaeast)
  with a DPA meeting the OAIC three-condition "use" test → APP 8 / s 16C never
  engage. The AI layer (Cecilia) sending images to an *overseas* LLM would
  re-trigger APP 8 — keep inference onshore or de-identify.
- **Stage 1 (now): no outbound photo transfer.** Correct scope for a solo
  founder pre-pilot. Don't build the pixel-out path yet.
