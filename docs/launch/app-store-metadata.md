# Snag Board App Store Metadata

This file is the copy-and-paste base for the first US-focused App Store Connect setup.

## App Identity

- App Store name: `Snag Board`
- On-device app name: `Snag`
- Bundle ID: `app.getsnag.snag`
- SKU: `snag-ios-001`
- Primary language: `English (U.S.)`
- Primary category: `Photo & Video`
- Secondary category: `Social Networking`

## Subtitle

```text
Collect real-life stickers
```

Why: short, concrete, and closer to the first-time user feeling than "background remover."

## Promotional Text

```text
Turn pets, desk things, food, signs, and friend moments into collectible stickers you can place in your own collection or on shared boards.
```

## Description

```text
Snag turns the things around you into collectible stickers.

Take a picture of a pet, object, meal, sign, desk item, or friend moment. Snag cuts it out, lets you clean it up, and drops it into your collection. Create categories for your own little world, or make a shared board where friends can add moments together.

What you can do:
- Capture or choose photos
- Cut out the subject
- Manually refine edges
- Place, resize, and rotate Snags
- Organize categories
- Add text and drawings
- Create shared boards with invite codes
- Save cutouts to Photos

Snag is for collecting tiny real-life things, inside jokes, pets, comfort objects, and whatever else catches your eye.
```

## Keywords

Apple's keyword field is limited, so keep this comma-separated and avoid repeating words already in the app name/subtitle.

```text
stickers,cutout,collection,camera,photo,pet,board,friends,scrapbook,object
```

## Screenshot Plan

Use iPhone screenshots with real-looking content, not empty mockups.

1. Camera to Snag moment  
   Caption idea: `Snap something nearby`

2. Personal collection  
   Caption idea: `Collect your little world`

3. Manual refine  
   Caption idea: `Clean up the edges`

4. Shared board  
   Caption idea: `Make a board together`

5. Save/share cutout  
   Caption idea: `Save it as a sticker`

## Privacy Policy URL

Temporary GitHub Pages target:

```text
https://wogur6172.github.io/snag/privacy/
```

Before submission, publish the final policy from `docs/legal/privacy-policy-draft.md` at this URL or replace the URL with the real support site.

## Support URL

Temporary GitHub Pages target:

```text
https://wogur6172.github.io/snag/support/
```

This page can be very simple for the first release: app name, contact email, privacy link, and a short note that Snag is iOS-first.

Support email:

```text
wogur6172@gmail.com
```

## App Review Notes

```text
Snag is a creative collection app. Users can capture or select an image, cut out the subject, and place it into a personal collection. Users can also create invite-code-based shared boards with friends.

The app does not require email/password signup. It uses anonymous app identity for shared boards.

Review path:
1. Open Snag.
2. Tap the camera button.
3. Allow camera permission.
4. Capture an object or choose an image from the photo library.
5. Confirm the cutout.
6. Place it into the collection.
7. Open Social.
8. Create a board or join with an invite code.
9. Add a Snag, drawing, or text to the board.

Social safety features:
- Board owners can remove members.
- Board ownership can transfer.
- Users can leave boards.
- Users can delete board content.
- Support contact is provided in the app metadata and privacy policy.
```

## App Privacy Notes

Likely App Store Connect data disclosures to review:

- User Content: photos, cutout images, board drawings, and board text when shared boards are used.
- Identifiers: anonymous Supabase user ID for shared boards.
- Diagnostics: only if Apple/TestFlight crash or feedback data is used.
- Contact Info: not collected unless a support email flow is added later.

Personal collection content is intended to stay on-device unless the user saves, shares, or adds content to a shared board.
