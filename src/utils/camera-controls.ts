import type { CameraType, FlashMode } from 'expo-camera';

type SnagFlashMode = Extract<FlashMode, 'off' | 'auto' | 'on'>;

export function getNextFlashMode(mode: FlashMode): SnagFlashMode {
  if (mode === 'off') {
    return 'auto';
  }

  if (mode === 'auto') {
    return 'on';
  }

  return 'off';
}

export function getFlashSymbol(mode: FlashMode) {
  if (mode === 'auto') {
    return 'bolt.badge.a.fill';
  }

  if (mode === 'on') {
    return 'bolt.fill';
  }

  return 'bolt.slash.fill';
}

export function getCameraCaptureFlashMode({
  facing,
  flash,
}: {
  facing: CameraType;
  flash: FlashMode;
}): FlashMode {
  if (facing === 'front' && flash === 'on') {
    return 'screen';
  }

  return flash;
}

export function getAutoCutoutSymbol(enabled: boolean) {
  return 'wand.and.stars';
}

export function getAutoCutoutBadge(enabled: boolean) {
  return enabled ? 'A' : null;
}
