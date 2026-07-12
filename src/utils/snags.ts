type CompletedAsset = {
  height?: number;
  uri: string;
  width?: number;
};

type RealSnagItem = {
  category: string;
  canvasX: number;
  canvasY: number;
  createdAt: number;
  excludeFromAll?: boolean;
  id: string;
  kind?: 'image' | 'text';
  imageHeight?: number;
  imageUri?: string;
  imageWidth?: number;
  previewUri?: string;
  layerIndex?: number;
  originSnagId?: string;
  rotate: string;
  size: number;
  text?: string;
  title: string;
};

export type SnagTransformPatch = {
  rotationRad: number;
  scale: number;
  translateX: number;
  translateY: number;
};

export type SnagCategoryItem = {
  background?: SnagCategoryBackgroundId;
  backgroundStrength?: number;
  color?: string;
  id: string;
  title: string;
};

export type SnagCategoryBackgroundId = 'grid' | 'dots' | 'shelves' | 'journal';

export type SnagCategoryBackgroundOption = {
  id: SnagCategoryBackgroundId;
  label: string;
};

export type CollectionChromeMetrics = {
  contentPaddingBottom: number;
  contentPaddingTop: number;
  headerMinHeight: number;
  safeAreaPaddingTop: number;
  wordmarkOffsetY: number;
};

export type SnagBoardPoint = {
  x: number;
  y: number;
};

export type SnagTrashDropZone = {
  centerX: number;
  centerY: number;
  dropRadius: number;
  hitCenterX: number;
  hitCenterY: number;
  releaseRadius: number;
};

export type CopyToastPresentation = {
  left: number;
  message: 'Copied!';
  top: number;
};

export type CopyActionPresentation = {
  left: number;
  top: number;
  width: number;
};

export type TrashSuckAnimationConfig = {
  armedScale: number;
  durationMs: number;
  finalScale: number;
  haptic: 'impact-medium';
};

export type CopyLongPressConfig = {
  action: 'show-copy-action';
  minDurationMs: number;
  trigger: 'active-start';
};

export type BoardPasteLongPressConfig = {
  minDurationMs: number;
  singleTapShowsPaste: false;
  trigger: 'active-start';
};

export type CollectionActionOverlayConfig = {
  autoDismissMs: number;
  backgroundTapDismisses: true;
  exclusive: true;
};

export type CategoryHeaderMenuLayoutConfig = {
  position: 'absolute';
  right: number;
  top: number;
};

export type CategoryHeaderBadgeChromeConfig = {
  borderColor: string;
  shadowOpacity: number;
};

export type FloatingActionChromeConfig = {
  backgroundColor: string;
  borderColor: string;
  shadowOpacity: number;
  tintColor: string;
};

export type FloatingActionPopAnimationConfig = {
  initialScale: number;
  initialTranslateY: number;
  springFriction: number;
  springTension: number;
};

export type SnagDragGestureConfig = {
  activationDistance: number;
  dragActivation: 'after-long-press' | 'immediate';
  longPressMinDurationMs: number;
};

export type SnagGestureLifecycleConfig = {
  copyGestureCanReleaseDrag: false;
  dragReleaseTrigger: 'gesture-finalize';
  interactionStartTrigger: 'gesture-start';
  transformGestureCanReleaseDrag: false;
  settleStagedTrigger: 'drag-start' | 'none';
  touchResponderCanReleaseDrag: false;
};

export type SnagTransformGestureFrame = {
  height: number;
  left: number;
  top: number;
  width: number;
};
export type SnagTransformGestureSurface = 'full-board' | 'item';

export type SurfaceSwipeNavigationTarget = 'board' | 'collection' | null;
export type SurfaceSwipeDirection = 'all-to-board' | 'board-to-all';
export type CategorySnapReason = 'selection' | 'instant' | 'sync';

export type AllCollectionSnagFrame = {
  canvasX: number;
  canvasY: number;
  rotate: string;
  size: number;
};

type TransformableSnagFrame = {
  canvasX: number;
  canvasY: number;
  kind?: 'image' | 'text';
  imageHeight?: number;
  imageWidth?: number;
  rotate: string;
  size: number;
  text?: string;
  title?: string;
};

export const CATEGORY_COLOR_OPTIONS = [
  '#FFD6D6',
  '#FFE2BF',
  '#FFF3A8',
  '#DDF8B7',
  '#BFEAFF',
  '#E3D6FF',
  '#FFFFFF',
] as const;

export const CATEGORY_BACKGROUND_OPTIONS: SnagCategoryBackgroundOption[] = [
  { id: 'grid', label: 'Grid' },
  { id: 'dots', label: 'Dots' },
  { id: 'shelves', label: 'Shelves' },
  { id: 'journal', label: 'Journal' },
];

export const DEFAULT_CATEGORY_BACKGROUND_STRENGTH = 0.62;

export function getDrawingColorOptions() {
  return [
    '#171717',
    ...CATEGORY_COLOR_OPTIONS.filter((color) => color !== '#FFFFFF'),
  ] as const;
}

