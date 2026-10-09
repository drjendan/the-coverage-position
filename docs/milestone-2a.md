# M2A: hosted authentication and private quarantine

## Implemented

The optional Netlify backend uses Supabase Auth, PostgreSQL, and private Storage. Password sign-in leads to TOTP enrollment/verification. Matter and document APIs require a provider-validated session with MFA assurance `aal2`. Access tokens stay in Secure, HttpOnly, SameSite=Strict cookies; refresh tokens are not sent to the browser. Sessions expire rather than silently refresh, with cookies capped at one hour. Writes require the configured application Origin.

Database policies enforce active organization membership, MFA, and matter access. Administrators access their organization's matters; analysts can create matters and receive an editable assignment; assigned users access according to `matter_access.can_edit`. Creators retain read access while their organization membership is active. Removing membership denies all matter access. Reviewer accounts cannot create matters. Changing the analyst/reviewer display names does not grant access; an operator provisions assignments separately. One organization per user is supported in this increment.

PDF registration uses unique storage paths and a maximum of 50 MB. Uploads use a signed capability to the configured private bucket. Storage has no overwrite/delete policy. Completion checks the stored object size and records `pending_scan`; only `verified` objects have a download policy. No API or UI promotes a document to verified. Pending files are unavailable for viewing or processing. Browser PDF-header checks and client-reported hashes are preliminary, not trusted server verification. Matter changes and completed uploads generate database audit events.

## Connect the hosted test environment

1. Create a dedicated Supabase test project. Keep the default Netlify deployment in preview mode until setup is ready. Use synthetic data only.
2. In the Supabase SQL Editor, run `supabase/migrations/001_secure_foundation.sql` once. It creates the tables, policies, functions, and private `claim-documents` bucket. Review errors before proceeding; do not disable RLS to work around them.
3. Run `supabase/verify-rls.sql` in that isolated project. It creates temporary synthetic fixtures, checks cross-organization reads/writes and MFA enforcement, then rolls back. If execution fails, run `ROLLBACK` and resolve the failure. This script is supplied but has not been executed here.
4. Disable public signups, enable TOTP MFA, set the approved password policy and authentication rate limits, and set the JWT lifetime to at most one hour. Create test users through the Auth dashboard. User creation alone grants no workspace access.
5. As a database operator, create an organization, copy its UUID, and insert a membership for each Auth user UUID. The example below uses placeholders; substitute actual test UUIDs. Never give the browser a service-role key.

```sql
insert into public.organizations(name)
values ('Coverage Position Test Workspace') returning id;

insert into public.memberships(user_id,organization_id,role)
values ('AUTH_USER_UUID','ORGANIZATION_UUID','admin');

-- Assign an existing matter to an analyst or reviewer as needed.
-- Ensure both belong to the same organization before assigning.
insert into public.matter_access(matter_id,user_id,can_edit)
values ('MATTER_UUID','AUTH_USER_UUID',false);
```

6. In Netlify, configure these variables for both builds and Functions in the chosen test deployment context, then rebuild:

| Variable | Value |
| --- | --- |
| `APP_MODE` | `secure` |
| `SUPABASE_URL` | Supabase project HTTPS URL |
| `SUPABASE_PUBLISHABLE_KEY` | Project publishable key; never a secret/service-role key |
| `APP_ORIGIN` | Exact HTTPS Netlify site origin, without trailing slash or path |

Use `npm run build`, publish `public`, and Functions directory `netlify/functions`. The build creates a CSP allowing connections only to the application and configured storage origin. No backend credentials are embedded in frontend files. Use separate cloud projects and credentials for test and production. Leave deploy previews at `APP_MODE=preview`; do not inherit secure production credentials into PR builds. Update `APP_ORIGIN` and rebuild when changing the site domain.

## Required hosted verification

- Confirm `/api/health` reports `secure-pilot`, then sign in, enroll an authenticator, and verify its code. Confirm password-only requests cannot read matters.
- Create/edit/reload a synthetic matter. Verify conflicting versions cannot overwrite silently.
- Test two organizations and an unassigned same-organization analyst: unauthorized matter IDs must not disclose records. Test assigned reviewer read-only access and membership removal, including direct Supabase API requests.
- Upload a synthetic PDF. Confirm the bucket remains private, metadata becomes pending scan, and unauthenticated/unauthorized downloads fail. Verify overwrite and delete requests fail. No pending file may be promoted to verified by a user.
- Check cross-origin writes, expired sessions, cookie flags, frontend/API headers, and absence of secrets in published assets. Test MFA and login rate limiting against the actual Auth configuration.
- Complete desktop/mobile browser checks and test Netlify Function bundling/routing. These checks were not performed against a live deployment here.

## Verification and remaining work

Automated Node tests verify local behavior and mocked hosted authentication failures, cookie handling, CSRF, and inaccessible-matter responses. SDK transport tests use synthetic provider responses. They do not prove deployed PostgreSQL RLS or Storage isolation. No cloud migration, hosted login/upload, or browser verification has occurred.

M2B still requires a trusted file-validation/scanning worker, independent SHA-256 verification, page/password-protection handling, duplicate detection, failed-upload recovery, processing jobs, operative-source version selection, and authenticated viewing/download flows. Auth recovery, session revocation behavior, permission administration, auth/access audit coverage, retention/deletion, backups, and operational monitoring also need validation or implementation before a live pilot. An already issued JWT may remain usable until expiry; logout is not evidence of immediate token revocation. Upload capabilities have provider-controlled expiry and must be treated as private bearer capabilities.

This increment is a test foundation. It does not establish insurance regulatory compliance or authorize real claim processing; the nationwide applicability and release gates remain in `security-plan.md`.
