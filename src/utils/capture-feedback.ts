export type CaptureActivity =
  | 'idle'
  | 'capturing'
  | 'recognizing'
  | 'preparing-manual'
  | 'finalizing';

export type CaptureActivityPresentation = {
  blocksInteraction: boolean;
  label: string;
  showCapturedFrame: boolean;
  showOverlay: boolean;
};

export const CAPTURE_ACTIVITY_MIN_VISIBLE_MS = 600;

const CAPTURE_ACTIVITY_PRESENTATIONS: Record<CaptureActivity, CaptureActivityPresentation> = {
  idle: {
    blocksInteraction: false,
    label: '',
    showCapturedFrame: false,
    showOverlay: false,
  },
  capturing: {
    blocksInteraction: true,
    label: '',
    showCapturedFrame: false,
    showOverlay: false,
  },
  recognizing: {
    blocksInteraction: true,
    label: 'Finding your Snag...',
    showCapturedFrame: true,
    showOverlay: true,
  },
  'preparing-manual': {
    blocksInteraction: true,
    label: 'Preparing your canvas...',
    showCapturedFrame: true,
    showOverlay: true,
  },
  finalizing: {
    blocksInteraction: true,
    label: 'Finishing your Snag...',
    showCapturedFrame: false,
    showOverlay: true,
  },
};

export function getCaptureActivityPresentation(activity: CaptureActivity) {
  return CAPTURE_ACTIVITY_PRESENTATIONS[activity];
}

export function getCaptureActivityDelayMs({
  nowMs,
  startedAtMs,
}: {
  nowMs: number;
  startedAtMs: number;
}) {
  const elapsedMs = Math.max(nowMs - startedAtMs, 0);
  return Math.max(CAPTURE_ACTIVITY_MIN_VISIBLE_MS - elapsedMs, 0);
}
