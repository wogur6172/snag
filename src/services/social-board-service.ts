import type { SnagDrawingStroke, SnagItem } from '../data/snags.ts';
import {
  type BoardRoom,
  getReportedBoardSnagIds,
} from '../utils/boards.ts';
import { normalizeProfileDisplayName } from '../utils/snag-library.ts';
import {
  createBoardSnagInsert,
  createBoardSnagUpdate,
  createBoardStrokeInsert,
  createSocialBoardInsert,
  createSocialProfileId,
  getBoardSnagStoragePath,
  mapBoardDrawingRowsToStrokes,
  mapBoardRoomRowsToRooms,
  mapBoardSnagRowsToSnags,
  normalizeSocialInviteCode,
  SUPABASE_SOCIAL_BUCKET,
  type SocialBoardMemberRow,
  type SocialBoardRoomRow,
  type SocialBoardSnagRow,
  type SocialBoardStrokeRow,
  type SocialProfileRow,
} from '../utils/social-sync.ts';
import {
  getBoardSnagOriginalStoragePath,
  getBoardSnagPreviewContentType,
  isBoardSnagPreviewEnabled,
} from '../utils/board-images.ts';

type SocialSupabaseClient = {
  auth: {
    getSession: () => Promise<{
      data?: {
        session?: {
          user?: {
            id?: string;
          };
        } | null;
      };
      error?: Error | null;
    }>;
    signInAnonymously: () => Promise<{
      data?: {
        user?: {
          id?: string;
        } | null;
      };
      error?: Error | null;
    }>;
  };
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
  storage: {
    from: (bucket: string) => {
      createSignedUrl?: (path: string, expiresIn: number) => Promise<{
        data?: {
          signedUrl?: string;
        } | null;
        error?: Error | null;
      }>;
      createSignedUrls?: (paths: string[], expiresIn: number) => Promise<{
        data?: {
          error?: string | null;
          path?: string | null;
          signedUrl?: string | null;
        }[] | null;
        error?: Error | null;
      }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
      remove?: (paths: string[]) => Promise<{ error?: Error | null }>;
      upload: (path: string, body: ArrayBuffer, options?: Record<string, unknown>) => Promise<{ error?: Error | null }>;
    };
  };
} | null;

type BoardSnagPreviewCreator = (snag: SnagItem) => Promise<SnagItem>;
type BoardSnagFileReader = (uri: string) => Promise<ArrayBuffer>;

export type SocialProfile = {
  cloudEnabled: boolean;
  displayName: string;
  id: string;
};

export type SocialBoardSnapshot = {
  drawingsByRoomId: Record<string, SnagDrawingStroke[]>;
  rooms: BoardRoom[];
  snagsByRoomId: Record<string, SnagItem[]>;
};

function getNowIso() {
  return new Date().toISOString();
}

function getLocalProfile({
  displayName,
  localSeed,
}: {
  displayName: string;
  localSeed: string;
}): SocialProfile {
  return {
    cloudEnabled: false,
    displayName: normalizeProfileDisplayName(displayName),
    id: createSocialProfileId(localSeed),
  };
}

function groupByRoomId<T extends { board_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((groups, row) => ({
    ...groups,
    [row.board_id]: [...(groups[row.board_id] ?? []), row],
  }), {});
}

async function loadSocialProfileRowsForMembersAsync({
  client,
  memberRows,
}: {
  client: NonNullable<SocialSupabaseClient>;
  memberRows: SocialBoardMemberRow[];
}): Promise<SocialProfileRow[]> {
  const memberIds = Array.from(new Set(memberRows.map((member) => member.user_id).filter(Boolean)));

  if (memberIds.length === 0) {
    return [];
  }

  const profileResult = await client
    .from('profiles')
    .select('id,display_name')
    .in('id', memberIds)
    .throwOnError();

  return (profileResult.data ?? []) as SocialProfileRow[];
}

async function getBoardSnagDisplayUrl({
  client,
  path,
}: {
  client: NonNullable<SocialSupabaseClient>;
  path: string;
}) {
  const bucket = client.storage.from(SUPABASE_SOCIAL_BUCKET);

  if (bucket.createSignedUrl) {
    const signedUrlResult = await bucket.createSignedUrl(path, 60 * 60);

    if (!signedUrlResult.error && signedUrlResult.data?.signedUrl) {
      return signedUrlResult.data.signedUrl;
    }
  }

  return bucket.getPublicUrl(path).data.publicUrl;
}

