# Settings Contact Links And App Share URL

## Goal

Make Snag's contact and social accounts easy to reach from the existing Settings overlay, and replace the placeholder Board share URL with the app's permanent App Store URL.

## Settings Experience

- Add three compact contact rows below the profile area and above Social limits.
- Show `Email`, `Instagram`, and `TikTok` labels with these destinations:
  - `snagboardapp@gmail.com`
  - `@snag_board` on Instagram
  - `@snag_board` on TikTok
- Keep the current dark liquid-glass visual language.
- Each row is one accessible button with a clear accessibility label and a small outward-link indicator.
- Email opens the device's mail composer through a `mailto:` URL.
- Instagram and TikTok use normal HTTPS profile URLs so iOS can open the installed app when supported and otherwise fall back to the browser.
- A failed link attempt must not crash or close Settings; it should log a concise warning.

## Board Share URL

- Replace the unowned placeholder `https://snag.app/download` with the permanent App Store product URL:
  `https://apps.apple.com/app/id6789531333`
- Keep the existing short English share message.
- The URL may show an unavailable page before public release, but it becomes the live download page without another app update once Apple publishes the app.

## Code Boundaries

- Store public contact destinations in a small utility module rather than scattering literal URLs through the UI.
- Keep Board share-copy construction in `src/utils/boards.ts`.
- Keep Settings rendering and press handling in the existing Settings overlay.
- Do not add a new native dependency; the project already includes Expo Linking.

## Testing

- Add utility tests that pin the email and social destinations.
- Update the Board share-copy test so the permanent App Store URL is required.
- Add a source-level UI test confirming all three contact rows are rendered and use the shared link-opening helper.
- Run focused tests first, followed by TypeScript, lint, and the complete script test suite.
