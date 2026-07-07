# Lawful external transfer of health information + images in Bede

**Date:** 7 July 2026
**Prepared for:** Bede architecture and governance planning
**Status:** Research map only -- not legal advice. See Disclaimer below.

---

## Disclaimer

**This document is a research map prepared from public legal sources. It is not legal advice. It does not constitute a legal opinion. It has not been prepared by a lawyer and does not create a solicitor-client relationship.**

Section numbers, commencement dates, and penalty figures were verified against primary sources as at 7 July 2026 and are noted where verification was partial or uncertain. References marked [verify] require confirmation against the current compiled Act before any legal review. Legislative text changes regularly. Before Bede onboards any real patient health information -- in a pilot, a demonstration, or any live deployment -- the following must be verified in writing with a health-law solicitor:

1. The exact wording and current commencement status of all provisions cited, including any amendments made after 7 July 2026.
2. The sub-paragraph structure of APP 6.2, including whether both limbs of the directly related secondary purpose test fall within APP 6.2(a) or are split across sub-paragraphs (see Gateway 2 note).
3. Whether Bede as a sole-trader software vendor is itself an APP entity (likely yes once the entity accesses or holds PHI on behalf of hospital clients).
4. The terms of the data processing agreement with each hospital client, including liability allocation for APP compliance.
5. The specific DPA terms with the chosen cloud provider and whether they satisfy the three-condition "use" characterisation under the OAIC APP 8 Guidelines.
6. The PIA requirements under WA PRIS Act s 79 for any public hospital deployment.
7. Whether the chosen SMD-rail integration contract satisfies the hospital's data governance requirements and whether Bede needs to be independently assessed or is covered by the SMD vendor's existing conformance.
8. The TGA SaMD classification of Bede, including whether any wound-tracking or escalation features require ARTG inclusion before clinical use with real patients (see section 5.10).
9. Whether the APP 6.2(a) gateway is satisfied for each specific transfer event, based on the actual content of the admission consent, the nature of the receiving provider, and the clinical context.
10. Current penalty unit dollar value per *Crimes Act 1914* (Cth) s 4AA and the applicable indexation instrument.

---

## 1. The Reframe

**The law does not prohibit sending a patient's health information or clinical images to another treating provider. It conditions those transfers through named lawful gateways. The design goal is to make every external transfer land inside one of those gateways and keep every hop onshore.**

Thinking of the law as something to "avoid" is the wrong frame, and it is the riskier frame. It leads to ad-hoc workarounds (unauthenticated email, consumer file-share, off-the-shelf messaging apps) that sit outside any gateway and outside any documented consent. That is where liability actually lives. The right frame is: identify the applicable gateway, satisfy its conditions, document the basis, and build the audit trail.

For Bede's core use cases, the most frequently applicable gateway is **APP 6.2(a)** [verify sub-paragraph structure -- see Gateway 2 note] of the *Privacy Act 1988* (Cth): the directly related secondary purpose gateway. The treating-team referral chain is the paradigm example the OAIC uses when explaining this provision. Whether any specific transfer falls within this gateway depends on the actual content of the admission consent, the nature of the receiving provider, and the clinical context. The gateway is not self-executing. Each transfer event must be assessed on its facts.

---

## 2. The Gateways Table

The table below covers the lawful bases for external disclosure of health information. "Health information" is defined in **s 6(1)** of the *Privacy Act 1988* (Cth) as information or an opinion about the health or disability of an individual, an individual's expressed wishes about future health services, or a health service provided or to be provided to an individual. Clinical notes, results, messages, and clinical photo attachments (wound photos, paper-chart snaps) collected in the course of providing a health service fall within this definition.

**Note on clinical photography:** health information collected through clinical photography is subject to the same privacy framework as typed clinical notes under s 6(1). However, the OAIC's guidance on taking photos of patients indicates that general treatment consent may not be sufficient to cover all uses of clinical images. The purpose and scope of photography should be enumerated in the admission consent -- see section 5.1 for the consent capture requirement.

### 2.1 Commonwealth Privacy Act 1988 (Cth) -- applies to all private hospitals nationwide and to all public hospitals as APP entities

