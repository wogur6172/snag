# Capture Recognition Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace camera and manual-export stalls with an immediate shutter response, a captured-frame recognition state, and a responsive finalizing state.

**Architecture:** Keep `CaptureFlow`'s existing `live`, `processing`, and `refine` navigation stages, and add a focused `CaptureActivity` state for transient work. Pure timing and copy decisions live in `src/utils/capture-feedback.ts`; native-driven visual feedback remains in `src/app/index.tsx` so Expo Camera, Vision cutout, and the existing editor retain their current ownership boundaries.

**Tech Stack:** Expo SDK 56, React Native 0.85 `Animated`, Expo Camera 56, Expo Haptics 56, Expo Image 56, Expo Glass Effect 56, Node test runner.

## Global Constraints

- Read and follow the exact Expo SDK 56 documentation.
- Keep the camera silent.
- Keep the real captured frame visible while work is ongoing.
- Do not show fake percentages or a determinate progress bar.
- Keep Vision and manual cutout behavior unchanged.
- Use native-driven opacity and transform animation.
- Preserve manual edits after export failure.
- The current baseline has two unrelated failing source assertions in `scripts/app-ui-source.test.mjs`; this work must not add failures.

---

### Task 1: Capture Activity Rules

**Files:**
- Create: `src/utils/capture-feedback.ts`
- Create: `scripts/capture-feedback.test.mjs`

**Interfaces:**
- Produces: `CaptureActivity`, `CAPTURE_ACTIVITY_MIN_VISIBLE_MS`, `getCaptureActivityPresentation(activity)`, and `getCaptureActivityDelayMs({ startedAtMs, nowMs })`.
- Consumes: no app or native state.

- [ ] **Step 1: Write failing tests for copy, visibility, and minimum timing**

```ts
assert.deepEqual(getCaptureActivityPresentation('recognizing'), {
  blocksInteraction: true,
  label: 'Finding your Snag...',
  showCapturedFrame: true,
});
assert.deepEqual(getCaptureActivityPresentation('finalizing'), {
  blocksInteraction: true,
  label: 'Finishing your Snag...',
  showCapturedFrame: false,
});
assert.equal(getCaptureActivityDelayMs({ startedAtMs: 1_000, nowMs: 1_250 }), 350);
assert.equal(getCaptureActivityDelayMs({ startedAtMs: 1_000, nowMs: 2_000 }), 0);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test scripts/capture-feedback.test.mjs`

Expected: FAIL because `src/utils/capture-feedback.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure helper**

```ts
export type CaptureActivity = 'idle' | 'capturing' | 'recognizing' | 'preparing-manual' | 'finalizing';

export const CAPTURE_ACTIVITY_MIN_VISIBLE_MS = 600;

export function getCaptureActivityDelayMs({ startedAtMs, nowMs }: { startedAtMs: number; nowMs: number }) {
  return Math.max(CAPTURE_ACTIVITY_MIN_VISIBLE_MS - Math.max(nowMs - startedAtMs, 0), 0);
}
```

`getCaptureActivityPresentation` returns the exact labels and whether the activity needs the captured frame or blocks interaction.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test scripts/capture-feedback.test.mjs`

Expected: PASS with no failed tests.

- [ ] **Step 5: Commit the helper and its test**

```bash
git add src/utils/capture-feedback.ts scripts/capture-feedback.test.mjs
git commit -m "Add capture activity rules"
```

### Task 2: Immediate Shutter And Recognition Presentation

**Files:**
- Modify: `src/app/index.tsx:1-30`
- Modify: `src/app/index.tsx:5313-5935`
- Modify: `src/app/index.tsx:8530-8950`
- Modify: `scripts/app-ui-source.test.mjs`

**Interfaces:**
- Consumes: `CaptureActivity`, `getCaptureActivityDelayMs`, and `getCaptureActivityPresentation` from Task 1.
- Produces: `CaptureActivityOverlay` and an updated `CaptureFlow` that commits the captured frame before support detection and Vision processing.

- [ ] **Step 1: Add failing source assertions for the required ordering and feedback UI**

```ts
it('commits shutter and recognition feedback before expensive capture work', () => {
  const source = getFunctionSource('CaptureFlow', 'CameraCanvas');
  assert.match(source, /setCaptureActivity\('capturing'\)/);
  assert.match(source, /setStage\('processing'\)[\s\S]*?await waitForPaint\(\)[\s\S]*?ensureCutoutSupport\(\)/);
  assert.match(source, /Finding your Snag/);
  assert.match(source, /Preparing your canvas/);
  assert.match(source, /useNativeDriver: true/);
});
```

- [ ] **Step 2: Run the source test and verify RED**

Run: `node --test --test-name-pattern="commits shutter and recognition feedback" scripts/app-ui-source.test.mjs`

Expected: FAIL because capture activity and the animated overlay are not present.

- [ ] **Step 3: Implement the animated overlay and shutter feedback**

Add a `CaptureActivityOverlay` that:

