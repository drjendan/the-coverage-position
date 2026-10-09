# Deploy the synthetic preview to Netlify

The repository now includes `netlify.toml` and a read-only function serving three fictional demo matters. Hosted creation, editing, document uploads, AI, and real claim storage are disabled. Local `npm start` retains writable synthetic development matters in SQLite.

## Connect the repository

Import `drjendan/the-coverage-position` in Netlify and select branch `main`.

| Setting | Value |
| --- | --- |
| Base directory | Repository root; leave blank |
| Build command | `npm run build` |
| Publish directory | `public` |
| Functions directory | `netlify/functions` |
| Build Node version | 24, configured in `netlify.toml` |
| Application secrets | None required for this read-only preview |

Do not use `npm start` as the Netlify build command. It runs the localhost development server rather than a deploy build. Do not publish the repository root: only `public` contains intended frontend assets.

## Verify after deploy

1. Open the deployed site. Confirm the READ-ONLY DEMO label and three DEMO matters.
2. Open a matter and its Activity tab. There is no saved activity for static fixtures.
3. Confirm matter creation/edit controls are absent and Documents/Letter remain unavailable.
4. Open `/api/health`. It must report `mode: synthetic-preview` and `readOnly: true`.
5. Verify a direct POST/PATCH API request returns 403, not a saved record.
6. Inspect response headers on frontend assets and API calls, and confirm no claim documents or credentials are publicly deployed.
7. Check desktop/mobile layout and keyboard/dialog behavior. Browser visual verification could not be completed in the development environment.

No deployment was performed as part of adding this configuration. The live URL, routing, headers, and Netlify bundling must be verified after the user deploys.

See [the security plan](security-plan.md) for production requirements. Do not enter real claim information into the local build or extend the hosted fixture endpoint to accept it.

## Optional hosted access build

M2A adds a separate `APP_MODE=secure` backend. Keep `APP_MODE=preview` while configuring the cloud project. Follow [M2A setup](milestone-2a.md) for migrations, users, environment scopes, and required checks. This does not enable scanning, viewing, or production claim processing.
