import MaskedView from '@react-native-masked-view/masked-view';
import { Image } from 'expo-image';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Mask, Path, Rect } from 'react-native-svg';

import {
  appendManualCutoutStrokePoint,
  createManualCutoutStroke,
  getBrushSizeForCanvas,
  getManualCutoutMaskPoint,
  getManualCutoutPreviewMaskPaths,
  getManualCutoutPreviewStrategy,
  getManualCutoutStrokeMaskPoints,
  getNextCutoutEditScale,
  type ManualCutoutInteractionMode,
  type ManualCutoutMaskPoint,
  type ManualCutoutPoint,
  type ManualCutoutStroke,
} from '@/utils/manual-cutout';

type EditableCutoutProps = {
  brushSize: number;
  children?: ReactNode;
  imageHeight?: number;
  imageWidth?: number;
  interactionMode: ManualCutoutInteractionMode;
  onMaskPointsChange?: (points: ManualCutoutMaskPoint[]) => void;
  undoRevision?: number;
  uri?: string;
};

type CutoutTouchPoint = {
  x: number;
  y: number;
};

export function EditableCutout({
  brushSize,
  children,
  imageHeight,
  imageWidth,
  interactionMode,
  onMaskPointsChange,
  undoRevision = 0,
  uri,
}: EditableCutoutProps) {
  const strokeId = useRef(0);
  const activeStroke = useRef(false);
  const history = useRef<ManualCutoutStroke[][]>([]);
  const lastPoint = useRef<CutoutTouchPoint | null>(null);
  const lastUndoRevision = useRef(undoRevision);
  const pendingPoints = useRef<ManualCutoutPoint[]>([]);
  const pendingFrame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const strokesRef = useRef<ManualCutoutStroke[]>([]);
  const currentScale = useRef(1);
  const savedScale = useRef(1);
  const [strokes, setStrokes] = useState<ManualCutoutStroke[]>([]);
  const [layoutSize, setLayoutSize] = useState({ height: 0, width: 0 });
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  useEffect(() => {
    activeStroke.current = false;
    lastPoint.current = null;
  }, [interactionMode]);

  useEffect(() => () => {
    if (pendingFrame.current !== null) {
      cancelAnimationFrame(pendingFrame.current);
    }
  }, []);

  const publishMaskPoints = useCallback((nextStrokes: ManualCutoutStroke[], nextLayoutSize = layoutSize) => {
    if (!onMaskPointsChange) {
      return;
    }

    if (nextLayoutSize.width <= 0 || nextLayoutSize.height <= 0) {
      onMaskPointsChange([]);
      return;
    }

    onMaskPointsChange(
      getManualCutoutStrokeMaskPoints(nextStrokes)
        .map((point) =>
          getManualCutoutMaskPoint({
            imageHeight,
            imageWidth,
            layoutHeight: nextLayoutSize.height,
            layoutWidth: nextLayoutSize.width,
            point,
          }),
        )
        .filter((point): point is ManualCutoutMaskPoint => Boolean(point)),
    );
  }, [imageHeight, imageWidth, layoutSize, onMaskPointsChange]);

  useEffect(() => {
    publishMaskPoints(strokesRef.current);
  }, [publishMaskPoints]);

  useEffect(() => {
    if (undoRevision === lastUndoRevision.current) {
      return;
    }

    lastUndoRevision.current = undoRevision;
    const previousStrokes = history.current.pop();
    if (previousStrokes) {
      strokesRef.current = previousStrokes;
      setStrokes(previousStrokes);
      publishMaskPoints(previousStrokes);
    }
  }, [publishMaskPoints, undoRevision]);

  function nextStrokeId(index = 0) {
    strokeId.current += 1;
    return `${strokeId.current}-${index}`;
  }

  const flushPendingPoints = useCallback(() => {
    const points = pendingPoints.current;

    if (pendingFrame.current !== null) {
      cancelAnimationFrame(pendingFrame.current);
    }

    pendingPoints.current = [];
    pendingFrame.current = null;

    if (points.length === 0) {
      return strokesRef.current;
    }

    const activeManualStroke = strokesRef.current.at(-1);
    if (!activeManualStroke) {
      return strokesRef.current;
    }

    let nextActiveStroke = activeManualStroke;
    points.forEach((point) => {
      nextActiveStroke = appendManualCutoutStrokePoint({
        getId: nextStrokeId,
        point,
        stroke: nextActiveStroke,
      });
    });

    const nextStrokes = [
      ...strokesRef.current.slice(0, -1),
      nextActiveStroke,
    ];

    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
    return nextStrokes;
  }, []);

  const applyPoints = useCallback((points: ManualCutoutPoint[]) => {
    if (points.length === 0) {
      return;
    }

    pendingPoints.current.push(...points);

    if (pendingFrame.current !== null) {
      return;
    }

    pendingFrame.current = requestAnimationFrame(flushPendingPoints);
  }, [flushPendingPoints]);

  const beginStroke = useCallback((point: CutoutTouchPoint) => {
    activeStroke.current = true;
    lastPoint.current = point;

    const firstPoint = {
      id: nextStrokeId(),
      size: getBrushSizeForCanvas(brushSize, currentScale.current),
      x: point.x,
      y: point.y,
    };
    const nextStrokes = [
      ...strokesRef.current,
      createManualCutoutStroke({
        id: `stroke-${firstPoint.id}`,
        point: firstPoint,
      }),
    ];

    history.current.push(strokesRef.current);
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
  }, [brushSize]);

  const continueStroke = useCallback((point: CutoutTouchPoint) => {
    if (!activeStroke.current || !lastPoint.current) {
      beginStroke(point);
      return;
    }

    const pointWithBrush = {
      id: nextStrokeId(),
      size: getBrushSizeForCanvas(brushSize, currentScale.current),
      x: point.x,
      y: point.y,
    };

    lastPoint.current = point;
    applyPoints([pointWithBrush]);
  }, [applyPoints, beginStroke, brushSize]);

  const endStroke = useCallback(() => {
    const nextStrokes = flushPendingPoints();
    activeStroke.current = false;
    lastPoint.current = null;
    publishMaskPoints(nextStrokes);
  }, [flushPendingPoints, publishMaskPoints]);

  /* eslint-disable react-hooks/refs -- Gesture callbacks run after touch events, not during render. */
  const erase = Gesture.Pan()
    .enabled(interactionMode === 'erase')
    .minPointers(1)
    .maxPointers(1)
    .runOnJS(true)
    .onBegin((event) => {
      beginStroke({ x: event.x, y: event.y });
    })
    .onUpdate((event) => {
      continueStroke({ x: event.x, y: event.y });
    })
    .onFinalize(() => {
      endStroke();
    });

  const pan = Gesture.Pan()
    .minPointers(interactionMode === 'move' ? 1 : 2)
    .runOnJS(true)
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onUpdate((event) => {
      const nextScale = getNextCutoutEditScale(savedScale.current, event.scale);
      currentScale.current = nextScale;
      scale.value = nextScale;
    })
    .onEnd(() => {
      savedScale.current = currentScale.current;
    });
  /* eslint-enable react-hooks/refs */

  const rotate = Gesture.Rotation()
    .runOnJS(true)
    .onUpdate((event) => {
      rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const gesture = Gesture.Simultaneous(erase, pan, pinch, rotate);

  const viewportWidth = Math.max(layoutSize.width, 1);
  const viewportHeight = Math.max(layoutSize.height, 1);
  const previewMaskPaths = getManualCutoutPreviewMaskPaths(strokes);
  const previewStrategy = getManualCutoutPreviewStrategy({
    hasUri: Boolean(uri),
    layoutHeight: layoutSize.height,
    layoutWidth: layoutSize.width,
    maskPointCount: previewMaskPaths.length,
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotateZ: `${rotation.value}rad` },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={(event) => {
          setLayoutSize((currentSize) => {
            const nextSize = {
              height: event.nativeEvent.layout.height,
              width: event.nativeEvent.layout.width,
            };

            if (currentSize.height === nextSize.height && currentSize.width === nextSize.width) {
              return currentSize;
            }

            return nextSize;
          });
        }}
        style={[styles.layer, animatedStyle]}>
        {previewStrategy === 'children' ? (
          children
        ) : previewStrategy === 'plain-native-image' ? (
          <Image source={{ uri }} style={styles.image} contentFit="contain" />
        ) : (
          <MaskedView
            style={styles.image}
            maskElement={
              <Svg
                height="100%"
                pointerEvents="none"
                preserveAspectRatio="none"
                style={styles.image}
                viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
                width="100%">
                <Defs>
                  <Mask
                    height={viewportHeight}
                    id="manualEraseAlphaMask"
                    maskContentUnits="userSpaceOnUse"
                    maskUnits="userSpaceOnUse"
                    width={viewportWidth}
                    x={0}
                    y={0}>
                    <Rect fill="#FFFFFF" height={viewportHeight} width={viewportWidth} x={0} y={0} />
                    {previewMaskPaths.map((path) => (
                      <Path
                        d={path.d}
                        fill="none"
                        key={path.id}
                        stroke="#000000"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={path.strokeWidth}
                      />
                    ))}
                  </Mask>
                </Defs>
                <Rect
                  fill="#FFFFFF"
                  height={viewportHeight}
                  mask="url(#manualEraseAlphaMask)"
                  width={viewportWidth}
                  x={0}
                  y={0}
                />
              </Svg>
            }>
            <Image source={{ uri }} style={styles.image} contentFit="contain" />
          </MaskedView>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  layer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
