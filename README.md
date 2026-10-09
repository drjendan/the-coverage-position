# The Coverage Position

An insurance claims workspace for reviewing commercial general liability Coverage A documents and drafting coverage letters. The adjuster selects the coverage position.

## Current build

**M0 foundation / M1 claims workspace.** Working features:

- Dashboard and searchable matter list with status filters.
- Create, reopen, and edit matters; save-and-resume using server-side SQLite storage.
- Matter overview, working notes, assignments, and activity history.
- Explicit synthetic demo data, loaded only when requested into an empty workspace.
- Duplicate claim validation and version checks to prevent silent concurrent overwrites.
- Desktop and mobile layouts, keyboard-accessible forms, and clear failure states.

Document upload, authentication, OCR, AI analysis, approval, and letter export are **not implemented**. Their screens identify the planned milestone. This build is localhost-only and must contain synthetic information. It is not suitable for production or real claim data. No uploaded source documents are included in this repository.

## Run locally

Install Node.js **24.x** (the tested runtime is 24.19.0). No external npm packages are required. The build uses Node's built-in SQLite API.

```bash
git clone https://github.com/drjendan/the-coverage-position.git
cd the-coverage-position
npm start
```

Open **http://localhost:3000**. Click **Load demo matters** or create a synthetic matter. Reload or restart the server to confirm that saved matters persist. Stop with Ctrl+C.

For auto-restart during development:

```bash
npm run dev
```

Optional configuration: copy `.env.example` to `.env` and edit `PORT` or `DATA_DIR`. The SQLite database is created at `data/workspace.sqlite` by default. Its directory is ignored by Git. Do not delete that directory unless you intend to remove local matters. `.env` and uploads are also ignored.

The server always binds to `127.0.0.1`, rejects non-localhost Host headers and cross-origin browser requests, and refuses `NODE_ENV=production`. These restrictions do not replace authentication; M2 will introduce real access controls.

## Validate

```bash
npm run check
npm test
```

Tests cover persistence across database restart, creation/editing, validation, duplicate claims, version conflicts, explicit demo seeding, and API behavior. Do not infer production security from this initial test suite.

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

M2 adds authentication, organization/matter authorization, private PDF intake, immutable document versions, and page viewing. The approved AI-provider integration, acceptance/denial templates, and pilot settings must be resolved before live AI processing and final exports. See [the roadmap](docs/build-roadmap.md).
