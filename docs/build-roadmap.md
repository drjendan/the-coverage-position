# The Coverage Position Build Roadmap

October 9, 2026 | Initial release plan

The product is intended for nationwide use. The first release will help an adjuster review commercial general liability Coverage A claim documents and produce an editable acceptance, reservation-of-rights, or denial letter. Start testing with the supplied New York matter and expand validated state/customer configurations after the workflow is accurate and useful. New York is the first fixture, not a geographic product restriction. The adjuster selects the coverage position; AI supports extraction, review, and drafting.

Build each milestone as a working increment with a demonstration and acceptance check. The build specifications are complete as a starting point; the M1 local claims workspace has been implemented. Hosting, AI integration, templates, and production settings remain implementation decisions.

## Milestone overview

| Milestone | Outcome | Depends on | Status |
| --- | --- | --- | --- |
| M0 Project setup | Architecture decisions, source control, fixtures, and backlog | Existing specifications | Initial local foundation complete; production/provider decisions pending |
| M1 Claims workspace | Usable dashboard and matter workflow | M0 | Implemented locally; see milestone report |
| M2 Secure documents | Authenticated access, private uploads, and page viewing | M1 | M2A auth/quarantine implemented; cloud verification and M2B scanning/viewer pending |
| M3 Verified facts | Redaction-aware extraction and source-linked fact review | M2 and approved processing services | Planned |
| M4 Coverage review | Policy inventory, endorsements, and adjuster checklist | M3 | Planned |
| M5 Letter drafting | Editable letters in the supplied Word structure | M4 and approved AI integration | Planned |
| M6 Approval and export | Version-specific approval and Word/PDF exports | M5 | Planned |
| M7 Pilot release | Validated end-to-end workflow in a private environment | M6 | Planned |

## M0 Project setup

**Deliverables**

- Dedicated project named The Coverage Position with source control, setup instructions, environment-variable example, and change history.
- Architecture decision record covering frontend, API, database, private storage, background worker, OCR, and AI integration.
- Initial schema and migrations for organizations, users, matter access, matters, parties, documents, facts, policy provisions, issues, letters, versions, approvals, and audit events.
- Separate development, test, and production configuration. No credentials or claim files committed to the repository.
- Test fixtures derived from permitted visible content in the supplied complaint, policy, and sample letter; synthetic examples for missing names, conflicting dates, and out-of-period incidents.
- Initial backlog tied to the requirements and milestone acceptance criteria.

**Implementation direction**

Use a browser application with a server API, relational database, private file storage, and asynchronous document-processing worker. Keep OCR and AI behind service adapters so provider selection does not require rewriting the user workflow. Start with a single pilot organization while enforcing organization and matter access in the data model.

The company's own Copilot was discussed in the meeting as an integration idea. Validate supported integration, licensing, authentication, and approved data handling before committing to it. A mock adapter may support development, but must be explicitly labeled and unable to process live claims.

**Done when:** The project runs locally, configuration is documented, migrations are reproducible, and the first implementation backlog is ready. Repository and hosting destinations can be connected once chosen; local foundation work can proceed without them.

## M1 Claims workspace

**Deliverables**

- Product shell with clear navigation: Dashboard, Matters, Review Queue, Templates, and Settings.
- Dashboard with matter counts, assignments, statuses, blockers, and search.
- Create/edit matter form: claim number, working title, jurisdiction, insured, claimant, analyst, reviewer, and recipient details.
- Matter detail workspace with Overview, Documents, Facts, Policy Review, Coverage Review, Letter, and Activity tabs.
- Save-and-resume behavior, validation, empty states, loading states, and useful error messages.
- Initial matter status handling. Future features appear as unavailable until implemented; no simulated analysis presented as real processing.

**Demonstration:** Create a synthetic matter, save it, find it on the dashboard, reopen it, and edit its details.

**Done when:** The core workflow works after reload and does not lose saved matter data. Any demo identity or local persistence is clearly labeled and restricted to synthetic content. M1 is a usable application foundation, not a production claims system.

## M2 Secure documents and access

Implement the controls and evidence requirements in `security-plan.md` alongside this milestone. Netlify initially hosts a read-only synthetic preview; the writable production API requires an approved persistent database, authentication, and private storage.

**Deliverables**

