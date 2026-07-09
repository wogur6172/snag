# iOS Vision Cutout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add iOS 17+ on-device foreground cutout so Snag can turn a captured or selected photo into a transparent PNG before the refine screen.

**Architecture:** Add one local Expo native module named `SnagCutout` with two JS-facing methods: `isSupportedAsync()` and `cutoutImageAsync(uri)`. The Swift side uses Vision `VNGenerateForegroundInstanceMaskRequest` on iOS 17+, writes a PNG with alpha to cache, and returns the file URI. JS falls back to manual refine when unsupported or when Vision fails.

**Tech Stack:** Expo Dev Build, Expo Modules API, Swift, Apple Vision, Core Image, React Native TypeScript.

---

### Task 1: Local Expo Module Shell

**Files:**
- Create: `/Users/heojaehyuk/Desktop/snag/modules/snag-cutout/package.json`
- Create: `/Users/heojaehyuk/Desktop/snag/modules/snag-cutout/expo-module.config.json`
- Create: `/Users/heojaehyuk/Desktop/snag/modules/snag-cutout/ios/SnagCutout.podspec`
- Create: `/Users/heojaehyuk/Desktop/snag/modules/snag-cutout/ios/SnagCutoutModule.swift`
- Modify: `/Users/heojaehyuk/Desktop/snag/package.json`

- [ ] Add a `snag-cutout` file dependency to the app package.
- [ ] Create the module config with Apple module class `SnagCutoutModule`.
- [ ] Create a podspec that depends on `ExpoModulesCore` and links Vision/CoreImage/ImageIO/UIKit.
- [ ] Add an initial Swift module with `isSupportedAsync()`.
- [ ] Run `npm install` so the local dependency is linked.
- [ ] Run `npx expo-modules-autolinking resolve --platform apple --json` and verify `snag-cutout` appears.

### Task 2: Vision PNG Generation

**Files:**
- Modify: `/Users/heojaehyuk/Desktop/snag/modules/snag-cutout/ios/SnagCutoutModule.swift`

- [ ] Implement `cutoutImageAsync(uri)` for iOS 17+ only.
- [ ] Parse `file://` and plain file paths into `URL`.
- [ ] Load the original image source and EXIF orientation.
- [ ] Run `VNGenerateForegroundInstanceMaskRequest`.
- [ ] Use `VNInstanceMaskObservation.generateMaskedImageOfInstances(_:fromRequestHandler:croppedToInstancesExtent:error:)`.
- [ ] Write the resulting `CVPixelBuffer` to cache as PNG with alpha.
- [ ] Return `{ uri, width, height }`.
- [ ] Throw typed errors for unsupported OS, invalid URI, missing image, empty result, and PNG write failure.

### Task 3: TypeScript Bridge

**Files:**
- Create: `/Users/heojaehyuk/Desktop/snag/src/native/snag-cutout.ts`

- [ ] Add a typed bridge using `requireOptionalNativeModule`.
- [ ] Export `isSnagCutoutSupportedAsync()`.
- [ ] Export `cutoutImageAsync(uri)`.
- [ ] Return unsupported rather than crashing when the native module is not installed.

### Task 4: Capture Flow Integration

**Files:**
- Modify: `/Users/heojaehyuk/Desktop/snag/src/app/index.tsx`

- [ ] Check support when the capture flow opens.
- [ ] If unsupported and user taps auto cutout, show a short unsupported notice and route to manual refine.
- [ ] If supported, call `cutoutImageAsync()` during the processing stage.
- [ ] Replace the captured asset URI with the transparent PNG URI when Vision succeeds.
- [ ] If Vision fails, show a short failure notice and route to manual refine with the original image.

### Task 5: Verification

**Commands:**
- `node --test --experimental-strip-types /Users/heojaehyuk/Desktop/snag/scripts/camera-controls.test.mjs`
- `npx tsc --noEmit`
- `npm run lint`
- `cd ios && pod install`
- `npx expo run:ios --device`

- [ ] JS tests pass.
- [ ] TypeScript passes.
- [ ] Lint passes.
- [ ] CocoaPods installs the local module.
- [ ] iPhone dev build compiles and installs.
- [ ] On iOS 17+, camera/photo → Auto cutout produces a transparent cutout on the refine screen.
- [ ] Unsupported devices route to manual refine.