| # | Gateway | Statutory basis | Condition Bede / the hospital must satisfy |
|---|---------|----------------|--------------------------------------------|
| 1 | **Express consent** | APP 6.1(a) | Patient has positively consented at admission (or later) to the specific category of disclosure. A well-drafted admission consent covering "disclosure to your treating team, other treating facilities involved in your care, and your nominated GP" satisfies this gateway and reinforces Gateway 2. Bede must record the consent version and date in the append-only log. |
| 2 | **Directly related secondary purpose + reasonable expectation** | APP 6.2(a) [verify sub-paragraph structure -- the two limbs (directly related; reasonable expectation) may be expressed as APP 6.2(a)(i) and (a)(ii), or may be split across separate lettered sub-paragraphs. Confirm against the current compiled Act before any legal review. The substance of both limbs is accurate regardless of the lettering.] | *Primary clinical gateway for inter-hospital transfers, GP discharge summaries, and specialist referrals.* Both limbs must be met: (a) the secondary purpose is **directly related** to the primary purpose of collection (providing a health service to that patient); (b) the patient would **reasonably expect** that disclosure. Because health information is sensitive information (s 6(1)), the "directly related" standard applies -- not merely "related." The gateway is not self-executing. Whether it is satisfied depends on the specific content of the admission consent, the nature of the receiving provider, and the clinical context. Each transfer event must be assessed on its facts and the basis documented. The OAIC Guide to Health Privacy, ch 3, confirms the referral and discharge scenarios as paradigm examples -- but this does not mean every transfer Bede executes is automatically within that paradigm. |
| 3 | **Required or authorised by Australian law** | APP 6.2(b) [verify lettering] | Mandatory reporting statutes (public health, child protection, coronial), court orders, subpoenas. Applicable law may extend to State or Territory law. No Bede-specific build required beyond logging the legal basis in the audit event. |
| 4 | **Serious threat to life or health** | APP 6.2(c) [verify lettering] via s 16A | It is unreasonable or impracticable to obtain consent AND disclosure is necessary to lessen or prevent a serious threat to life, health, or safety of any person. Covers acute emergencies where obtaining consent is not possible. Document the clinical basis and urgency in the audit event. |
| 5 | **Permitted health situation -- research / public health statistics** | APP 6.2(d) [verify lettering] via s 16B(3) | Use or disclosure for research or compilation of statistics relevant to public health or safety, where: (a) impracticable to obtain consent; (b) conducted in accordance with NHMRC s 95A guidelines; (c) the organisation reasonably believes the recipient will not further disclose. Relevant if Bede's log is used for clinical audit or QI. Not the pathway for inter-clinician transfers. |
| 6 | **Permitted health situation -- genetic relative notification** | APP 6.2(d) [verify lettering] via s 16B(4) | Use or disclosure of genetic information to lessen a serious heritable-disease threat to a genetic relative. Must comply with guidelines approved under **s 95AA** (not s 95A -- different instrument; OAIC has published a dedicated 2014 s 95AA instrument). Narrow and specialised; not relevant to Bede's core ward use case. |
| 7 | **Permitted health situation -- responsible person when patient cannot consent** | APP 6.2(d) [verify lettering] via s 16B(5) | Disclosure to a **responsible person** (parent, adult child, spouse, relative, guardian) -- **not another treating provider** -- when: the patient is physically or legally incapable of consenting, or physically cannot communicate consent; disclosure is necessary for appropriate care, treatment, or for compassionate reasons; no contrary prior wish was expressed; disclosure is limited to what is reasonable and necessary. Where a patient lacks capacity and the disclosure target is **another treating provider** (not a family member), the applicable pathway is Gateway 2 (treating team / directly related secondary purpose under APP 6.2(a)), not s 16B(5). |

### 2.2 My Health Records Act 2012 (Cth) -- the national report-level rail

Penalty unit rate: **$364 per unit** from 1 July 2026, per *Crimes Act 1914* (Cth) s 4AA [verify current figure against the applicable indexation instrument before relying on any dollar amount]. All dollar figures below use the $364/PU rate.

| Provision | What it does | Condition for Bede |
|-----------|-------------|-------------------|
| s 61 | Primary treating-team access: a participant in the MHR system may access a patient's MHR for the purpose of providing healthcare to that patient, in accordance with the access controls set by the patient. | Hospital must hold an HPI-O registered with Services Australia. Bede as software must obtain ADHA conformance (NoC + CCD testing, 4-8 months). MHR carries **text reports only** (pathology, imaging, discharge summaries, event summaries). It does **not** carry DICOM pixels, clinical photographs, nursing notes, or freeform ward documentation. |
| s 77 | Strict AU data-residency prohibition: MHR data must never be stored, processed, or accessed outside Australia. Criminal: 300 penalty units ($109,200) or 5 years imprisonment. Civil: 1,500 penalty units ($546,000). | Applies only to data in the MHR system. Bede's own clinical notes and photos are **not** subject to s 77 unless Bede participates in MHR. Defer MHR integration until the AU-resident data architecture is confirmed in writing. |
| ss 78A-78D | Sharing by Default mandate (from 1 July 2026): pathology labs and diagnostic imaging services must upload prescribed text reports to MHR by default. Civil penalty for failure: 30 PU ($10,920). | Bede is **not** a prescribed healthcare provider organisation for upload purposes. This mandate does not apply to ward management software. |

### 2.3 WA PRIS Act 2024 overlay -- public sector hospitals only

The *Privacy and Responsible Information Sharing Act 2024* (WA) applies to WA public sector IPP entities only (public hospitals, local governments, government trading enterprises). It does **not** apply to private hospitals (St John of God, Ramsay/Hollywood) or to Bede as a sole-trader vendor unless Bede contracts with a WA public hospital under a State services contract with an IPP-compliance clause.

| Provision | Effect | Condition for Bede |
|-----------|--------|-------------------|
| Schedule 1, IPP 2 | Use or disclosure for secondary purpose requires: consent; OR directly related secondary purpose + reasonable expectation + **fair and reasonable** in all circumstances. Secondary uses must be **documented in writing before they occur** (stricter than APP 6). The "fair and reasonable" overlay requires ongoing reassessment. | The append-only log satisfies the documentation obligation. Each transfer event must record the secondary purpose, recipient category, consent status, and the IPP 2 basis before the transfer is executed, not after. |
| Schedule 1, IPP 9 | Restricts overseas transfers only. **No restriction on interstate transfers within Australia.** | WA-to-GP or WA-to-interstate-hospital flows are unrestricted from the WA side under IPP 9. APP 8 governs overseas transfers (see section 3). |
| s 79 (PIA obligation) | Privacy Impact Assessment is **mandatory** before first performance of a high privacy impact function or activity. Note: s 137 extends this obligation to contracted service providers -- s 79 is the primary PIA trigger. | Bede must complete a PIA before any WA public hospital pilot and provide it to the hospital's Information Governance team and Privacy Officer. |
| Part 2 Division 6 (ss 57-75) | Mandatory notifiable information breach scheme. Commences **1 January 2027** (not yet in force). | Design for it now. Bede's incident response SOP should pre-empt this requirement. |

