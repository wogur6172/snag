import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSnagLibrarySnapshot,
  getDefaultSnagLibraryState,
  getProfileDisplayName,
  getStoredSnagImageName,
  normalizeProfileDisplayName,
  parseSnagLibrarySnapshot,
} from '../src/utils/snag-library.ts';
import * as snagLibrary from '../src/utils/snag-library.ts';

describe('snag library persistence data', () => {
  it('rebases stored image URIs after the iOS app container changes', () => {
    assert.equal(typeof snagLibrary.resolveStoredSnagImageUri, 'function');
    assert.equal(
      snagLibrary.resolveStoredSnagImageUri({
        imageUri: 'file:///var/mobile/Containers/Data/Application/OLD/Documents/snag-library/images/snag-1.png',
        storedImageExists: true,
        storedImageUri: 'file:///var/mobile/Containers/Data/Application/NEW/Documents/snag-library/images/snag-1.png',
      }),
      'file:///var/mobile/Containers/Data/Application/NEW/Documents/snag-library/images/snag-1.png',
    );
  });

  it('starts with an empty All library', () => {
    const state = getDefaultSnagLibraryState();

    assert.deepEqual(state.categories.map((category) => category.id), ['category-1', 'all']);
    assert.equal(state.selectedCategoryId, 'category-1');
    assert.deepEqual(state.categoryGridPreferences, {});
    assert.deepEqual(state.settings, { profileName: 'You' });
    assert.equal(state.snagCount, 0);
    assert.deepEqual(state.snags, []);
  });

  it('round-trips snags, drawings, categories, settings, selection, and next count', () => {
    const snapshot = createSnagLibrarySnapshot({
      categories: [
        { id: 'all', title: 'All' },
        { background: 'shelves', backgroundStrength: 0.84, color: '#BFEAFF', id: 'category-1', title: 'Desk' },
      ],
      categoryGridPreferences: {
        'category-1': false,
        all: true,
      },
      drawingsByCategoryId: {
        'category-1': [
          {
            color: '#171717',
            id: 'stroke-1',
            points: [
              { x: 12, y: 20 },
              { x: 18, y: 28 },
            ],
            width: 5,
          },
        ],
      },
      settings: {
        profileName: '  Super Long Snag Friend Name  ',
      },
      selectedCategoryId: 'category-1',
      snagCount: 4,
      snags: [
        {
          category: 'category-1',
          canvasX: 250,
          canvasY: 220,
          createdAt: 1710000000000,
          excludeFromAll: true,
          id: 'snag-1710000000000-0',
          imageHeight: 900,
          imageUri: 'file:///snag.png',
          imageWidth: 1200,
          originSnagId: 'snag-root',
          rotate: '-4deg',
          size: 142,
          title: 'Snag',
        },
      ],
    });

    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.selectedCategoryId, 'category-1');
    assert.equal(snapshot.snagCount, 4);
    assert.equal(snapshot.categories.find((category) => category.id === 'category-1')?.background, 'shelves');
    assert.equal(snapshot.categories.find((category) => category.id === 'category-1')?.backgroundStrength, 0.84);
    assert.deepEqual(snapshot.categoryGridPreferences, {
      'category-1': false,
      all: true,
    });
    assert.deepEqual(snapshot.settings, {
      profileName: 'Super Long Snag',
    });
    assert.deepEqual(snapshot.drawingsByCategoryId['category-1'], [
      {
        color: '#171717',
        id: 'stroke-1',
        points: [
          { x: 12, y: 20 },
          { x: 18, y: 28 },
        ],
        width: 5,
      },
    ]);
    assert.equal(snapshot.snags[0].excludeFromAll, true);
    assert.equal(snapshot.snags[0].imageUri, 'file:///snag.png');
    assert.equal(snapshot.snags[0].originSnagId, 'snag-root');
    assert.deepEqual(parseSnagLibrarySnapshot(JSON.stringify(snapshot)), {
      categories: snapshot.categories,
      categoryGridPreferences: snapshot.categoryGridPreferences,
      drawingsByCategoryId: snapshot.drawingsByCategoryId,
      settings: snapshot.settings,
      selectedCategoryId: 'category-1',
      snagCount: 4,
      snags: snapshot.snags,
    });
  });

  it('falls back safely when the saved library is missing or corrupt', () => {
    assert.deepEqual(parseSnagLibrarySnapshot('not json'), getDefaultSnagLibraryState());
    assert.deepEqual(parseSnagLibrarySnapshot(JSON.stringify({ version: 999 })), getDefaultSnagLibraryState());
    assert.deepEqual(parseSnagLibrarySnapshot(null), getDefaultSnagLibraryState());
  });

  it('keeps All selected when the saved category no longer exists', () => {
    const state = parseSnagLibrarySnapshot(JSON.stringify({
      version: 1,
      categories: [{ id: 'all', title: 'All' }],
      selectedCategoryId: 'missing',
      snagCount: 1,
      snags: [],
    }));

    assert.equal(state.selectedCategoryId, 'category-1');
    assert.deepEqual(state.categories.map((category) => category.id), ['category-1', 'all']);
  });

  it('creates stable local image names from snag ids and source uris', () => {
    assert.equal(getStoredSnagImageName({ id: 'snag-1/2', imageUri: 'file:///tmp/cat.PNG' }), 'snag-1-2.png');
    assert.equal(getStoredSnagImageName({ id: 'snag-3', imageUri: 'ph://asset' }), 'snag-3.png');
  });

  it('normalizes profile display names for compact social UI', () => {
    assert.equal(normalizeProfileDisplayName('  Jae Hyuk  '), 'Jae Hyuk');
    assert.equal(normalizeProfileDisplayName(''), 'You');
    assert.equal(normalizeProfileDisplayName('abcdefghijklmnopq'), 'abcdefghijklmnop');
    assert.equal(getProfileDisplayName({ profileName: 'Snag Maker' }), 'Snag Maker');
    assert.equal(getProfileDisplayName(undefined), 'You');
  });

  it('drops old saved language preferences while keeping the profile name', () => {
    const snapshot = createSnagLibrarySnapshot({
      ...getDefaultSnagLibraryState(),
      settings: {
        profileName: 'Jae',
      },
    });
    const parsed = parseSnagLibrarySnapshot(JSON.stringify({
      ...snapshot,
      settings: {
        language: 'system',
        profileName: 'Jae',
      },
    }));

    assert.deepEqual(snapshot.settings, { profileName: 'Jae' });
    assert.deepEqual(parsed.settings, { profileName: 'Jae' });
  });
});
