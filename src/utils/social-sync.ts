import type { SnagDrawingStroke, SnagItem } from '../data/snags';
import type { BoardRoom } from './boards';
import { getBoardSnagPreviewStoragePath } from './board-images.ts';

export const SUPABASE_SOCIAL_BUCKET = 'board-snags';
export const SOCIAL_INVITE_CODE_LENGTH = 6;
export const SOCIAL_BOARD_COLOR_OPTIONS = [
  '#FFD6D6',
  '#FFE2BF',
  '#FFF3A8',
  '#DDF8B7',
  '#BFEAFF',
  '#E3D6FF',
  '#FFFFFF',
] as const;

export type SupabasePublicConfig = {
  publishableKey: string;
  url: string;
};

export type SupabasePublicEnv = {
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  EXPO_PUBLIC_SUPABASE_URL?: string;
};

export type SocialBoardRoomRow = {
  code: string;
  color: string | null;
  created_at: string;
  id: string;
  owner_id: string;
  title: string;
  updated_at?: string | null;
};

export type SocialBoardMemberRow = {
  board_id: string;
  joined_at: string;
  role: 'member' | 'owner';
  user_id: string;
};

export type SocialProfileRow = {
  display_name?: string | null;
  id: string;
};

export type SocialBoardSnagRow = {
  board_id: string;
  canvas_x: number;
  canvas_y: number;
  created_at: string;
  id: string;
  image_height?: number | null;
  image_path?: string | null;
  image_width?: number | null;
  kind?: 'image' | 'text' | null;
  layer_index?: number | null;
  owner_id?: string | null;
  rotate: string;
  size: number;
  text_value?: string | null;
  title: string;
  updated_at?: string | null;
};

export type SocialBoardStrokeRow = {
  board_id: string;
  color: string;
  id: string;
  layer_index: number;
  owner_id: string;
  points: SnagDrawingStroke['points'];
  width: number;
};

function normalizeEnvString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getSupabasePublicConfig(env?: SupabasePublicEnv): SupabasePublicConfig {
  const resolvedEnv = env ?? {
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  };

  return {
    publishableKey: normalizeEnvString(resolvedEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    url: normalizeEnvString(resolvedEnv.EXPO_PUBLIC_SUPABASE_URL),
  };
}

export function isSupabaseConfigured(config = getSupabasePublicConfig()) {
  return isValidHttpUrl(config.url) && config.publishableKey.length > 0;
}

export function createSocialProfileId(seed: string) {
  const slug = seed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `profile-${slug || 'local'}`;
}

export function normalizeSocialInviteCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, SOCIAL_INVITE_CODE_LENGTH);
}

export function generateSocialInviteCode(seed = Math.random().toString(36).slice(2, 10)) {
  const normalizedSeed = normalizeSocialInviteCode(seed);

  return normalizedSeed.padEnd(SOCIAL_INVITE_CODE_LENGTH, '0');
}

function getSocialBoardColor(color: string | null | undefined, fallbackIndex = 0) {
  if (SOCIAL_BOARD_COLOR_OPTIONS.includes(color as typeof SOCIAL_BOARD_COLOR_OPTIONS[number])) {
    return color as typeof SOCIAL_BOARD_COLOR_OPTIONS[number];
  }

  return SOCIAL_BOARD_COLOR_OPTIONS[Math.max(0, fallbackIndex) % SOCIAL_BOARD_COLOR_OPTIONS.length];
}

function getIsoTime(value: number) {
  return new Date(value).toISOString();
}

function getTimeValue(value: string | null | undefined) {
  if (!value) {
    return Date.now();
  }

  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Date.now();
}

function mapSocialProfileRowsById(profileRows: SocialProfileRow[] = []) {
  return profileRows.reduce<Record<string, string>>((namesById, profile) => {
    const displayName = profile.display_name?.trim();

    if (!profile.id || !displayName) {
      return namesById;
    }

    return {
      ...namesById,
      [profile.id]: displayName,
    };
  }, {});
}

function getSocialMemberNames({
  memberIds,
  profileRows = [],
}: {
  memberIds: string[];
  profileRows?: SocialProfileRow[];
}) {
  const namesById = mapSocialProfileRowsById(profileRows);

  return memberIds.reduce<Record<string, string>>((memberNames, memberId) => {
    const displayName = namesById[memberId];

    if (!displayName) {
      return memberNames;
    }

    return {
      ...memberNames,
      [memberId]: displayName,
    };
  }, {});
}

export function createSocialBoardInsert({
  color,
  createdAt = Date.now(),
  currentMemberId,
  index,
  inviteCode,
  title,
}: {
  color?: string;
  createdAt?: number;
  currentMemberId: string;
  index: number;
  inviteCode?: string;
  title?: string;
}) {
  const roomNumber = Math.max(1, Math.floor(index) + 1);
  const timestamp = getIsoTime(createdAt);

  return {
    code: generateSocialInviteCode(inviteCode),
    color: getSocialBoardColor(color, index),
    created_at: timestamp,
    owner_id: currentMemberId,
    title: title?.trim() || `Board ${roomNumber}`,
    updated_at: timestamp,
  };
}

