import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SNAG_CATEGORIES } from '../src/data/snags.ts';
import {
  appendPendingSnag,
  applySnagTransform,
  bringSnagToFront,
  CATEGORY_BACKGROUND_OPTIONS,
  CATEGORY_COLOR_OPTIONS,
  clampSnagTranslation,
  createSnagCategory,
  createSnagFromAsset,
  createTextSnag,
  deleteSelectedAllSnags,
  deleteSnagPlacement,
  deleteSnagCategory,
  getCategoryIdFromPageOffset,
  getCategoryPageIndex,
  getCategoryPageOffset,
  getCategorySnapReason,
  getCategorySnapCommand,
  shouldHandleCategoryPagerScrollEvent,
  getBoardPasteLongPressConfig,
  getCollectionActionOverlayConfig,
  getCollectionViewportHeight,
  getCopyActionPresentation,
  getCopyActionLabel,
  getCopyLongPressConfig,
  getSaveActionLabel,
  getDrawingColorOptions,
  getAllCollectionSnagFrame,
  getAllCollectionContentHeight,
  getCategoryBackground,
  getCategoryBackgroundStrength,
  getCategoryHeaderBadgeChromeConfig,
  getCategoryHeaderMenuLayoutConfig,
  getFloatingActionChromeConfig,
  getFloatingActionPopAnimationConfig,
  getMaxContainedSnagScale,
  getNextCategoryId,
  getPendingLandingPreviewScale,
  getPendingLandingStartTransform,
  getPastedSnagPresentation,
  getPendingSnagTargetIndex,
  getCaptureCategoryId,
  getCaptureProcessingPresentation,
  getCollectionChromeMetrics,
  getInitialSnagMode,
  getLayeredSnags,
  getNewSnagPresentation,
  getNextSnagLayerIndex,
  getSnaggedAnimationTimings,
  getSnagTransformFrame,
  getSnagDragGestureConfig,
  getSnagGestureLifecycleConfig,
  getSnagTransformGestureFrame,
  getSnagReleaseUnlockDelayMs,
  getSnagRenderKey,
  getSnagsForCategory,
  getSnagTrashDropZone,
  getSurfaceSwipeCompletionTarget,
  getSurfaceSwipeProgress,
  getSurfaceSwipeStartTarget,
  getSurfaceSwipeNavigationTarget,
  getTextSnagLayout,
  getTextSnagTypography,
  getTrashSuckAnimationConfig,
  isTextSnag,
  isSnagInTrashDropZone,
  isAllCollectionAutoArranged,
  renameSnagCategory,
  updateSnagCategoryColor,
  updateSnagCategoryBackground,
  updateSnagCategoryBackgroundStrength,
  shouldAcceptCategoryPagerSettle,
  shouldAnimateCategorySnap,
  shouldRenderAppLoadingScreen,
  shouldKeepSnagArmedForTrash,
  shouldAllowPasteAction,
  shouldRenderCutoutOutline,
  shouldRenderCollectionSurface,
  shouldRenderSnagFrame,
} from '../src/utils/snags.ts';

