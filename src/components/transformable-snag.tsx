import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing as ReanimatedEasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

import { type SnagItem } from '@/data/snags';
import {
  clampSnagTranslation,
  getCopyLongPressConfig,
  getMaxContainedSnagScale,
  getSnagDragGestureConfig,
  getSnagGestureLifecycleConfig,
  getSnagTransformGestureFrame,
  getTextSnagLayout,
  getTrashSuckAnimationConfig,
  shouldRenderSnagFrame,
  shouldRenderCutoutOutline,
  shouldKeepSnagArmedForTrash,
  type SnagBoardPoint,
  type SnagTrashDropZone,
  type SnagTransformGestureSurface,
  type SnagTransformPatch,
} from '@/utils/snags';

type TransformableSnagProps = {
  containerHeight?: number;
  containerWidth?: number;
  item: SnagItem;
  isStaged?: boolean;
  isTransformUnlocked?: boolean;
  gestureSurface?: SnagTransformGestureSurface;
  onCopyRequested: (id: string, point: SnagCopyRequestPoint) => void;
  onDeleteComplete?: (id: string) => void;
  onDragEnd?: (id: string, point: SnagBoardPoint, willDelete?: boolean) => void;
  onDragMove?: (id: string, point: SnagBoardPoint) => void;
  onDragStart?: (id: string) => void;
  onInteractionEnd?: (id: string) => void;
  onInteractionStart?: (id: string) => void;
  onTextEditRequested?: (id: string, point: SnagCopyRequestPoint) => void;
  onTouchPrepare?: (id: string) => void;
  onTransformEnd?: (id: string, transform: SnagTransformPatch) => void;
  trashDropZone?: SnagTrashDropZone | null;
  viewportOffsetX?: SharedValue<number>;
  viewportOffsetY?: SharedValue<number>;
  displaySize?: number;
  initialRotation?: string;
  x?: number;
  y?: number;
};

export type SnagCopyRequestPoint = SnagBoardPoint & {
  screenX: number;
  screenY: number;
};

const OUTLINE_OFFSETS = [
  { x: -4, y: 0 },
  { x: 4, y: 0 },
  { x: 0, y: -4 },
  { x: 0, y: 4 },
  { x: -3, y: -3 },
  { x: 3, y: -3 },
  { x: -3, y: 3 },
  { x: 3, y: 3 },
  { x: -6, y: 0 },
  { x: 6, y: 0 },
  { x: 0, y: -6 },
  { x: 0, y: 6 },
];

const TRANSFORM_EPSILON = 0.01;

function parseRotationRadians(rotationText: string) {
  const value = Number.parseFloat(rotationText);

  if (!Number.isFinite(value)) {
    return 0;
  }

  if (rotationText.trim().endsWith('deg')) {
    return (value * Math.PI) / 180;
  }

  if (rotationText.trim().endsWith('rad')) {
    return value;
  }

  return 0;
}

function roundSnagValue(value: number) {
  'worklet';

  return Math.round(value * 1000) / 1000;
}

