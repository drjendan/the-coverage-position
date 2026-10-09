# Initial architecture decisions

## M1 local foundation

The initial increment uses native browser JavaScript/CSS, a Node 24 HTTP API, and local SQLite. It has no external runtime package dependencies and runs on a laptop without cloud accounts. Durable writes and optimistic version checks live on the server, rather than in browser local storage.

This is a development implementation choice, not a final cloud architecture. The local organization is a fixed development fixture; analyst/reviewer names are descriptive fields, not authenticated identities. No role enforcement or tenant isolation is claimed in M1. The schema records organization ownership so M2 can replace the fixed organization context with authenticated membership.

Matter statuses are limited to New, Needs Information, and Archived. Later workflow stages cannot be selected before the corresponding features exist. Audit events use an explicitly unauthenticated local actor. UI metrics report actual saved data, not fabricated processing or approval activity.

The pilot schema covers organizations, matters, and activity only. Documents, parties, memberships, evidence, issues, templates, and approvals will be introduced with their corresponding working features and migrations. Migration 001 is idempotent; a migration runner and schema-version checks are required before applying later versions.

## M2 and later

Design for nationwide customers. Separate the matter's coverage/letter jurisdiction from the insurer's domicile/licensed states, contract requirements, and relevant data jurisdictions. Maintain versioned state-specific letter notices and a reviewed security applicability matrix. A New York development fixture does not make New York rules universal or limit the product to that state.

Introduce real authentication and server-side matter permissions before accepting actual claims. Resolve production database/hosting and private storage during M2; SQLite is the M1 local store, not a committed multi-tenant production database. Document processing runs in an asynchronous worker with redaction-aware rendering/OCR. Provider integrations are accessed only on the server and must not silently fall back to an unapproved service.

Validate whether the company's approved Copilot configuration exposes the necessary supported integration before committing to a connection design. Existing subscription access alone is not treated as integration authorization. An unavailable provider must leave the workflow in an explicit blocked/manual state.

Approved letters will reference exact source, fact-review, issue-selection, and template versions. Updates invalidate dependent analysis and approval. Fall-detection surveillance is a separate project and outside this architecture.

## Public repository boundary

Only source code, synthetic fixtures, and product documentation belong in Git. Do not commit original claim documents, personal information, database files, secrets, or provider credentials. Branding beyond The Coverage Position remains pending business agreement.
