import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addBoardDrawingStroke,
  BOARD_COLOR_OPTIONS,
  BOARD_IDLE_WARMUP_PRIMARY_LIMIT,
  BOARD_IDLE_WARMUP_SECONDARY_LIMIT,
  BOARD_SOCIAL_LIMITS,
  canDeleteBoardRoom,
  canLeaveBoardRoom,
  canManageBoardMember,
  canOpenBoardMemberSafetyMenu,
  clearBoardDrawingStrokes,
  createBoardRoom,
  createBoardRoomFromInviteCode,
  deleteBoardSnagFromRoom,
  deleteBoardRoom,
  getBoardMemberReportCopy,
  getBoardMemberActionCopy,
  getBoardLeaveConfirmationCopy,
  getBoardMemberList,
  getBoardRoomMemberCount,
  getBoardSocialDockIconOffsets,
  getBoardLimitCopy,
  getBoardLimitState,
  getBoardRoomPrefetchSnags,
  getNextBoardWarmupRequest,
  getBoardRoomAfterMemberLeave,
  getBoardRoomAfterMemberKick,
  getBoardCanvasMetrics,
  getBoardGridChromeConfig,
  getBoardInviteShareCopy,
  getBoardJoinFailureCopy,
  getBoardEntryLoadingPresentation,
  getRenderableBoardRooms,
  getBoardMiniMapVisibilityConfig,
  getNextEdgePanOffset,
  getProgressiveBoardSnags,
  getVisibleBoardSnags,
  getNextBoardSnagRenderLimit,
  getNextBoardPanOffset,
  getBoardPanStateCommitConfig,
  getNextBoardScrollOffset,
  getViewportCenteredSnagPresentation,
  getBoardViewportIndicator,
  leaveBoardRoom,
  LOCAL_BOARD_MEMBER_ID,
  normalizeBoardInviteCode,
  renameBoardRoom,
  shouldCloseBoardDrawingForBoardMenu,
  shouldStartBoardPanGesture,
  SNAG_APP_DOWNLOAD_URL,
  transferBoardRoomOwnership,
  undoBoardDrawingStroke,
  updateBoardMemberDisplayName,
  updateBoardRoomColor,
} from '../src/utils/boards.ts';