function roundSnagValue(value: number) {
  return Math.round(value * 1000) / 1000;
}

function parseRotationRadians(rotation: string) {
  const value = Number.parseFloat(rotation);

  if (!Number.isFinite(value)) {
    return 0;
  }

  if (rotation.trim().endsWith('deg')) {
    return (value * Math.PI) / 180;
  }

  if (rotation.trim().endsWith('rad')) {
    return value;
  }

  return 0;
}

function getSnagDisplayHeight({
  imageHeight,
  imageWidth,
  kind,
  size,
  text,
  title,
}: {
  imageHeight?: number;
  imageWidth?: number;
  kind?: 'image' | 'text';
  size: number;
  text?: string;
  title?: string;
}) {
  if (kind === 'text') {
    return getTextSnagLayout({ size, text: text ?? title }).height;
  }

  const imageAspect = imageWidth && imageHeight ? imageHeight / imageWidth : 1;
  return size * Math.max(0.55, Math.min(imageAspect, 1.45));
}

function getSnagDisplayWidth({
  kind,
  size,
  text,
  title,
}: {
  kind?: 'image' | 'text';
  size: number;
  text?: string;
  title?: string;
}) {
  if (kind === 'text') {
    return getTextSnagLayout({ size, text: text ?? title }).width;
  }

  return size;
}

export function normalizeTextSnagValue(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 42).trim();
}

export function isTextSnag(snag: { kind?: string; text?: string }) {
  return snag.kind === 'text' && typeof snag.text === 'string' && snag.text.trim().length > 0;
}

export function getTextSnagTypography({ size }: { size: number }) {
  const safeSize = Number.isFinite(size) ? Math.max(44, size) : 240;
  const fontSize = safeSize * 0.2;

  return {
    fontSize: roundSnagValue(fontSize),
    lineHeight: Math.round(fontSize * 1.15),
  };
}

export function getTextSnagLayout({ size, text }: { size: number; text?: string }) {
  const safeSize = Number.isFinite(size) ? Math.max(44, size) : 240;
  const typography = getTextSnagTypography({ size: safeSize });
  const normalizedText = normalizeTextSnagValue(text ?? '');
  const visibleCharacterCount = Math.max(1, normalizedText.length);
  const widthRatio = Math.min(3.6, Math.max(0.54, 0.22 + visibleCharacterCount * 0.13));

  return {
    ...typography,
    height: roundSnagValue(safeSize * 0.304),
    width: roundSnagValue(safeSize * widthRatio),
  };
}

export function getSnaggedAnimationTimings() {
  const revealDurationMs = 620;
  return {
    collectionRevealDelayMs: 0,
    holdDurationMs: 1260,
    landingDurationMs: 720,
    revealDurationMs,
  };
}

export function getInitialSnagMode() {
  return 'collection' as const;
}

export function getCaptureCategoryId({
  captureCategoryId,
  selectedCategoryId,
}: {
  captureCategoryId?: string;
  selectedCategoryId: string;
}) {
  return captureCategoryId?.trim() || selectedCategoryId;
}

export function getCaptureProcessingPresentation({ hasImageUri }: { hasImageUri: boolean }) {
  return {
    showCapturedFrame: hasImageUri,
    showWordmark: false,
  };
}

export function getCollectionChromeMetrics(): CollectionChromeMetrics {
  return {
    contentPaddingBottom: 44,
    contentPaddingTop: 2,
    headerMinHeight: 58,
    safeAreaPaddingTop: 2,
    wordmarkOffsetY: -4,
  };
}

export function getSnagTrashDropZone({
  screenHeight,
  scrollX = 0,
  scrollY = 0,
  viewportHeight,
  viewportWidth,
}: {
  screenHeight?: number;
  scrollX?: number;
  scrollY?: number;
  viewportHeight: number;
  viewportWidth: number;
}): SnagTrashDropZone {
  const centerX = roundSnagValue(scrollX + viewportWidth / 2);
  const centerY = roundSnagValue(scrollY + Math.max(38, viewportHeight + 44));

  return {
    centerX,
    centerY,
    dropRadius: 48,
    hitCenterX: roundSnagValue(viewportWidth / 2),
    hitCenterY: roundSnagValue(screenHeight ? Math.max(38, screenHeight - 56) : centerY),
    releaseRadius: 84,
  };
}

export function getSnagTransformGestureFrame({
  containerHeight,
  containerWidth,
  contentHeight,
  contentWidth,
  contentX = 0,
  contentY = 0,
  surface = 'full-board',
}: {
  containerHeight: number;
  containerWidth: number;
  contentHeight?: number;
  contentWidth?: number;
  contentX?: number;
  contentY?: number;
  surface?: SnagTransformGestureSurface;
}): SnagTransformGestureFrame {
  if (surface === 'item' && contentHeight && contentWidth) {
    return {
      height: Math.max(0, contentHeight),
      left: roundSnagValue(contentX),
      top: roundSnagValue(contentY),
      width: Math.max(0, contentWidth),
    };
  }

  return {
    height: Math.max(0, containerHeight),
    left: 0,
    top: 0,
    width: Math.max(0, containerWidth),
  };
}

