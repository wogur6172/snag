export type ManualCutoutTool = 'erase' | 'restore';
export type ManualCutoutInteractionMode = 'erase' | 'move';

export type ManualCutoutPoint = {
  id: string;
  x: number;
  y: number;
  size: number;
};

export type ManualCutoutMaskPoint = {
  size: number;
  x: number;
  y: number;
};

export type CheckerboardCell = {
  id: string;
  isAlt: boolean;
  x: number;
  y: number;
};

export type ManualCutoutPreviewMaskCircle = {
  cx: number;
  cy: number;
  fill: '#000000';
  id: string;
  r: number;
};

export type ManualCutoutStroke = {
  id: string;
  path: string;
  points: ManualCutoutPoint[];
  size: number;
};

export type ManualCutoutPreviewMaskPath = {
  d: string;
  id: string;
  strokeWidth: number;
};

export type ManualCutoutPreviewStrategy = 'children' | 'plain-native-image' | 'masked-native-image';

type ManualCutoutPosition = Pick<ManualCutoutPoint, 'x' | 'y'>;

type ContainedImageInput = {
  imageHeight?: number;
  imageWidth?: number;
  layoutHeight: number;
  layoutWidth: number;
};

type ManualCutoutMaskPointInput = ContainedImageInput & {
  point: ManualCutoutPoint;
};

function roundControlValue(value: number) {
  return Math.round(value * 1000) / 1000;
}

function pathValue(value: number) {
  return String(roundControlValue(value));
}

export function clampCameraZoom(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(value, 1));
}

export function getNextCameraZoom(startZoom: number, startDistance: number, currentDistance: number) {
  if (startDistance <= 0 || currentDistance <= 0) {
    return roundControlValue(clampCameraZoom(startZoom));
  }

  const distanceRatio = currentDistance / startDistance;
  const zoomDirection = distanceRatio >= 1 ? 0.42 : 0.26;
  const zoomDelta = Math.log(distanceRatio) * zoomDirection;
  const nextZoom = startZoom + zoomDelta;

  return roundControlValue(clampCameraZoom(nextZoom));
}

export function smoothCameraZoom(currentZoom: number, targetZoom: number) {
  const easedZoom = currentZoom + (targetZoom - currentZoom) * 0.56;
  return roundControlValue(clampCameraZoom(easedZoom));
}

export function getNextCutoutEditScale(savedScale: number, pinchScale: number) {
  'worklet';

  if (Number.isNaN(savedScale) || Number.isNaN(pinchScale)) {
    return 1;
  }

  return Math.max(0.96, Math.min(savedScale * pinchScale, 6));
}

export function getBrushSizeForCanvas(screenBrushSize: number, canvasScale: number) {
  const safeScale = Math.max(canvasScale, 1);
  const canvasBrushSize = screenBrushSize / safeScale;

  return Math.max(1, Math.round(canvasBrushSize * 100) / 100);
}

export function getBrushSliderValue({
  max,
  min,
  trackWidth,
  x,
}: {
  max: number;
  min: number;
  trackWidth: number;
  x: number;
}) {
  if (trackWidth <= 0 || Number.isNaN(trackWidth) || Number.isNaN(x)) {
    return min;
  }

  const clampedX = Math.max(0, Math.min(x, trackWidth));
  return Math.round(min + (clampedX / trackWidth) * (max - min));
}

export function getCheckerboardCells({
  cellSize,
  height,
  originX = 0,
  originY = 0,
  width,
}: {
  cellSize: number;
  height: number;
  originX?: number;
  originY?: number;
  width: number;
}): CheckerboardCell[] {
  if (cellSize <= 0 || height <= 0 || width <= 0) {
    return [];
  }

  const startColumn = Math.floor(originX / cellSize);
  const startRow = Math.floor(originY / cellSize);
  const endColumn = Math.ceil((originX + width) / cellSize);
  const endRow = Math.ceil((originY + height) / cellSize);
  const cells: CheckerboardCell[] = [];

  for (let row = startRow; row < endRow; row += 1) {
    for (let column = startColumn; column < endColumn; column += 1) {
      cells.push({
        id: `${row}-${column}`,
        isAlt: (row + column) % 2 === 0,
        x: column * cellSize - originX,
        y: row * cellSize - originY,
      });
    }
  }

  return cells;
}

export function getManualCutoutPreviewMaskCircles(
  points: ManualCutoutPoint[],
): ManualCutoutPreviewMaskCircle[] {
  return points.map((point) => ({
    cx: point.x,
    cy: point.y,
    fill: '#000000',
    id: point.id,
    r: point.size / 2,
  }));
}

export function createManualCutoutStroke({
  id,
  point,
}: {
  id: string;
  point: ManualCutoutPoint;
}): ManualCutoutStroke {
  const x = pathValue(point.x);
  const y = pathValue(point.y);

  return {
    id,
    path: `M ${x} ${y} L ${pathValue(point.x + 0.01)} ${y}`,
    points: [point],
    size: point.size,
  };
}

