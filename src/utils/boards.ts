export type BoardRoom = {
  code: string;
  color: typeof BOARD_COLOR_OPTIONS[number];
  createdAt: number;
  id: string;
  kickedMemberIds?: string[];
  memberIds?: string[];
  memberNames?: Record<string, string>;
  ownerId?: string;
  title: string;
};

export type BoardCanvasMetrics = {
  canvasHeight: number;
  canvasWidth: number;
  gridSize: number;
  indicatorHeight: number;
  indicatorWidth: number;
};

export type BoardViewportIndicator = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type BoardMiniMapVisibilityConfig = {
  fadeInMs: number;
  fadeOutMs: number;
  hiddenOpacity: number;
  idleMs: number;
  visibleOpacity: number;
};

export type BoardPanStateCommitConfig = {
  stateCommitIntervalMs: number;
  visualDriver: 'animated-value';
};

export type BoardGridChromeConfig = {
  backgroundColor: string;
  lineColor: string;
};

export type BoardScrollOffset = {
  x: number;
  y: number;
};

export type BoardVisibleSnag = {
  canvasX: number;
  canvasY: number;
  imageHeight?: number;
  imageWidth?: number;
  size: number;
};

function roundBoardValue(value: number) {
  return Math.round(value * 100) / 100;
}

export const BOARD_COLOR_OPTIONS = [
  '#FFD6D6',
  '#FFE2BF',
  '#FFF3A8',
  '#DDF8B7',
  '#BFEAFF',
  '#E3D6FF',
  '#FFFFFF',
] as const;

export const LOCAL_BOARD_MEMBER_ID = 'local-board-member';
export const BOARD_INITIAL_SNAG_RENDER_LIMIT = 8;
export const BOARD_SNAG_RENDER_BATCH_SIZE = 10;
export const BOARD_ROOM_PREFETCH_LIMIT = 14;
export const BOARD_IDLE_WARMUP_DELAY_MS = 700;
export const BOARD_IDLE_WARMUP_PRIMARY_LIMIT = 16;
export const BOARD_IDLE_WARMUP_SECONDARY_LIMIT = 8;
export const BOARD_SOCIAL_LIMITS = {
  boardsCreatedPerMember: 2,
  boardsJoinedPerMember: 3,
  membersPerBoard: 8,
  snagsPerBoard: 60,
} as const;
export const SNAG_APP_DOWNLOAD_URL = 'https://apps.apple.com/app/id6789531333';

export type BoardLimitKind = keyof typeof BOARD_SOCIAL_LIMITS;

export type BoardLimitState = {
  canAddMember: boolean;
  canAddSnag: boolean;
  canCreateRoom: boolean;
  canJoinRoom: boolean;
  createdRoomCount: number;
  joinedRoomCount: number;
  memberCount: number;
  snagCount: number;
};

export type BoardMemberListItem = {
  id: string;
  isCurrentMember: boolean;
  label: string;
  role: 'Member' | 'Owner';
};

function getBoardColor(index: number) {
  const safeIndex = Math.max(0, Math.floor(index));

  return BOARD_COLOR_OPTIONS[safeIndex % BOARD_COLOR_OPTIONS.length];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSafeBoardString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getSafeBoardColor(value: unknown, index: number) {
  return typeof value === 'string' && BOARD_COLOR_OPTIONS.includes(value as typeof BOARD_COLOR_OPTIONS[number])
    ? value as typeof BOARD_COLOR_OPTIONS[number]
    : getBoardColor(index);
}

function getSafeBoardStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean),
  ));
}

function getSafeBoardMemberNames(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).reduce<[string, string][]>((names, [memberId, label]) => {
    const safeMemberId = memberId.trim();
    const safeLabel = typeof label === 'string' ? label.trim() : '';

    return safeMemberId && safeLabel ? [...names, [safeMemberId, safeLabel]] : names;
  }, []);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function normalizeBoardInviteCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