- Real authentication and configurable analyst, reviewer, and administrator permissions.
- Organization and matter access checks in the API and data layer, including original-file downloads.
- Private PDF uploads for complaints and policy packets; initial pilot size/page limits with understandable rejection messages.
- Document classification, content hashes, duplicate detection, immutable source versions, and operative-version selection.
- Private page viewer, original download, PDF page numbering, and document status.
- Upload validation, scanning, password-protection handling, and readable failure/retry states.
- Processing job records and background worker scaffolding.

Initial source support is PDF. Add attorney letters and incident reports supplied as PDFs; direct DOCX/email ingestion requires a defined parser and separate acceptance checks. The Word letter template is handled in M5.

**Demonstration:** Upload a complaint and policy to one matter, view their pages, add an amended complaint, and verify that another unauthorized account cannot retrieve the files.

**Done when:** Storage is private, original versions are preserved, and unauthorized API/file requests fail. This gate is required before real claim-document processing.

## M3 Extraction and fact verification

**Deliverables**

- Render-first, redaction-aware processing that respects visible redactions even when hidden text remains in the PDF.
- Page-level extraction/OCR with source coordinates; table and checkbox handling for limits and deductibles.
- Structured candidates for parties, named insureds/DBAs, incident and filing dates, addresses, policy number/period, limits, deductibles, allegations, and damages.
- Side-by-side fact review with source-page links and verify/correct/unresolved actions.
- Repeated-date checks, conflicting-value warnings, and explicit unknown/redacted values.
- Job progress, retry, pipeline versioning, and preservation of reviewer corrections.

**Demonstration:** Process the Doherty packet, verify the incident date and policy period, confirm the leading zero in the policy number, and inspect the deductible evidence. Demonstrate that hidden text beneath visible redactions does not enter derived text, indexes, prompts, or generated output.

**Done when:** Critical values have evidence or an explicit unresolved status; redactions are honored; corrected facts persist. Automated redaction detection must flag uncertain regions for human inspection rather than reconstruct concealed information.

## M4 Policy inventory and coverage checklist

**Deliverables**

- Coverage form and endorsement inventory reconciled with the forms schedule.
- Full clause retrieval, including page continuations, definitions, exceptions, schedules, and modifying endorsements.
- Checklist covering insured identity, incident timing, bodily injury/property damage, insuring agreement, exclusions, endorsements, and unresolved information.
- Issue records containing allegations, provisions, sources, suggested rationale, missing information, and reviewer decisions.
- Reviewer-selected grounds and coverage position; accept/reject/defer actions and rationale.
- Stale-analysis handling when selected sources or verified facts change.

**Demonstration:** Show the liquor endorsement replacing the base provision. Flag missing substantive wording for endorsements 014/015. Show an out-of-period synthetic incident as an issue requiring adjuster selection, not an automatic denial.

**Done when:** Every selected issue links to evidence; incomplete wording remains visible; AI suggestions and adjuster decisions are distinct. The app does not treat a name/date check as a complete coverage determination.

## M5 Letter templates and generation

**Deliverables**

- Versioned templates for acceptance, reservation-of-rights, and denial letters.
- Reservation-of-rights template based on the supplied sample, with placeholders and inconsistencies corrected.
- Acceptance and denial structures drafted for subject-matter review; production use waits for approved wording/examples.
- Automatically populated recipient/subject details, allegation summary, carrier, policy period, limits, and selected provisions.
- The policy-controls paragraph included in all approved letter types.
- Maintained jurisdiction-specific notices with approval, owner, and effective version.
- Nationwide configuration model separating matter/letter jurisdiction from customer regulatory applicability; unapproved state-specific notices remain blocked for final export.
- Source-linked policy quotation blocks, verified against visible source content.
- Section-based letter editor, autosave, version history, and regeneration of selected sections without losing other edits.
- Internal evidence panel kept separate from recipient-facing prose.

**Demonstration:** Generate an ROR draft from verified Doherty facts and reviewer-selected grounds. Generate synthetic acceptance and denial drafts using the corresponding template structures. Edit the factual section and confirm that section regeneration preserves unrelated edits.

**Done when:** Drafts follow the supplied Word structure, quotations are accurate, unknown fields are visibly incomplete, and approved templates control the coverage-position language. AI integration and data handling must be validated before generating from live claims.

## M6 Review, approval, and exports

**Deliverables**

- Submit, return-with-comments, and approve actions controlled by permission.
- Approval tied to the exact letter, source, fact-review, and template versions.
- Automatic invalidation when material source facts, provisions, templates, or letter content change.
- Editable DOCX and corresponding PDF exports; draft watermark for unapproved exports.
- Approved-export blockers for missing required fields, unresolved critical issues, unverified quotations, missing wording, or stale approval.
- Explicit, permission-controlled exceptions for missing documents, with reason and scope recorded.
- Audit trail for reviews, edits, approvals, exceptions, and exports.