export async function getBoardSnagDisplayUrlsAsync({
  client,
  paths,
}: {
  client: NonNullable<SocialSupabaseClient>;
  paths: string[];
}) {
  const bucket = client.storage.from(SUPABASE_SOCIAL_BUCKET);
  const uniquePaths = Array.from(new Set(paths));

  if (uniquePaths.length === 0) {
    return {};
  }

  if (bucket.createSignedUrls) {
    const signedUrlsResult = await bucket.createSignedUrls(uniquePaths, 60 * 60);

    if (!signedUrlsResult.error && Array.isArray(signedUrlsResult.data)) {
      const signedUrlByPath = new Map<string, string>();

      signedUrlsResult.data.forEach((item, index) => {
        const path = item.path ?? uniquePaths[index];

        if (path && item.signedUrl) {
          signedUrlByPath.set(path, item.signedUrl);
        }
      });

      return Object.fromEntries(uniquePaths.map((path) => [
        path,
        signedUrlByPath.get(path) ?? bucket.getPublicUrl(path).data.publicUrl,
      ]));
    }
  }

  return Object.fromEntries(await Promise.all(uniquePaths.map(async (path) => [
    path,
    await getBoardSnagDisplayUrl({ client, path }),
  ])));
}

async function mapCloudBoardSnagRowsToSnags({
  client,
  roomId,
  rows,
}: {
  client: NonNullable<SocialSupabaseClient>;
  roomId: string;
  rows: SocialBoardSnagRow[];
}) {
  const imagePaths = rows
    .map((row) => row.image_path)
    .filter((path): path is string => Boolean(path));
  const displayUrlsByPath = await getBoardSnagDisplayUrlsAsync({
    client,
    paths: imagePaths,
  });
  const rowsWithDisplayUrls = rows.map((row) => ({
    ...row,
    image_path: row.image_path ? displayUrlsByPath[row.image_path] ?? row.image_path : row.image_path,
  }));

  return mapBoardSnagRowsToSnags({
    publicUrlForPath: (path) => path,
    roomId,
    rows: rowsWithDisplayUrls,
  });
}

async function throwIfSupabaseError<T extends { error?: Error | null }>(result: Promise<T> | T) {
  const resolvedResult = await result;

  if (resolvedResult.error) {
    throw resolvedResult.error;
  }

  return resolvedResult;
}

async function createDefaultBoardSnagPreview(snag: SnagItem) {
  if (!isBoardSnagPreviewEnabled()) {
    throw new Error('Board Snag preview upload is disabled.');
  }

  const { createBoardSnagPreviewAsync } = await import('../native/board-snag-preview.ts');

  return createBoardSnagPreviewAsync(snag);
}

async function readBoardSnagFileAsArrayBuffer(uri: string) {
  const { File } = await import('expo-file-system');
  const file = new File(uri);

  return file.arrayBuffer();
}

function getBoardSnagStorageCleanupPaths({
  roomId,
  snagId,
  storagePath,
}: {
  roomId: string;
  snagId: string;
  storagePath?: string | null;
}) {
  const roomPrefix = `${roomId}/`;
  const storedPath = typeof storagePath === 'string' && storagePath.startsWith(roomPrefix)
    ? storagePath
    : null;

  if (!storedPath) {
    return [];
  }

  const paths = [
    storedPath,
    getBoardSnagStoragePath({ roomId, snagId }),
    getBoardSnagOriginalStoragePath({ roomId, snagId }),
  ];

  return Array.from(new Set(paths));
}

async function removeBoardSnagStoragePathsAsync({
  client,
  paths,
}: {
  client: NonNullable<SocialSupabaseClient>;
  paths: string[];
}) {
  const uniquePaths = Array.from(new Set(paths)).filter(Boolean);

  if (uniquePaths.length === 0) {
    return;
  }

  const bucket = client.storage.from(SUPABASE_SOCIAL_BUCKET);

  if (!bucket.remove) {
    return;
  }

  await throwIfSupabaseError(bucket.remove(uniquePaths));
}