export function getRenderableBoardRooms(rooms: unknown[]): BoardRoom[] {
  if (!Array.isArray(rooms)) {
    return [];
  }

  return rooms.reduce<BoardRoom[]>((renderableRooms, room, index) => {
    if (!isRecord(room)) {
      return renderableRooms;
    }

    const title = getSafeBoardString(room.title, `Board ${index + 1}`);
    const ownerId = getSafeBoardString(room.ownerId, LOCAL_BOARD_MEMBER_ID);
    const memberIds = getSafeBoardStringList(room.memberIds);
    const memberIdsWithOwner = memberIds.includes(ownerId) ? memberIds : [ownerId, ...memberIds];
    const memberNames = getSafeBoardMemberNames(room.memberNames);
    const code = normalizeBoardInviteCode(typeof room.code === 'string' ? room.code : '') ||
      `SN${String(index + 1).padStart(4, '0')}`;

    return [
      ...renderableRooms,
      {
        code,
        color: getSafeBoardColor(room.color, index),
        createdAt: typeof room.createdAt === 'number' && Number.isFinite(room.createdAt) ? room.createdAt : 0,
        id: getSafeBoardString(room.id, `board-${index + 1}`),
        ...(Array.isArray(room.kickedMemberIds) ? { kickedMemberIds: getSafeBoardStringList(room.kickedMemberIds) } : {}),
        memberIds: memberIdsWithOwner,
        ...(memberNames ? { memberNames } : {}),
        ownerId,
        title,
      },
    ];
  }, []);
}

export function getBoardJoinFailureCopy() {
  return {
    message: 'Room not found.',
  };
}

export function getBoardInviteShareCopy({
  downloadUrl = SNAG_APP_DOWNLOAD_URL,
}: {
  downloadUrl?: string;
  inviteCode?: string;
}) {
  const lines = [
    'Start a Snag board with me.',
    '',
    `Get the app: ${downloadUrl}`,
  ];

  return {
    message: lines.join('\n'),
  };
}

export function createBoardRoom({
  createdAt = Date.now(),
  index,
}: {
  createdAt?: number;
  index: number;
}): BoardRoom {
  const roomNumber = Math.max(1, Math.floor(index) + 1);

  return {
    code: `SN${String(roomNumber).padStart(4, '0')}`,
    color: getBoardColor(index),
    createdAt,
    id: `board-${createdAt}-${index}`,
    memberIds: [LOCAL_BOARD_MEMBER_ID],
    ownerId: LOCAL_BOARD_MEMBER_ID,
    title: `Board ${roomNumber}`,
  };
}

export function createBoardRoomFromInviteCode({
  createdAt = Date.now(),
  index,
  inviteCode,
}: {
  createdAt?: number;
  index: number;
  inviteCode: string;
}): BoardRoom | null {
  const code = normalizeBoardInviteCode(inviteCode);

  if (!code) {
    return null;
  }

  const remoteOwnerId = `remote-owner-${code.toLowerCase()}`;

  return {
    code,
    color: getBoardColor(index),
    createdAt,
    id: `board-${code.toLowerCase()}-${createdAt}-${index}`,
    memberIds: [remoteOwnerId, LOCAL_BOARD_MEMBER_ID],
    ownerId: remoteOwnerId,
    title: `Board ${code}`,
  };
}

function getBoardRoomOwnerId(room: BoardRoom) {
  return room.ownerId ?? LOCAL_BOARD_MEMBER_ID;
}

function getBoardRoomMemberIds(room: BoardRoom) {
  const ownerId = getBoardRoomOwnerId(room);
  const memberIds = Array.isArray(room.memberIds) && room.memberIds.length > 0
    ? room.memberIds
    : [ownerId];

  return memberIds.includes(ownerId) ? memberIds : [ownerId, ...memberIds];
}

export function getBoardRoomMemberCount(room: BoardRoom) {
  return getBoardRoomMemberIds(room).length;
}

export function getBoardMemberList({
  currentMemberId = LOCAL_BOARD_MEMBER_ID,
  localProfileName,
  room,
}: {
  currentMemberId?: string;
  localProfileName?: string;
  room: BoardRoom;
}): BoardMemberListItem[] {
  const ownerId = getBoardRoomOwnerId(room);
  const localMemberLabel = localProfileName?.trim() || 'You';
  let guestIndex = 0;

  return getBoardRoomMemberIds(room).map((memberId) => {
    const isCurrentMember = memberId === currentMemberId;
    const isOwner = memberId === ownerId;
    const syncedMemberName = room.memberNames?.[memberId]?.trim();

    if (!isCurrentMember && !isOwner) {
      guestIndex += 1;
    }

    return {
      id: memberId,
      isCurrentMember,
      label: isCurrentMember
        ? localMemberLabel
        : syncedMemberName || (isOwner ? 'Host' : `Guest ${guestIndex}`),
      role: isOwner ? 'Owner' : 'Member',
    };
  });
}