**Demonstration:** Return a draft, revise it, approve it, export Word/PDF, then change a material fact and verify that the earlier approval cannot authorize the new version.

**Done when:** Exported content matches the approved version, Word is editable, PDF layout is readable, and unapproved users cannot approve or export an approved letter. Historical approved versions remain intact.

## M7 Private pilot and release readiness

**Deliverables**

- Test set with scanned pages, redactions, multiple defendants, aliases, conflicting dates, missing attachments, replacement endorsements, and amended complaints.
- Coverage specialist evaluation of factual accuracy, issue usefulness, and letter quality.
- Permission/isolation checks, prompt-injection checks, failed-job recovery, concurrent-edit handling, and backup restore verification.
- Measured turnaround, OCR quality, reviewer corrections, export fidelity, and processing cost per matter.
- Hosting configuration, monitoring, support notes, and retention/deletion behavior for originals and derived content.
- State-by-state security and letter-template applicability matrix with source/effective-date ownership and customer review, starting with pilot states and expanding toward nationwide coverage.
- Pilot operating instructions and known limitations.

**Done when:** Agreed acceptance cases pass, no critical data exposure or invented policy wording remains, templates and provider configuration are approved for the pilot, and reviewers can complete the full workflow. Publication and live customer rollout are separate actions; a completed build alone does not mean they occurred.

## Work that can proceed while dependencies are resolved

| Dependency | Resolve before | Independent work that can continue |
| --- | --- | --- |
| Repository destination | Remote source-control setup | Local project foundation and schema design |
| Hosting/database accounts | Shared environment deployment | UI, migrations, and local service development |
| Company-approved AI integration | Live AI processing in M3/M5 | Service interfaces, synthetic fixtures, fact-review UI, manual drafting path |
| Acceptance/denial examples | Production use of those letter variants | ROR workflow and draft template structures |
| Named approval authority | Pilot approval workflow | Configurable permission and review mechanisms |
| Approved jurisdiction notice text | Final letters for that jurisdiction | Notice configuration and placeholder management |
| Domain and brand assets | Public hosting and final branding | Product-name-based application shell |
| Retention and data-use settings | Live pilot | Configuration interfaces and deletion implementation |

## First implementation backlog

| Priority | Work item | Acceptance check |
| --- | --- | --- |
| 1 | Create dedicated project and environment configuration | Runs locally without embedded secrets |
| 2 | Define organization, user, matter, and document schemas | Ownership relationships enforced in migrations |
| 3 | Build application shell and dashboard | Navigation and empty states work |
| 4 | Build create/edit matter | Validation, save, reopen, and edits work |
| 5 | Build matter workspace tabs | One matter remains in context across tabs |
| 6 | Add synthetic demo fixture | Clearly marked demo; no claim files committed |
| 7 | Add document-service and processing-service interfaces | Mock results visibly labeled; live mode cannot silently fall back |
| 8 | Validate first increment | Create → dashboard → reopen → edit → save succeeds after reload |

The first demonstration is a polished claims workspace with persistent matters and a clearly defined document intake path. Actual document extraction, AI analysis, and approved letter exports arrive in later milestones and must not appear operational before they are implemented.

## Ownership and milestone review

Danielle leads product priorities and workflow decisions. The insurance subject-matter partner validates extraction needs, issue presentation, and letter wording. Development implements the agreed milestone and supplies a demonstration with relevant test results. The designated reviewer approves templates and pilot coverage positions; the specific person and authority need to be assigned.

At each milestone, record what works, acceptance results, known gaps, and the next backlog. Reopen earlier work only for a demonstrated defect, changed requirement, or unmet dependency. Estimate calendar dates after M0 establishes providers, deployment access, representative document quality, and review availability.

## Scope after the initial release

Later releases can add Coverage B/C, mixed positions across counts, more jurisdictions, additional policy lines, claims-system integrations, email delivery, customer administration, billing, and reporting. These should build on validated extraction and letter quality. Fall-detection surveillance remains a separate product with its own architecture and roadmap.

## Build completion definition

A pilot user can authenticate, create a matter, upload selected source versions, verify facts, review policy issues, select a coverage position, generate and edit a letter, obtain authorized approval, and export an accurate Word/PDF version. Sources, corrections, approvals, and exports remain traceable, private, and reproducible.
