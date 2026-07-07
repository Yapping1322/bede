## Design memo: image content transfer outside the hospital in Bede

**Author:** Lead architect
**Date:** 2026-07-07
**Status:** Decision memo, pre-pilot
**Scope:** How pixel content held or referenced by Bede can legitimately leave the hospital boundary, and what to build now vs. defer.

---

## 1. Two image cases

Bede has exactly two image-related data paths.

**Case A: NoteAttachment** (`types.ts:38-42`). Bede holds the pixels as a `dataUrl` string in memory. In production these will be ward photos (WebP/AVIF, ~200-400 KB per PLAN.md). This is the case this memo addresses.

**Case B: ImagingResult** (`types.ts:96-108`). No pixel field. The PACS viewer button at `ResultsTab.tsx:117-122` is disabled pending a deep-link to the provider's referrer PACS viewer. This decision is correct and must not change. Kiteworks has zero role in Case B.

**Genuine pixel-out scenarios for Case A:**

| Scenario | Destination | Frequency |
|---|---|---|
| Wound photo attached to discharge summary for GP | GP practice | Occasional |
| Clinical photo in specialist referral packet | Specialist rooms | Less frequent |
| Ward photo needed at receiving hospital for transfer | Another hospital | Rare |

**Cases that do not need pixel transfer from Bede:**

- Sharing a radiology text report with a GP: the Sharing by Default Act 2025 commenced 14 February 2025. Radiologists have been obligated to upload text reports to MHR since that date. The GP accesses it via MHR; Bede moves nothing. (If there is a staged commencement for specific imaging categories, cite the precise gazette entry -- the 14 February date is from PLAN.md and needs independent verification before it goes into any IG document.)
- Showing imaging to an off-site consultant: PACS portal link. No pixel in Bede.
- Ward-to-ward handover within the same hospital: stays inside the single-tenant deployment.

---

## 2. Interaction with PLAN.md §4

**Append-only event log.** The current `NoteAttachment` embeds `dataUrl` directly in the note object. In production that embeds pixel bytes in the immutable log, making Privacy Act APP 13 correction requests irreconcilable with log integrity. The architectural fix is a reference in the log, bytes in object storage (see section 6). This is a design decision to lock now; the implementation is deferred to v2 because no backend exists yet.

**Single-tenant per hospital.** Pixels crossing a tenant boundary are a deliberate, clinician-initiated exception with audit trail. They do not break the sovereignty model as long as the bytes stay in AU-region infrastructure and the transport is the hospital's own approved pathway.

**"Never copy pixels" (PLAN.md §98-99).** This principle refers to PACS/radiology pixels. Every IG document must name both categories explicitly: (A) PACS imaging -- deep-link only, zero pixels in Bede; (B) clinical ward photos -- stored encrypted in hospital-controlled object storage, defined retention, patient-level deletion workflow.

---

## 3. Two options and the recommendation

### Option A: Kiteworks/MFT integration

Bede's API authenticates to the hospital's Kiteworks instance as an OAuth 2.0 M2M client and calls `POST /rest/messages` (verify the exact endpoint against `/rest/api/swagger.json` for the specific tenant). Kiteworks handles OTP, link expiry, download-count enforcement, and its own audit trail. Bede records the returned `messageId` as a `SHARE_SENT` event in its own log.

**What Bede does not need to build:** key management, recipient OTP, link expiry logic, DLP policy enforcement, SIEM feed.

**Verification required before writing a single line of code:**

- Confirm whether the pilot hospital has Kiteworks deployed. Gold Coast University Hospital (QLD) is cited as an AU public-hospital use case but cannot be verified from publicly available sources -- it may be wrong. There is no confirmed WA or WA private-hospital Kiteworks deployment. If the pilot hospital does not have Kiteworks, Option A is irrelevant.
- Get the current Cloud Security Assessment Report (CSAR) date and scope directly from Kiteworks. An IRAP assessment expires effectively when the assessed environment changes materially; the 2024 reassessment is unconfirmed publicly. Do not use Kiteworks' IRAP status as a compliance argument until you hold the current CSAR.
- Verify Kiteworks' FIPS 140-3 status against the NIST CMVP database before citing any certificate number in an IG document. A wrong number presented to a CISO who checks it is worse than no citation.