export async function loadOrCreateSocialProfileAsync({
  client = null,
  displayName,
  localSeed = 'local',
}: {
  client?: SocialSupabaseClient;
  displayName: string;
  localSeed?: string;
}): Promise<SocialProfile> {
  const localProfile = getLocalProfile({ displayName, localSeed });

  if (!client) {
    return localProfile;
  }

  const normalizedDisplayName = normalizeProfileDisplayName(displayName);
  const sessionResult = await client.auth.getSession();
  let userId = sessionResult.data?.session?.user?.id;

  if (!userId) {
    const signInResult = await client.auth.signInAnonymously();

    if (signInResult.error || !signInResult.data?.user?.id) {
      console.warn('Could not start anonymous Supabase session', signInResult.error);
      return localProfile;
    }

    userId = signInResult.data.user.id;
  }

  try {
    return await updateSocialProfileDisplayNameAsync({
      client,
      displayName: normalizedDisplayName,
      profileId: userId,
    });
  } catch (error) {
    console.warn('Could not upsert social profile', error);
    return {
      cloudEnabled: true,
      displayName: normalizedDisplayName,
      id: userId,
    };
  }
}

export async function updateSocialProfileDisplayNameAsync({
  client = null,
  displayName,
  profileId,
}: {
  client?: SocialSupabaseClient;
  displayName: string;
  profileId: string;
}): Promise<SocialProfile> {
  const normalizedDisplayName = normalizeProfileDisplayName(displayName);

  if (!client) {
    return {
      cloudEnabled: false,
      displayName: normalizedDisplayName,
      id: profileId,
    };
  }

  await client
    .from('profiles')
    .upsert({
      display_name: normalizedDisplayName,
      id: profileId,
      updated_at: getNowIso(),
    }, { onConflict: 'id' })
    .throwOnError();

  return {
    cloudEnabled: true,
    displayName: normalizedDisplayName,
    id: profileId,
  };
}

export async function loadJoinedSocialBoardsAsync({
  client = null,
  currentMemberId,
}: {
  client?: SocialSupabaseClient;
  currentMemberId: string;
}): Promise<SocialBoardSnapshot> {
  if (!client) {
    return {
      drawingsByRoomId: {},
      rooms: [],
      snagsByRoomId: {},
    };
  }

  const joinedMemberResult = await client
    .from('board_members')
    .select('board_id,user_id,role,joined_at')
    .eq('user_id', currentMemberId)
    .throwOnError();
  const joinedMemberRows = (joinedMemberResult.data ?? []) as SocialBoardMemberRow[];
  const roomIds = Array.from(new Set(joinedMemberRows.map((member) => member.board_id)));

  if (roomIds.length === 0) {
    return {
      drawingsByRoomId: {},
      rooms: [],
      snagsByRoomId: {},
    };
  }

  const [roomResult, memberResult, snagResult, strokeResult, reportResult] = await Promise.all([
    client
      .from('boards')
      .select('id,code,title,color,owner_id,created_at,updated_at')
      .in('id', roomIds)
      .throwOnError(),
    client
      .from('board_members')
      .select('board_id,user_id,role,joined_at')
      .in('board_id', roomIds)
      .throwOnError(),
    client
      .from('board_snags')
      .select('id,board_id,owner_id,image_path,kind,text_value,canvas_x,canvas_y,size,rotate,layer_index,image_width,image_height,title,created_at,updated_at')
      .in('board_id', roomIds)
      .throwOnError(),
    client
      .from('board_drawings')
      .select('id,board_id,owner_id,color,width,points,layer_index')
      .in('board_id', roomIds)
      .throwOnError(),
    client
      .from('board_reports')
      .select('snag_id,type,status')
      .eq('reporter_id', currentMemberId)
      .eq('type', 'snag')
      .eq('status', 'open')
      .in('board_id', roomIds)
      .throwOnError(),
  ]);
  const memberRows = (memberResult.data ?? []) as SocialBoardMemberRow[];
  const profileRows = await loadSocialProfileRowsForMembersAsync({
    client,
    memberRows,
  });

  const rooms = mapBoardRoomRowsToRooms({
    currentMemberId,
    memberRows,
    profileRows,
    roomRows: (roomResult.data ?? []) as SocialBoardRoomRow[],
  });
  const reportedSnagIds = new Set(getReportedBoardSnagIds(reportResult.data ?? []));
  const visibleSnagRows = ((snagResult.data ?? []) as SocialBoardSnagRow[])
    .filter((row) => !reportedSnagIds.has(row.id));
  const snagRowsByRoomId = groupByRoomId(visibleSnagRows);
  const strokeRowsByRoomId = groupByRoomId((strokeResult.data ?? []) as SocialBoardStrokeRow[]);
  const snagsByRoomEntries = await Promise.all(rooms.map(async (room) => [
    room.id,
    await mapCloudBoardSnagRowsToSnags({
      client,
      roomId: room.id,
      rows: snagRowsByRoomId[room.id] ?? [],
    }),
  ] as const));

  return {
    drawingsByRoomId: Object.fromEntries(rooms.map((room) => [
      room.id,
      mapBoardDrawingRowsToStrokes(strokeRowsByRoomId[room.id] ?? []),
    ])),
    rooms,
    snagsByRoomId: Object.fromEntries(snagsByRoomEntries),
  };
}