export function getBoardEntryLoadingPresentation({
  currentMemberId = LOCAL_BOARD_MEMBER_ID,
  localProfileName,
  room,
}: {
  currentMemberId?: string;
  localProfileName?: string;
  room: BoardRoom;
}) {
  const members = getBoardMemberList({ currentMemberId, localProfileName, room });

  return {
    memberLabels: members.slice(0, 4).map((member) => member.label),
    message: `Entering ${room.title}...`,
    overflowCount: Math.max(0, members.length - 4),
    title: room.title,
  };
}

export function getBoardSocialDockIconOffsets({ roomOpen }: { roomOpen: boolean }) {
  return roomOpen ? [-17, 17] : [-7, 7];
}

export function canDeleteBoardRoom({
  currentMemberId = LOCAL_BOARD_MEMBER_ID,
  room,
}: {
  currentMemberId?: string;
  room: BoardRoom;
}) {
  return getBoardRoomOwnerId(room) === currentMemberId;
}

export function canLeaveBoardRoom({
  currentMemberId = LOCAL_BOARD_MEMBER_ID,
  room,
}: {
  currentMemberId?: string;
  room: BoardRoom;
}) {
  const memberIds = getBoardRoomMemberIds(room);

  return memberIds.includes(currentMemberId) && memberIds.length > 1;
}

export function canManageBoardMember({
  actorMemberId = LOCAL_BOARD_MEMBER_ID,
  room,
  targetMemberId,
}: {
  actorMemberId?: string;
  room: BoardRoom;
  targetMemberId: string;
}) {
  const ownerId = getBoardRoomOwnerId(room);
  const memberIds = getBoardRoomMemberIds(room);

  return actorMemberId === ownerId &&
    targetMemberId !== actorMemberId &&
    targetMemberId !== ownerId &&
    memberIds.includes(targetMemberId);
}

export function canOpenBoardMemberSafetyMenu({
  currentMemberId = LOCAL_BOARD_MEMBER_ID,
  targetMemberId,
}: {
  currentMemberId?: string;
  targetMemberId: string;
}) {
  return Boolean(targetMemberId && targetMemberId !== currentMemberId);
}

export function getBoardLimitState({
  currentMemberId = LOCAL_BOARD_MEMBER_ID,
  room,
  rooms,
  snagsInCurrentRoom = 0,
}: {
  currentMemberId?: string;
  room?: BoardRoom | null;
  rooms: BoardRoom[];
  snagsInCurrentRoom?: number;
}): BoardLimitState {
  const createdRoomCount = rooms.filter((joinedRoom) => getBoardRoomOwnerId(joinedRoom) === currentMemberId).length;
  const joinedRoomCount = rooms.length;
  const memberCount = room ? getBoardRoomMemberIds(room).length : 0;
  const snagCount = Math.max(0, Math.floor(snagsInCurrentRoom));

  return {
    canAddMember: memberCount < BOARD_SOCIAL_LIMITS.membersPerBoard,
    canAddSnag: snagCount < BOARD_SOCIAL_LIMITS.snagsPerBoard,
    canCreateRoom: createdRoomCount < BOARD_SOCIAL_LIMITS.boardsCreatedPerMember &&
      joinedRoomCount < BOARD_SOCIAL_LIMITS.boardsJoinedPerMember,
    canJoinRoom: joinedRoomCount < BOARD_SOCIAL_LIMITS.boardsJoinedPerMember,
    createdRoomCount,
    joinedRoomCount,
    memberCount,
    snagCount,
  };
}