**Plaintext pixel exposure during upload.** Bede's API server must decrypt the S3 ciphertext before sending plaintext bytes to Kiteworks. That plaintext exists transiently in server memory. There is no way to eliminate this exposure in Option A -- the correct controls are: (a) the connection to Kiteworks must use mTLS; (b) server memory holding the decrypted bytes must be zeroed immediately after the Kiteworks POST completes. This is a mandatory transport constraint, not an optional hardening step.

**Engineering cost:** the `KiteworksClient` is 50-80 lines. 1-2 days of work. Build it directly -- no abstract adapter layer at this stage. Extract an interface when a second hospital with different transport is actually contracted. An abstraction with one implementation is ceremony, not architecture.

### Option B: native envelope encryption

In-browser WebCrypto AES-256-GCM encryption, hospital-controlled KMS (AWS KMS, hospital CMK in ap-southeast-2), S3 storage, two-hop OTP-gated download for recipients without a Bede account.

**Corrections to any prior draft of this option:**

- OTP storage: use a Postgres table with `expires_at` and a cleanup job. Redis is an entire extra infrastructure dependency for an infrequent operation and is not justified. BCrypt is the wrong primitive for a 6-digit time-limited numeric code -- use HMAC-SHA256 with rate limiting and a short TTL.
- This is not deferred work if the pilot hospital lacks Kiteworks. If Kiteworks is absent and the pilot requires outbound sharing, Option B must be built for the pilot. It is parallel work, not a fallback.

**Cost:** 4-8 weeks minimum. Requires its own site-specific PIA and IG sign-off. The hospital's existing Kiteworks IG approval does not transfer.

**KMS failure modes that must be designed before implementation begins:**

- CMK rotation: all existing `wrappedDek` values become undecryptable unless an active re-encryption job re-wraps them before the old key version is disabled. This is not automatic; it requires an explicit re-encryption pipeline as part of the key rotation runbook.
- CMK accidental deletion: every attachment becomes permanently unrecoverable. This violates the 7-year AU health records retention obligation. Mitigation: enable AWS KMS deletion protection with a 30-day waiting period and CloudTrail alerts. Document this in the PIA before the feature ships.

### Recommendation

Build Option A first, but only if the pilot hospital already has Kiteworks deployed. If they do not, skip Option A and build the Option B minimal implementation instead.

For a pre-pilot solo founder, Option A is 1-2 days against already-approved hospital infrastructure with no new IG review for the transport layer. Option B is 4-8 weeks of security-critical code that needs external audit before any hospital IG team will accept it. Do not build Option B unless Kiteworks is absent and the pilot requires outbound sharing.

**Stage 1 (current pilot): pixels stay inside the hospital. No outbound photo transfer.** PLAN.md's current position is correct. This is not a limitation to apologise for -- it is the right scope for a solo founder pre-pilot.

---

## 4. Outbound flow (Option A)

This assumes the pilot hospital has Kiteworks. The clinician is sending a wound photo to the patient's GP.

