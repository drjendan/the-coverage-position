# Insurance customer security plan

October 9, 2026 | Proposed controls and evidence requirements

The Coverage Position is intended for nationwide use and will process sensitive claim documents and generated coverage letters. New York is the first development test case, not the product's geographic limit. Security must cover the application, hosting, database, document storage, OCR and AI services, support access, and operating procedures. The current M1 build is not insurance-compliant production software. Its hosted preview serves fixed fictional matters and rejects writes; its local development mode accepts synthetic matters only.

## Baseline and applicability

Use the following sources to establish a control matrix with the pilot insurer's security and compliance team:

- [NAIC Insurance Data Security Model Law 668](https://content.naic.org/sites/default/files/model-law-668.pdf): model requirements for licensees covering information security, risk assessment, safeguards, third-party oversight, investigation, and notifications. The model is not itself a nationwide law; determine the relevant state's enacted requirements and exemptions.
- [NYDFS Part 500 cybersecurity resource center](https://www.dfs.ny.gov/cybersecurity): evaluate whether the business is directly a covered entity. An insurance software vendor is not automatically regulated solely because it serves an insurer.
- [NYDFS third-party service provider guidance](https://www.dfs.ny.gov/industry-guidance/industry-letters/il20251021-guidance-managing-risks-third-party): insurers assess vendor access, data sensitivity, controls, contracts, subcontractors, and incident/continuity arrangements. The insurer retains responsibility for its compliance. Our product must support customer due diligence and applicable contractual protections.
- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20): organize the program around Govern, Identify, Protect, Detect, Respond, and Recover. This is an organizing framework, not a product certification.

Determine actual legal applicability, customer contracts, record-retention duties, data categories, and operating jurisdictions before making a compliance claim. A successful deployment, encryption setting, or hosting provider's audit does not establish this application's compliance.

## Nationwide requirements management

Maintain a counsel/customer-reviewed applicability matrix for all 50 states and the District of Columbia, with separate entries for any U.S. territories included in rollout. Do not assume every state adopted the NAIC model unchanged or that one state's controls/notice wording satisfy another state's requirements.

For each customer, record insurer/licensee identity, domicile and operating/licensed states, customer contractual controls, data categories and affected individuals' relevant jurisdictions, selected providers/processing locations, and required retention/hold obligations. The incident location alone does not determine cybersecurity or breach-notification applicability.

For each applicable requirement, record its authoritative source, effective date, owner, legal/customer review, applicability conditions, implemented controls, evidence, exceptions, and next review. Configure incident-response notification decisions against that reviewed matrix; do not rely on one nationwide hardcoded deadline.

Keep coverage-letter requirements separate from security-law applicability. Each approved state-specific letter notice has a version, effective date, applicability conditions, and reviewer. An unsupported or unapproved jurisdiction may still have a matter created, but final letter generation/export must clearly block the unapproved jurisdiction-specific content or follow a documented authorized review path. State selection in the UI is not a claim of regulatory readiness.

National rollout therefore proceeds by validated jurisdiction/template/customer configurations while applying a strong common security baseline across the product. Expand Coverage A first; new coverage types and national security readiness are separate dimensions.

## Proposed production architecture

Netlify hosts frontend assets and, where suitable, authenticated API functions. Persistent matters belong in a managed database. Documents belong in private object storage. An authenticated worker performs rendering, redaction-aware OCR, and approved AI processing. Functions must not depend on local SQLite files for durable shared state because their execution environment is ephemeral.

Client requests carry validated authentication; the server derives the organization from trusted membership, never an arbitrary browser-supplied organization ID. Every read, write, source-page view, export, and download enforces matter access. Restrict database and storage access independently as defense in depth.

Database, storage, hosting, AI, OCR, and monitoring providers are selected only after reviewing service scope, regions, access, retention, subcontractors, and the pilot customer's requirements. No provider is approved merely by being listed in this plan.

## Control implementation and evidence

| Control area | Build requirement | Evidence before live pilot |
| --- | --- | --- |
| Identity | Unique accounts, MFA, invitation controls, session expiry/revocation; enterprise SSO as required by the customer | Unauthorized requests fail; revoked and expired sessions fail; MFA enforcement verified |
| Authorization | Default-deny roles, organization membership, matter assignments, separate approval authority | Two-organization tests demonstrate that changing IDs cannot access another customer's records, files, jobs, or exports |
| Encryption and keys | TLS, encrypted managed data/storage/backups, restricted key/secret access and rotation | Provider/configuration evidence, no secrets in frontend artifacts or Git, credential-rotation exercise |
| Files | Private objects, short-lived authorized links, type/size validation, scanning, safe rendering | Direct public access denied; expired links fail; unsafe files rejected; upload and scan failures handled |
| Redactions and minimization | Exclude visibly concealed content from indexes, prompts, and outputs; minimize AI data and logs | Redaction fixtures pass across extraction, search, AI requests, preview, and export |
| AI governance | Customer-approved providers and purposes, data-use/retention restrictions, no silent fallback, prompt-injection isolation | Approved configuration/contracts and tests preventing cross-matter retrieval or instruction following from uploads |
| Audit | Traceable identities and events; protected logs for viewing/downloading, edits, approvals, exports, and administration | Unauthorized log alteration denied; event completeness checks; approved retention and restricted log access |
| Retention and exit | Customer retention policy, legal-hold handling, deletion of derived data and provider artifacts, termination export/deletion | Tested deletion/hold workflow and documented backup-expiry behavior; no unsupported promise of instant backup erasure |
| Secure development | Input validation, CSP, rate limiting, dependency/secret scanning, review and remediation process | CI checks, negative tests, vulnerability findings and remediation records |
| Resilience | Automated backups, restore exercises, queue recovery, measurable recovery objectives | Successful restore and failure-recovery exercise; agreed recovery time/data-loss targets |
| Monitoring and response | Alerts, incident owner/runbook, escalation and notification procedure tied to applicable contracts/law | Incident tabletop and contact roster; notification requirements reviewed, not hardcoded from a single model law |
| Third-party governance | Provider inventory, risk assessment, security agreements, subprocessors, regions, support access | Completed vendor review and customer diligence responses with substantiating evidence |

These are proposed product controls. Some exceed an individual customer's legal minimum. The applicability review determines which specific legal provisions and contractual requirements each control supports.

## Delivery gates

### Current hosted preview

- Fixed fictional fixtures only; no writable matter store, upload route, or AI connection.
- Write requests rejected by the function even if a user bypasses the browser UI.
- Publish only `public/`; server/function sources, database files, secrets, and original claim documents are excluded from static assets.
- CSP, anti-framing, content-type protection, referrer restrictions, permissions restrictions, HTTPS policy, and no-index headers configured. No-index is not access control.
- Netlify deployment and browser verification must still be performed on the actual deployed site.

### M2 authenticated foundation

- Select approved authentication, managed database, and private storage.
- Implement and negatively test organization/matter isolation, account lifecycle, MFA/session behavior, private file access, upload validation, and scanning.
- Protect deploy previews and keep preview/test credentials and data isolated from production.
- Replace the public read-only preview handler with an explicitly authenticated API. Do not turn on writes in the fixture handler.

### M3 through M6 document and AI controls

- Validate redaction handling and source integrity before real document processing.
- Approve the AI/OCR data path; implement audit access events, protected logs, retention, version-specific approval, and controlled exports.
- Keep claim contents out of operational logs, analytics, error reports, and public previews.

### M7 release readiness

- Document risk assessment, data flow, provider inventory, retention and access policies, incident response, and backup/recovery procedures.
- Complete an independent security assessment/penetration test appropriate to the customer's requirements; remediate material findings and preserve evidence.
- Obtain pilot insurer security/compliance acceptance and required contracts. Assign named security and incident-response owners.
- Make SOC 2 or ISO 27001 a separate customer/market decision with a defined scope and audit program. Do not claim either based on hosting certifications.

## Immediate decisions

Confirm the pilot insurer, its security questionnaire, required identity provider/SSO, allowed AI/OCR services, allowed data regions, retention/hold rules, support access, and any audit/certification prerequisites. These decisions determine production implementation; they do not prevent development using synthetic fixtures.

## Reference implementation guidance

- [Netlify Functions overview](https://docs.netlify.com/build/functions/overview/)
- [Netlify Functions setup](https://docs.netlify.com/build/functions/get-started/)
- [Netlify security headers](https://docs.netlify.com/manage/routing/headers/)

Netlify support is currently configured for a read-only preview. Persistent authenticated production workflows are a later milestone and require the controls above.