export function getCopyLongPressConfig(): CopyLongPressConfig {
  return {
    action: 'show-copy-action',
    minDurationMs: 670,
    trigger: 'active-start',
  };
}

export function getBoardPasteLongPressConfig(): BoardPasteLongPressConfig {
  return {
    minDurationMs: 430,
    singleTapShowsPaste: false,
    trigger: 'active-start',
  };
}

export function shouldAllowPasteAction({ categoryId }: { categoryId: string }) {
  return categoryId !== 'all';
}

export function getSnagReleaseUnlockDelayMs() {
  return 190;
}

export function getSurfaceSwipeNavigationTarget({
  boardScrollX = 0,
  currentSurface,
  disabled = false,
  selectedCategoryId,
  translationX,
  translationY,
}: {
  boardScrollX?: number;
  currentSurface: 'board' | 'collection';
  disabled?: boolean;
  selectedCategoryId?: string;
  translationX: number;
  translationY: number;
}): SurfaceSwipeNavigationTarget {
  const horizontalDistance = Math.abs(translationX);
  const verticalDistance = Math.abs(translationY);
  const isDeliberateHorizontalSwipe = horizontalDistance >= 42 && horizontalDistance >= verticalDistance * 1.12;

  if (disabled || !isDeliberateHorizontalSwipe) {
    return null;
  }

  if (currentSurface === 'collection') {
    return selectedCategoryId === 'all' && translationX < 0 ? 'board' : null;
  }

  if (boardScrollX <= 12 && translationX > 0) {
    return 'collection';
  }

  return null;
}

export function getSurfaceSwipeStartTarget({
  boardScrollX = 0,
  currentSurface,
  disabled = false,
  selectedCategoryId,
  translationX,
  translationY,
}: {
  boardScrollX?: number;
  currentSurface: 'board' | 'collection';
  disabled?: boolean;
  selectedCategoryId?: string;
  translationX: number;
  translationY: number;
}): SurfaceSwipeNavigationTarget {
  if (disabled) {
    return null;
  }

  const horizontalDistance = Math.abs(translationX);
  const verticalDistance = Math.abs(translationY);
  const isSideIntent = horizontalDistance >= 10 && horizontalDistance >= verticalDistance * 0.35;

  if (!isSideIntent) {
    return null;
  }

  if (currentSurface === 'collection') {
    return selectedCategoryId === 'all' && translationX < 0 ? 'board' : null;
  }

  if (boardScrollX <= 12 && translationX > 0) {
    return 'collection';
  }

  return null;
}

export function getSurfaceSwipeProgress({
  direction,
  translationX,
  width,
}: {
  direction: SurfaceSwipeDirection;
  translationX: number;
  width: number;
}) {
  const distance = direction === 'all-to-board' ? -translationX : translationX;
  const safeWidth = Math.max(1, width);

  return roundSnagValue(Math.max(0, Math.min(distance / safeWidth, 1)));
}

export function getSurfaceSwipeCompletionTarget({
  boardScrollX = 0,
  currentSurface,
  selectedCategoryId,
  translationX,
  velocityX = 0,
  width,
}: {
  boardScrollX?: number;
  currentSurface: 'board' | 'collection';
  selectedCategoryId?: string;
  translationX: number;
  velocityX?: number;
  width: number;
}): SurfaceSwipeNavigationTarget {
  if (currentSurface === 'collection') {
    if (selectedCategoryId !== 'all') {
      return null;
    }

    const progress = getSurfaceSwipeProgress({
      direction: 'all-to-board',
      translationX,
      width,
    });

    return progress >= 0.36 || (progress >= 0.18 && velocityX <= -0.72) ? 'board' : null;
  }

  if (boardScrollX > 12) {
    return null;
  }

  const progress = getSurfaceSwipeProgress({
    direction: 'board-to-all',
    translationX,
    width,
  });

  return progress >= 0.36 || (progress >= 0.18 && velocityX >= 0.72) ? 'collection' : null;
}

export function getCollectionActionOverlayConfig(): CollectionActionOverlayConfig {
  return {
    autoDismissMs: 3000,
    backgroundTapDismisses: true,
    exclusive: true,
  };
}

export function getCategoryHeaderMenuLayoutConfig(): CategoryHeaderMenuLayoutConfig {
  return {
    position: 'absolute',
    right: 0,
    top: 42,
  };
}

export function getCategoryHeaderBadgeChromeConfig(): CategoryHeaderBadgeChromeConfig {
  return {
    borderColor: 'rgba(23, 23, 23, 0.021)',
    shadowOpacity: 0.019,
  };
}

