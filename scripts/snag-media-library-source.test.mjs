import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const appConfig = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const packageConfig = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const helperSource = readFileSync(new URL('../src/native/snag-media-library.ts', import.meta.url), 'utf8');
const iosInfoPlist = readFileSync(new URL('../ios/snag/Info.plist', import.meta.url), 'utf8');

describe('snag media library saving', () => {
  it('depends on the SDK 56 media library package', () => {
    assert.equal(packageConfig.dependencies['expo-media-library'], '~56.0.9');
  });

  it('configures write-only photo saving permission copy for iOS', () => {
    const mediaLibraryPlugin = appConfig.expo.plugins.find((plugin) => (
      Array.isArray(plugin) && plugin[0] === 'expo-media-library'
    ));

    assert.ok(mediaLibraryPlugin);
    assert.equal(
      appConfig.expo.ios.infoPlist.NSPhotoLibraryAddUsageDescription,
      'Allow Snag to save transparent cutouts to your photo library.',
    );
    assert.equal(
      mediaLibraryPlugin[1].savePhotosPermission,
      'Allow Snag to save transparent cutouts to your photo library.',
    );
    assert.match(iosInfoPlist, /NSPhotoLibraryAddUsageDescription/);
    assert.match(iosInfoPlist, /Allow Snag to save transparent cutouts to your photo library\./);
  });

  it('saves local or downloaded transparent Snag images with write-only permission', () => {
    assert.match(helperSource, /await import\('expo-media-library'\)/);
    assert.match(helperSource, /requestPermissionsAsync\(true\)/);
    assert.match(helperSource, /Asset\.create\(localUri\)/);
    assert.match(helperSource, /File\.downloadFileAsync/);
    assert.doesNotMatch(helperSource, /saveToLibraryAsync/);
  });
});
