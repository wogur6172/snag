# Delete My Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app, authenticated, permanent deletion flow for Snag's local data, shared-board data, Storage objects, profile, and anonymous Supabase account, then publish the verified build to TestFlight.

**Architecture:** A small destructive action in Settings opens a confirmation dialog. The app calls one JWT-protected Supabase Edge Function; the function uses a service-role client to invoke a narrowly granted transactional cleanup function, remove queued Storage paths, revoke the session, and delete the Auth user. Only after cloud success does the app clear local files, reset React state, and return to the first-install collection without terminating.

**Tech Stack:** Expo SDK 56, React Native, TypeScript, Expo FileSystem, Supabase Auth/Postgres/Storage/Edge Functions, Node test runner, EAS Build and Submit.

## Global Constraints

- Read the exact Expo SDK 56 documentation at `https://docs.expo.dev/versions/v56.0.0/` before production edits.
- `Delete my data` is small, borderless, red text at the bottom-right of Settings.
- Photos explicitly saved to the iOS Photos library are never deleted.
- A sole-member owned board is deleted; a multi-member owned board transfers to the earliest remaining member.
- No service-role or secret key may enter the mobile bundle.
- Cloud deletion must succeed before local data is cleared.
- The app stays open and briefly shows `Your data has been deleted.` before returning to `Category 1`.
- A new anonymous account is not created until the user intentionally opens Social again.

---

### Task 1: Deletion Copy and State Rules

**Files:**
- Create: `src/utils/account-deletion.ts`
- Create: `scripts/account-deletion.test.mjs`

**Interfaces:**
- Produces: `ACCOUNT_DELETION_COPY`, `getAccountDeletionPresentation(status)`, `shouldClearLocalData(result)`, and `getPostDeletionLibraryState()`.

- [ ] **Step 1: Write failing behavior tests**

Test that copy mentions collection, shared content, account, owner transfer, and Photos retention; test that only a successful cloud result allows local deletion; test that the post-deletion state equals `getDefaultSnagLibraryState()`.

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test scripts/account-deletion.test.mjs`

Expected: FAIL because `src/utils/account-deletion.ts` does not exist.

- [ ] **Step 3: Implement the pure helper**

Use these statuses:

```ts
export type AccountDeletionStatus = 'idle' | 'confirming' | 'deleting' | 'failed' | 'deleted';
```

The failed presentation must use:

```text
Couldn't delete your data. Nothing on this device was cleared. Please try again.
```

- [ ] **Step 4: Run focused tests and observe GREEN**

Run: `node --test scripts/account-deletion.test.mjs`

Expected: all account-deletion tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/account-deletion.ts scripts/account-deletion.test.mjs
git commit -m "Add account deletion state rules"
```

### Task 2: Local Data Cleanup

**Files:**
- Modify: `src/native/snag-library-storage.ts`
- Modify: `src/native/social-board-cache-storage.ts`
- Modify: `src/services/supabase-auth-storage.ts`
- Create: `src/native/snag-local-data.ts`
- Create: `scripts/snag-local-data-source.test.mjs`

**Interfaces:**
- Produces: `clearSnagLibraryStorageAsync()`, `clearSocialBoardCacheAsync()`, `clearSnagSupabaseAuthStorageAsync()`, and `clearAllSnagLocalDataAsync()`.

- [ ] **Step 1: Write failing source tests**

Assert that each storage owner exports an idempotent clear function and that `clearAllSnagLocalDataAsync()` awaits all three owners without touching `expo-media-library`.

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test scripts/snag-local-data-source.test.mjs`

Expected: FAIL because the clear functions do not exist.

- [ ] **Step 3: Implement idempotent directory deletion**

Each owner deletes only its own directory when it exists. The coordinator calls:

```ts
await clearSnagLibraryStorageAsync();
await clearSocialBoardCacheAsync();
await clearSnagSupabaseAuthStorageAsync();
```

- [ ] **Step 4: Run focused tests and typecheck**

Run: `node --test scripts/snag-local-data-source.test.mjs && npx tsc --noEmit`

Expected: PASS and exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/native src/services/supabase-auth-storage.ts scripts/snag-local-data-source.test.mjs
git commit -m "Add local Snag data cleanup"
```