export function getBoardLimitCopy(kind: BoardLimitKind) {
  switch (kind) {
    case 'boardsCreatedPerMember':
      return {
        message: `Free accounts can create up to ${BOARD_SOCIAL_LIMITS.boardsCreatedPerMember} boards for now.`,
        title: 'Board limit reached',
      };
    case 'boardsJoinedPerMember':
      return {
        message: `Free accounts can join up to ${BOARD_SOCIAL_LIMITS.boardsJoinedPerMember} boards, including boards you made.`,
        title: 'Board limit reached',
      };
    case 'membersPerBoard':
      return {
        message: `Free boards can have up to ${BOARD_SOCIAL_LIMITS.membersPerBoard} members for now.`,
        title: 'Board is full',
      };
    case 'snagsPerBoard':
      return {
        message: `Free boards can hold up to ${BOARD_SOCIAL_LIMITS.snagsPerBoard} Snags for now.`,
        title: 'Board is full',
      };
  }
}

export function shouldCloseBoardDrawingForBoardMenu({
  drawingRoomId,
  roomId,
}: {
  drawingRoomId: null | string;
  roomId: null | string;
}) {
  return Boolean(drawingRoomId && roomId && drawingRoomId === roomId);
}

export function getBoardLeaveConfirmationCopy({ roomTitle }: { roomTitle: string }) {
  return {
    cancelLabel: 'Stay',
    confirmLabel: 'Leave',
    message: `${roomTitle} will leave your boards. You can rejoin anytime with this room code.`,
    title: 'Leave board?',
  };
}

export function getBoardMemberActionCopy({ memberLabel }: { memberLabel: string }) {
  return {
    cancelLabel: 'Cancel',
    confirmLabel: 'Remove',
    message: "They won't be able to rejoin with this invite.",
    title: `Remove ${memberLabel} from this board?`,
  };
}

export function getBoardMemberReportCopy({ memberLabel }: { memberLabel: string }) {
  return {
    cancelLabel: 'Cancel',
    confirmLabel: 'Report',
    message: 'This sends a quiet safety report to Snag.',
    title: `Report ${memberLabel}?`,
  };
}

export function getBoardRoomAfterMemberLeave({
  memberId = LOCAL_BOARD_MEMBER_ID,
  room,
}: {
  memberId?: string;
  room: BoardRoom;
}) {
  const nextMemberIds = getBoardRoomMemberIds(room).filter((joinedMemberId) => joinedMemberId !== memberId);

  if (nextMemberIds.length === 0) {
    return null;
  }

  return {
    ...room,
    memberIds: nextMemberIds,
    ownerId: getBoardRoomOwnerId(room) === memberId ? nextMemberIds[0] : getBoardRoomOwnerId(room),
  };
}

export function transferBoardRoomOwnership({
  actorMemberId = LOCAL_BOARD_MEMBER_ID,
  room,
  targetMemberId,
}: {
  actorMemberId?: string;
  room: BoardRoom;
  targetMemberId: string;
}) {
  if (!canManageBoardMember({ actorMemberId, room, targetMemberId })) {
    return room;
  }

  return {
    ...room,
    ownerId: targetMemberId,
  };
}

export function getBoardRoomAfterMemberKick({
  actorMemberId = LOCAL_BOARD_MEMBER_ID,
  room,
  targetMemberId,
}: {
  actorMemberId?: string;
  room: BoardRoom;
  targetMemberId: string;
}) {
  if (!canManageBoardMember({ actorMemberId, room, targetMemberId })) {
    return room;
  }

  const kickedMemberIds = Array.from(new Set([...(room.kickedMemberIds ?? []), targetMemberId]));

  return {
    ...room,
    kickedMemberIds,
    memberIds: getBoardRoomMemberIds(room).filter((memberId) => memberId !== targetMemberId),
  };
}

export function renameBoardRoom({
  roomId,
  rooms,
  title,
}: {
  roomId: string;
  rooms: BoardRoom[];
  title: string;
}) {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return rooms;
  }

  return rooms.map((room) => (
    room.id === roomId
      ? { ...room, title: trimmedTitle }
      : room
  ));
}

export function updateBoardRoomColor({
  color,
  roomId,
  rooms,
}: {
  color: string;
  roomId: string;
  rooms: BoardRoom[];
}) {
  if (!BOARD_COLOR_OPTIONS.includes(color as typeof BOARD_COLOR_OPTIONS[number])) {
    return rooms;
  }

  return rooms.map((room) => (
    room.id === roomId
      ? { ...room, color: color as typeof BOARD_COLOR_OPTIONS[number] }
      : room
  ));
}