```tsx
<Animated.View pointerEvents="auto" style={[styles.captureActivityOverlay, { opacity: overlayOpacity }]}> 
  <Animated.View style={[styles.captureScanLine, { transform: [{ translateY: scanTranslateY }] }]} />
  <GlassView colorScheme="dark" style={styles.captureActivityPill}>
    <ActivityIndicator color="#FFFFFF" size="small" />
    <Text style={styles.captureActivityText}>{presentation.label}</Text>
  </GlassView>
</Animated.View>
```

Use `Animated.loop` with `useNativeDriver: true`, disable the moving sweep when Reduce Motion is enabled, and render a separate short white `Animated.View` shutter flash above the live camera.

- [ ] **Step 4: Commit the processing screen before native work**

Refactor `handleCapturedAsset` to:

```ts
const activityStartedAtMs = Date.now();
setCapturedAsset(asset);
setCaptureActivity(autoCutout ? 'recognizing' : 'preparing-manual');
setStage('processing');
await waitForPaint();
const isSupported = await ensureCutoutSupport();
```

Keep the original photo in `capturedAsset` until Vision finishes. Hold the processed result in a local variable, wait only for the remaining portion of the 600 ms minimum, then commit the processed asset and `refine` stage together.

- [ ] **Step 5: Run focused activity and source tests**

Run: `node --test scripts/capture-feedback.test.mjs --test-name-pattern="commits shutter and recognition feedback" scripts/app-ui-source.test.mjs`

Expected: the new tests PASS; unrelated baseline source assertions may still fail only when their names are included.

- [ ] **Step 6: Commit shutter and recognition feedback**

```bash
git add src/app/index.tsx scripts/app-ui-source.test.mjs
git commit -m "Add responsive capture recognition feedback"
```

### Task 3: Responsive Manual Export

**Files:**
- Modify: `src/app/index.tsx:5571-5600`
- Modify: `scripts/app-ui-source.test.mjs`

**Interfaces:**
- Consumes: `CaptureActivityOverlay` and the `finalizing` presentation from Tasks 1 and 2.
- Produces: a manual-export flow that paints feedback before native mask rendering and restores the editor after errors.

- [ ] **Step 1: Add a failing source assertion for finalizing order**

```ts
it('paints finalizing feedback before exporting the manual mask', () => {
  const source = getFunctionSource('CaptureFlow', 'CameraCanvas');
  assert.match(source, /setCaptureActivity\('finalizing'\)[\s\S]*?await waitForPaint\(\)[\s\S]*?applyManualCutoutAsync/);
  assert.match(source, /Finishing your Snag/);
  assert.match(source, /catch[\s\S]*?setCaptureActivity\('idle'\)/);
});
```

- [ ] **Step 2: Run the source test and verify RED**

Run: `node --test --test-name-pattern="paints finalizing feedback" scripts/app-ui-source.test.mjs`

Expected: FAIL because save currently only disables the button.

- [ ] **Step 3: Paint feedback before export and preserve failure recovery**

Update `handleSaveRefinedSnag`:

```ts
setIsSavingRefine(true);
setCaptureActivity('finalizing');
await waitForPaint();
try {
  const result = manualMaskPoints.length > 0
    ? await applyManualCutoutAsync(capturedAsset.uri, manualMaskPoints)
    : capturedAsset;
  // Existing prefetch and completion flow.
} catch {
  setCaptureActivity('idle');
  showCutoutNotice('Manual erase could not save. Try again.');
} finally {
  setIsSavingRefine(false);
}
```

Render the overlay above the intact refine screen whenever the activity is `finalizing`.

- [ ] **Step 4: Run focused tests and lint**

Run: `node --test scripts/capture-feedback.test.mjs`

Run: `node --test --test-name-pattern="capture|finalizing|shutter|recognition" scripts/app-ui-source.test.mjs`

Run: `npm run lint`

Expected: focused tests and lint exit 0.

- [ ] **Step 5: Run regression verification**

Run: `node --test scripts/*.test.mjs tests/*.test.mjs`

Expected: no new failures beyond the two documented baseline source assertions.

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 6: Commit finalizing feedback**

```bash
git add src/app/index.tsx scripts/app-ui-source.test.mjs
git commit -m "Show progress while finalizing Snags"
```

### Task 4: Physical iPhone Verification

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: the completed camera flow.
- Produces: evidence that real Expo Camera and Apple Vision timing feel continuous.

- [ ] **Step 1: Start the SDK 56 development server**

Run: `npx expo start --dev-client --clear`

Expected: Metro starts and displays the development-client URL.

- [ ] **Step 2: Verify camera capture on the connected iPhone**

Confirm: shutter press immediately flashes and responds haptically, the exact captured frame remains visible, `Finding your Snag...` keeps moving, and refine appears without a blank frame.

- [ ] **Step 3: Verify manual export on the connected iPhone**

Confirm: after erasing part of a large image, `Snag` immediately shows `Finishing your Snag...`, animations continue during PNG export, and the existing Snagged flow starts after completion.

- [ ] **Step 4: Verify failure recovery where practical**

Confirm: a Vision miss reaches manual refine with its temporary notice; export failure returns control to the same editor without clearing strokes.