export function getFloatingActionChromeConfig(): FloatingActionChromeConfig {
  return {
    backgroundColor: 'rgba(255, 255, 255, 0.46)',
    borderColor: 'rgba(255, 255, 255, 0.62)',
    shadowOpacity: 0.045,
    tintColor: 'rgba(255, 255, 255, 0.48)',
  };
}

export function getCopyActionLabel({ copied }: { copied: boolean }) {
  return copied ? 'Copied!' : 'Copy';
}

export function getSaveActionLabel({ confirming, saved }: { confirming?: boolean; saved: boolean }) {
  if (confirming && !saved) {
    return 'Save to Photos?';
  }

  return saved ? 'Saved!' : 'Save to Photos';
}

export function getFloatingActionPopAnimationConfig(): FloatingActionPopAnimationConfig {
  return {
    initialScale: 0.72,
    initialTranslateY: 8,
    springFriction: 5,
    springTension: 230,
  };
}

export function getSnagDragGestureConfig({ isStaged = false }: { isStaged?: boolean } = {}): SnagDragGestureConfig {
  if (isStaged) {
    return {
      activationDistance: 1,
      dragActivation: 'immediate',
      longPressMinDurationMs: 0,
    };
  }

  return {
    activationDistance: 4,
    dragActivation: 'after-long-press',
    longPressMinDurationMs: 301,
  };
}

export function getSnagGestureLifecycleConfig({ isStaged = false }: { isStaged?: boolean } = {}): SnagGestureLifecycleConfig {
  return {
    copyGestureCanReleaseDrag: false,
    dragReleaseTrigger: 'gesture-finalize',
    interactionStartTrigger: 'gesture-start',
    transformGestureCanReleaseDrag: false,
    settleStagedTrigger: isStaged ? 'drag-start' : 'none',
    touchResponderCanReleaseDrag: false,
  };
}

export function isAllCollectionAutoArranged({ categoryId }: { categoryId: string }) {
  return categoryId === 'all';
}

export function getAllCollectionSnagFrame({
  boardWidth,
  index,
}: {
  boardWidth: number;
  index: number;
}): AllCollectionSnagFrame {
  const paddingX = 18;
  const paddingY = 26;
  const horizontalGap = 12;
  const verticalGap = 16;
  const size = 104;
  const safeIndex = Math.max(0, Math.floor(index));
  const columns = Math.max(1, Math.floor((Math.max(size, boardWidth) - paddingX * 2 + horizontalGap) / (size + horizontalGap)));
  const column = safeIndex % columns;
  const row = Math.floor(safeIndex / columns);

  return {
    canvasX: roundSnagValue(paddingX + column * (size + horizontalGap)),
    canvasY: roundSnagValue(paddingY + row * (size + verticalGap)),
    rotate: '0deg',
    size,
  };
}

export function getAllCollectionContentHeight({
  boardHeight,
  boardWidth,
  itemCount,
}: {
  boardHeight: number;
  boardWidth: number;
  itemCount: number;
}) {
  if (itemCount <= 0 || !Number.isFinite(itemCount)) {
    return boardHeight;
  }

  const lastFrame = getAllCollectionSnagFrame({
    boardWidth,
    index: itemCount - 1,
  });

  return roundSnagValue(Math.max(boardHeight, lastFrame.canvasY + lastFrame.size + 26));
}

export function getCopyToastPresentation({
  right = 18,
  top = 72,
  viewportWidth,
}: {
  right?: number;
  top?: number;
  viewportWidth: number;
}): CopyToastPresentation {
  const toastWidth = 92;

  return {
    left: roundSnagValue(Math.max(12, viewportWidth - toastWidth - right)),
    message: 'Copied!',
    top: roundSnagValue(Math.max(0, top)),
  };
}

export function getCopyActionPresentation({
  actionWidth = 88,
  right = 18,
  top = 10,
  viewportWidth,
}: {
  actionWidth?: number;
  right?: number;
  top?: number;
  viewportWidth: number;
}): CopyActionPresentation {
  return {
    left: roundSnagValue(Math.max(10, viewportWidth - actionWidth - right)),
    top: roundSnagValue(Math.max(0, top)),
    width: actionWidth,
  };
}

export function getTrashSuckAnimationConfig(): TrashSuckAnimationConfig {
  return {
    armedScale: 0.38,
    durationMs: 280,
    finalScale: 0.06,
    haptic: 'impact-medium',
  };
}

export function isSnagInTrashDropZone({
  point,
  zone,
}: {
  point: SnagBoardPoint;
  zone: SnagTrashDropZone;
}) {
  'worklet';

  const distance = Math.hypot(point.x - zone.hitCenterX, point.y - zone.hitCenterY);
  return distance <= zone.dropRadius;
}

export function shouldKeepSnagArmedForTrash({
  point,
  zone,
}: {
  point: SnagBoardPoint;
  zone: SnagTrashDropZone;
}) {
  'worklet';

  const distance = Math.hypot(point.x - zone.hitCenterX, point.y - zone.hitCenterY);
  return distance <= zone.releaseRadius;
}

