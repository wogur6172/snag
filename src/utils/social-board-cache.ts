import type { SnagDrawingStroke, SnagItem } from '../data/snags';
import type { BoardRoom } from './boards';

export const SOCIAL_BOARD_CACHE_VERSION = 1;

export type SocialBoardCacheState = {
  drawingsByRoomId: Record<string, SnagDrawingStroke[]>;
  rooms: BoardRoom[];
  savedAt: number;
  snagsByRoomId: Record<string, SnagItem[]>;
};

export type SocialBoardCacheSnapshot = SocialBoardCacheState & {
  version: typeof SOCIAL_BOARD_CACHE_VERSION;
};

type SocialBoardSnapshotLike = Omit<SocialBoardCacheState, 'savedAt'> & {
  savedAt?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).reduce<[string, string][]>((normalizedEntries, [key, item]) => {
    if (!key || !isString(item)) {
      return normalizedEntries;
    }

    const normalizedItem = item.trim();

    return normalizedItem
      ? [...normalizedEntries, [key, normalizedItem]]
      : normalizedEntries;
  }, []);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeRooms(value: unknown): BoardRoom[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<BoardRoom[]>((rooms, candidate) => {
    if (
      !isRecord(candidate) ||
      !isString(candidate.code) ||
      !isString(candidate.color) ||
      !isNumber(candidate.createdAt) ||
      !isString(candidate.id) ||
      !isString(candidate.title)
    ) {
      return rooms;
    }

    const memberNames = normalizeStringRecord(candidate.memberNames);

    return [
      ...rooms,
      {
        code: candidate.code,
        color: candidate.color as BoardRoom['color'],
        createdAt: candidate.createdAt,
        id: candidate.id,
        memberIds: Array.isArray(candidate.memberIds)
          ? candidate.memberIds.filter(isString)
          : undefined,
        ...(memberNames ? { memberNames } : {}),
        ownerId: isString(candidate.ownerId) ? candidate.ownerId : undefined,
        title: candidate.title,
      },
    ];
  }, []);
}

function normalizeSnags(value: unknown): SnagItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<SnagItem[]>((snags, candidate) => {
    const candidateKind = candidate.kind === 'text' ? 'text' : 'image';
    const candidateText = isString(candidate.text) ? candidate.text.trim() : '';

    if (
      !isRecord(candidate) ||
      !isString(candidate.category) ||
      !isString(candidate.id) ||
      !isString(candidate.rotate) ||
      !isString(candidate.title) ||
      !isNumber(candidate.canvasX) ||
      !isNumber(candidate.canvasY) ||
      !isNumber(candidate.createdAt) ||
      !isNumber(candidate.size)
    ) {
      return snags;
    }

    if (candidateKind === 'image' && !isString(candidate.imageUri)) {
      return snags;
    }

    if (candidateKind === 'text' && !candidateText) {
      return snags;
    }

    return [
      ...snags,
      {
        canvasX: candidate.canvasX,
        canvasY: candidate.canvasY,
        category: candidate.category,
        createdAt: candidate.createdAt,
        ...(candidate.excludeFromAll === true ? { excludeFromAll: true } : {}),
        id: candidate.id,
        ...(isNumber(candidate.imageHeight) ? { imageHeight: candidate.imageHeight } : {}),
        ...(isString(candidate.imageUri) ? { imageUri: candidate.imageUri } : {}),
        ...(isNumber(candidate.imageWidth) ? { imageWidth: candidate.imageWidth } : {}),
        ...(candidateKind === 'text' ? { kind: 'text' as const, text: candidateText } : {}),
        ...(isNumber(candidate.layerIndex) ? { layerIndex: candidate.layerIndex } : {}),
        ...(isString(candidate.originSnagId) ? { originSnagId: candidate.originSnagId } : {}),
        ...(isString(candidate.ownerId) ? { ownerId: candidate.ownerId } : {}),
        ...(candidate.pendingSync === true ? { pendingSync: true } : {}),
        rotate: candidate.rotate,
        size: candidate.size,
        title: candidate.title,
        ...(isNumber(candidate.updatedAt) ? { updatedAt: candidate.updatedAt } : {}),
      },
    ];
  }, []);
}