export function TransformableSnag({
  containerHeight = 0,
  containerWidth = 0,
  displaySize,
  initialRotation,
  gestureSurface = 'full-board',
  isStaged,
  isTransformUnlocked = false,
  item,
  onCopyRequested,
  onDeleteComplete,
  onDragEnd,
  onDragMove,
  onDragStart,
  onInteractionEnd,
  onInteractionStart,
  onTextEditRequested,
  onTouchPrepare,
  onTransformEnd,
  trashDropZone,
  viewportOffsetX,
  viewportOffsetY,
  x,
  y,
}: TransformableSnagProps) {
  const size = displaySize ?? item.size;
  const isTextItem = item.kind === 'text';
  const textLayout = isTextItem ? getTextSnagLayout({ size, text: item.text ?? item.title }) : null;
  const imageAspect = item.imageWidth && item.imageHeight ? item.imageHeight / item.imageWidth : 1;
  const itemWidth = textLayout?.width ?? size;
  const itemHeight = textLayout?.height ?? size * Math.max(0.55, Math.min(imageAspect, 1.45));
  const imageUri = item.imageUri;
  const baseX = x ?? item.canvasX;
  const baseY = y ?? item.canvasY;
  const baseWidth = useSharedValue(itemWidth);
  const baseHeight = useSharedValue(itemHeight);
  const baseTranslateX = useSharedValue(baseX);
  const baseTranslateY = useSharedValue(baseY);
  const baseRotation = useSharedValue(parseRotationRadians(initialRotation ?? item.rotate));
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);
  const deleteConfig = getTrashSuckAnimationConfig();
  const copyLongPressConfig = getCopyLongPressConfig();
  const dragGestureConfig = getSnagDragGestureConfig({ isStaged });
  const gestureLifecycleConfig = getSnagGestureLifecycleConfig({ isStaged });
  const deleteArmedScale = deleteConfig.armedScale;
  const deleteDurationMs = deleteConfig.durationMs;
  const deleteFinalScale = deleteConfig.finalScale;
  const isTrashArmed = useSharedValue(0);
  const trashScale = useSharedValue(1);
  const moveActive = useSharedValue(0);
  const fallbackViewportOffsetX = useSharedValue(0);
  const fallbackViewportOffsetY = useSharedValue(0);
  const activeViewportOffsetX = viewportOffsetX ?? fallbackViewportOffsetX;
  const activeViewportOffsetY = viewportOffsetY ?? fallbackViewportOffsetY;
  const dragStartViewportOffsetX = useSharedValue(0);
  const dragStartViewportOffsetY = useSharedValue(0);
  const panActive = useSharedValue(0);

  function handleTouchPrepare() {
    onTouchPrepare?.(item.id);
  }

  function reportInteractionStart() {
    onInteractionStart?.(item.id);
  }

  function reportInteractionEnd() {
    onInteractionEnd?.(item.id);
  }

  function reportDragStart() {
    onDragStart?.(item.id);
  }

  function reportDragMove(point: SnagBoardPoint) {
    onDragMove?.(item.id, point);
  }

  function reportDragEnd(point: SnagBoardPoint, willDelete?: boolean) {
    onDragEnd?.(item.id, point, willDelete);
  }

  function reportDeleteComplete() {
    onDeleteComplete?.(item.id);
  }

  function reportCopyRequest(point: SnagCopyRequestPoint) {
    onCopyRequested(item.id, point);
  }

  function reportTextEditRequest(point: SnagCopyRequestPoint) {
    onTextEditRequested?.(item.id, point);
  }

  function commitTransform(
    nextTranslateX: number,
    nextTranslateY: number,
    nextScale: number,
    nextRotation: number,
  ) {
    if (!onTransformEnd) {
      return;
    }

    if (
      Math.abs(nextTranslateX) < TRANSFORM_EPSILON &&
      Math.abs(nextTranslateY) < TRANSFORM_EPSILON &&
      Math.abs(nextScale - 1) < TRANSFORM_EPSILON &&
      Math.abs(nextRotation) < TRANSFORM_EPSILON
    ) {
      return;
    }

    onTransformEnd(item.id, {
      rotationRad: nextRotation,
      scale: nextScale,
      translateX: nextTranslateX,
      translateY: nextTranslateY,
    });
  }

  const maxScale = getMaxContainedSnagScale({
    baseHeight: itemHeight,
    baseWidth: itemWidth,
    containerHeight,
    containerWidth,
  });
  const renderFrame = shouldRenderSnagFrame(item);
  const renderCutoutOutline = shouldRenderCutoutOutline({ isStaged, isTransformUnlocked });
  const textTypography = textLayout
    ? { fontSize: textLayout.fontSize, lineHeight: textLayout.lineHeight }
    : null;
  const transformGestureFrame = getSnagTransformGestureFrame({
    containerHeight,
    containerWidth,
    contentHeight: itemHeight,
    contentWidth: itemWidth,
    contentX: baseX,
    contentY: baseY,
    surface: gestureSurface,
  });

  const panGesture = Gesture.Pan();

  if (dragGestureConfig.dragActivation === 'after-long-press') {
    panGesture.activateAfterLongPress(dragGestureConfig.longPressMinDurationMs);
  }

  const pan = panGesture
    .minDistance(dragGestureConfig.activationDistance)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      'worklet';

      dragStartViewportOffsetX.value = activeViewportOffsetX.value;
      dragStartViewportOffsetY.value = activeViewportOffsetY.value;
      panActive.value = 1;
      moveActive.value = withTiming(1, {
        duration: 120,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      });
      if (onDragStart) {
        runOnJS(reportDragStart)();
      }
    })
    .onUpdate((event) => {
      'worklet';

      const rawTranslateX = savedTranslateX.value + event.translationX;
      const rawTranslateY = savedTranslateY.value + event.translationY;
      let nextTranslateX = clampSnagTranslation({
        basePosition: baseTranslateX.value,
        baseSize: baseWidth.value,
        containerSize: containerWidth,
        scale: scale.value,
        translation: rawTranslateX,
      });
      let nextTranslateY = clampSnagTranslation({
        basePosition: baseTranslateY.value,
        baseSize: baseHeight.value,
        containerSize: containerHeight,
        scale: scale.value,
        translation: rawTranslateY,
      });
      const fingerScreenPoint = {
        x: event.absoluteX,
        y: event.absoluteY,
      };

      let dragReportPoint = fingerScreenPoint;

      if (trashDropZone) {
        const deltaX = trashDropZone.hitCenterX - fingerScreenPoint.x;
        const deltaY = trashDropZone.hitCenterY - fingerScreenPoint.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const targetTranslateX = trashDropZone.centerX - baseTranslateX.value - baseWidth.value / 2;
        const targetTranslateY = trashDropZone.centerY - baseTranslateY.value - baseHeight.value / 2;
        const shouldEnterTrash = distance <= trashDropZone.dropRadius;
        const shouldStayInTrash = isTrashArmed.value === 1 && shouldKeepSnagArmedForTrash({
          point: fingerScreenPoint,
          zone: trashDropZone,
        });
        const nextTrashArmed = shouldEnterTrash || shouldStayInTrash;

        if (nextTrashArmed) {
          isTrashArmed.value = 1;
          nextTranslateX = targetTranslateX;
          nextTranslateY = targetTranslateY;
          dragReportPoint = {
            x: trashDropZone.hitCenterX,
            y: trashDropZone.hitCenterY,
          };
          if (trashScale.value !== deleteArmedScale) {
            trashScale.value = withTiming(deleteArmedScale, {
              duration: 130,
              easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
            });
          }
        } else {
          isTrashArmed.value = 0;
          if (trashScale.value !== 1) {
            trashScale.value = withTiming(1, {
              duration: 120,
              easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
            });
          }
        }
      } else {
        isTrashArmed.value = 0;
        if (trashScale.value !== 1) {
          trashScale.value = withTiming(1, {
            duration: 120,
            easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
          });
        }
      }

      translateX.value = nextTranslateX;
      translateY.value = nextTranslateY;

      if (onDragMove) {
        runOnJS(reportDragMove)(dragReportPoint);
      }
    })
    .onEnd((event) => {
      'worklet';

      const viewportDeltaX = activeViewportOffsetX.value - dragStartViewportOffsetX.value;
      const viewportDeltaY = activeViewportOffsetY.value - dragStartViewportOffsetY.value;
      const nextTranslateX = translateX.value + viewportDeltaX;
      const nextTranslateY = translateY.value + viewportDeltaY;
      const nextScale = scale.value;
      const nextRotation = rotation.value;
      const nextWidth = Math.max(44, baseWidth.value * nextScale);
      const nextHeight = baseHeight.value * (nextWidth / baseWidth.value);
      const committedTranslateX = clampSnagTranslation({
        basePosition: baseTranslateX.value,
        baseSize: baseWidth.value,
        containerSize: containerWidth,
        scale: nextScale,
        translation: nextTranslateX,
      });
      const committedTranslateY = clampSnagTranslation({
        basePosition: baseTranslateY.value,
        baseSize: baseHeight.value,
        containerSize: containerHeight,
        scale: nextScale,
        translation: nextTranslateY,
      });
      const fingerScreenPoint = {
        x: event.absoluteX,
        y: event.absoluteY,
      };
      const shouldDelete = trashDropZone
        ? isTrashArmed.value === 1 ||
          Math.sqrt(
            (fingerScreenPoint.x - trashDropZone.hitCenterX) * (fingerScreenPoint.x - trashDropZone.hitCenterX) +
            (fingerScreenPoint.y - trashDropZone.hitCenterY) * (fingerScreenPoint.y - trashDropZone.hitCenterY),
          ) <= trashDropZone.dropRadius
        : false;

      if (shouldDelete && trashDropZone) {
        panActive.value = 0;
        if (onDragEnd) {
          runOnJS(reportDragEnd)({
            x: trashDropZone.hitCenterX,
            y: trashDropZone.hitCenterY,
          }, true);
        }

        const targetTranslateX = trashDropZone.centerX - baseTranslateX.value - baseWidth.value / 2;
        const targetTranslateY = trashDropZone.centerY - baseTranslateY.value - baseHeight.value / 2;

        isTrashArmed.value = 0;
        translateX.value = withTiming(targetTranslateX, {
          duration: deleteDurationMs,
          easing: ReanimatedEasing.in(ReanimatedEasing.cubic),
        });
        translateY.value = withTiming(targetTranslateY, {
          duration: deleteDurationMs,
          easing: ReanimatedEasing.in(ReanimatedEasing.cubic),
        });
        scale.value = withTiming(deleteFinalScale, {
          duration: deleteDurationMs,
          easing: ReanimatedEasing.in(ReanimatedEasing.cubic),
        });
        trashScale.value = withTiming(1, {
          duration: deleteDurationMs,
          easing: ReanimatedEasing.in(ReanimatedEasing.cubic),
        });
        rotation.value = withTiming(nextRotation + 0.18, {
          duration: deleteDurationMs,
          easing: ReanimatedEasing.in(ReanimatedEasing.cubic),
        }, (finished) => {
          if (finished) {
            runOnJS(reportDeleteComplete)();
          }
        });
        moveActive.value = withTiming(0, {
          duration: 90,
          easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
        });
        return;
      }

      if (onDragEnd) {
        runOnJS(reportDragEnd)(fingerScreenPoint, false);
      }
      isTrashArmed.value = 0;
      if (trashScale.value !== 1) {
        trashScale.value = withTiming(1, {
          duration: 120,
          easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
        });
      }
      runOnJS(commitTransform)(committedTranslateX, committedTranslateY, nextScale, nextRotation);
      baseTranslateX.value = roundSnagValue(baseTranslateX.value + committedTranslateX - (nextWidth - baseWidth.value) / 2);
      baseTranslateY.value = roundSnagValue(baseTranslateY.value + committedTranslateY - (nextHeight - baseHeight.value) / 2);
      baseWidth.value = roundSnagValue(nextWidth);
      baseHeight.value = roundSnagValue(nextHeight);
      baseRotation.value = roundSnagValue(baseRotation.value + nextRotation);
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      scale.value = 1;
      savedScale.value = 1;
      rotation.value = 0;
      savedRotation.value = 0;
      panActive.value = 0;
      moveActive.value = withTiming(0, {
        duration: 120,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      });
    })
    .onFinalize(() => {
      'worklet';

      if (gestureLifecycleConfig.dragReleaseTrigger === 'gesture-finalize' && onInteractionEnd) {
        runOnJS(reportInteractionEnd)();
      }
      moveActive.value = withTiming(0, {
        duration: 120,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      });
      panActive.value = 0;
    });

  const pinch = Gesture.Pinch()
    .shouldCancelWhenOutside(false)
    .onBegin(() => {
      'worklet';

      if (gestureLifecycleConfig.interactionStartTrigger === 'gesture-start' && onInteractionStart) {
        runOnJS(reportInteractionStart)();
      }
    })
    .onUpdate((event) => {
      'worklet';

      scale.value = Math.max(0.28, Math.min(savedScale.value * event.scale, maxScale));
      translateX.value = clampSnagTranslation({
        basePosition: baseTranslateX.value,
        baseSize: baseWidth.value,
        containerSize: containerWidth,
        scale: scale.value,
        translation: translateX.value,
      });
      translateY.value = clampSnagTranslation({
        basePosition: baseTranslateY.value,
        baseSize: baseHeight.value,
        containerSize: containerHeight,
        scale: scale.value,
        translation: translateY.value,
      });
    })
    .onEnd(() => {
      'worklet';

      const nextTranslateX = translateX.value;
      const nextTranslateY = translateY.value;
      const nextScale = scale.value;
      const nextRotation = rotation.value;
      const nextWidth = Math.max(44, baseWidth.value * nextScale);
      const nextHeight = baseHeight.value * (nextWidth / baseWidth.value);

      runOnJS(commitTransform)(nextTranslateX, nextTranslateY, nextScale, nextRotation);
      baseTranslateX.value = roundSnagValue(baseTranslateX.value + nextTranslateX - (nextWidth - baseWidth.value) / 2);
      baseTranslateY.value = roundSnagValue(baseTranslateY.value + nextTranslateY - (nextHeight - baseHeight.value) / 2);
      baseWidth.value = roundSnagValue(nextWidth);
      baseHeight.value = roundSnagValue(nextHeight);
      baseRotation.value = roundSnagValue(baseRotation.value + nextRotation);
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      scale.value = 1;
      savedScale.value = 1;
      rotation.value = 0;
      savedRotation.value = 0;
    });

  const rotate = Gesture.Rotation()
    .shouldCancelWhenOutside(false)
    .onBegin(() => {
      'worklet';

      if (gestureLifecycleConfig.interactionStartTrigger === 'gesture-start' && onInteractionStart) {
        runOnJS(reportInteractionStart)();
      }
    })
    .onUpdate((event) => {
      'worklet';

      rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
      'worklet';

      const nextTranslateX = translateX.value;
      const nextTranslateY = translateY.value;
      const nextScale = scale.value;
      const nextRotation = rotation.value;
      const nextWidth = Math.max(44, baseWidth.value * nextScale);
      const nextHeight = baseHeight.value * (nextWidth / baseWidth.value);

      runOnJS(commitTransform)(nextTranslateX, nextTranslateY, nextScale, nextRotation);
      baseTranslateX.value = roundSnagValue(baseTranslateX.value + nextTranslateX - (nextWidth - baseWidth.value) / 2);
      baseTranslateY.value = roundSnagValue(baseTranslateY.value + nextTranslateY - (nextHeight - baseHeight.value) / 2);
      baseWidth.value = roundSnagValue(nextWidth);
      baseHeight.value = roundSnagValue(nextHeight);
      baseRotation.value = roundSnagValue(baseRotation.value + nextRotation);
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      scale.value = 1;
      savedScale.value = 1;
      rotation.value = 0;
      savedRotation.value = 0;
    });

  const longPress = Gesture.LongPress()
    .minDuration(copyLongPressConfig.minDurationMs)
    .shouldCancelWhenOutside(false)
    .runOnJS(true)
    .onStart((event) => {
      if (gestureLifecycleConfig.interactionStartTrigger === 'gesture-start' && onInteractionStart) {
        reportInteractionStart();
      }
      (isTextItem ? reportTextEditRequest : reportCopyRequest)({
        screenX: event.absoluteX,
        screenY: event.absoluteY,
        x: event.x,
        y: event.y,
      });
    });

  const gesture = Gesture.Simultaneous(pan, pinch, rotate, longPress);

  const animatedStyle = useAnimatedStyle(() => {
    const viewportDeltaX = panActive.value === 1 && isTrashArmed.value === 0
      ? activeViewportOffsetX.value - dragStartViewportOffsetX.value
      : 0;
    const viewportDeltaY = panActive.value === 1 && isTrashArmed.value === 0
      ? activeViewportOffsetY.value - dragStartViewportOffsetY.value
      : 0;
    const compensatedTranslateX = clampSnagTranslation({
      basePosition: baseTranslateX.value,
      baseSize: baseWidth.value,
      containerSize: containerWidth,
      scale: scale.value,
      translation: translateX.value + viewportDeltaX,
    });
    const compensatedTranslateY = clampSnagTranslation({
      basePosition: baseTranslateY.value,
      baseSize: baseHeight.value,
      containerSize: containerHeight,
      scale: scale.value,
      translation: translateY.value + viewportDeltaY,
    });

    return {
      height: baseHeight.value,
      left: baseTranslateX.value - transformGestureFrame.left,
      top: baseTranslateY.value - transformGestureFrame.top,
      transform: [
        { translateX: compensatedTranslateX },
        { translateY: compensatedTranslateY },
        { scale: scale.value },
        { scale: trashScale.value },
        { rotateZ: `${baseRotation.value + rotation.value}rad` },
      ],
      width: baseWidth.value,
    };
  });

  const moveReadyOutlineStyle = useAnimatedStyle(() => ({
    opacity: moveActive.value,
    transform: [{ scale: 1 + moveActive.value * 0.035 }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        pointerEvents={isTransformUnlocked ? 'auto' : 'box-none'}
        style={[
          styles.gestureCanvas,
          {
            height: transformGestureFrame.height,
            left: transformGestureFrame.left,
            top: transformGestureFrame.top,
            width: transformGestureFrame.width,
          },
          isTransformUnlocked && styles.unlockedGestureSurface,
        ]}>
        <Animated.View
          onTouchStart={handleTouchPrepare}
          style={[
            styles.wrapper,
            animatedStyle,
          ]}>
          <Animated.View
            style={[
              styles.stickerLayer,
              isTextItem ? styles.textSticker : styles.imageSticker,
              renderFrame && styles.framedSticker,
              isStaged && styles.stagedSticker,
            ]}>
            {isTextItem ? (
              <Text
                allowFontScaling={false}
                ellipsizeMode="clip"
                numberOfLines={1}
                style={[
                  styles.textStickerText,
                  textTypography,
                ]}>
                {item.text}
              </Text>
            ) : (
              <>
            {renderCutoutOutline && imageUri && (
              <Animated.View pointerEvents="none" style={[styles.moveReadyOutline, moveReadyOutlineStyle]}>
                <CutoutOutline tintColor="#E8E8E2" uri={imageUri} />
              </Animated.View>
            )}
            {isStaged && imageUri && <CutoutOutline uri={imageUri} />}
            {imageUri && <Image
              allowDownscaling
              cachePolicy="memory-disk"
              contentFit="contain"
              enforceEarlyResizing
              source={{ uri: imageUri }}
              style={styles.image}
              transition={0}
            />}
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function CutoutOutline({
  tintColor = '#FFFFFF',
  uri,
}: {
  tintColor?: string;
  uri: string;
}) {
  return (
    <View pointerEvents="none" style={styles.cutoutOutline}>
      {OUTLINE_OFFSETS.map((offset) => (
        <Image
          allowDownscaling
          contentFit="contain"
          enforceEarlyResizing
          key={`${offset.x}-${offset.y}`}
          source={{ uri }}
          style={[
            styles.image,
            styles.outlineImage,
            { transform: [{ translateX: offset.x }, { translateY: offset.y }] },
          ]}
          cachePolicy="memory-disk"
          transition={0}
          tintColor={tintColor}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gestureCanvas: {
    overflow: 'visible',
    position: 'absolute',
  },
  unlockedGestureSurface: {
    zIndex: 30,
  },
  wrapper: {
    position: 'absolute',
  },
  stickerLayer: {
    flex: 1,
  },
  imageSticker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSticker: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  textStickerText: {
    color: '#171717',
    fontFamily: 'DynaPuff',
    includeFontPadding: false,
    maxWidth: '100%',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.92)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  framedSticker: {
    borderWidth: 5,
    borderColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#101010',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
  stagedSticker: {
    shadowColor: '#101010',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 28,
  },
  moveReadyOutline: {
    bottom: 0,
    left: 0,
    opacity: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  cutoutOutline: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  outlineImage: {
    position: 'absolute',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
