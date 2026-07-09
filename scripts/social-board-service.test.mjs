import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSocialBoardRoomAsync,
  getBoardSnagDisplayUrlsAsync,
  joinSocialBoardRoomAsync,
  kickSocialBoardMemberAsync,
  loadJoinedSocialBoardsAsync,
  loadOrCreateSocialProfileAsync,
  reportSocialBoardMemberAsync,
  transferSocialBoardOwnerAsync,
  deleteSocialBoardRoomAsync,
  deleteSocialBoardSnagAsync,
  uploadAndSaveBoardSnagAsync,
} from '../src/services/social-board-service.ts';
import { LOCAL_BOARD_MEMBER_ID } from '../src/utils/boards.ts';
import { readFileSync } from 'node:fs';

describe('social board service fallback', () => {
  it('does not require native AsyncStorage in the existing dev build', () => {
    const source = readFileSync(new URL('../src/services/supabase-client.ts', import.meta.url), 'utf8');

    assert.equal(source.includes('@react-native-async-storage/async-storage'), false);
  });

  it('keeps the native board preview import behind an explicit rebuilt-client opt-in', () => {
    const source = readFileSync(new URL('../src/services/social-board-service.ts', import.meta.url), 'utf8');
    const guardIndex = source.indexOf('if (!isBoardSnagPreviewEnabled())');
    const nativeImportIndex = source.indexOf("import('../native/board-snag-preview.ts')");

    assert.notEqual(guardIndex, -1);
    assert.notEqual(nativeImportIndex, -1);
    assert.ok(guardIndex < nativeImportIndex);
  });

  it('documents board safety and Free social limits for Supabase', () => {
    const schema = readFileSync(new URL('../docs/supabase/social-schema.sql', import.meta.url), 'utf8');

    assert.match(schema, /create table if not exists public\.board_member_bans/);
    assert.match(schema, /create table if not exists public\.board_reports/);
    assert.doesNotMatch(schema, /board_member_blocks/);
    assert.match(schema, /not exists \(\s*select 1\s*from public\.board_member_bans/s);
    assert.match(schema, /board_member_bans_owner_manage/);
    assert.match(schema, /board_reports_insert_member/);
    assert.match(schema, /private\.get_user_created_board_count\(\(select auth\.uid\(\)\)\) < 2/);
    assert.match(schema, /private\.get_user_joined_board_count\(current_user_id\) >= 3/);
    assert.match(schema, /private\.get_board_member_count\(target_board\.id\) >= 8/);
    assert.match(schema, /private\.get_board_snag_count\(board_snags\.board_id\) < 60/);
  });

  it('creates a local social profile when Supabase is not configured', async () => {
    assert.deepEqual(
      await loadOrCreateSocialProfileAsync({
        client: null,
        displayName: '  Jae  ',
        localSeed: 'device one',
      }),
      {
        cloudEnabled: false,
        displayName: 'Jae',
        id: 'profile-device-one',
      },
    );
  });

  it('returns empty joined boards when offline and no local rooms are supplied', async () => {
    assert.deepEqual(
      await loadJoinedSocialBoardsAsync({
        client: null,
        currentMemberId: LOCAL_BOARD_MEMBER_ID,
      }),
      {
        drawingsByRoomId: {},
        rooms: [],
        snagsByRoomId: {},
      },
    );
  });

  it('loads shared profile names while refreshing joined cloud boards', async () => {
    const calls = [];
    const dataByTable = {
      board_drawings: [],
      board_members: [
        { board_id: 'board-1', joined_at: '2024-03-09T16:01:00.000Z', role: 'owner', user_id: 'profile-host' },
        { board_id: 'board-1', joined_at: '2024-03-09T16:02:00.000Z', role: 'member', user_id: 'profile-jae' },
      ],
      board_snags: [],
      boards: [{
        code: 'SN1001',
        color: '#BFEAFF',
        created_at: '2024-03-09T16:00:00.000Z',
        id: 'board-1',
        owner_id: 'profile-host',
        title: 'Trip board',
      }],
      profiles: [
        { display_name: 'Alex', id: 'profile-host' },
        { display_name: 'Jae', id: 'profile-jae' },
      ],
    };
    const client = {
      from: (table) => ({
        select: (columns) => {
          const query = {
            eq: (column, value) => {
              calls.push({ column, table, type: 'eq', value });

              return query;
            },
            in: (column, value) => {
              calls.push({ column, table, type: 'in', value });

              return query;
            },
            throwOnError: async () => ({
              data: dataByTable[table] ?? [],
            }),
          };

          calls.push({ columns, table, type: 'select' });

          return query;
        },
      }),
      storage: {
        from: () => ({
          createSignedUrls: async () => ({ data: [], error: null }),
          getPublicUrl: (path) => ({ data: { publicUrl: `public://${path}` } }),
        }),
      },
    };

    const snapshot = await loadJoinedSocialBoardsAsync({
      client,
      currentMemberId: 'profile-jae',
    });

    assert.ok(calls.some((call) => call.table === 'profiles' && call.type === 'select' && call.columns === 'id,display_name'));
    assert.deepEqual(snapshot.rooms[0].memberNames, {
      'profile-host': 'Alex',
      'profile-jae': 'Jae',
    });
  });

  it('falls back to local room creation when Supabase is not configured', async () => {
    const room = await createSocialBoardRoomAsync({
      client: null,
      currentMemberId: LOCAL_BOARD_MEMBER_ID,
      index: 0,
    });

    assert.equal(room.code, 'SN0001');
    assert.equal(room.ownerId, LOCAL_BOARD_MEMBER_ID);
    assert.deepEqual(room.memberIds, [LOCAL_BOARD_MEMBER_ID]);
  });

  it('falls back to a local joined-room shell when Supabase is not configured', async () => {
    const room = await joinSocialBoardRoomAsync({
      client: null,
      currentMemberId: LOCAL_BOARD_MEMBER_ID,
      index: 1,
      inviteCode: ' sn 77 ',
    });

    assert.ok(room);
    assert.equal(room.code, 'SN77');
    assert.deepEqual(room.memberIds, ['remote-owner-sn77', LOCAL_BOARD_MEMBER_ID]);
  });

  it('transfers board ownership through the cloud service', async () => {
    const calls = [];
    const client = {
      from: (table) => ({
        update: (payload) => ({
          eq: (column, value) => ({
            eq: (nextColumn, nextValue) => ({
              throwOnError: async () => {
                calls.push({ column, nextColumn, nextValue, payload, table, value });
              },
            }),
            throwOnError: async () => {
              calls.push({ column, payload, table, value });
            },
          }),
        }),
      }),
    };

    await transferSocialBoardOwnerAsync({
      client,
      currentMemberId: 'profile-owner',
      nowIso: '2024-03-09T16:00:00.000Z',
      roomId: 'board-1',
      targetMemberId: 'profile-friend',
    });

    assert.deepEqual(calls, [
      {
        column: 'board_id',
        nextColumn: 'user_id',
        nextValue: 'profile-friend',
        payload: { role: 'owner' },
        table: 'board_members',
        value: 'board-1',
      },
      {
        column: 'board_id',
        nextColumn: 'user_id',
        nextValue: 'profile-owner',
        payload: { role: 'member' },
        table: 'board_members',
        value: 'board-1',
      },
      {
        column: 'id',
        payload: {
          owner_id: 'profile-friend',
          updated_at: '2024-03-09T16:00:00.000Z',
        },
        table: 'boards',
        value: 'board-1',
      },
    ]);
  });

  it('kicks and bans a board member through the cloud service', async () => {
    const calls = [];
    const client = {
      from: (table) => ({
        delete: () => ({
          eq: (column, value) => ({
            eq: (nextColumn, nextValue) => ({
              throwOnError: async () => {
                calls.push({ action: 'delete', column, nextColumn, nextValue, table, value });
              },
            }),
          }),
        }),
        upsert: (payload) => ({
          throwOnError: async () => {
            calls.push({ action: 'upsert', payload, table });
          },
        }),
      }),
    };

    await kickSocialBoardMemberAsync({
      client,
      currentMemberId: 'profile-owner',
      nowIso: '2024-03-09T16:00:00.000Z',
      roomId: 'board-1',
      targetMemberId: 'profile-friend',
    });

    assert.deepEqual(calls, [
      {
        action: 'upsert',
        payload: {
          board_id: 'board-1',
          created_at: '2024-03-09T16:00:00.000Z',
          created_by: 'profile-owner',
          user_id: 'profile-friend',
        },
        table: 'board_member_bans',
      },
      {
        action: 'delete',
        column: 'board_id',
        nextColumn: 'user_id',
        nextValue: 'profile-friend',
        table: 'board_members',
        value: 'board-1',
      },
    ]);
  });

  it('reports a board member through the cloud service without personal block writes', async () => {
    const calls = [];
    const client = {
      from: (table) => ({
        insert: (payload) => ({
          throwOnError: async () => {
            calls.push({ action: 'insert', payload, table });
          },
        }),
      }),
    };

    await reportSocialBoardMemberAsync({
      client,
      currentMemberId: 'profile-reporter',
      nowIso: '2024-03-09T16:00:00.000Z',
      roomId: 'board-1',
      targetMemberId: 'profile-problem',
    });

    assert.deepEqual(calls, [
      {
        action: 'insert',
        payload: {
          board_id: 'board-1',
          created_at: '2024-03-09T16:00:00.000Z',
          reporter_id: 'profile-reporter',
          target_user_id: 'profile-problem',
          type: 'member',
        },
        table: 'board_reports',
      },
    ]);
  });

  it('batches signed board image URLs when loading many snags', async () => {
    const signedUrlCalls = [];
    const client = {
      storage: {
        from: () => ({
          createSignedUrls: async (paths, expiresIn) => {
            signedUrlCalls.push({ expiresIn, paths });
            return {
              data: paths.map((path) => ({
                path,
                signedUrl: `signed://${path}`,
              })),
              error: null,
            };
          },
          getPublicUrl: (path) => ({ data: { publicUrl: `public://${path}` } }),
          upload: async () => ({ error: null }),
        }),
      },
    };

    assert.deepEqual(
      await getBoardSnagDisplayUrlsAsync({
        client,
        paths: ['room/a.png', 'room/b.png', 'room/a.png'],
      }),
      {
        'room/a.png': 'signed://room/a.png',
        'room/b.png': 'signed://room/b.png',
      },
    );
    assert.deepEqual(signedUrlCalls, [
      {
        expiresIn: 3600,
        paths: ['room/a.png', 'room/b.png'],
      },
    ]);
  });

  it('uploads a small board preview instead of the original snag image', async () => {
    const uploads = [];
    const upserts = [];
    const sourceBuffer = new Uint8Array([1, 2, 3]).buffer;
    const client = {
      from: (table) => ({
        upsert: (payload) => {
          upserts.push({ payload, table });

          return {
            throwOnError: async () => ({ error: null }),
          };
        },
      }),
      storage: {
        from: () => ({
          getPublicUrl: (path) => ({ data: { publicUrl: `public://${path}` } }),
          upload: async (path, body, options) => {
            uploads.push({ body, options, path });

            return { error: null };
          },
        }),
      },
    };
    const snag = {
      canvasX: 12,
      canvasY: 34,
      category: 'board-1',
      createdAt: 1710000000000,
      id: 'snag-preview',
      imageHeight: 1800,
      imageUri: 'file:///original.png',
      imageWidth: 1200,
      rotate: '0deg',
      size: 220,
      title: 'Preview',
    };

    await uploadAndSaveBoardSnagAsync({
      client,
      createPreviewAsync: async (inputSnag) => ({
        ...inputSnag,
        imageHeight: 640,
        imageUri: 'file:///preview.webp',
        imageWidth: 427,
      }),
      currentMemberId: 'profile-jae',
      readFileAsArrayBuffer: async (uri) => {
        assert.equal(uri, 'file:///preview.webp');

        return sourceBuffer;
      },
      roomId: 'board-1',
      snag,
    });

    assert.deepEqual(uploads, [{
      body: sourceBuffer,
      options: {
        contentType: 'image/webp',
        upsert: true,
      },
      path: 'board-1/previews/snag-preview.webp',
    }]);
    assert.deepEqual(upserts, [{
      table: 'board_snags',
      payload: {
        board_id: 'board-1',
        canvas_x: 12,
        canvas_y: 34,
        created_at: '2024-03-09T16:00:00.000Z',
        id: 'snag-preview',
        image_height: 640,
        image_path: 'board-1/previews/snag-preview.webp',
        image_width: 427,
        layer_index: 0,
        owner_id: 'profile-jae',
        rotate: '0deg',
        size: 220,
        title: 'Preview',
        updated_at: '2024-03-09T16:00:00.000Z',
      },
    }]);
  });

  it('does not upload original png when the preview native module is missing', async () => {
    const uploads = [];
    const upserts = [];
    const client = {
      from: (table) => ({
        upsert: (payload) => {
          upserts.push({ payload, table });

          return {
            throwOnError: async () => ({ error: null }),
          };
        },
      }),
      storage: {
        from: () => ({
          getPublicUrl: (path) => ({ data: { publicUrl: `public://${path}` } }),
          upload: async (path, body, options) => {
            uploads.push({ body, options, path });

            return { error: null };
          },
        }),
      },
    };
    const snag = {
      canvasX: 12,
      canvasY: 34,
      category: 'board-1',
      createdAt: 1710000000000,
      id: 'snag-original',
      imageHeight: 1800,
      imageUri: 'file:///original.png',
      imageWidth: 1200,
      rotate: '0deg',
      size: 220,
      title: 'Original',
    };

    await uploadAndSaveBoardSnagAsync({
      client,
      createPreviewAsync: async () => {
        throw new Error('Cannot find native module ExpoImageManipulator');
      },
      currentMemberId: 'profile-jae',
      readFileAsArrayBuffer: async () => {
        throw new Error('Original image should not be read for social upload');
      },
      roomId: 'board-1',
      snag,
    });

    assert.deepEqual(uploads, []);
    assert.deepEqual(upserts, []);
  });

  it('removes a board snag storage file when deleting the cloud row', async () => {
    const calls = [];
    const client = {
      from: (table) => ({
        select: (columns) => {
          const query = {
            eq: (column, value) => {
              calls.push({ column, table, type: 'select.eq', value });

              return query;
            },
            maybeSingle: async () => ({
              data: {
                id: 'snag-1',
                image_path: 'board-1/previews/snag-1.webp',
              },
              error: null,
            }),
          };

          calls.push({ columns, table, type: 'select' });

          return query;
        },
        delete: () => {
          const query = {
            eq: (column, value) => {
              calls.push({ column, table, type: 'delete.eq', value });

              return query;
            },
            throwOnError: async () => {
              calls.push({ table, type: 'delete.throwOnError' });
            },
          };

          calls.push({ table, type: 'delete' });

          return query;
        },
      }),
      storage: {
        from: (bucket) => ({
          remove: async (paths) => {
            calls.push({ bucket, paths, type: 'storage.remove' });

            return { error: null };
          },
        }),
      },
    };

    await deleteSocialBoardSnagAsync({
      client,
      roomId: 'board-1',
      snagId: 'snag-1',
    });

    assert.ok(calls.some((call) => call.type === 'storage.remove' && call.bucket === 'board-snags'));
    assert.deepEqual(
      calls.find((call) => call.type === 'storage.remove').paths,
      [
        'board-1/previews/snag-1.webp',
        'board-1/snag-1.png',
      ],
    );
    assert.ok(calls.findIndex((call) => call.type === 'storage.remove') < calls.findIndex((call) => call.type === 'delete'));
  });

  it('removes board storage files before deleting a cloud board', async () => {
    const calls = [];
    const client = {
      from: (table) => ({
        select: (columns) => {
          const query = {
            eq: (column, value) => {
              calls.push({ column, table, type: 'select.eq', value });

              return query;
            },
            throwOnError: async () => ({
              data: [
                { id: 'snag-1', image_path: 'board-1/previews/snag-1.webp' },
                { id: 'snag-2', image_path: 'board-1/previews/snag-2.webp' },
                { id: 'text-1', image_path: null },
              ],
            }),
          };

          calls.push({ columns, table, type: 'select' });

          return query;
        },
        delete: () => {
          const query = {
            eq: (column, value) => {
              calls.push({ column, table, type: 'delete.eq', value });

              return query;
            },
            throwOnError: async () => {
              calls.push({ table, type: 'delete.throwOnError' });
            },
          };

          calls.push({ table, type: 'delete' });

          return query;
        },
      }),
      storage: {
        from: (bucket) => ({
          remove: async (paths) => {
            calls.push({ bucket, paths, type: 'storage.remove' });

            return { error: null };
          },
        }),
      },
    };

    await deleteSocialBoardRoomAsync({
      client,
      roomId: 'board-1',
    });

    assert.deepEqual(
      calls.find((call) => call.type === 'storage.remove').paths,
      [
        'board-1/previews/snag-1.webp',
        'board-1/snag-1.png',
        'board-1/previews/snag-2.webp',
        'board-1/snag-2.png',
      ],
    );
    assert.ok(calls.findIndex((call) => call.type === 'storage.remove') < calls.findIndex((call) => call.type === 'delete'));
  });
});