export function getPastedSnagPresentation({
  boardHeight,
  boardWidth,
  pointerX,
  pointerY,
  size = 180,
}: {
  boardHeight: number;
  boardWidth: number;
  pointerX: number;
  pointerY: number;
  size?: number;
}) {
  const safeSize = Math.max(64, size);
  const maxX = Math.max(0, boardWidth - safeSize);
  const maxY = Math.max(0, boardHeight - safeSize);

  return {
    canvasX: roundSnagValue(Math.max(0, Math.min(pointerX - safeSize / 2, maxX))),
    canvasY: roundSnagValue(Math.max(0, Math.min(pointerY - safeSize / 2, maxY))),
    size: safeSize,
  };
}

export function getNewSnagPresentation({
  preferredSize = 220,
  viewportHeight,
  viewportWidth,
}: {
  preferredSize?: number;
  viewportHeight: number;
  viewportWidth: number;
}) {
  const safeWidth = Math.max(viewportWidth, preferredSize);
  const visibleBoardHeight = Math.max(viewportHeight - 190, 540);

  return {
    canvasX: roundSnagValue(Math.max(24, safeWidth / 2 - preferredSize / 2)),
    canvasY: roundSnagValue(Math.max(72, visibleBoardHeight / 2 - preferredSize / 2)),
    size: preferredSize,
  };
}

export function createSnagFromAsset({
  asset,
  canvasX,
  canvasY,
  categoryId = 'all',
  createdAt = Date.now(),
  excludeFromAll = false,
  index,
  originSnagId,
  size,
}: {
  asset: CompletedAsset;
  canvasX?: number;
  canvasY?: number;
  categoryId?: string;
  createdAt?: number;
  excludeFromAll?: boolean;
  index: number;
  originSnagId?: string;
  size?: number;
}): RealSnagItem {
  const column = index % 4;
  const row = Math.floor(index / 4) % 3;

  return {
    category: categoryId,
    canvasX: canvasX ?? 250 + column * 146,
    canvasY: canvasY ?? 220 + row * 118,
    createdAt,
    ...(excludeFromAll ? { excludeFromAll: true } : {}),
    id: `snag-${createdAt}-${index}`,
    imageHeight: asset.height,
    imageUri: asset.uri,
    imageWidth: asset.width,
    layerIndex: index,
    ...(originSnagId ? { originSnagId } : {}),
    rotate: index % 2 === 0 ? '-4deg' : '5deg',
    size: size ?? 142,
    title: 'Snag',
  };
}

export function createTextSnag({
  canvasX,
  canvasY,
  categoryId,
  createdAt = Date.now(),
  excludeFromAll = true,
  index,
  size = 240,
  text,
}: {
  canvasX: number;
  canvasY: number;
  categoryId: string;
  createdAt?: number;
  excludeFromAll?: boolean;
  index: number;
  size?: number;
  text: string;
}): RealSnagItem {
  const normalizedText = normalizeTextSnagValue(text) || 'say something';

  return {
    category: categoryId,
    canvasX,
    canvasY,
    createdAt,
    ...(excludeFromAll ? { excludeFromAll: true } : {}),
    id: `text-snag-${createdAt}-${index}`,
    imageHeight: 112,
    imageWidth: 320,
    kind: 'text',
    layerIndex: index,
    rotate: '0deg',
    size,
    text: normalizedText,
    title: normalizedText,
  };
}

export function createSnagCategory({
  background = 'grid',
  backgroundStrength = DEFAULT_CATEGORY_BACKGROUND_STRENGTH,
  index,
  title,
}: {
  background?: string;
  backgroundStrength?: number;
  index: number;
  title?: string;
}): SnagCategoryItem {
  const nextIndex = index + 1;
  const backgroundOption = getCategoryBackground({ background });

  return {
    background: backgroundOption.id,
    backgroundStrength: getCategoryBackgroundStrength({ backgroundStrength }),
    color: CATEGORY_COLOR_OPTIONS[index % CATEGORY_COLOR_OPTIONS.length],
    id: `category-${nextIndex}`,
    title: title?.trim() || `Category ${nextIndex}`,
  };
}

export function getCategoryBackground(category: { background?: string }): SnagCategoryBackgroundOption {
  return CATEGORY_BACKGROUND_OPTIONS.find((option) => option.id === category.background) ?? CATEGORY_BACKGROUND_OPTIONS[0];
}

export function getCategoryBackgroundStrength(category: { backgroundStrength?: number }) {
  const strength = category.backgroundStrength;

  if (!Number.isFinite(strength)) {
    return DEFAULT_CATEGORY_BACKGROUND_STRENGTH;
  }

  return Math.round(Math.max(0.28, Math.min(strength ?? DEFAULT_CATEGORY_BACKGROUND_STRENGTH, 1)) * 100) / 100;
}

