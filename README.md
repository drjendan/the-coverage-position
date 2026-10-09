# The Coverage Position

An insurance claims workspace for reviewing commercial general liability Coverage A documents and drafting coverage letters. The adjuster selects the coverage position.

## Current build

**M1 claims workspace and M2A hosted access/private quarantine foundation.** The default Netlify deployment remains a read-only fictional preview. Working features:

- Dashboard and searchable matter list with status filters.
- Create, reopen, and edit matters; save-and-resume using server-side SQLite storage.
- Matter overview, working notes, assignments, and activity history.
- Explicit synthetic demo data, loaded only when requested into an empty workspace.
- Duplicate claim validation and version checks to prevent silent concurrent overwrites.
- Desktop and mobile layouts, keyboard-accessible forms, and clear failure states.

The optional hosted secure mode implements password sign-in, required TOTP MFA, permission-aware matter APIs, and PDF uploads to private quarantine. Its Supabase migration and setup instructions are included; they have not been applied or verified against a live project. Scanning, PDF viewing, OCR, AI analysis, approval, and letter export are **not implemented**. Use synthetic information only during setup. No uploaded source documents are included in this repository.

## Run locally

Install Node.js **24.x** (the tested runtime is 24.19.0). The local server uses Node's built-in SQLite API; the hosted backend uses the installed Supabase SDK.

```bash
git clone https://github.com/drjendan/the-coverage-position.git
cd the-coverage-position
npm ci
npm start
```

Open **http://localhost:3000**. Click **Load demo matters** or create a synthetic matter. Reload or restart the server to confirm that saved matters persist. Stop with Ctrl+C.

For auto-restart during development:

```bash
npm run dev
```

Optional configuration: copy `.env.example` to `.env` and edit `PORT` or `DATA_DIR`. The SQLite database is created at `data/workspace.sqlite` by default. Its directory is ignored by Git. Do not delete that directory unless you intend to remove local matters. `.env` and uploads are also ignored.

The server always binds to `127.0.0.1`, rejects non-localhost Host headers and cross-origin browser requests, and refuses `NODE_ENV=production`. These restrictions do not replace authentication. Hosted authentication is a separate mode; see [M2A setup](docs/milestone-2a.md).

## Validate

```bash
npm run check
npm test
```

Tests cover local persistence, validation, version conflicts, read-only preview behavior, and hosted API authentication/CSRF failures. Provider transport is tested with synthetic responses. Live database/storage isolation and browser checks remain outstanding.

## Project layout

```text
public/          Browser UI
src/server.js    Local HTTP server and API
src/store.js     SQLite storage and matter validation
db/              Initial schema
tests/           Node test runner checks
docs/            Build roadmap and architecture decisions
```

## Next milestone

M2A implements the hosted authentication and private quarantine foundation. M2B must add independent file validation, scanning, verified hashes, retry handling, and permission-controlled page viewing. The approved AI-provider integration, acceptance/denial templates, and pilot settings must be resolved before live AI processing and final exports. See [the roadmap](docs/build-roadmap.md).

## Netlify preview and insurance security

Import this repository into Netlify on branch `main`. The committed `netlify.toml` sets build command `npm run build`, publish directory `public`, and functions directory `netlify/functions`. No secrets or cloud database are required for the current read-only preview. Do not use `npm start` as the Netlify build command.

In the default preview mode, hosted matter creation, editing, and uploads are disabled on both the UI and API. Optional secure-mode setup is documented in [M2A setup](docs/milestone-2a.md). Local development remains writable for synthetic matters. See [deployment instructions](docs/netlify-preview.md). Actual Netlify deployment and browser verification remain outstanding.

The application is **not certified or production compliant**. See [the insurance security plan](docs/security-plan.md) for the NAIC/NYDFS applicability review, proposed controls, verification evidence, and release gates. Real claims require authenticated access, isolated managed data storage, private files, validated AI/OCR handling, and customer security review.