export function deleteBoardRoom({
  currentMemberId = LOCAL_BOARD_MEMBER_ID,
  roomId,
  rooms,
  selectedRoomId,
}: {
  currentMemberId?: string;
  roomId: string;
  rooms: BoardRoom[];
  selectedRoomId: null | string;
}) {
  const targetRoom = rooms.find((room) => room.id === roomId);

  if (targetRoom && !canDeleteBoardRoom({ currentMemberId, room: targetRoom })) {
    return {
      rooms,
      selectedRoomId,
    };
  }

  return {
    rooms: rooms.filter((room) => room.id !== roomId),
    selectedRoomId: selectedRoomId === roomId ? null : selectedRoomId,
  };
}

export function leaveBoardRoom({
  memberId = LOCAL_BOARD_MEMBER_ID,
  roomId,
  rooms,
  selectedRoomId,
}: {
  memberId?: string;
  roomId: string;
  rooms: BoardRoom[];
  selectedRoomId: null | string;
}) {
  const nextRooms = rooms.reduce<BoardRoom[]>((joinedRooms, room) => {
    if (room.id !== roomId) {
      return [...joinedRooms, room];
    }

    if (memberId === LOCAL_BOARD_MEMBER_ID) {
      return joinedRooms;
    }

    const nextRoom = getBoardRoomAfterMemberLeave({ memberId, room });

    return nextRoom ? [...joinedRooms, nextRoom] : joinedRooms;
  }, []);

  return {
    rooms: nextRooms,
    selectedRoomId: memberId === LOCAL_BOARD_MEMBER_ID && selectedRoomId === roomId ? null : selectedRoomId,
  };
}

export function deleteBoardSnagFromRoom<T extends { id: string }>({
  boardsByRoomId,
  roomId,
  snagId,
}: {
  boardsByRoomId: Record<string, T[]>;
  roomId: string;
  snagId: string;
}) {
  return {
    ...boardsByRoomId,
    [roomId]: (boardsByRoomId[roomId] ?? []).filter((snag) => snag.id !== snagId),
  };
}

export function addBoardDrawingStroke<T>({
  drawingsByRoomId,
  roomId,
  stroke,
}: {
  drawingsByRoomId: Record<string, T[]>;
  roomId: string;
  stroke: T;
}) {
  return {
    ...drawingsByRoomId,
    [roomId]: [...(drawingsByRoomId[roomId] ?? []), stroke],
  };
}

export function undoBoardDrawingStroke<T>({
  drawingsByRoomId,
  roomId,
}: {
  drawingsByRoomId: Record<string, T[]>;
  roomId: string;
}) {
  return {
    ...drawingsByRoomId,
    [roomId]: (drawingsByRoomId[roomId] ?? []).slice(0, -1),
  };
}

export function clearBoardDrawingStrokes<T>({
  drawingsByRoomId,
  roomId,
}: {
  drawingsByRoomId: Record<string, T[]>;
  roomId: string;
}) {
  return {
    ...drawingsByRoomId,
    [roomId]: [],
  };
}

export function getBoardCanvasMetrics({
  viewportHeight,
  viewportWidth,
}: {
  viewportHeight: number;
  viewportWidth: number;
}): BoardCanvasMetrics {
  return {
    canvasHeight: Math.round(Math.max(980, viewportHeight * 1.65)),
    canvasWidth: Math.round(Math.max(1180, viewportWidth * 2.7)),
    gridSize: 34,
    indicatorHeight: 62,
    indicatorWidth: 84,
  };
}

export function getBoardMiniMapVisibilityConfig(): BoardMiniMapVisibilityConfig {
  return {
    fadeInMs: 110,
    fadeOutMs: 280,
    hiddenOpacity: 0,
    idleMs: 760,
    visibleOpacity: 1,
  };
}

export function getBoardPanStateCommitConfig(): BoardPanStateCommitConfig {
  return {
    stateCommitIntervalMs: 96,
    visualDriver: 'animated-value',
  };
}

