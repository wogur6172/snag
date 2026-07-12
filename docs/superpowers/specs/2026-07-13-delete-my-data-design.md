# Delete My Data Design

## Goal

Add an App Store-compliant data-deletion flow that lets a Snag user permanently remove their automatically generated Supabase account and associated data from inside the app.

## Entry Point

- Place a small, borderless `Delete my data` action at the bottom-right of the full-screen Settings overlay.
- Use muted red text at rest and a slightly brighter red while pressed.
- Keep the action visually secondary to profile and support controls, but readable and accessible.
- Use the accessibility label `Delete my data` and the button accessibility role.

## Confirmation

Tapping the action opens a centered, softly animated confirmation dialog over Settings.

Title:

```text
Delete your data?
```

Body:

```text
This permanently deletes your collection, Snags stored in Snag, nickname, shared-board posts, and account. Shared boards with other members will stay open under a new owner. Snags saved to Photos won't be deleted.
```

Actions:

- `Cancel` closes the dialog without changing data.
- `Delete` uses red text and starts deletion.
- While deletion is running, dismissal and repeated submission are disabled and the destructive action shows progress.

## Deletion Semantics

### Personal device data

Delete all Snag-owned local data:

- Personal Snags, text items, categories, drawings, positions, and settings.
- Persisted Snag image and preview files.
- Social board cache and downloaded board image cache.
- Saved nickname and Supabase session files.

Do not delete images that the user explicitly saved to the iOS Photos library.

### Shared social data

For every board owned by the deleting user:

- If another member remains, transfer ownership to the earliest joined remaining member.
- If no other member remains, delete the board and all of its relational and Storage data.

For boards that remain:

- Delete Snags, text items, and drawings created by the deleting user.
- Delete the user's associated Storage objects.
- Remove the user's membership, reports, bans, and profile references as applicable.

Finally, delete the Supabase anonymous Auth user and profile.

## Architecture

### Client

The app invokes one authenticated Supabase Edge Function. It never receives or embeds a Supabase secret or service-role key.

After the function confirms successful cloud deletion, the client:

1. Signs out the deleted session locally and clears Snag-owned local directories and auth storage.
2. Replaces in-memory state with the normal first-install defaults.
3. Closes Settings and shows the initial `Category 1` collection experience.
4. Suppresses automatic social-profile creation until the user intentionally opens Social again.

### Server

The Edge Function requires a valid user JWT and independently resolves the caller with Supabase Auth. It must never accept a target user ID from the client as authority.

The server coordinates:

- Deterministic owner transfer using `board_members.joined_at`, with a stable user-ID tie-breaker.
- Relational cleanup through a narrowly permissioned database function callable only by the service role.
- Storage object cleanup for the deleting user's uploads and boards deleted because they have no remaining members.
- Revocation of active sessions before account deletion.
- Final deletion through `auth.admin.deleteUser`.

Storage cleanup paths are recorded in a durable deletion job before relational rows are removed. This lets cleanup be retried without retaining the user's profile or board rows solely to rediscover file paths.

The database function must be idempotent so a repeated request can safely finish an interrupted deletion.

## Failure Handling

- Do not clear local data before the server confirms cloud account deletion.
- If the request fails before confirmation, keep local data and show a concise retry message.
- If cloud deletion succeeds but local cleanup encounters an error, retry local cleanup immediately and reset in-memory state; the deleted cloud account must not be recreated during that transition.
- Treat an already-deleted account or already-completed deletion job as success.
- Do not log access tokens, service keys, image contents, or personal text.

User-facing failure copy:

```text
Couldn't delete your data. Nothing on this device was cleared. Please try again.
```

## Security

- Keep the service-role key only in Supabase Edge Function environment variables.
- Require JWT verification on the Edge Function and verify the authenticated user again inside the handler.
- Revoke database deletion-function execution from `PUBLIC`, `anon`, and `authenticated`; grant it only to `service_role`.
- Use the authenticated caller's user ID for all cleanup decisions.
- Preserve RLS on every exposed table.
- Make deletion and ownership transfer idempotent.
- Remove completed deletion jobs after Storage cleanup succeeds; retain only the minimum path data needed while a retry is pending.

## Testing

### Unit and source tests

- Confirmation copy lists local, social, account, ownership-transfer, and Photos behavior.
- Settings exposes a red, bottom-right `Delete my data` action.
- Local reset helpers remove each Snag-owned directory and restore first-install state.
- The client waits for cloud success before local deletion.
- Failure leaves local state intact.

### Database and Edge Function tests

- A sole-member owned board is deleted.
- A multi-member owned board transfers to the earliest joined member.
- The deleting user's Snags, text, drawings, memberships, profile, and Auth user disappear.
- Other members' content remains.
- Relevant Storage objects are removed or retained in a retryable cleanup job until removal succeeds.
- A repeated deletion request is safe.
- One user cannot request deletion of another user.

### Device verification

- Verify the complete flow in a TestFlight-style production build on a real iPhone.
- Verify Photos-saved exports remain.
- Verify the app returns to the clean first-install collection without stale board or profile flashes.
- Verify relaunch does not create a new anonymous account until the user intentionally opens Social again.