export async function createSocialBoardRoomAsync({
  client = null,
  currentMemberId,
  index,
}: {
  client?: SocialSupabaseClient;
  currentMemberId: string;
  index: number;
}): Promise<BoardRoom> {
  if (!client) {
    throw new Error('Social boards are unavailable.');
  }

  const insert = createSocialBoardInsert({
    currentMemberId,
    index,
  });
  const roomResult = await client
    .from('boards')
    .insert(insert)
    .select('id,code,title,color,owner_id,created_at,updated_at')
    .single()
    .throwOnError();
  const roomRow = roomResult.data as SocialBoardRoomRow;
  const memberRow = {
    board_id: roomRow.id,
    joined_at: getNowIso(),
    role: 'owner' as const,
    user_id: currentMemberId,
  };

  await client
    .from('board_members')
    .insert(memberRow)
    .throwOnError();

  return mapBoardRoomRowsToRooms({
    currentMemberId,
    memberRows: [memberRow],
    roomRows: [roomRow],
  })[0];
}

export async function joinSocialBoardRoomAsync({
  client = null,
  currentMemberId,
  index,
  inviteCode,
}: {
  client?: SocialSupabaseClient;
  currentMemberId: string;
  index: number;
  inviteCode: string;
}): Promise<BoardRoom | null> {
  const code = normalizeSocialInviteCode(inviteCode);

  if (!code) {
    return null;
  }

  if (!client) {
    return null;
  }

  const roomResult = await client
    .rpc('join_board_by_code', { invite_code: code })
    .throwOnError();
  const roomRow = (Array.isArray(roomResult.data) ? roomResult.data[0] : roomResult.data) as SocialBoardRoomRow | null;

  if (!roomRow) {
    return null;
  }

  const memberResult = await client
    .from('board_members')
    .select('board_id,user_id,role,joined_at')
    .eq('board_id', roomRow.id)
    .throwOnError();
  const memberRows = (memberResult.data ?? []) as SocialBoardMemberRow[];
  const profileRows = await loadSocialProfileRowsForMembersAsync({
    client,
    memberRows,
  });

  return mapBoardRoomRowsToRooms({
    currentMemberId,
    memberRows,
    profileRows,
    roomRows: [roomRow],
  })[0];
}

export async function renameSocialBoardRoomAsync({
  client = null,
  roomId,
  title,
}: {
  client?: SocialSupabaseClient;
  roomId: string;
  title: string;
}) {
  if (!client) {
    return;
  }

  await client
    .from('boards')
    .update({
      title: title.trim(),
      updated_at: getNowIso(),
    })
    .eq('id', roomId)
    .throwOnError();
}

export async function updateSocialBoardColorAsync({
  client = null,
  color,
  roomId,
}: {
  client?: SocialSupabaseClient;
  color: string;
  roomId: string;
}) {
  if (!client) {
    return;
  }

  await client
    .from('boards')
    .update({
      color,
      updated_at: getNowIso(),
    })
    .eq('id', roomId)
    .throwOnError();
}

export async function deleteSocialBoardRoomAsync({
  client = null,
  roomId,
}: {
  client?: SocialSupabaseClient;
  roomId: string;
}) {
  if (!client) {
    return;
  }

  const snagRowsResult = await client
    .from('board_snags')
    .select('id,image_path')
    .eq('board_id', roomId)
    .throwOnError();
  const storagePaths = ((snagRowsResult.data ?? []) as { id?: string | null; image_path?: string | null }[])
    .flatMap((row) => (row.id ? getBoardSnagStorageCleanupPaths({
      roomId,
      snagId: row.id,
      storagePath: row.image_path,
    }) : []));

  await removeBoardSnagStoragePathsAsync({
    client,
    paths: storagePaths,
  });

  await client
    .from('boards')
    .delete()
    .eq('id', roomId)
    .throwOnError();
}

