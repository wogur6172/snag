import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyManualCutoutStroke,
  appendManualCutoutStrokePoint,
  clampCameraZoom,
  createManualCutoutPointBatch,
  createManualCutoutStroke,
  createManualCutoutStrokePoints,
  getContainedImageFrame,
  getBrushSliderValue,
  getBrushSizeForCanvas,
  getCheckerboardCells,
  getManualCutoutPreviewMaskCircles,
  getManualCutoutPreviewMaskPaths,
  getManualCutoutStrokeMaskPoints,
  getManualCutoutPreviewStrategy,
  getManualCutoutMaskPoint,
  getNextCutoutEditScale,
  getNextCameraZoom,
  shouldStartManualErase,
  smoothCameraZoom,
} from '../src/utils/manual-cutout.ts';

describe('manual cutout controls', () => {
  it('keeps camera zoom inside the native camera range', () => {
    assert.equal(clampCameraZoom(-0.2), 0);
    assert.equal(clampCameraZoom(0.45), 0.45);
    assert.equal(clampCameraZoom(1.4), 1);
    assert.equal(clampCameraZoom(Number.NaN), 0);
  });

  it('maps pinch distance into camera zoom changes', () => {
    assert.equal(getNextCameraZoom(0.2, 100, 260), 0.601);
    assert.equal(getNextCameraZoom(0.2, 260, 100), 0);
    assert.equal(getNextCameraZoom(0.8, 100, 300), 1);
  });

  it('lets one continuous pinch zoom back out from the 1.5x area', () => {
    assert.equal(getNextCameraZoom(0.125, 260, 100), 0);
    assert.equal(getNextCameraZoom(0.5, 260, 100), 0.252);
  });

  it('smooths zoom updates without snapping around low zoom levels', () => {
    assert.equal(smoothCameraZoom(0.12, 0.3), 0.221);
    assert.equal(smoothCameraZoom(0.3, 0.12), 0.199);
    assert.equal(smoothCameraZoom(0.125, 0), 0.055);
  });

  it('adds erase strokes and removes nearby strokes in restore mode', () => {
    const firstPoint = { id: 'a', x: 40, y: 40, size: 24 };
    const secondPoint = { id: 'b', x: 140, y: 140, size: 24 };

    const erased = applyManualCutoutStroke({
      currentPoints: [],
      point: firstPoint,
      tool: 'erase',
    });
    assert.deepEqual(erased, [firstPoint]);

    const moreErased = applyManualCutoutStroke({
      currentPoints: erased,
      point: secondPoint,
      tool: 'erase',
    });
    assert.deepEqual(moreErased, [firstPoint, secondPoint]);

    const restored = applyManualCutoutStroke({
      currentPoints: moreErased,
      point: { id: 'restore', x: 43, y: 43, size: 28 },
      tool: 'restore',
    });
    assert.deepEqual(restored, [secondPoint]);
  });

  it('can apply many manual erase points in one batched state update', () => {
    const currentPoints = [{ id: 'base', x: 10, y: 10, size: 12 }];
    const nextPoints = createManualCutoutPointBatch({
      currentPoints,
      points: [
        { id: 'a', x: 20, y: 20, size: 12 },
        { id: 'b', x: 24, y: 22, size: 12 },
        { id: 'c', x: 28, y: 24, size: 12 },
      ],
      tool: 'erase',
    });

    assert.deepEqual(
      nextPoints.map((point) => point.id),
      ['base', 'a', 'b', 'c'],
    );
    assert.equal(nextPoints.length, 4);
  });

  it('renders a full manual erase stroke as one preview mask path', () => {
    const stroke = createManualCutoutStroke({
      id: 'stroke-1',
      point: { id: 'point-1', x: 10, y: 12, size: 14 },
    });
    const updatedStroke = appendManualCutoutStrokePoint({
      getId: (index) => `point-next-${index}`,
      point: { id: 'point-2', x: 80, y: 52, size: 14 },
      stroke,
    });
    const previewPaths = getManualCutoutPreviewMaskPaths([updatedStroke]);

    assert.equal(previewPaths.length, 1);
    assert.equal(previewPaths[0].id, 'stroke-1');
    assert.equal(previewPaths[0].strokeWidth, 14);
    assert.match(previewPaths[0].d, /^M 10 12/);
    assert.match(previewPaths[0].d, /L 80 52$/);
    assert.ok(getManualCutoutStrokeMaskPoints([updatedStroke]).length > 2);
  });

  it('keeps brush size visually small when the image is zoomed in', () => {
    assert.equal(getBrushSizeForCanvas(8, 1), 8);
    assert.equal(getBrushSizeForCanvas(8, 4), 2);
    assert.equal(getBrushSizeForCanvas(8, 12), 1);
    assert.equal(getBrushSizeForCanvas(6, 6), 1);
  });

  it('clamps brush slider drags into stable rounded brush sizes', () => {
    assert.equal(getBrushSliderValue({ max: 30, min: 6, trackWidth: 240, x: 0 }), 6);
    assert.equal(getBrushSliderValue({ max: 30, min: 6, trackWidth: 240, x: 120 }), 18);
    assert.equal(getBrushSliderValue({ max: 30, min: 6, trackWidth: 240, x: 420 }), 30);
    assert.equal(getBrushSliderValue({ max: 30, min: 6, trackWidth: 0, x: 120 }), 6);
  });

  it('builds checkerboard cells for the transparent preview background', () => {
    assert.deepEqual(
      getCheckerboardCells({
        cellSize: 8,
        height: 16,
        width: 16,
      }),
      [
        { id: '0-0', isAlt: true, x: 0, y: 0 },
        { id: '0-1', isAlt: false, x: 8, y: 0 },
        { id: '1-0', isAlt: false, x: 0, y: 8 },
        { id: '1-1', isAlt: true, x: 8, y: 8 },
      ],
    );

    assert.deepEqual(
      getCheckerboardCells({
        cellSize: 8,
        height: 10,
        originX: 4,
        originY: 4,
        width: 10,
      }).slice(0, 2),
      [
        { id: '0-0', isAlt: true, x: -4, y: -4 },
        { id: '0-1', isAlt: false, x: 4, y: -4 },
      ],
    );
  });

  it('turns manual erase points into transparent preview mask holes', () => {
    assert.deepEqual(
      getManualCutoutPreviewMaskCircles([
        { id: 'a', size: 12, x: 20, y: 30 },
        { id: 'b', size: 8, x: 40, y: 50 },
      ]),
      [
        { id: 'a', cx: 20, cy: 30, fill: '#000000', r: 6 },
        { id: 'b', cx: 40, cy: 50, fill: '#000000', r: 4 },
      ],
    );
  });

  it('keeps captured photos in the native image renderer until masking is needed', () => {
    assert.equal(
      getManualCutoutPreviewStrategy({
        hasUri: true,
        layoutHeight: 0,
        layoutWidth: 0,
        maskPointCount: 0,
      }),
      'plain-native-image',
    );
    assert.equal(
      getManualCutoutPreviewStrategy({
        hasUri: true,
        layoutHeight: 640,
        layoutWidth: 360,
        maskPointCount: 0,
      }),
      'plain-native-image',
    );
    assert.equal(
      getManualCutoutPreviewStrategy({
        hasUri: true,
        layoutHeight: 640,
        layoutWidth: 360,
        maskPointCount: 2,
      }),
      'masked-native-image',
    );
    assert.equal(
      getManualCutoutPreviewStrategy({
        hasUri: false,
        layoutHeight: 640,
        layoutWidth: 360,
        maskPointCount: 2,
      }),
      'children',
    );
  });

  it('keeps manual edit pinch focused on zooming in, not shrinking the result', () => {
    assert.equal(getNextCutoutEditScale(1, 0.2), 0.96);
    assert.equal(getNextCutoutEditScale(1.5, 0.9), 1.35);
    assert.equal(getNextCutoutEditScale(5.8, 1.4), 6);
    assert.equal(getNextCutoutEditScale(1, Number.NaN), 1);
  });

  it('interpolates fast strokes into connected points', () => {
    const points = createManualCutoutStrokePoints({
      from: { x: 0, y: 0 },
      getId: (index) => `p-${index}`,
      size: 10,
      to: { x: 40, y: 0 },
    });

    assert.equal(points.length, 13);
    assert.deepEqual(points[0], { id: 'p-0', size: 10, x: 0, y: 0 });
    assert.deepEqual(points.at(-1), { id: 'p-12', size: 10, x: 40, y: 0 });
  });

  it('keeps tiny brush strokes dense enough to read as a line', () => {
    const points = createManualCutoutStrokePoints({
      from: { x: 0, y: 0 },
      getId: (index) => `tiny-${index}`,
      size: 2,
      to: { x: 8, y: 0 },
    });

    assert.ok(points.length >= 12);
    assert.ok(points.every((point, index) => {
      if (index === 0) {
        return true;
      }

      return Math.abs(point.x - points[index - 1].x) <= 0.7;
    }));
  });

  it('only starts manual erase for one finger in erase mode', () => {
    assert.equal(shouldStartManualErase({ mode: 'erase', touchCount: 1 }), true);
    assert.equal(shouldStartManualErase({ mode: 'erase', touchCount: 2 }), false);
    assert.equal(shouldStartManualErase({ mode: 'move', touchCount: 1 }), false);
    assert.equal(shouldStartManualErase({ mode: 'move', touchCount: 2 }), false);
  });

  it('maps manual edit points from the visible image frame into image mask coordinates', () => {
    assert.deepEqual(
      getContainedImageFrame({
        imageHeight: 100,
        imageWidth: 200,
        layoutHeight: 300,
        layoutWidth: 300,
      }),
      {
        height: 150,
        offsetX: 0,
        offsetY: 75,
        width: 300,
      },
    );

    assert.deepEqual(
      getManualCutoutMaskPoint({
        imageHeight: 100,
        imageWidth: 200,
        layoutHeight: 300,
        layoutWidth: 300,
        point: { id: 'a', size: 12, x: 150, y: 150 },
      }),
      {
        size: 0.08,
        x: 0.5,
        y: 0.5,
      },
    );

    assert.equal(
      getManualCutoutMaskPoint({
        imageHeight: 100,
        imageWidth: 200,
        layoutHeight: 300,
        layoutWidth: 300,
        point: { id: 'outside', size: 12, x: 150, y: 60 },
      }),
      null,
    );
  });
});