### 2.4 State health records acts (NSW and Victoria) -- relevant on expansion

WA has no standalone state health records privacy act for either public or private sector. WA private hospitals are governed by Commonwealth APPs only. On expansion to NSW or Victoria:

- **NSW HRIP Act 2002, HPP 11:** governs disclosure by all NSW health organisations (public and private). **HPP 14** imposes an **interstate** transborder restriction: any transfer outside NSW (including to another Australian state) requires the receiving party to be subject to protections substantially similar to the NSW HPPs [verify HPP 14 text in the current compiled NSW HRIP Act -- in particular that the restriction reaches interstate as well as overseas transfers; this is the critical practical difference from APP 8]. Commonwealth APPs satisfy that test for private providers; WA PRIS Act IPPs satisfy it for WA public entities from 1 July 2026.
- **Vic Health Records Act 2001, HPP 2 + HPP 9:** parallel framework; HPP 9 applies to transfers outside Victoria (interstate + overseas). Same "substantially similar" test applies.

For Bede v1 (WA pilot only), no interstate transborder analysis is required from the **sending** side. The receiving state's law may impose its own obligations on the receiver, but that is the receiver's compliance problem, not Bede's.

---

## 3. The Cross-Border Tripwire (APP 8 / s 16C)

### 3.1 What APP 8 and s 16C do

APP 8.1 requires an APP entity, before disclosing personal information to an **overseas recipient**, to take reasonable steps to ensure the recipient will not breach the APPs. Section 16C then imposes accountability: even where reasonable steps were taken, the Australian entity remains accountable for any subsequent APP breach by the overseas recipient -- that breach is treated as an act of the Australian entity.

**Critical point on s 16C:** no contractual arrangement with an overseas recipient eliminates s 16C accountability. A DPA may satisfy the "reasonable steps" limb of APP 8.1, but if the overseas recipient then breaches the APPs, that breach is treated as an act of the Australian entity. The only mechanisms that eliminate s 16C exposure entirely are: (a) keeping all transfers onshore; or (b) de-identifying data before any overseas transfer such that APP 8 is not triggered. This is the single biggest technical constraint for Bede's infrastructure.

### 3.2 The use vs disclosure distinction for cloud

APP 8 applies only to a **disclosure**. Routing data in transit through overseas servers is ordinarily a **use** (not a disclosure), provided the entity retains effective control: OAIC APP 8 Guidelines, section headed "Disclosure to an overseas recipient" [verify current paragraph numbering -- previously cited as para 8.10 but OAIC guidelines are periodically re-numbered; cite by heading].

Storing or processing PHI on overseas-region cloud infrastructure where the data is accessible to the overseas provider outside that control is a **disclosure**. APP 8.1 is triggered.

The three-condition test for "use" characterisation (OAIC APP 8 Guidelines, section headed "Accessing or storing personal information using cloud computing") [verify current paragraph numbering]:

1. The data processing agreement (DPA) binds the provider to handle the data solely for storage and access on behalf of Bede (no use for training, analytics, or the provider's own purposes).
2. All subprocessors are bound by identical restrictions.
3. Bede retains effective control: the right to access, modify, retrieve, and delete the data at any time; the provider cannot unilaterally access identifiable data.

If any condition fails -- for example, if the US parent of an AU-region cloud provider retains a support-access right to identifiable data, or if the ToS permits using data to improve the provider's services -- the arrangement becomes a **disclosure** to an overseas entity, and APP 8.1 is triggered.

### 3.3 How to make APP 8 a non-issue

Deploy Bede's backend on **AWS ap-southeast-2 (Sydney)**, **Azure australiaeast**, or an equivalent Australian-region cloud with a DPA that satisfies all three conditions above. This achieves the "use" characterisation. APP 8 and s 16C never engage. Document the data-residency commitment and DPA analysis in Bede's privacy policy and in each hospital's data processing agreement.

This is the cleanest design decision available. It requires no cross-border consent, no equivalent-protections assessment, and no s 16C accountability exposure.

### 3.4 The AI layer tripwire

If Cecilia (the AI inference layer) sends identifiable patient data -- including wound photos or clinical notes -- to an overseas LLM API as part of the request payload, that **is** a disclosure to an overseas recipient and APP 8.1 is triggered. Three design options:

| Option | How it bears on APP 8 | s 16C exposure eliminated? | Feasibility for v1 |
|--------|----------------------|---------------------------|-------------------|
| On-premises or AU-hosted inference (local model on the hospital server, or an AU-region hosted model) | No overseas transfer; APP 8 not triggered | Yes | Preferred for v1 |
| De-identification or pseudonymisation before API call | De-identified data is not personal information; APP 8 not triggered | Yes, if de-identification meets the OAIC's standard [bar is high] | Acceptable if de-identification is robust |
| Express patient consent with APP 8.2(b) warning | APP 8.2(b)(i) requires the entity to expressly inform the individual that APP 8.1 protections will not apply; APP 8.2(b)(ii) requires affirmative consent after that warning | **No** -- s 16C accountability remains even with consent; the Australian entity remains liable for any subsequent breach by the overseas provider | Cumbersome and leaves full s 16C exposure; not suitable as a default |

A blanket privacy policy clause is insufficient for the consent exception. Affirmative, informed, per-patient consent satisfying both APP 8.2(b)(i) and (b)(ii) is required if this option is used. It does not eliminate s 16C accountability.

---

## 4. Decision Tree by Bede Transfer Scenario

> **Gateway assessment note for all scenarios below:** The APP 6.2(a) analysis describes the applicable legal pathway in paradigm cases. Whether the gateway is satisfied for any specific transfer depends on the actual content of the admission consent, the nature of the receiving provider, and the clinical context. A general reference to "treating team" or "nominated GP" in an admission consent does not automatically cover every transfer Bede may execute. Each transfer event must be assessed on its facts and the basis documented before the transfer executes.

### Scenario (a): Inter-hospital patient transfer

| Element | Answer |
|---------|--------|
| **Gateway** | Gateway 2 (APP 6.2(a)): directly related secondary purpose + reasonable expectation. The patient's care is continuing at the receiving hospital; transfer of the clinical record is directly related to the primary collection purpose and is within any reasonable patient's expectation in a standard inter-hospital handover. |
| **Consent required** | No fresh consent per transfer is required **where** the admission consent covered "disclosure to other treating facilities involved in your care" and the transfer is a standard inter-hospital handover within the care relationship. If the original consent was silent, the APP 6.2(a) reasonable-expectation analysis may still support the transfer in a standard handover scenario, but the specific basis must be documented in the audit log and verified with a solicitor on those facts. |
| **Channel** | Integrate with the receiving hospital's existing SMD-conformant rail (HealthLink, Medical Objects, or ReferralNet) rather than building a raw TLS channel. The SMD vendor handles provider directory authentication, encryption, and audit for the transport layer. See section 6. |
| **Do pixels need to move?** | Only if clinically necessary. A structured discharge summary (text report) often suffices. Where wound photos are clinically relevant to the receiving team's care plan, transfer the specific images selected by the clinician -- not the full album. Record the clinical justification in the transfer event. |
| **WA PRIS Act (public hospitals)** | If the sending hospital is a WA public hospital, IPP 2 requires the secondary purpose to be documented in writing before the transfer event is executed. The append-only log satisfies this. |

### Scenario (b): Discharge to GP

| Element | Answer |
|---------|--------|
| **Gateway** | Gateway 2 (APP 6.2(a)) is the primary pathway. OAIC Guide to Health Privacy, ch 3, states that patients would generally expect a GP to disclose information to a specialist on referral; the same logic operates in reverse for a hospital discharging to a patient's nominated GP. |
| **Consent required** | No fresh consent per discharge is required **where** the admission consent covered "disclosure to your nominated GP" and the receiving GP is the patient's nominated GP. Bede should record which GP is nominated at admission. If the patient has no nominated GP on record, if the receiving GP is a locum at a different clinic, or if the admission consent did not address GP disclosure, the basis for the transfer must be separately assessed and documented. The paradigm case does not automatically extend to these variations. |
| **Channel** | The GP practice almost certainly has a HealthLink or Medical Objects inbox already. Integrate with that rail and send a structured HL7 or CDA discharge summary with attached images where clinically indicated. |
| **Do pixels need to move?** | Only for clinically relevant wound or lesion documentation. Send the minimum necessary: specific selected images, not the full record. Bede's image selector for transfers must default to individual image selection, not "share all." |
| **What NOT to do** | Do not send via standard email (unencrypted, unauthenticated recipient). Do not use a consumer file-share link. These channels satisfy no lawful gateway and breach APP 11 (security) regardless of whether they are technically permissible under APP 6. |

### Scenario (c): Off-site consultant opinion on a wound photo

| Element | Answer |
|---------|--------|
| **Gateway** | Gateway 2 (APP 6.2(a)): specialist referral for a specific clinical question is directly related to the patient's treatment and within reasonable expectation in a formal referral context. Gateway 1 (consent) reinforces this where admission consent explicitly covered referral to specialist consultants. |
| **Consent required** | No fresh consent if the care relationship with the consultant is established (formal referral, not an ad-hoc request). Document the referral basis and the consultant's identity in the transfer audit event. |
| **Channel** | For formal specialist referrals: SMD-conformant rail (HealthLink/Medical Objects). For telehealth or informal consult within the treating team: a secure, AU-hosted platform (encrypted, authenticated, AU-region storage) with an audit log. Do not use consumer messaging apps (WhatsApp, iMessage, SMS). WA public hospitals have explicit policies prohibiting clinical photos on personal mobile devices outside a compliant platform. |
| **Do pixels need to move?** | Yes -- this scenario is explicitly about an image. Transfer only the specific image(s) selected for the consult. Log the selection. |
| **Is the consultant overseas?** | If the consultant is outside Australia, APP 8 analysis is required before transfer. See mechanism comparison below. |

**Overseas consultant -- mechanism comparison:**

| Mechanism | Satisfies APP 8.1? | Eliminates s 16C accountability? | Notes |
|-----------|-------------------|----------------------------------|-------|
| Keep data onshore (consultant accesses via AU-hosted portal; no transfer overseas) | APP 8.1 not triggered | Yes | Preferred |
| De-identified or pseudonymised data sent overseas | APP 8 not triggered (not personal information) [verify de-identification meets OAIC standard] | Yes, if de-identification is robust | Acceptable |
| APP 8.2(b) express consent with warning | Yes, if patient informed under 8.2(b)(i) and consents under 8.2(b)(ii) | **No** -- s 16C remains; Australian entity liable for any subsequent breach by overseas consultant | Leaves full s 16C exposure |
| Binding DPA with overseas consultant requiring APP compliance | May satisfy "reasonable steps" limb of APP 8.1. Note: a bilateral DPA does not constitute a "law or binding scheme" under APP 8.2(a) -- it does not invoke the substantially-equivalent-foreign-law exception | **No** -- s 16C remains; if overseas consultant breaches APPs, that breach is treated as an act of the Australian entity | Reduced risk compared to no DPA; does not eliminate s 16C exposure |

**Conclusion:** only the "keep data onshore" option and the de-identification option eliminate s 16C exposure. The APP 8.2(b) consent option and the DPA option are reduced-risk measures, not a resolution of the APP 8 problem. Treat overseas consultant transfers as a restricted, documented exception with explicit CISO and legal sign-off.

### Scenario (d): Giving the patient their own copy

| Element | Answer |
|---------|--------|
| **Gateway** | Not a "disclosure" in the privacy sense. The patient accessing their own health record is the exercise of their right under APP 12. The hospital has an obligation to provide access to health information unless a specific exception applies (APP 12.3). |
| **Consent required** | None -- this is the patient's own information. Identity verification is the only procedural requirement: confirm the person requesting is the patient or their authorised representative. |
| **Channel** | A secure patient portal (AU-hosted, authenticated) is the appropriate mechanism for digital delivery. An unauthenticated download link emailed to an unverified address is not. |
| **Do pixels need to move?** | Yes, if the patient requests their clinical images. The patient has the same right of access to images as to notes. |
| **Specific concern** | If the patient requests images of a third party incidentally captured (e.g., a family member in the frame), redact the third party before providing the copy. |

---

## 5. What Bede Must Build to Stay Lawful

Items are tagged v1 (required before any real PHI onboarding), v2 (required before scaled deployment), or v3 (longer term / after clinical governance consultation).

### 5.1 Consent capture (v1)

- At patient admission, capture a structured consent event in the append-only log: patient identifier (pseudonymised key), consent version, date, and which disclosure categories are covered (treating team at this facility / external treating providers for referrals and discharge / nominated GP).
- At photo attachment time, record a consent sub-event. General treatment consent does not automatically cover clinical photography. Per OAIC guidance on taking photos of patients, consent for photography should address the purpose (treatment documentation, education, publication) and the scope (taking, storing, sharing). Bede's admission consent form must enumerate photography for treatment documentation as a distinct item. Record whether that consent was given and for what stated purpose.
- If the admission consent does not cover the specific transfer (e.g., a referral to a consultant not contemplated at admission), record the APP 6.2(a) basis in the transfer event: receiving provider identity, treating relationship, clinical purpose.

### 5.2 Consent and purpose flag on any outbound item (v1)

Every externally transferred item (note, result, image) must carry a purpose flag in its transfer audit event:
- Gateway used (Gateway 1 consent / Gateway 2 APP 6.2(a) / Gateway 4 serious threat / Gateway 7 s 16B(5) responsible person).
- Receiving provider identity (name, role, HPI-I where available, facility).
- Clinical purpose of the transfer.
- Clinician asserting the treating-relationship basis (for Gateway 2).

For WA public hospitals, this documentation must be created **before** the transfer event executes (PRIS Act IPP 2).

### 5.3 Immutable audit event (v1)

Each transfer must append a structured event to the log with: timestamp, user ID (sender), patient pseudonymised key, item ID(s) transferred, recipient identity, gateway used, purpose, channel used. The log must be append-only (no update, no delete) and retained for the health records retention period (7 years from last entry for adults; up to 25 years for records involving treatment of a child, per WA Health Records guidelines). This aligns with Bede's existing architecture.

### 5.4 Data-residency guarantee (v1)

- Deploy on AWS ap-southeast-2 or Azure australiaeast.
- Execute a DPA with the cloud provider satisfying the three-condition test (section 3.2 above): storage-only purpose; subprocessor binding; Bede retains effective control.
- Document the data-residency commitment and DPA analysis in Bede's privacy policy and in each hospital's data processing agreement.
- State the AU-region constraint in the privacy policy and in CISO submission materials.

### 5.5 Minimum-necessary transfer (v1 and v2)

- **v1:** The image selector for transfers must default to individual image selection. No "share all records" bulk export for inter-facility transfers. Send the specific selected images plus the structured discharge summary, not the full patient record.
- **v2:** Offer an inline crop tool for removing faces and incidental identifying marks before transfer. Log the crop decision. [The v1 per-image selector is the required minimum; the crop tool is a useful enhancement deferred to v2.]

### 5.6 Recipient authentication (v1)

- Require sending clinicians to assert and log the recipient's treating-relationship status before any transfer executes.
- For SMD-rail transfers, the SMD vendor's provider directory (HI Service authentication) handles this. For direct transfers (SFTP to a specific hospital endpoint), verify the recipient endpoint identity via PKI before transmitting.
- Do not permit transfers to unauthenticated endpoints (email addresses, consumer file-share links).

### 5.7 s 16B(5) responsible-person pathway (v3 -- consult clinical governance team before scoping)

The responsible-person gateway (s 16B(5)) applies when a patient is incapacitated and a family member needs clinical information. Hospitals manage this through existing clinical governance processes (MET calls, ICU workflows, social work). Bede is not the system of record for capacity assessments. Defer this pathway to v3, and scope only after consulting with the clinical governance team at the pilot hospital.

If eventually scoped, the **five** s 16B(5) conditions must all be documented: (1) incapacity type and basis; (2) identity of the responsible person; (3) clinical basis for disclosure; (4) scope limited to "reasonable and necessary"; (5) no contrary prior wish recorded. A clinical override and supervisor attestation should be required before executing.

Do **not** conflate this pathway with inter-treating-provider transfers where the patient lacks capacity: those flow through Gateway 2 (APP 6.2(a) -- treating team / directly related secondary purpose), not s 16B(5).

### 5.8 Notifiable data breach response SOP (v1, documented; v2, tooled)

Build a 30-day NDB assessment SOP into incident response documentation:
- Breach triage checklist keyed to the s 26WE three-limb test: unauthorised access / disclosure / loss; likely to result in serious harm; not remediable with immediate action.
- Remote wipe / session revocation playbook (s 26WF remediation carve-out: if identifiable data is not accessed before the device is wiped, the breach may not be an eligible data breach).
- Draft OAIC notification statement template (s 26WK prescribed content).
- Draft patient notification letter template (s 26WL).
- Default assumption: any confirmed unauthorised access to identified patient health information is notification-required. The "serious harm likely" limb is almost always satisfied for health information.

### 5.9 What NOT to build now

- Do not build an MHR upload or read integration in v1. MHR integration requires ADHA conformance (4-8 months), NASH PKI certificates, HPI-O registration by each hospital client, and a strict AU-residency posture confirmed in writing. The direct-transfer rail (APP 6 pathway) is open today without any of that.
- Do not build an overseas-transfer pathway. All transfers stay onshore until the AU data-residency architecture is verified with a health-law solicitor and the hospital's CISO.
- Do not build bulk-export or "share all records" features before the per-item minimum-necessary controls are confirmed.
- Do not integrate Cecilia with any overseas LLM API using identifiable patient data until the AI inference architecture is resolved (section 3.4).

### 5.10 TGA SaMD self-assessment (v1 -- required before any clinical pilot with real patients)

TGA classification of software as a medical device depends on the software's **intended purpose and functional claims**, not on communication architecture. If Bede:
- assists clinicians in making or supporting clinical decisions (wound progression assessment, escalation triggers);
- generates, captures, or organises patient clinical data that influences treatment decisions; or
- is intended to be used in relation to the diagnosis, prevention, monitoring, or treatment of a condition;

then Bede may be classified as a Class IIa (or higher) Software as a Medical Device (SaMD) under the *Therapeutic Goods Act 1989* (Cth) regardless of whether it routes documents through an existing compliant rail. ARTG inclusion is required for Class IIa and above before clinical use with real patients. Using an SMD messaging rail does not determine TGA classification.

**Action before any clinical pilot:** prepare a documented TGA SaMD self-assessment using the IMDRF SAMD guidance and TGA's Software as a Medical Device guidance. Determine whether Bede's wound-tracking and escalation features place it in Class I (may be exempt), Class IIa, or Class IIb. If IIa or above, engage a TGA regulatory consultant and initiate ARTG inclusion. A hospital CISO will request this self-assessment before approving any clinical software for use with real patient data.

### 5.11 Hospital IT governance gate conditions (v1 -- required before CISO submission)

A hospital IT governance process will impose the following before any real PHI is onboarded, regardless of the quality of the privacy analysis. These are gate conditions imposed by the receiving institution:

- **ASD Essential Eight / Information Security Manual:** for any deployment touching WA Health (public hospitals), the CISO will require evidence of compliance with the ASD Essential Eight Maturity Model. Prepare a self-assessment before the first CISO meeting.
- **Clinical safety management system:** ADHA's Digital Health -- Clinical Safety Management Systems standard (AS/NZS 80001-1 and related) applies to health IT systems in use in clinical environments. A ward documentation app is within scope. Prepare a clinical safety case before pilot.
- **IRAP assessment:** WA Health and most Local Hospital Networks require an IRAP (Information Security Registered Assessors Program) assessment at Protected level for systems processing clinical data. Engage an IRAP assessor as part of v1 preparation for any public hospital pilot.
- **Availability and clinical continuity:** hospitals will require documented RTO/RPO targets, a failover plan, and a procedure for what clinicians do if Bede is unavailable during a shift. Include these in the CISO submission.

---

## 6. The Channel

### 6.1 The three options

| Channel | What it is | APP 8 / regulatory position | Bede's role |
|---------|-----------|----------------------------|-------------|
| **AU secure messaging rail (HealthLink / Medical Objects / ReferralNet)** | SMD-conformant (ATS 5822) vendor networks already connecting hospitals, GPs, and specialists across Australia. Carry HL7 v2, CDA documents, and attachments including clinical images. Provider directory authentication via HI Service (NASH PKI). | AU-hosted, AU-regulated. No APP 8 issue. Pre-approved by hospital CISOs because these vendors are already on the hospital's approved-vendor list. | Integrate as a **consumer** of the SMD vendor's API. Inherit their conformance, encryption, provider directory, and audit. This is the fastest path to CISO approval and to clinical workflow fit (GPs and specialists already receive HealthLink or Medical Objects messages). |
| **Kiteworks-style MFT (managed file transfer)** | Secure, audited file transfer platform (e.g., Kiteworks, Aspera). [Note: MOVEit Transfer (Progress Software) suffered a critical zero-day SQL injection vulnerability in May-June 2023 that resulted in widespread health-sector data breaches globally, including Australian organisations. If evaluating MOVEit, verify current patch status and organisational remediation against that incident before including it on any shortlist.] | AU-hosted deployment satisfies APP 8. Requires separate procurement, onboarding, and DPA. Recipient must also have access to the platform. | Relevant for bulk data export (audit, research), not real-time clinical transfers. Not the right tool for discharge summaries or referral images. |
| **My Health Record rail** | National platform for text reports (pathology, imaging, discharge summaries). ADHA-administered. | AU-hosted (s 77 strict residency). ADHA conformance required (4-8 months). NASH PKI mandatory. | Viable long-term for report-level data. Does **not** carry clinical photographs. Defer to v3. |

### 6.2 The recommendation for a pre-pilot solo founder

**Integrate with the hospital's existing SMD-conformant rail rather than becoming a regulated transfer operator yourself.**

Reasons:

1. **APP 8 avoidance:** using an existing AU-hosted SMD vendor means no overseas transfer occurs. No APP 8 analysis needed.
2. **CISO approval:** HealthLink and Medical Objects are already on the approved-vendor list at virtually every Australian hospital. Saying "Bede sends discharge summaries via HealthLink" is a much shorter CISO conversation than "Bede has built its own encrypted transfer channel."
3. **Provider directory:** SMD vendors handle HPI-I authentication and provider directory lookup. Bede inherits recipient authentication without building it.
4. **Audit:** the SMD vendor generates delivery receipts and audit logs at the transport layer. Bede's own audit log covers the application layer. Together they form a complete chain.
5. **TGA note:** TGA SaMD classification depends on Bede's intended purpose and functional claims -- not on which messaging rail it uses. A TGA SaMD self-assessment is required regardless of channel choice (see section 5.10).

For clinical photos (which SMD rails can carry as attachments within CDA or HL7 messages), confirm attachment size and format support with the chosen SMD vendor before building the integration. HealthLink and Medical Objects both support attachments; verify the specific limits with their integration teams.

### 6.3 Argus

Argus is a historical secure messaging network now merged into the HealthLink / Medical Objects ecosystem. Do not build a separate Argus integration; HealthLink or Medical Objects covers the same recipient directory.

---

## 7. Documents to Download

The following primary-source URLs are deduplicated across all research instruments. Download and retain these before any legal review.

### Privacy Act 1988 (Cth)

| Document | URL | Format |
|----------|-----|--------|
| Privacy Act 1988 -- Federal Register Series page (always current) | https://www.legislation.gov.au/Series/C2004A03712 | HTML |
| Privacy Act 1988 -- Compilation C2026C00227 (4 June 2026) downloads | https://www.legislation.gov.au/C2004A03712/latest/downloads | HTML (links to PDF and DOCX) |
| OAIC APP 6 Guidelines -- Use or Disclosure | https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-6-app-6-use-or-disclosure-of-personal-information | HTML |
| OAIC APP 8 Guidelines -- Cross-Border Disclosure | https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-8-app-8-cross-border-disclosure-of-personal-information | HTML |
| OAIC APP 11 Guidelines -- Security | https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information | HTML |
| OAIC Chapter D -- Permitted Health Situations (s 16B) | https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-d-permitted-health-situations | HTML |
| OAIC Guide to Health Privacy -- May 2025 (collated PDF) | https://www.oaic.gov.au/__data/assets/pdf_file/0020/251183/Guide-to-Health-Privacy-Collated-May-2025.pdf | PDF |
| OAIC Guide to Health Privacy -- Chapter 3 (Using or Disclosing) | https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/health-service-providers/guide-to-health-privacy/chapter-3-using-or-disclosing-health-information | HTML |
| OAIC -- Taking photos of patients | https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/health-service-providers/taking-photos-of-patients | HTML |
| OAIC -- Sending personal information overseas (APP 8 practical guide) | https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/sending-personal-information-overseas | HTML |
| OAIC -- Notifiable Data Breaches: Part 4 NDB Scheme | https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/preventing-preparing-for-and-responding-to-data-breaches/data-breach-preparation-and-response/part-4-notifiable-data-breach-ndb-scheme | HTML |
| OAIC -- State and Territory privacy legislation overview | https://www.oaic.gov.au/privacy/privacy-legislation/state-and-territory-privacy-legislation | HTML |
| Privacy Act 1988 s 16B -- AustLII | https://www.austlii.edu.au/cgi-bin/viewdoc/au/legis/cth/consol_act/pa1988108/s16b.html | HTML |

### My Health Records Act 2012 (Cth) and Healthcare Identifiers Act 2010 (Cth)

| Document | URL | Format |
|----------|-----|--------|
| My Health Records Act 2012 -- latest compiled version | https://www.legislation.gov.au/C2012A00063/latest/text | HTML |
| Healthcare Identifiers Act 2010 -- latest compiled version | https://www.legislation.gov.au/C2010A00072/latest/text | HTML |
| Health Legislation Amendment (Modernising My Health Record -- Sharing by Default) Act 2025 | https://www.legislation.gov.au/C2025A00008 | HTML [verify series page on legislation.gov.au -- Act No. 8 of 2025. A previous version of this document cited an ATO domain URL which was incorrect; Commonwealth Acts are published on legislation.gov.au, not ato.gov.au] |
| OAIC -- Individual Healthcare Identifiers: Obligations for Private Health Service Providers | https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/health-service-providers/individual-healthcare-identifiers/individual-healthcare-identifiers-obligations-for-private-health-service-providers | HTML |
| ADHA -- Secure Messaging for healthcare providers | https://www.digitalhealth.gov.au/healthcare-providers/initiatives-and-programs/secure-messaging | HTML |
| ADHA -- Better access to health information (Share by Default) | https://www.digitalhealth.gov.au/healthcare-providers/initiatives-and-programs/better-access-to-health-information | HTML |
| ADHA Implementer Hub -- Testing and Conformance | https://implementer.digitalhealth.gov.au/resources/topics/testing-and-conformance | HTML |
| MinterEllison -- Sharing by Default Act 2025 implications | https://www.minterellison.com/articles/new-opt-out-model-for-my-health-record-information | HTML |
| Health.gov.au -- Share by Default FAQ (PDF) | https://www.health.gov.au/sites/default/files/2025-02/frequently-asked-questions-modernising-my-health-record-sharing-by-default-act-2025_0.pdf | PDF |

### WA instruments

| Document | URL | Format |
|----------|-----|--------|
| Privacy and Responsible Information Sharing Act 2024 (WA) -- consolidated HTML | https://www.legislation.wa.gov.au/legislation/statutes.nsf/RedirectURL?OpenAgent&query=mrdoc_49691.htm | HTML |
| Privacy and Responsible Information Sharing Act 2024 (WA) -- consolidated PDF | https://www.legislation.wa.gov.au/legislation/statutes.nsf/RedirectURL?OpenAgent&query=mrdoc_49691.pdf | PDF |
| WA OIC -- Information Privacy Principles Summary | https://www.wa.gov.au/organisation/office-of-the-information-commissioner/information-privacy-principles-summary | HTML |
| Health Services Act 2016 (WA) -- full text (AustLII) | https://classic.austlii.edu.au/au/legis/wa/consol_act/hsa2016161/ | HTML |
| WACHS Clinical Image Photography and Videography Policy | https://www.wacountry.health.wa.gov.au/~/media/WACHS/Documents/About-us/Policies/Clinical-Image-Photography-and-Videography-Policy.pdf | PDF |
| WACHS Adult Photography and Film Consent Form | https://www.wacountry.health.wa.gov.au/~/media/WACHS/Documents/DHAC/DHAC-guidelines-policies-and-member-resources/Photo_consent_form_Adult.PDF | PDF |
| WA Parliament -- Arrangements to manage confidential patient information (tabled paper) | https://www.parliament.wa.gov.au/publications/tabledpapers.nsf/displaypaper/4011559ae391a5bd7a884a50482582ea00176fd5/$file/1559.pdf | PDF |

### State instruments (NSW and Victoria -- for future expansion)

| Document | URL | Format |
|----------|-----|--------|
| NSW Health Records and Information Privacy Act 2002 | https://legislation.nsw.gov.au/view/whole/html/inforce/current/act-2002-071 | HTML |
| NSW IPC -- Statutory Guidelines on Management of Health Services | https://www.ipc.nsw.gov.au/sites/default/files/2019-01/statutory_guidelines_on_the_management_of_health_services.pdf | PDF |
| Vic Health Records Act 2001 | https://www.legislation.vic.gov.au/in-force/acts/health-records-act-2001 | HTML |

### Clinical photography guidance

| Document | URL | Format |
|----------|-----|--------|
| RACGP -- Using personal mobile devices for clinical photos | https://www.racgp.org.au/running-a-practice/technology/mobile-devices-to-support-care/using-personal-mobile-devices-for-clinical-photos | HTML |
| AMA -- Clinical images and the use of personal mobile devices | https://ama.com.au/sites/default/files/documents/FINAL_AMA_Clinical_Images_Guide.pdf | PDF |
| MJA 2013 -- Legal considerations of consent and privacy in clinical photography in Australia | https://www.mja.com.au/journal/2013/198/1/legal-considerations-consent-and-privacy-context-clinical-photography-australian | HTML |
| RACGP AJGP 2019 -- Clinical photography of skin lesions | https://www1.racgp.org.au/ajgp/2019/july/clinical-photography-of-skin-lesions | HTML |
| Avant -- Clinical images: a snapshot of the issues | https://avant.org.au/resources/clinical-images-a-snapshot-of-the-issues | HTML |

### Security and clinical safety standards

| Document | URL | Format |
|----------|-----|--------|
| ASD Essential Eight Maturity Model | https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/essential-eight/essential-eight-maturity-model | HTML |
| Australian Government Information Security Manual (ISM) | https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/ism | HTML |
| TGA -- Software as a Medical Device guidance | https://www.tga.gov.au/resources/resource/guidance/software-medical-device | HTML |
| IMDRF SAMD -- N41 Clinical Evaluation | https://www.imdrf.org/documents/software-medical-device-samd-clinical-evaluation | HTML |
| ADHA -- Clinical Safety Management Systems reference | https://www.digitalhealth.gov.au/healthcare-providers/initiatives-and-programs/clinical-safety | HTML |

---

## Penalty reference (current rates)

Penalty unit rate: **$364 per unit** from 1 July 2026, per *Crimes Act 1914* (Cth) s 4AA [verify current figure against the applicable indexation instrument before relying on any dollar amount].

| Provision | Sanction | Current dollar value ($364/PU from 1 July 2026) |
|-----------|----------|-------------------------------------------------|
| Privacy Act -- serious or repeated interference with privacy (s 13G post-POLA 2024) | Greater of $50M / 3x benefit / 30% of adjusted annual turnover (body corporate); $2.5M (individual) | --- |
| MHR Act s 59/s 60 -- unauthorised access/use/disclosure | Criminal 120 PU or 2 years imprisonment; civil 600 PU | $43,680 criminal / $218,400 civil |
| MHR Act s 77 -- data outside Australia | Criminal 300 PU or 5 years imprisonment; civil 1,500 PU | $109,200 criminal / $546,000 civil |
| MHR Act s 78A -- failure to share (Share by Default) | Civil 30 PU | $10,920 |
| HI Act s 26 -- unauthorised use/disclosure of IHI | Criminal 120 PU or 2 years (individual); 600 PU (corporation) | $43,680 / $218,400 |
| WA PRIS Act -- non-compliance with compliance notice | $60,000 fine | $60,000 |
| WA PRIS Act -- compensation to individuals | Up to $75,000 per complaint | $75,000 |
| WA PRIS Act -- serious contravention | Imprisonment up to 3 years | --- |

Health information breaches sit at the top of the seriousness scale across every framework. For a pre-revenue founder, a breach involving real identified patient data is existential under the post-POLA 2024 penalties. The pre-pilot stage, when no real PHI is onboarded, is the window to get the architecture right.