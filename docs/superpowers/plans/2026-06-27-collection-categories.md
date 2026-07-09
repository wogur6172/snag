# Collection Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the collection board visually clean, keep snags inside the board edge while dragging/scaling, and add selectable/swipeable categories.

**Architecture:** Add pure category and transform helpers in `src/utils/snags.ts`, cover them with Node tests, then wire those helpers into `src/app/index.tsx` and `src/components/transformable-snag.tsx`. Keep `All` as the default category and store new snags in the currently selected category.

**Tech Stack:** Expo SDK 56, React Native, react-native-gesture-handler, react-native-reanimated, Node test runner.

---

### Task 1: Category State Helpers

**Files:**
- Modify: `src/utils/snags.ts`
- Modify: `scripts/snags.test.mjs`

- [ ] Add tests for `createSnagCategory`, `getNextCategoryId`, and category assignment in `createSnagFromAsset`.
- [ ] Verify tests fail before implementation.
- [ ] Implement helpers with `All` as the fixed default.
- [ ] Verify tests pass.

### Task 2: Board Edge Containment

**Files:**
- Modify: `src/utils/snags.ts`
- Modify: `scripts/snags.test.mjs`
- Modify: `src/components/transformable-snag.tsx`

- [ ] Add tests proving transforms clamp at the board edge instead of allowing partial off-screen dragging.
- [ ] Verify tests fail before implementation.
- [ ] Replace the partial visibility clamp with full edge containment.
- [ ] Wire the clamp into pan and pinch updates.

### Task 3: Collection UI

**Files:**
- Modify: `src/app/index.tsx`

- [ ] Remove decorative collection board marks.
- [ ] Pass selected category and filtered snags into `CollectionView`.
- [ ] Add category tray selection and a minimal category add button.
- [ ] Add vertical fling gestures for previous/next category.
- [ ] Save new snags to the selected category.

### Task 4: Verification

- [ ] Run `node --test --experimental-strip-types scripts/*.test.mjs`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run lint`.