### Task 3: Transactional Social Cleanup Migration

**Files:**
- Create: `docs/supabase/account-deletion-migration.sql`
- Create: `scripts/account-deletion-migration.test.mjs`

**Interfaces:**
- Produces: `public.prepare_account_deletion(target_user_id uuid)` callable only by `service_role` and durable `public.account_deletion_jobs` rows containing minimal retryable Storage paths.

- [ ] **Step 1: Write failing SQL source tests**

Assert that the migration:

- enables RLS on the job table;
- revokes all access from `PUBLIC`, `anon`, and `authenticated`;
- grants execution only to `service_role`;
- transfers ownership by `joined_at, user_id`;
- deletes sole-member boards;
- removes the target user's Snags, drawings, memberships, reports, bans, and profile;
- records Storage paths before relational deletion;
- is idempotent.

- [ ] **Step 2: Run the migration source test and observe RED**

Run: `node --test scripts/account-deletion-migration.test.mjs`

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Write the migration**

The function returns `{ job_id, storage_paths }`. It must use `SECURITY INVOKER`, set a safe search path, and depend on the service-role caller instead of accepting authority from a client-facing RLS policy.

- [ ] **Step 4: Run source tests and SQL review**

Run: `node --test scripts/account-deletion-migration.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/supabase/account-deletion-migration.sql scripts/account-deletion-migration.test.mjs
git commit -m "Add social account deletion migration"
```

### Task 4: Authenticated Edge Function

**Files:**
- Create: `supabase/functions/delete-my-data/index.ts`
- Create: `supabase/functions/delete-my-data/deno.json`
- Create: `scripts/delete-my-data-function-source.test.mjs`

**Interfaces:**
- Consumes: authenticated `Authorization: Bearer <user-jwt>` and `prepare_account_deletion`.
- Produces: HTTP `200 { deleted: true }`; idempotent success for an already completed deletion; structured non-secret errors otherwise.

- [ ] **Step 1: Write failing security tests**

Assert that the function obtains the user with `auth.getUser(token)`, never accepts `userId` from the request body, invokes the RPC with the authenticated ID, removes `board-snags` paths, revokes sessions, and calls `auth.admin.deleteUser` only from the server.

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test scripts/delete-my-data-function-source.test.mjs`

Expected: FAIL because the Edge Function does not exist.

- [ ] **Step 3: Implement the function**

Use a publishable-key client for caller verification and a server-only secret-key client for cleanup. Reject missing or invalid JWTs with 401. Delete the durable job after Storage cleanup and Auth deletion complete.

- [ ] **Step 4: Run focused tests**

Run: `node --test scripts/delete-my-data-function-source.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/delete-my-data scripts/delete-my-data-function-source.test.mjs
git commit -m "Add authenticated account deletion function"
```

### Task 5: Mobile Deletion Client

**Files:**
- Create: `src/services/account-deletion-service.ts`
- Create: `scripts/account-deletion-service-source.test.mjs`
- Modify: `src/services/social-board-service.ts`

**Interfaces:**
- Produces: `deleteMySnagDataAsync({ client }): Promise<{ deleted: true }>`.
- Requires: an active Supabase session; invokes only `delete-my-data` with no target-user payload.

- [ ] **Step 1: Write failing client tests**

Assert that the service rejects a missing client/session, invokes the function without a user ID, surfaces server failure, and returns success only for `{ deleted: true }`.

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test scripts/account-deletion-service-source.test.mjs`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the service and client typing**

Extend the local Supabase client interface with `functions.invoke` and `auth.signOut` only where required. Do not add admin methods to the app-side type.

- [ ] **Step 4: Run tests and typecheck**

Run: `node --test scripts/account-deletion-service-source.test.mjs && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services scripts/account-deletion-service-source.test.mjs
git commit -m "Add account deletion client"
```