```
Step 1: Clinician action
  NotesTab.tsx -- clinician opens the note, selects the attachment,
  clicks "Share with referring GP". Enters recipient GP email.
  Bede shows consent acknowledgement:
  "This photo will be sent outside this hospital via the hospital's
  secure file transfer system. The recipient's email will be logged."
  Clinician confirms.

Step 2: Client posts to Bede API
  POST /api/outbound/share
  { patientId, noteId, attachmentId, recipientEmail,
    expiryDays: 7, purpose: 'referral' }

Step 3: API -- integrity checks
  - Verify caller has share permission for this patient.
  - Verify patient consent is recorded (see section 6 for what
    consent design requires -- a boolean field is not sufficient).
  - Append SHARE_INITIATED event to immutable log.

Step 4: API -- decrypt for upload
  Retrieve ciphertext from S3. Call KMS Decrypt(wrappedKey).
  Decrypt in-memory. Plaintext bytes are ephemeral.
  mTLS to Kiteworks is mandatory. Zero memory immediately after POST.
  (Demo mode: decode dataUrl to bytes.)

Step 5: API -- push to Kiteworks
  POST /rest/messages (OAuth M2M).
  Payload: recipientEmail, file bytes, expiry_days=7, download_limit=1,
           subject="Clinical attachment [encounter reference only, no patient name]"
  Kiteworks responds: { messageId, shareUrl }.

Step 6: Audit entry
  SHARE_SENT {
    actorId, patientId, noteId, attachmentId,
    kiteworksMessageId: messageId,
    recipientEmailHmac: HMAC-SHA256(serverSecret, normalise(recipientEmail)),
    purpose: 'referral', expiryAt, ip, timestamp
  }
  Plain SHA-256 of an email is reversible. GP emails follow known patterns
  (firstname.lastname@practicename.com.au); a rainbow table over common AU
  GP email patterns de-anonymises the hash in seconds. HMAC-SHA256 with a
  server secret is required here.
  This row is INSERT-only. The app role has no UPDATE/DELETE on event_log.

Step 7: Recipient retrieval
  GP receives Kiteworks notification. Clicks link. Kiteworks handles
  OTP/login. GP downloads file. Kiteworks logs the download event in
  its own audit trail.

Step 8: Delivery receipt
  Kiteworks does not push webhooks to Bede (not in the public API).
  Accept that Kiteworks' audit log is the delivery record.
  Do not build a polling loop pre-pilot.

  Known patient safety limitation: the clinician has no in-Bede
  confirmation that the GP received and opened the image. If the GP
  sees the patient before reviewing the photo they may be unaware of
  a wound's current condition. The clinical workaround is for the
  clinician to call the GP to confirm receipt after sending. This must
  be documented as a named limitation in the pilot protocol -- it is
  not architecturally correct to leave it unnamed.

Step 9: Revocation
  Clinician calls Bede admin endpoint, which calls
  DELETE /rest/messages/{id} on Kiteworks, then appends SHARE_REVOKED
  to the log.

  Before exposing a revocation button in any admin UI, verify what
  this Kiteworks endpoint does -- specifically whether it also removes
  Kiteworks' own audit records. If it deletes audit rows, do not call
  it. Audit records must be retained for statutory periods regardless
  of the clinician's intent to revoke link access.
```

---

## 5. Regulatory posture

### Data residency: APP 11, not APP 8

The obligation to keep everything in ap-southeast-2 flows from **APP 11** (the APP entity's security obligation) and the sub-processor contract terms in the hospital's agreements with AWS and Kiteworks. APP 8 governs disclosure to *overseas recipients*. If the clinician, Kiteworks, and the GP are all in Australia, APP 8 does not apply to the data residency question. Any PIA or IG document that cites APP 8 for data residency will be corrected by the hospital's privacy lawyer on first review.

APP 8 is relevant in one narrow scenario: if a hospital asks Bede to route through infrastructure outside Australia. In that case APP 8 requires reasonable steps to ensure the overseas recipient will not breach the APPs. That is not the standard outbound-to-GP scenario.

### Pilot hospital: Hollywood is a private hospital under federal APPs

Hollywood Hospital (Ramsay Health Care) is a private hospital. It is regulated under the federal Privacy Act (APPs) and Hollywood's own private-governance PIA process. The PRIS Act applies to WA public-sector entities, including WA Health public hospitals. It does not apply to Hollywood. Presenting PRIS Act compliance framing to Hollywood's IG team is a category error that undermines credibility.

If Bede later pilots at a WA public hospital (e.g., RPH, SCGH), the PRIS Act Information Privacy Principles apply in addition to the federal APPs. The PRIS Act has been in force since 1 July 2026. The "staged commencement ~2025-26" framing in REGULATORY_AU.md is stale for public-sector entities.

### TGA exclusion

The pixel-out path stays inside the exclusion as long as Bede sends raw compressed bytes and unprocessed note text with no AI-derived clinical output attached. The moment wound-progression tracking or any algorithmic flag derived from the image content is included in the outbound payload, the TGA SaMD frame applies. Do not include AI-derived clinical output in outbound payloads.

### PIA requirements before the pixel-out feature ships

The pilot site's PIA must document: categories of attachment eligible for external sharing; the patient consent workflow (not just a field -- see section 6); Kiteworks as a named sub-processor with current CSAR date, AU data residency confirmation, and IRAP scope verified; audit log retention (7 years for adult health records under AU state health records law; the event log reference row is retained indefinitely even after pixel deletion per a patient's APP 13 request).

### NDB (Notifiable Data Breach scheme)