export async function leaveSocialBoardRoomAsync({
  client = null,
  currentMemberId,
  room,
}: {
  client?: SocialSupabaseClient;
  currentMemberId: string;
  room: BoardRoom;
}) {
  if (!client) {
    return;
  }

  if ((room.memberIds ?? []).length <= 1) {
    return;
  }

  if (room.ownerId === currentMemberId) {
    const nextOwnerId = (room.memberIds ?? []).find((memberId) => memberId !== currentMemberId);

    if (nextOwnerId) {
      await client
        .from('board_members')
        .update({ role: 'owner' })
        .eq('board_id', room.id)
        .eq('user_id', nextOwnerId)
        .throwOnError();

      await client
        .from('boards')
        .update({
          owner_id: nextOwnerId,
          updated_at: getNowIso(),
        })
        .eq('id', room.id)
        .throwOnError();
    }
  }

  await client
    .from('board_members')
    .delete()
    .eq('board_id', room.id)
    .eq('user_id', currentMemberId)
    .throwOnError();
}

export async function transferSocialBoardOwnerAsync({
  client = null,
  currentMemberId,
  nowIso = getNowIso(),
  roomId,
  targetMemberId,
}: {
  client?: SocialSupabaseClient;
  currentMemberId: string;
  nowIso?: string;
  roomId: string;
  targetMemberId: string;
}) {
  if (!client || currentMemberId === targetMemberId) {
    return;
  }

  await client
    .from('board_members')
    .update({ role: 'owner' })
    .eq('board_id', roomId)
    .eq('user_id', targetMemberId)
    .throwOnError();

  await client
    .from('board_members')
    .update({ role: 'member' })
    .eq('board_id', roomId)
    .eq('user_id', currentMemberId)
    .throwOnError();

  await client
    .from('boards')
    .update({
      owner_id: targetMemberId,
      updated_at: nowIso,
    })
    .eq('id', roomId)
    .throwOnError();
}

export async function kickSocialBoardMemberAsync({
  client = null,
  currentMemberId,
  nowIso = getNowIso(),
  roomId,
  targetMemberId,
}: {
  client?: SocialSupabaseClient;
  currentMemberId: string;
  nowIso?: string;
  roomId: string;
  targetMemberId: string;
}) {
  if (!client || currentMemberId === targetMemberId) {
    return;
  }

  await client
    .from('board_member_bans')
    .upsert({
      board_id: roomId,
      created_at: nowIso,
      created_by: currentMemberId,
      user_id: targetMemberId,
    })
    .throwOnError();

  await client
    .from('board_members')
    .delete()
    .eq('board_id', roomId)
    .eq('user_id', targetMemberId)
    .throwOnError();
}

export async function reportSocialBoardMemberAsync({
  client = null,
  currentMemberId,
  nowIso = getNowIso(),
  roomId,
  targetMemberId,
}: {
  client?: SocialSupabaseClient;
  currentMemberId: string;
  nowIso?: string;
  roomId: string;
  targetMemberId: string;
}) {
  if (!client || currentMemberId === targetMemberId) {
    return;
  }

  await client
    .from('board_reports')
    .insert({
      board_id: roomId,
      created_at: nowIso,
      reporter_id: currentMemberId,
      target_user_id: targetMemberId,
      type: 'member',
    })
    .throwOnError();
}

export async function reportSocialBoardSnagAsync({
  client = null,
  currentMemberId,
  nowIso = getNowIso(),
  roomId,
  snagId,
  targetMemberId,
}: {
  client?: SocialSupabaseClient;
  currentMemberId: string;
  nowIso?: string;
  roomId: string;
  snagId: string;
  targetMemberId: string;
}) {
  if (!client || currentMemberId === targetMemberId) {
    return;
  }

  await client
    .from('board_reports')
    .insert({
      board_id: roomId,
      created_at: nowIso,
      reporter_id: currentMemberId,
      snag_id: snagId,
      target_user_id: targetMemberId,
      type: 'snag',
    })
    .throwOnError();
}

