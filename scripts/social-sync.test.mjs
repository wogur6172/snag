import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  createBoardSnagInsert,
  createBoardSnagUpdate,
  createBoardStrokeInsert,
  createSocialBoardInsert,
  generateSocialInviteCode,
  createSocialProfileId,
  getBoardSnagStoragePath,
  getSupabasePublicConfig,
  isSupabaseConfigured,
  mapBoardDrawingRowsToStrokes,
  mapBoardRoomRowsToRooms,
  mapBoardSnagRowsToSnags,
  normalizeSocialInviteCode,
} from '../src/utils/social-sync.ts';

describe('social sync mapping', () => {
  it('uses Expo statically inlinable environment variable references in production bundles', () => {
    const source = readFileSync(new URL('../src/utils/social-sync.ts', import.meta.url), 'utf8');

    assert.match(source, /process\.env\.EXPO_PUBLIC_SUPABASE_URL/);
    assert.match(source, /process\.env\.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    assert.doesNotMatch(source, /env: SupabasePublicEnv = process\.env/);
  });

  it('detects whether Supabase public config is usable', () => {
    assert.equal(isSupabaseConfigured(getSupabasePublicConfig({})), false);
    assert.equal(
      isSupabaseConfigured(getSupabasePublicConfig({
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
        EXPO_PUBLIC_SUPABASE_URL: 'https://snag.supabase.co',
      })),
      true,
    );
    assert.equal(
      isSupabaseConfigured(getSupabasePublicConfig({
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
        EXPO_PUBLIC_SUPABASE_URL: 'not-a-url',
      })),
      false,
    );
  });

  it('creates stable local profile ids from local seeds', () => {
    assert.equal(createSocialProfileId('device abc'), 'profile-device-abc');
    assert.equal(createSocialProfileId('  '), 'profile-local');
  });

  it('normalizes social invite codes for cloud rooms', () => {
    assert.equal(normalizeSocialInviteCode(' sn-ag 123 '), 'SNAG12');
    assert.equal(normalizeSocialInviteCode(''), '');
    assert.equal(generateSocialInviteCode('tiny'), 'TINY00');
  });

  it('creates board insert payloads with readable codes and safe colors', () => {
    assert.deepEqual(
      createSocialBoardInsert({
        createdAt: 1710000000000,
        currentMemberId: 'profile-jae',
        index: 2,
        inviteCode: ' sn-10-02 ',
      }),
      {
        code: 'SN1002',
        color: '#FFF3A8',
        created_at: '2024-03-09T16:00:00.000Z',
        owner_id: 'profile-jae',
        title: 'Board 3',
        updated_at: '2024-03-09T16:00:00.000Z',
      },
    );
  });

  it('maps board and member rows into Snag rooms', () => {
    assert.deepEqual(
      mapBoardRoomRowsToRooms({
        currentMemberId: 'profile-jae',
        memberRows: [
          { board_id: 'board-1', joined_at: '2024-03-09T16:01:00.000Z', role: 'owner', user_id: 'profile-host' },
          { board_id: 'board-1', joined_at: '2024-03-09T16:02:00.000Z', role: 'member', user_id: 'profile-jae' },
        ],
        profileRows: [
          { display_name: 'Alex', id: 'profile-host' },
          { display_name: 'Jae', id: 'profile-jae' },
        ],
        roomRows: [
          {
            code: 'SN1001',
            color: '#123456',
            created_at: '2024-03-09T16:00:00.000Z',
            id: 'board-1',
            owner_id: 'profile-host',
            title: 'Trip board',
          },
        ],
      }),
      [
        {
          code: 'SN1001',
          color: '#FFD6D6',
          createdAt: 1710000000000,
          id: 'board-1',
          memberIds: ['profile-host', 'profile-jae'],
          memberNames: {
            'profile-host': 'Alex',
            'profile-jae': 'Jae',
          },
          ownerId: 'profile-host',
          title: 'Trip board',
        },
      ],
    );
  });

  it('serializes and maps board snags without changing their visual placement', () => {
    const snag = {
      canvasX: 42,
      canvasY: 84,
      category: 'board-1',
      createdAt: 1710000000000,
      id: 'snag-1',
      imageHeight: 900,
      imageUri: 'file:///tmp/cat.png',
      imageWidth: 600,
      layerIndex: 7,
      rotate: '12deg',
      size: 210,
      title: 'Cat',
      updatedAt: 1710000000100,
    };

    assert.deepEqual(createBoardSnagInsert({
      currentMemberId: 'profile-jae',
      roomId: 'board-1',
      snag,
      storagePath: 'board-1/previews/snag-1.webp',
    }), {
      board_id: 'board-1',
      canvas_x: 42,
      canvas_y: 84,
      created_at: '2024-03-09T16:00:00.000Z',
      id: 'snag-1',
      image_height: 900,
      image_path: 'board-1/previews/snag-1.webp',
      image_width: 600,
      layer_index: 7,
      owner_id: 'profile-jae',
      rotate: '12deg',
      size: 210,
      title: 'Cat',
      updated_at: '2024-03-09T16:00:00.100Z',
    });

    assert.deepEqual(createBoardSnagUpdate(snag, { updatedAt: 1710000000100 }), {
      canvas_x: 42,
      canvas_y: 84,
      image_height: 900,
      image_width: 600,
      layer_index: 7,
      rotate: '12deg',
      size: 210,
      title: 'Cat',
      updated_at: '2024-03-09T16:00:00.100Z',
    });

    assert.deepEqual(mapBoardSnagRowsToSnags({
      publicUrlForPath: (path) => `https://cdn.example/${path}`,
      roomId: 'board-1',
      rows: [{
        board_id: 'board-1',
        canvas_x: 42,
        canvas_y: 84,
        created_at: '2024-03-09T16:00:00.000Z',
        id: 'snag-1',
        image_height: 900,
        image_path: 'board-1/previews/snag-1.webp',
        image_width: 600,
        layer_index: 7,
        rotate: '12deg',
        size: 210,
        title: 'Cat',
        updated_at: '2024-03-09T16:00:00.100Z',
      }],
    }), [{
      canvasX: 42,
      canvasY: 84,
      category: 'board-1',
      createdAt: 1710000000000,
      id: 'snag-1',
      imageHeight: 900,
      imageUri: 'https://cdn.example/board-1/previews/snag-1.webp',
      imageWidth: 600,
      layerIndex: 7,
      rotate: '12deg',
      size: 210,
      title: 'Cat',
      updatedAt: 1710000000100,
    }]);
  });

  it('serializes and maps board text snags without requiring image storage', () => {
    const textSnag = {
      canvasX: 90,
      canvasY: 140,
      category: 'board-1',
      createdAt: 1710000000500,
      id: 'text-snag-1',
      imageHeight: 112,
      imageWidth: 320,
      kind: 'text',
      layerIndex: 3,
      rotate: '-2deg',
      size: 240,
      text: 'hi bestie',
      title: 'hi bestie',
      updatedAt: 1710000000600,
    };

    assert.deepEqual(createBoardSnagInsert({
      currentMemberId: 'profile-jae',
      roomId: 'board-1',
      snag: textSnag,
    }), {
      board_id: 'board-1',
      canvas_x: 90,
      canvas_y: 140,
      created_at: '2024-03-09T16:00:00.500Z',
      id: 'text-snag-1',
      image_height: 112,
      image_path: null,
      image_width: 320,
      kind: 'text',
      layer_index: 3,
      owner_id: 'profile-jae',
      rotate: '-2deg',
      size: 240,
      text_value: 'hi bestie',
      title: 'hi bestie',
      updated_at: '2024-03-09T16:00:00.600Z',
    });

    assert.deepEqual(createBoardSnagUpdate(textSnag, { updatedAt: 1710000000600 }), {
      canvas_x: 90,
      canvas_y: 140,
      image_height: 112,
      image_width: 320,
      kind: 'text',
      layer_index: 3,
      rotate: '-2deg',
      size: 240,
      text_value: 'hi bestie',
      title: 'hi bestie',
      updated_at: '2024-03-09T16:00:00.600Z',
    });

    assert.deepEqual(mapBoardSnagRowsToSnags({
      publicUrlForPath: (path) => `https://cdn.example/${path}`,
      roomId: 'board-1',
      rows: [{
        board_id: 'board-1',
        canvas_x: 90,
        canvas_y: 140,
        created_at: '2024-03-09T16:00:00.500Z',
        id: 'text-snag-1',
        image_height: 112,
        image_path: null,
        image_width: 320,
        kind: 'text',
        layer_index: 3,
        rotate: '-2deg',
        size: 240,
        text_value: 'hi bestie',
        title: 'hi bestie',
        updated_at: '2024-03-09T16:00:00.600Z',
      }],
    }), [{
      canvasX: 90,
      canvasY: 140,
      category: 'board-1',
      createdAt: 1710000000500,
      id: 'text-snag-1',
      imageHeight: 112,
      imageWidth: 320,
      kind: 'text',
      layerIndex: 3,
      rotate: '-2deg',
      size: 240,
      text: 'hi bestie',
      title: 'hi bestie',
      updatedAt: 1710000000600,
    }]);
  });

  it('uses preview webp storage paths for social board snags', () => {
    assert.equal(
      getBoardSnagStoragePath({ roomId: 'room-1', snagId: 'snag-cat' }),
      'room-1/previews/snag-cat.webp',
    );
  });

  it('serializes board drawing strokes for cloud persistence', () => {
    assert.deepEqual(createBoardStrokeInsert({
      currentMemberId: 'profile-jae',
      roomId: 'board-1',
      stroke: {
        color: '#111111',
        id: 'stroke-1',
        points: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
        width: 5,
      },
    }), {
      board_id: 'board-1',
      color: '#111111',
      id: 'stroke-1',
      layer_index: 0,
      owner_id: 'profile-jae',
      points: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
      width: 5,
    });
  });

  it('maps board drawing rows back into drawable strokes', () => {
    assert.deepEqual(mapBoardDrawingRowsToStrokes([
      {
        board_id: 'board-1',
        color: '#111111',
        id: 'stroke-1',
        layer_index: 0,
        owner_id: 'profile-jae',
        points: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
        width: 5,
      },
    ]), [
      {
        color: '#111111',
        id: 'stroke-1',
        points: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
        width: 5,
      },
    ]);
  });
});
