# Settings Contact And Share Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tappable Snag support and social-account rows to Settings and replace the placeholder Board download URL with the permanent App Store product URL.

**Architecture:** Keep public account metadata and link-opening behavior in a small pure utility so it can be tested without a device. Render those definitions through the existing `SettingsOverlay`, using Expo Linking as the operating-system URL opener. Keep Board invite-copy construction in the existing board utility.

**Tech Stack:** Expo SDK 56, React Native, TypeScript, Expo Linking, Node test runner.

## Global Constraints

- Support email is exactly `snagboardapp@gmail.com`.
- Instagram and TikTok display `@Snag_board` and open the `snag_board` profile.
- App Store product URL is exactly `https://apps.apple.com/app/id6789531333`.
- No new native dependency or configuration plugin.
- Link failures leave Settings open and emit one concise warning.

---

### Task 1: Public Contact Definitions And Safe Link Opening

**Files:**
- Create: `src/utils/public-links.ts`
- Create: `scripts/public-links.test.mjs`

**Interfaces:**
- Produces: `SNAG_PUBLIC_LINKS`, a readonly list of `{ id, label, value, url, accessibilityLabel }` records.
- Produces: `openSnagPublicLinkAsync(url, openURL): Promise<boolean>`.

- [ ] **Step 1: Write the failing utility test**

Test exact email, Instagram, and TikTok values and URLs. Test that `openSnagPublicLinkAsync` returns `true` when its injected opener resolves and `false` when the opener rejects.

- [ ] **Step 2: Run the test to verify RED**

Run: `node --test scripts/public-links.test.mjs`

Expected: FAIL because `src/utils/public-links.ts` does not exist.

- [ ] **Step 3: Implement the minimal utility**

Create the three immutable public-link records and a small `try/catch` wrapper around the injected `openURL` function. Do not import native modules into this pure utility.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `node --test scripts/public-links.test.mjs`

Expected: all public-link tests pass.

### Task 2: Permanent App Store Share URL

**Files:**
- Modify: `scripts/boards.test.mjs`
- Modify: `src/utils/boards.ts`

**Interfaces:**
- Changes: `SNAG_APP_DOWNLOAD_URL` to `https://apps.apple.com/app/id6789531333`.
- Preserves: `getBoardInviteShareCopy({ downloadUrl?, inviteCode? }): { message: string }`.

- [ ] **Step 1: Change the Board share test first**

Require both the exported constant and generated message to use the permanent App Store URL while continuing to omit room invite codes.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `node --test scripts/boards.test.mjs`

Expected: one share-copy assertion fails because production still returns `https://snag.app/download`.

- [ ] **Step 3: Change only the download URL constant**

Replace the placeholder constant in `src/utils/boards.ts`; do not alter the established share copy.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `node --test scripts/boards.test.mjs`

Expected: all Board utility tests pass.

### Task 3: Settings Contact Rows

**Files:**
- Modify: `scripts/app-ui-source.test.mjs`
- Modify: `src/app/index.tsx`

**Interfaces:**
- Consumes: `SNAG_PUBLIC_LINKS` and `openSnagPublicLinkAsync` from `@/utils/public-links`.
- Uses: `Linking.openURL(url)` from Expo Linking.

- [ ] **Step 1: Add the failing Settings source test**

Require `SettingsOverlay` to map `SNAG_PUBLIC_LINKS`, call `openSnagPublicLinkAsync`, render each value, provide button accessibility labels, and include the new contact-list styles.

- [ ] **Step 2: Run the source test to verify RED**

Run: `node --test scripts/app-ui-source.test.mjs`

Expected: the new Settings-contact assertion fails because the rows are absent.

- [ ] **Step 3: Implement the Settings rows**

Import Expo Linking and the public-link utility. Add a local async press handler that warns only when opening fails. Render three compact translucent rows between the profile hint and Social limits, with label, visible destination, and an `arrow.up.right` symbol.

- [ ] **Step 4: Run the source test to verify GREEN**

Run: `node --test scripts/app-ui-source.test.mjs`

Expected: all UI source tests pass.

### Task 4: Full Verification

**Files:**
- Verify all modified and created files.

**Interfaces:**
- Confirms the feature compiles and does not regress existing behavior.

- [ ] **Step 1: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0.

- [ ] **Step 3: Run all script tests**

Run: `node --test scripts/*.test.mjs`

Expected: zero failed tests.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors and only the planned implementation/test files are modified.