export function mapBoardRoomRowsToRooms({
  currentMemberId,
  memberRows,
  profileRows = [],
  roomRows,
}: {
  currentMemberId: string;
  memberRows: SocialBoardMemberRow[];
  profileRows?: SocialProfileRow[];
  roomRows: SocialBoardRoomRow[];
}): BoardRoom[] {
  return roomRows.map((row, index) => {
    const boardMembers = memberRows
      .filter((member) => member.board_id === row.id)
      .sort((left, right) => getTimeValue(left.joined_at) - getTimeValue(right.joined_at));
    const memberIds = boardMembers.map((member) => member.user_id);
    const memberIdsWithCurrentUser = memberIds.includes(currentMemberId)
      ? memberIds
      : [...memberIds, currentMemberId];
    const memberIdsWithOwner = memberIdsWithCurrentUser.includes(row.owner_id)
      ? memberIdsWithCurrentUser
      : [row.owner_id, ...memberIdsWithCurrentUser];
    const memberNames = getSocialMemberNames({
      memberIds: memberIdsWithOwner,
      profileRows,
    });

    return {
      code: normalizeSocialInviteCode(row.code),
      color: getSocialBoardColor(row.color, index),
      createdAt: getTimeValue(row.created_at),
      id: row.id,
      memberIds: memberIdsWithOwner,
      ...(Object.keys(memberNames).length > 0 ? { memberNames } : {}),
      ownerId: row.owner_id,
      title: row.title.trim() || `Board ${index + 1}`,
    };
  });
}

export function getBoardSnagStoragePath({
  roomId,
  snagId,
}: {
  roomId: string;
  snagId: string;
}) {
  return getBoardSnagPreviewStoragePath({ roomId, snagId });
}

export function createBoardSnagInsert({
  currentMemberId,
  roomId,
  snag,
  storagePath,
}: {
  currentMemberId: string;
  roomId: string;
  snag: SnagItem;
  storagePath?: string;
}): SocialBoardSnagRow {
  const timestamp = getIsoTime(snag.createdAt);
  const updatedTimestamp = getIsoTime(snag.updatedAt ?? snag.createdAt);
  const isText = snag.kind === 'text';

  return {
    board_id: roomId,
    canvas_x: snag.canvasX,
    canvas_y: snag.canvasY,
    created_at: timestamp,
    id: snag.id,
    image_height: snag.imageHeight,
    image_path: isText ? null : storagePath,
    image_width: snag.imageWidth,
    ...(isText ? { kind: 'text' as const, text_value: snag.text ?? snag.title } : {}),
    layer_index: snag.layerIndex ?? 0,
    owner_id: currentMemberId,
    rotate: snag.rotate,
    size: snag.size,
    title: snag.title,
    updated_at: updatedTimestamp,
  };
}

export function createBoardSnagUpdate(snag: SnagItem, {
  updatedAt = Date.now(),
}: {
  updatedAt?: number;
} = {}) {
  const isText = snag.kind === 'text';

  return {
    canvas_x: snag.canvasX,
    canvas_y: snag.canvasY,
    image_height: snag.imageHeight,
    image_width: snag.imageWidth,
    ...(isText ? { kind: 'text' as const, text_value: snag.text ?? snag.title } : {}),
    layer_index: snag.layerIndex ?? 0,
    rotate: snag.rotate,
    size: snag.size,
    title: snag.title,
    updated_at: getIsoTime(updatedAt),
  };
}

export function mapBoardSnagRowsToSnags({
  publicUrlForPath,
  roomId,
  rows,
}: {
  publicUrlForPath: (path: string) => string;
  roomId: string;
  rows: SocialBoardSnagRow[];
}): SnagItem[] {
  return rows.reduce<SnagItem[]>((snags, row) => {
    const baseSnag = {
      canvasX: row.canvas_x,
      canvasY: row.canvas_y,
      category: roomId,
      createdAt: getTimeValue(row.created_at),
      id: row.id,
      ...(typeof row.image_height === 'number' ? { imageHeight: row.image_height } : {}),
      ...(typeof row.image_width === 'number' ? { imageWidth: row.image_width } : {}),
      layerIndex: typeof row.layer_index === 'number' ? row.layer_index : 0,
      rotate: row.rotate,
      size: row.size,
      title: row.title,
      updatedAt: getTimeValue(row.updated_at ?? row.created_at),
    };

    if (row.kind === 'text') {
      const text = row.text_value?.trim() || row.title.trim();

      if (!text) {
        return snags;
      }

      return [
        ...snags,
        {
        ...baseSnag,
        kind: 'text' as const,
        text,
        title: text,
        },
      ];
    }

    if (!row.image_path) {
      return snags;
    }

    return [
      ...snags,
      {
      ...baseSnag,
      imageUri: publicUrlForPath(row.image_path),
      },
    ];
  }, []);
}

export function createBoardStrokeInsert({
  currentMemberId,
  layerIndex = 0,
  roomId,
  stroke,
}: {
  currentMemberId: string;
  layerIndex?: number;
  roomId: string;
  stroke: SnagDrawingStroke;
}): SocialBoardStrokeRow {
  return {
    board_id: roomId,
    color: stroke.color,
    id: stroke.id,
    layer_index: layerIndex,
    owner_id: currentMemberId,
    points: stroke.points,
    width: stroke.width,
  };
}

export function mapBoardDrawingRowsToStrokes(rows: SocialBoardStrokeRow[]): SnagDrawingStroke[] {
  return rows
    .slice()
    .sort((left, right) => left.layer_index - right.layer_index)
    .map((row) => ({
      color: row.color,
      id: row.id,
      points: row.points,
      width: row.width,
    }));
}
