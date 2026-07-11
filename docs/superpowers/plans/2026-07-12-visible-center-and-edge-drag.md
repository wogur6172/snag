# Visible-Center Text and Edge-Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place newly created text in the currently visible center and continuously pan editable canvases at a fixed speed while a Snag is held near an edge.

**Architecture:** Pure coordinate helpers in `src/utils/boards.ts` calculate viewport-centered placement and fixed-speed edge movement. `CollectionView` and `BoardView` own their scroll loops and report viewport snapshots to `SnagApp`; `TransformableSnag` consumes shared viewport offsets so the active item stays under the finger while the canvas moves.

**Tech Stack:** Expo SDK 56, React Native 0.85, React 19.2, react-native-gesture-handler, react-native-reanimated, Node test runner.

## Global Constraints

- Collection categories auto-pan only left and right.
- Social boards auto-pan in all four directions and diagonally.
- The edge zone is 56 points and speed is fixed regardless of edge proximity.
- The fixed All category remains unchanged.
- Trash targeting, drawing, and surface navigation keep priority.
- No Supabase schema change or new dependency.

---

### Task 1: Pure viewport and edge-pan calculations

**Files:**
- Modify: `src/utils/boards.ts`
- Test: `scripts/boards.test.mjs`

**Interfaces:**
- Produces: `SnagViewportSnapshot`, `getViewportCenteredSnagPresentation(...)`, and `getNextEdgePanOffset(...)`.
- Consumes: Existing `BoardScrollOffset` and the app's canvas/viewport dimensions.

- [ ] **Step 1: Write failing placement tests**

Add tests proving a 260-point text Snag is centered at the current offset and clamped when the visible center is near a canvas boundary.

```js
assert.deepEqual(getViewportCenteredSnagPresentation({
  canvasHeight: 1200,
  canvasWidth: 1180,
  offsetX: 420,
  offsetY: 180,
  preferredSize: 260,
  viewportHeight: 700,
  viewportWidth: 390,
}), { canvasX: 485, canvasY: 400, size: 260 });
```

- [ ] **Step 2: Run placement tests and verify RED**

Run: `node --test --experimental-strip-types scripts/boards.test.mjs`

Expected: FAIL because `getViewportCenteredSnagPresentation` is not exported.

- [ ] **Step 3: Write failing fixed-speed edge tests**

Test left, right, top, bottom, diagonal, safe-center, and canvas-boundary cases. Two points at different depths in the same edge zone must produce the same movement for the same elapsed time.

- [ ] **Step 4: Implement minimal pure helpers**

Add:

```ts
export type SnagViewportSnapshot = BoardScrollOffset & {
  canvasHeight: number;
  canvasWidth: number;
  surfaceId: string;
  viewportHeight: number;
  viewportWidth: number;
};

export function getViewportCenteredSnagPresentation(...): {
  canvasX: number;
  canvasY: number;
  size: number;
};

export function getNextEdgePanOffset(...): BoardScrollOffset;
```

Use a 56-point edge zone, a fixed 220 points-per-second speed, a 32ms elapsed-time cap, and canvas-bound clamping.

- [ ] **Step 5: Run board tests and verify GREEN**

Run: `node --test --experimental-strip-types scripts/boards.test.mjs`

Expected: all board tests pass.

### Task 2: Current-viewport text placement

**Files:**
- Modify: `src/app/index.tsx`
- Test: `scripts/app-ui-source.test.mjs`
- Test: `scripts/boards.test.mjs`

**Interfaces:**
- Consumes: `SnagViewportSnapshot` and `getViewportCenteredSnagPresentation` from Task 1.
- Produces: `onViewportChange(snapshot)` integration for `CollectionView` and `BoardView`.

- [ ] **Step 1: Write failing integration tests**

Assert that both views accept `onViewportChange`, report their current canvas offsets, and that new collection/board text uses `getViewportCenteredSnagPresentation` instead of origin-based `getNewSnagPresentation`.

