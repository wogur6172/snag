# Social Report and Block Design

## Goal

Add the smallest clear safety flow needed for Snag Board's invitation-only user-generated content before App Review.

## Member blocking

- Reuse the existing owner-only kick-and-ban behavior.
- Rename the visible action from `Kick` to `Block from board` so reviewers and users can understand that the member cannot rejoin with the invitation code.
- Keep the existing confirmation dialog and explain that the member is removed and blocked from rejoining.

## Content reporting

- Add `Report` to the long-press action menu for social board image and text Snags owned by another member.
- Show one concise confirmation dialog: `Report this Snag?`.
- On confirmation, insert a `board_reports` row with type `snag`, the content owner, and the Snag ID in `details`.
- Hide the reported Snag immediately for the reporting user.
- On later board loads, fetch the current user's open reports and continue filtering those Snags out.
- Do not offer reporting for the user's own content.
- Do not delete the reported content for other board members. Moderation remains a separate operator action.

## Feedback and failure behavior

- Show a small success message after reporting and provide light success haptics.
- If the cloud request fails, restore the Snag and show a short failure message.
- Existing member reports remain available from the member list.

## Security

- Keep all authorization in RLS: only a current board member may create a report and `reporter_id` must equal `auth.uid()`.
- Add a dedicated text `snag_id` column and a `(board_id, snag_id)` foreign key to reports instead of trusting free-form `details` for filtering.
- The client never supplies another reporter identity.

## Verification

- Unit-test report mapping and service writes.
- Source-test the board action and dialog wiring.
- Apply the migration to Supabase and verify RLS plus a rollback query.
- Run TypeScript, lint, focused tests, and simulator UI checks.
