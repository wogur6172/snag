# All Library Integrity Design

## Goal

Treat `All` as the permanent master library and custom categories as placements of those masters.

## Identity

- Image Snags that share an `originSnagId` chain represent one collected master.
- `All` renders exactly one representative for each master identity.
- Existing duplicate records are collapsed only in the derived `All` view; custom-category placements remain independent.
- If a legacy master record is missing, one surviving category placement becomes the `All` representative.
- Text Snags remain category-only and do not enter `All`.

## Deletion

- Deleting a Snag from a custom category removes only that placement.
- If the deleted placement is the only record currently representing its master, it is converted into an `All`-only master instead of being removed.
- Deleting a category removes its placements but preserves one `All` master for every collected image.
- Deleting from `All` removes the complete master family, including every category placement regardless of size or rotation.
- Long-pressing an `All` item adds a red `Delete` action. It opens the same warning dialog and uses the same complete-family deletion path as Select mode.

## Swipe Reliability

- Vertical-dominant movement belongs to the category pager.
- The `All` to Social transition captures only a clearly horizontal gesture.
- Existing deliberate diagonal horizontal swipes remain supported.

## Compatibility

- No destructive storage migration is required.
- The derived `All` projection repairs old duplicate and missing-master states at read time.
- Subsequent custom-category deletions preserve the repaired master invariant.

## Verification

- One `All` representative for an original and multiple copies.
- `All` survives removal of the original category item and then every category placement.
- `All` deletion removes every member of the master family.
- Legacy copies with a missing parent still produce one `All` representative.
- Text Snags remain excluded.
- Vertical-dominant gestures do not activate the Social transition.
- Long-press `Delete` uses the existing destructive confirmation dialog.
