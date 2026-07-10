# Snag Privacy Policy Draft

This is a planning draft, not legal advice. Before App Store release, publish a final privacy policy at a public URL and review it against the final app behavior.

## Privacy Policy For Snag

Effective date: July 1, 2026

Snag is an iPhone app that lets you capture or choose photos, cut out subjects, organize them into collections, and place them on shared boards with friends.

## Information We Collect

### Photos And User Content

Snag may process photos or images that you capture or select in the app.

Personal collections are intended to stay on your device unless you choose to use a sharing feature. When you add content to a shared board, that board content may be uploaded so other invited board members can see it.

Shared board content may include:

- Cutout images.
- Text you add to a board.
- Drawings you add to a board.
- Board names.
- Category or board display settings.

### Profile Information

You may choose a nickname. Your nickname can be shown to people in shared boards you join.

### Social Board Information

When you use shared boards, Snag may store:

- Board IDs and invite codes.
- Board membership.
- Board owner and member roles.
- Board content and placement data.
- Member removal or board safety records.
- Reports or moderation-related records if reporting is used.

### Device Permissions

Snag may ask for access to:

- Camera, so you can capture a Snag.
- Photo library, so you can choose an image.

You can change these permissions in iOS Settings.

### Diagnostics And Beta Feedback

If you test Snag through TestFlight, Apple may provide crash reports, screenshots, or feedback you choose to send through TestFlight.

Snag does not currently rely on third-party advertising tracking.

## How We Use Information

We use information to:

- Provide the core capture, cutout, collection, and board features.
- Sync shared boards between invited members.
- Show nicknames and member lists in shared boards.
- Improve app reliability and fix bugs.
- Respond to safety, support, or deletion requests.

## How Sharing Works

Personal collections are private to your device unless you use a sharing feature.

Shared board content is visible to people who have joined that board. Be careful about adding photos, drawings, or text that you do not want other board members to see.

## Service Providers

Snag may use third-party services to operate the app:

- Supabase, for shared board database, storage, and anonymous app identity.
- Apple TestFlight and App Store services, for beta distribution, crash reports, and tester feedback.
- Expo Application Services, for building and submitting app binaries during development and release.

These providers may process information according to their own policies and the way Snag is configured.

## Data Retention

Local collection data stays on your device until you delete it in the app or delete the app.

Shared board data may remain stored while the board exists or while needed for app functionality, safety, abuse prevention, or support.

If a board is deleted, its shared content should no longer be available in the app. Some backup, log, or storage records may take additional time to be removed.

## Your Choices

You can:

- Delete Snags from your collection.
- Delete or leave shared boards when the app allows it.
- Change your nickname.
- Revoke camera or photo permissions in iOS Settings.
- Contact support to request help with deletion or privacy questions.

Support contact:

```text
snagboardapp@gmail.com
```

## Children

Snag is not intended for children under 13. If you believe a child has provided personal information through Snag, contact support so it can be reviewed.

## Changes

We may update this Privacy Policy as Snag changes. The effective date will be updated when the policy changes.

## Contact

For privacy or support questions, contact:

```text
snagboardapp@gmail.com
```

## App Store Privacy Notes To Prepare

Likely data types to review in App Store Connect:

- User Content: photos or other user-generated content used for shared boards.
- User Content: drawings or text added to boards.
- Identifiers: anonymous app user ID if Supabase Auth creates one.
- Usage Data or Diagnostics: only if analytics, crash reporting, or performance monitoring is added beyond Apple/TestFlight.
- Contact Info: only if the app later collects email, phone number, or account login.

If data is processed only on the device and is not transmitted off-device for longer-term access, Apple may treat it differently from data collected by the developer. Shared boards do transmit and store content, so shared board data should be reviewed carefully.

## Sources

- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple TestFlight: https://developer.apple.com/testflight/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