### Task 6: Settings UI and First-Install Reset

**Files:**
- Modify: `src/app/index.tsx`
- Modify: `scripts/app-ui-source.test.mjs`

**Interfaces:**
- Consumes: deletion presentation helpers, `deleteMySnagDataAsync`, `clearAllSnagLocalDataAsync`, and `getDefaultSnagLibraryState()`.
- Produces: the red Settings action, confirmation/progress/error/success states, and clean in-memory reset.

- [ ] **Step 1: Add failing UI source tests**

Assert that `Delete my data` is bottom-right, borderless, red, accessible, and opens the exact warning. Assert that the handler awaits cloud deletion before local cleanup, signs out locally, resets every library/social state bucket, closes Settings after success, and does not call `exit` or terminate the app.

- [ ] **Step 2: Run the UI source test and observe RED**

Run: `node --test scripts/app-ui-source.test.mjs`

Expected: new account-deletion assertions fail.

- [ ] **Step 3: Implement the UI and deletion sequence**

Use the existing Animated/liquid-glass dialog language. Keep `Delete my data` as red text without a container border. Disable Settings dismissal during deletion. On success show `Your data has been deleted.`, reset to collection/`Category 1`, and hold social bootstrap until the user opens Social.

- [ ] **Step 4: Run focused tests, typecheck, and lint**

Run: `node --test scripts/account-deletion.test.mjs scripts/snag-local-data-source.test.mjs scripts/account-deletion-service-source.test.mjs scripts/app-ui-source.test.mjs && npx tsc --noEmit && npm run lint`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/index.tsx scripts/app-ui-source.test.mjs
git commit -m "Add in-app data deletion flow"
```

### Task 7: Production Supabase Deployment and Verification

**Files:**
- Verify: `docs/supabase/account-deletion-migration.sql`
- Verify: `supabase/functions/delete-my-data/index.ts`

**Interfaces:**
- Target project: Supabase `Snag`, project ref `ozmkeaojnqwmerxwlpur`, region `us-east-1`.

- [ ] **Step 1: Apply the reviewed DDL migration once**

Apply through the connected Supabase migration tool using migration name `add_account_deletion_flow`.

- [ ] **Step 2: Deploy the Edge Function**

Deploy `delete-my-data` with `verify_jwt: true` and the committed function files.

- [ ] **Step 3: Run schema and permission checks**

Verify the job table has RLS, authenticated users cannot execute the cleanup function directly, and the Edge Function is active.

- [ ] **Step 4: Run Supabase advisors**

Run security and performance advisors. Resolve any newly introduced warning before release.

- [ ] **Step 5: Run a controlled deletion scenario**

Create isolated test users/boards or use a transaction-safe fixture, then verify sole-board deletion, multi-member owner transfer, content cleanup, Storage cleanup, and cross-user denial without touching existing real boards.

### Task 8: Release Verification and TestFlight

**Files:**
- Verify: entire repository and production backend.

- [ ] **Step 1: Run the complete test suite**

Run all `scripts/*.test.mjs` and `tests/*.test.mjs`, then `npx tsc --noEmit` and `npm run lint`. Record any unrelated pre-existing failures separately; no account-deletion failure may remain.

- [ ] **Step 2: Verify a production-style iPhone flow**

Check Settings layout, cancel, failed-network retention, deletion success, Photos retention, first-install reset, relaunch, and delayed social account recreation.

- [ ] **Step 3: Review release diff and secrets**

Run `git diff`, `git status`, and secret scans for service-role keys. Confirm only publishable Supabase configuration exists in the app bundle.

- [ ] **Step 4: Commit final verification fixes**

Commit only if verification required code changes.

- [ ] **Step 5: Build and auto-submit**

Run:

```bash
npx eas-cli build --platform ios --profile production --auto-submit --non-interactive
```

Wait until EAS reports the build `FINISHED` and App Store Connect submission succeeds. Report the new build number and TestFlight processing link.
