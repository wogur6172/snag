export const BOARD_SNAG_PREVIEW_MAX_EDGE = 384;
export const BOARD_SNAG_PREVIEW_QUALITY = 0.62;
export const BOARD_SNAG_PREVIEW_EXTENSION = 'webp';
export const BOARD_SNAG_PREVIEW_CONTENT_TYPE = 'image/webp';
export const BOARD_SNAG_ORIGINAL_CONTENT_TYPE = 'image/png';

type BoardSnagPreviewEnv = {
  EXPO_PUBLIC_SNAG_BOARD_PREVIEW_ENABLED?: string;
};

export type BoardSnagPreviewResizeAction = {
  height?: number;
  width?: number;
};

function getScaledDimension(value: number, scale: number) {
  return Math.max(1, Math.round(value * scale));
}

export function getBoardSnagPreviewResizeAction({
  height,
  maxEdge = BOARD_SNAG_PREVIEW_MAX_EDGE,
  width,
}: {
  height?: number;
  maxEdge?: number;
  width?: number;
}): BoardSnagPreviewResizeAction | null {
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return { width: maxEdge };
  }

  const longestEdge = Math.max(width, height);

  if (longestEdge <= maxEdge) {
    return null;
  }

  return width >= height
    ? { width: maxEdge }
    : { height: maxEdge };
}

export function getBoardSnagPreviewDimensions({
  height,
  maxEdge = BOARD_SNAG_PREVIEW_MAX_EDGE,
  width,
}: {
  height?: number;
  maxEdge?: number;
  width?: number;
}) {
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return {};
  }

  const longestEdge = Math.max(width, height);

  if (longestEdge <= maxEdge) {
    return {
      height: Math.round(height),
      width: Math.round(width),
    };
  }

  const scale = maxEdge / longestEdge;

  return {
    height: getScaledDimension(height, scale),
    width: getScaledDimension(width, scale),
  };
}

export function getBoardSnagPreviewStoragePath({
  roomId,
  snagId,
}: {
  roomId: string;
  snagId: string;
}) {
  return `${roomId}/previews/${snagId}.${BOARD_SNAG_PREVIEW_EXTENSION}`;
}

export function getBoardSnagPreviewContentType() {
  return BOARD_SNAG_PREVIEW_CONTENT_TYPE;
}

export function isBoardSnagPreviewEnabled(env?: BoardSnagPreviewEnv) {
  const resolvedEnv = env ?? {
    EXPO_PUBLIC_SNAG_BOARD_PREVIEW_ENABLED: process.env.EXPO_PUBLIC_SNAG_BOARD_PREVIEW_ENABLED,
  };

  return resolvedEnv.EXPO_PUBLIC_SNAG_BOARD_PREVIEW_ENABLED === 'true';
}

export function getBoardSnagOriginalStoragePath({
  roomId,
  snagId,
}: {
  roomId: string;
  snagId: string;
}) {
  return `${roomId}/${snagId}.png`;
}

export function getBoardSnagOriginalContentType() {
  return BOARD_SNAG_ORIGINAL_CONTENT_TYPE;
}
