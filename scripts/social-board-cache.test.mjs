import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSocialBoardCacheSnapshot,
  mergeSocialBoardSnapshotWithLocalCache,
  parseSocialBoardCacheSnapshot,
  SOCIAL_BOARD_CACHE_VERSION,
} from '../src/utils/social-board-cache.ts';

describe('social board cache', () => {
  it('round-trips the last social board snapshot for instant lobby rendering', () => {
    const snapshot = createSocialBoardCacheSnapshot({
      drawingsByRoomId: {
        'board-1': [{
          color: '#171717',
          id: 'stroke-1',
          points: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
          width: 5,
        }],
      },
      rooms: [{
        code: 'SN0001',
        color: '#BFEAFF',
        createdAt: 1710000000000,
        id: 'board-1',
        memberIds: ['profile-jae'],
        memberNames: {
          'profile-jae': 'Jae',
        },
        ownerId: 'profile-jae',
        title: 'Board 1',
      }],
      savedAt: 1710000000500,
      snagsByRoomId: {
        'board-1': [{
          canvasX: 12,
          canvasY: 34,
          category: 'board-1',
          createdAt: 1710000000100,
          id: 'snag-1',
          imageHeight: 640,
          imageUri: 'https://example.com/snag.webp',
          imageWidth: 427,
          layerIndex: 2,
          rotate: '0deg',
          size: 180,
          title: 'Snag',
        }],
      },
    });

    assert.equal(snapshot.version, SOCIAL_BOARD_CACHE_VERSION);
    assert.deepEqual(snapshot.rooms[0].memberNames, {
      'profile-jae': 'Jae',
    });
    assert.deepEqual(parseSocialBoardCacheSnapshot(JSON.stringify(snapshot)), {
      drawingsByRoomId: snapshot.drawingsByRoomId,
      rooms: snapshot.rooms,
      savedAt: 1710000000500,
      snagsByRoomId: snapshot.snagsByRoomId,
    });
  });

  it('keeps transformed image snags in the cache with their latest board layout', () => {
    const snapshot = createSocialBoardCacheSnapshot({
      drawingsByRoomId: {},
      rooms: [{
        code: 'SN0001',
        color: '#BFEAFF',
        createdAt: 1710000000000,
        id: 'board-1',
        memberIds: ['profile-jae'],
        ownerId: 'profile-jae',
        title: 'Board 1',
      }],
      savedAt: 1710000000999,
      snagsByRoomId: {
        'board-1': [{
          canvasX: 84.25,
          canvasY: 132.75,
          category: 'board-1',
          createdAt: 1710000000100,
          id: 'snag-1',
          imageHeight: 900,
          imageUri: 'https://example.com/snag.webp',
          imageWidth: 600,
          layerIndex: 8,
          rotate: '0.375rad',
          size: 288.5,
          title: 'Snag',
        }],
      },
    });

    assert.deepEqual(parseSocialBoardCacheSnapshot(JSON.stringify(snapshot))?.snagsByRoomId['board-1']?.[0], {
      canvasX: 84.25,
      canvasY: 132.75,
      category: 'board-1',
      createdAt: 1710000000100,
      id: 'snag-1',
      imageHeight: 900,
      imageUri: 'https://example.com/snag.webp',
      imageWidth: 600,
      layerIndex: 8,
      rotate: '0.375rad',
      size: 288.5,
      title: 'Snag',
    });
  });

  it('keeps newer cached board snag layouts over older cloud refresh rows', () => {
    const cloudSnapshot = {
      drawingsByRoomId: {},
      rooms: [{
        code: 'SN0001',
        color: '#BFEAFF',
        createdAt: 1710000000000,
        id: 'board-1',
        memberIds: ['profile-jae'],
        ownerId: 'profile-jae',
        title: 'Board 1',
      }],
      savedAt: 1710000003000,
      snagsByRoomId: {
        'board-1': [{
          canvasX: 20,
          canvasY: 30,
          category: 'board-1',
          createdAt: 1710000000100,
          id: 'snag-1',
          imageHeight: 900,
          imageUri: 'https://example.com/old.webp',
          imageWidth: 600,
          layerIndex: 2,
          rotate: '0deg',
          size: 180,
          title: 'Snag',
          updatedAt: 1710000000500,
        }],
      },
    };
    const localCache = createSocialBoardCacheSnapshot({
      drawingsByRoomId: {},
      rooms: cloudSnapshot.rooms,
      savedAt: 1710000002000,
      snagsByRoomId: {
        'board-1': [{
          ...cloudSnapshot.snagsByRoomId['board-1'][0],
          canvasX: 84.25,
          canvasY: 132.75,
          layerIndex: 8,
          rotate: '0.375rad',
          size: 288.5,
          updatedAt: 1710000002000,
        }],
      },
    });

    assert.deepEqual(
      mergeSocialBoardSnapshotWithLocalCache({ cloudSnapshot, localCache }).snagsByRoomId['board-1'][0],
      {
        ...cloudSnapshot.snagsByRoomId['board-1'][0],
        canvasX: 84.25,
        canvasY: 132.75,
        layerIndex: 8,
        rotate: '0.375rad',
        size: 288.5,
        updatedAt: 1710000002000,
      },
    );
  });

  it('keeps local-only pending board snags while cloud upload catches up', () => {
    const cloudSnapshot = {
      drawingsByRoomId: {},
      rooms: [{
        code: 'SN0001',
        color: '#BFEAFF',
        createdAt: 1710000000000,
        id: 'board-1',
        memberIds: ['profile-jae'],
        ownerId: 'profile-jae',
        title: 'Board 1',
      }],
      snagsByRoomId: {
        'board-1': [],
      },
    };
    const localCache = createSocialBoardCacheSnapshot({
      drawingsByRoomId: {},
      rooms: cloudSnapshot.rooms,
      savedAt: 1710000002000,
      snagsByRoomId: {
        'board-1': [{
          canvasX: 144,
          canvasY: 188,
          category: 'board-1',
          createdAt: 1710000001800,
          id: 'snag-pending',
          imageHeight: 900,
          imageUri: 'file:///pending.webp',
          imageWidth: 600,
          layerIndex: 4,
          pendingSync: true,
          rotate: '0deg',
          size: 180,
          title: 'Snag',
          updatedAt: 1710000002000,
        }],
      },
    });

    assert.deepEqual(
      mergeSocialBoardSnapshotWithLocalCache({ cloudSnapshot, localCache }).snagsByRoomId['board-1'].map((snag) => snag.id),
      ['snag-pending'],
    );
  });

  it('ignores missing or corrupt social board cache data', () => {
    assert.equal(parseSocialBoardCacheSnapshot(null), null);
    assert.equal(parseSocialBoardCacheSnapshot('{bad json'), null);
    assert.equal(parseSocialBoardCacheSnapshot({ version: 999, rooms: [] }), null);
  });
});