export function getBoardGridChromeConfig(): BoardGridChromeConfig {
  return {
    backgroundColor: '#FEFEFC',
    lineColor: 'rgba(23, 23, 23, 0.082)',
  };
}

export function getBoardViewportIndicator({
  canvasHeight,
  canvasWidth,
  offsetX,
  offsetY,
  viewportHeight,
  viewportWidth,
}: {
  canvasHeight: number;
  canvasWidth: number;
  offsetX: number;
  offsetY: number;
  viewportHeight: number;
  viewportWidth: number;
}): BoardViewportIndicator {
  const safeCanvasWidth = Math.max(1, canvasWidth);
  const safeCanvasHeight = Math.max(1, canvasHeight);
  const metrics = getBoardCanvasMetrics({
    viewportHeight,
    viewportWidth,
  });
  const width = Math.max(18, (viewportWidth / safeCanvasWidth) * metrics.indicatorWidth);
  const height = Math.max(18, (viewportHeight / safeCanvasHeight) * metrics.indicatorHeight);
  const maxLeft = metrics.indicatorWidth - width;
  const maxTop = metrics.indicatorHeight - height;
  const maxOffsetX = Math.max(1, safeCanvasWidth - viewportWidth);
  const maxOffsetY = Math.max(1, safeCanvasHeight - viewportHeight);

  return {
    height: roundBoardValue(height),
    left: roundBoardValue(Math.max(0, Math.min((offsetX / maxOffsetX) * maxLeft, maxLeft))),
    top: roundBoardValue(Math.max(0, Math.min((offsetY / maxOffsetY) * maxTop, maxTop))),
    width: roundBoardValue(width),
  };
}

function getBoardSnagFrameHeight(snag: BoardVisibleSnag) {
  const aspect = snag.imageWidth && snag.imageHeight
    ? snag.imageHeight / snag.imageWidth
    : 1;

  return snag.size * Math.max(0.55, Math.min(aspect, 1.45));
}

export function getVisibleBoardSnags<T extends BoardVisibleSnag>({
  offsetX,
  offsetY,
  overscan = 180,
  snags,
  viewportHeight,
  viewportWidth,
}: {
  offsetX: number;
  offsetY: number;
  overscan?: number;
  snags: T[];
  viewportHeight: number;
  viewportWidth: number;
}) {
  const left = offsetX - overscan;
  const top = offsetY - overscan;
  const right = offsetX + viewportWidth + overscan;
  const bottom = offsetY + viewportHeight + overscan;

  return snags.filter((snag) => {
    const snagLeft = snag.canvasX;
    const snagTop = snag.canvasY;
    const snagRight = snag.canvasX + snag.size;
    const snagBottom = snag.canvasY + getBoardSnagFrameHeight(snag);

    return snagRight >= left &&
      snagLeft <= right &&
      snagBottom >= top &&
      snagTop <= bottom;
  });
}

export function getProgressiveBoardSnags<T>({
  renderLimit,
  snags,
}: {
  renderLimit: number;
  snags: T[];
}) {
  const safeLimit = Math.max(0, Math.floor(renderLimit));

  if (safeLimit === 0) {
    return [];
  }

  if (snags.length <= safeLimit) {
    return snags;
  }

  return snags.slice(snags.length - safeLimit);
}

export function getNextBoardSnagRenderLimit({
  batchSize = BOARD_SNAG_RENDER_BATCH_SIZE,
  currentLimit,
  totalCount,
}: {
  batchSize?: number;
  currentLimit: number;
  totalCount: number;
}) {
  const safeBatchSize = Math.max(1, Math.floor(batchSize));
  const safeCurrentLimit = Math.max(0, Math.floor(currentLimit));
  const safeTotalCount = Math.max(0, Math.floor(totalCount));

  return Math.min(safeTotalCount, safeCurrentLimit + safeBatchSize);
}

export function getBoardRoomPrefetchSnags<T>({
  limit = BOARD_ROOM_PREFETCH_LIMIT,
  snags,
}: {
  limit?: number;
  snags: T[];
}) {
  return getProgressiveBoardSnags({
    renderLimit: limit,
    snags,
  });
}

