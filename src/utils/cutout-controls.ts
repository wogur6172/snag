export type CaptureCutoutRoute = 'auto' | 'manual' | 'none';

export function getCutoutNoticeDurationMs() {
  return 1800;
}

export function getCaptureCutoutRoute({
  autoCutoutEnabled,
  hasImageUri,
  isCutoutSupported,
}: {
  autoCutoutEnabled: boolean;
  hasImageUri: boolean;
  isCutoutSupported: boolean;
}): CaptureCutoutRoute {
  if (!hasImageUri) {
    return 'none';
  }

  if (!autoCutoutEnabled) {
    return 'manual';
  }

  if (!isCutoutSupported) {
    return 'manual';
  }

  return 'auto';
}

export function getCutoutUnsupportedNotice() {
  return 'Auto cutout needs iOS 17. Manual refine is ready.';
}

export function getCutoutFailureNotice() {
  return 'Auto cutout missed this one. Manual refine is ready.';
}