describe('real snag items', () => {
  it('opens directly into the collection board', () => {
    assert.equal(getInitialSnagMode(), 'collection');
    assert.deepEqual(
      SNAG_CATEGORIES.map((category) => category.id),
      ['category-1', 'all'],
    );
  });

  it('creates an All collection item from a completed capture without seed sticker fields', () => {
    const snag = createSnagFromAsset({
      asset: {
        height: 1200,
        uri: 'file:///cutout.png',
        width: 900,
      },
      createdAt: 1710000000000,
      index: 0,
    });

    assert.equal(snag.id, 'snag-1710000000000-0');
    assert.equal(snag.category, 'all');
    assert.equal(snag.imageUri, 'file:///cutout.png');
    assert.equal(snag.imageHeight, 1200);
    assert.equal(snag.imageWidth, 900);
    assert.equal(snag.title, 'Snag');
    assert.equal('tag' in snag, false);
    assert.equal('tone' in snag, false);
    assert.equal('accent' in snag, false);
    assert.equal('shape' in snag, false);
  });

  it('can save a new snag into the currently selected category', () => {
    const snag = createSnagFromAsset({
      asset: {
        uri: 'file:///desk.png',
      },
      categoryId: 'category-desk',
      createdAt: 1710000000200,
      index: 2,
    });

    assert.equal(snag.category, 'category-desk');
  });

  it('creates lightweight text snags that stay out of All by default', () => {
    const snag = createTextSnag({
      canvasX: 120,
      canvasY: 210,
      categoryId: 'category-1',
      createdAt: 1710000000300,
      index: 4,
      text: '  say hi  ',
    });

    assert.equal(isTextSnag(snag), true);
    assert.equal(snag.id, 'text-snag-1710000000300-4');
    assert.equal(snag.kind, 'text');
    assert.equal(snag.text, 'say hi');
    assert.equal(snag.title, 'say hi');
    assert.equal(snag.category, 'category-1');
    assert.equal(snag.excludeFromAll, true);
    assert.equal('imageUri' in snag, false);
    assert.equal(snag.imageWidth, 320);
    assert.equal(snag.imageHeight, 112);
  });

  it('uses stable one-line typography for text snags', () => {
    assert.deepEqual(getTextSnagTypography({ size: 240 }), {
      fontSize: 48,
      lineHeight: 55,
    });
    assert.deepEqual(getTextSnagTypography({ size: 80 }), {
      fontSize: 16,
      lineHeight: 18,
    });
    assert.deepEqual(getTextSnagTypography({ size: 900 }), {
      fontSize: 180,
      lineHeight: 207,
    });
  });

  it('keeps short text snag hitboxes close to the visible word', () => {
    const shortLayout = getTextSnagLayout({ size: 240, text: 'hi' });
    const longLayout = getTextSnagLayout({
      size: 240,
      text: 'invite a friend to drop something here',
    });

    assert.deepEqual({
      fontSize: shortLayout.fontSize,
      height: shortLayout.height,
      lineHeight: shortLayout.lineHeight,
    }, {
      fontSize: 48,
      height: 72.96,
      lineHeight: 55,
    });
    assert.ok(shortLayout.width < 130);
    assert.ok(shortLayout.width >= 72);
    assert.ok(longLayout.width > 240);
  });

  it('lets longer text snags grow wider than their size so trailing letters stay visible', () => {
    const normalLayout = getTextSnagLayout({ size: 120, text: 'hello world' });
    const smallerLayout = getTextSnagLayout({ size: 70, text: 'hello world' });

    assert.ok(normalLayout.width > 120);
    assert.ok(normalLayout.width < 360);
    assert.ok(smallerLayout.width > 70);
    assert.ok(smallerLayout.width < normalLayout.width);
  });

  it('keeps text layout proportional while scaling so release does not snap or crop', () => {
    const text = 'hello world';
    const startingLayout = getTextSnagLayout({ size: 120, text });
    const scaledLayout = getTextSnagLayout({ size: 60, text });

    assert.equal(scaledLayout.width, startingLayout.width * 0.5);
    assert.equal(scaledLayout.height, startingLayout.height * 0.5);
    assert.equal(scaledLayout.fontSize, startingLayout.fontSize * 0.5);
  });

  it('preserves text transform frames when text hitbox width is tighter than size', () => {
    const snag = createTextSnag({
      canvasX: 120,
      canvasY: 210,
      categoryId: 'category-1',
      createdAt: 1710000000300,
      index: 4,
      size: 240,
      text: 'hi',
    });
    const transform = {
      rotationRad: 0.25,
      scale: 1.5,
      translateX: 30.25,
      translateY: -12.5,
    };
    const liveGestureFrame = getSnagTransformFrame({ snag, transform });
    const [persistedSnag] = applySnagTransform([snag], snag.id, transform);
    const persistedFrame = getSnagTransformFrame({
      snag: persistedSnag,
      transform: {
        rotationRad: 0,
        scale: 1,
        translateX: 0,
        translateY: 0,
      },
    });

    assert.deepEqual(persistedFrame, liveGestureFrame);
  });

  it('keeps the same text frame when a live text scale becomes persisted layout', () => {
    const snag = createTextSnag({
      canvasX: 120,
      canvasY: 210,
      categoryId: 'category-1',
      createdAt: 1710000000300,
      index: 4,
      size: 120,
      text: 'hello world',
    });
    const transform = {
      rotationRad: 0,
      scale: 0.5,
      translateX: 0,
      translateY: 0,
    };
    const liveGestureFrame = getSnagTransformFrame({ snag, transform });
    const [persistedSnag] = applySnagTransform([snag], snag.id, transform);
    const persistedFrame = getSnagTransformFrame({
      snag: persistedSnag,
      transform: {
        rotationRad: 0,
        scale: 1,
        translateX: 0,
        translateY: 0,
      },
    });

    assert.deepEqual(persistedFrame, liveGestureFrame);
  });

  it('uses the category that was active when camera opened', () => {
    assert.equal(getCaptureCategoryId({ captureCategoryId: 'category-food', selectedCategoryId: 'all' }), 'category-food');
    assert.equal(getCaptureCategoryId({ captureCategoryId: '', selectedCategoryId: 'category-desk' }), 'category-desk');
  });

  it('places a newly snagged item large and centered in the visible collection screen', () => {
    const presentation = getNewSnagPresentation({
      viewportHeight: 900,
      viewportWidth: 390,
    });

    assert.equal(presentation.size, 220);
    assert.equal(presentation.canvasX, 85);
    assert.equal(presentation.canvasY, 245);
  });

  it('uses the captured shutter frame instead of a wordmark while processing cutout', () => {
    assert.deepEqual(getCaptureProcessingPresentation({ hasImageUri: true }), {
      showCapturedFrame: true,
      showWordmark: false,
    });
    assert.deepEqual(getCaptureProcessingPresentation({ hasImageUri: false }), {
      showCapturedFrame: false,
      showWordmark: false,
    });
  });

  it('expands the collection board closer to the header and dock', () => {
    const metrics = getCollectionChromeMetrics();

    assert.equal(metrics.safeAreaPaddingTop, 2);
    assert.equal(metrics.headerMinHeight, 58);
    assert.equal(metrics.contentPaddingTop, 2);
    assert.equal(metrics.contentPaddingBottom, 44);
    assert.equal(metrics.wordmarkOffsetY, -4);
  });

  it('does not treat a simple snag tap as a drag', () => {
    assert.deepEqual(getSnagDragGestureConfig(), {
      activationDistance: 4,
      dragActivation: 'after-long-press',
      longPressMinDurationMs: 301,
    });
  });

  it('lets a freshly snagged staged item move immediately', () => {
    assert.deepEqual(getSnagDragGestureConfig({ isStaged: true }), {
      activationDistance: 1,
      dragActivation: 'immediate',
      longPressMinDurationMs: 0,
    });
  });

  it('keeps touch responder events out of staged drag cancellation', () => {
    assert.deepEqual(getSnagGestureLifecycleConfig({ isStaged: true }), {
      copyGestureCanReleaseDrag: false,
      dragReleaseTrigger: 'gesture-finalize',
      interactionStartTrigger: 'gesture-start',
      settleStagedTrigger: 'drag-start',
      transformGestureCanReleaseDrag: false,
      touchResponderCanReleaseDrag: false,
    });
    assert.deepEqual(getSnagGestureLifecycleConfig({ isStaged: false }), {
      copyGestureCanReleaseDrag: false,
      dragReleaseTrigger: 'gesture-finalize',
      interactionStartTrigger: 'gesture-start',
      settleStagedTrigger: 'none',
      transformGestureCanReleaseDrag: false,
      touchResponderCanReleaseDrag: false,
    });
  });

  it('keeps move unlock alive long enough for the outline to fade out after release', () => {
    assert.ok(getSnagReleaseUnlockDelayMs() >= 160);
  });

  it('uses a stable full-board gesture surface for snag transforms', () => {
    assert.deepEqual(getSnagTransformGestureFrame({
      containerHeight: 720,
      containerWidth: 390,
    }), {
      height: 720,
      left: 0,
      top: 0,
      width: 390,
    });
  });

  it('keeps idle board snag gesture surfaces item-sized until a snag is actively moving', () => {
    assert.deepEqual(getSnagTransformGestureFrame({
      containerHeight: 720,
      containerWidth: 390,
      contentHeight: 132,
      contentWidth: 160,
      contentX: 42,
      contentY: 88,
      surface: 'item',
    }), {
      height: 132,
      left: 42,
      top: 88,
      width: 160,
    });
    assert.deepEqual(getSnagTransformGestureFrame({
      containerHeight: 720,
      containerWidth: 390,
      contentHeight: 132,
      contentWidth: 160,
      contentX: 42,
      contentY: 88,
      surface: 'full-board',
    }), {
      height: 720,
      left: 0,
      top: 0,
      width: 390,
    });
  });

  it('shows copy from a deliberate longer snag long press', () => {
    assert.deepEqual(getCopyLongPressConfig(), {
      action: 'show-copy-action',
      minDurationMs: 670,
      trigger: 'active-start',
    });
  });

  it('shows paste from a background long press instead of a simple tap', () => {
    assert.deepEqual(getBoardPasteLongPressConfig(), {
      minDurationMs: 430,
      singleTapShowsPaste: false,
      trigger: 'active-start',
    });
  });

  it('does not offer paste on the fixed All collection grid', () => {
    assert.equal(shouldAllowPasteAction({ categoryId: 'all' }), false);
    assert.equal(shouldAllowPasteAction({ categoryId: 'category-1' }), true);
    assert.equal(shouldAllowPasteAction({ categoryId: 'board-room-1' }), true);
  });

  it('pins copy and paste actions below the top-right edit control', () => {
    assert.deepEqual(getCopyActionPresentation({
      viewportWidth: 390,
    }), {
      left: 284,
      top: 10,
      width: 88,
    });

    assert.deepEqual(getCopyActionPresentation({
      top: 72,
      viewportWidth: 390,
    }), {
      left: 284,
      top: 72,
      width: 88,
    });

    assert.deepEqual(getCopyActionPresentation({
      actionWidth: 132,
      viewportWidth: 390,
    }), {
      left: 240,
      top: 10,
      width: 132,
    });
  });

  it('bridges All and Social with deliberate horizontal swipes', () => {
    assert.equal(getSurfaceSwipeNavigationTarget({
      currentSurface: 'collection',
      selectedCategoryId: 'all',
      translationX: -44,
      translationY: 12,
    }), 'board');
    assert.equal(getSurfaceSwipeNavigationTarget({
      currentSurface: 'collection',
      selectedCategoryId: 'all',
      translationX: -54,
      translationY: 10,
    }), 'board');
    assert.equal(getSurfaceSwipeNavigationTarget({
      currentSurface: 'collection',
      selectedCategoryId: 'all',
      translationX: 54,
      translationY: 10,
    }), null);
    assert.equal(getSurfaceSwipeNavigationTarget({
      currentSurface: 'collection',
      selectedCategoryId: 'category-1',
      translationX: -54,
      translationY: 10,
    }), null);
    assert.equal(getSurfaceSwipeNavigationTarget({
      currentSurface: 'board',
      boardScrollX: 0,
      translationX: 54,
      translationY: 12,
    }), 'collection');
    assert.equal(getSurfaceSwipeNavigationTarget({
      currentSurface: 'board',
      boardScrollX: 120,
      translationX: 88,
      translationY: 12,
    }), null);
    assert.equal(getSurfaceSwipeNavigationTarget({
      currentSurface: 'board',
      boardScrollX: 0,
      translationX: 32,
      translationY: 12,
    }), null);
  });

  it('moves All and Social like two adjacent panes once the transition is active', () => {
    assert.equal(getSurfaceSwipeProgress({
      direction: 'all-to-board',
      translationX: -195,
      width: 390,
    }), 0.5);
    assert.equal(getSurfaceSwipeProgress({
      direction: 'board-to-all',
      translationX: 195,
      width: 390,
    }), 0.5);
    assert.equal(getSurfaceSwipeProgress({
      direction: 'all-to-board',
      translationX: 64,
      width: 390,
    }), 0);
  });

  it('lets slow diagonal All swipes start Social before the vertical category pager steals them', () => {
    assert.equal(getSurfaceSwipeStartTarget({
      currentSurface: 'collection',
      selectedCategoryId: 'all',
      translationX: -14,
      translationY: 24,
    }), 'board');
    assert.equal(getSurfaceSwipeStartTarget({
      currentSurface: 'collection',
      selectedCategoryId: 'all',
      translationX: -7,
      translationY: 34,
    }), null);
    assert.equal(getSurfaceSwipeStartTarget({
      currentSurface: 'collection',
      selectedCategoryId: 'category-1',
      translationX: -18,
      translationY: 16,
    }), null);
  });

  it('completes active surface swipes by distance or velocity without rechecking vertical drift', () => {
    assert.equal(getSurfaceSwipeCompletionTarget({
      currentSurface: 'collection',
      selectedCategoryId: 'all',
      translationX: -148,
      velocityX: 0,
      width: 390,
    }), 'board');
    assert.equal(getSurfaceSwipeCompletionTarget({
      currentSurface: 'board',
      boardScrollX: 0,
      translationX: 80,
      velocityX: 0.82,
      width: 390,
    }), 'collection');
    assert.equal(getSurfaceSwipeCompletionTarget({
      currentSurface: 'board',
      boardScrollX: 0,
      translationX: 80,
      velocityX: -0.82,
      width: 390,
    }), null);
  });

  it('keeps copy, paste, and category overlays mutually exclusive and temporary', () => {
    assert.deepEqual(getCollectionActionOverlayConfig(), {
      autoDismissMs: 3000,
      backgroundTapDismisses: true,
      exclusive: true,
    });
  });

  it('pops copy and paste action buttons in softly instead of showing them statically', () => {
    assert.deepEqual(getFloatingActionPopAnimationConfig(), {
      initialScale: 0.72,
      initialTranslateY: 8,
      springFriction: 5,
      springTension: 230,
    });
  });

  it('keeps the category edit menu out of header layout flow', () => {
    assert.deepEqual(getCategoryHeaderMenuLayoutConfig(), {
      position: 'absolute',
      right: 0,
      top: 42,
    });
  });

  it('keeps category edit chrome quieter while copy paste borders stay lightly visible', () => {
    assert.deepEqual(getCategoryHeaderBadgeChromeConfig(), {
      borderColor: 'rgba(23, 23, 23, 0.021)',
      shadowOpacity: 0.019,
    });
    assert.deepEqual(getFloatingActionChromeConfig(), {
      backgroundColor: 'rgba(255, 255, 255, 0.46)',
      borderColor: 'rgba(255, 255, 255, 0.62)',
      shadowOpacity: 0.045,
      tintColor: 'rgba(255, 255, 255, 0.48)',
    });
  });

  it('uses black plus the pastel category colors for lightweight drawing', () => {
    assert.deepEqual(getDrawingColorOptions(), [
      '#171717',
      ...CATEGORY_COLOR_OPTIONS.filter((color) => color !== '#FFFFFF'),
    ]);
  });

  it('keeps the trash entry target narrow while holding the armed state briefly', () => {
    const zone = getSnagTrashDropZone({
      screenHeight: 844,
      scrollX: 120,
      viewportHeight: 690,
      viewportWidth: 390,
    });

    assert.deepEqual(zone, {
      centerX: 315,
      centerY: 734,
      dropRadius: 48,
      hitCenterX: 195,
      hitCenterY: 788,
      releaseRadius: 84,
    });
    assert.equal(isSnagInTrashDropZone({ point: { x: 242, y: 788 }, zone }), true);
    assert.equal(isSnagInTrashDropZone({ point: { x: 244, y: 788 }, zone }), false);
    assert.equal(isSnagInTrashDropZone({ point: { x: 195, y: 834 }, zone }), true);
    assert.equal(isSnagInTrashDropZone({ point: { x: 195, y: 838 }, zone }), false);
    assert.equal(isSnagInTrashDropZone({ point: { x: 315, y: 734 }, zone }), false);
    assert.equal(shouldKeepSnagArmedForTrash({ point: { x: 278, y: 788 }, zone }), true);
    assert.equal(shouldKeepSnagArmedForTrash({ point: { x: 280, y: 788 }, zone }), false);
  });

  it('positions the trash visual target inside a scrolled board canvas', () => {
    assert.deepEqual(
      getSnagTrashDropZone({
        screenHeight: 844,
        scrollX: 220,
        scrollY: 180,
        viewportHeight: 690,
        viewportWidth: 390,
      }),
      {
        centerX: 415,
        centerY: 914,
        dropRadius: 48,
        hitCenterX: 195,
        hitCenterY: 788,
        releaseRadius: 84,
      },
    );
  });

  it('turns the copy action into immediate copied feedback in the same button', () => {
    assert.equal(getCopyActionLabel({ copied: false }), 'Copy');
    assert.equal(getCopyActionLabel({ copied: true }), 'Copied!');
  });

  it('turns the save action into immediate saved feedback in the same button', () => {
    assert.equal(getSaveActionLabel({ saved: false }), 'Save to Photos');
    assert.equal(getSaveActionLabel({ saved: false, confirming: true }), 'Save to Photos?');
    assert.equal(getSaveActionLabel({ saved: true }), 'Saved!');
  });

  it('uses a short suck-in animation before deleting a dropped snag', () => {
    assert.deepEqual(getTrashSuckAnimationConfig(), {
      armedScale: 0.38,
      durationMs: 280,
      finalScale: 0.06,
      haptic: 'impact-medium',
    });
  });

  it('centers pasted snags on the tapped board point and clamps them inside the board', () => {
    assert.deepEqual(
      getPastedSnagPresentation({
        boardHeight: 620,
        boardWidth: 920,
        pointerX: 260,
        pointerY: 320,
      }),
      { canvasX: 170, canvasY: 230, size: 180 },
    );

    assert.deepEqual(
      getPastedSnagPresentation({
        boardHeight: 620,
        boardWidth: 920,
        pointerX: 20,
        pointerY: 604,
        size: 160,
      }),
      { canvasX: 0, canvasY: 460, size: 160 },
    );
  });

  it('creates user categories and moves between them cyclically', () => {
    const categories = [
      { id: 'all', title: 'All' },
      createSnagCategory({ index: 0 }),
      createSnagCategory({ background: 'shelves', backgroundStrength: 0.82, index: 1, title: 'Food' }),
    ];

    assert.deepEqual(categories[1], { background: 'grid', backgroundStrength: 0.62, color: CATEGORY_COLOR_OPTIONS[0], id: 'category-1', title: 'Category 1' });
    assert.deepEqual(categories[2], { background: 'shelves', backgroundStrength: 0.82, color: CATEGORY_COLOR_OPTIONS[1], id: 'category-2', title: 'Food' });
    assert.deepEqual(CATEGORY_BACKGROUND_OPTIONS.map((option) => option.id), ['grid', 'dots', 'shelves', 'journal']);
    assert.equal(getCategoryBackground(categories[1]).id, 'grid');
    assert.equal(getCategoryBackground({ id: 'legacy', title: 'Legacy' }).id, 'grid');
    assert.equal(getCategoryBackgroundStrength(categories[1]), 0.62);
    assert.equal(getCategoryBackgroundStrength({ backgroundStrength: 99 }), 1);
    assert.ok(CATEGORY_COLOR_OPTIONS.includes('#FFFFFF'));
    assert.equal(getNextCategoryId({ categories, currentCategoryId: 'all', direction: 'next' }), 'category-1');
    assert.equal(getNextCategoryId({ categories, currentCategoryId: 'category-1', direction: 'previous' }), 'all');
    assert.equal(getNextCategoryId({ categories, currentCategoryId: 'category-2', direction: 'next' }), 'all');
  });

  it('updates category backgrounds while preserving All as fixed', () => {
    const categories = [
      { id: 'all', title: 'All' },
      createSnagCategory({ index: 0 }),
    ];

    assert.deepEqual(
      updateSnagCategoryBackground({
        background: 'dots',
        categories,
        categoryId: 'category-1',
      })[1],
      { background: 'dots', backgroundStrength: 0.62, color: CATEGORY_COLOR_OPTIONS[0], id: 'category-1', title: 'Category 1' },
    );
    assert.deepEqual(
      updateSnagCategoryBackgroundStrength({
        categories,
        categoryId: 'category-1',
        strength: 0.91,
      })[1],
      { background: 'grid', backgroundStrength: 0.91, color: CATEGORY_COLOR_OPTIONS[0], id: 'category-1', title: 'Category 1' },
    );
    assert.deepEqual(
      updateSnagCategoryBackground({
        background: 'dots',
        categories,
        categoryId: 'all',
      }),
      categories,
    );
    assert.deepEqual(
      updateSnagCategoryBackground({
        background: 'loud-ai-wallpaper',
        categories,
        categoryId: 'category-1',
      }),
      categories,
    );
  });

  it('renames, colors, and deletes custom categories without losing snags', () => {
    const categories = [
      { id: 'all', title: 'All' },
      { color: CATEGORY_COLOR_OPTIONS[0], id: 'category-1', title: 'Category 1' },
      { color: CATEGORY_COLOR_OPTIONS[1], id: 'category-2', title: 'Desk' },
    ];
    const snags = [
      createSnagFromAsset({
        asset: { uri: 'file:///all.png' },
        categoryId: 'all',
        createdAt: 1,
        index: 0,
      }),
      createSnagFromAsset({
        asset: { uri: 'file:///desk.png' },
        categoryId: 'category-2',
        createdAt: 2,
        index: 1,
      }),
    ];

    assert.equal(renameSnagCategory({ categories, categoryId: 'all', title: 'Hidden' })[0].title, 'All');
    assert.equal(renameSnagCategory({ categories, categoryId: 'category-2', title: '  Laptop wall  ' })[2].title, 'Laptop wall');
    assert.equal(updateSnagCategoryColor({ categories, categoryId: 'category-2', color: CATEGORY_COLOR_OPTIONS[5] })[2].color, CATEGORY_COLOR_OPTIONS[5]);

    const deletion = deleteSnagCategory({
      categories,
      categoryId: 'category-2',
      selectedCategoryId: 'category-2',
      snags,
    });

    assert.deepEqual(
      deletion.categories.map((category) => category.id),
      ['all', 'category-1'],
    );
    assert.deepEqual(
      deletion.snags.map((snag) => snag.category),
      ['all', 'all'],
    );
    assert.equal(deletion.selectedCategoryId, 'category-1');
  });

  it('keeps All as every snag and custom categories as filtered boards', () => {
    const snags = [
      createSnagFromAsset({
        asset: { uri: 'file:///a.png' },
        categoryId: 'all',
        createdAt: 1,
        index: 0,
      }),
      createSnagFromAsset({
        asset: { uri: 'file:///b.png' },
        categoryId: 'category-food',
        createdAt: 2,
        index: 1,
      }),
      createSnagFromAsset({
        asset: { uri: 'file:///b-copy.png' },
        categoryId: 'category-food',
        createdAt: 3,
        excludeFromAll: true,
        index: 2,
      }),
    ];

    assert.equal(getSnagsForCategory({ categoryId: 'all', snags }).length, 2);
    assert.deepEqual(
      getSnagsForCategory({ categoryId: 'category-food', snags }).map((snag) => snag.imageUri),
      ['file:///b.png', 'file:///b-copy.png'],
    );
  });

  it('shows exactly one All master for an original and all of its category copies', () => {
    const original = createSnagFromAsset({
      asset: { uri: 'file:///original.png' },
      categoryId: 'category-pets',
      createdAt: 10,
      index: 0,
    });
    const hiddenCopy = createSnagFromAsset({
      asset: { uri: 'file:///hidden-copy.png' },
      categoryId: 'category-friends',
      createdAt: 11,
      excludeFromAll: true,
      index: 1,
      originSnagId: original.id,
    });
    const legacyVisibleCopy = createSnagFromAsset({
      asset: { uri: 'file:///legacy-visible-copy.png' },
      categoryId: 'category-things',
      createdAt: 12,
      index: 2,
      originSnagId: original.id,
    });

    assert.deepEqual(
      getSnagsForCategory({
        categoryId: 'all',
        snags: [original, hiddenCopy, legacyVisibleCopy],
      }).map((snag) => snag.id),
      [original.id],
    );
  });

  it('promotes one surviving legacy category copy into All when its original is missing', () => {
    const firstCopy = createSnagFromAsset({
      asset: { uri: 'file:///first-copy.png' },
      categoryId: 'category-pets',
      createdAt: 20,
      excludeFromAll: true,
      index: 0,
      originSnagId: 'missing-master',
    });
    const secondCopy = createSnagFromAsset({
      asset: { uri: 'file:///second-copy.png' },
      categoryId: 'category-friends',
      createdAt: 21,
      excludeFromAll: true,
      index: 1,
      originSnagId: 'missing-master',
    });

    assert.deepEqual(
      getSnagsForCategory({
        categoryId: 'all',
        snags: [firstCopy, secondCopy],
      }).map((snag) => snag.id),
      [firstCopy.id],
    );
  });

  it('keeps a master in All after its final custom-category placement is deleted', () => {
    const onlyPlacement = createSnagFromAsset({
      asset: { uri: 'file:///only-placement.png' },
      categoryId: 'category-pets',
      createdAt: 30,
      index: 0,
    });

    const nextSnags = deleteSnagPlacement({
      snagId: onlyPlacement.id,
      snags: [onlyPlacement],
    });

    assert.equal(nextSnags.length, 1);
    assert.equal(nextSnags[0].category, 'all');
    assert.equal(nextSnags[0].excludeFromAll, undefined);
    assert.deepEqual(
      getSnagsForCategory({ categoryId: 'all', snags: nextSnags }).map((snag) => snag.id),
      [onlyPlacement.id],
    );
  });

  it('removes a category copy while its master remains available in All', () => {
    const original = createSnagFromAsset({
      asset: { uri: 'file:///master.png' },
      categoryId: 'all',
      createdAt: 40,
      index: 0,
    });
    const copy = createSnagFromAsset({
      asset: { uri: 'file:///master-copy.png' },
      categoryId: 'category-pets',
      createdAt: 41,
      excludeFromAll: true,
      index: 1,
      originSnagId: original.id,
    });

    const nextSnags = deleteSnagPlacement({
      snagId: copy.id,
      snags: [original, copy],
    });

    assert.deepEqual(nextSnags.map((snag) => snag.id), [original.id]);
    assert.deepEqual(
      getSnagsForCategory({ categoryId: 'all', snags: nextSnags }).map((snag) => snag.id),
      [original.id],
    );
  });

  it('preserves one All master when deleting a category containing duplicate placements', () => {
    const firstPlacement = createSnagFromAsset({
      asset: { uri: 'file:///category-master.png' },
      categoryId: 'category-pets',
      createdAt: 50,
      index: 0,
    });
    const duplicatePlacement = createSnagFromAsset({
      asset: { uri: 'file:///category-master-copy.png' },
      categoryId: 'category-pets',
      createdAt: 51,
      excludeFromAll: true,
      index: 1,
      originSnagId: firstPlacement.id,
    });
    const categories = [
      { id: 'category-pets', title: 'Pets' },
      { id: 'all', title: 'All' },
    ];

    const nextLibrary = deleteSnagCategory({
      categories,
      categoryId: 'category-pets',
      selectedCategoryId: 'category-pets',
      snags: [firstPlacement, duplicatePlacement],
    });

    assert.equal(nextLibrary.snags.length, 1);
    assert.equal(nextLibrary.snags[0].category, 'all');
    assert.deepEqual(
      getSnagsForCategory({ categoryId: 'all', snags: nextLibrary.snags }).map((snag) => snag.id),
      [duplicatePlacement.id],
    );
  });

  it('deletes selected All snags from their original categories even when copies are resized or rotated', () => {
    const selectedSnag = createSnagFromAsset({
      asset: { uri: 'file:///selected.png' },
      createdAt: 4,
      index: 0,
    });
    const copiedSnag = {
      ...createSnagFromAsset({
        asset: { uri: 'file:///selected-copy.png' },
        categoryId: 'category-food',
        createdAt: 5,
        originSnagId: selectedSnag.id,
        index: 1,
        size: 188,
      }),
      rotate: '23deg',
      size: 188,
    };
    const copiedAgainSnag = {
      ...createSnagFromAsset({
        asset: { uri: 'file:///selected-copy-again.png' },
        categoryId: 'category-friends',
        createdAt: 6,
        originSnagId: copiedSnag.id,
        index: 2,
        size: 96,
      }),
      rotate: '-17deg',
      size: 96,
    };
    const otherSnag = createSnagFromAsset({
      asset: { uri: 'file:///selected-copy.png' },
      categoryId: 'category-food',
      createdAt: 7,
      index: 3,
    });

    assert.deepEqual(
      deleteSelectedAllSnags({
        selectedSnagIds: [selectedSnag.id],
        snags: [selectedSnag, copiedSnag, copiedAgainSnag, otherSnag],
      }).map((snag) => snag.id),
      [otherSnag.id],
    );
  });

  it('locks All into a fixed sticker grid from the top-left', () => {
    assert.equal(isAllCollectionAutoArranged({ categoryId: 'all' }), true);
    assert.equal(isAllCollectionAutoArranged({ categoryId: 'category-food' }), false);
    assert.deepEqual(
      getAllCollectionSnagFrame({
        boardWidth: 390,
        index: 0,
      }),
      {
        canvasX: 18,
        canvasY: 26,
        rotate: '0deg',
        size: 104,
      },
    );
    assert.deepEqual(
      getAllCollectionSnagFrame({
        boardWidth: 390,
        index: 3,
      }),
      {
        canvasX: 18,
        canvasY: 146,
        rotate: '0deg',
        size: 104,
      },
    );
    assert.equal(
      getAllCollectionContentHeight({
        boardHeight: 620,
        boardWidth: 390,
        itemCount: 3,
      }),
      620,
    );
    assert.equal(
      getAllCollectionContentHeight({
        boardHeight: 620,
        boardWidth: 390,
        itemCount: 18,
      }),
      756,
    );
  });

  it('adds a completed pending snag after existing items so their slots do not move', () => {
    const existingSnags = [
      createSnagFromAsset({
        asset: { uri: 'file:///first.png' },
        createdAt: 1,
        index: 0,
      }),
      createSnagFromAsset({
        asset: { uri: 'file:///second.png' },
        createdAt: 2,
        index: 1,
      }),
    ];
    const pendingSnag = createSnagFromAsset({
      asset: { uri: 'file:///new.png' },
      createdAt: 3,
      index: 2,
    });

    const savedSnags = appendPendingSnag(existingSnags, pendingSnag);

    assert.deepEqual(
      savedSnags.map((snag) => snag.imageUri),
      ['file:///first.png', 'file:///second.png', 'file:///new.png'],
    );
    assert.equal(savedSnags[0], existingSnags[0]);
    assert.equal(savedSnags[1], existingSnags[1]);
  });

  it('keeps recently touched free-board snags topmost without changing saved order', () => {
    const firstSnag = createSnagFromAsset({
      asset: { uri: 'file:///first.png' },
      categoryId: 'category-1',
      createdAt: 1,
      index: 0,
    });
    const secondSnag = createSnagFromAsset({
      asset: { uri: 'file:///second.png' },
      categoryId: 'category-1',
      createdAt: 2,
      index: 1,
    });
    const thirdSnag = createSnagFromAsset({
      asset: { uri: 'file:///third.png' },
      categoryId: 'category-1',
      createdAt: 3,
      index: 2,
    });

    const savedOrder = bringSnagToFront([firstSnag, secondSnag, thirdSnag], secondSnag.id);

    assert.deepEqual(
      savedOrder.map((snag) => snag.id),
      [firstSnag.id, secondSnag.id, thirdSnag.id],
    );
    assert.equal(savedOrder[1].layerIndex, 3);
    assert.equal(getNextSnagLayerIndex(savedOrder), 4);
    assert.deepEqual(
      getLayeredSnags(savedOrder).map((snag) => snag.id),
      [firstSnag.id, thirdSnag.id, secondSnag.id],
    );
  });

  it('aims the pending snag at the next empty slot for the selected category', () => {
    const snags = [
      createSnagFromAsset({
        asset: { uri: 'file:///all.png' },
        categoryId: 'all',
        createdAt: 1,
        index: 0,
      }),
      createSnagFromAsset({
        asset: { uri: 'file:///food-a.png' },
        categoryId: 'category-food',
        createdAt: 2,
        index: 1,
      }),
      createSnagFromAsset({
        asset: { uri: 'file:///food-b.png' },
        categoryId: 'category-food',
        createdAt: 3,
        index: 2,
      }),
    ];

    assert.equal(getPendingSnagTargetIndex({ categoryId: 'all', snags }), 3);
    assert.equal(getPendingSnagTargetIndex({ categoryId: 'category-food', snags }), 2);
    assert.equal(getPendingSnagTargetIndex({ categoryId: 'category-empty', snags }), 0);
  });

  it('starts the pending landing animation inside the visible collection viewport', () => {
    const transform = getPendingLandingStartTransform({
      boardHeight: 620,
      targetSize: 84,
      targetX: 764,
      targetY: 328,
      viewportWidth: 390,
    });
    const startCenterX = 764 + 84 / 2 + transform.translateX;

    assert.equal(startCenterX, 195);
    assert.ok(startCenterX > 0);
    assert.ok(startCenterX < 390);
  });

  it('uses a larger pending landing preview before the snag finds its slot', () => {
    assert.equal(getPendingLandingPreviewScale({ targetSize: 100 }), 3.1);
    assert.equal(getPendingLandingPreviewScale({ targetSize: 0 }), 1);
  });

  it('keeps the Snagged wordmark up one second longer with slower motion', () => {
    const timings = getSnaggedAnimationTimings();

    assert.equal(timings.holdDurationMs, 1260);
    assert.ok(timings.revealDurationMs > 460);
    assert.ok(timings.landingDurationMs > 560);
  });

  it('reveals the collection immediately so the pending cutout appears on that screen', () => {
    const timings = getSnaggedAnimationTimings();

    assert.equal(timings.collectionRevealDelayMs, 0);
    assert.ok(timings.revealDurationMs > timings.collectionRevealDelayMs);
  });

  it('maps category pages from vertical scroll offsets', () => {
    const categories = [
      { id: 'all', title: 'All' },
      { id: 'category-1', title: 'Category 1' },
      { id: 'category-2', title: 'Category 2' },
    ];

    assert.equal(getCategoryPageIndex({ categories, categoryId: 'category-2' }), 2);
    assert.equal(getCategoryPageIndex({ categories, categoryId: 'missing' }), 0);
    assert.equal(getCategoryIdFromPageOffset({ categories, offsetY: 530, pageHeight: 500 }), 'category-1');
    assert.equal(getCategoryIdFromPageOffset({ categories, offsetY: 1499, pageHeight: 500 }), 'category-2');
    assert.equal(getCategoryIdFromPageOffset({ categories, offsetY: -80, pageHeight: 500 }), 'all');
  });

  it('can open directly on the selected category page after capture', () => {
    const categories = [
      { id: 'all', title: 'All' },
      { id: 'category-1', title: 'Category 1' },
      { id: 'category-2', title: 'Category 2' },
    ];

    assert.equal(getCategoryPageOffset({ categories, categoryId: 'category-2', pageHeight: 610 }), 1220);
    assert.equal(getCategoryPageOffset({ categories, categoryId: 'missing', pageHeight: 610 }), 0);
    assert.equal(shouldAnimateCategorySnap({ stagedSnagId: 'snag-new' }), false);
    assert.equal(shouldAnimateCategorySnap({ stagedSnagId: null }), true);
  });

  it('builds explicit category snap commands for tray selections', () => {
    const categories = [
      { id: 'category-1', title: 'Category 1' },
      { id: 'category-2', title: 'Category 2' },
      { id: 'all', title: 'All' },
    ];

    assert.deepEqual(
      getCategorySnapCommand({
        categories,
        categoryId: 'all',
        pageHeight: 640,
        reason: 'selection',
        stagedSnagId: null,
      }),
      { animated: true, y: 1280 },
    );
    assert.deepEqual(
      getCategorySnapCommand({
        categories,
        categoryId: 'all',
        pageHeight: 640,
        reason: 'selection',
        stagedSnagId: 'snag-new',
      }),
      { animated: false, y: 1280 },
    );
    assert.deepEqual(
      getCategorySnapCommand({
        categories,
        categoryId: 'category-2',
        pageHeight: 640,
        reason: 'sync',
        stagedSnagId: null,
      }),
      { animated: false, y: 640 },
    );
    assert.equal(
      getCategorySnapCommand({
        categories,
        categoryId: 'category-2',
        pageHeight: 0,
        reason: 'selection',
        stagedSnagId: null,
      }),
      null,
    );
  });

  it('waits for the saved collection library before showing category surfaces', () => {
    assert.equal(shouldRenderCollectionSurface({ libraryReady: false }), false);
    assert.equal(shouldRenderCollectionSurface({ libraryReady: true }), true);
  });

  it('shows an app loading screen until the saved library is ready', () => {
    assert.equal(shouldRenderAppLoadingScreen({ cameraFlowOpen: false, collectionReady: false, libraryReady: false }), true);
    assert.equal(shouldRenderAppLoadingScreen({ cameraFlowOpen: false, collectionReady: false, libraryReady: true }), true);
    assert.equal(shouldRenderAppLoadingScreen({ cameraFlowOpen: false, collectionReady: true, libraryReady: true }), false);
    assert.equal(shouldRenderAppLoadingScreen({ cameraFlowOpen: true, collectionReady: false, libraryReady: false }), false);
  });

  it('keeps expensive cutout outline images out of idle snags', () => {
    assert.equal(shouldRenderCutoutOutline({ isStaged: false, isTransformUnlocked: false }), false);
    assert.equal(shouldRenderCutoutOutline({ isStaged: true, isTransformUnlocked: false }), true);
    assert.equal(shouldRenderCutoutOutline({ isStaged: false, isTransformUnlocked: true }), true);
  });

  it('ignores stale pager settle events while a tray category snap is in flight', () => {
    assert.equal(shouldAcceptCategoryPagerSettle({
      offsetY: 0,
      pageHeight: 620,
      snapActive: true,
      targetY: 620,
    }), false);
    assert.equal(shouldAcceptCategoryPagerSettle({
      offsetY: 612,
      pageHeight: 620,
      snapActive: true,
      targetY: 620,
    }), true);
    assert.equal(shouldAcceptCategoryPagerSettle({
      offsetY: 0,
      pageHeight: 620,
      snapActive: false,
      targetY: 620,
    }), true);
  });

  it('keeps All page handoffs instant while tray selections animate', () => {
    assert.equal(
      getCategorySnapReason({
        hasExplicitRequest: true,
        requestedReason: 'selection',
      }),
      'selection',
    );
    assert.equal(
      getCategorySnapReason({
        hasExplicitRequest: true,
        requestedReason: 'instant',
      }),
      'instant',
    );
    assert.equal(
      getCategorySnapReason({
        hasExplicitRequest: false,
        requestedReason: 'selection',
      }),
      'sync',
    );
    assert.equal(getCategorySnapCommand({
      categories: [{ id: 'category-1', title: 'Category 1' }, { id: 'all', title: 'All' }],
      categoryId: 'all',
      pageHeight: 620,
      reason: 'instant',
      stagedSnagId: null,
    })?.animated, false);
  });

  it('ignores nested All list scroll events for the outer category pager', () => {
    assert.equal(shouldHandleCategoryPagerScrollEvent({
      currentTarget: 'outer-pager',
      target: 'outer-pager',
    }), true);
    assert.equal(shouldHandleCategoryPagerScrollEvent({
      currentTarget: 'outer-pager',
      target: 'all-inner-list',
    }), false);
    assert.equal(shouldHandleCategoryPagerScrollEvent({
      currentTarget: undefined,
      target: 'all-inner-list',
    }), true);
  });

  it('renders captured image snags without a sticker frame', () => {
    assert.equal(shouldRenderSnagFrame({ imageUri: 'file:///cutout.png' }), false);
    assert.equal(shouldRenderSnagFrame({}), false);
  });

  it('clamps collection transforms so snags stop at the board edge', () => {
    assert.equal(
      clampSnagTranslation({
        basePosition: 34,
        baseSize: 88,
        containerSize: 390,
        scale: 1,
        translation: -260,
      }),
      -34,
    );

    assert.equal(
      clampSnagTranslation({
        basePosition: 34,
        baseSize: 88,
        containerSize: 390,
        scale: 2,
        translation: 500,
      }),
      224,
    );
  });

  it('limits pinch scale to the largest size that fits inside the board', () => {
    assert.equal(
      getMaxContainedSnagScale({
        baseHeight: 120,
        baseWidth: 100,
        containerHeight: 600,
        containerWidth: 390,
        preferredMax: 6,
      }),
      3.9,
    );

    assert.equal(
      getMaxContainedSnagScale({
        baseHeight: 100,
        baseWidth: 100,
        containerHeight: 900,
        containerWidth: 900,
        preferredMax: 6,
      }),
      6,
    );
  });

  it('uses measured collection height for edge clamping instead of the larger window fallback', () => {
    assert.equal(getCollectionViewportHeight({ fallbackHeight: 720, measuredHeight: 0 }), 720);
    assert.equal(getCollectionViewportHeight({ fallbackHeight: 720, measuredHeight: 512 }), 512);
    assert.equal(getCollectionViewportHeight({ fallbackHeight: 720, measuredHeight: Number.NaN }), 720);
  });

  it('commits collection gestures into persisted snag layout fields', () => {
    const snags = [
      createSnagFromAsset({
        asset: { uri: 'file:///snag.png' },
        canvasX: 85,
        canvasY: 245,
        createdAt: 1,
        index: 0,
        size: 220,
      }),
      createSnagFromAsset({
        asset: { uri: 'file:///other.png' },
        createdAt: 2,
        index: 1,
      }),
    ];

    const nextSnags = applySnagTransform(snags, snags[0].id, {
      rotationRad: 0.25,
      scale: 1.5,
      translateX: 30.25,
      translateY: -12.5,
    });

    assert.equal(nextSnags[0].canvasX, 60.25);
    assert.equal(nextSnags[0].canvasY, 177.5);
    assert.equal(nextSnags[0].size, 330);
    assert.equal(nextSnags[0].rotate, '0.18rad');
    assert.equal(nextSnags[1], snags[1]);
  });

  it('keeps the same visual frame when a live gesture becomes persisted layout', () => {
    const snag = createSnagFromAsset({
      asset: { uri: 'file:///snag.png' },
      canvasX: 85,
      canvasY: 245,
      createdAt: 1,
      index: 0,
      size: 220,
    });
    const transform = {
      rotationRad: 0.25,
      scale: 1.5,
      translateX: 30.25,
      translateY: -12.5,
    };
    const liveGestureFrame = getSnagTransformFrame({ snag, transform });
    const [persistedSnag] = applySnagTransform([snag], snag.id, transform);
    const persistedFrame = getSnagTransformFrame({
      snag: persistedSnag,
      transform: {
        rotationRad: 0,
        scale: 1,
        translateX: 0,
        translateY: 0,
      },
    });

    assert.deepEqual(persistedFrame, liveGestureFrame);
  });

  it('keeps snag render keys stable while persisted layout changes', () => {
    const snag = createSnagFromAsset({
      asset: { uri: 'file:///snag.png' },
      createdAt: 1,
      index: 0,
    });
    const [nextSnag] = applySnagTransform([snag], snag.id, {
      rotationRad: 0.2,
      scale: 1.2,
      translateX: 18,
      translateY: 24,
    });

    assert.equal(getSnagRenderKey(snag), snag.id);
    assert.equal(getSnagRenderKey(nextSnag), snag.id);
  });
});
