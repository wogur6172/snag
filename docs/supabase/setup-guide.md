# Snag Social Supabase Setup Guide

This is the part the developer cannot fully do from code. It needs your Supabase account and project dashboard.

## 1. Supabase Project

Created project:
- Name: `Snag`
- Project ref: `ozmkeaojnqwmerxwlpur`
- Region: `us-east-1`
- URL: `https://ozmkeaojnqwmerxwlpur.supabase.co`

Never put the `service_role` key in the app. That key can bypass security rules.

## 2. Enable Anonymous Sign-Ins

Snag uses anonymous accounts first so users do not need signup before joining a board.

1. Open Authentication settings in Supabase.
2. Find Anonymous sign-ins.
3. Enable it.

Later, Apple Sign-In can be linked to the anonymous user so people can recover boards across devices.

## 3. Create The Database Tables

Done through Codex on `2026-06-29`.

The schema enables RLS on every public table used by Social.

## 4. Create The Storage Bucket

Done through Codex on `2026-06-29`.

The app uploads board Snag images to this private bucket. When a board member opens a room, the app asks Supabase for a short-lived signed URL.

## 5. Add Local Environment Values

Created `.env.local` in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://ozmkeaojnqwmerxwlpur.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_vqCB-M_jH4JdCLfjJl4-tQ_IJ0YVUOG
```

Then restart Expo with a cleared cache:

```bash
npx expo start --dev-client -c
```

## 6. What Is Cloud And What Is Still Local

Cloud:
- Social board rooms
- Room membership
- Board Snag images
- Board Snag position, size, rotation, and layer
- Board drawings

Local:
- Personal collection categories
- Personal All collection
- Personal drawings
- Camera/refine flow

## 7. Cost And Safety Guardrails

The current app only uploads Social board content, not every personal collection item.

Recommended MVP limits:
- 2 created boards per user
- 3 joined boards per user, including boards they created
- 8 members per board
- 60 Snags per board
- Upload only compressed Social board preview images.
- Delete Social board Storage files when board Snags or whole boards are deleted.
- No public feed
- No realtime sync until the non-realtime version feels good

Current image safety behavior:
- Social board image uploads use WebP preview files under `board-snags/<board-id>/previews/*.webp`.
- If preview generation fails, the app skips the cloud image upload instead of uploading the original PNG.
- Cleanup also tries the old legacy PNG path so earlier development uploads can be removed when their Snag is deleted.

## 8. Security Notes

- Never expose Supabase `service_role` in the app.
- Anonymous users still count as authenticated users in Supabase, so RLS policies use `auth.uid()`.
- The Storage bucket should remain private.
- Board images are shared with board members, not your whole app user base.
- If a board owner leaves, owner is transferred before the membership row is removed.
