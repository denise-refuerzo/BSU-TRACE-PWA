# Document flow verification — September 13, 2026

## Result

The core document routing scenarios passed against the real Express HTTP handlers and an isolated PostgreSQL-compatible database. **16 of 17 HTTP checks passed. Application-wide sign-off is blocked by an authentication flaw.**

No production database records, accounts, or messages were changed. Application code was not changed during this verification; the added files are a repeatable local verification harness and its report.

## Environment and evidence

- `localServer.js` extracts table definitions, sequences, identity/default declarations, constraints, and indexes from the supplied SQL backup. It does not restore personal records or credentials.
- The server uses synthetic originator, processor, signee, GSO, ICT, and unrelated-user accounts. It runs the actual `server.js`, JWT/session middleware, workflow handlers, and read queries on loopback port 5055.
- The isolated database uses PGlite. It does not reproduce a multi-connection Neon deployment or its concurrency behavior.
- Outbound email is suppressed. Database email triggers/listeners and the Python analytics service were not part of the isolated run.
- The actual frontend ran on localhost:5173 with the API pointed to the isolated backend. The browser login and Office A dashboard rendered successfully; no console errors were captured in that smoke check. The full document movement scenarios below were exercised over HTTP, not individually clicked through the browser.
- Exact HTTP check results are in `results.json`; assertions and requests are in `checkFlow.js`.

## Verified scenarios

| Area | Result |
| --- | --- |
| Submission | QR generation, original route snapshot, first awaiting office |
| Ordinary routing | Office A → B → C → D across processor, signee, and GSO roles; final completion |
| Required action order | Receipt before signing; signature before release; duplicate receipt rejected |
| Office authorization | Wrong offices cannot receive, sign, return, release, or detour documents |
| Completion | No active step remains; further processing rejected; audit records present |
| Office submission | Optional completion of the originating step; unauthorized shortcut rejected |
| College route | Placeholder resolves to the submitting user's department office |
| Ad hoc | Requester held, target processes, requester resumes, original target stop skipped |
| Tracking | Current office and projected skipped route stop appear in the originator response |
| Corrections | Resubmission rejected before release; authorized resubmission resumes the same office |
| Nested detours | Offices return in reverse order and credited original stops are skipped |
| Read authorization | Other originators cannot read another user's document or office ledger |
| Office support endpoints | Notifications, pipeline, incoming list, KPI metrics, history and chat directory/channel reads succeed |
| Other endpoint smoke checks | Resource inventory/assets/bookings/blackouts, procurement, admin summaries, accounts, offices, categories and pipelines return successfully |

The existing regression suite from the preceding implementation run passed 43 tests, including repeated-office and final-stop cases. That earlier run is supporting evidence, separate from this 17-check HTTP run.

## Blocking finding: 2FA endpoint issues a session without a valid challenge

**Severity: Critical.** `backend/server.js`, endpoint `POST /api/login/verify-2fa`, loads a user from the supplied user ID and compares the stored `two_fa_code` directly with the supplied `otpCode`. It does not first require an enabled 2FA account, an active password-authenticated challenge, or a correctly formed code. The isolated check used a synthetic account with no issued code and received HTTP 200 with a session instead of a rejection.

This means document action authorization cannot be considered sufficient on its own: those controls correctly reject the wrong office, but an authentication bypass can let someone obtain another account's session.

Recommended correction: bind verification to a short-lived challenge created only after a successful password check; require an active account with 2FA enabled; validate a six-digit code; enforce expiry and attempt limits; consume the challenge and clear the code atomically after successful verification. Add tests for missing/null codes, accounts without a challenge, disabled accounts, expired/replayed challenges, and incorrect codes. The current success handler also leaves the stored code uncleared despite its comment saying it clears it.

No production account was used to reproduce this finding, and no tokens are included in this report.

## Not certified by this run

- Full browser interaction across every role and every document state.
- Camera-based QR scanning on a physical device, offline/PWA behavior, and device-specific behavior.
- Email delivery, password recovery and the full 2FA lifecycle.
- Python analytics and forecasts.
- Every resource booking, inventory, procurement, account-management and chat mutation. Successful list endpoints are not evidence that all their write flows work.
- Multi-user race conditions, load behavior and deployed environment configuration.

Verification stopped at the confirmed authentication blocker. This report is a local functional assessment, not a claim that every feature is production-ready.

## Repeat locally

From `backend`, start `node verification/localServer.js <path-to-database.sql>`, then in another terminal run `node verification/checkFlow.js`. The checker is hardcoded to loopback port 5055 and exits unsuccessfully if any assertion fails. Stop the local server after the check; its synthetic database is in memory.