export function getBoardWarmupRoomKey<T extends { id: string; imageUri?: string }>({
  limit = BOARD_IDLE_WARMUP_PRIMARY_LIMIT,
  roomId,
  snags,
}: {
  limit?: number;
  roomId: string;
  snags: T[];
}) {
  const warmupSnags = getBoardRoomPrefetchSnags({
    limit,
    snags,
  });

  return `${roomId}:${snags.length}:${warmupSnags.map((snag) => `${snag.id}:${snag.imageUri ?? ''}`).join('|')}`;
}

export function getNextBoardWarmupRequest<
  Room extends { createdAt?: number; id: string },
  Snag extends { id: string; imageUri?: string },
>({
  rooms,
  selectedRoomId,
  snagsByRoomId,
  warmedRoomKeys,
}: {
  rooms: Room[];
  selectedRoomId?: null | string;
  snagsByRoomId: Record<string, Snag[]>;
  warmedRoomKeys: string[];
}) {
  const warmedKeys = new Set(warmedRoomKeys);
  const newestRooms = [...rooms].sort((left, right) => (
    (right.createdAt ?? 0) - (left.createdAt ?? 0)
  ));
  const selectedRoom = selectedRoomId
    ? rooms.find((room) => room.id === selectedRoomId)
    : undefined;
  const warmupQueue = selectedRoom
    ? [selectedRoom, ...newestRooms.filter((room) => room.id !== selectedRoom.id)]
    : newestRooms;

  for (const room of warmupQueue) {
    const roomSnags = snagsByRoomId[room.id] ?? [];

    if (roomSnags.length === 0) {
      continue;
    }

    const isSelectedRoom = room.id === selectedRoomId;
    const limit = isSelectedRoom ? BOARD_IDLE_WARMUP_PRIMARY_LIMIT : BOARD_IDLE_WARMUP_SECONDARY_LIMIT;
    const key = getBoardWarmupRoomKey({
      limit,
      roomId: room.id,
      snags: roomSnags,
    });

    if (!warmedKeys.has(key)) {
      return {
        key,
        limit,
        roomId: room.id,
      };
    }
  }

  return null;
}

export function getNextBoardScrollOffset({
  axis,
  currentOffset,
  value,
}: {
  axis: 'x' | 'y';
  currentOffset: BoardScrollOffset;
  value: null | number | undefined;
}): BoardScrollOffset {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return currentOffset;
  }

  return {
    ...currentOffset,
    [axis]: value,
  };
}

export function getNextBoardPanOffset({
  canvasHeight,
  canvasWidth,
  deltaX,
  deltaY,
  startOffset,
  viewportHeight,
  viewportWidth,
}: {
  canvasHeight: number;
  canvasWidth: number;
  deltaX: number;
  deltaY: number;
  startOffset: BoardScrollOffset;
  viewportHeight: number;
  viewportWidth: number;
}): BoardScrollOffset {
  const maxX = Math.max(0, canvasWidth - viewportWidth);
  const maxY = Math.max(0, canvasHeight - viewportHeight);

  return {
    x: roundBoardValue(Math.max(0, Math.min(startOffset.x - deltaX, maxX))),
    y: roundBoardValue(Math.max(0, Math.min(startOffset.y - deltaY, maxY))),
  };
}

export function shouldStartBoardPanGesture({
  activeRoomId,
  drawingActive,
  draggingSnagId,
  scrollOffsetX,
  translationX,
  translationY,
}: {
  activeRoomId: null | string;
  drawingActive: boolean;
  draggingSnagId: null | string;
  scrollOffsetX: number;
  translationX: number;
  translationY: number;
}) {
  if (drawingActive || draggingSnagId !== null) {
    return false;
  }

  const horizontalDistance = Math.abs(translationX);
  const verticalDistance = Math.abs(translationY);
  const shouldStartSurfaceSwipe = scrollOffsetX <= 12 &&
    translationX > 0 &&
    horizontalDistance >= 10 &&
    horizontalDistance >= verticalDistance * 0.5;

  if (shouldStartSurfaceSwipe) {
    return true;
  }

  if (!activeRoomId) {
    return false;
  }

  return Math.max(horizontalDistance, verticalDistance) >= 6;
}
