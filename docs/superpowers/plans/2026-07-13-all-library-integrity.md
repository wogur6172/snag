# All Library Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `All` a permanent, duplicate-free master library while custom categories remain removable placements, and expose complete-family deletion from an `All` long press.

**Architecture:** Keep the existing flat Snag records and `originSnagId` chains. Add pure identity/projection/deletion helpers in `src/utils/snags.ts`, use those helpers from the collection state handlers, and reuse the existing destructive confirmation dialog for both Select and long-press deletion.

**Tech Stack:** TypeScript, React Native 0.85, Expo SDK 56, Node test runner.

## Global Constraints

- Do not change vertical or horizontal swipe behavior.
- `All` renders exactly one image representative per master identity.
- Removing every custom-category placement must leave the master in `All`.
- Only deletion initiated from `All` removes the full master family.
- Text Snags remain category-only.
- Existing stored libraries require no destructive migration.

---

### Task 1: Master Projection and Placement Deletion

**Files:**
- Modify: `scripts/snags.test.mjs`
- Modify: `src/utils/snags.ts`

**Interfaces:**
- Produces: `getSnagsForCategory({ categoryId, snags })` with deduplicated `All` projection.
- Produces: `deleteSnagPlacement({ snagId, snags })` that removes a category placement while preserving its master.
- Produces: `deleteSnagCategory(...)` that preserves one master when deleting a whole category.

- [ ] **Step 1: Add failing identity projection tests**

Add tests proving an original plus copies yields one `All` item, a missing original promotes one surviving copy, and text remains excluded.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test scripts/snags.test.mjs`
Expected: duplicate projection assertions fail and `deleteSnagPlacement` is not exported.

- [ ] **Step 3: Implement root grouping and representative selection**

Resolve each image record to its root identity, prefer a non-excluded record, fall back to a surviving copy whose `originSnagId` proves it belongs to a collected master, and return one representative per root.

- [ ] **Step 4: Implement category-only deletion**

When removing a placement, remove it if another master representative remains; otherwise convert it to an `all` record with `excludeFromAll` cleared. Apply the same invariant when deleting an entire category.

- [ ] **Step 5: Run focused tests**

Run: `node --test scripts/snags.test.mjs`
Expected: all Snag utility tests pass.

### Task 2: Collection State Integration

**Files:**
- Modify: `scripts/app-ui-source.test.mjs`
- Modify: `src/app/index.tsx`

**Interfaces:**
- Consumes: `deleteSnagPlacement({ snagId, snags })`.
- Produces: custom-category trash deletion that preserves `All`.
- Produces: `onDeleteAllSnagRequested(snagId)` callback from `CollectionView`.

- [ ] **Step 1: Add failing source regression checks**

Assert that ordinary collection deletion calls `deleteSnagPlacement`, while full-family deletion continues through `deleteSelectedAllSnags`.

- [ ] **Step 2: Run source tests and verify failure**

Run: `node --test scripts/app-ui-source.test.mjs`
Expected: the new integration assertion fails.

- [ ] **Step 3: Integrate placement deletion**

Replace the direct `snags.filter(id !== snagId)` path with `deleteSnagPlacement` without changing board deletion or All Select deletion.

- [ ] **Step 4: Add single-item All deletion request**

Store the long-pressed representative ID, close the floating action, and open the existing `AllSelectionDeleteDialog` with one selected item.

- [ ] **Step 5: Run source tests**

Run: `node --test scripts/app-ui-source.test.mjs`
Expected: all UI source checks pass.

### Task 3: All Long-Press Delete UI and Verification

**Files:**
- Modify: `src/app/index.tsx`
- Modify: `scripts/app-ui-source.test.mjs`

**Interfaces:**
- Consumes: `onDeleteAllSnagRequested(snagId)`.
- Produces: red `Delete` action shown only when the long-press anchor belongs to `all`.

- [ ] **Step 1: Add failing UI source checks**

Assert that the All floating menu includes a red `Delete` label and calls the full-family confirmation callback.

- [ ] **Step 2: Run the source test and verify failure**

Run: `node --test scripts/app-ui-source.test.mjs`
Expected: the Delete action assertion fails.

- [ ] **Step 3: Add the Delete action**

Render a third liquid-glass action beneath Save and Copy only for `copyAnchor.categoryId === 'all'`; use destructive red text and the existing pop animation.

- [ ] **Step 4: Run all automated checks**

Run: `node --test scripts/*.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Run static and Expo checks**

Run: `npx tsc --noEmit && npm run lint && npx expo-doctor`
Expected: zero errors and Expo Doctor reports all checks passed.