- [ ] **Step 2: Run integration tests and verify RED**

Run: `node --test --experimental-strip-types scripts/app-ui-source.test.mjs scripts/boards.test.mjs`

Expected: FAIL because viewport reporting is absent.

- [ ] **Step 3: Capture viewport snapshots**

Add collection and board viewport refs in `SnagApp`. Include the matching category/room ID, current offsets, canvas dimensions, and viewport dimensions. Capture the matching snapshot in `TextSnagDialogState` when opening a create dialog; edit dialogs keep the existing position.

- [ ] **Step 4: Place text at the captured visible center**

Use `getViewportCenteredSnagPresentation` when a valid matching snapshot exists and retain `getNewSnagPresentation` only as a startup fallback.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test --experimental-strip-types scripts/app-ui-source.test.mjs scripts/boards.test.mjs scripts/snags.test.mjs`

Expected: all focused tests pass.

### Task 3: Fixed-speed edge panning with drag compensation

**Files:**
- Modify: `src/components/transformable-snag.tsx`
- Modify: `src/app/index.tsx`
- Test: `scripts/app-ui-source.test.mjs`
- Test: `scripts/transformable-snag-source.test.mjs`

**Interfaces:**
- Consumes: `getNextEdgePanOffset` from Task 1.
- Produces: Optional `viewportOffsetX` and `viewportOffsetY` `SharedValue<number>` props on `TransformableSnag`.

- [ ] **Step 1: Write failing compensation tests**

Assert that `TransformableSnag` captures viewport offsets at pan start, adds their delta to the animated translation, and includes the delta in the committed transform.

- [ ] **Step 2: Run compensation tests and verify RED**

Run: `node --test --experimental-strip-types scripts/transformable-snag-source.test.mjs scripts/app-ui-source.test.mjs`

Expected: FAIL because viewport compensation props do not exist.

- [ ] **Step 3: Implement Reanimated drag compensation**

Add optional shared viewport offsets. At drag start, capture the current values. During the drag, add the viewport delta to the active item's animated translation. At drag end, include that delta once in the persisted transform before resetting the gesture values.

- [ ] **Step 4: Implement collection edge panning**

Keep a ref to each category's horizontal `ScrollView`, a mutable current offset, latest finger point, and one animation-frame loop. While dragging near the left/right device edge, call `scrollTo({ animated: false, x })`, update the shared X offset, and continue until release or safe-center return.

- [ ] **Step 5: Implement board edge panning**

Measure the board viewport in window coordinates when dragging starts. Use the existing `applyBoardVisualOffset` path inside one animation-frame loop for all four axes. Update shared X/Y offsets, the minimap, and throttled React state. Stop at canvas bounds, safe center, trash arming, release, room change, drawing mode, and unmount.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test --experimental-strip-types scripts/boards.test.mjs scripts/app-ui-source.test.mjs scripts/transformable-snag-source.test.mjs`

Expected: all focused tests pass.

### Task 4: Full verification and delivery

**Files:**
- Verify all modified files.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: a verified Git commit and iOS TestFlight build when the code checks pass.

- [ ] **Step 1: Run static verification**

Run in parallel:

```bash
npx tsc --noEmit
npm run lint
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Run the full test suite**

Run: `node --test --experimental-strip-types scripts/*.test.mjs`

Expected: zero failures.

- [ ] **Step 3: Export an iOS production bundle**

Run: `npx expo export --platform ios --output-dir /tmp/snag-visible-center-edge-drag`

Expected: iOS bundle completes without a Metro error.

- [ ] **Step 4: Review and commit**

Review `git diff`, stage only the plan and implementation files, and commit with:

```bash
git commit -m "Improve text placement and edge dragging"
```

- [ ] **Step 5: Push and submit build**

Push `main`, then run:

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit --message "Improve text placement and edge dragging" --non-interactive
```

Expected: EAS increments the build number and uploads the binary to App Store Connect.