If a Kiteworks link is forwarded to an unauthorised party, or if the Kiteworks instance is compromised, that is an eligible data breach under the NDB scheme (Privacy Act s26WH), attributable to the hospital and Kiteworks as sub-processor. Bede's SHARE_SENT audit log provides the data map needed for the OAIC notification.

### What the CISO needs to hear

1. All PHI at rest stays in the hospital's own tenancy (ap-southeast-2 object storage or on-premises VMs). Bede does not operate a shared cloud.
2. The outbound transport uses the hospital's existing Kiteworks instance -- already approved by your IG team, already in your SIEM feed.
3. Bede stores an audit reference (Kiteworks messageId), not a copy of the payload. The outbound bytes are managed by Kiteworks under your existing contract.
4. Every outbound share generates an immutable INSERT-only event in Bede's log. Revocation calls Kiteworks' revocation API and appends a SHARE_REVOKED event.
5. Kiteworks HYOK on-premises is cryptographically valid. For the IRAP-hosted PaaS tier, key isolation is a contractual claim, not a cryptographic one -- verify your deployment model before relying on it.
6. Verify the current Kiteworks FIPS 140-3 validation listing against the NIST CMVP database before citing any certificate number in an IG document.

---

## 6. Design decisions to lock now; implementation deferred to v2

**Do not implement these now.** Bede is a React SPA with in-memory mock stores. There is no API server, no S3 bucket, no KMS, no Postgres. Shipping type-only changes that presuppose that infrastructure creates dead-code branches and signals false progress to any future hire who reads the diff. Lock the design; implement when the backend exists.

### `NoteAttachment`: reference, not bytes

```typescript
export interface NoteAttachment {
  id: string  // must be crypto.randomUUID() -- see below
  storage:
    | { mode: 'demo'; dataUrl: string }
    | {
        mode: 'encrypted'
        s3Key: string
        iv: string          // base64, 12 bytes
        wrappedDek: string  // base64, KMS-wrapped AES-256 key
        sizeBytes: number
        mimeType: string
      }
  caption?: string
  // Delivery state is NOT a field on this type.
  // Derive it at query time from SHARE_SENT / SHARE_REVOKED events.
  // A mutable deliveryState field embedded in an immutable log structure
  // directly contradicts the append-only integrity argument made to the CISO.
}
```

When this type ships, three render sites in `NotesTab.tsx` need updating -- not one:
- Line 62: `src={a.dataUrl}` (preview thumbnail in AttachButton)
- Line 316: `src={viewing.dataUrl}` (full-view Sheet)
- Line 369: `src={a.dataUrl}` (thumbnail in the timeline card)

All three must branch on `a.storage.mode`.

### `AuditEvent`: discriminated union, not a free-form payload

`payload: Record<string, unknown>` has no type-level enforcement. The comment "no plaintext PHI in payload" is a wish, not a constraint. A discriminated union per event type makes unknown fields a compiler error.

```typescript
type ShareInitiatedPayload  = { noteId: string; attachmentId: string; recipientEmailHmac: string; purpose: string }
type ShareSentPayload       = { noteId: string; attachmentId: string; kiteworksMessageId: string; expiryAt: string }
type ShareRevokedPayload    = { kiteworksMessageId: string }
type AttachmentRetractedPayload = { attachmentId: string }

export type AuditEvent =
  | { type: 'SHARE_INITIATED'; id: string; patientId: string; actorId: string; timestamp: string; payload: ShareInitiatedPayload }
  | { type: 'SHARE_SENT';      id: string; patientId: string; actorId: string; timestamp: string; payload: ShareSentPayload }
  | { type: 'SHARE_REVOKED';   id: string; patientId: string; actorId: string; timestamp: string; payload: ShareRevokedPayload }
  | { type: 'ATTACHMENT_RETRACTED'; id: string; patientId: string; actorId: string; timestamp: string; payload: AttachmentRetractedPayload }
```

### Patient consent: design the workflow, not just the field

`externalSharingConsent?: boolean` is not shippable for three reasons: (a) the optional modifier leaves `undefined` as a valid state -- a careless `if (patient.externalSharingConsent)` treats `undefined` as blocked while `!== false` treats it as allowed; (b) there is no UI or capture flow -- consent cannot actually be obtained without one; (c) one boolean is too coarse -- consent under the Privacy Act must be purpose-specific (wound photo to GP is different from inter-hospital transfer).

