import { requireOptionalNativeModule } from 'expo-modules-core';

import { type ManualCutoutMaskPoint } from '@/utils/manual-cutout';

export type SnagCutoutResult = {
  uri: string;
  width: number;
  height: number;
};

type SnagCutoutNativeModule = {
  applyManualCutoutAsync: (uri: string, points: ManualCutoutMaskPoint[]) => Promise<SnagCutoutResult>;
  isSupportedAsync: () => Promise<boolean>;
  cutoutImageAsync: (uri: string) => Promise<SnagCutoutResult>;
};

const NativeSnagCutout = requireOptionalNativeModule<SnagCutoutNativeModule>('SnagCutout');

export async function isSnagCutoutSupportedAsync() {
  if (!NativeSnagCutout) {
    return false;
  }

  try {
    return await NativeSnagCutout.isSupportedAsync();
  } catch {
    return false;
  }
}

export async function cutoutImageAsync(uri: string) {
  if (!NativeSnagCutout) {
    throw new Error('SnagCutout native module is not installed.');
  }

  return NativeSnagCutout.cutoutImageAsync(uri);
}

export async function applyManualCutoutAsync(uri: string, points: ManualCutoutMaskPoint[]) {
  if (!NativeSnagCutout) {
    throw new Error('SnagCutout native module is not installed.');
  }

  return NativeSnagCutout.applyManualCutoutAsync(uri, points);
}