export async function uploadAndSaveBoardSnagAsync({
  client = null,
  createPreviewAsync = createDefaultBoardSnagPreview,
  currentMemberId,
  readFileAsArrayBuffer = readBoardSnagFileAsArrayBuffer,
  roomId,
  snag,
}: {
  client?: SocialSupabaseClient;
  createPreviewAsync?: BoardSnagPreviewCreator;
  currentMemberId: string;
  readFileAsArrayBuffer?: BoardSnagFileReader;
  roomId: string;
  snag: SnagItem;
}) {
  if (!client) {
    return;
  }

  if (snag.kind === 'text') {
    await client
      .from('board_snags')
      .upsert(createBoardSnagInsert({
        currentMemberId,
        roomId,
        snag,
      }))
      .throwOnError();
    return;
  }

  if (!snag.imageUri) {
    return;
  }

  const storagePath = getBoardSnagStoragePath({
    roomId,
    snagId: snag.id,
  });
  let previewSnag: SnagItem;

  try {
    previewSnag = await createPreviewAsync(snag);
  } catch (error) {
    console.warn('Could not create board Snag preview; skipping social upload to avoid storing original image.', error);
    return;
  }

  if (!previewSnag.imageUri || previewSnag.imageUri === snag.imageUri) {
    console.warn('Board Snag preview did not produce a compressed image; skipping social upload.');
    return;
  }

  const imageBuffer = await readFileAsArrayBuffer(previewSnag.imageUri);

  await throwIfSupabaseError(client.storage.from(SUPABASE_SOCIAL_BUCKET).upload(storagePath, imageBuffer, {
    contentType: getBoardSnagPreviewContentType(),
    upsert: true,
  }));

  await client
    .from('board_snags')
    .upsert(createBoardSnagInsert({
      currentMemberId,
      roomId,
      snag: previewSnag,
      storagePath,
    }))
    .throwOnError();
}

export async function updateBoardSnagTransformAsync({
  client = null,
  roomId,
  snag,
}: {
  client?: SocialSupabaseClient;
  roomId: string;
  snag: SnagItem;
}) {
  if (!client) {
    return;
  }

  await client
    .from('board_snags')
    .update(createBoardSnagUpdate(snag))
    .eq('board_id', roomId)
    .eq('id', snag.id)
    .throwOnError();
}

export async function deleteSocialBoardSnagAsync({
  client = null,
  roomId,
  snagId,
}: {
  client?: SocialSupabaseClient;
  roomId: string;
  snagId: string;
}) {
  if (!client) {
    return;
  }

  const snagRowResult = await client
    .from('board_snags')
    .select('id,image_path')
    .eq('board_id', roomId)
    .eq('id', snagId)
    .maybeSingle();
  const storagePaths = getBoardSnagStorageCleanupPaths({
    roomId,
    snagId,
    storagePath: snagRowResult.error ? null : snagRowResult.data?.image_path,
  });

  await removeBoardSnagStoragePathsAsync({
    client,
    paths: storagePaths,
  });

  await client
    .from('board_snags')
    .delete()
    .eq('board_id', roomId)
    .eq('id', snagId)
    .throwOnError();
}

export async function addSocialBoardDrawingStrokeAsync({
  client = null,
  currentMemberId,
  layerIndex,
  roomId,
  stroke,
}: {
  client?: SocialSupabaseClient;
  currentMemberId: string;
  layerIndex: number;
  roomId: string;
  stroke: SnagDrawingStroke;
}) {
  if (!client) {
    return;
  }

  await client
    .from('board_drawings')
    .insert(createBoardStrokeInsert({
      currentMemberId,
      layerIndex,
      roomId,
      stroke,
    }))
    .throwOnError();
}

export async function deleteSocialBoardDrawingStrokeAsync({
  client = null,
  roomId,
  strokeId,
}: {
  client?: SocialSupabaseClient;
  roomId: string;
  strokeId: string;
}) {
  if (!client) {
    return;
  }

  await client
    .from('board_drawings')
    .delete()
    .eq('board_id', roomId)
    .eq('id', strokeId)
    .throwOnError();
}

export async function clearSocialBoardDrawingStrokesAsync({
  client = null,
  roomId,
}: {
  client?: SocialSupabaseClient;
  roomId: string;
}) {
  if (!client) {
    return;
  }

  await client
    .from('board_drawings')
    .delete()
    .eq('board_id', roomId)
    .throwOnError();
}
