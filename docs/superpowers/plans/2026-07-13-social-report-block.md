# Social Report and Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lightweight board-content reporting and clearly labeled owner blocking for App Review readiness.

**Architecture:** Extend `board_reports` with a typed Snag reference, load each reporter's own open Snag reports alongside board content, and filter those items before mapping them into the board UI. Reuse the existing board member ban operation and change only its user-facing copy. Keep the interaction inside the existing long-press glass action and confirmation-dialog patterns.

**Tech Stack:** Expo SDK 56, React Native, TypeScript, Supabase Postgres/RLS, `@supabase/supabase-js`, Node test runner.

## Global Constraints

- The client must never be able to report as another user.
- Reported content is hidden only for the reporter; it is not deleted for other members.
- Owners block members through the existing kick-and-ban transaction.
- Do not add a moderation dashboard, reason picker, global block list, or automatic image moderation.
- Preserve existing board gesture and copy/edit behavior.

---

### Task 1: Report schema and pure mapping

**Files:**
- Create: `docs/supabase/content-report-migration.sql`
- Modify: `src/data/boards.ts`
- Modify: `scripts/boards.test.mjs`
- Test: `scripts/social-board-service.test.mjs`

**Interfaces:**
- Produces: `getReportedBoardSnagIds(rows)` and a `board_reports.snag_id` foreign key.
- Consumes: current authenticated user ID and report rows loaded under RLS.

- [ ] Write tests proving only open `snag` reports with a Snag ID are converted to hidden IDs, and proving the migration adds the column plus an authenticated-member insert policy.
- [ ] Run `node --test scripts/boards.test.mjs scripts/social-board-service.test.mjs` and confirm the new assertions fail.
- [ ] Implement the pure mapper and SQL migration with `snag_id uuid references public.board_snags(id) on delete cascade`.
- [ ] Run the focused tests and confirm they pass.
- [ ] Commit the schema and mapping unit.

### Task 2: Cloud report service and reload filtering

**Files:**
- Modify: `src/services/social-board-service.ts`
- Modify: `scripts/social-board-service.test.mjs`

**Interfaces:**
- Produces: `reportSocialBoardSnagAsync({ client, currentMemberId, roomId, snagId, targetMemberId })`.
- Consumes: `getReportedBoardSnagIds(rows)` from Task 1.

- [ ] Write failing service tests proving a report writes `type: 'snag'` and `snag_id`, and joined-board loading excludes the reporter's open reported Snags.
- [ ] Run the focused service tests and confirm they fail for missing behavior.
- [ ] Implement the insert and add the current reporter's report query to `loadJoinedSocialBoardsAsync`.
- [ ] Filter rows before image URL mapping so hidden images are not downloaded.
- [ ] Run the focused tests and commit.

### Task 3: Board UI report action and owner block copy

**Files:**
- Modify: `src/app/index.tsx`
- Modify: `src/data/boards.ts`
- Modify: `scripts/app-ui-source.test.mjs`
- Modify: `scripts/boards.test.mjs`

**Interfaces:**
- Consumes: `reportSocialBoardSnagAsync` from Task 2.
- Produces: a `Report` board action, confirmation dialog, optimistic hide/rollback, and `Block from board` member copy.

- [ ] Add failing source and copy tests for the report action/dialog and block wording.
- [ ] Run the focused tests and confirm expected failures.
- [ ] Extend the board long-press anchor with a `Report` action for non-owned Snags only.
- [ ] On confirmation, remove the Snag from the current board state, await the cloud insert, restore on failure, and show concise success/failure feedback.
- [ ] Rename the owner member action and confirmation copy to `Block from board` while retaining the existing ban call.
- [ ] Run focused tests and commit.

### Task 4: Production migration and verification

**Files:**
- Verify: `docs/supabase/content-report-migration.sql`

**Interfaces:**
- Consumes: production Supabase project `ozmkeaojnqwmerxwlpur`.
- Produces: deployed `snag_id` schema and RLS policy.

- [ ] Run Supabase advisors before the migration and record existing warnings.
- [ ] Apply the migration.
- [ ] Verify the column, foreign key, RLS, grants, and authenticated insert behavior using rollback-safe SQL.
- [ ] Confirm existing board/report row counts are unchanged.

### Task 5: Release-readiness verification

**Files:**
- Verify all changed files.

**Interfaces:**
- Produces: a tested release candidate and a concise list of remaining App Store work.

- [ ] Run focused tests, `npx tsc --noEmit`, and `npm run lint`.
- [ ] Run the complete test suite and distinguish new regressions from the two known social image-cache baseline failures.
- [ ] Open the simulator and verify member blocking and content-report dialog placement without submitting a real report against user data.
- [ ] Review the final diff and confirm no key or service-role secret is present.
- [ ] Commit the verified implementation.
