# Access, families, and narrators

LivingMemories uses invitation-only adult accounts, private family spaces, memberships, and independent narrator profiles. A person who contributes a memory and the person who tells it may be different. Narrators do not need accounts. The [Spanish delivery record](history/es/docs/access.md) preserves the original TASK-002 implementation and validation report.

## Invite the first administrator

Start the local environment with `pnpm docker:up`. The private bootstrap command creates a provisional family and sends an administrator invitation; there is no public bootstrap screen.

For a native app on port 3000:

```bash
pnpm pilot:bootstrap --email adult@example.com --family "Garcia Family"
```

For the Docker app on port 8081:

```bash
docker compose -f docker-compose.dev.yml exec -T worker node --conditions=react-server --import=tsx scripts/pilot/bootstrap.mts --email adult@example.com --family "Garcia Family"
```

The command prints a private seven-day link and captures the email in [Mailpit](http://localhost:8025). Local mail is not delivered to external inboxes. Open the invitation, confirm adult participation, and create an account or sign in with the invited email.

The family remains provisional and empty until the first administrator accepts. Acceptance activates it and saves the account, credential, membership, and token consumption in one transaction. Active families retain at least one administrator. If the initial link expires, rerunning bootstrap can prepare a new provisional space.

## Application flow

1. Accept an invitation or sign in at `/login`, then choose a family at `/families`.
2. Use the memory, album, story, and music sections for content; use narrator profiles and family settings for people and membership.
3. Administrators invite adults by email and role, resend or withdraw invitations, and manage members.
4. Administrators and contributors create narrators with a name, relationship, and optional biography. Creating a profile does not create an account.
5. Contributors edit their own profiles; administrators can edit other profiles in the family. Archiving preserves attribution.
6. An adult with current membership can create another private family and becomes its administrator.

Adult participation is explicitly declared and recorded on acceptance. It is a participant declaration rather than documentary age verification. Creating another family reuses that declaration.

## Permissions

| Operation | Administrator | Contributor | Reader |
| --- | --- | --- | --- |
| View own family and role | Yes | Yes | Yes |
| Manage name, members, and invitations | Yes | No | No |
| View and create narrator profiles | Yes | Yes | No |
| Edit/archive a narrator | Any in the family | Own profiles | No |
| Leave the family | If another administrator remains | Yes | Yes |

Readers do not receive draft narrator profiles, email lists, invitations, private preparations, or original recordings. Final story publication remains separate work. The [assistant guide](assistant-integration.md) describes its reviewed shared-text evidence permissions.

## Authentication and request safeguards

Direct `/api/auth/sign-up/email` registration is disabled. Public account creation requires accepting a valid invitation. Tokens contain 32 random bytes; only their SHA-256 hashes are stored, and listings expose neither tokens nor hashes. Acceptance checks recipient email, expiry, status, and single use inside the transaction. Existing users must authenticate with that email; invitations do not replace passwords.

Resending rotates the link and withdraws earlier ones. A mail failure leaves a revocable invitation that can be copied or resent. Current session and membership are checked for queries and mutations; identifiers from another family return the same error as a missing resource.

A family-row lock coordinates membership and administrator changes so concurrent operations cannot remove the final administrator. Better Auth account deletion is disabled, and membership/profile relations restrict user deletion.

Custom mutations require JSON, matching origin, and request bodies up to 16 KiB. Family responses are private and uncached; pages use `no-referrer` and are not indexed. Invitation signup uses Better Auth password hashing and the credential account schema inside the membership transaction.

## Routes and contracts

| Route | Operation |
| --- | --- |
| `GET /api/families` | List families with current membership |
| `POST /api/families` | Create family; `{name}` |
| `GET /api/families/:id` | Role-specific family view without tokens |
| `PATCH /api/families/:id` | Rename; `{name}` |
| `POST /api/families/:id/invitations` | Invite/resend; `{email, role}` |
| `DELETE /api/families/:id/invitations/:invitationId` | Withdraw pending invitation |
| `PATCH /api/families/:id/members/:membershipId` | Change role; `{role}` |
| `DELETE /api/families/:id/members/:membershipId` | Revoke membership |
| `POST /api/families/:id/leave` | Leave with final-administrator protection |
| `GET/POST /api/families/:id/profiles` | List/create narrators |
| `PATCH/DELETE /api/families/:id/profiles/:profileId` | Edit/archive narrator |
| `POST /api/invitations/accept` | Accept; `{token, email, adultConfirmed, name?, password?}` |

API roles are `ADMIN`, `CONTRIBUTOR`, and `READER`. DELETE and leave requests also send JSON, even when the body is `{}`. The server does not trust client-supplied ownership, actor role, or extra family claims. Create profiles with `{name, relationship?, biography?}`; PATCH preserves omitted fields.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm auth:check
pnpm test:access
```

The access suite uses a temporary local PostgreSQL database and removes that database afterward. Coverage includes invitation acceptance, recipient binding, expiry/revocation, concurrent consumption, existing accounts, family isolation, reader permissions, revoked membership, administrator races, narrator profiles, token rotation, request constraints, and local mail. Historical browser evidence and its limits are retained in the Spanish record; no new application tests were run for this documentation-only change.