export function renameSnagCategory({
  categories,
  categoryId,
  title,
}: {
  categories: SnagCategoryItem[];
  categoryId: string;
  title: string;
}) {
  const trimmedTitle = title.trim();

  if (!trimmedTitle || categoryId === 'all') {
    return categories;
  }

  return categories.map((category) => (
    category.id === categoryId
      ? { ...category, title: trimmedTitle }
      : category
  ));
}

export function updateSnagCategoryColor({
  categories,
  categoryId,
  color,
}: {
  categories: SnagCategoryItem[];
  categoryId: string;
  color: string;
}) {
  if (categoryId === 'all' || !CATEGORY_COLOR_OPTIONS.includes(color as typeof CATEGORY_COLOR_OPTIONS[number])) {
    return categories;
  }

  return categories.map((category) => (
    category.id === categoryId
      ? { ...category, color }
      : category
  ));
}

export function updateSnagCategoryBackground({
  background,
  categories,
  categoryId,
}: {
  background: string;
  categories: SnagCategoryItem[];
  categoryId: string;
}) {
  const backgroundOption = CATEGORY_BACKGROUND_OPTIONS.find((option) => option.id === background);

  if (categoryId === 'all' || !backgroundOption) {
    return categories;
  }

  return categories.map((category) => (
    category.id === categoryId
      ? { ...category, background: backgroundOption.id }
      : category
  ));
}

export function updateSnagCategoryBackgroundStrength({
  categories,
  categoryId,
  strength,
}: {
  categories: SnagCategoryItem[];
  categoryId: string;
  strength: number;
}) {
  if (categoryId === 'all') {
    return categories;
  }

  const backgroundStrength = getCategoryBackgroundStrength({ backgroundStrength: strength });

  return categories.map((category) => (
    category.id === categoryId
      ? { ...category, backgroundStrength }
      : category
  ));
}

export function deleteSnagCategory({
  categories,
  categoryId,
  selectedCategoryId,
  snags,
}: {
  categories: SnagCategoryItem[];
  categoryId: string;
  selectedCategoryId: string;
  snags: RealSnagItem[];
}) {
  if (categoryId === 'all') {
    return {
      categories,
      selectedCategoryId,
      snags,
    };
  }

  const nextCategories = categories.filter((category) => category.id !== categoryId);
  const fallbackCategoryId = nextCategories.find((category) => category.id !== 'all')?.id ?? 'all';

  return {
    categories: nextCategories,
    selectedCategoryId: selectedCategoryId === categoryId ? fallbackCategoryId : selectedCategoryId,
    snags: snags.map((snag) => (
      snag.category === categoryId
        ? { ...snag, category: 'all' }
        : snag
    )),
  };
}

export function getNextCategoryId({
  categories,
  currentCategoryId,
  direction,
}: {
  categories: SnagCategoryItem[];
  currentCategoryId: string;
  direction: 'next' | 'previous';
}) {
  if (categories.length === 0) {
    return 'all';
  }

  const currentIndex = Math.max(0, categories.findIndex((category) => category.id === currentCategoryId));
  const offset = direction === 'next' ? 1 : -1;
  const nextIndex = (currentIndex + offset + categories.length) % categories.length;

  return categories[nextIndex].id;
}

export function getCategoryPageIndex({
  categories,
  categoryId,
}: {
  categories: SnagCategoryItem[];
  categoryId: string;
}) {
  return Math.max(0, categories.findIndex((category) => category.id === categoryId));
}

export function getCategoryPageOffset({
  categories,
  categoryId,
  pageHeight,
}: {
  categories: SnagCategoryItem[];
  categoryId: string;
  pageHeight: number;
}) {
  if (pageHeight <= 0 || Number.isNaN(pageHeight)) {
    return 0;
  }

  return getCategoryPageIndex({ categories, categoryId }) * pageHeight;
}

export function getCategoryIdFromPageOffset({
  categories,
  offsetY,
  pageHeight,
}: {
  categories: SnagCategoryItem[];
  offsetY: number;
  pageHeight: number;
}) {
  if (categories.length === 0) {
    return 'all';
  }

  if (pageHeight <= 0 || Number.isNaN(pageHeight) || Number.isNaN(offsetY)) {
    return categories[0].id;
  }

  const index = Math.max(0, Math.min(Math.round(offsetY / pageHeight), categories.length - 1));
  return categories[index].id;
}

export function getSnagsForCategory<T extends { category: string }>({
  categoryId,
  snags,
}: {
  categoryId: string;
  snags: T[];
}) {
  if (categoryId === 'all') {
    return snags.filter((snag) => !(snag as T & { excludeFromAll?: boolean }).excludeFromAll);
  }

  return snags.filter((snag) => snag.category === categoryId);
}

function getSnagRootId<T extends { id: string; originSnagId?: string }>(
  snag: T,
  snagsById: Map<string, T>,
) {
  const visitedIds = new Set<string>();
  let currentSnag = snag;

  while (currentSnag.originSnagId && !visitedIds.has(currentSnag.id)) {
    visitedIds.add(currentSnag.id);
    const parentSnag = snagsById.get(currentSnag.originSnagId);

    if (!parentSnag) {
      return currentSnag.originSnagId;
    }

    currentSnag = parentSnag;
  }

  return currentSnag.id;
}