The v2 design must specify when consent is sought, how it is captured (verbal with clinician attestation vs. written form), how purpose specificity is represented in the data model, and what the UI flow is for both initial capture and withdrawal. That design comes before any field definition.

### Attachment ID: `crypto.randomUUID()`

`NotesTab.tsx:42` generates IDs as `` `a-${file.name}-${file.size}-${file.lastModified}` ``. This collides if the same file is attached twice -- in a medical record, silently deduplicating two wound photos could obscure a change in condition between two encounters. Use `crypto.randomUUID()` in any production path. **This is the one pre-pilot code fix that should happen now**, before any other changes, because the SPA is already running.

### `capture="environment"`: make the design decision explicit

`NotesTab.tsx:88` uses `capture="environment"`, which opens the device camera exclusively on mobile and blocks photo-library selection. This may be intentional for ward use -- capture-now only ensures the photo is from the current encounter. If a clinician needs to attach a photo already in the device library, it cannot be done. Decide now and document the reasoning. If library selection is needed, remove the `capture` attribute and keep `accept="image/*"` only.

---

## 7. What NOT to build now

- **No outbound pixel transfer at Stage 1 pilot.** Pixels stay inside the hospital.
- **No `SecureDeliveryAdapter` abstract interface until a second hospital with a different transport is actually contracted.** Build `KiteworksClient` directly when the time comes. Abstraction without two real implementations is ceremony.
- **No KMS, S3, or Postgres integration before the backend exists.** The type shapes in section 6 are design spec; implement them when infrastructure is in place.
- **No federated peering between hospital tenants.** Stage 4+, requires its own IG review.
- **No DICOM transfer or PACS pixel handling.** `ImagingResult` stays a deep-link.
- **No AI analysis of `NoteAttachment` pixels.** TGA SaMD tripwire -- the moment an AI-derived clinical output is in the outbound payload, the TGA exclusion argument weakens materially.
- **No proprietary PKI or key directory.** Complexity not justified at pre-pilot scale.
- **No polling loop for Kiteworks delivery receipts pre-pilot.** Kiteworks' audit trail is the record. The clinical workaround is a phone call.

---

## 8. Honest verdict: Kiteworks, or a better fit?

Kiteworks is an enterprise MFT product priced at $50k-$200k+/year per hospital. It is designed for bulk IT-to-IT PHI transport, not for a registrar sending a wound photo during handover.

**Better fit for the wound-photo-to-GP scenario:**

- **Foxo:** AU-based, ISO 27001, deployed at QLD Health, purpose-built for clinical image sharing. Concrete next step -- contact Foxo for API documentation and verify whether Hollywood or WA private hospitals have existing IG approval. If they do, evaluate Foxo before writing any Kiteworks code. This is a real decision point, not a consideration to defer indefinitely.
- **Celo:** 800+ AU healthcare organisations, IRAP-assessed on Azure, specific clinical image sharing workflow. Same evaluation path as Foxo.

**Where Kiteworks is genuinely the right tool:** hospital onboarding data migration (bulk patient census extract at initial deployment). That is an IT-to-IT operation using the hospital's existing tools. Bede builds nothing for it.

**For structured documents without photos:** HealthLink or Medical-Objects are the correct rails -- already installed in every WA GP practice, already trusted by every hospital, carry HL7/CDA packages. They do not carry raw image blobs and do not need to.

**Practical sequencing:**

1. Stage 1 (current pilot): no outbound photo transfer.
2. Stage 2: ask the pilot hospital what secure messaging they already have IG approval for. Foxo or Celo first, Kiteworks second, native Option B implementation last.
3. Do not design Kiteworks as a hard dependency. Build against whatever the hospital's IG team has already approved.

---

*The one pre-pilot code change: `NotesTab.tsx:42` -- replace the composite ID string with `crypto.randomUUID()`. Everything else in section 6 is design-only until the backend exists. The two files that will need changes at v2: `/Users/gubekyengkopiong/Code/ward-app/src/types.ts` (reference-based `NoteAttachment`, discriminated `AuditEvent`) and `/Users/gubekyengkopiong/Code/ward-app/src/components/NotesTab.tsx` (three `dataUrl` render sites, `VITE_DEMO_MODE` gate on the upload path, and the `capture` attribute decision).*