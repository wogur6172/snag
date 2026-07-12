export const LOCAL_SNAG_PREVIEW_MAX_EDGE = 1280;
export const LOCAL_SNAG_PREVIEW_QUALITY = 0.82;
export const LOCAL_SNAG_PREVIEW_EXTENSION = 'webp';

export type LocalSnagPreviewResizeAction = {
  height?: number;
  width?: number;
};

export function getLocalSnagPreviewResizeAction({
  height,
  maxEdge = LOCAL_SNAG_PREVIEW_MAX_EDGE,
  width,
}: {
  height?: number;
  maxEdge?: number;
  width?: number;
}): LocalSnagPreviewResizeAction | null {
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

  if (Math.max(width, height) <= maxEdge) {
    return null;
  }

  return width >= height
    ? { width: maxEdge }
    : { height: maxEdge };
}

export function getSnagRenderImageUri({
  imageUri,
  previewUri,
}: {
  imageUri?: string;
  previewUri?: string;
}) {
  return previewUri || imageUri;
}

export function getSnagPreloadImageUri({
  imageHeight,
  imageUri,
  imageWidth,
  previewUri,
}: {
  imageHeight?: number;
  imageUri?: string;
  imageWidth?: number;
  previewUri?: string;
}) {
  if (previewUri) {
    return previewUri;
  }

  if (!imageUri || getLocalSnagPreviewResizeAction({ height: imageHeight, width: imageWidth })) {
    return undefined;
  }

  return imageUri;
}

export function getStoredSnagPreviewName({ id }: { id: string }) {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${safeId}-preview.${LOCAL_SNAG_PREVIEW_EXTENSION}`;
}