export function deleteSelectedAllSnags<T extends { id: string; originSnagId?: string }>({
  selectedSnagIds,
  snags,
}: {
  selectedSnagIds: string[];
  snags: T[];
}) {
  if (selectedSnagIds.length === 0) {
    return snags;
  }

  const selectedIds = new Set(selectedSnagIds);
  const snagsById = new Map(snags.map((snag) => [snag.id, snag]));
  const selectedRootIds = new Set(
    snags
      .filter((snag) => selectedIds.has(snag.id))
      .map((snag) => getSnagRootId(snag, snagsById)),
  );

  return snags.filter((snag) => !selectedRootIds.has(getSnagRootId(snag, snagsById)));
}

export function shouldAnimateCategorySnap({ stagedSnagId }: { stagedSnagId: string | null }) {
  return stagedSnagId === null;
}

export function shouldRenderCollectionSurface({ libraryReady }: { libraryReady: boolean }) {
  return libraryReady;
}

export function shouldRenderAppLoadingScreen({
  cameraFlowOpen,
  collectionReady,
  libraryReady,
}: {
  cameraFlowOpen: boolean;
  collectionReady: boolean;
  libraryReady: boolean;
}) {
  return !cameraFlowOpen && (!libraryReady || !collectionReady);
}

export function getCategorySnapReason({
  hasExplicitRequest,
  requestedReason,
}: {
  hasExplicitRequest: boolean;
  requestedReason: CategorySnapReason;
}): CategorySnapReason {
  return hasExplicitRequest ? requestedReason : 'sync';
}

export function getCategorySnapCommand({
  categories,
  categoryId,
  pageHeight,
  reason,
  stagedSnagId,
}: {
  categories: SnagCategoryItem[];
  categoryId: string;
  pageHeight: number;
  reason: CategorySnapReason;
  stagedSnagId: string | null;
}) {
  if (pageHeight <= 0 || Number.isNaN(pageHeight)) {
    return null;
  }

  return {
    animated: reason === 'selection' && shouldAnimateCategorySnap({ stagedSnagId }),
    y: getCategoryPageOffset({ categories, categoryId, pageHeight }),
  };
}

export function shouldHandleCategoryPagerScrollEvent({
  currentTarget,
  target,
}: {
  currentTarget?: unknown;
  target?: unknown;
}) {
  if (currentTarget == null || target == null) {
    return true;
  }

  return currentTarget === target;
}

export function shouldAcceptCategoryPagerSettle({
  offsetY,
  pageHeight,
  snapActive,
  targetY,
}: {
  offsetY: number;
  pageHeight: number;
  snapActive: boolean;
  targetY: number;
}) {
  if (!snapActive) {
    return true;
  }

  if (
    pageHeight <= 0 ||
    !Number.isFinite(pageHeight) ||
    !Number.isFinite(offsetY) ||
    !Number.isFinite(targetY)
  ) {
    return true;
  }

  return Math.abs(offsetY - targetY) <= Math.max(12, pageHeight * 0.08);
}

export function getSnagRenderKey({ id }: { id: string }) {
  return id;
}

export function appendPendingSnag<T>(snags: T[], pendingSnag: T | null) {
  if (!pendingSnag) {
    return snags;
  }

  return [...snags, pendingSnag];
}

function getSnagLayerSortValue<T extends { layerIndex?: number }>(snag: T, fallbackIndex: number) {
  return typeof snag.layerIndex === 'number' && Number.isFinite(snag.layerIndex)
    ? snag.layerIndex
    : fallbackIndex;
}

export function getNextSnagLayerIndex<T extends { layerIndex?: number }>(snags: T[]) {
  return snags.reduce((maxLayerIndex, snag, index) => (
    Math.max(maxLayerIndex, getSnagLayerSortValue(snag, index))
  ), -1) + 1;
}

export function bringSnagToFront<T extends { id: string; layerIndex?: number }>(snags: T[], snagId: string) {
  const nextLayerIndex = getNextSnagLayerIndex(snags);

  return snags.map((snag) => (
    snag.id === snagId
      ? { ...snag, layerIndex: nextLayerIndex }
      : snag
  ));
}

export function getLayeredSnags<T extends { id: string; layerIndex?: number }>(snags: T[]) {
  return snags
    .map((snag, index) => ({ index, snag }))
    .sort((left, right) => {
      const layerDifference = getSnagLayerSortValue(left.snag, left.index) - getSnagLayerSortValue(right.snag, right.index);

      return layerDifference === 0 ? left.index - right.index : layerDifference;
    })
    .map(({ snag }) => snag);
}