export function appendManualCutoutStrokePoint({
  getId,
  point,
  stroke,
}: {
  getId: (index: number) => string;
  point: ManualCutoutPoint;
  stroke: ManualCutoutStroke;
}): ManualCutoutStroke {
  const lastPoint = stroke.points.at(-1) ?? point;
  const savePoints = createManualCutoutStrokePoints({
    from: lastPoint,
    getId,
    size: point.size,
    to: point,
  }).slice(1);

  return {
    ...stroke,
    path: `${stroke.path} L ${pathValue(point.x)} ${pathValue(point.y)}`,
    points: [...stroke.points, ...savePoints],
    size: point.size,
  };
}

export function getManualCutoutPreviewMaskPaths(
  strokes: ManualCutoutStroke[],
): ManualCutoutPreviewMaskPath[] {
  return strokes.map((stroke) => ({
    d: stroke.path,
    id: stroke.id,
    strokeWidth: stroke.size,
  }));
}

export function getManualCutoutStrokeMaskPoints(strokes: ManualCutoutStroke[]) {
  return strokes.flatMap((stroke) => stroke.points);
}

export function getManualCutoutPreviewStrategy({
  hasUri,
  layoutHeight,
  layoutWidth,
  maskPointCount,
}: {
  hasUri: boolean;
  layoutHeight: number;
  layoutWidth: number;
  maskPointCount: number;
}): ManualCutoutPreviewStrategy {
  if (!hasUri) {
    return 'children';
  }

  if (layoutHeight <= 0 || layoutWidth <= 0 || maskPointCount <= 0) {
    return 'plain-native-image';
  }

  return 'masked-native-image';
}

export function shouldStartManualErase({
  mode,
  touchCount,
}: {
  mode: ManualCutoutInteractionMode;
  touchCount: number;
}) {
  return mode === 'erase' && touchCount === 1;
}

export function getContainedImageFrame({
  imageHeight,
  imageWidth,
  layoutHeight,
  layoutWidth,
}: ContainedImageInput) {
  if (!imageWidth || !imageHeight || layoutWidth <= 0 || layoutHeight <= 0) {
    return {
      height: layoutHeight,
      offsetX: 0,
      offsetY: 0,
      width: layoutWidth,
    };
  }

  const imageRatio = imageWidth / imageHeight;
  const layoutRatio = layoutWidth / layoutHeight;
  const width = layoutRatio > imageRatio ? layoutHeight * imageRatio : layoutWidth;
  const height = layoutRatio > imageRatio ? layoutHeight : layoutWidth / imageRatio;

  return {
    height: roundControlValue(height),
    offsetX: roundControlValue((layoutWidth - width) / 2),
    offsetY: roundControlValue((layoutHeight - height) / 2),
    width: roundControlValue(width),
  };
}

export function getManualCutoutMaskPoint({
  imageHeight,
  imageWidth,
  layoutHeight,
  layoutWidth,
  point,
}: ManualCutoutMaskPointInput) {
  const frame = getContainedImageFrame({
    imageHeight,
    imageWidth,
    layoutHeight,
    layoutWidth,
  });
  const x = (point.x - frame.offsetX) / frame.width;
  const y = (point.y - frame.offsetY) / frame.height;

  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return null;
  }

  return {
    size: roundControlValue(point.size / Math.min(frame.width, frame.height)),
    x: roundControlValue(x),
    y: roundControlValue(y),
  };
}

export function createManualCutoutStrokePoints({
  from,
  getId,
  size,
  to,
}: {
  from: ManualCutoutPosition;
  getId: (index: number) => string;
  size: number;
  to: ManualCutoutPosition;
}) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const spacing = Math.max(size * 0.35, 0.5);
  const steps = Math.max(1, Math.ceil(distance / spacing));

  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;

    return {
      id: getId(index),
      size,
      x: roundControlValue(from.x + (to.x - from.x) * progress),
      y: roundControlValue(from.y + (to.y - from.y) * progress),
    };
  });
}

export function applyManualCutoutStroke({
  currentPoints,
  point,
  tool,
}: {
  currentPoints: ManualCutoutPoint[];
  point: ManualCutoutPoint;
  tool: ManualCutoutTool;
}) {
  if (tool === 'erase') {
    return [...currentPoints, point];
  }

  const restoreRadius = Math.max(point.size * 0.72, 12);
  return currentPoints.filter((existingPoint) => {
    const distance = Math.hypot(existingPoint.x - point.x, existingPoint.y - point.y);
    return distance > restoreRadius;
  });
}

export function createManualCutoutPointBatch({
  currentPoints,
  points,
  tool,
}: {
  currentPoints: ManualCutoutPoint[];
  points: ManualCutoutPoint[];
  tool: ManualCutoutTool;
}) {
  if (points.length === 0) {
    return currentPoints;
  }

  return points.reduce(
    (nextPoints, point) =>
      applyManualCutoutStroke({
        currentPoints: nextPoints,
        point,
        tool,
      }),
    currentPoints,
  );
}
