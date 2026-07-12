# Capture Recognition Feedback Design

## Goal

Make Snag's camera flow feel immediate and continuous even while Expo Camera, Apple Vision, and manual-mask export are doing asynchronous work.

The user should perceive one clear sequence:

1. Press the shutter.
2. Feel and see that the photo was captured.
3. See the captured frame while Snag finds the subject.
4. Refine the result without a blank or frozen transition.
5. See clear feedback while the refined result is finalized.

## Current Problem

- `takePictureAsync` can take a noticeable moment before returning a file URI. During that time the live camera appears frozen without feedback.
- Cutout support detection happens before the processing screen is committed.
- The processing screen shows only a static image, so Apple Vision work looks like a stalled app.
- Saving a manual refinement disables the save button, but otherwise leaves the screen unchanged. Large images and masks can therefore look unresponsive.

## Interaction Design

### Shutter

- Keep the camera silent.
- On press, immediately compress the shutter control, play one light impact haptic, and show a very short white shutter flash.
- Prevent duplicate captures until the flow has moved forward.
- As soon as Expo Camera returns the photo URI, replace the live preview with the captured frame at full-screen scale.

### Recognition

- Keep the captured frame visible instead of showing a blank loading screen.
- Add a restrained dark veil so white status content remains readable without hiding the photo.
- Animate one soft vertical light sweep through the frame. This is an indeterminate activity cue, not a claim that the sweep represents actual Vision progress.
- Show the concise status `Finding your Snag...` in a consistent bottom position.
- Keep the recognition presentation visible for at least about 600 ms to prevent a flash when Apple Vision finishes very quickly. Never delay completion beyond that minimum.
- When the result is ready, play one subtle success haptic and crossfade into the refine screen.
- If automatic cutout is disabled or unsupported, use the same short transition with `Preparing your canvas...`, then open manual refine.
- If automatic cutout fails, open manual refine and keep the existing temporary failure notice.

### Finalizing Manual Refine

- On `Snag` press, keep the current edited image visible and disable editing.
- Present the same veil and light-sweep language over the editor with `Finishing your Snag...`.
- Commit this visual state before starting manual mask rendering and image prefetching.
- On success, continue to the existing Snagged flow.
- On failure, remove the overlay, restore editing, and show the existing retry notice without losing edits.

## Motion And Visual Rules

- Use native-driven opacity and transform animation so the feedback continues even when JavaScript is busy.
- Use white, black, and translucent glass only; do not introduce a new accent color or gradient.
- Avoid fake percentages and determinate progress bars because Vision and image export duration are not measurable here.
- Avoid subject-outline tracing because the native module does not expose intermediate contour data.
- Respect reduced-motion settings by replacing moving sweeps with a gentle opacity pulse or static activity state.

## State Model

The existing capture stages remain `live`, `processing`, and `refine`. A separate transient activity state describes why work is happening:

- `idle`
- `capturing`
- `recognizing`
- `preparing-manual`
- `finalizing`

This keeps navigation state separate from feedback state and prevents save feedback from accidentally remounting the editor.

## Error And Cancellation Behavior

- Camera permission and camera-unavailable behavior remain unchanged.
- Camera capture failure returns to the live camera and clears the shutter feedback.
- Vision failure continues to manual refine.
- Manual export failure stays in refine with the user's mask points intact.
- Retake remains unavailable only while final export is actively running.

## Verification

- Unit-test activity labels and minimum recognition timing as pure helpers.
- Source-test that the captured frame is committed before support detection or Vision work begins.
- Source-test that finalizing feedback is committed before manual mask export.
- Run lint and the existing test suite.
- Verify on a physical iPhone because Simulator cannot validate the real camera capture pause or Apple Vision timing.