function normalizeDrawings(value: unknown): SnagDrawingStroke[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<SnagDrawingStroke[]>((strokes, candidate) => {
    if (!isRecord(candidate) || !isString(candidate.color) || !isString(candidate.id) || !isNumber(candidate.width)) {
      return strokes;
    }

    if (!Array.isArray(candidate.points)) {
      return strokes;
    }

    const points = candidate.points
      .filter(isRecord)
      .map((point) => ({
        x: isNumber(point.x) ? point.x : Number.NaN,
        y: isNumber(point.y) ? point.y : Number.NaN,
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

    if (points.length < 2) {
      return strokes;
    }

    return [
      ...strokes,
      {
        color: candidate.color,
        id: candidate.id,
        points,
        width: candidate.width,
      },
    ];
  }, []);
}

function normalizeRecord<T>(
  value: unknown,
  normalizeItems: (items: unknown) => T[],
): Record<string, T[]> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, T[]>>((itemsById, [id, items]) => {
    const normalizedItems = normalizeItems(items);

    if (!id || normalizedItems.length === 0) {
      return itemsById;
    }

    return {
      ...itemsById,
      [id]: normalizedItems,
    };
  }, {});
}

export function createSocialBoardCacheSnapshot({
  drawingsByRoomId,
  rooms,
  savedAt = Date.now(),
  snagsByRoomId,
}: SocialBoardCacheState): SocialBoardCacheSnapshot {
  return {
    drawingsByRoomId: normalizeRecord(drawingsByRoomId, normalizeDrawings),
    rooms: normalizeRooms(rooms),
    savedAt,
    snagsByRoomId: normalizeRecord(snagsByRoomId, normalizeSnags),
    version: SOCIAL_BOARD_CACHE_VERSION,
  };
}

export function parseSocialBoardCacheSnapshot(rawSnapshot: unknown): SocialBoardCacheState | null {
  try {
    const snapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;

    if (!isRecord(snapshot) || snapshot.version !== SOCIAL_BOARD_CACHE_VERSION) {
      return null;
    }

    return {
      drawingsByRoomId: normalizeRecord(snapshot.drawingsByRoomId, normalizeDrawings),
      rooms: normalizeRooms(snapshot.rooms),
      savedAt: isNumber(snapshot.savedAt) ? snapshot.savedAt : 0,
      snagsByRoomId: normalizeRecord(snapshot.snagsByRoomId, normalizeSnags),
    };
  } catch {
    return null;
  }
}

function getSnagUpdatedAt(snag: SnagItem) {
  return typeof snag.updatedAt === 'number' && Number.isFinite(snag.updatedAt)
    ? snag.updatedAt
    : snag.createdAt;
}

function mergeRoomSnagsWithLocalCache({
  cachedSnags,
  cloudSnags,
}: {
  cachedSnags: SnagItem[];
  cloudSnags: SnagItem[];
}) {
  const cachedSnagsById = new Map(cachedSnags.map((snag) => [snag.id, snag]));
  const cloudSnagIds = new Set(cloudSnags.map((snag) => snag.id));
  const localOnlyPendingSnags = cachedSnags.filter((snag) => snag.pendingSync === true && !cloudSnagIds.has(snag.id));

  return [
    ...cloudSnags.map((cloudSnag) => {
    const cachedSnag = cachedSnagsById.get(cloudSnag.id);

    if (!cachedSnag) {
      return cloudSnag;
    }

    return getSnagUpdatedAt(cachedSnag) > getSnagUpdatedAt(cloudSnag)
      ? {
          ...cloudSnag,
          canvasX: cachedSnag.canvasX,
          canvasY: cachedSnag.canvasY,
          layerIndex: cachedSnag.layerIndex,
          rotate: cachedSnag.rotate,
          size: cachedSnag.size,
          updatedAt: cachedSnag.updatedAt,
        }
      : cloudSnag;
    }),
    ...localOnlyPendingSnags,
  ];
}

export function mergeSocialBoardSnapshotWithLocalCache({
  cloudSnapshot,
  localCache,
}: {
  cloudSnapshot: SocialBoardSnapshotLike;
  localCache: SocialBoardSnapshotLike | null;
}): SocialBoardCacheState {
  if (!localCache) {
    return {
      ...cloudSnapshot,
      savedAt: cloudSnapshot.savedAt ?? Date.now(),
    };
  }

  return {
    ...cloudSnapshot,
    savedAt: cloudSnapshot.savedAt ?? Date.now(),
    snagsByRoomId: Object.fromEntries(cloudSnapshot.rooms.map((room) => [
      room.id,
      mergeRoomSnagsWithLocalCache({
        cachedSnags: localCache.snagsByRoomId[room.id] ?? [],
        cloudSnags: cloudSnapshot.snagsByRoomId[room.id] ?? [],
      }),
    ])),
  };
}
