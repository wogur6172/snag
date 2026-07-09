# Snag Beta Launch Checklist

This checklist is for getting Snag ready for a fast iOS beta launch in the United States.

## Current Product Assumptions

- iOS first.
- Expo React Native, Expo SDK 56, Expo Dev Build during development.
- Core loop: capture or pick a photo, cut out the subject, refine it, then place it into a collection or shared board.
- Social boards are powered by Supabase.
- Local collections should feel fast even without a server.
- No paid ads, subscriptions, or App Store release yet.

## What We Can Do Before Apple Developer Setup

- Finish first-install QA with a clean app state.
- Test camera permission, photo permission, and first Snag flow on a real iPhone.
- Test the empty collection guide: nickname hint, camera hint, swipe-to-social hint.
- Test social board basics: create board, join by invite code, rename board, leave board, delete board, owner transfer, member list.
- Prepare App Store/TestFlight text.
- Prepare privacy policy draft.
- Prepare App Store metadata from `docs/launch/app-store-metadata.md`.
- Prepare short-form marketing scripts.
- Decide the first public beta promise: "Turn real life into collectible stickers."

## What Requires Apple Developer/App Store Connect

- Final bundle identifier registration.
- App Store Connect app record.
- TestFlight build upload.
- External TestFlight beta review.
- Public TestFlight link.
- Privacy Policy URL on a public website.
- App screenshots, app icon, category, age rating, and support URL.

## Bundle ID Decision

Current bundle ID:

```text
app.getsnag.snag
```

This is the recommended final bundle ID for TestFlight and App Store Connect.

Keep it stable once the App Store Connect app record is created. Changing bundle IDs later creates a different app identity.

Owning a domain is still useful for support/privacy pages, but the app can start with a GitHub Pages privacy/support URL if needed.

## Beta Build Flow

1. Pick the final bundle ID.
2. Update Expo app config with final app name, bundle ID, icon, splash settings, camera/photo permission text, and iOS version.
3. Create the app in App Store Connect.
4. Create a production iOS build.
5. Submit the build to App Store Connect/TestFlight.
6. Test internally first.
7. Add an external tester group.
8. Submit the first external beta build for Apple's TestFlight beta review.
9. After approval, create a public TestFlight link and use it in social posts.

## Manual QA Before First TestFlight

- [ ] Social board image uploads use compressed WebP previews, not original PNGs.
- [ ] Deleting a board Snag removes its Storage file.
- [ ] Deleting a board removes its board Snag Storage files.
- [ ] Fresh install opens directly into Category 1 without flashing other categories.
- [ ] Camera permission prompt appears clearly.
- [ ] Photo picker works.
- [ ] Front camera captures correctly.
- [ ] Back camera captures correctly.
- [ ] Auto cutout on a real iPhone produces a usable result.
- [ ] Manual refine can erase without severe lag.
- [ ] Tapping Snag places the new item into the current category.
- [ ] New Snag can be moved immediately.
- [ ] Existing Snags can be moved after the short press-hold state.
- [ ] Copy, Paste, and Copied UI appears above stickers.
- [ ] All category stays fixed-grid and does not allow Paste.
- [ ] Category creation, rename, color, delete work.
- [ ] Board creation works.
- [ ] Joining a board by code works.
- [ ] Wrong invite code shows a friendly "room not found" state.
- [ ] Kicked users see the same "room not found" style response.
- [ ] Board member count appears on the social home list.
- [ ] Board member nickname uses the user profile nickname, not "Host."
- [ ] Quiet social refresh updates remote board changes without requiring restart.
- [ ] Board loading feels acceptable with several stickers.
- [ ] Offline or weak network does not crash the app.
- [ ] Settings panel opens and closes from the Snag logo and X.
- [ ] Privacy-sensitive text is not misleading.

## App Store Review Risks To Watch

- User-generated content: shared boards let people upload photos, text, and drawings. Apple expects reporting, moderation/contact paths, and abusive-user controls for UGC/social features.
- Privacy policy: Apple requires a publicly accessible privacy policy URL.
- Metadata accuracy: screenshots and description must match the actual app.
- Demo access: if review needs a social board, include a sample invite code in review notes.
- Backend availability: Supabase must be live during review.
- Content deletion: users need a reasonable way to delete their own board content or ask for help.

## Beta Success Signals

- A tester makes their first Snag within 60 seconds.
- A tester joins or creates a board within the first session.
- A tester invites one friend.
- A tester says the collection feels fun, not just useful.
- Fewer than 10% of testers get stuck at camera permission or board join.

## Sources

- Expo SDK 56 reference: https://docs.expo.dev/versions/v56.0.0/
- Expo EAS Submit: https://docs.expo.dev/submit/introduction/
- Apple TestFlight: https://developer.apple.com/testflight/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
