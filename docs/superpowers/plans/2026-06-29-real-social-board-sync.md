# Real Social Board Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Snag's current local-only social board into a cloud-ready shared board that can create, join, sync, and persist rooms through Supabase while keeping the app usable without cloud keys.

**Architecture:** Keep the existing board UI and local fallback. Add a small social sync layer that maps Snag board rooms, board snags, drawings, and members to Supabase rows and Storage paths. The app calls the sync layer after local optimistic updates, so dragging and drawing stay responsive.

**Tech Stack:** Expo SDK 56, React Native, Supabase JS, Expo SQLite session storage, local fallback helpers, Node test scripts.

---

### Task 1: Cloud Configuration And Data Mapping

**Files:**
- Create: `src/config/supabase.ts`
- Create: `src/utils/social-sync.ts`
- Test: `scripts/social-sync.test.mjs`

- [ ] Write tests for env readiness, invite code generation, row-to-room mapping, room-to-row patch mapping, and board item serialization.
- [ ] Add Supabase config helpers that read `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Add pure social sync mapping functions with no network dependency.
- [ ] Verify `node --test scripts/social-sync.test.mjs`.

### Task 2: Supabase Client And Schema

**Files:**
- Create: `src/services/supabase-client.ts`
- Create: `docs/supabase/social-schema.sql`
- Modify: `package.json`

- [ ] Install official Expo React Native Supabase dependencies.
- [ ] Create a client that is null when env keys are missing.
- [ ] Document the SQL schema, RLS policies, grants, Storage bucket, and manual setup steps.
- [ ] Verify TypeScript still compiles.

### Task 3: Board Sync Service

**Files:**
- Create: `src/services/social-board-service.ts`
- Test: `scripts/social-board-service.test.mjs`

- [ ] Add a local fallback service matching the cloud service API.
- [ ] Add cloud methods for profile upsert, joined-room load, create room, join room, rename, recolor, leave, delete, and board data fetch.
- [ ] Add cloud methods for snag insert/update/delete and drawing insert/clear.
- [ ] Keep all network failures non-fatal and return local fallback data where possible.

### Task 4: Wire Existing UI To The Service

**Files:**
- Modify: `src/app/index.tsx`

- [ ] Load or create the social profile when settings/profile loads.
- [ ] Load joined rooms into the existing Social lobby.
- [ ] Replace create/join room handlers with optimistic local updates plus service calls.
- [ ] Persist board rename/color/leave/delete through the service.
- [ ] Persist board snag paste, move, layer change, and delete through the service.
- [ ] Persist board drawings through the service.

### Task 5: Verification And User Setup Guide

**Files:**
- Test: `scripts/*.test.mjs`
- Verify: `npx tsc --noEmit`, `npm run lint`, `git diff --check`

- [ ] Run focused social tests.
- [ ] Run the full existing Node test suite.
- [ ] Run TypeScript, lint, and whitespace checks.
- [ ] Report exactly which Supabase dashboard steps the user must do.