export function getSnagTransformFrame<T extends TransformableSnagFrame>({
  snag,
  transform,
}: {
  snag: T;
  transform: SnagTransformPatch;
}) {
  const nextScale = Number.isFinite(transform.scale) ? Math.max(0.2, transform.scale) : 1;
  const nextRotation = parseRotationRadians(snag.rotate) + (Number.isFinite(transform.rotationRad) ? transform.rotationRad : 0);
  const nextSize = Math.max(44, snag.size * nextScale);
  const previousWidth = getSnagDisplayWidth(snag);
  const nextWidth = getSnagDisplayWidth({
    ...snag,
    size: nextSize,
  });
  const previousHeight = getSnagDisplayHeight(snag);
  const nextHeight = getSnagDisplayHeight({
    ...snag,
    size: nextSize,
  });

  return {
    canvasX: roundSnagValue(snag.canvasX + transform.translateX - (nextWidth - previousWidth) / 2),
    canvasY: roundSnagValue(snag.canvasY + transform.translateY - (nextHeight - previousHeight) / 2),
    rotate: `${roundSnagValue(nextRotation)}rad`,
    size: roundSnagValue(nextSize),
  };
}

export function applySnagTransform<T extends {
  canvasX: number;
  canvasY: number;
  id: string;
  kind?: 'image' | 'text';
  imageHeight?: number;
  imageWidth?: number;
  rotate: string;
  size: number;
  text?: string;
  title?: string;
}>(snags: T[], snagId: string, transform: SnagTransformPatch) {
  return snags.map((snag) => {
    if (snag.id !== snagId) {
      return snag;
    }

    const nextFrame = getSnagTransformFrame({ snag, transform });

    return {
      ...snag,
      ...nextFrame,
    };
  });
}

export function getPendingSnagTargetIndex<T extends { category: string }>({
  categoryId,
  snags,
}: {
  categoryId: string;
  snags: T[];
}) {
  return getSnagsForCategory({ categoryId, snags }).length;
}

export function getPendingLandingPreviewScale({
  previewSize = 310,
  targetSize,
}: {
  previewSize?: number;
  targetSize: number;
}) {
  if (targetSize <= 0 || Number.isNaN(targetSize)) {
    return 1;
  }

  return roundSnagValue(Math.max(1, previewSize / targetSize));
}

export function getPendingLandingStartTransform({
  boardHeight,
  targetSize,
  targetX,
  targetY,
  viewportWidth,
}: {
  boardHeight: number;
  targetSize: number;
  targetX: number;
  targetY: number;
  viewportWidth: number;
}) {
  const safeViewportWidth = Math.max(viewportWidth, targetSize);
  const startCenterX = safeViewportWidth / 2;
  const startCenterY = Math.max(
    targetSize / 2,
    Math.min(boardHeight * 0.38, boardHeight - targetSize / 2),
  );

  return {
    translateX: roundSnagValue(startCenterX - targetX - targetSize / 2),
    translateY: roundSnagValue(startCenterY - targetY - targetSize / 2),
  };
}

export function getCollectionViewportHeight({
  fallbackHeight,
  measuredHeight,
}: {
  fallbackHeight: number;
  measuredHeight: number;
}) {
  if (measuredHeight > 0 && !Number.isNaN(measuredHeight)) {
    return measuredHeight;
  }

  return fallbackHeight;
}

export function shouldRenderSnagFrame(_item: { imageUri?: string }) {
  return false;
}

export function shouldRenderCutoutOutline({
  isStaged,
  isTransformUnlocked,
}: {
  isStaged?: boolean;
  isTransformUnlocked?: boolean;
}) {
  return Boolean(isStaged || isTransformUnlocked);
}

export function clampSnagTranslation({
  basePosition,
  baseSize,
  containerSize,
  scale,
  translation,
}: {
  basePosition: number;
  baseSize: number;
  containerSize: number;
  scale: number;
  translation: number;
}) {
  'worklet';

  if (containerSize <= 0 || baseSize <= 0) {
    return translation;
  }

  const safeScale = Math.max(scale, 0.1);
  const scaledSize = baseSize * safeScale;
  const scaledStart = basePosition - (scaledSize - baseSize) / 2;
  const minTranslation = -scaledStart;
  const maxTranslation = containerSize - scaledStart - scaledSize;

  if (minTranslation > maxTranslation) {
    return (minTranslation + maxTranslation) / 2;
  }

  return Math.max(minTranslation, Math.min(translation, maxTranslation));
}

export function getMaxContainedSnagScale({
  baseHeight,
  baseWidth,
  containerHeight,
  containerWidth,
  preferredMax = 6,
}: {
  baseHeight: number;
  baseWidth: number;
  containerHeight: number;
  containerWidth: number;
  preferredMax?: number;
}) {
  'worklet';

  if (baseHeight <= 0 || baseWidth <= 0 || containerHeight <= 0 || containerWidth <= 0) {
    return preferredMax;
  }

  const containedScale = Math.min(containerWidth / baseWidth, containerHeight / baseHeight);
  return Math.max(1, Math.min(preferredMax, Math.round(containedScale * 1000) / 1000));
}
