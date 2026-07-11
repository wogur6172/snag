# Visible-Center Text and Edge-Drag Design

## Goal

Create new text Snags in the center of the viewport the user is currently viewing, and let users carry image or text Snags across a larger canvas by holding them near a screen edge.

## Scope

- Custom collection categories use the current horizontal viewport when placing text.
- Social boards use the current horizontal and vertical viewport when placing text.
- Collection edge dragging scrolls left or right.
- Social board edge dragging pans left, right, up, or down.
- Image and text Snags use the same behavior.
- The fixed All category remains unchanged.

## Placement

Each editable surface reports its latest visible viewport to `SnagApp` without causing high-frequency React rendering. The placement snapshot contains the active surface ID, canvas offsets, viewport dimensions, and canvas dimensions.

When the text dialog opens, the app captures the active surface viewport. On submission, a new text Snag is centered inside that captured viewport and clamped inside the canvas. Editing an existing text Snag does not change its position.

## Edge Dragging

A shared pure utility detects whether the finger is inside a 56-point edge zone. Entering that zone starts one gentle, fixed panning speed; moving closer to the edge does not make it faster.

While an unlocked Snag is being dragged:

- Remaining near an edge continues moving the viewport even if the finger is stationary.
- Returning to the safe center stops movement immediately.
- Collection categories move only on the horizontal axis.
- Social boards move on both axes and allow diagonal movement.
- Canvas bounds stop movement at the true edge.
- Entering the trash target disables edge panning so deletion remains predictable.

The viewport delta is also added to the active Snag's drag translation. This keeps the Snag under the finger instead of letting the moving canvas slide it away.

## Architecture

- `src/utils/boards.ts` owns pure viewport-center and edge-pan calculations.
- `CollectionView` owns its horizontal scroll command and reports its current viewport.
- `BoardView` owns its two-axis visual offset and reports its current viewport.
- `TransformableSnag` accepts drag-canvas compensation values so Reanimated can keep the dragged content aligned with the finger.
- `SnagApp` stores viewport snapshots in refs and uses them only when creating text.

No database schema changes are required. Existing Snags keep their saved positions.

## Performance and Safety

- Edge movement uses animation frames and mutable refs/shared values rather than a React state update on every frame.
- Persisted Snag layout is committed once when the drag ends.
- Any running edge-pan animation is cancelled on release, gesture cancellation, room/category change, drawing mode, or unmount.
- Existing surface-swipe navigation and trash behavior retain priority.

## Verification

- Unit tests cover viewport-centered placement, bounds, fixed edge-zone movement, diagonal board movement, and no movement in the safe center.
- Source integration tests verify both surfaces report viewport snapshots and use edge-pan compensation.
- Existing transform, board, social sync, TypeScript, and lint checks must remain green.
- Manual checks cover a scrolled category, a board panned away from the origin, all four board edges, both collection edges, text and image Snags, canvas bounds, and trash deletion.