describe('social board rooms', () => {
  it('creates a local room with a readable invite code', () => {
    assert.deepEqual(
      createBoardRoom({
        createdAt: 1710000000000,
        index: 0,
      }),
      {
        code: 'SN0001',
        color: BOARD_COLOR_OPTIONS[0],
        createdAt: 1710000000000,
        id: 'board-1710000000000-0',
        memberIds: [LOCAL_BOARD_MEMBER_ID],
        ownerId: LOCAL_BOARD_MEMBER_ID,
        title: 'Board 1',
      },
    );
  });

  it('normalizes invite codes for joining rooms', () => {
    assert.equal(normalizeBoardInviteCode(' sn 12-ab '), 'SN12AB');
    assert.equal(normalizeBoardInviteCode(''), '');
    assert.deepEqual(getBoardJoinFailureCopy(), {
      message: 'Room not found.',
    });
  });

  it('shares Snag as an app download without room-specific join codes', () => {
    assert.equal(SNAG_APP_DOWNLOAD_URL, 'https://apps.apple.com/app/id6789531333');
    const copy = getBoardInviteShareCopy({
      inviteCode: 'SN0001',
    });

    assert.deepEqual(copy, {
      message: [
        'Start a Snag board with me.',
        '',
        'Get the app: https://apps.apple.com/app/id6789531333',
      ].join('\n'),
    });
    assert.equal(copy.message.includes('Already in?'), false);
    assert.equal(copy.message.includes('SN0001'), false);
  });

  it('creates a local room shell from an invite code before cloud sync exists', () => {
    assert.deepEqual(
      createBoardRoomFromInviteCode({
        createdAt: 1710000000500,
        index: 2,
        inviteCode: ' sn 88 ',
      }),
      {
        code: 'SN88',
        color: BOARD_COLOR_OPTIONS[2],
        createdAt: 1710000000500,
        id: 'board-sn88-1710000000500-2',
        memberIds: ['remote-owner-sn88', LOCAL_BOARD_MEMBER_ID],
        ownerId: 'remote-owner-sn88',
        title: 'Board SN88',
      },
    );
    assert.equal(createBoardRoomFromInviteCode({ index: 2, inviteCode: '' }), null);
  });

  it('renames and deletes board rooms while preserving other joined rooms', () => {
    const rooms = [
      createBoardRoom({ createdAt: 1710000000000, index: 0 }),
      createBoardRoom({ createdAt: 1710000000100, index: 1 }),
    ];

    assert.equal(renameBoardRoom({ roomId: rooms[0].id, rooms, title: '  Weekend chaos  ' })[0].title, 'Weekend chaos');
    assert.equal(renameBoardRoom({ roomId: rooms[0].id, rooms, title: '   ' })[0].title, 'Board 1');
    assert.ok(BOARD_COLOR_OPTIONS.includes('#FFFFFF'));
    assert.equal(updateBoardRoomColor({ color: BOARD_COLOR_OPTIONS[4], roomId: rooms[1].id, rooms })[1].color, BOARD_COLOR_OPTIONS[4]);
    assert.equal(updateBoardRoomColor({ color: '#123456', roomId: rooms[1].id, rooms })[1].color, BOARD_COLOR_OPTIONS[1]);

    assert.deepEqual(
      deleteBoardRoom({
        roomId: rooms[0].id,
        rooms,
        selectedRoomId: rooms[0].id,
      }),
      {
        rooms: [rooms[1]],
        selectedRoomId: null,
      },
    );
  });

  it('only lets the current owner delete a board room', () => {
    const ownedRoom = createBoardRoom({ createdAt: 1710000000000, index: 0 });
    const joinedRoom = createBoardRoomFromInviteCode({
      createdAt: 1710000000500,
      index: 1,
      inviteCode: 'SN55',
    });

    assert.ok(joinedRoom);
    assert.equal(canDeleteBoardRoom({ room: ownedRoom }), true);
    assert.equal(canDeleteBoardRoom({ room: joinedRoom }), false);
    assert.deepEqual(
      deleteBoardRoom({
        roomId: joinedRoom.id,
        rooms: [joinedRoom],
        selectedRoomId: joinedRoom.id,
      }),
      {
        rooms: [joinedRoom],
        selectedRoomId: joinedRoom.id,
      },
    );
  });

  it('disables leaving a board room when the current member is alone', () => {
    const soloRoom = createBoardRoom({ createdAt: 1710000000000, index: 0 });
    const sharedRoom = {
      ...soloRoom,
      memberIds: [LOCAL_BOARD_MEMBER_ID, 'friend'],
    };

    assert.equal(canLeaveBoardRoom({ room: soloRoom }), false);
    assert.equal(canLeaveBoardRoom({ room: sharedRoom }), true);
  });

  it('closes board drawing mode before opening the board edit menu', () => {
    assert.equal(shouldCloseBoardDrawingForBoardMenu({
      drawingRoomId: 'board-1',
      roomId: 'board-1',
    }), true);
    assert.equal(shouldCloseBoardDrawingForBoardMenu({
      drawingRoomId: 'board-2',
      roomId: 'board-1',
    }), false);
    assert.equal(shouldCloseBoardDrawingForBoardMenu({
      drawingRoomId: null,
      roomId: 'board-1',
    }), false);
  });

  it('warns before leaving a board room without deleting it', () => {
    assert.deepEqual(getBoardLeaveConfirmationCopy({ roomTitle: 'Board 1' }), {
      cancelLabel: 'Stay',
      confirmLabel: 'Leave',
      message: 'Board 1 will leave your boards. You can rejoin anytime with this room code.',
      title: 'Leave board?',
    });
  });

  it('shows board room members with stable local labels and owner role', () => {
    const localRoom = createBoardRoom({ createdAt: 1710000000000, index: 0 });
    const joinedRoom = createBoardRoomFromInviteCode({
      createdAt: 1710000000500,
      index: 1,
      inviteCode: 'SN55',
    });

    assert.deepEqual(getBoardMemberList({ room: localRoom }), [
      {
        id: LOCAL_BOARD_MEMBER_ID,
        isCurrentMember: true,
        label: 'You',
        role: 'Owner',
      },
    ]);
    assert.ok(joinedRoom);
    assert.deepEqual(getBoardMemberList({ room: joinedRoom }), [
      {
        id: 'remote-owner-sn55',
        isCurrentMember: false,
        label: 'Host',
        role: 'Owner',
      },
      {
        id: LOCAL_BOARD_MEMBER_ID,
        isCurrentMember: true,
        label: 'You',
        role: 'Member',
      },
    ]);
  });

  it('uses the local profile name in board room member lists', () => {
    const localRoom = createBoardRoom({ createdAt: 1710000000000, index: 0 });

    assert.deepEqual(getBoardMemberList({ localProfileName: 'Jae', room: localRoom }), [
      {
        id: LOCAL_BOARD_MEMBER_ID,
        isCurrentMember: true,
        label: 'Jae',
        role: 'Owner',
      },
    ]);
  });

  it('updates a renamed member in every joined room without mutating the old rooms', () => {
    const joinedRooms = [
      {
        ...createBoardRoom({ createdAt: 1710000000000, index: 0 }),
        memberIds: ['profile-jae', 'profile-friend'],
        memberNames: {
          'profile-friend': 'Mina',
          'profile-jae': 'Old Name',
        },
        ownerId: 'profile-jae',
      },
      {
        ...createBoardRoom({ createdAt: 1710000000500, index: 1 }),
        memberIds: ['profile-friend', 'profile-jae'],
        memberNames: {
          'profile-jae': 'Old Name',
        },
        ownerId: 'profile-friend',
      },
    ];

    const renamedRooms = updateBoardMemberDisplayName({
      displayName: '  New   Name  ',
      memberId: 'profile-jae',
      rooms: joinedRooms,
    });

    assert.equal(renamedRooms[0].memberNames['profile-jae'], 'New Name');
    assert.equal(renamedRooms[1].memberNames['profile-jae'], 'New Name');
    assert.equal(renamedRooms[0].memberNames['profile-friend'], 'Mina');
    assert.equal(joinedRooms[0].memberNames['profile-jae'], 'Old Name');
  });

  it('uses synced member names before role fallback labels', () => {
    const joinedRoom = {
      ...createBoardRoom({ createdAt: 1710000000000, index: 0 }),
      memberIds: ['profile-host', 'profile-jae', 'profile-friend'],
      memberNames: {
        'profile-friend': 'Mina',
        'profile-host': 'Alex',
      },
      ownerId: 'profile-host',
    };

    assert.deepEqual(getBoardMemberList({
      currentMemberId: 'profile-jae',
      localProfileName: 'Jae',
      room: joinedRoom,
    }), [
      {
        id: 'profile-host',
        isCurrentMember: false,
        label: 'Alex',
        role: 'Owner',
      },
      {
        id: 'profile-jae',
        isCurrentMember: true,
        label: 'Jae',
        role: 'Member',
      },
      {
        id: 'profile-friend',
        isCurrentMember: false,
        label: 'Mina',
        role: 'Member',
      },
    ]);
    assert.equal(getBoardRoomMemberCount(joinedRoom), 3);
  });

  it('builds a lightweight board entry loading presentation with room and member names', () => {
    const room = {
      ...createBoardRoom({ createdAt: 1710000000000, index: 0 }),
      memberIds: ['profile-host', 'profile-jae', 'profile-friend', 'profile-extra', 'profile-last'],
      memberNames: {
        'profile-extra': 'Sol',
        'profile-friend': 'Mina',
        'profile-host': 'Alex',
        'profile-last': 'Rio',
      },
      ownerId: 'profile-host',
      title: 'Weekend Shelf',
    };

    assert.deepEqual(getBoardEntryLoadingPresentation({
      currentMemberId: 'profile-jae',
      localProfileName: 'Jae',
      room,
    }), {
      memberLabels: ['Alex', 'Jae', 'Mina', 'Sol'],
      message: 'Entering Weekend Shelf...',
      overflowCount: 1,
      title: 'Weekend Shelf',
    });
  });

  it('splits the social dock people apart when a board room is open', () => {
    assert.deepEqual(getBoardSocialDockIconOffsets({ roomOpen: false }), [-7, 7]);
    assert.deepEqual(getBoardSocialDockIconOffsets({ roomOpen: true }), [-17, 17]);
  });

  it('normalizes unsafe cached board rooms before rendering the room list', () => {
    const [room] = getRenderableBoardRooms([
      {
        code: null,
        color: 'not-a-board-color',
        createdAt: Number.NaN,
        id: '  board-1  ',
        memberIds: ['owner', null, 'friend', 'friend'],
        memberNames: {
          friend: ' Mina ',
          owner: 123,
        },
        ownerId: ' owner ',
        title: { bad: true },
      },
    ]);

    assert.deepEqual(room, {
      code: 'SN0001',
      color: BOARD_COLOR_OPTIONS[0],
      createdAt: 0,
      id: 'board-1',
      memberIds: ['owner', 'friend'],
      memberNames: {
        friend: 'Mina',
      },
      ownerId: 'owner',
      title: 'Board 1',
    });
    assert.equal(getBoardRoomMemberCount(room), 2);
  });

  it('delegates ownership to the earliest remaining member when the owner leaves', () => {
    const room = {
      ...createBoardRoom({ createdAt: 1710000000000, index: 0 }),
      memberIds: ['host', 'first-guest', 'second-guest'],
      ownerId: 'host',
    };

    assert.deepEqual(getBoardRoomAfterMemberLeave({ memberId: 'host', room }), {
      ...room,
      memberIds: ['first-guest', 'second-guest'],
      ownerId: 'first-guest',
    });
    assert.deepEqual(
      leaveBoardRoom({
        roomId: room.id,
        rooms: [room],
        selectedRoomId: room.id,
      }),
      {
        rooms: [],
        selectedRoomId: null,
      },
    );
    assert.deepEqual(
      leaveBoardRoom({
        memberId: 'host',
        roomId: room.id,
        rooms: [room],
        selectedRoomId: room.id,
      }),
      {
        rooms: [
          {
            ...room,
            memberIds: ['first-guest', 'second-guest'],
            ownerId: 'first-guest',
          },
        ],
        selectedRoomId: room.id,
      },
    );
  });

  it('lets the owner transfer ownership without changing membership order', () => {
    const room = {
      ...createBoardRoom({ createdAt: 1710000000000, index: 0 }),
      memberIds: ['host', 'first-guest', 'second-guest'],
      ownerId: 'host',
    };

    assert.equal(canManageBoardMember({
      actorMemberId: 'host',
      room,
      targetMemberId: 'first-guest',
    }), true);
    assert.equal(canManageBoardMember({
      actorMemberId: 'first-guest',
      room,
      targetMemberId: 'second-guest',
    }), false);
    assert.equal(canManageBoardMember({
      actorMemberId: 'host',
      room,
      targetMemberId: 'host',
    }), false);
    assert.deepEqual(transferBoardRoomOwnership({
      actorMemberId: 'host',
      room,
      targetMemberId: 'first-guest',
    }), {
      ...room,
      ownerId: 'first-guest',
    });
    assert.equal(transferBoardRoomOwnership({
      actorMemberId: 'second-guest',
      room,
      targetMemberId: 'first-guest',
    }), room);
  });

  it('lets the owner kick a member and keeps them blocked from the invite', () => {
    const room = {
      ...createBoardRoom({ createdAt: 1710000000000, index: 0 }),
      memberIds: ['host', 'first-guest', 'second-guest'],
      ownerId: 'host',
    };

    assert.deepEqual(getBoardRoomAfterMemberKick({
      actorMemberId: 'host',
      room,
      targetMemberId: 'first-guest',
    }), {
      ...room,
      kickedMemberIds: ['first-guest'],
      memberIds: ['host', 'second-guest'],
    });
    assert.equal(getBoardRoomAfterMemberKick({
      actorMemberId: 'host',
      room,
      targetMemberId: 'host',
    }), room);
    assert.deepEqual(getBoardMemberActionCopy({ memberLabel: 'Guest 1' }), {
      cancelLabel: 'Cancel',
      confirmLabel: 'Remove',
      message: "They won't be able to rejoin with this invite.",
      title: 'Remove Guest 1 from this board?',
    });
  });

  it('lets any member quietly report another member without adding personal blocks', () => {
    const room = {
      ...createBoardRoom({ createdAt: 1710000000000, index: 0 }),
      memberIds: ['host', 'first-guest', 'second-guest'],
      ownerId: 'host',
    };

    assert.equal(canOpenBoardMemberSafetyMenu({
      currentMemberId: 'first-guest',
      targetMemberId: 'second-guest',
    }), true);
    assert.equal(canOpenBoardMemberSafetyMenu({
      currentMemberId: 'first-guest',
      targetMemberId: 'first-guest',
    }), false);
    assert.deepEqual(getBoardMemberReportCopy({ memberLabel: 'Guest 2' }), {
      cancelLabel: 'Cancel',
      confirmLabel: 'Report',
      message: 'This sends a quiet safety report to Snag.',
      title: 'Report Guest 2?',
    });
  });

  it('uses Free social limits for boards, joined rooms, members, and board Snags', () => {
    const ownedRoom = {
      ...createBoardRoom({ createdAt: 1710000000000, index: 0 }),
      ownerId: 'profile-jae',
    };
    const joinedRoom = {
      ...createBoardRoom({ createdAt: 1710000001000, index: 1 }),
      ownerId: 'profile-friend',
    };
    const fullRoom = {
      ...createBoardRoom({ createdAt: 1710000002000, index: 2 }),
      memberIds: Array.from({ length: BOARD_SOCIAL_LIMITS.membersPerBoard }, (_, index) => `member-${index}`),
      ownerId: 'member-0',
    };

    assert.deepEqual(BOARD_SOCIAL_LIMITS, {
      boardsCreatedPerMember: 2,
      boardsJoinedPerMember: 3,
      membersPerBoard: 8,
      snagsPerBoard: 60,
    });
    assert.equal(getBoardLimitState({
      currentMemberId: 'profile-jae',
      rooms: [ownedRoom, { ...ownedRoom, id: 'owned-2' }, joinedRoom],
      snagsInCurrentRoom: 60,
    }).canCreateRoom, false);
    assert.equal(getBoardLimitState({
      currentMemberId: 'profile-jae',
      rooms: [ownedRoom, joinedRoom, { ...joinedRoom, id: 'joined-2' }],
      snagsInCurrentRoom: 12,
    }).canJoinRoom, false);
    assert.equal(getBoardLimitState({
      currentMemberId: 'profile-jae',
      room: fullRoom,
      rooms: [fullRoom],
      snagsInCurrentRoom: 12,
    }).canAddMember, false);
    assert.equal(getBoardLimitState({
      currentMemberId: 'profile-jae',
      room: ownedRoom,
      rooms: [ownedRoom],
      snagsInCurrentRoom: 60,
    }).canAddSnag, false);
    assert.deepEqual(getBoardLimitCopy('snagsPerBoard'), {
      message: 'Free boards can hold up to 60 Snags for now.',
      title: 'Board is full',
    });
  });

  it('deletes one snag from the selected board room without touching other rooms', () => {
    const boardsByRoomId = {
      'board-1': [
        { id: 'snag-a', title: 'A' },
        { id: 'snag-b', title: 'B' },
      ],
      'board-2': [
        { id: 'snag-a', title: 'A elsewhere' },
      ],
    };

    assert.deepEqual(
      deleteBoardSnagFromRoom({
        boardsByRoomId,
        roomId: 'board-1',
        snagId: 'snag-a',
      }),
      {
        'board-1': [
          { id: 'snag-b', title: 'B' },
        ],
        'board-2': [
          { id: 'snag-a', title: 'A elsewhere' },
        ],
      },
    );
  });

  it('stores drawing strokes per board room', () => {
    const firstStroke = { id: 'stroke-1', points: [{ x: 10, y: 12 }] };
    const secondStroke = { id: 'stroke-2', points: [{ x: 18, y: 24 }] };
    const drawings = addBoardDrawingStroke({
      drawingsByRoomId: {
        'board-2': [secondStroke],
      },
      roomId: 'board-1',
      stroke: firstStroke,
    });

    assert.deepEqual(drawings, {
      'board-1': [firstStroke],
      'board-2': [secondStroke],
    });
    assert.deepEqual(undoBoardDrawingStroke({ drawingsByRoomId: drawings, roomId: 'board-1' }), {
      'board-1': [],
      'board-2': [secondStroke],
    });
    assert.deepEqual(clearBoardDrawingStrokes({ drawingsByRoomId: drawings, roomId: 'board-2' }), {
      'board-1': [firstStroke],
      'board-2': [],
    });
  });

  it('uses one larger gray-grid canvas for a shared board room', () => {
    assert.deepEqual(
      getBoardCanvasMetrics({
        viewportHeight: 700,
        viewportWidth: 390,
      }),
      {
        canvasHeight: 1155,
        canvasWidth: 1180,
        gridSize: 34,
        indicatorHeight: 62,
        indicatorWidth: 84,
      },
    );
  });

  it('shows the current viewport inside the mini board indicator without becoming interactive', () => {
    assert.deepEqual(
      getBoardViewportIndicator({
        canvasHeight: 1155,
        canvasWidth: 1180,
        offsetX: 395,
        offsetY: 230,
        viewportHeight: 700,
        viewportWidth: 390,
      }),
      {
        height: 37.58,
        left: 28.12,
        top: 12.35,
        width: 27.76,
      },
    );
  });

  it('only renders board snags near the current viewport', () => {
    const snags = [
      { id: 'visible', canvasX: 80, canvasY: 90, size: 90 },
      { id: 'near-edge', canvasX: 500, canvasY: 90, size: 90 },
      { id: 'far-away', canvasX: 1500, canvasY: 900, size: 90 },
    ];

    assert.deepEqual(
      getVisibleBoardSnags({
        offsetX: 0,
        offsetY: 0,
        snags,
        viewportHeight: 300,
        viewportWidth: 390,
      }).map((snag) => snag.id),
      ['visible', 'near-edge'],
    );
    assert.deepEqual(
      getVisibleBoardSnags({
        offsetX: 1180,
        offsetY: 720,
        snags,
        viewportHeight: 300,
        viewportWidth: 390,
      }).map((snag) => snag.id),
      ['far-away'],
    );
  });

  it('shows the mini board indicator only while the board is moving', () => {
    assert.deepEqual(getBoardMiniMapVisibilityConfig(), {
      fadeInMs: 110,
      fadeOutMs: 280,
      hiddenOpacity: 0,
      idleMs: 760,
      visibleOpacity: 1,
    });
  });

  it('keeps the shared board grid light but readable', () => {
    assert.deepEqual(getBoardGridChromeConfig(), {
      backgroundColor: '#FEFEFC',
      lineColor: 'rgba(23, 23, 23, 0.082)',
    });
  });

  it('updates board scroll offsets from captured numeric values instead of pooled events', () => {
    assert.deepEqual(
      getNextBoardScrollOffset({
        axis: 'x',
        currentOffset: { x: 20, y: 30 },
        value: 125.4,
      }),
      { x: 125.4, y: 30 },
    );
    assert.deepEqual(
      getNextBoardScrollOffset({
        axis: 'y',
        currentOffset: { x: 20, y: 30 },
        value: null,
      }),
      { x: 20, y: 30 },
    );
  });

  it('pans the board freely in both axes from one drag', () => {
    assert.deepEqual(
      getNextBoardPanOffset({
        canvasHeight: 1200,
        canvasWidth: 1180,
        deltaX: -90,
        deltaY: -72,
        startOffset: { x: 100, y: 80 },
        viewportHeight: 700,
        viewportWidth: 390,
      }),
      { x: 190, y: 152 },
    );
    assert.deepEqual(
      getNextBoardPanOffset({
        canvasHeight: 1200,
        canvasWidth: 1180,
        deltaX: 999,
        deltaY: 999,
        startOffset: { x: 100, y: 80 },
        viewportHeight: 700,
        viewportWidth: 390,
      }),
      { x: 0, y: 0 },
    );
  });

  it('places new content in the center of the currently visible viewport', () => {
    assert.deepEqual(getViewportCenteredSnagPresentation({
      canvasHeight: 1200,
      canvasWidth: 1180,
      offsetX: 420,
      offsetY: 180,
      preferredSize: 260,
      viewportHeight: 700,
      viewportWidth: 390,
    }), {
      canvasX: 485,
      canvasY: 400,
      size: 260,
    });

    assert.deepEqual(getViewportCenteredSnagPresentation({
      canvasHeight: 900,
      canvasWidth: 900,
      offsetX: 850,
      offsetY: 820,
      preferredSize: 260,
      viewportHeight: 500,
      viewportWidth: 390,
    }), {
      canvasX: 640,
      canvasY: 640,
      size: 260,
    });
  });

  it('moves at one fixed speed anywhere inside the edge zone', () => {
    const common = {
      allowX: true,
      allowY: false,
      bounds: { bottom: 800, left: 0, right: 390, top: 100 },
      canvasHeight: 1200,
      canvasWidth: 1180,
      currentOffset: { x: 300, y: 200 },
      elapsedMs: 16,
      viewportHeight: 700,
      viewportWidth: 390,
    };

    assert.deepEqual(
      getNextEdgePanOffset({ ...common, point: { x: 8, y: 400 } }),
      getNextEdgePanOffset({ ...common, point: { x: 52, y: 400 } }),
    );
    assert.deepEqual(getNextEdgePanOffset({ ...common, point: { x: 8, y: 400 } }), {
      x: 296.48,
      y: 200,
    });
    assert.deepEqual(getNextEdgePanOffset({ ...common, point: { x: 195, y: 400 } }), {
      x: 300,
      y: 200,
    });
  });

  it('edge-pans social boards diagonally and stops at canvas bounds', () => {
    const common = {
      allowX: true,
      allowY: true,
      bounds: { bottom: 800, left: 0, right: 390, top: 100 },
      canvasHeight: 1200,
      canvasWidth: 1180,
      elapsedMs: 32,
      viewportHeight: 700,
      viewportWidth: 390,
    };

    assert.deepEqual(getNextEdgePanOffset({
      ...common,
      currentOffset: { x: 300, y: 200 },
      point: { x: 388, y: 798 },
    }), {
      x: 307.04,
      y: 207.04,
    });
    assert.deepEqual(getNextEdgePanOffset({
      ...common,
      currentOffset: { x: 0, y: 0 },
      point: { x: 2, y: 102 },
    }), {
      x: 0,
      y: 0,
    });
  });

  it('keeps board pan visual motion off the React render loop', () => {
    assert.deepEqual(getBoardPanStateCommitConfig(), {
      stateCommitIntervalMs: 96,
      visualDriver: 'animated-value',
    });
  });

  it('lets board panning start from a touched snag before it becomes a moved snag', () => {
    assert.equal(shouldStartBoardPanGesture({
      activeRoomId: 'board-1',
      drawingActive: false,
      draggingSnagId: null,
      scrollOffsetX: 120,
      translationX: 0,
      translationY: -9,
    }), true);
    assert.equal(shouldStartBoardPanGesture({
      activeRoomId: 'board-1',
      drawingActive: false,
      draggingSnagId: 'snag-1',
      scrollOffsetX: 120,
      translationX: 0,
      translationY: -24,
    }), false);
    assert.equal(shouldStartBoardPanGesture({
      activeRoomId: null,
      drawingActive: false,
      draggingSnagId: null,
      scrollOffsetX: 0,
      translationX: 32,
      translationY: 6,
    }), true);
  });

  it('renders board snags progressively with the topmost snags first', () => {
    const snags = Array.from({ length: 12 }, (_, index) => ({
      canvasX: index,
      canvasY: index,
      id: `snag-${index}`,
      size: 120,
    }));

    assert.deepEqual(
      getProgressiveBoardSnags({ renderLimit: 4, snags }).map((snag) => snag.id),
      ['snag-8', 'snag-9', 'snag-10', 'snag-11'],
    );
    assert.deepEqual(
      getProgressiveBoardSnags({ renderLimit: 20, snags }).map((snag) => snag.id),
      snags.map((snag) => snag.id),
    );
  });

  it('batches board snag rendering and prefetches only the first room payload', () => {
    const snags = Array.from({ length: 40 }, (_, index) => ({
      canvasX: index,
      canvasY: index,
      id: `snag-${index}`,
      size: 120,
    }));

    assert.equal(getNextBoardSnagRenderLimit({ currentLimit: 8, totalCount: 40 }), 18);
    assert.equal(getNextBoardSnagRenderLimit({ currentLimit: 38, totalCount: 40 }), 40);
    assert.equal(getBoardRoomPrefetchSnags({ snags }).length, 14);
    assert.deepEqual(
      getBoardRoomPrefetchSnags({ limit: 3, snags }).map((snag) => snag.id),
      ['snag-37', 'snag-38', 'snag-39'],
    );
  });

  it('warms the selected board first, then quietly moves through newer boards', () => {
    const rooms = [
      { createdAt: 10, id: 'older' },
      { createdAt: 30, id: 'selected' },
      { createdAt: 20, id: 'newer' },
    ];
    const snagsByRoomId = {
      newer: [{ id: 'newer-snag', imageUri: 'newer.webp' }],
      older: [{ id: 'older-snag', imageUri: 'older.webp' }],
      selected: [{ id: 'selected-snag', imageUri: 'selected.webp' }],
    };
    const firstRequest = getNextBoardWarmupRequest({
      rooms,
      selectedRoomId: 'selected',
      snagsByRoomId,
      warmedRoomKeys: [],
    });

    assert.deepEqual(firstRequest, {
      key: 'selected:1:selected-snag:selected.webp',
      limit: BOARD_IDLE_WARMUP_PRIMARY_LIMIT,
      roomId: 'selected',
    });
    assert.deepEqual(
      getNextBoardWarmupRequest({
        rooms,
        selectedRoomId: 'selected',
        snagsByRoomId,
        warmedRoomKeys: [firstRequest.key],
      }),
      {
        key: 'newer:1:newer-snag:newer.webp',
        limit: BOARD_IDLE_WARMUP_SECONDARY_LIMIT,
        roomId: 'newer',
      },
    );
  });
});
