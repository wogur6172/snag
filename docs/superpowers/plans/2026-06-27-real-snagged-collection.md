# Real Snagged Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove seeded/mock snags and make captured/refined results animate into the real All collection.

**Architecture:** Keep the collection state empty on launch, create each `SnagItem` from the completed capture asset, and render saved image snags without decorative sticker borders. Use one `Animated.Value` for the save celebration so the result appears large with `Snagged!`, then shrinks toward the collection.

**Tech Stack:** Expo SDK 56, React Native Animated, expo-image, existing local Snag cutout module.

---

### Task 1: Real Snag Item Helper

**Files:**
- Create: `src/utils/snags.ts`
- Create: `scripts/snags.test.mjs`

- [ ] Add a failing test that `createSnagFromAsset` returns a real image snag with no seed fields.
- [ ] Run `node --test --experimental-strip-types scripts/snags.test.mjs` and verify the missing export fails.
- [ ] Implement `createSnagFromAsset` and `getSnagBounds`.
- [ ] Re-run the test and confirm it passes.

### Task 2: Remove Seeded Data From Runtime

**Files:**
- Modify: `src/data/snags.ts`
- Modify: `src/app/index.tsx`

- [ ] Start `snags` state as `[]`.
- [ ] Remove fallback `SNAG_ITEMS[...]` use from save handling.
- [ ] Remove simulator sample completion from the main app collection flow.
- [ ] Keep `All` as the only built-in category.

### Task 3: Snagged Animation

**Files:**
- Modify: `src/app/index.tsx`

- [ ] Show the saved image result in the celebration overlay.
- [ ] Render `Snagged!` with the app wordmark font.
- [ ] Animate the image from large/centered to smaller/lower as it enters All.
- [ ] Switch the main mode to collection after the animation begins so the new result is visible in All.

### Task 4: Borderless Collection Snags

**Files:**
- Modify: `src/components/transformable-snag.tsx`

- [ ] Remove the white border around image snags.
- [ ] Allow broad pinch scaling.
- [ ] Clamp pan translation so a snag cannot be dragged completely off the visible board.

### Task 5: Verification

- [ ] Run `node --test --experimental-strip-types scripts/*.test.mjs`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run lint`.
