import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import { useFonts } from 'expo-font';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { SymbolView } from 'expo-symbols';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Fragment, type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  InteractionManager,
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  type GestureResponderEvent,
  type StyleProp,
  Text,
  TextInput,
  type LayoutChangeEvent,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

import { EditableCutout } from '@/components/editable-cutout';
import { TransformableSnag, type SnagCopyRequestPoint } from '@/components/transformable-snag';
import { Fonts } from '@/constants/theme';
import { saveSnagImageToLibraryAsync } from '@/native/snag-media-library';
import {
  addBoardDrawingStroke,
  BOARD_COLOR_OPTIONS,
  BOARD_IDLE_WARMUP_DELAY_MS,
  BOARD_IDLE_WARMUP_PRIMARY_LIMIT,
  BOARD_INITIAL_SNAG_RENDER_LIMIT,
  BOARD_ROOM_PREFETCH_LIMIT,
  BOARD_SOCIAL_LIMITS,
  canDeleteBoardRoom,
  canLeaveBoardRoom,
  canManageBoardMember,
  canOpenBoardMemberSafetyMenu,
  clearBoardDrawingStrokes,
  deleteBoardSnagFromRoom,
  deleteBoardRoom,
  getBoardEntryLoadingPresentation,
  getBoardCanvasMetrics,
  getBoardGridChromeConfig,
  getBoardInviteShareCopy,
  getBoardJoinFailureCopy,
  getBoardLeaveConfirmationCopy,
  getBoardLimitCopy,
  getBoardLimitState,
  getBoardMemberActionCopy,
  getBoardMemberReportCopy,
  getBoardMemberList,
  getBoardMiniMapVisibilityConfig,
  getBoardPanStateCommitConfig,
  getBoardRoomMemberCount,
  getBoardRoomPrefetchSnags,
  getBoardSocialDockIconOffsets,
  getRenderableBoardRooms,
  getNextBoardWarmupRequest,
  getNextBoardSnagRenderLimit,
  getBoardRoomAfterMemberKick,
  getProgressiveBoardSnags,
  getVisibleBoardSnags,
  getNextBoardPanOffset,
  getBoardViewportIndicator,
  leaveBoardRoom,
  LOCAL_BOARD_MEMBER_ID,
  renameBoardRoom,
  shouldCloseBoardDrawingForBoardMenu,
  shouldStartBoardPanGesture,
  transferBoardRoomOwnership,
  undoBoardDrawingStroke,
  updateBoardMemberDisplayName,
  updateBoardRoomColor,
  type BoardRoom,
} from '@/utils/boards';
import {
  SNAG_CATEGORIES,
  type SnagDrawingPoint,
  type SnagDrawingStroke,
  type SnagItem,
} from '@/data/snags';
import {
  applyManualCutoutAsync,
  cutoutImageAsync,
  isSnagCutoutSupportedAsync,
} from '@/native/snag-cutout';
import { copySnagImageAsync, getClipboardSnagImageAsync } from '@/native/snag-clipboard';
import {
  loadSnagLibraryAsync,
  persistSnagImageAsync,
  saveSnagLibraryAsync,
} from '@/native/snag-library-storage';
import {
  mergeSocialBoardSnapshotWithLocalCache,
  type SocialBoardCacheState,
} from '@/utils/social-board-cache';
import {
  loadSocialBoardCacheAsync,
  saveSocialBoardCacheAsync,
} from '@/native/social-board-cache-storage';
import { getSnagSupabaseClient } from '@/services/supabase-client';
import {
  addSocialBoardDrawingStrokeAsync,
  clearSocialBoardDrawingStrokesAsync,
  createSocialBoardRoomAsync,
  deleteSocialBoardDrawingStrokeAsync,
  deleteSocialBoardRoomAsync,
  deleteSocialBoardSnagAsync,
  joinSocialBoardRoomAsync,
  kickSocialBoardMemberAsync,
  leaveSocialBoardRoomAsync,
  loadJoinedSocialBoardsAsync,
  loadOrCreateSocialProfileAsync,
  renameSocialBoardRoomAsync,
  reportSocialBoardMemberAsync,
  transferSocialBoardOwnerAsync,
  updateBoardSnagTransformAsync,
  updateSocialBoardColorAsync,
  updateSocialProfileDisplayNameAsync,
  uploadAndSaveBoardSnagAsync,
  type SocialProfile,
  type SocialBoardSnapshot,
} from '@/services/social-board-service';
import {
  getProfileDisplayName,
  normalizeProfileDisplayName,
  type SnagUserSettings,
} from '@/utils/snag-library';
import {
  getAutoCutoutBadge,
  getAutoCutoutSymbol,
  getCameraCaptureFlashMode,
  getFlashSymbol,
  getNextFlashMode,
} from '@/utils/camera-controls';
import {
  getCaptureCutoutRoute,
  getCutoutFailureNotice,
  getCutoutNoticeDurationMs,
  getCutoutUnsupportedNotice,
} from '@/utils/cutout-controls';
import {
  getBrushSliderValue,
  getCheckerboardCells,
  getNextCameraZoom as getZoomFromPinch,
  type ManualCutoutInteractionMode,
  type ManualCutoutMaskPoint,
  smoothCameraZoom,
} from '@/utils/manual-cutout';
import { openSnagPublicLinkAsync, SNAG_PUBLIC_LINKS } from '@/utils/public-links';
import {
  appendPendingSnag,
  applySnagTransform,
  bringSnagToFront,
  CATEGORY_BACKGROUND_OPTIONS,
  CATEGORY_COLOR_OPTIONS,
  createSnagCategory,
  createSnagFromAsset,
  createTextSnag,
  deleteSelectedAllSnags,
  deleteSnagCategory,
  getAllCollectionContentHeight,
  getAllCollectionSnagFrame,
  getBoardPasteLongPressConfig,
  getCaptureCategoryId,
  getCaptureProcessingPresentation,
  getCategoryBackground,
  getCategoryBackgroundStrength,
  getCategoryHeaderBadgeChromeConfig,
  getCategoryHeaderMenuLayoutConfig,
  getCategoryIdFromPageOffset,
  getCategoryPageOffset,
  getCategorySnapReason,
  getCategorySnapCommand,
  getCollectionActionOverlayConfig,
  getCollectionChromeMetrics,
  getCollectionViewportHeight,
  getCopyActionLabel,
  getCopyActionPresentation,
  getCopyLongPressConfig,
  getDrawingColorOptions,
  getFloatingActionChromeConfig,
  getFloatingActionPopAnimationConfig,
  getPastedSnagPresentation,
  getInitialSnagMode,
  getLayeredSnags,
  getNewSnagPresentation,
  getNextSnagLayerIndex,
  getSnagRenderKey,
  getSnagsForCategory,
  getSnagReleaseUnlockDelayMs,
  getSaveActionLabel,
  getSnagTrashDropZone,
  getSurfaceSwipeCompletionTarget,
  getSurfaceSwipeProgress,
  getSurfaceSwipeStartTarget,
  isSnagInTrashDropZone,
  isAllCollectionAutoArranged,
  renameSnagCategory,
  isTextSnag,
  normalizeTextSnagValue,
  shouldAcceptCategoryPagerSettle,
  shouldAllowPasteAction,
  shouldHandleCategoryPagerScrollEvent,
  shouldRenderAppLoadingScreen,
  shouldRenderCollectionSurface,
  type CategorySnapReason,
  type SnagBoardPoint,
  type SnagCategoryItem,
  type SnagCategoryBackgroundOption,
  type SnagTrashDropZone,
  type SnagTransformPatch,
  updateSnagCategoryBackground,
  updateSnagCategoryBackgroundStrength,
  updateSnagCategoryColor,
} from '@/utils/snags';
import { normalizeSocialInviteCode } from '@/utils/social-sync';

type Mode = 'collection' | 'camera' | 'board';
type CaptureStage = 'live' | 'processing' | 'refine';
type SymbolViewName = ComponentProps<typeof SymbolView>['name'];
type CapturedAsset = {
  uri?: string;
  source: 'camera' | 'library';
  width?: number;
  height?: number;
};

type CompletedSnagAsset = {
  uri?: string;
  width?: number;
  height?: number;
};
type PasteSnagRequest = {
  boardHeight: number;
  boardWidth: number;
  categoryId: string;
  pointerX: number;
  pointerY: number;
  sourceSnagId?: string;
};
type BoardPasteSnagRequest = {
  boardHeight: number;
  boardWidth: number;
  pointerX: number;
  pointerY: number;
  roomId: string;
};
type CopySnagRequest = {
  categoryId: string;
  copied?: boolean;
  roomId?: string;
  saved?: boolean;
  saveConfirming?: boolean;
  screenX: number;
  screenY: number;
  snagId: string;
  x: number;
  y: number;
};
type TextSnagDialogState =
  | { categoryId: string; snagId?: string; surface: 'collection' }
  | { roomId: string; snagId?: string; surface: 'board' };
type CategoryBackgroundPickerState =
  | { background: SnagCategoryBackgroundOption['id']; backgroundStrength: number; mode: 'create' }
  | { background: SnagCategoryBackgroundOption['id']; backgroundStrength: number; categoryId: string; mode: 'edit' };
type TrashDragState = {
  armedId: string | null;
  draggingId: string | null;
};

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function getCurrentTimestampMs() {
  return Date.now();
}

const BRAND_FONT = 'DynaPuff';
const INK = '#171717';
const PAPER = '#FFFFFF';
const SURFACE = 'rgba(255, 255, 255, 0.86)';
const BORDER = 'rgba(23, 23, 23, 0.07)';
const SKY = '#FFFFFF';
const CHECKER_CELL_SIZE = 8;
const COLLECTION_CHROME = getCollectionChromeMetrics();
const CATEGORY_HEADER_MENU_LAYOUT = getCategoryHeaderMenuLayoutConfig();
const CATEGORY_HEADER_BADGE_CHROME = getCategoryHeaderBadgeChromeConfig();
const FLOATING_ACTION_CHROME = getFloatingActionChromeConfig();
const BOARD_MINI_MAP_VISIBILITY = getBoardMiniMapVisibilityConfig();
const BOARD_GRID_CHROME = getBoardGridChromeConfig();
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const DEFAULT_CATEGORY_ID = SNAG_CATEGORIES[0]?.id ?? 'all';
const SOCIAL_BOARD_REFRESH_INTERVAL_MS = 12000;
const DRAWING_COLOR_OPTIONS = getDrawingColorOptions();
const DEFAULT_DRAWING_STROKE_COLOR = DRAWING_COLOR_OPTIONS[0];
const DRAWING_STROKE_WIDTH = 5;
const DRAWING_POINT_SPACING = 2.5;
const DEFAULT_USER_SETTINGS: SnagUserSettings = {
  profileName: 'You',
};

function getSettingsProfileNameDraft(profileName: string) {
  const normalizedName = normalizeProfileDisplayName(profileName);

  return normalizedName === DEFAULT_USER_SETTINGS.profileName ? '' : normalizedName;
}

async function preloadSnagImages(snags: SnagItem[]) {
  const imageUris = Array.from(new Set(
    snags
      .map((snag) => snag.imageUri)
      .filter((uri): uri is string => Boolean(uri)),
  ));

  if (imageUris.length === 0) {
    return;
  }

  await Image.prefetch(imageUris, 'memory-disk');
}

function symbolName(ios: string, fallback = ios): SymbolViewName {
  return { ios, android: fallback, web: fallback } as SymbolViewName;
}

function GlassSurface({
  children,
  interactive,
  style,
}: {
  children: ReactNode;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <GlassView
      colorScheme="light"
      glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.18 }}
      isInteractive={interactive}
      tintColor="rgba(255, 255, 255, 0.5)"
      style={[styles.glassSurface, style]}>
      {children}
    </GlassView>
  );
}

function ElasticPressable({
  accessibilityLabel,
  children,
  feedback = 'default',
  onPress,
  style,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  feedback?: 'default' | 'strong';
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [press] = useState(() => new Animated.Value(0));
  const isStrong = feedback === 'strong';
  const translateX = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isStrong ? -2 : 0],
  });
  const scaleX = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isStrong ? 1.13 : 1.09],
  });
  const scaleY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isStrong ? 0.84 : 0.88],
  });
  const translateY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isStrong ? 4 : 3],
  });

  function animatePress(toValue: number) {
    Animated.spring(press, {
      toValue,
      friction: 5,
      tension: 260,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={[style, { transform: [{ translateX }, { translateY }, { scaleX }, { scaleY }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={() => animatePress(1)}
        onPressOut={() => animatePress(0)}
        style={styles.elasticPressable}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

function Wordmark({
  fontFamily,
  inverted,
  onPress,
  progress,
}: {
  fontFamily: string;
  inverted?: boolean;
  onPress: () => void;
  progress: Animated.Value;
}) {
  const wordmarkColor = inverted ? PAPER : INK;
  const brandOpacity = progress.interpolate({
    inputRange: [0, 0.1, 0.86, 1],
    outputRange: [1, 0, 0, 1],
  });
  const brandScale = progress.interpolate({
    inputRange: [0, 0.14, 0.84, 1],
    outputRange: [1, 0.88, 0.9, 1],
  });
  const brandTranslateY = progress.interpolate({
    inputRange: [0, 0.14, 0.84, 1],
    outputRange: [0, 8, 6, 0],
  });
  const snaggedOpacity = progress.interpolate({
    inputRange: [0, 0.12, 0.74, 0.96, 1],
    outputRange: [0, 1, 1, 0, 0],
  });
  const snaggedScale = progress.interpolate({
    inputRange: [0, 0.18, 0.38, 0.74, 1],
    outputRange: [0.74, 1.16, 0.96, 1, 0.88],
  });
  const snaggedTranslateY = progress.interpolate({
    inputRange: [0, 0.18, 0.38, 0.74, 1],
    outputRange: [10, -3, 1, 0, -9],
  });
  const snaggedRotate = progress.interpolate({
    inputRange: [0, 0.18, 0.38, 0.62, 1],
    outputRange: ['-8deg', '4deg', '-2deg', '0deg', '5deg'],
  });

  return (
    <ElasticPressable
      accessibilityLabel="Open settings"
      feedback="strong"
      onPress={onPress}
      style={styles.wordmarkButton}>
      <View style={styles.wordmark}>
        <Animated.View
          style={[
            styles.wordmarkLetters,
            {
              opacity: brandOpacity,
              transform: [{ translateY: brandTranslateY }, { scale: brandScale }],
            },
          ]}>
          <Text style={[styles.wordmarkLetter, styles.wordmarkS, { color: wordmarkColor, fontFamily }]}>S</Text>
          <Text style={[styles.wordmarkLetter, styles.wordmarkN, { color: wordmarkColor, fontFamily }]}>n</Text>
          <Text style={[styles.wordmarkLetter, styles.wordmarkA, { color: wordmarkColor, fontFamily }]}>a</Text>
          <Text style={[styles.wordmarkLetter, styles.wordmarkG, { color: wordmarkColor, fontFamily }]}>g</Text>
        </Animated.View>
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.wordmarkSnagged,
            {
              color: wordmarkColor,
              fontFamily,
              opacity: snaggedOpacity,
              transform: [
                { translateY: snaggedTranslateY },
                { rotate: snaggedRotate },
                { scale: snaggedScale },
              ],
            },
          ]}>
          Snagged!
        </Animated.Text>
      </View>
    </ElasticPressable>
  );
}

function AppLoadingScreen({ fontFamily }: { fontFamily: string }) {
  return (
    <View style={styles.appLoadingScreen}>
      <Text style={[styles.appLoadingText, { fontFamily }]}>Snag</Text>
    </View>
  );
}

function BoardEntryLoadingScreen({
  currentMemberId,
  fontFamily,
  localProfileName,
  room,
}: {
  currentMemberId: string;
  fontFamily: string;
  localProfileName: string;
  room: BoardRoom;
}) {
  const presentation = getBoardEntryLoadingPresentation({
    currentMemberId,
    localProfileName,
    room,
  });

  return (
    <View pointerEvents="auto" style={styles.boardEntryLoadingScreen}>
      <View style={styles.boardEntryLoadingCard}>
        <Text style={[styles.boardEntryLoadingTitle, { fontFamily }]} numberOfLines={1}>{presentation.title}</Text>
        <Text style={styles.boardEntryLoadingMessage} numberOfLines={1}>{presentation.message}</Text>
        <View style={styles.boardEntryMemberRow}>
          {presentation.memberLabels.map((label) => (
            <View style={styles.boardEntryMemberChip} key={label}>
              <SymbolView name={symbolName('person.fill')} size={13} tintColor="rgba(23, 23, 23, 0.56)" weight="bold" />
              <Text style={styles.boardEntryMemberText} numberOfLines={1}>{label}</Text>
            </View>
          ))}
          {presentation.overflowCount > 0 && (
            <View style={styles.boardEntryMemberChip}>
              <Text style={styles.boardEntryMemberText}>+{presentation.overflowCount}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function CollectionStarterPrompt({
  fontFamily,
  onPromptPress,
  viewportHeight,
  viewportWidth,
}: {
  fontFamily: string;
  onPromptPress: () => void;
  viewportHeight: number;
  viewportWidth: number;
}) {
  const promptWidth = Math.min(Math.max(viewportWidth - 40, 276), 352);
  const promptLeft = Math.max(18, (viewportWidth - promptWidth) / 2);
  const promptTop = Math.max(214, viewportHeight * 0.43);
  const lineHeight = Math.min(Math.max(viewportHeight - promptTop - 22, 238), 332);
  const cameraLineCenterX = promptWidth / 2;
  const lineEndX = cameraLineCenterX;
  const lineEndY = lineHeight - 34;
  const swipeTop = Math.max(132, viewportHeight * 0.23);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.collectionStarterPrompt,
        {
          height: viewportHeight,
          width: viewportWidth,
        },
      ]}>
      <View style={styles.collectionStarterNameHint}>
        <Text style={[styles.collectionStarterSideText, { fontFamily }]}>set your nickname?</Text>
        <Svg height={54} width={78} style={styles.collectionStarterNameArrow}>
          <Path
            d="M42 49 C39 35 35 21 30 8"
            fill="none"
            stroke="rgba(23, 23, 23, 0.56)"
            strokeLinecap="round"
            strokeWidth={3}
          />
          <Path
            d="M30 8 L21 21 M30 8 L44 15"
            fill="none"
            stroke="rgba(23, 23, 23, 0.56)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          />
        </Svg>
      </View>
      <Pressable
        accessibilityLabel="Open camera to start Snagging"
        onPress={onPromptPress}
        style={({ pressed }) => [
          styles.collectionStarterCameraTarget,
          {
            left: promptLeft,
            top: promptTop,
            width: promptWidth,
          },
          pressed && styles.collectionStarterCameraTargetPressed,
        ]}>
        <Text style={[styles.collectionStarterTitle, { fontFamily }]}>Start with something nearby.</Text>
        <Svg
          height={lineHeight}
          width={promptWidth}
          style={styles.collectionStarterCameraLine}
          viewBox={`0 0 ${promptWidth} ${lineHeight}`}>
          <Path
            d={`M${cameraLineCenterX - 30} 12 C${cameraLineCenterX + 58} ${lineHeight * 0.22} ${cameraLineCenterX - 42} ${lineHeight * 0.64} ${lineEndX} ${lineEndY}`}
            fill="none"
            stroke="rgba(23, 23, 23, 0.56)"
            strokeLinecap="round"
            strokeWidth={4}
          />
          <Path
            d={`M${lineEndX - 18} ${lineEndY - 10} L${lineEndX} ${lineEndY} L${lineEndX + 6} ${lineEndY - 22}`}
            fill="none"
            stroke="rgba(23, 23, 23, 0.56)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={4}
          />
        </Svg>
        <Text style={[styles.collectionStarterCameraHint, { fontFamily }]}>tap camera</Text>
      </Pressable>
      <View style={[styles.collectionStarterSwipeHint, { top: swipeTop }]}>
        <Text style={[styles.collectionStarterSideText, { fontFamily }]}>swipe right</Text>
      </View>
    </View>
  );
}

function StagedSnagHint({
  canvasHeight,
  canvasWidth,
  fontFamily,
  size,
  x,
  y,
}: {
  canvasHeight: number;
  canvasWidth: number;
  fontFamily: string;
  size: number;
  x: number;
  y: number;
}) {
  const left = Math.max(18, Math.min(x + size * 0.58, canvasWidth - 172));
  const top = Math.max(28, Math.min(y - 30, canvasHeight - 58));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.stagedSnagHint,
        {
          left,
          top,
        },
      ]}>
      <Text style={[styles.stagedSnagHintText, { fontFamily }]}>drag it around.</Text>
    </View>
  );
}

function BoardStarterPrompt({
  canvasHeight,
  canvasWidth,
  fontFamily,
  viewportHeight,
  viewportWidth,
}: {
  canvasHeight: number;
  canvasWidth: number;
  fontFamily: string;
  viewportHeight: number;
  viewportWidth: number;
}) {
  const width = Math.min(Math.max(viewportWidth - 64, 260), 360);
  const left = Math.max(24, Math.min((viewportWidth - width) / 2, canvasWidth - width - 24));
  const top = Math.max(96, Math.min(viewportHeight * 0.28, canvasHeight - 120));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.boardStarterPrompt,
        {
          left,
          top,
          width,
        },
      ]}>
      <Text style={[styles.boardStarterText, { fontFamily }]}>invite a friend. make this board together!</Text>
    </View>
  );
}

function DockButton({
  active,
  accessibilityLabel,
  iconSize = 31,
  iosName,
  onPress,
  style,
  tone = 'default',
}: {
  active?: boolean;
  accessibilityLabel: string;
  iconSize?: number;
  iosName: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'trash';
}) {
  const [morph] = useState(() => new Animated.Value(1));
  const isTrash = tone === 'trash';
  const iconScale = morph.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0.72, 1.18, 1],
  });

  useEffect(() => {
    morph.setValue(0);
    Animated.spring(morph, {
      toValue: 1,
      friction: 5,
      tension: 230,
      useNativeDriver: true,
    }).start();
  }, [iosName, morph]);

  return (
    <ElasticPressable accessibilityLabel={accessibilityLabel} onPress={onPress} style={[styles.dockButton, style]}>
      <GlassView
        colorScheme="light"
        glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.16 }}
        isInteractive
        tintColor="rgba(255, 255, 255, 0.72)"
        style={[
          styles.dockButtonGlass,
          active && styles.dockButtonActive,
          isTrash && styles.dockButtonTrash,
          isTrash && active && styles.dockButtonTrashArmed,
        ]}>
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <SymbolView name={symbolName(iosName)} size={iconSize} tintColor={isTrash && active ? '#FF3B30' : INK} />
        </Animated.View>
        {active && !isTrash && <View style={styles.dockActiveDot} />}
      </GlassView>
    </ElasticPressable>
  );
}

function CollectionDockButton({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  const [spread] = useState(() => new Animated.Value(active ? 1 : 0));
  const [press] = useState(() => new Animated.Value(0));
  const width = spread.interpolate({
    inputRange: [0, 1],
    outputRange: [68, 124],
  });
  const scaleX = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.09],
  });
  const scaleY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
  });
  const translateY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });
  const pieceTargets = [
    { closedX: -9, closedY: -9, openX: -36, openY: 0 },
    { closedX: 9, closedY: -9, openX: -12, openY: 0 },
    { closedX: -9, closedY: 9, openX: 12, openY: 0 },
    { closedX: 9, closedY: 9, openX: 36, openY: 0 },
  ];

  useEffect(() => {
    Animated.spring(spread, {
      toValue: active ? 1 : 0,
      friction: 7,
      tension: 150,
      useNativeDriver: false,
    }).start();
  }, [active, spread]);

  function animatePress(toValue: number) {
    Animated.spring(press, {
      toValue,
      friction: 5,
      tension: 260,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View
      style={[
        styles.dockButton,
        styles.collectionDockButton,
        { width },
      ]}>
      <Animated.View style={[styles.collectionPressLayer, { transform: [{ translateY }, { scaleX }, { scaleY }] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open collection"
          onPress={onPress}
          onPressIn={() => animatePress(1)}
          onPressOut={() => animatePress(0)}
          style={styles.elasticPressable}>
          <GlassView
            colorScheme="light"
            glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.16 }}
            isInteractive
            tintColor="rgba(255, 255, 255, 0.72)"
            style={[
              styles.dockButtonGlass,
              active && styles.dockButtonActive,
              styles.collectionDockGlass,
            ]}>
            <View style={styles.collectionPieceRail}>
              {pieceTargets.map((piece, index) => {
                const translateX = spread.interpolate({
                  inputRange: [0, 1],
                  outputRange: [piece.closedX, piece.openX],
                });
                const translateYPiece = spread.interpolate({
                  inputRange: [0, 1],
                  outputRange: [piece.closedY, piece.openY],
                });
                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.collectionPiece,
                      styles.collectionPiecePrimary,
                      {
                        transform: [{ translateX }, { translateY: translateYPiece }],
                      },
                    ]}
                  />
                );
              })}
            </View>
          </GlassView>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function SocialDockButton({
  active,
  memberTrayOpen,
  onPress,
  roomOpen,
}: {
  active: boolean;
  memberTrayOpen: boolean;
  onPress: () => void;
  roomOpen: boolean;
}) {
  const [spread] = useState(() => new Animated.Value(roomOpen ? 1 : 0));
  const [press] = useState(() => new Animated.Value(0));
  const [closedLeft, closedRight] = getBoardSocialDockIconOffsets({ roomOpen: false });
  const [openLeft, openRight] = getBoardSocialDockIconOffsets({ roomOpen: true });
  const leftTranslateX = spread.interpolate({
    inputRange: [0, 1],
    outputRange: [closedLeft, openLeft],
  });
  const rightTranslateX = spread.interpolate({
    inputRange: [0, 1],
    outputRange: [closedRight, openRight],
  });
  const scaleX = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.09],
  });
  const scaleY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
  });
  const translateY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  useEffect(() => {
    Animated.spring(spread, {
      toValue: roomOpen ? 1 : 0,
      friction: 7,
      tension: 150,
      useNativeDriver: true,
    }).start();
  }, [roomOpen, spread]);

  function animatePress(toValue: number) {
    Animated.spring(press, {
      toValue,
      friction: 5,
      tension: 260,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View
      style={[
        styles.dockButton,
        styles.dockButtonRight,
        { transform: [{ translateY }, { scaleX }, { scaleY }] },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={roomOpen ? 'Show board members' : 'Open board'}
        onPress={onPress}
        onPressIn={() => animatePress(1)}
        onPressOut={() => animatePress(0)}
        style={styles.elasticPressable}>
        <GlassView
          colorScheme="light"
          glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.16 }}
          isInteractive
          tintColor="rgba(255, 255, 255, 0.72)"
          style={[
            styles.dockButtonGlass,
            active && styles.dockButtonActive,
            memberTrayOpen && styles.dockButtonActive,
          ]}>
          <View style={styles.socialDockPeople}>
            <Animated.View style={[styles.socialDockPerson, { transform: [{ translateX: leftTranslateX }] }]}>
              <SymbolView name={symbolName('person.fill')} size={25} tintColor={INK} />
            </Animated.View>
            <Animated.View style={[styles.socialDockPerson, { transform: [{ translateX: rightTranslateX }] }]}>
              <SymbolView name={symbolName('person.fill')} size={25} tintColor={INK} />
            </Animated.View>
          </View>
          {active && <View style={styles.dockActiveDot} />}
        </GlassView>
      </Pressable>
    </Animated.View>
  );
}

function DockPopLayer({
  children,
  variant,
}: {
  children: ReactNode;
  variant: string;
}) {
  const [entrance] = useState(() => new Animated.Value(1));
  const opacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const scale = entrance.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.9, 1.04, 1],
  });
  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  useEffect(() => {
    entrance.setValue(0);
    Animated.spring(entrance, {
      toValue: 1,
      friction: 7,
      tension: 190,
      useNativeDriver: true,
    }).start();
  }, [entrance, variant]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.dockPopLayer, { opacity, transform: [{ translateY }, { scale }] }]}>
      {children}
    </Animated.View>
  );
}

function DrawingDockContent({
  colorOptions,
  onClear,
  onColorSelect,
  onDone,
  onUndo,
  selectedColor,
}: {
  colorOptions: readonly string[];
  onClear: () => void;
  onColorSelect: (color: string) => void;
  onDone: () => void;
  onUndo: () => void;
  selectedColor: string;
}) {
  return (
    <View style={styles.drawingDockContent}>
      <DrawingDockButton accessibilityLabel="Undo drawing stroke" icon="arrow.uturn.backward" onPress={onUndo} />
      <DrawingColorRail
        colorOptions={colorOptions}
        onColorSelect={onColorSelect}
        selectedColor={selectedColor}
      />
      <DrawingDockButton accessibilityLabel="Clear drawing" icon="trash" onPress={onClear} />
      <DrawingDockButton accessibilityLabel="Done drawing" emphasized icon="checkmark" onPress={onDone} />
    </View>
  );
}

function getClosestDrawingColorIndex(x: number, width: number, count: number) {
  if (count <= 1 || width <= 0) {
    return 0;
  }

  const slotWidth = width / count;

  return Math.max(0, Math.min(count - 1, Math.round(x / slotWidth - 0.5)));
}

function DrawingColorRail({
  colorOptions,
  onColorSelect,
  selectedColor,
}: {
  colorOptions: readonly string[];
  onColorSelect: (color: string) => void;
  selectedColor: string;
}) {
  const [railWidth, setRailWidth] = useState(0);
  const [indicatorX] = useState(() => new Animated.Value(0));
  const selectedIndex = Math.max(0, colorOptions.indexOf(selectedColor));
  const slotWidth = railWidth > 0 ? railWidth / Math.max(1, colorOptions.length) : 0;
  const indicatorWidth = 30;
  const targetIndicatorX = slotWidth * selectedIndex + slotWidth / 2 - indicatorWidth / 2;
  const lastDragIndexRef = useRef(selectedIndex);

  useEffect(() => {
    lastDragIndexRef.current = selectedIndex;
    Animated.spring(indicatorX, {
      toValue: Math.max(0, targetIndicatorX),
      friction: 7,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }, [indicatorX, selectedIndex, targetIndicatorX]);

  function selectClosestColor(event: GestureResponderEvent) {
    const nextIndex = getClosestDrawingColorIndex(
      event.nativeEvent.locationX,
      railWidth,
      colorOptions.length,
    );

    if (nextIndex === lastDragIndexRef.current) {
      return;
    }

    lastDragIndexRef.current = nextIndex;
    onColorSelect(colorOptions[nextIndex]);
  }

  return (
    <GlassSurface interactive style={styles.drawingColorRail}>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel="Drawing color"
        onLayout={(event) => setRailWidth(event.nativeEvent.layout.width)}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={selectClosestColor}
        onResponderMove={selectClosestColor}
        onResponderRelease={selectClosestColor}
        onStartShouldSetResponder={() => true}
        style={styles.drawingColorRailTouch}>
        {railWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.drawingColorLiquidIndicator,
              {
                width: indicatorWidth,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
        )}
        {colorOptions.map((color) => (
          <View
            key={color}
            pointerEvents="none"
            style={styles.drawingColorSlot}>
            <View
              style={[
                styles.drawingColorSwatch,
                color === selectedColor && styles.drawingColorSwatchActive,
                { backgroundColor: color },
                color === INK && styles.drawingColorSwatchInk,
              ]}
            />
          </View>
        ))}
      </View>
    </GlassSurface>
  );
}

function DrawingDockButton({
  accessibilityLabel,
  emphasized,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  emphasized?: boolean;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawingDockButton,
        emphasized && styles.drawingDockButtonEmphasized,
        pressed && styles.pressed,
      ]}>
      <GlassView
        colorScheme="light"
        glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.16 }}
        isInteractive
        tintColor="rgba(255, 255, 255, 0.68)"
        style={[
          styles.drawingDockButtonGlass,
          emphasized && styles.drawingDockButtonGlassEmphasized,
        ]}>
        <SymbolView
          name={symbolName(icon)}
          size={emphasized ? 18 : 17}
          tintColor={emphasized ? PAPER : INK}
          weight="bold"
        />
      </GlassView>
    </Pressable>
  );
}

function StickerView({ item }: { item: SnagItem }) {
  if (isTextSnag(item)) {
    return (
      <View
        style={[
          styles.capturedSticker,
          styles.capturedTextSticker,
          {
            width: item.size,
            height: item.size * 0.45,
            left: item.canvasX,
            top: item.canvasY,
            transform: [{ rotate: item.rotate }],
          },
        ]}>
        <Text adjustsFontSizeToFit minimumFontScale={0.38} style={styles.capturedTextStickerText} numberOfLines={1}>{item.text}</Text>
      </View>
    );
  }

  if (!item.imageUri) {
    return null;
  }

  return (
    <View
      style={[
        styles.capturedSticker,
        {
          width: item.size,
          height: item.size,
          left: item.canvasX,
          top: item.canvasY,
          transform: [{ rotate: item.rotate }],
        },
      ]}>
      <Image
        cachePolicy="memory-disk"
        contentFit="contain"
        source={{ uri: item.imageUri }}
        style={styles.capturedStickerImage}
        transition={0}
      />
    </View>
  );
}

const STICKER_OUTLINE_OFFSETS = [
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

function StickerOutline({ uri }: { uri: string }) {
  return (
    <View pointerEvents="none" style={styles.stickerOutline}>
      {STICKER_OUTLINE_OFFSETS.map((offset) => (
        <Image
          cachePolicy="memory-disk"
          contentFit="contain"
          key={`${offset.x}-${offset.y}`}
          source={{ uri }}
          style={[
            styles.stickerOutlineImage,
            { transform: [{ translateX: offset.x }, { translateY: offset.y }] },
          ]}
          tintColor="#FFFFFF"
          transition={0}
        />
      ))}
    </View>
  );
}

function AllCollectionSticker({
  item,
  onCopyRequested,
  onSelectionToggle,
  selected,
  selectionMode,
  size,
  x,
  y,
}: {
  item: SnagItem;
  onCopyRequested: (snagId: string, point: SnagCopyRequestPoint) => void;
  onSelectionToggle: (snagId: string) => void;
  selected: boolean;
  selectionMode: boolean;
  size: number;
  x: number;
  y: number;
}) {
  const copyLongPressConfig = getCopyLongPressConfig();

  if (!item.imageUri) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={selectionMode ? 'Select collected snag' : 'Copy collected snag'}
      delayLongPress={copyLongPressConfig.minDurationMs}
      onPress={() => {
        if (selectionMode) {
          onSelectionToggle(item.id);
        }
      }}
      onLongPress={(event) => {
        if (selectionMode) {
          return;
        }

        event.stopPropagation();
        onCopyRequested(item.id, {
          screenX: event.nativeEvent.pageX,
          screenY: event.nativeEvent.pageY,
          x: x + event.nativeEvent.locationX,
          y: y + event.nativeEvent.locationY,
        });
      }}
      style={[
        styles.allCollectionSticker,
        {
          height: size,
          left: x,
          top: y,
          width: size,
        },
        selected && styles.allCollectionStickerSelected,
      ]}>
      <StickerOutline uri={item.imageUri} />
      <Image
        cachePolicy="memory-disk"
        contentFit="contain"
        source={{ uri: item.imageUri }}
        style={styles.allCollectionStickerImage}
        transition={0}
      />
      {selectionMode && (
        <View pointerEvents="none" style={[styles.allSelectionCheck, selected && styles.allSelectionCheckActive]}>
          {selected && <SymbolView name={symbolName('checkmark')} size={13} tintColor={PAPER} weight="bold" />}
        </View>
      )}
    </Pressable>
  );
}

function FloatingActionButton({
  accessibilityLabel,
  label,
  onPress,
  style,
}: {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [entrance] = useState(() => new Animated.Value(0));
  const animation = getFloatingActionPopAnimationConfig();
  const opacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const scale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [animation.initialScale, 1],
  });
  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [animation.initialTranslateY, 0],
  });

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: animation.springFriction,
      tension: animation.springTension,
      useNativeDriver: true,
    }).start();
  }, [animation.initialScale, animation.initialTranslateY, animation.springFriction, animation.springTension, entrance]);

  return (
    <Animated.View style={[styles.pasteButton, style, { opacity, transform: [{ translateY }, { scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.floatingActionPressable, pressed && styles.pressed]}>
        <GlassView
          colorScheme="light"
          glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.16 }}
          isInteractive
          tintColor={FLOATING_ACTION_CHROME.tintColor}
          style={styles.pasteButtonGlass}>
          <Text style={styles.pasteButtonText}>{label}</Text>
        </GlassView>
      </Pressable>
    </Animated.View>
  );
}

export default function SnagApp() {
  const { height, width } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    [BRAND_FONT]: require('../../assets/fonts/DynaPuff.ttf'),
  });
  const brandFont = fontsLoaded ? BRAND_FONT : Fonts.rounded;
  const socialClient = useMemo(() => getSnagSupabaseClient(), []);
  const [mode, setMode] = useState<Mode>(getInitialSnagMode());
  const [cameraFlowOpen, setCameraFlowOpen] = useState(false);
  const [showCategoryTray, setShowCategoryTray] = useState(false);
  const [categories, setCategories] = useState<SnagCategoryItem[]>(SNAG_CATEGORIES);
  const [selectedCategoryId, setSelectedCategoryId] = useState(DEFAULT_CATEGORY_ID);
  const [categorySnapRequest, setCategorySnapRequest] = useState<{
    id: number;
    reason: CategorySnapReason;
  }>({ id: 0, reason: 'sync' });
  const [snags, setSnags] = useState<SnagItem[]>([]);
  const [drawingsByCategoryId, setDrawingsByCategoryId] = useState<Record<string, SnagDrawingStroke[]>>({});
  const [snagCount, setSnagCount] = useState(0);
  const [boardRooms, setBoardRooms] = useState<BoardRoom[]>([]);
  const [selectedBoardRoomId, setSelectedBoardRoomId] = useState<string | null>(null);
  const [enteringBoardRoomId, setEnteringBoardRoomId] = useState<string | null>(null);
  const [boardRoomCount, setBoardRoomCount] = useState(0);
  const [boardSnagsByRoomId, setBoardSnagsByRoomId] = useState<Record<string, SnagItem[]>>({});
  const boardSnagsByRoomIdRef = useRef<Record<string, SnagItem[]>>({});
  const boardWarmupKeysRef = useRef<Set<string>>(new Set());
  const [boardWarmupTick, setBoardWarmupTick] = useState(0);
  const [boardSnagCount, setBoardSnagCount] = useState(0);
  const [drawingsByBoardRoomId, setDrawingsByBoardRoomId] = useState<Record<string, SnagDrawingStroke[]>>({});
  const [drawingBoardRoomId, setDrawingBoardRoomId] = useState<string | null>(null);
  const [stagedSnagId, setStagedSnagId] = useState<string | null>(null);
  const stagedSnagIdRef = useRef<string | null>(null);
  const [trashDragState, setTrashDragState] = useState<TrashDragState>({
    armedId: null,
    draggingId: null,
  });
  const [libraryReady, setLibraryReady] = useState(false);
  const [collectionBootReady, setCollectionBootReady] = useState(false);
  const [burst] = useState(() => new Animated.Value(0));
  const [surfaceProgress] = useState(() => new Animated.Value(0));
  const [collectionOverlayDismissSignal, setCollectionOverlayDismissSignal] = useState(0);
  const [allSelectionMode, setAllSelectionMode] = useState(false);
  const [selectedAllSnagIds, setSelectedAllSnagIds] = useState<string[]>([]);
  const [allSelectionDeleteDialogOpen, setAllSelectionDeleteDialogOpen] = useState(false);
  const [drawingCategoryId, setDrawingCategoryId] = useState<string | null>(null);
  const [drawingStrokeColor, setDrawingStrokeColor] = useState<string>(DEFAULT_DRAWING_STROKE_COLOR);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [categoryBackgroundPicker, setCategoryBackgroundPicker] = useState<CategoryBackgroundPickerState | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [boardColorPickerOpen, setBoardColorPickerOpen] = useState(false);
  const [boardRenameDialogOpen, setBoardRenameDialogOpen] = useState(false);
  const [boardDeleteDialogOpen, setBoardDeleteDialogOpen] = useState(false);
  const [boardLeaveDialogOpen, setBoardLeaveDialogOpen] = useState(false);
  const [boardKickTarget, setBoardKickTarget] = useState<{ id: string; label: string } | null>(null);
  const [boardReportTarget, setBoardReportTarget] = useState<{ id: string; label: string } | null>(null);
  const [boardRenameValue, setBoardRenameValue] = useState('');
  const [textSnagDialog, setTextSnagDialog] = useState<TextSnagDialogState | null>(null);
  const [textSnagDraft, setTextSnagDraft] = useState('');
  const [boardMembersOpen, setBoardMembersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SnagUserSettings>(DEFAULT_USER_SETTINGS);
  const [profileNameDraft, setProfileNameDraft] = useState(getSettingsProfileNameDraft(DEFAULT_USER_SETTINGS.profileName));
  const [socialProfile, setSocialProfile] = useState<SocialProfile | null>(null);
  const socialBoardRefreshInFlightRef = useRef(false);
  const cachedSocialBoardSnapshotRef = useRef<SocialBoardCacheState | null>(null);
  const [categoryGridPreferences, setCategoryGridPreferences] = useState<Record<string, boolean>>({});
  const captureCategoryIdRef = useRef(selectedCategoryId);

  const canvasWidth = Math.max(width * 2.55, 1120);
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? {
    id: DEFAULT_CATEGORY_ID,
    title: 'Category 1',
  };
  const selectedBoardRoom = boardRooms.find((room) => room.id === selectedBoardRoomId) ?? null;
  const enteringBoardRoom = boardRooms.find((room) => room.id === enteringBoardRoomId) ?? null;
  const currentBoardMemberId = socialProfile?.cloudEnabled ? socialProfile.id : LOCAL_BOARD_MEMBER_ID;
  const activeSocialClient = socialProfile?.cloudEnabled ? socialClient : null;
  const selectedBoardSnags = selectedBoardRoom ? boardSnagsByRoomId[selectedBoardRoom.id] ?? [] : [];
  const boardLimitState = getBoardLimitState({
    currentMemberId: currentBoardMemberId,
    room: selectedBoardRoom,
    rooms: boardRooms,
    snagsInCurrentRoom: selectedBoardSnags.length,
  });
  const snagLimitCopy = boardLimitState.canAddSnag ? null : getBoardLimitCopy('snagsPerBoard');
  const canEditSelectedCategory = selectedCategory.id !== 'all';
  const appLoading = shouldRenderAppLoadingScreen({
    cameraFlowOpen,
    collectionReady: collectionBootReady,
    libraryReady,
  });
  const collectionSurfaceReady = shouldRenderCollectionSurface({ libraryReady });

  function requestCategorySnap(reason: CategorySnapReason = 'selection') {
    setCategorySnapRequest((request) => ({
      id: request.id + 1,
      reason,
    }));
  }

  useEffect(() => {
    let isMounted = true;

    loadSnagLibraryAsync()
      .then(async (library) => {
        await preloadSnagImages(library.snags).catch((error) => {
          console.warn('Could not preload Snag images', error);
        });

        if (!isMounted) {
          return;
        }

        setCategories(library.categories);
        setCategoryGridPreferences(library.categoryGridPreferences);
        setDrawingsByCategoryId(library.drawingsByCategoryId);
        setSettings(library.settings);
        setProfileNameDraft(getSettingsProfileNameDraft(library.settings.profileName));
        setSelectedCategoryId(library.selectedCategoryId);
        setSnagCount(library.snagCount);
        setSnags(library.snags);
      })
      .catch((error) => {
        console.warn('Could not load Snag library', error);
      })
      .finally(() => {
        if (isMounted) {
          setLibraryReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const snagsImageCacheKey = useMemo(() => (
    Array.from(new Set(snags.map((snag) => snag.imageUri).filter((uri): uri is string => Boolean(uri)))).join('\n')
  ), [snags]);

  const animateSurfaceTransition = useCallback((toValue: number) => {
    Animated.timing(surfaceProgress, {
      toValue,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [surfaceProgress]);

  const previewSurfaceTransition = useCallback((progress: number) => {
    surfaceProgress.stopAnimation();
    surfaceProgress.setValue(Math.max(0, Math.min(progress, 1)));
  }, [surfaceProgress]);

  const cancelSurfaceTransition = useCallback(() => {
    animateSurfaceTransition(mode === 'board' ? 1 : 0);
  }, [animateSurfaceTransition, mode]);

  const handleCollectionInitialPageReady = useCallback(() => {
    setCollectionBootReady(true);
  }, []);

  const applySocialBoardSnapshot = useCallback((snapshot: SocialBoardSnapshot) => {
    boardSnagsByRoomIdRef.current = snapshot.snagsByRoomId;
    setBoardRooms(snapshot.rooms);
    setBoardSnagsByRoomId(snapshot.snagsByRoomId);
    setDrawingsByBoardRoomId(snapshot.drawingsByRoomId);
    setBoardRoomCount(snapshot.rooms.length);
    setBoardSnagCount(Object.values(snapshot.snagsByRoomId).reduce((count, roomSnags) => count + roomSnags.length, 0));
    setSelectedBoardRoomId((currentRoomId) => (
      currentRoomId && !snapshot.rooms.some((room) => room.id === currentRoomId)
        ? null
        : currentRoomId
    ));
  }, []);

  const cacheSocialBoardSnapshot = useCallback((snapshot: SocialBoardSnapshot) => {
    const cachedSnapshot: SocialBoardCacheState = {
      drawingsByRoomId: snapshot.drawingsByRoomId,
      rooms: snapshot.rooms,
      savedAt: Date.now(),
      snagsByRoomId: snapshot.snagsByRoomId,
    };

    cachedSocialBoardSnapshotRef.current = cachedSnapshot;
    void saveSocialBoardCacheAsync(cachedSnapshot).catch((error) => {
      console.warn('Could not cache social boards', error);
    });
  }, []);

  const preloadBoardRoomImages = useCallback((
    roomId: string,
    snagsByRoomId = boardSnagsByRoomIdRef.current,
    limit = BOARD_ROOM_PREFETCH_LIMIT,
  ) => (
    preloadSnagImages(getBoardRoomPrefetchSnags({
      limit,
      snags: getLayeredSnags(snagsByRoomId[roomId] ?? []),
    }))
  ), []);

  useEffect(() => {
    if (!enteringBoardRoomId) {
      return;
    }

    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;

    void preloadBoardRoomImages(
      enteringBoardRoomId,
      boardSnagsByRoomIdRef.current,
      BOARD_IDLE_WARMUP_PRIMARY_LIMIT,
    ).catch((error) => {
      console.warn('Could not preload entering board images', error);
    }).finally(() => {
      if (cancelled) {
        return;
      }

      setSelectedBoardRoomId(enteringBoardRoomId);
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          if (!cancelled) {
            setEnteringBoardRoomId(null);
          }
        });
      });
    });

    return () => {
      cancelled = true;
      if (firstFrame) {
        cancelAnimationFrame(firstFrame);
      }
      if (secondFrame) {
        cancelAnimationFrame(secondFrame);
      }
    };
  }, [enteringBoardRoomId, preloadBoardRoomImages]);

  useEffect(() => {
    if (!snagsImageCacheKey) {
      return;
    }

    void Image.prefetch(snagsImageCacheKey.split('\n'), 'memory-disk').catch((error) => {
      console.warn('Could not refresh Snag image cache', error);
    });
  }, [snagsImageCacheKey]);

  useEffect(() => {
    if (!cameraFlowOpen) {
      captureCategoryIdRef.current = selectedCategoryId;
    }
  }, [cameraFlowOpen, selectedCategoryId]);

  useEffect(() => {
    stagedSnagIdRef.current = stagedSnagId;
  }, [stagedSnagId]);

  useEffect(() => {
    boardSnagsByRoomIdRef.current = boardSnagsByRoomId;
  }, [boardSnagsByRoomId]);

  useEffect(() => {
    if (mode === 'collection') {
      animateSurfaceTransition(0);
      return;
    }

    if (mode === 'board') {
      animateSurfaceTransition(1);
    }
  }, [animateSurfaceTransition, mode]);

  useEffect(() => {
    if (!libraryReady) {
      return;
    }

    void saveSnagLibraryAsync({
      categories,
      categoryGridPreferences,
      drawingsByCategoryId,
      settings,
      selectedCategoryId,
      snagCount,
      snags,
    }).catch((error) => {
      console.warn('Could not save Snag library', error);
    });
  }, [categories, categoryGridPreferences, drawingsByCategoryId, libraryReady, selectedCategoryId, settings, snagCount, snags]);

  useEffect(() => {
    if (!libraryReady) {
      return;
    }

    let isMounted = true;

    loadSocialBoardCacheAsync()
      .then((cachedSnapshot) => {
        if (!isMounted || !cachedSnapshot) {
          return;
        }

        cachedSocialBoardSnapshotRef.current = cachedSnapshot;
        applySocialBoardSnapshot(cachedSnapshot);
      })
      .catch((error) => {
        console.warn('Could not load cached social boards', error);
      });

    loadOrCreateSocialProfileAsync({
      client: socialClient,
      displayName: getProfileDisplayName(settings),
      localSeed: 'snag-local-social-profile',
    })
      .then(async (profile) => {
        if (!isMounted) {
          return;
        }

        setSocialProfile(profile);

        if (!profile.cloudEnabled) {
          return;
        }

        const snapshot = await loadJoinedSocialBoardsAsync({
          client: socialClient,
          currentMemberId: profile.id,
        });

        if (!isMounted) {
          return;
        }

        const mergedSnapshot = mergeSocialBoardSnapshotWithLocalCache({
          cloudSnapshot: snapshot,
          localCache: cachedSocialBoardSnapshotRef.current,
        });

        applySocialBoardSnapshot(mergedSnapshot);
        cacheSocialBoardSnapshot(mergedSnapshot);
      })
      .catch((error) => {
        console.warn('Could not prepare social boards', error);
      });

    return () => {
      isMounted = false;
    };
  }, [applySocialBoardSnapshot, cacheSocialBoardSnapshot, libraryReady, settings, socialClient]);

  useEffect(() => {
    if (!libraryReady || !socialProfile?.cloudEnabled || !socialClient) {
      return;
    }

    let isMounted = true;
    const socialMemberId = socialProfile.id;
    async function refreshSocialBoardsQuietly() {
      if (socialBoardRefreshInFlightRef.current) {
        return;
      }

      socialBoardRefreshInFlightRef.current = true;

      try {
        const snapshot = await loadJoinedSocialBoardsAsync({
          client: socialClient,
          currentMemberId: socialMemberId,
        });

        if (!isMounted) {
          return;
        }

        const mergedSnapshot = mergeSocialBoardSnapshotWithLocalCache({
          cloudSnapshot: snapshot,
          localCache: cachedSocialBoardSnapshotRef.current,
        });

        applySocialBoardSnapshot(mergedSnapshot);
        cacheSocialBoardSnapshot(mergedSnapshot);
      } catch (error) {
        console.warn('Could not refresh social boards quietly', error);
      } finally {
        socialBoardRefreshInFlightRef.current = false;
      }
    }

    const refreshTimer = setInterval(refreshSocialBoardsQuietly, SOCIAL_BOARD_REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(refreshTimer);
    };
  }, [applySocialBoardSnapshot, cacheSocialBoardSnapshot, libraryReady, socialClient, socialProfile?.cloudEnabled, socialProfile?.id]);

  useEffect(() => {
    if (!libraryReady || cameraFlowOpen || drawingBoardRoomId || boardRooms.length === 0) {
      return;
    }

    let cancelled = false;
    let interactionTask: { cancel?: () => void } | null = null;
    const warmupTimer = setTimeout(() => {
      interactionTask = InteractionManager.runAfterInteractions(() => {
        if (cancelled) {
          return;
        }

        const warmupRequest = getNextBoardWarmupRequest({
          rooms: boardRooms,
          selectedRoomId: selectedBoardRoomId,
          snagsByRoomId: boardSnagsByRoomIdRef.current,
          warmedRoomKeys: Array.from(boardWarmupKeysRef.current),
        });

        if (!warmupRequest) {
          return;
        }

        void preloadBoardRoomImages(
          warmupRequest.roomId,
          boardSnagsByRoomIdRef.current,
          warmupRequest.limit,
        )
          .catch((error) => {
            console.warn('Could not warm board images', error);
          })
          .finally(() => {
            if (cancelled) {
              return;
            }

            boardWarmupKeysRef.current.add(warmupRequest.key);
            setBoardWarmupTick((tick) => tick + 1);
          });
      });
    }, BOARD_IDLE_WARMUP_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(warmupTimer);
      interactionTask?.cancel?.();
    };
  }, [
    boardRooms,
    boardWarmupTick,
    cameraFlowOpen,
    drawingBoardRoomId,
    libraryReady,
    preloadBoardRoomImages,
    selectedBoardRoomId,
  ]);

  async function commitCompletedSnag(completedSnag: SnagItem) {
    try {
      return await persistSnagImageAsync(completedSnag);
    } catch (error) {
      console.warn('Could not persist Snag image', error);
      return completedSnag;
    }
  }

  function settleStagedSnag(snagId: string) {
    if (stagedSnagIdRef.current !== snagId) {
      return;
    }

    stagedSnagIdRef.current = null;
    setStagedSnagId(null);
    Animated.timing(burst, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function handleSnagTransformEnd(snagId: string, transform: SnagTransformPatch) {
    setSnags((currentSnags) => bringSnagToFront(
      applySnagTransform(currentSnags, snagId, transform),
      snagId,
    ));
  }

  function cacheCurrentSocialBoardSnapshot({
    drawingsByRoomId = drawingsByBoardRoomId,
    rooms = boardRooms,
    snagsByRoomId = boardSnagsByRoomIdRef.current,
  }: Partial<Pick<SocialBoardCacheState, 'drawingsByRoomId' | 'rooms' | 'snagsByRoomId'>> = {}) {
    const snapshot = {
      drawingsByRoomId,
      rooms,
      savedAt: getCurrentTimestampMs(),
      snagsByRoomId,
    };

    cachedSocialBoardSnapshotRef.current = snapshot;
    void saveSocialBoardCacheAsync(snapshot).catch((error) => {
      console.warn('Could not cache social board snapshot', error);
    });
  }

  function persistBoardSnagTransform(roomId: string, snag: SnagItem) {
    if (snag.pendingSync) {
      return;
    }

    void updateBoardSnagTransformAsync({
      client: activeSocialClient,
      roomId,
      snag,
    }).catch((error) => {
      console.warn('Could not sync board Snag transform', error);
    });
  }

  function handleBoardSnagTransformEnd(roomId: string, snagId: string, transform: SnagTransformPatch) {
    const currentRoomSnags = boardSnagsByRoomIdRef.current[roomId] ?? [];
    const updatedAt = getCurrentTimestampMs();
    const nextRoomSnags = bringSnagToFront(
      applySnagTransform(currentRoomSnags, snagId, transform),
      snagId,
    ).map((snag) => (
      snag.id === snagId
        ? { ...snag, updatedAt }
        : snag
    ));
    const transformedSnag = nextRoomSnags.find((snag) => snag.id === snagId);

    boardSnagsByRoomIdRef.current = {
      ...boardSnagsByRoomIdRef.current,
      [roomId]: nextRoomSnags,
    };
    setBoardSnagsByRoomId(boardSnagsByRoomIdRef.current);
    cacheCurrentSocialBoardSnapshot({
      snagsByRoomId: boardSnagsByRoomIdRef.current,
    });

    if (transformedSnag) {
      persistBoardSnagTransform(roomId, transformedSnag);
    }
  }

  function handleSnagBringToFront(snagId: string) {
    setSnags((currentSnags) => bringSnagToFront(currentSnags, snagId));
  }

  function handleBoardSnagBringToFront(roomId: string, snagId: string) {
    const updatedAt = getCurrentTimestampMs();
    const nextRoomSnags = bringSnagToFront(boardSnagsByRoomIdRef.current[roomId] ?? [], snagId).map((snag) => (
      snag.id === snagId
        ? { ...snag, updatedAt }
        : snag
    ));
    const transformedSnag = nextRoomSnags.find((snag) => snag.id === snagId);

    boardSnagsByRoomIdRef.current = {
      ...boardSnagsByRoomIdRef.current,
      [roomId]: nextRoomSnags,
    };
    setBoardSnagsByRoomId(boardSnagsByRoomIdRef.current);
    cacheCurrentSocialBoardSnapshot({
      snagsByRoomId: boardSnagsByRoomIdRef.current,
    });

    if (transformedSnag) {
      persistBoardSnagTransform(roomId, transformedSnag);
    }
  }

  function handleDeleteBoardSnag(roomId: string, snagId: string) {
    setTrashDragState({ armedId: null, draggingId: null });
    boardSnagsByRoomIdRef.current = deleteBoardSnagFromRoom({
      boardsByRoomId: boardSnagsByRoomIdRef.current,
      roomId,
      snagId,
    });
    setBoardSnagsByRoomId(boardSnagsByRoomIdRef.current);
    cacheCurrentSocialBoardSnapshot({
      snagsByRoomId: boardSnagsByRoomIdRef.current,
    });
    void deleteSocialBoardSnagAsync({
      client: activeSocialClient,
      roomId,
      snagId,
    }).catch((error) => {
      console.warn('Could not sync board Snag delete', error);
    });
  }

  function handleBoardSnagDeleteComplete(roomId: string, snagId: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((error) => {
      console.warn('Could not play board delete haptic', error);
    });
    handleDeleteBoardSnag(roomId, snagId);
  }

  function handleDeleteSnag(snagId: string) {
    setTrashDragState({ armedId: null, draggingId: null });
    if (stagedSnagIdRef.current === snagId) {
      stagedSnagIdRef.current = null;
    }
    setStagedSnagId((currentStagedId) => (currentStagedId === snagId ? null : currentStagedId));
    setSelectedAllSnagIds((currentIds) => currentIds.filter((id) => id !== snagId));
    setSnags((currentSnags) => currentSnags.filter((snag) => snag.id !== snagId));
  }

  function handleSnagDeleteComplete(snagId: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((error) => {
      console.warn('Could not play delete haptic', error);
    });
    handleDeleteSnag(snagId);
  }

  async function handlePasteSnag({
    boardHeight,
    boardWidth,
    categoryId,
    pointerX,
    pointerY,
    sourceSnagId,
  }: PasteSnagRequest) {
    try {
      const pastedAsset = await getClipboardSnagImageAsync();

      if (!pastedAsset?.uri) {
        return;
      }

      const sourceSnag = sourceSnagId ? snags.find((snag) => snag.id === sourceSnagId) : undefined;
      const isExistingSnagCopy = Boolean(sourceSnag);
      const originSnagId = sourceSnag?.originSnagId ?? sourceSnag?.id;
      const presentation = getPastedSnagPresentation({
        boardHeight,
        boardWidth,
        pointerX,
        pointerY,
      });
      const nextSnag = createSnagFromAsset({
        asset: pastedAsset,
        canvasX: presentation.canvasX,
        canvasY: presentation.canvasY,
        categoryId,
        excludeFromAll: categoryId !== 'all' && isExistingSnagCopy,
        index: snagCount,
        originSnagId,
        size: presentation.size,
      });

      closeCategoryActions();
      setSelectedCategoryId(categoryId);
      setShowCategoryTray(false);
      setMode('collection');
      setSnags((currentSnags) => appendPendingSnag(currentSnags, {
        ...nextSnag,
        layerIndex: getNextSnagLayerIndex(currentSnags),
      }));
      setSnagCount((count) => count + 1);

      void commitCompletedSnag(nextSnag).then((storedSnag) => {
        setSnags((currentSnags) => currentSnags.map((snag) => (
          snag.id === storedSnag.id
            ? {
                ...snag,
                imageHeight: storedSnag.imageHeight,
                imageUri: storedSnag.imageUri,
                imageWidth: storedSnag.imageWidth,
              }
            : snag
        )));
      });
    } catch (error) {
      console.warn('Could not paste Snag image', error);
    }
  }

  async function handlePasteBoardSnag({
    boardHeight,
    boardWidth,
    pointerX,
    pointerY,
    roomId,
  }: BoardPasteSnagRequest) {
    try {
      const room = boardRooms.find((joinedRoom) => joinedRoom.id === roomId) ?? null;
      const currentRoomSnags = boardSnagsByRoomIdRef.current[roomId] ?? [];
      const pasteLimitState = getBoardLimitState({
        currentMemberId: currentBoardMemberId,
        room,
        rooms: boardRooms,
        snagsInCurrentRoom: currentRoomSnags.length,
      });

      if (!pasteLimitState.canAddSnag) {
        return;
      }

      const pastedAsset = await getClipboardSnagImageAsync();

      if (!pastedAsset?.uri) {
        return;
      }

      const presentation = getPastedSnagPresentation({
        boardHeight,
        boardWidth,
        pointerX,
        pointerY,
      });
      const nextSnag = createSnagFromAsset({
        asset: pastedAsset,
        canvasX: presentation.canvasX,
        canvasY: presentation.canvasY,
        categoryId: roomId,
        index: boardSnagCount,
        size: presentation.size,
      });

      closeBoardActions();
      setBoardMembersOpen(false);
      setSelectedBoardRoomId(roomId);
      setMode('board');
      const pastedAt = getCurrentTimestampMs();
      const pendingBoardSnag = {
        ...nextSnag,
        layerIndex: getNextSnagLayerIndex(currentRoomSnags),
        pendingSync: true,
        updatedAt: pastedAt,
      };

      boardSnagsByRoomIdRef.current = {
        ...boardSnagsByRoomIdRef.current,
        [roomId]: appendPendingSnag(currentRoomSnags, pendingBoardSnag),
      };
      setBoardSnagsByRoomId(boardSnagsByRoomIdRef.current);
      cacheCurrentSocialBoardSnapshot({
        snagsByRoomId: boardSnagsByRoomIdRef.current,
      });
      setBoardSnagCount((count) => count + 1);

      void commitCompletedSnag(pendingBoardSnag).then(async (storedSnag) => {
        const latestBoardSnag = (boardSnagsByRoomIdRef.current[roomId] ?? []).find((snag) => snag.id === storedSnag.id);

        if (!latestBoardSnag) {
          return;
        }

        const storedBoardSnag = {
          ...latestBoardSnag,
          imageHeight: storedSnag.imageHeight,
          imageUri: storedSnag.imageUri,
          imageWidth: storedSnag.imageWidth,
          pendingSync: true,
        };

        boardSnagsByRoomIdRef.current = {
          ...boardSnagsByRoomIdRef.current,
          [roomId]: (boardSnagsByRoomIdRef.current[roomId] ?? []).map((snag) => (
            snag.id === storedSnag.id ? storedBoardSnag : snag
          )),
        };
        setBoardSnagsByRoomId(boardSnagsByRoomIdRef.current);
        cacheCurrentSocialBoardSnapshot({
          snagsByRoomId: boardSnagsByRoomIdRef.current,
        });

        await uploadAndSaveBoardSnagAsync({
          client: activeSocialClient,
          currentMemberId: currentBoardMemberId,
          roomId,
          snag: storedBoardSnag,
        });

        boardSnagsByRoomIdRef.current = {
          ...boardSnagsByRoomIdRef.current,
          [roomId]: (boardSnagsByRoomIdRef.current[roomId] ?? []).map((snag) => {
            if (snag.id !== storedSnag.id) {
              return snag;
            }

            const { pendingSync, ...syncedSnag } = snag;
            return syncedSnag;
          }),
        };
        setBoardSnagsByRoomId(boardSnagsByRoomIdRef.current);
        cacheCurrentSocialBoardSnapshot({
          snagsByRoomId: boardSnagsByRoomIdRef.current,
        });
      }).catch((error) => {
        console.warn('Could not sync pasted board Snag', error);
      });
    } catch (error) {
      console.warn('Could not paste board Snag image', error);
    }
  }

  function handleOpenCategoryTextDialog() {
    if (!canEditSelectedCategory) {
      return;
    }

    closeDrawingMode();
    closeCategoryActions();
    setShowCategoryTray(false);
    setCollectionOverlayDismissSignal((signal) => signal + 1);
    setTextSnagDraft('');
    setTextSnagDialog({
      categoryId: selectedCategory.id,
      surface: 'collection',
    });
  }

  function handleOpenBoardTextDialog() {
    if (!selectedBoardRoom || !boardLimitState.canAddSnag) {
      return;
    }

    closeDrawingMode();
    closeBoardActions();
    setBoardMembersOpen(false);
    setTextSnagDraft('');
    setTextSnagDialog({
      roomId: selectedBoardRoom.id,
      surface: 'board',
    });
  }

  function handleOpenCollectionTextEdit(snagId: string) {
    const textSnag = snags.find((snag) => snag.id === snagId);

    if (!textSnag || !isTextSnag(textSnag)) {
      return;
    }

    closeCategoryActions();
    setTextSnagDraft(textSnag.text ?? textSnag.title);
    setTextSnagDialog({
      categoryId: textSnag.category,
      snagId,
      surface: 'collection',
    });
  }

  function handleOpenBoardTextEdit(roomId: string, snagId: string) {
    const textSnag = (boardSnagsByRoomIdRef.current[roomId] ?? []).find((snag) => snag.id === snagId);

    if (!textSnag || !isTextSnag(textSnag)) {
      return;
    }

    closeBoardActions();
    setBoardMembersOpen(false);
    setTextSnagDraft(textSnag.text ?? textSnag.title);
    setTextSnagDialog({
      roomId,
      snagId,
      surface: 'board',
    });
  }

  function handleCancelTextSnagDialog() {
    setTextSnagDialog(null);
    setTextSnagDraft('');
    Keyboard.dismiss();
  }

  function handleSubmitTextSnag() {
    if (!textSnagDialog) {
      return;
    }

    const normalizedText = normalizeTextSnagValue(textSnagDraft);

    if (!normalizedText) {
      return;
    }

    if (textSnagDialog.surface === 'collection') {
      if (textSnagDialog.snagId) {
        setSnags((currentSnags) => currentSnags.map((snag) => (
          snag.id === textSnagDialog.snagId && isTextSnag(snag)
            ? { ...snag, text: normalizedText, title: normalizedText }
            : snag
        )));
      } else {
        const presentation = getNewSnagPresentation({
          preferredSize: 260,
          viewportHeight: height,
          viewportWidth: width,
        });
        const nextSnag = createTextSnag({
          canvasX: presentation.canvasX,
          canvasY: presentation.canvasY,
          categoryId: textSnagDialog.categoryId,
          index: snagCount,
          size: presentation.size,
          text: normalizedText,
        });

        setSelectedCategoryId(textSnagDialog.categoryId);
        setMode('collection');
        setSnags((currentSnags) => appendPendingSnag(currentSnags, {
          ...nextSnag,
          layerIndex: getNextSnagLayerIndex(currentSnags),
        }));
        setSnagCount((count) => count + 1);
      }
    } else if (textSnagDialog.snagId) {
      const roomId = textSnagDialog.roomId;
      const currentRoomSnags = boardSnagsByRoomIdRef.current[roomId] ?? [];
      let editedSnag: SnagItem | null = null;
      const nextRoomSnags = currentRoomSnags.map((snag) => {
        if (snag.id !== textSnagDialog.snagId || !isTextSnag(snag)) {
          return snag;
        }

        editedSnag = { ...snag, text: normalizedText, title: normalizedText };
        return editedSnag;
      });

      boardSnagsByRoomIdRef.current = {
        ...boardSnagsByRoomIdRef.current,
        [roomId]: nextRoomSnags,
      };
      setBoardSnagsByRoomId(boardSnagsByRoomIdRef.current);

      if (editedSnag) {
        persistBoardSnagTransform(roomId, editedSnag);
      }
    } else {
      const roomId = textSnagDialog.roomId;
      const currentRoomSnags = boardSnagsByRoomIdRef.current[roomId] ?? [];
      const presentation = getNewSnagPresentation({
        preferredSize: 260,
        viewportHeight: height,
        viewportWidth: width,
      });
      const nextSnag = createTextSnag({
        canvasX: presentation.canvasX,
        canvasY: presentation.canvasY,
        categoryId: roomId,
        index: boardSnagCount,
        size: presentation.size,
        text: normalizedText,
      });
      const nextRoomSnags = appendPendingSnag(currentRoomSnags, {
        ...nextSnag,
        layerIndex: getNextSnagLayerIndex(currentRoomSnags),
      });

      boardSnagsByRoomIdRef.current = {
        ...boardSnagsByRoomIdRef.current,
        [roomId]: nextRoomSnags,
      };
      setSelectedBoardRoomId(roomId);
      setMode('board');
      setBoardSnagsByRoomId(boardSnagsByRoomIdRef.current);
      setBoardSnagCount((count) => count + 1);
      void uploadAndSaveBoardSnagAsync({
        client: activeSocialClient,
        currentMemberId: currentBoardMemberId,
        roomId,
        snag: nextSnag,
      }).catch((error) => {
        console.warn('Could not sync board text Snag', error);
      });
    }

    handleCancelTextSnagDialog();
  }

  function handleSnag(asset?: CompletedSnagAsset) {
    if (!asset?.uri) {
      return;
    }

    const targetCategoryId = getCaptureCategoryId({
      captureCategoryId: captureCategoryIdRef.current,
      selectedCategoryId,
    });
    const presentation = getNewSnagPresentation({
      viewportHeight: height,
      viewportWidth: width,
    });
    const nextSnag = createSnagFromAsset({
      asset: {
        height: asset.height,
        uri: asset.uri,
        width: asset.width,
      },
      canvasX: presentation.canvasX,
      canvasY: presentation.canvasY,
      categoryId: targetCategoryId,
      index: snagCount,
      size: presentation.size,
    });

    closeCategoryActions();
    setShowCategoryTray(false);
    setSelectedCategoryId(targetCategoryId);
    setMode('collection');
    setCameraFlowOpen(false);
    stagedSnagIdRef.current = nextSnag.id;
    setStagedSnagId(nextSnag.id);
    burst.setValue(0.62);
    setSnags((currentSnags) => appendPendingSnag(currentSnags, {
      ...nextSnag,
      layerIndex: getNextSnagLayerIndex(currentSnags),
    }));
    setSnagCount((count) => count + 1);

    if (targetCategoryId === 'all') {
      setTimeout(() => {
        if (stagedSnagIdRef.current !== nextSnag.id) {
          return;
        }

        stagedSnagIdRef.current = null;
        setStagedSnagId(null);
        Animated.timing(burst, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }, 3000);
    }

    void commitCompletedSnag(nextSnag).then((storedSnag) => {
      setSnags((currentSnags) => currentSnags.map((snag) => (
        snag.id === storedSnag.id
          ? {
              ...snag,
              imageHeight: storedSnag.imageHeight,
              imageUri: storedSnag.imageUri,
              imageWidth: storedSnag.imageWidth,
            }
          : snag
      )));
    });
  }

  function closeCategoryActions() {
    setCategoryMenuOpen(false);
    setColorPickerOpen(false);
    setCategoryBackgroundPicker(null);
    setRenameDialogOpen(false);
    setDeleteDialogOpen(false);
  }

  function closeBoardActions() {
    setBoardMenuOpen(false);
    setBoardColorPickerOpen(false);
    setBoardRenameDialogOpen(false);
    setBoardDeleteDialogOpen(false);
    setBoardLeaveDialogOpen(false);
    setBoardKickTarget(null);
    setBoardReportTarget(null);
  }

  function closeDrawingMode() {
    setDrawingCategoryId(null);
    setDrawingBoardRoomId(null);
  }

  function closeAllSelectionMode() {
    setAllSelectionMode(false);
    setAllSelectionDeleteDialogOpen(false);
    setSelectedAllSnagIds([]);
  }

  function dismissCollectionActions() {
    closeCategoryActions();
    closeBoardActions();
    setCollectionOverlayDismissSignal((signal) => signal + 1);
  }

  function handleCategoryBadgePress() {
    closeDrawingMode();
    setShowCategoryTray(false);
    setCollectionOverlayDismissSignal((signal) => signal + 1);
    setRenameDialogOpen(false);
    setDeleteDialogOpen(false);
    setColorPickerOpen(false);
    setCategoryBackgroundPicker(null);
    setCategoryMenuOpen((isOpen) => !isOpen);
  }

  function handleDrawMenuPress() {
    if (!canEditSelectedCategory) {
      return;
    }

    setShowCategoryTray(false);
    setCollectionOverlayDismissSignal((signal) => signal + 1);
    setCategoryMenuOpen(false);
    setColorPickerOpen(false);
    setCategoryBackgroundPicker(null);
    setDrawingCategoryId(selectedCategory.id);
  }

  function handleAllSelectMenuPress() {
    if (selectedCategory.id !== 'all') {
      return;
    }

    closeDrawingMode();
    setShowCategoryTray(false);
    setCollectionOverlayDismissSignal((signal) => signal + 1);
    setCategoryMenuOpen(false);
    setColorPickerOpen(false);
    setCategoryBackgroundPicker(null);
    setAllSelectionMode(true);
    setSelectedAllSnagIds([]);
  }

  function handleToggleAllSnagSelection(snagId: string) {
    if (!allSelectionMode) {
      return;
    }

    setSelectedAllSnagIds((currentIds) => (
      currentIds.includes(snagId)
        ? currentIds.filter((id) => id !== snagId)
        : [...currentIds, snagId]
    ));
  }

  function handleOpenAllSelectionDelete() {
    if (selectedAllSnagIds.length === 0) {
      return;
    }

    setAllSelectionDeleteDialogOpen(true);
  }

  function handleConfirmAllSelectionDelete() {
    const selectedIds = selectedAllSnagIds;

    if (selectedIds.length === 0) {
      setAllSelectionDeleteDialogOpen(false);
      return;
    }

    if (stagedSnagIdRef.current && selectedIds.includes(stagedSnagIdRef.current)) {
      stagedSnagIdRef.current = null;
    }
    setStagedSnagId((currentStagedId) => (
      currentStagedId && selectedIds.includes(currentStagedId) ? null : currentStagedId
    ));
    setSnags((currentSnags) => deleteSelectedAllSnags({
      selectedSnagIds: selectedIds,
      snags: currentSnags,
    }));
    closeAllSelectionMode();
  }

  function handleRenameMenuPress() {
    if (!canEditSelectedCategory) {
      return;
    }

    setCategoryMenuOpen(false);
    setColorPickerOpen(false);
    setCategoryBackgroundPicker(null);
    setRenameValue(selectedCategory.title);
    setRenameDialogOpen(true);
  }

  function handleColorMenuPress() {
    if (!canEditSelectedCategory) {
      return;
    }

    setColorPickerOpen((isOpen) => !isOpen);
    setCategoryBackgroundPicker(null);
  }

  function handleColorSelect(color: string) {
    if (!canEditSelectedCategory) {
      return;
    }

    handleUpdateCategoryColor(selectedCategory.id, color);
    setColorPickerOpen(false);
    setCategoryMenuOpen(false);
  }

  function handleOpenCreateCategoryBackgroundPicker() {
    dismissCollectionActions();
    setShowCategoryTray(false);
    setCategoryBackgroundPicker({
      background: getCategoryBackground({ background: 'grid' }).id,
      backgroundStrength: getCategoryBackgroundStrength({}),
      mode: 'create',
    });
  }

  function handleOpenCategoryBackgroundPicker() {
    if (!canEditSelectedCategory) {
      return;
    }

    setCategoryMenuOpen(false);
    setColorPickerOpen(false);
    setRenameDialogOpen(false);
    setDeleteDialogOpen(false);
    setCategoryBackgroundPicker({
      background: getCategoryBackground(selectedCategory).id,
      backgroundStrength: getCategoryBackgroundStrength(selectedCategory),
      categoryId: selectedCategory.id,
      mode: 'edit',
    });
  }

  function handleCategoryBackgroundDraftSelect(background: SnagCategoryBackgroundOption['id']) {
    if (!categoryBackgroundPicker) {
      return;
    }

    setCategoryBackgroundPicker({
      ...categoryBackgroundPicker,
      background,
    });
  }

  function handleCategoryBackgroundStrengthChange(backgroundStrength: number) {
    if (!categoryBackgroundPicker) {
      return;
    }

    setCategoryBackgroundPicker({
      ...categoryBackgroundPicker,
      backgroundStrength: getCategoryBackgroundStrength({ backgroundStrength }),
    });
  }

  function handleCategoryBackgroundSubmit() {
    if (!categoryBackgroundPicker) {
      return;
    }

    const { background, backgroundStrength } = categoryBackgroundPicker;

    if (categoryBackgroundPicker.mode === 'create') {
      const nextCategory = createSnagCategory({
        background,
        backgroundStrength,
        index: Math.max(0, categories.length - 1),
      });

      setCategories((currentCategories) => {
        const allCategory = currentCategories.find((category) => category.id === 'all');
        const editableCategories = currentCategories.filter((category) => category.id !== 'all');

        return allCategory
          ? [...editableCategories, nextCategory, allCategory]
          : [...editableCategories, nextCategory];
      });
      captureCategoryIdRef.current = nextCategory.id;
      setSelectedCategoryId(nextCategory.id);
      requestCategorySnap();
    } else {
      setCategories((currentCategories) => (
        updateSnagCategoryBackgroundStrength({
          categories: updateSnagCategoryBackground({
            background,
            categories: currentCategories,
            categoryId: categoryBackgroundPicker.categoryId,
          }),
          categoryId: categoryBackgroundPicker.categoryId,
          strength: backgroundStrength,
        })
      ));
    }

    setCategoryBackgroundPicker(null);
    setShowCategoryTray(false);
  }

  function handleDeleteMenuPress() {
    if (!canEditSelectedCategory) {
      return;
    }

    setCategoryMenuOpen(false);
    setColorPickerOpen(false);
    setCategoryBackgroundPicker(null);
    setDeleteDialogOpen(true);
  }

  function handleRenameSubmit() {
    if (canEditSelectedCategory) {
      handleRenameCategory(selectedCategory.id, renameValue);
    }

    setRenameDialogOpen(false);
  }

  function handleDeleteConfirm() {
    if (canEditSelectedCategory) {
      handleDeleteCategory(selectedCategory.id);
    }

    closeCategoryActions();
  }

  function handleOpenSettings() {
    closeDrawingMode();
    closeAllSelectionMode();
    setShowCategoryTray(false);
    dismissCollectionActions();
    setBoardMembersOpen(false);
    setProfileNameDraft(getSettingsProfileNameDraft(settings.profileName));
    setSettingsOpen(true);
  }

  function handleCloseSettings() {
    setSettingsOpen(false);
  }

  function handleSubmitProfileName() {
    const nextProfileName = normalizeProfileDisplayName(profileNameDraft);
    const nextBoardRooms = updateBoardMemberDisplayName({
      displayName: nextProfileName,
      memberId: currentBoardMemberId,
      rooms: boardRooms,
    });

    Keyboard.dismiss();
    setProfileNameDraft(getSettingsProfileNameDraft(nextProfileName));
    setSettings((currentSettings) => ({
      ...currentSettings,
      profileName: nextProfileName,
    }));
    setSocialProfile((currentProfile) => (
      currentProfile
        ? { ...currentProfile, displayName: nextProfileName }
        : currentProfile
    ));

    if (nextBoardRooms !== boardRooms) {
      setBoardRooms(nextBoardRooms);
      cacheSocialBoardSnapshot({
        drawingsByRoomId: drawingsByBoardRoomId,
        rooms: nextBoardRooms,
        snagsByRoomId: boardSnagsByRoomIdRef.current,
      });
    }

    if (socialClient && socialProfile?.cloudEnabled) {
      void updateSocialProfileDisplayNameAsync({
        client: socialClient,
        displayName: nextProfileName,
        profileId: socialProfile.id,
      })
        .then((updatedProfile) => {
          setSocialProfile((currentProfile) => (
            currentProfile?.id === updatedProfile.id
              ? updatedProfile
              : currentProfile
          ));
        })
        .catch((error) => {
          console.warn('Could not update social profile name', error);
        });
    }
  }

  function isCategoryGridVisible(categoryId: string) {
    return categoryGridPreferences[categoryId] !== false;
  }

  function handleToggleCategoryGrid() {
    const categoryId = selectedCategory.id;

    setCategoryGridPreferences((currentPreferences) => ({
      ...currentPreferences,
      [categoryId]: !isCategoryGridVisible(categoryId),
    }));
  }

  function handleOpenCollection() {
    closeCategoryActions();
    setBoardMembersOpen(false);
    setCollectionOverlayDismissSignal((signal) => signal + 1);
    if (mode === 'collection') {
      closeDrawingMode();
      setShowCategoryTray((isVisible) => !isVisible);
      return;
    }

    setShowCategoryTray(false);
    setMode('collection');
  }

  function handleSwipeBoardToAll() {
    closeBoardActions();
    setBoardMembersOpen(false);
    closeDrawingMode();
    setShowCategoryTray(false);
    captureCategoryIdRef.current = 'all';
    setSelectedCategoryId('all');
    requestCategorySnap('instant');
    setMode('collection');
  }

  function handleAddCategory() {
    handleOpenCreateCategoryBackgroundPicker();
  }

  function handleSelectCategory(categoryId: string) {
    closeAllSelectionMode();
    closeDrawingMode();
    dismissCollectionActions();
    setBoardMembersOpen(false);
    captureCategoryIdRef.current = categoryId;
    setSelectedCategoryId(categoryId);
    requestCategorySnap();
    setShowCategoryTray(false);
    setMode('collection');
  }

  function handleCategoryPageSettled(categoryId: string) {
    if (categoryId === selectedCategoryId) {
      return;
    }

    captureCategoryIdRef.current = categoryId;
    setSelectedCategoryId(categoryId);
  }

  function handleRenameCategory(categoryId: string, nextTitle: string) {
    setCategories((currentCategories) => renameSnagCategory({
      categories: currentCategories,
      categoryId,
      title: nextTitle,
    }));
  }

  function handleUpdateCategoryColor(categoryId: string, color: string) {
    setCategories((currentCategories) => updateSnagCategoryColor({
      categories: currentCategories,
      categoryId,
      color,
    }));
  }

  function handleDeleteCategory(categoryId: string) {
    const nextLibrary = deleteSnagCategory({
      categories,
      categoryId,
      selectedCategoryId,
      snags,
    });

    setCategories(nextLibrary.categories);
    setDrawingsByCategoryId((currentDrawings) => {
      const nextDrawings = { ...currentDrawings };
      delete nextDrawings[categoryId];
      return nextDrawings;
    });
    setCategoryGridPreferences((currentPreferences) => {
      const nextPreferences = { ...currentPreferences };
      delete nextPreferences[categoryId];
      return nextPreferences;
    });
    setSnags(nextLibrary.snags);
    captureCategoryIdRef.current = nextLibrary.selectedCategoryId;
    setSelectedCategoryId(nextLibrary.selectedCategoryId);
    requestCategorySnap();
  }

  function handleOpenCameraFlow() {
    closeDrawingMode();
    closeAllSelectionMode();
    dismissCollectionActions();
    setBoardMembersOpen(false);
    setShowCategoryTray(false);
    captureCategoryIdRef.current = selectedCategoryId;
    setCameraFlowOpen(true);
  }

  function handleOpenBoard() {
    if (mode === 'board' && selectedBoardRoom) {
      closeDrawingMode();
      closeAllSelectionMode();
      closeBoardActions();
      setShowCategoryTray(false);
      setBoardMembersOpen((isOpen) => !isOpen);
      return;
    }

    closeDrawingMode();
    closeAllSelectionMode();
    dismissCollectionActions();
    setShowCategoryTray(false);
    setBoardMembersOpen(false);
    setMode('board');
  }

  function handleSwipeAllToBoard() {
    closeDrawingMode();
    closeAllSelectionMode();
    dismissCollectionActions();
    closeCategoryActions();
    setShowCategoryTray(false);
    setBoardMembersOpen(false);
    setSelectedBoardRoomId(null);
    setMode('board');
  }

  function handleDrawingStrokeComplete(categoryId: string, stroke: SnagDrawingStroke) {
    if (categoryId === 'all') {
      return;
    }

    setDrawingsByCategoryId((currentDrawings) => ({
      ...currentDrawings,
      [categoryId]: [...(currentDrawings[categoryId] ?? []), stroke],
    }));
  }

  function handleDrawingUndo(categoryId: string) {
    setDrawingsByCategoryId((currentDrawings) => ({
      ...currentDrawings,
      [categoryId]: (currentDrawings[categoryId] ?? []).slice(0, -1),
    }));
  }

  function handleDrawingClear(categoryId: string) {
    setDrawingsByCategoryId((currentDrawings) => ({
      ...currentDrawings,
      [categoryId]: [],
    }));
  }

  function handleBoardDrawingStrokeComplete(roomId: string, stroke: SnagDrawingStroke) {
    const layerIndex = drawingsByBoardRoomId[roomId]?.length ?? 0;

    setDrawingsByBoardRoomId((currentDrawings) => addBoardDrawingStroke({
      drawingsByRoomId: currentDrawings,
      roomId,
      stroke,
    }));
    void addSocialBoardDrawingStrokeAsync({
      client: activeSocialClient,
      currentMemberId: currentBoardMemberId,
      layerIndex,
      roomId,
      stroke,
    }).catch((error) => {
      console.warn('Could not sync board drawing stroke', error);
    });
  }

  function handleBoardDrawingUndo(roomId: string) {
    const lastStroke = drawingsByBoardRoomId[roomId]?.at(-1);

    setDrawingsByBoardRoomId((currentDrawings) => undoBoardDrawingStroke({
      drawingsByRoomId: currentDrawings,
      roomId,
    }));

    if (lastStroke) {
      void deleteSocialBoardDrawingStrokeAsync({
        client: activeSocialClient,
        roomId,
        strokeId: lastStroke.id,
      }).catch((error) => {
        console.warn('Could not sync board drawing undo', error);
      });
    }
  }

  function handleBoardDrawingClear(roomId: string) {
    setDrawingsByBoardRoomId((currentDrawings) => clearBoardDrawingStrokes({
      drawingsByRoomId: currentDrawings,
      roomId,
    }));
    void clearSocialBoardDrawingStrokesAsync({
      client: activeSocialClient,
      roomId,
    }).catch((error) => {
      console.warn('Could not sync board drawing clear', error);
    });
  }

  function handleDrawingColorSelect(color: string) {
    setDrawingStrokeColor(color);
    void Haptics.selectionAsync().catch((error) => {
      console.warn('Could not play drawing color haptic', error);
    });
  }

  function handleBoardBadgePress() {
    closeCategoryActions();
    setBoardMembersOpen(false);
    if (shouldCloseBoardDrawingForBoardMenu({
      drawingRoomId: drawingBoardRoomId,
      roomId: selectedBoardRoom?.id ?? null,
    })) {
      setDrawingBoardRoomId(null);
    }
    setBoardRenameDialogOpen(false);
    setBoardColorPickerOpen(false);
    setBoardDeleteDialogOpen(false);
    setBoardLeaveDialogOpen(false);
    setBoardMenuOpen((isOpen) => !isOpen);
  }

  function handleBoardColorMenuPress() {
    if (!selectedBoardRoom) {
      return;
    }

    setBoardMembersOpen(false);
    setBoardColorPickerOpen((isOpen) => !isOpen);
  }

  function handleBoardColorSelect(color: string) {
    if (!selectedBoardRoom) {
      return;
    }

    setBoardRooms((currentRooms) => updateBoardRoomColor({
      color,
      roomId: selectedBoardRoom.id,
      rooms: currentRooms,
    }));
    void updateSocialBoardColorAsync({
      client: activeSocialClient,
      color,
      roomId: selectedBoardRoom.id,
    }).catch((error) => {
      console.warn('Could not sync board color', error);
    });
    setBoardColorPickerOpen(false);
    setBoardMenuOpen(false);
  }

  function handleBoardDrawMenuPress() {
    if (!selectedBoardRoom) {
      return;
    }

    setBoardMembersOpen(false);
    setDrawingCategoryId(null);
    setDrawingBoardRoomId((currentRoomId) => (
      currentRoomId === selectedBoardRoom.id ? null : selectedBoardRoom.id
    ));
    setBoardMenuOpen(false);
    setBoardColorPickerOpen(false);
    setBoardRenameDialogOpen(false);
    setBoardDeleteDialogOpen(false);
    setBoardLeaveDialogOpen(false);
  }

  function handleOpenBoardRename() {
    if (!selectedBoardRoom) {
      return;
    }

    setBoardMembersOpen(false);
    setBoardRenameValue(selectedBoardRoom.title);
    setBoardMenuOpen(false);
    setBoardColorPickerOpen(false);
    setBoardLeaveDialogOpen(false);
    setBoardRenameDialogOpen(true);
  }

  function handleOpenBoardDelete() {
    if (!selectedBoardRoom || !canDeleteBoardRoom({ currentMemberId: currentBoardMemberId, room: selectedBoardRoom })) {
      return;
    }

    setBoardMembersOpen(false);
    setBoardMenuOpen(false);
    setBoardColorPickerOpen(false);
    setBoardRenameDialogOpen(false);
    setBoardLeaveDialogOpen(false);
    setBoardDeleteDialogOpen(true);
  }

  function handleOpenBoardLeave() {
    if (!selectedBoardRoom || !canLeaveBoardRoom({ currentMemberId: currentBoardMemberId, room: selectedBoardRoom })) {
      return;
    }

    setBoardMembersOpen(false);
    setBoardMenuOpen(false);
    setBoardColorPickerOpen(false);
    setBoardRenameDialogOpen(false);
    setBoardDeleteDialogOpen(false);
    setBoardLeaveDialogOpen(true);
  }

  function handleSubmitBoardRename() {
    if (!selectedBoardRoom) {
      return;
    }

    setBoardRooms((currentRooms) => renameBoardRoom({
      roomId: selectedBoardRoom.id,
      rooms: currentRooms,
      title: boardRenameValue,
    }));
    void renameSocialBoardRoomAsync({
      client: activeSocialClient,
      roomId: selectedBoardRoom.id,
      title: boardRenameValue,
    }).catch((error) => {
      console.warn('Could not sync board rename', error);
    });
    setBoardRenameDialogOpen(false);
  }

  function handleDeleteSelectedBoard() {
    if (!selectedBoardRoom || !canDeleteBoardRoom({ currentMemberId: currentBoardMemberId, room: selectedBoardRoom })) {
      return;
    }

    const nextState = deleteBoardRoom({
      currentMemberId: currentBoardMemberId,
      roomId: selectedBoardRoom.id,
      rooms: boardRooms,
      selectedRoomId: selectedBoardRoomId,
    });

    setBoardRooms(nextState.rooms);
    setSelectedBoardRoomId(nextState.selectedRoomId);
    setBoardSnagsByRoomId((currentBoards) => {
      const nextBoards = { ...currentBoards };

      delete nextBoards[selectedBoardRoom.id];
      return nextBoards;
    });
    setDrawingsByBoardRoomId((currentDrawings) => {
      const nextDrawings = { ...currentDrawings };

      delete nextDrawings[selectedBoardRoom.id];
      return nextDrawings;
    });
    setDrawingBoardRoomId((currentRoomId) => (
      currentRoomId === selectedBoardRoom.id ? null : currentRoomId
    ));
    setBoardLeaveDialogOpen(false);
    setBoardMembersOpen(false);
    closeBoardActions();
    setMode('board');
    void deleteSocialBoardRoomAsync({
      client: activeSocialClient,
      roomId: selectedBoardRoom.id,
    }).catch((error) => {
      console.warn('Could not sync board delete', error);
    });
  }

  function handleLeaveSelectedBoard() {
    if (!selectedBoardRoom) {
      return;
    }

    const nextState = leaveBoardRoom({
      memberId: currentBoardMemberId,
      roomId: selectedBoardRoom.id,
      rooms: boardRooms,
      selectedRoomId: selectedBoardRoomId,
    });

    setBoardRooms(nextState.rooms);
    setSelectedBoardRoomId(nextState.selectedRoomId);
    setBoardSnagsByRoomId((currentBoards) => {
      const nextBoards = { ...currentBoards };

      delete nextBoards[selectedBoardRoom.id];
      return nextBoards;
    });
    setDrawingsByBoardRoomId((currentDrawings) => {
      const nextDrawings = { ...currentDrawings };

      delete nextDrawings[selectedBoardRoom.id];
      return nextDrawings;
    });
    setDrawingBoardRoomId((currentRoomId) => (
      currentRoomId === selectedBoardRoom.id ? null : currentRoomId
    ));
    setBoardLeaveDialogOpen(false);
    setBoardMembersOpen(false);
    closeBoardActions();
    setMode('board');
    void leaveSocialBoardRoomAsync({
      client: activeSocialClient,
      currentMemberId: currentBoardMemberId,
      room: selectedBoardRoom,
    }).catch((error) => {
      console.warn('Could not sync board leave', error);
    });
  }

  function handleMakeBoardMemberOwner(memberId: string) {
    if (!selectedBoardRoom || !canManageBoardMember({
      actorMemberId: currentBoardMemberId,
      room: selectedBoardRoom,
      targetMemberId: memberId,
    })) {
      return;
    }

    const nextRoom = transferBoardRoomOwnership({
      actorMemberId: currentBoardMemberId,
      room: selectedBoardRoom,
      targetMemberId: memberId,
    });

    setBoardRooms((currentRooms) => currentRooms.map((room) => (
      room.id === nextRoom.id ? nextRoom : room
    )));
    setBoardMenuOpen(false);
    setBoardMembersOpen(false);
    void transferSocialBoardOwnerAsync({
      client: activeSocialClient,
      currentMemberId: currentBoardMemberId,
      roomId: selectedBoardRoom.id,
      targetMemberId: memberId,
    }).catch((error) => {
      console.warn('Could not sync board owner transfer', error);
    });
  }

  function handleOpenBoardMemberKick(memberId: string, memberLabel: string) {
    if (!selectedBoardRoom || !canManageBoardMember({
      actorMemberId: currentBoardMemberId,
      room: selectedBoardRoom,
      targetMemberId: memberId,
    })) {
      return;
    }

    setBoardMenuOpen(false);
    setBoardKickTarget({
      id: memberId,
      label: memberLabel,
    });
  }

  function handleOpenBoardMemberReport(memberId: string, memberLabel: string) {
    if (!selectedBoardRoom || !canOpenBoardMemberSafetyMenu({
      currentMemberId: currentBoardMemberId,
      targetMemberId: memberId,
    })) {
      return;
    }

    setBoardMenuOpen(false);
    setBoardReportTarget({
      id: memberId,
      label: memberLabel,
    });
  }

  function handleKickBoardMember() {
    if (!selectedBoardRoom || !boardKickTarget || !canManageBoardMember({
      actorMemberId: currentBoardMemberId,
      room: selectedBoardRoom,
      targetMemberId: boardKickTarget.id,
    })) {
      setBoardKickTarget(null);
      return;
    }

    const nextRoom = getBoardRoomAfterMemberKick({
      actorMemberId: currentBoardMemberId,
      room: selectedBoardRoom,
      targetMemberId: boardKickTarget.id,
    });

    setBoardRooms((currentRooms) => currentRooms.map((room) => (
      room.id === nextRoom.id ? nextRoom : room
    )));
    setBoardKickTarget(null);
    setBoardMembersOpen(false);
    void kickSocialBoardMemberAsync({
      client: activeSocialClient,
      currentMemberId: currentBoardMemberId,
      roomId: selectedBoardRoom.id,
      targetMemberId: boardKickTarget.id,
    }).catch((error) => {
      console.warn('Could not sync board member kick', error);
    });
  }

  function handleReportBoardMember() {
    if (!selectedBoardRoom || !boardReportTarget) {
      setBoardReportTarget(null);
      return;
    }

    setBoardReportTarget(null);
    setBoardMembersOpen(false);
    void reportSocialBoardMemberAsync({
      client: activeSocialClient,
      currentMemberId: currentBoardMemberId,
      roomId: selectedBoardRoom.id,
      targetMemberId: boardReportTarget.id,
    }).catch((error) => {
      console.warn('Could not sync board member report', error);
    });
  }

  function handleBackToBoardLobby() {
    closeDrawingMode();
    setBoardMembersOpen(false);
    setSelectedBoardRoomId(null);
    closeBoardActions();
    setMode('board');
  }

  function openBoardRoomWithLoading(roomId: string) {
    setBoardMembersOpen(false);
    closeBoardActions();
    setSelectedBoardRoomId(null);
    setEnteringBoardRoomId(roomId);
    setMode('board');
  }

  async function handleCreateBoardRoom({
    openRoom = true,
  }: {
    openRoom?: boolean;
  } = {}): Promise<BoardRoom | null> {
    if (!boardLimitState.canCreateRoom) {
      return null;
    }

    let nextRoom: BoardRoom;

    try {
      nextRoom = await createSocialBoardRoomAsync({
        client: activeSocialClient,
        currentMemberId: currentBoardMemberId,
        index: boardRoomCount,
      });
    } catch (error) {
      console.warn('Could not create cloud board room', error);
      return null;
    }

    setBoardRooms((currentRooms) => [...currentRooms, nextRoom]);
    setBoardRoomCount((count) => count + 1);

    if (openRoom) {
      setBoardMembersOpen(false);
      setSelectedBoardRoomId(nextRoom.id);
      setMode('board');
    }

    return nextRoom;
  }

  async function handleJoinBoardRoom(inviteCode: string): Promise<boolean> {
    if (!boardLimitState.canJoinRoom) {
      return false;
    }

    let nextRoom: BoardRoom | null = null;

    try {
      nextRoom = await joinSocialBoardRoomAsync({
        client: activeSocialClient,
        currentMemberId: currentBoardMemberId,
        index: boardRoomCount,
        inviteCode,
      });
    } catch (error) {
      console.warn('Could not join cloud board room', error);
      return false;
    }

    if (!nextRoom) {
      return false;
    }

    const existingRoom = boardRooms.find((room) => room.id === nextRoom.id);

    if (existingRoom) {
      openBoardRoomWithLoading(existingRoom.id);
      return true;
    }

    if (activeSocialClient) {
      try {
        const snapshot = await loadJoinedSocialBoardsAsync({
          client: activeSocialClient,
          currentMemberId: currentBoardMemberId,
        });
        const mergedSnapshot = mergeSocialBoardSnapshotWithLocalCache({
          cloudSnapshot: snapshot,
          localCache: cachedSocialBoardSnapshotRef.current,
        });

        applySocialBoardSnapshot(mergedSnapshot);
        cacheSocialBoardSnapshot(mergedSnapshot);
      } catch (error) {
        console.warn('Could not load joined board before entering', error);
        setBoardRooms((currentRooms) => [...currentRooms, nextRoom]);
        setBoardRoomCount((count) => count + 1);
      }
    } else {
      setBoardRooms((currentRooms) => [...currentRooms, nextRoom]);
      setBoardRoomCount((count) => count + 1);
    }

    openBoardRoomWithLoading(nextRoom.id);
    return true;
  }

  function handleSelectBoardRoom(roomId: string) {
    openBoardRoomWithLoading(roomId);
  }

  function handleCloseCameraFlow() {
    dismissCollectionActions();
    setCameraFlowOpen(false);
    setMode('collection');
  }

  function handleCompleteCapture(asset?: CompletedSnagAsset) {
    if (!asset?.uri) {
      handleCloseCameraFlow();
      return;
    }

    handleSnag(asset);
  }

  const collectionSurfaceAnimatedStyle = {
    transform: [{
      translateX: surfaceProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -width],
      }),
    }],
  };
  const boardSurfaceAnimatedStyle = {
    transform: [{
      translateX: surfaceProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [width, 0],
      }),
    }],
  };

  return (
    <View style={styles.screen}>
      {cameraFlowOpen ? (
        <CaptureFlow
          onClose={handleCloseCameraFlow}
          onComplete={handleCompleteCapture}
        />
      ) : (
      <>
        {libraryReady && (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.brandLockup}>
            <Wordmark fontFamily={brandFont} inverted={settingsOpen} onPress={settingsOpen ? handleCloseSettings : handleOpenSettings} progress={burst} />
          </View>
          {!settingsOpen && mode === 'collection' && collectionSurfaceReady && (
            <CategoryHeaderControl
              allSelectionMode={allSelectionMode}
              canEdit={canEditSelectedCategory}
              category={selectedCategory}
              colorPickerOpen={colorPickerOpen}
              drawingActive={drawingCategoryId === selectedCategory.id}
              gridVisible={isCategoryGridVisible(selectedCategory.id)}
              menuOpen={categoryMenuOpen}
              onBadgePress={handleCategoryBadgePress}
              onBackgroundPress={handleOpenCategoryBackgroundPicker}
              onColorPress={handleColorMenuPress}
              onColorSelect={handleColorSelect}
              onDeletePress={handleDeleteMenuPress}
              onDeleteSelectedAllPress={handleOpenAllSelectionDelete}
              onDrawPress={handleDrawMenuPress}
              onGridPress={handleToggleCategoryGrid}
              onRenamePress={handleRenameMenuPress}
              onSelectAllPress={handleAllSelectMenuPress}
              onTextPress={handleOpenCategoryTextDialog}
              selectedAllCount={selectedAllSnagIds.length}
            />
          )}
          {!settingsOpen && mode === 'board' && selectedBoardRoom && (
            <BoardHeaderControl
              canLeave={canLeaveBoardRoom({ currentMemberId: currentBoardMemberId, room: selectedBoardRoom })}
              colorPickerOpen={boardColorPickerOpen}
              drawingActive={drawingBoardRoomId === selectedBoardRoom.id}
              menuOpen={boardMenuOpen}
              canDelete={canDeleteBoardRoom({ currentMemberId: currentBoardMemberId, room: selectedBoardRoom })}
              onBackPress={handleBackToBoardLobby}
              onBadgePress={handleBoardBadgePress}
              onColorPress={handleBoardColorMenuPress}
              onColorSelect={handleBoardColorSelect}
              onDeletePress={handleOpenBoardDelete}
              onDrawPress={handleBoardDrawMenuPress}
              onLeavePress={handleOpenBoardLeave}
              onRenamePress={handleOpenBoardRename}
              onTextPress={handleOpenBoardTextDialog}
              room={selectedBoardRoom}
            />
          )}
        </View>

        <View style={styles.content}>
          <Animated.View
            pointerEvents={mode === 'collection' ? 'auto' : 'none'}
            style={[
              styles.surfaceLayer,
              mode === 'collection' ? styles.surfaceLayerActive : styles.surfaceLayerInactive,
              collectionSurfaceAnimatedStyle,
            ]}>
            {collectionSurfaceReady && (
            <CollectionView
              allSelectionMode={allSelectionMode}
              brandFont={brandFont}
              categories={categories}
              categoryGridPreferences={categoryGridPreferences}
              categorySnapRequest={categorySnapRequest}
              drawingCategoryId={drawingCategoryId}
              drawingStrokeColor={drawingStrokeColor}
              drawingsByCategoryId={drawingsByCategoryId}
              onDeleteComplete={handleSnagDeleteComplete}
              onDeleteSnag={handleDeleteSnag}
              onDrawingStrokeComplete={handleDrawingStrokeComplete}
              onToggleAllSelection={handleToggleAllSnagSelection}
              onBackgroundTap={() => {
                setShowCategoryTray(false);
                closeCategoryActions();
              }}
              onPasteSnag={handlePasteSnag}
              onSnagBringToFront={handleSnagBringToFront}
              onSnagInteractionStart={settleStagedSnag}
              onSnagTransformEnd={handleSnagTransformEnd}
              onTextSnagEditRequest={handleOpenCollectionTextEdit}
              onCategoryPageSettled={handleCategoryPageSettled}
              onInitialPageReady={handleCollectionInitialPageReady}
              onOpenCamera={handleOpenCameraFlow}
              onSurfaceSwipeCancel={cancelSurfaceTransition}
              onSurfaceSwipeProgress={previewSurfaceTransition}
              onSwipeToBoard={handleSwipeAllToBoard}
              onTransientActionStart={() => {
                setShowCategoryTray(false);
                closeCategoryActions();
              }}
              onTrashDragChange={setTrashDragState}
              overlayDismissSignal={collectionOverlayDismissSignal}
              selectedAllSnagIds={selectedAllSnagIds}
              selectedCategoryId={selectedCategoryId}
              snags={snags}
              stagedSnagId={stagedSnagId}
            />
            )}
          </Animated.View>

          <Animated.View
            pointerEvents={mode === 'board' ? 'auto' : 'none'}
            style={[
              styles.surfaceLayer,
              mode === 'board' ? styles.surfaceLayerActive : styles.surfaceLayerInactive,
              boardSurfaceAnimatedStyle,
            ]}>
            <BoardView
              key={selectedBoardRoom?.id ?? 'board-lobby'}
              brandFont={brandFont}
              boardLimitState={boardLimitState}
              drawingRoomId={drawingBoardRoomId}
              drawingStrokeColor={drawingStrokeColor}
              drawingsByRoomId={drawingsByBoardRoomId}
              onDeleteComplete={handleBoardSnagDeleteComplete}
              onDeleteSnag={handleDeleteBoardSnag}
              onDrawingStrokeComplete={handleBoardDrawingStrokeComplete}
              onPasteSnag={handlePasteBoardSnag}
              onSelectRoom={handleSelectBoardRoom}
              onSnagBringToFront={handleBoardSnagBringToFront}
              onSnagTransformEnd={handleBoardSnagTransformEnd}
              onTextSnagEditRequest={handleOpenBoardTextEdit}
              onSurfaceSwipeCancel={cancelSurfaceTransition}
              onSurfaceSwipeProgress={previewSurfaceTransition}
              onSwipeToCollection={handleSwipeBoardToAll}
              onTransientActionStart={() => {
                closeBoardActions();
                setBoardMembersOpen(false);
              }}
              onTrashDragChange={setTrashDragState}
              onCreateRoom={handleCreateBoardRoom}
              onJoinRoom={handleJoinBoardRoom}
              room={selectedBoardRoom}
              rooms={boardRooms}
              snagLimitCopy={snagLimitCopy}
              snags={selectedBoardSnags}
            />
          </Animated.View>

          {mode === 'camera' && (
            <View pointerEvents="auto" style={styles.surfaceLayer}>
              <CameraCanvas
                canvasWidth={canvasWidth}
                snags={snags}
              />
            </View>
          )}
        </View>

        {settingsOpen && (
          <SettingsOverlay
            onChangeProfileName={(name) => setProfileNameDraft(name.slice(0, 16))}
            onClose={handleCloseSettings}
            onSubmitProfileName={handleSubmitProfileName}
            profileName={getProfileDisplayName(settings)}
            profileNameDraft={profileNameDraft}
          />
        )}

        {textSnagDialog && (
          <TextSnagDialog
            fontFamily={brandFont}
            onCancel={handleCancelTextSnagDialog}
            onChangeText={(value) => setTextSnagDraft(value.slice(0, 42))}
            onSubmit={handleSubmitTextSnag}
            value={textSnagDraft}
          />
        )}

        {mode === 'collection' && categoryBackgroundPicker && (
          <CategoryBackgroundPicker
            backgroundStrength={categoryBackgroundPicker.backgroundStrength}
            currentBackground={getCategoryBackground({ background: categoryBackgroundPicker.background })}
            onCancel={() => setCategoryBackgroundPicker(null)}
            onBackgroundSelect={handleCategoryBackgroundDraftSelect}
            onStrengthChange={handleCategoryBackgroundStrengthChange}
            onSubmit={handleCategoryBackgroundSubmit}
            submitLabel={categoryBackgroundPicker.mode === 'create' ? 'Create' : 'Done'}
          />
        )}

        {renameDialogOpen && (
          <CategoryRenameDialog
            onCancel={() => setRenameDialogOpen(false)}
            onChangeText={setRenameValue}
            onSubmit={handleRenameSubmit}
            value={renameValue}
          />
        )}
        {deleteDialogOpen && (
          <CategoryDeleteDialog
            categoryTitle={selectedCategory.title}
            onCancel={() => setDeleteDialogOpen(false)}
            onConfirm={handleDeleteConfirm}
          />
        )}
        {allSelectionDeleteDialogOpen && (
          <AllSelectionDeleteDialog
            count={selectedAllSnagIds.length}
            onCancel={() => setAllSelectionDeleteDialogOpen(false)}
            onConfirm={handleConfirmAllSelectionDelete}
          />
        )}
        {boardRenameDialogOpen && (
          <BoardRenameDialog
            onCancel={() => setBoardRenameDialogOpen(false)}
            onChangeText={setBoardRenameValue}
            onSubmit={handleSubmitBoardRename}
            value={boardRenameValue}
          />
        )}
        {boardDeleteDialogOpen && selectedBoardRoom && (
          <BoardDeleteDialog
            boardTitle={selectedBoardRoom.title}
            onCancel={() => setBoardDeleteDialogOpen(false)}
            onConfirm={handleDeleteSelectedBoard}
          />
        )}
        {boardLeaveDialogOpen && selectedBoardRoom && (
          <BoardLeaveDialog
            boardTitle={selectedBoardRoom.title}
            onCancel={() => setBoardLeaveDialogOpen(false)}
            onConfirm={handleLeaveSelectedBoard}
          />
        )}
        {boardKickTarget && (
          <BoardKickMemberDialog
            memberLabel={boardKickTarget.label}
            onCancel={() => setBoardKickTarget(null)}
            onConfirm={handleKickBoardMember}
          />
        )}
        {boardReportTarget && (
          <BoardReportMemberDialog
            memberLabel={boardReportTarget.label}
            onCancel={() => setBoardReportTarget(null)}
            onConfirm={handleReportBoardMember}
          />
        )}
        {mode === 'board' && selectedBoardRoom && boardMembersOpen && (
          <BoardMembersTray
            currentMemberId={currentBoardMemberId}
            localProfileName={getProfileDisplayName(settings)}
            onKickMember={handleOpenBoardMemberKick}
            onMakeOwner={handleMakeBoardMemberOwner}
            onReportMember={handleOpenBoardMemberReport}
            room={selectedBoardRoom}
          />
        )}
        {mode === 'board' && enteringBoardRoom && (
          <BoardEntryLoadingScreen
            currentMemberId={currentBoardMemberId}
            fontFamily={brandFont}
            localProfileName={getProfileDisplayName(settings)}
            room={enteringBoardRoom}
          />
        )}

        <View style={styles.bottomDock}>
          <DockPopLayer variant={drawingCategoryId ? `drawing-${drawingCategoryId}` : drawingBoardRoomId ? `board-drawing-${drawingBoardRoomId}` : 'main'}>
            {drawingCategoryId && mode === 'collection' ? (
              <DrawingDockContent
                colorOptions={DRAWING_COLOR_OPTIONS}
                onClear={() => handleDrawingClear(drawingCategoryId)}
                onColorSelect={handleDrawingColorSelect}
                onDone={closeDrawingMode}
                onUndo={() => handleDrawingUndo(drawingCategoryId)}
                selectedColor={drawingStrokeColor}
              />
            ) : drawingBoardRoomId && mode === 'board' ? (
              <DrawingDockContent
                colorOptions={DRAWING_COLOR_OPTIONS}
                onClear={() => handleBoardDrawingClear(drawingBoardRoomId)}
                onColorSelect={handleDrawingColorSelect}
                onDone={closeDrawingMode}
                onUndo={() => handleBoardDrawingUndo(drawingBoardRoomId)}
                selectedColor={drawingStrokeColor}
              />
            ) : (
              <>
                <CollectionDockButton
                  active={mode === 'collection'}
                  onPress={handleOpenCollection}
                />
                <DockButton
                  active={mode === 'camera' || trashDragState.armedId !== null}
                  accessibilityLabel={trashDragState.draggingId ? 'Delete snag' : 'Open camera'}
                  iconSize={trashDragState.draggingId ? 30 : 31}
                  iosName={
                    trashDragState.draggingId
                      ? trashDragState.armedId
                        ? 'trash.fill'
                        : 'trash'
                      : 'camera.fill'
                  }
                  style={styles.dockButtonCenter}
                  tone={trashDragState.draggingId ? 'trash' : 'default'}
                  onPress={trashDragState.draggingId ? () => {} : handleOpenCameraFlow}
                />
                <SocialDockButton
                  active={mode === 'board'}
                  memberTrayOpen={boardMembersOpen}
                  onPress={handleOpenBoard}
                  roomOpen={mode === 'board' && Boolean(selectedBoardRoom)}
                />
              </>
            )}
          </DockPopLayer>
        </View>

        {mode === 'collection' && showCategoryTray && (
          <Pressable
            accessibilityLabel="Dismiss category tray"
            onPress={() => setShowCategoryTray(false)}
            style={styles.categoryDismissLayer}
          />
        )}

        {mode === 'collection' && showCategoryTray && (
          <CategoryTray
            categories={categories}
            onAddCategory={handleAddCategory}
            onSelectCategory={handleSelectCategory}
            selectedCategoryId={selectedCategoryId}
          />
        )}

      </SafeAreaView>
        )}
        {appLoading && (
          <AppLoadingScreen fontFamily={brandFont} />
        )}
      </>
      )}
    </View>
  );
}

function CategoryTray({
  categories,
  onAddCategory,
  onSelectCategory,
  selectedCategoryId,
}: {
  categories: SnagCategoryItem[];
  onAddCategory: () => void;
  onSelectCategory: (categoryId: string) => void;
  selectedCategoryId: string;
}) {
  const [entrance] = useState(() => new Animated.Value(0));
  const opacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const scale = entrance.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.92, 1.04, 1],
  });
  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View style={[styles.categoryTrayShell, { opacity, transform: [{ translateY }, { scale }] }]}>
    <GlassSurface interactive style={styles.categoryTray}>
      {categories.map((category) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Show ${category.title}`}
          key={category.id}
          onPress={() => onSelectCategory(category.id)}
          style={({ pressed }) => [
            styles.categoryTrayPill,
            category.color ? { backgroundColor: category.color } : null,
            category.id === selectedCategoryId && styles.categoryTrayPillActive,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.categoryTrayText} numberOfLines={1}>{category.title}</Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add category"
        onPress={onAddCategory}
        style={({ pressed }) => [styles.categoryAddButton, pressed && styles.pressed]}>
        <SymbolView name={symbolName('plus')} size={18} tintColor={INK} />
      </Pressable>
    </GlassSurface>
    </Animated.View>
  );
}

function BoardMembersTray({
  currentMemberId,
  localProfileName,
  onKickMember,
  onMakeOwner,
  onReportMember,
  room,
}: {
  currentMemberId: string;
  localProfileName: string;
  onKickMember: (memberId: string, memberLabel: string) => void;
  onMakeOwner: (memberId: string) => void;
  onReportMember: (memberId: string, memberLabel: string) => void;
  room: BoardRoom;
}) {
  const [entrance] = useState(() => new Animated.Value(0));
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const members = getBoardMemberList({ currentMemberId, localProfileName, room });
  const opacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const scale = entrance.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.9, 1.05, 1],
  });
  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: 6,
      tension: 190,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.boardMembersTrayShell, { opacity, transform: [{ translateY }, { scale }] }]}>
      <GlassSurface interactive style={styles.boardMembersTray}>
        {members.map((member) => {
          const canManage = canManageBoardMember({
            actorMemberId: currentMemberId,
            room,
            targetMemberId: member.id,
          });
          const canOpenSafety = canOpenBoardMemberSafetyMenu({
            currentMemberId,
            targetMemberId: member.id,
          });
          const actionMenuOpen = activeMemberId === member.id && canOpenSafety;

          return (
            <View key={member.id}>
                <Pressable
                  accessibilityRole="button"
                accessibilityLabel={canOpenSafety ? 'Member actions' : member.label}
                disabled={!canOpenSafety}
                onPress={() => setActiveMemberId((currentId) => (currentId === member.id ? null : member.id))}
                style={({ pressed }) => [
                  styles.boardMemberRow,
                  member.isCurrentMember && styles.boardMemberRowCurrent,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.boardMemberAvatar}>
                  <SymbolView
                    name={symbolName(member.isCurrentMember ? 'person.crop.circle.fill' : 'person.fill')}
                    size={22}
                    tintColor={INK}
                  />
                </View>
                <View style={styles.boardMemberTextStack}>
                  <Text style={styles.boardMemberName} numberOfLines={1}>{member.label}</Text>
                  <Text style={styles.boardMemberRole} numberOfLines={1}>
                    {member.role}
                  </Text>
                </View>
                {canOpenSafety && (
                  <SymbolView name={symbolName('ellipsis')} size={16} tintColor="rgba(23, 23, 23, 0.42)" weight="bold" />
                )}
              </Pressable>
              {actionMenuOpen && (
                <View style={styles.boardMemberActionMenu}>
                  {canManage && (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Make Owner"
                        onPress={() => {
                          setActiveMemberId(null);
                          onMakeOwner(member.id);
                        }}
                        style={({ pressed }) => [styles.boardMemberActionButton, pressed && styles.pressed]}>
                        <Text style={styles.boardMemberActionText}>Make Owner</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Kick"
                        onPress={() => {
                          setActiveMemberId(null);
                          onKickMember(member.id, member.label);
                        }}
                        style={({ pressed }) => [styles.boardMemberActionButton, styles.boardMemberActionButtonDanger, pressed && styles.pressed]}>
                        <Text style={[styles.boardMemberActionText, styles.boardMemberActionTextDanger]}>Kick</Text>
                      </Pressable>
                    </>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Report"
                    onPress={() => {
                      setActiveMemberId(null);
                      onReportMember(member.id, member.label);
                    }}
                    style={({ pressed }) => [styles.boardMemberActionButton, canManage && styles.boardMemberActionButtonDivider, pressed && styles.pressed]}>
                    <Text style={styles.boardMemberActionText}>Report</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </GlassSurface>
    </Animated.View>
  );
}

function SettingsContactIcon({
  id,
}: {
  id: typeof SNAG_PUBLIC_LINKS[number]['id'];
}) {
  const tiktokPath = 'M13.5 2.5h3.15c.22 2.08 1.42 3.36 3.65 3.67v3.16a8.2 8.2 0 0 1-3.65-1.1v6.3a6.05 6.05 0 1 1-5.05-5.98v3.26a2.87 2.87 0 1 0 1.9 2.72V2.5Z';

  switch (id) {
    case 'email':
      return <SymbolView name={symbolName('envelope.fill')} size={19} tintColor="#EA4335" weight="semibold" />;
    case 'instagram':
      return (
        <Svg height={21} viewBox="0 0 24 24" width={21}>
          <Defs>
            <SvgLinearGradient id="instagramGradient" x1="2" x2="22" y1="22" y2="2">
              <Stop offset="0" stopColor="#FFB147" />
              <Stop offset="0.46" stopColor="#F43B69" />
              <Stop offset="1" stopColor="#7B4DFF" />
            </SvgLinearGradient>
          </Defs>
          <Path
            d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z"
            fill="none"
            stroke="url(#instagramGradient)"
            strokeWidth={2.15}
          />
          <Path
            d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z"
            fill="none"
            stroke="url(#instagramGradient)"
            strokeWidth={2.15}
          />
          <Path d="M17.5 6.5h.01" stroke="#7B4DFF" strokeLinecap="round" strokeWidth={2.6} />
        </Svg>
      );
    case 'tiktok':
      return (
        <Svg height={21} viewBox="0 0 24 24" width={21}>
          <Path d={tiktokPath} fill="#25F4EE" transform="translate(-1.2 0.85)" />
          <Path d={tiktokPath} fill="#FE2C55" transform="translate(1.2 -0.7)" />
          <Path d={tiktokPath} fill="#FFFFFF" />
        </Svg>
      );
  }
}

function SettingsOverlay({
  onChangeProfileName,
  onClose,
  onSubmitProfileName,
  profileName,
  profileNameDraft,
}: {
  onChangeProfileName: (name: string) => void;
  onClose: () => void;
  onSubmitProfileName: () => void;
  profileName: string;
  profileNameDraft: string;
}) {
  const [entrance] = useState(() => new Animated.Value(0));
  const profileNameDirty = normalizeProfileDisplayName(profileNameDraft) !== profileName;
  const opacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const panelOpacity = entrance.interpolate({
    inputRange: [0, 0.36, 1],
    outputRange: [0, 0.72, 1],
  });
  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const scale = entrance.interpolate({
    inputRange: [0, 0.74, 1],
    outputRange: [0.96, 1.015, 1],
  });

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  async function handleOpenPublicLink(link: typeof SNAG_PUBLIC_LINKS[number]) {
    const opened = await openSnagPublicLinkAsync(link.url, Linking.openURL);

    if (!opened) {
      console.warn('Could not open Snag public link');
    }
  }

  return (
    <Animated.View style={[styles.settingsOverlay, { opacity }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close settings" onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.settingsPanel, { opacity: panelOpacity, transform: [{ translateY }, { scale }] }]}>
        <View style={styles.settingsTitleRow}>
          <Text style={styles.settingsTitle}>Settings</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close settings"
            onPress={onClose}
            style={({ pressed }) => [styles.settingsCloseButton, pressed && styles.settingsPressed]}>
            <SymbolView name={symbolName('xmark')} size={18} tintColor={PAPER} weight="bold" />
          </Pressable>
        </View>

        <View style={styles.settingsSection}>
          <View style={styles.settingsInputRow}>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={16}
              onChangeText={onChangeProfileName}
              onSubmitEditing={onSubmitProfileName}
              placeholder="Set your nickname?"
              placeholderTextColor="rgba(255, 255, 255, 0.38)"
              returnKeyType="done"
              selectionColor={PAPER}
              style={styles.settingsInput}
              value={profileNameDraft}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save profile name"
              disabled={!profileNameDirty}
              onPress={onSubmitProfileName}
              style={({ pressed }) => [
                styles.settingsSaveButton,
                profileNameDirty && styles.settingsSaveButtonActive,
                pressed && styles.settingsPressed,
              ]}>
              <SymbolView
                name={symbolName('checkmark')}
                size={16}
                tintColor={profileNameDirty ? INK : 'rgba(255, 255, 255, 0.54)'}
                weight="bold"
              />
            </Pressable>
          </View>
          <Text style={styles.settingsHint}>{profileName} appears in Social rooms.</Text>
        </View>
        <View style={styles.settingsHelpSection}>
          <Text style={styles.settingsHelpTitle}>Social limits</Text>
          <Text style={styles.settingsHelpText}>
            {`Free accounts can create ${BOARD_SOCIAL_LIMITS.boardsCreatedPerMember} boards, join ${BOARD_SOCIAL_LIMITS.boardsJoinedPerMember} boards total, invite ${BOARD_SOCIAL_LIMITS.membersPerBoard} people per board, and keep ${BOARD_SOCIAL_LIMITS.snagsPerBoard} Snags on each board.`}
          </Text>
        </View>
      </Animated.View>
      <Animated.View style={[styles.settingsContactFooter, { opacity: panelOpacity, transform: [{ translateY }] }]}>
        {SNAG_PUBLIC_LINKS.map((link) => (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={link.accessibilityLabel}
            key={link.id}
            onPress={() => {
              void handleOpenPublicLink(link);
            }}
            style={({ pressed }) => [styles.settingsContactLink, pressed && styles.settingsPressed]}>
            <View style={styles.settingsContactIcon}>
              <SettingsContactIcon id={link.id} />
            </View>
            <Text ellipsizeMode="middle" numberOfLines={1} style={styles.settingsContactValue}>{link.value}</Text>
          </Pressable>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

function CategoryBackgroundPicker({
  backgroundStrength,
  currentBackground,
  onBackgroundSelect,
  onCancel,
  onStrengthChange,
  onSubmit,
  submitLabel,
}: {
  backgroundStrength: number;
  currentBackground: SnagCategoryBackgroundOption;
  onBackgroundSelect: (background: SnagCategoryBackgroundOption['id']) => void;
  onCancel: () => void;
  onStrengthChange: (backgroundStrength: number) => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <View style={styles.categoryDialogOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close backdrop picker" onPress={onCancel} style={StyleSheet.absoluteFill} />
      <GlassSurface interactive style={styles.categoryBackgroundDialog}>
        <View style={styles.categoryBackgroundHeader}>
          <Text style={styles.categoryDialogTitle}>Pick a backdrop</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close backdrop picker" onPress={onCancel} style={({ pressed }) => [styles.categoryBackgroundCloseButton, pressed && styles.pressed]}>
            <SymbolView name={symbolName('xmark')} size={13} tintColor="rgba(23, 23, 23, 0.58)" weight="bold" />
          </Pressable>
        </View>
        <View style={styles.categoryBackgroundGrid}>
          {CATEGORY_BACKGROUND_OPTIONS.map((background) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Use ${background.label} backdrop`}
              key={background.id}
              onPress={() => onBackgroundSelect(background.id)}
              style={({ pressed }) => [
                styles.categoryBackgroundOption,
                background.id === currentBackground.id && styles.categoryBackgroundOptionActive,
                pressed && styles.pressed,
              ]}>
              <View style={styles.categoryBackgroundPreview}>
                <CategoryBackdrop
                  background={background}
                  canvasHeight={58}
                  canvasWidth={88}
                  preview
                  strength={backgroundStrength}
                />
              </View>
              <Text style={styles.categoryBackgroundOptionLabel}>{background.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.categoryBackgroundStrengthRow}>
          <Text style={styles.categoryBackgroundStrengthLabel}>Line</Text>
          <BackdropStrengthSlider
            onChange={onStrengthChange}
            value={backgroundStrength}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apply backdrop"
          onPress={onSubmit}
          style={({ pressed }) => [styles.categoryBackgroundDoneButton, pressed && styles.pressed]}>
          <Text style={styles.categoryBackgroundDoneText}>{submitLabel}</Text>
        </Pressable>
      </GlassSurface>
    </View>
  );
}

function BackdropStrengthSlider({
  onChange,
  value,
}: {
  onChange: (backgroundStrength: number) => void;
  value: number;
}) {
  const min = 0.28;
  const max = 1;
  const [trackWidth, setTrackWidth] = useState(1);
  const normalizedValue = getCategoryBackgroundStrength({ backgroundStrength: value });
  const progress = Math.max(0, Math.min((normalizedValue - min) / (max - min), 1));
  const fillWidth = `${progress * 100}%` as `${number}%`;

  function updateFromX(x: number) {
    const nextProgress = Math.max(0, Math.min(x / trackWidth, 1));
    onChange(Math.round((min + (max - min) * nextProgress) * 100) / 100);
  }

  function handleTrackLayout(event: LayoutChangeEvent) {
    setTrackWidth(Math.max(event.nativeEvent.layout.width, 1));
  }

  const sliderGesture = Gesture.Pan()
    .runOnJS(true)
    .onBegin((event) => updateFromX(event.x))
    .onUpdate((event) => updateFromX(event.x));

  return (
    <GestureDetector gesture={sliderGesture}>
      <View onLayout={handleTrackLayout} style={styles.categoryBackgroundSliderHitbox}>
        <View style={styles.categoryBackgroundSliderTrack}>
          <View style={[styles.categoryBackgroundSliderFill, { width: fillWidth }]} />
          <View style={[styles.categoryBackgroundSliderThumb, { left: `${progress * 100}%` }]} />
        </View>
      </View>
    </GestureDetector>
  );
}

function CategoryHeaderControl({
  allSelectionMode,
  canEdit,
  category,
  colorPickerOpen,
  drawingActive,
  gridVisible,
  menuOpen,
  onBadgePress,
  onBackgroundPress,
  onColorPress,
  onColorSelect,
  onDeletePress,
  onDeleteSelectedAllPress,
  onDrawPress,
  onGridPress,
  onRenamePress,
  onSelectAllPress,
  onTextPress,
  selectedAllCount,
}: {
  allSelectionMode: boolean;
  canEdit: boolean;
  category: SnagCategoryItem;
  colorPickerOpen: boolean;
  drawingActive: boolean;
  gridVisible: boolean;
  menuOpen: boolean;
  onBadgePress: () => void;
  onBackgroundPress: () => void;
  onColorPress: () => void;
  onColorSelect: (color: string) => void;
  onDeletePress: () => void;
  onDeleteSelectedAllPress: () => void;
  onDrawPress: () => void;
  onGridPress: () => void;
  onRenamePress: () => void;
  onSelectAllPress: () => void;
  onTextPress: () => void;
  selectedAllCount: number;
}) {
  const isAllCategory = category.id === 'all';

  return (
    <View pointerEvents="box-none" style={styles.categoryHeaderControls}>
      <View style={styles.categoryHeaderActionRow}>
        {isAllCategory && allSelectionMode && selectedAllCount > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${selectedAllCount} selected snags`}
            onPress={onDeleteSelectedAllPress}
            style={({ pressed }) => [styles.allSelectionDeleteButton, pressed && styles.pressed]}>
            <GlassView
              colorScheme="light"
              glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.16 }}
              isInteractive
              tintColor="rgba(255, 255, 255, 0.58)"
              style={styles.allSelectionDeleteGlass}>
              <SymbolView name={symbolName('trash')} size={14} tintColor="#FF3B30" weight="bold" />
              <Text style={styles.allSelectionDeleteText}>{selectedAllCount}</Text>
            </GlassView>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isAllCategory ? 'Open All actions' : 'Edit category'}
          onPress={onBadgePress}
          style={({ pressed }) => [styles.categoryHeaderBadgeButton, pressed && styles.pressed]}>
          <GlassView
            colorScheme="light"
            glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.16 }}
            isInteractive
            tintColor="rgba(255, 255, 255, 0.58)"
            style={[
              styles.categoryHeaderBadge,
              category.color ? { backgroundColor: category.color } : null,
            ]}>
            <Text style={styles.collectionCategoryText} numberOfLines={1}>{category.title}</Text>
            <SymbolView name={symbolName(isAllCategory ? 'checkmark.circle' : 'pencil')} size={13} tintColor="rgba(23, 23, 23, 0.58)" weight="bold" />
          </GlassView>
        </Pressable>
      </View>
      {menuOpen && (
        <CategoryEditMenu
          canEdit={canEdit}
          colorPickerOpen={colorPickerOpen}
          currentColor={category.color}
          drawingActive={drawingActive}
          gridVisible={gridVisible}
          isAllCategory={isAllCategory}
          onBackgroundPress={onBackgroundPress}
          onColorPress={onColorPress}
          onColorSelect={onColorSelect}
          onDeletePress={onDeletePress}
          onDrawPress={onDrawPress}
          onGridPress={onGridPress}
          onRenamePress={onRenamePress}
          onSelectAllPress={onSelectAllPress}
          onTextPress={onTextPress}
        />
      )}
    </View>
  );
}

function CategoryEditMenu({
  canEdit,
  colorPickerOpen,
  currentColor,
  drawingActive,
  gridVisible,
  isAllCategory,
  onBackgroundPress,
  onColorPress,
  onColorSelect,
  onDeletePress,
  onDrawPress,
  onGridPress,
  onRenamePress,
  onSelectAllPress,
  onTextPress,
}: {
  canEdit: boolean;
  colorPickerOpen: boolean;
  currentColor?: string;
  drawingActive: boolean;
  gridVisible: boolean;
  isAllCategory: boolean;
  onBackgroundPress: () => void;
  onColorPress: () => void;
  onColorSelect: (color: string) => void;
  onDeletePress: () => void;
  onDrawPress: () => void;
  onGridPress: () => void;
  onRenamePress: () => void;
  onSelectAllPress: () => void;
  onTextPress: () => void;
}) {
  const [entrance] = useState(() => new Animated.Value(0));
  const opacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const scale = entrance.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.94, 1.03, 1],
  });
  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: 7,
      tension: 190,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View style={[styles.categoryEditMenuShell, { opacity, transform: [{ translateY }, { scale }] }]}>
      <GlassSurface interactive style={styles.categoryEditMenu}>
        {isAllCategory ? (
          <>
            <CategoryEditRow
              active={gridVisible}
              icon={gridVisible ? 'grid' : 'square'}
              label={gridVisible ? 'Grid On' : 'Grid Off'}
              onPress={onGridPress}
            />
            <CategoryEditRow
              icon="checkmark.circle"
              label="Select"
              onPress={onSelectAllPress}
            />
          </>
        ) : (
          <>
        <CategoryEditRow
          disabled={!canEdit}
          icon="pencil"
          label="Rename"
          onPress={onRenamePress}
        />
        <CategoryEditRow
          disabled={!canEdit}
          icon="paintpalette"
          label="Color"
          onPress={onColorPress}
        />
        {colorPickerOpen && canEdit && (
          <View style={styles.categoryColorGrid}>
            {CATEGORY_COLOR_OPTIONS.map((color) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Use category color ${color}`}
                key={color}
                onPress={() => onColorSelect(color)}
                style={({ pressed }) => [
                  styles.categoryColorSwatch,
                  { backgroundColor: color },
                  color === '#FFFFFF' && styles.categoryColorSwatchWhite,
                  color === currentColor && styles.categoryColorSwatchActive,
                  pressed && styles.pressed,
                ]}>
                {color === currentColor && (
                  <SymbolView name={symbolName('checkmark')} size={13} tintColor={INK} weight="bold" />
                )}
              </Pressable>
            ))}
          </View>
        )}
        <CategoryEditRow
          disabled={!canEdit}
          icon="square.grid.3x3"
          label="Backdrop"
          onPress={onBackgroundPress}
        />
        <CategoryEditRow
          active={gridVisible}
          icon={gridVisible ? 'grid' : 'square'}
          label={gridVisible ? 'Grid On' : 'Grid Off'}
          onPress={onGridPress}
        />
        <CategoryEditRow
          disabled={!canEdit}
          icon="textformat"
          label="Text"
          onPress={onTextPress}
        />
        <CategoryEditRow
          active={drawingActive}
          disabled={!canEdit}
          icon="pencil.tip"
          label="Draw"
          onPress={onDrawPress}
        />
        <CategoryEditRow
          destructive
          disabled={!canEdit}
          icon="trash"
          label="Delete"
          onPress={onDeletePress}
        />
          </>
        )}
      </GlassSurface>
    </Animated.View>
  );
}

function CategoryEditRow({
  active,
  destructive,
  disabled,
  icon,
  label,
  onPress,
}: {
  active?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const tintColor = destructive ? '#FF3B30' : INK;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryEditRow,
        active && styles.categoryEditRowActive,
        disabled && styles.categoryEditRowDisabled,
        pressed && styles.pressed,
      ]}>
      <SymbolView name={symbolName(icon)} size={17} tintColor={disabled ? 'rgba(23, 23, 23, 0.28)' : tintColor} />
      <Text style={[styles.categoryEditRowText, destructive && styles.categoryEditRowDestructiveText, disabled && styles.categoryEditRowTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

function TextSnagDialog({
  fontFamily,
  onCancel,
  onChangeText,
  onSubmit,
  value,
}: {
  fontFamily: string;
  onCancel: () => void;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  value: string;
}) {
  return (
    <View style={styles.categoryDialogOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close text Snag dialog" onPress={onCancel} style={StyleSheet.absoluteFill} />
      <GlassSurface interactive style={styles.categoryDialog}>
        <Text style={[styles.categoryDialogTitle, styles.textSnagDialogTitle, { fontFamily }]}>Text</Text>
        <TextInput
          autoCapitalize="sentences"
          autoCorrect
          autoFocus
          maxLength={42}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="say something"
          placeholderTextColor="rgba(23, 23, 23, 0.34)"
          returnKeyType="done"
          selectionColor={INK}
          style={[styles.categoryNameInput, styles.textSnagInput, { fontFamily }]}
          value={value}
        />
        <View style={styles.categoryDialogActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel text Snag" onPress={onCancel} style={({ pressed }) => [styles.categoryDialogButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDialogButtonText}>Cancel</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Save text Snag" onPress={onSubmit} style={({ pressed }) => [styles.categoryDialogButton, styles.categoryDialogButtonPrimary, pressed && styles.pressed]}>
            <Text style={[styles.categoryDialogButtonText, styles.categoryDialogButtonPrimaryText]}>Snag</Text>
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}

function CategoryRenameDialog({
  onCancel,
  onChangeText,
  onSubmit,
  value,
}: {
  onCancel: () => void;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  value: string;
}) {
  return (
    <View style={styles.categoryDialogOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close rename dialog" onPress={onCancel} style={StyleSheet.absoluteFill} />
      <GlassSurface interactive style={styles.categoryDialog}>
        <Text style={styles.categoryDialogTitle}>Rename category</Text>
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="New name"
          placeholderTextColor="rgba(23, 23, 23, 0.34)"
          returnKeyType="done"
          selectionColor={INK}
          style={styles.categoryNameInput}
          value={value}
        />
        <View style={styles.categoryDialogActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel rename" onPress={onCancel} style={({ pressed }) => [styles.categoryDialogButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDialogButtonText}>Cancel</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Save category name" onPress={onSubmit} style={({ pressed }) => [styles.categoryDialogButton, styles.categoryDialogButtonPrimary, pressed && styles.pressed]}>
            <Text style={[styles.categoryDialogButtonText, styles.categoryDialogButtonPrimaryText]}>Save</Text>
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}

function CategoryDeleteDialog({
  categoryTitle,
  onCancel,
  onConfirm,
}: {
  categoryTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.categoryDialogOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close delete dialog" onPress={onCancel} style={StyleSheet.absoluteFill} />
      <GlassSurface interactive style={[styles.categoryDialog, styles.categoryDeleteDialog]}>
        <Text style={[styles.categoryDialogTitle, styles.categoryDeleteTitle]}>Delete category?</Text>
        <Text style={styles.categoryDeleteCopy}>
          {categoryTitle} will disappear. Its snags move back to All.
        </Text>
        <View style={styles.categoryDialogActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Do not delete category" onPress={onCancel} style={({ pressed }) => [styles.categoryDialogButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDialogButtonText}>No</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Delete category" onPress={onConfirm} style={({ pressed }) => [styles.categoryDialogButton, styles.categoryDeleteButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDeleteButtonText}>Yes</Text>
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}

function AllSelectionDeleteDialog({
  count,
  onCancel,
  onConfirm,
}: {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.categoryDialogOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close selected snag delete dialog" onPress={onCancel} style={StyleSheet.absoluteFill} />
      <GlassSurface interactive style={[styles.categoryDialog, styles.categoryDeleteDialog]}>
        <Text style={[styles.categoryDialogTitle, styles.categoryDeleteTitle]}>
          Delete {count} Snag{count === 1 ? '' : 's'}?
        </Text>
        <Text style={styles.categoryDeleteCopy}>
          Selected Snags will disappear from All and every category they belong to.
        </Text>
        <View style={styles.categoryDialogActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Do not delete selected snags" onPress={onCancel} style={({ pressed }) => [styles.categoryDialogButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDialogButtonText}>No</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Delete selected snags" onPress={onConfirm} style={({ pressed }) => [styles.categoryDialogButton, styles.categoryDeleteButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDeleteButtonText}>Yes</Text>
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}

function BoardHeaderControl({
  canDelete,
  canLeave,
  colorPickerOpen,
  drawingActive,
  menuOpen,
  onBackPress,
  onBadgePress,
  onColorPress,
  onColorSelect,
  onDeletePress,
  onDrawPress,
  onLeavePress,
  onRenamePress,
  onTextPress,
  room,
}: {
  canDelete: boolean;
  canLeave: boolean;
  colorPickerOpen: boolean;
  drawingActive: boolean;
  menuOpen: boolean;
  onBackPress: () => void;
  onBadgePress: () => void;
  onColorPress: () => void;
  onColorSelect: (color: string) => void;
  onDeletePress: () => void;
  onDrawPress: () => void;
  onLeavePress: () => void;
  onRenamePress: () => void;
  onTextPress: () => void;
  room: BoardRoom;
}) {
  return (
    <View pointerEvents="box-none" style={styles.categoryHeaderControls}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit board"
        onPress={onBadgePress}
        style={({ pressed }) => [styles.categoryHeaderBadgeButton, pressed && styles.pressed]}>
        <GlassView
          colorScheme="light"
          glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.16 }}
          isInteractive
          tintColor="rgba(255, 255, 255, 0.58)"
          style={[
            styles.categoryHeaderBadge,
            { backgroundColor: room.color ?? BOARD_COLOR_OPTIONS[0] },
          ]}>
          <Text style={styles.collectionCategoryText} numberOfLines={1}>{room.title}</Text>
          <SymbolView name={symbolName('ellipsis')} size={15} tintColor="rgba(23, 23, 23, 0.58)" weight="bold" />
        </GlassView>
      </Pressable>
      {menuOpen && (
        <BoardEditMenu
          colorPickerOpen={colorPickerOpen}
          currentColor={room.color ?? BOARD_COLOR_OPTIONS[0]}
          canDelete={canDelete}
          canLeave={canLeave}
          onBackPress={onBackPress}
          onColorPress={onColorPress}
          onColorSelect={onColorSelect}
          onDeletePress={onDeletePress}
          onDrawPress={onDrawPress}
          onLeavePress={onLeavePress}
          onRenamePress={onRenamePress}
          onTextPress={onTextPress}
          drawingActive={drawingActive}
        />
      )}
    </View>
  );
}

function BoardEditMenu({
  canDelete,
  canLeave,
  colorPickerOpen,
  currentColor,
  drawingActive,
  onBackPress,
  onColorPress,
  onColorSelect,
  onDeletePress,
  onDrawPress,
  onLeavePress,
  onRenamePress,
  onTextPress,
}: {
  canDelete: boolean;
  canLeave: boolean;
  colorPickerOpen: boolean;
  currentColor: string;
  drawingActive: boolean;
  onBackPress: () => void;
  onColorPress: () => void;
  onColorSelect: (color: string) => void;
  onDeletePress: () => void;
  onDrawPress: () => void;
  onLeavePress: () => void;
  onRenamePress: () => void;
  onTextPress: () => void;
}) {
  const [entrance] = useState(() => new Animated.Value(0));
  const opacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const scale = entrance.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.94, 1.03, 1],
  });
  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: 7,
      tension: 190,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View style={[styles.categoryEditMenuShell, { opacity, transform: [{ translateY }, { scale }] }]}>
      <GlassSurface interactive style={styles.categoryEditMenu}>
        <CategoryEditRow
          icon="arrow.backward"
          label="Back"
          onPress={onBackPress}
        />
        <CategoryEditRow
          icon="pencil"
          label="Rename"
          onPress={onRenamePress}
        />
        <CategoryEditRow
          icon="paintpalette"
          label="Color"
          onPress={onColorPress}
        />
        {colorPickerOpen && (
          <View style={styles.categoryColorGrid}>
            {BOARD_COLOR_OPTIONS.map((color) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Use board color ${color}`}
                key={color}
                onPress={() => onColorSelect(color)}
                style={({ pressed }) => [
                  styles.categoryColorSwatch,
                  { backgroundColor: color },
                  color === '#FFFFFF' && styles.categoryColorSwatchWhite,
                  color === currentColor && styles.categoryColorSwatchActive,
                  pressed && styles.pressed,
                ]}>
                {color === currentColor && (
                  <SymbolView name={symbolName('checkmark')} size={13} tintColor={INK} weight="bold" />
                )}
              </Pressable>
            ))}
          </View>
        )}
        <CategoryEditRow
          icon="textformat"
          label="Text"
          onPress={onTextPress}
        />
        <CategoryEditRow
          active={drawingActive}
          icon="pencil.tip"
          label="Draw"
          onPress={onDrawPress}
        />
        <CategoryEditRow
          destructive
          disabled={!canLeave}
          icon="rectangle.portrait.and.arrow.right"
          label="Leave"
          onPress={onLeavePress}
        />
        {canDelete && (
          <CategoryEditRow
            destructive
            icon="trash"
            label="Delete"
            onPress={onDeletePress}
          />
        )}
      </GlassSurface>
    </Animated.View>
  );
}

function BoardRenameDialog({
  onCancel,
  onChangeText,
  onSubmit,
  value,
}: {
  onCancel: () => void;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  value: string;
}) {
  return (
    <View style={styles.categoryDialogOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close board rename dialog" onPress={onCancel} style={StyleSheet.absoluteFill} />
      <GlassSurface interactive style={styles.categoryDialog}>
        <Text style={styles.categoryDialogTitle}>Rename board</Text>
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="Board name"
          placeholderTextColor="rgba(23, 23, 23, 0.34)"
          returnKeyType="done"
          selectionColor={INK}
          style={styles.categoryNameInput}
          value={value}
        />
        <View style={styles.categoryDialogActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel board rename" onPress={onCancel} style={({ pressed }) => [styles.categoryDialogButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDialogButtonText}>Cancel</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Save board name" onPress={onSubmit} style={({ pressed }) => [styles.categoryDialogButton, styles.categoryDialogButtonPrimary, pressed && styles.pressed]}>
            <Text style={[styles.categoryDialogButtonText, styles.categoryDialogButtonPrimaryText]}>Save</Text>
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}

function BoardDeleteDialog({
  boardTitle,
  onCancel,
  onConfirm,
}: {
  boardTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.categoryDialogOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close board delete dialog" onPress={onCancel} style={StyleSheet.absoluteFill} />
      <GlassSurface interactive style={[styles.categoryDialog, styles.categoryDeleteDialog]}>
        <Text style={[styles.categoryDialogTitle, styles.categoryDeleteTitle]}>Delete board?</Text>
        <Text style={styles.categoryDeleteCopy}>
          {boardTitle} will disappear from your boards.
        </Text>
        <View style={styles.categoryDialogActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Do not delete board" onPress={onCancel} style={({ pressed }) => [styles.categoryDialogButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDialogButtonText}>No</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Delete board" onPress={onConfirm} style={({ pressed }) => [styles.categoryDialogButton, styles.categoryDeleteButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDeleteButtonText}>Yes</Text>
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}

function BoardLeaveDialog({
  boardTitle,
  onCancel,
  onConfirm,
}: {
  boardTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = getBoardLeaveConfirmationCopy({ roomTitle: boardTitle });

  return (
    <View style={styles.categoryDialogOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close board leave dialog" onPress={onCancel} style={StyleSheet.absoluteFill} />
      <GlassSurface interactive style={[styles.categoryDialog, styles.categoryDeleteDialog]}>
        <Text style={[styles.categoryDialogTitle, styles.categoryDeleteTitle]}>{copy.title}</Text>
        <Text style={styles.categoryDeleteCopy}>{copy.message}</Text>
        <View style={styles.categoryDialogActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Stay in board" onPress={onCancel} style={({ pressed }) => [styles.categoryDialogButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDialogButtonText}>{copy.cancelLabel}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Leave board" onPress={onConfirm} style={({ pressed }) => [styles.categoryDialogButton, styles.categoryDeleteButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDeleteButtonText}>{copy.confirmLabel}</Text>
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}

function BoardKickMemberDialog({
  memberLabel,
  onCancel,
  onConfirm,
}: {
  memberLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = getBoardMemberActionCopy({ memberLabel });

  return (
    <View style={styles.categoryDialogOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close board member removal dialog" onPress={onCancel} style={StyleSheet.absoluteFill} />
      <GlassSurface interactive style={[styles.categoryDialog, styles.categoryDeleteDialog]}>
        <Text style={[styles.categoryDialogTitle, styles.categoryDeleteTitle]}>{copy.title}</Text>
        <Text style={styles.categoryDeleteCopy}>{copy.message}</Text>
        <View style={styles.categoryDialogActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Keep board member" onPress={onCancel} style={({ pressed }) => [styles.categoryDialogButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDialogButtonText}>{copy.cancelLabel}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Remove board member" onPress={onConfirm} style={({ pressed }) => [styles.categoryDialogButton, styles.categoryDeleteButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDeleteButtonText}>{copy.confirmLabel}</Text>
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}

function BoardReportMemberDialog({
  memberLabel,
  onCancel,
  onConfirm,
}: {
  memberLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = getBoardMemberReportCopy({ memberLabel });

  return (
    <View style={styles.categoryDialogOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close board member report dialog" onPress={onCancel} style={StyleSheet.absoluteFill} />
      <GlassSurface interactive style={[styles.categoryDialog, styles.categoryDeleteDialog]}>
        <Text style={[styles.categoryDialogTitle, styles.categoryDeleteTitle]}>{copy.title}</Text>
        <Text style={styles.categoryDeleteCopy}>{copy.message}</Text>
        <View style={styles.categoryDialogActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel board member report" onPress={onCancel} style={({ pressed }) => [styles.categoryDialogButton, pressed && styles.pressed]}>
            <Text style={styles.categoryDialogButtonText}>{copy.cancelLabel}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Report board member" onPress={onConfirm} style={({ pressed }) => [styles.categoryDialogButton, styles.categoryDialogButtonPrimary, pressed && styles.pressed]}>
            <Text style={[styles.categoryDialogButtonText, styles.categoryDialogButtonPrimaryText]}>{copy.confirmLabel}</Text>
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}

function RefineIconButton({
  accessibilityLabel,
  active,
  disabled,
  iconSize = 22,
  iosName,
  onPress,
  variant = 'light',
}: {
  accessibilityLabel: string;
  active?: boolean;
  disabled?: boolean;
  iconSize?: number;
  iosName: string;
  onPress: () => void;
  variant?: 'light' | 'dark' | 'accent';
}) {
  const isAccent = variant === 'accent';
  const isDark = variant === 'dark' || active;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.refineGlassPressable, disabled && styles.captureDisabled, pressed && styles.capturePressed]}>
      <GlassView
        colorScheme="light"
        glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.16 }}
        isInteractive
        tintColor={isDark ? 'rgba(23, 23, 23, 0.72)' : 'rgba(255, 255, 255, 0.68)'}
        style={[styles.refineGlassButton, isDark && styles.refineGlassButtonDark, isAccent && styles.refineGlassButtonAccent]}>
        <SymbolView name={symbolName(iosName)} size={iconSize} tintColor={isDark ? '#FFFFFF' : INK} />
      </GlassView>
    </Pressable>
  );
}

function RefineSaveButton({
  disabled,
  onPress,
}: {
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Save snag"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.refineSavePressable,
        disabled && styles.captureDisabled,
        pressed && styles.capturePressed,
      ]}>
      <GlassView
        colorScheme="light"
        glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.16 }}
        isInteractive
        tintColor="rgba(255, 255, 255, 0.68)"
        style={styles.refineSaveGlass}>
        <Text style={styles.refineSaveText}>Snag</Text>
        <SymbolView name={symbolName('checkmark')} size={18} tintColor={INK} weight="bold" />
      </GlassView>
    </Pressable>
  );
}

function TransparencyGrid() {
  const [gridSize, setGridSize] = useState({ height: 0, width: 0 });
  const cells = useMemo(
    () =>
      getCheckerboardCells({
        cellSize: CHECKER_CELL_SIZE,
        height: gridSize.height,
        width: gridSize.width,
      }),
    [gridSize.height, gridSize.width],
  );

  return (
    <View
      onLayout={(event) => {
        setGridSize({
          height: event.nativeEvent.layout.height,
          width: event.nativeEvent.layout.width,
        });
      }}
      pointerEvents="none"
      style={styles.refineGrid}>
      {cells.map((cell) => (
        <View
          key={cell.id}
          style={[
            styles.refineGridCell,
            {
              height: CHECKER_CELL_SIZE,
              left: cell.x,
              top: cell.y,
              width: CHECKER_CELL_SIZE,
            },
            cell.isAlt && styles.refineGridCellAlt,
          ]}
        />
      ))}
    </View>
  );
}

function BrushSizeSlider({
  max = 30,
  min = 6,
  onChange,
  value,
}: {
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const [trackWidth, setTrackWidth] = useState(1);
  const progress = Math.max(0, Math.min((value - min) / (max - min), 1));
  const fillWidth = `${progress * 100}%` as `${number}%`;

  function updateFromX(x: number) {
    onChange(getBrushSliderValue({
      max,
      min,
      trackWidth,
      x,
    }));
  }

  function handleTrackLayout(event: LayoutChangeEvent) {
    setTrackWidth(Math.max(event.nativeEvent.layout.width, 1));
  }

  const sliderGesture = Gesture.Pan()
    .runOnJS(true)
    .onBegin((event) => updateFromX(event.x))
    .onUpdate((event) => updateFromX(event.x));

  return (
    <GlassView
      colorScheme="light"
      glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.18 }}
      isInteractive
      tintColor="rgba(255, 255, 255, 0.66)"
      style={styles.brushSliderGlass}>
      <View style={styles.brushSliderWrap}>
        <View style={styles.brushSliderPreview}>
          <View style={[styles.brushSliderSizeDot, { height: value, width: value, borderRadius: value / 2 }]} />
        </View>
        <GestureDetector gesture={sliderGesture}>
          <View onLayout={handleTrackLayout} style={styles.brushSliderHitbox}>
            <View style={styles.brushSliderTrack}>
              <View style={[styles.brushSliderFill, { width: fillWidth }]} />
              <View style={[styles.brushSliderThumb, { left: `${progress * 100}%` }]} />
            </View>
          </View>
        </GestureDetector>
      </View>
    </GlassView>
  );
}

function CaptureFlow({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (asset?: CompletedSnagAsset) => void;
}) {
  const cameraRef = useRef<CameraView | null>(null);
  const processingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cutoutNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraPinch = useRef({ distance: 0, zoom: 0 });
  const cameraZoomRef = useRef(0);
  const cameraPermissionRequestStarted = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(Platform.OS !== 'web');
  const [cameraMountError, setCameraMountError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(0);
  const [stage, setStage] = useState<CaptureStage>('live');
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [capturedAsset, setCapturedAsset] = useState<CapturedAsset | null>(null);
  const [autoCutout, setAutoCutout] = useState(true);
  const [cutoutSupported, setCutoutSupported] = useState<boolean | null>(null);
  const [cutoutNotice, setCutoutNotice] = useState('');
  const [brushSize, setBrushSize] = useState(10);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSavingRefine, setIsSavingRefine] = useState(false);
  const [manualMaskPoints, setManualMaskPoints] = useState<ManualCutoutMaskPoint[]>([]);
  const [editMode, setEditMode] = useState<ManualCutoutInteractionMode>('erase');
  const [undoRevision, setUndoRevision] = useState(0);

  function updateCameraZoom(nextZoom: number | ((currentZoom: number) => number)) {
    setCameraZoom((currentZoom) => {
      const resolvedZoom = typeof nextZoom === 'function' ? nextZoom(currentZoom) : nextZoom;
      cameraZoomRef.current = resolvedZoom;
      return resolvedZoom;
    });
  }

  useEffect(() => {
    let mounted = true;

    if (Platform.OS !== 'web') {
      return () => {
        mounted = false;
        if (processingTimer.current) {
          clearTimeout(processingTimer.current);
        }
        if (cutoutNoticeTimer.current) {
          clearTimeout(cutoutNoticeTimer.current);
        }
      };
    }

    CameraView.isAvailableAsync()
      .then((isAvailable) => {
        if (mounted) {
          setCameraAvailable(isAvailable);
        }
      })
      .catch(() => {
        if (mounted) {
          setCameraAvailable(false);
        }
      });

    return () => {
      mounted = false;
      if (processingTimer.current) {
        clearTimeout(processingTimer.current);
      }
      if (cutoutNoticeTimer.current) {
        clearTimeout(cutoutNoticeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      stage !== 'live' ||
      permission === null ||
      permission.granted ||
      permission.canAskAgain === false ||
      cameraPermissionRequestStarted.current
    ) {
      return;
    }

    cameraPermissionRequestStarted.current = true;
    void requestPermission();
  }, [permission, requestPermission, stage]);

  useEffect(() => {
    let mounted = true;

    isSnagCutoutSupportedAsync().then((isSupported) => {
      if (mounted) {
        setCutoutSupported(isSupported);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function ensureCutoutSupport() {
    if (cutoutSupported !== null) {
      return cutoutSupported;
    }

    const isSupported = await isSnagCutoutSupportedAsync();
    setCutoutSupported(isSupported);
    return isSupported;
  }

  function clearCutoutNoticeTimer() {
    if (cutoutNoticeTimer.current) {
      clearTimeout(cutoutNoticeTimer.current);
      cutoutNoticeTimer.current = null;
    }
  }

  function clearCutoutNotice() {
    clearCutoutNoticeTimer();
    setCutoutNotice('');
  }

  function showCutoutNotice(message: string) {
    clearCutoutNoticeTimer();
    setCutoutNotice(message);
    cutoutNoticeTimer.current = setTimeout(() => {
      setCutoutNotice('');
      cutoutNoticeTimer.current = null;
    }, getCutoutNoticeDurationMs());
  }

  const handleMaskPointsChange = useCallback((points: ManualCutoutMaskPoint[]) => {
    setManualMaskPoints(points);
  }, []);

  function getTouchDistance(event: GestureResponderEvent) {
    const touches = event.nativeEvent.touches;
    if (touches.length < 2) {
      return 0;
    }

    const [firstTouch, secondTouch] = touches;
    return Math.hypot(firstTouch.pageX - secondTouch.pageX, firstTouch.pageY - secondTouch.pageY);
  }

  function handleCameraTouchStart(event: GestureResponderEvent) {
    if (event.nativeEvent.touches.length >= 2) {
      cameraPinch.current = {
        distance: getTouchDistance(event),
        zoom: cameraZoomRef.current,
      };
    }
  }

  function handleCameraTouchMove(event: GestureResponderEvent) {
    if (event.nativeEvent.touches.length < 2) {
      return;
    }

    if (cameraPinch.current.distance <= 0) {
      cameraPinch.current = {
        distance: getTouchDistance(event),
        zoom: cameraZoomRef.current,
      };
      return;
    }

    const targetZoom = getZoomFromPinch(
      cameraPinch.current.zoom,
      cameraPinch.current.distance,
      getTouchDistance(event),
    );
    updateCameraZoom((currentZoom) => smoothCameraZoom(currentZoom, targetZoom));
  }

  function handleCameraTouchEnd() {
    cameraPinch.current = {
      distance: 0,
      zoom: cameraZoomRef.current,
    };
  }

  async function startProcessing(asset: CapturedAsset) {
    setCapturedAsset(asset);
    clearCutoutNotice();
    setManualMaskPoints([]);
    setEditMode('erase');
    setStage('processing');
    if (processingTimer.current) {
      clearTimeout(processingTimer.current);
    }

    if (!asset.uri) {
      processingTimer.current = setTimeout(() => {
        setStage('refine');
      }, 850);
      return;
    }

    try {
      const result = await cutoutImageAsync(asset.uri);
      setCapturedAsset({
        ...asset,
        height: result.height,
        uri: result.uri,
        width: result.width,
      });
    } catch {
      showCutoutNotice(getCutoutFailureNotice());
    } finally {
      setStage('refine');
    }
  }

  async function handleCapturedAsset(asset: CapturedAsset) {
    setCapturedAsset(asset);
    clearCutoutNotice();
    setManualMaskPoints([]);
    setEditMode('erase');

    const hasImageUri = Boolean(asset.uri);
    const isSupported = hasImageUri ? await ensureCutoutSupport() : true;
    const route = getCaptureCutoutRoute({
      autoCutoutEnabled: autoCutout,
      hasImageUri,
      isCutoutSupported: isSupported,
    });

    if (route === 'none') {
      return;
    }

    if (route === 'manual') {
      handleManualCutout(autoCutout && hasImageUri && !isSupported ? getCutoutUnsupportedNotice() : '');
      return;
    }

    await startProcessing(asset);
  }

  function handleManualCutout(nextNotice = '') {
    if (nextNotice) {
      showCutoutNotice(nextNotice);
    } else {
      clearCutoutNotice();
    }
    setManualMaskPoints([]);
    setEditMode('erase');
    setStage('refine');
  }

  async function handleSaveRefinedSnag() {
    if (isSavingRefine) {
      return;
    }

    if (!capturedAsset?.uri) {
      return;
    }

    setIsSavingRefine(true);
    try {
      await waitForNextFrame();
      const result = manualMaskPoints.length > 0
        ? await applyManualCutoutAsync(capturedAsset.uri, manualMaskPoints)
        : capturedAsset;
      const completedUri = result.uri ?? capturedAsset.uri;

      await Image.prefetch(completedUri, 'memory-disk').catch(() => false);
      await waitForNextFrame();
      onComplete({
        height: result.height ?? capturedAsset.height,
        uri: completedUri,
        width: result.width ?? capturedAsset.width,
      });
    } catch {
      showCutoutNotice('Manual erase could not save. Try again.');
    } finally {
      setIsSavingRefine(false);
    }
  }

  async function handleTakePhoto() {
    if (isCapturing) {
      return;
    }

    setIsCapturing(true);
    try {
      if (cameraAvailable === false) {
        return;
      }

      if (!permission?.granted) {
        const nextPermission = await requestPermission();
        if (!nextPermission.granted) {
          return;
        }
      }

      if (!cameraAvailable || !cameraRef.current || !cameraReady) {
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        shutterSound: false,
        skipProcessing: false,
      });
      await handleCapturedAsset({
        height: photo.height,
        source: 'camera',
        uri: photo.uri,
        width: photo.width,
      });
    } finally {
      setIsCapturing(false);
    }
  }

  async function handleRequestCameraPermission() {
    if (isCapturing) {
      return;
    }

    setIsCapturing(true);
    try {
      const nextPermission = await requestPermission();
      if (nextPermission.granted) {
        setCameraAvailable(Platform.OS !== 'web' ? true : cameraAvailable);
        setCameraReady(false);
      }
    } finally {
      setIsCapturing(false);
    }
  }

  function openCameraSettings() {
    void Linking.openSettings().catch(() => undefined);
  }

  async function handlePickImage() {
    if (isCapturing) {
      return;
    }

    setIsCapturing(true);
    try {
      const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
      if (!libraryPermission.granted) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: false,
        mediaTypes: ['images'],
        quality: 0.92,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      await handleCapturedAsset({
        height: asset.height,
        source: 'library',
        uri: asset.uri,
        width: asset.width,
      });
    } finally {
      setIsCapturing(false);
    }
  }

  function resetToCamera() {
    setCapturedAsset(null);
    setBrushSize(10);
    setCameraMountError('');
    updateCameraZoom(0);
    setManualMaskPoints([]);
    setIsSavingRefine(false);
    clearCutoutNotice();
    setIsCapturing(false);
    setEditMode('erase');
    setUndoRevision(0);
    setStage('live');
  }

  const fallbackTitle = cameraAvailable === false ? 'Camera preview unavailable' : 'Snag camera';
  const fallbackMessage =
    cameraAvailable === false
      ? cameraMountError || 'Choose a photo from your library to keep testing here.'
      : permission === null
        ? 'Preparing camera...'
        : permission.granted === false
          ? permission.canAskAgain === false
            ? 'Camera access is off. Open Settings and allow Camera for Snag.'
            : 'Allow Camera so Snag can capture what you want to collect.'
          : 'Camera is not available right now.';
  const cameraPermissionActionLabel = permission?.granted || permission === null || cameraAvailable === false
    ? ''
    : permission?.canAskAgain === false ? 'Open settings' : 'Allow camera';

  const processingPresentation = getCaptureProcessingPresentation({
    hasImageUri: Boolean(capturedAsset?.uri),
  });
  const autoCutoutBadge = autoCutout ? getAutoCutoutBadge(true) : null;
  const captureFlash = getCameraCaptureFlashMode({ facing, flash });

  return (
    <SafeAreaView style={styles.captureRoot}>
      {stage === 'live' && (
        <View style={styles.captureLive}>
          <View
            onTouchCancel={handleCameraTouchEnd}
            onTouchEnd={handleCameraTouchEnd}
            onTouchMove={handleCameraTouchMove}
            onTouchStart={handleCameraTouchStart}
            style={styles.cameraPreviewFrame}>
            {permission?.granted && cameraAvailable !== false ? (
              <CameraView
                animateShutter={false}
                key={facing}
                facing={facing}
                flash={captureFlash}
                mirror={facing === 'front'}
                mode="picture"
                onCameraReady={() => setCameraReady(true)}
                onMountError={(event) => {
                  setCameraMountError(event.message);
                  setCameraAvailable(false);
                }}
                ref={cameraRef}
                style={styles.cameraPreview}
                zoom={cameraZoom}
              />
            ) : (
              <View style={styles.cameraFallback}>
                <View style={styles.cameraFallbackOrb}>
                  <SymbolView name={symbolName('camera.fill')} size={36} tintColor="#FFFFFF" />
                </View>
                <Text style={styles.cameraFallbackTitle}>{fallbackTitle}</Text>
                <Text style={styles.cameraFallbackText}>{fallbackMessage}</Text>
                {!!cameraPermissionActionLabel && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={cameraPermissionActionLabel}
                    disabled={isCapturing}
                    onPress={permission?.canAskAgain === false ? openCameraSettings : handleRequestCameraPermission}
                    style={({ pressed }) => [
                      styles.cameraPermissionButton,
                      isCapturing && styles.captureDisabled,
                      pressed && styles.capturePressed,
                    ]}>
                    <Text style={styles.cameraPermissionButtonText}>{cameraPermissionActionLabel}</Text>
                  </Pressable>
                )}
              </View>
            )}
            {cameraZoom > 0.02 && (
              <View pointerEvents="none" style={styles.cameraZoomPill}>
                <Text style={styles.cameraZoomText}>{(1 + cameraZoom * 4).toFixed(1)}x</Text>
              </View>
            )}
          </View>

          <View style={styles.captureTopBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close camera"
              onPress={onClose}
              style={({ pressed }) => [styles.captureIconButton, pressed && styles.capturePressed]}>
              <SymbolView name={symbolName('xmark')} size={23} tintColor="#FFFFFF" />
            </Pressable>

            <View style={styles.captureTopActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Flash ${flash}`}
                onPress={() => setFlash((current) => getNextFlashMode(current))}
                style={({ pressed }) => [
                  styles.captureIconButton,
                  pressed && styles.capturePressed,
                ]}>
                <SymbolView name={symbolName(getFlashSymbol(flash))} size={22} tintColor="#FFFFFF" />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={autoCutout ? 'Auto cutout on' : 'Auto cutout off'}
                accessibilityState={{ selected: autoCutout }}
                onPress={() => setAutoCutout((enabled) => !enabled)}
                style={({ pressed }) => [
                  styles.captureIconButton,
                  pressed && styles.capturePressed,
                ]}>
                <View style={styles.autoCutoutIconWrap}>
                  <SymbolView name={symbolName(getAutoCutoutSymbol(autoCutout))} size={23} tintColor="#FFFFFF" />
                  {autoCutoutBadge && (
                    <View style={styles.autoCutoutBadge}>
                      <Text style={styles.autoCutoutBadgeText}>{autoCutoutBadge}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </View>
          </View>

          <View style={styles.captureBottomBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose from gallery"
              disabled={isCapturing}
              onPress={handlePickImage}
              style={({ pressed }) => [styles.galleryButton, isCapturing && styles.captureDisabled, pressed && styles.capturePressed]}>
              <SymbolView name={symbolName('photo')} size={26} tintColor="#FFFFFF" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              disabled={isCapturing || !cameraReady}
              onPress={handleTakePhoto}
              style={({ pressed }) => [
                styles.shutterButton,
                (isCapturing || !cameraReady) && styles.captureDisabled,
                pressed && styles.shutterButtonPressed,
              ]}>
              <View style={styles.shutterInner} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch camera"
              disabled={isCapturing}
              onPress={() => {
                setCameraReady(false);
                updateCameraZoom(0);
                setFacing((current) => (current === 'back' ? 'front' : 'back'));
              }}
              style={({ pressed }) => [styles.galleryButton, isCapturing && styles.captureDisabled, pressed && styles.capturePressed]}>
              <SymbolView name={symbolName('arrow.triangle.2.circlepath.camera')} size={27} tintColor="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}

      {stage === 'processing' && (
        <View style={styles.processingScreen}>
          {processingPresentation.showCapturedFrame && capturedAsset?.uri && (
            <Image
              cachePolicy="memory-disk"
              contentFit="cover"
              source={{ uri: capturedAsset.uri }}
              style={styles.processingImage}
              transition={0}
            />
          )}
        </View>
      )}

      {stage === 'refine' && (
        <View style={styles.refineScreen}>
          <View style={styles.refineTopBar}>
            <RefineIconButton
              accessibilityLabel="Retake photo"
              iosName="arrow.counterclockwise"
              onPress={resetToCamera}
            />
            <RefineSaveButton
              disabled={isSavingRefine}
              onPress={handleSaveRefinedSnag}
            />
          </View>

          <View style={styles.refineStage}>
            <TransparencyGrid />
            {!!cutoutNotice && (
              <View style={styles.cutoutNotice}>
                <Text style={styles.cutoutNoticeText}>{cutoutNotice}</Text>
              </View>
            )}
            <View style={styles.cutoutShadow}>
              <EditableCutout
                brushSize={brushSize}
                imageHeight={capturedAsset?.height}
                imageWidth={capturedAsset?.width}
                key={capturedAsset?.uri ?? 'cutout'}
                interactionMode={editMode}
                onMaskPointsChange={handleMaskPointsChange}
                undoRevision={undoRevision}
                uri={capturedAsset?.uri}
              />
            </View>
          </View>

          <View style={styles.refineToolbar}>
            <RefineIconButton
              accessibilityLabel="Undo last refine stroke"
              iconSize={21}
              iosName="arrow.uturn.backward"
              onPress={() => setUndoRevision((revision) => revision + 1)}
            />
            <BrushSizeSlider value={brushSize} onChange={setBrushSize} />
            <RefineIconButton
              accessibilityLabel={editMode === 'erase' ? 'Erase mode' : 'Move mode'}
              iconSize={24}
              iosName={editMode === 'erase' ? 'eraser' : 'hand.draw'}
              onPress={() => setEditMode((mode) => (mode === 'erase' ? 'move' : 'erase'))}
              variant="dark"
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function CameraCanvas({
  canvasWidth,
  snags,
}: {
  canvasWidth: number;
  snags: SnagItem[];
}) {
  return (
    <View style={styles.cameraFrame}>
      <ScrollView
        horizontal
        bounces
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.worldCanvas, { width: canvasWidth }]}>
        {snags.map((item) => (
          <StickerView key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

function CollectionView({
  allSelectionMode,
  brandFont,
  categories,
  categoryGridPreferences,
  categorySnapRequest,
  drawingCategoryId,
  drawingStrokeColor,
  drawingsByCategoryId,
  onDeleteComplete,
  onDeleteSnag,
  onBackgroundTap,
  onDrawingStrokeComplete,
  onToggleAllSelection,
  onPasteSnag,
  onSnagBringToFront,
  onSnagInteractionStart,
  onSnagTransformEnd,
  onTextSnagEditRequest,
  onCategoryPageSettled,
  onInitialPageReady,
  onOpenCamera,
  onSurfaceSwipeCancel,
  onSurfaceSwipeProgress,
  onSwipeToBoard,
  onTransientActionStart,
  onTrashDragChange,
  overlayDismissSignal,
  selectedAllSnagIds,
  selectedCategoryId,
  snags,
  stagedSnagId,
}: {
  allSelectionMode: boolean;
  brandFont: string;
  categories: SnagCategoryItem[];
  categoryGridPreferences: Record<string, boolean>;
  categorySnapRequest: {
    id: number;
    reason: CategorySnapReason;
  };
  drawingCategoryId: string | null;
  drawingStrokeColor: string;
  drawingsByCategoryId: Record<string, SnagDrawingStroke[]>;
  onDeleteComplete: (snagId: string) => void;
  onDeleteSnag: (snagId: string) => void;
  onBackgroundTap: () => void;
  onDrawingStrokeComplete: (categoryId: string, stroke: SnagDrawingStroke) => void;
  onToggleAllSelection: (snagId: string) => void;
  onPasteSnag: (request: PasteSnagRequest) => void;
  onSnagBringToFront: (id: string) => void;
  onSnagInteractionStart: (id: string) => void;
  onSnagTransformEnd: (id: string, transform: SnagTransformPatch) => void;
  onTextSnagEditRequest: (snagId: string) => void;
  onCategoryPageSettled: (categoryId: string) => void;
  onInitialPageReady: () => void;
  onOpenCamera: () => void;
  onSurfaceSwipeCancel: () => void;
  onSurfaceSwipeProgress: (progress: number) => void;
  onSwipeToBoard: () => void;
  onTransientActionStart: () => void;
  onTrashDragChange: (state: TrashDragState) => void;
  overlayDismissSignal: number;
  selectedAllSnagIds: string[];
  selectedCategoryId: string;
  snags: SnagItem[];
  stagedSnagId: string | null;
}) {
  const { height, width } = useWindowDimensions();
  const verticalPagerRef = useRef<ScrollView | null>(null);
  const initialPageReadyRef = useRef(false);
  const categoryScrollStateRef = useRef<{
    categoryId: string;
    pageHeight: number;
    request: number;
    y: number;
  } | null>(null);
  const categorySnapGuardRef = useRef<{
    expiresAt: number;
    targetY: number;
  } | null>(null);
  const ignoreBoardPressRef = useRef(false);
  const ignoreNextBoardTapRef = useRef(false);
  const trashStateRef = useRef<TrashDragState>({ armedId: null, draggingId: null });
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const [horizontalScrollOffsets, setHorizontalScrollOffsets] = useState<Record<string, number>>({});
  const [pasteAnchor, setPasteAnchor] = useState<{
    categoryId: string;
    x: number;
    y: number;
  } | null>(null);
  const [copyAnchor, setCopyAnchor] = useState<CopySnagRequest | null>(null);
  const [textEditAnchor, setTextEditAnchor] = useState<CopySnagRequest | null>(null);
  const [lastCopiedSnagId, setLastCopiedSnagId] = useState<string | null>(null);
  const [surfaceSwipeLocked, setSurfaceSwipeLocked] = useState(false);
  const [trashState, setTrashState] = useState<TrashDragState>({
    armedId: null,
    draggingId: null,
  });
  const boardWidth = Math.max(width * 2.35, 920);
  const boardPasteLongPressConfig = getBoardPasteLongPressConfig();
  const actionOverlayConfig = getCollectionActionOverlayConfig();
  const fallbackBoardHeight = Math.max(height - 190, 540);
  const boardHeight = getCollectionViewportHeight({
    fallbackHeight: fallbackBoardHeight,
    measuredHeight,
  });
  const firstCollectionCategoryId = categories.find((item) => !isAllCollectionAutoArranged({ categoryId: item.id }))?.id;
  const [initialCategoryPageOffset] = useState(() => (
    getCategoryPageOffset({
      categories,
      categoryId: selectedCategoryId,
      pageHeight: boardHeight,
    })
  ));
  const allSwipeResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => getSurfaceSwipeStartTarget({
      currentSurface: 'collection',
      disabled: Boolean(drawingCategoryId) || allSelectionMode || trashState.draggingId !== null,
      selectedCategoryId,
      translationX: gestureState.dx,
      translationY: gestureState.dy,
    }) === 'board',
    onMoveShouldSetPanResponderCapture: (_, gestureState) => getSurfaceSwipeStartTarget({
      currentSurface: 'collection',
      disabled: Boolean(drawingCategoryId) || allSelectionMode || trashState.draggingId !== null,
      selectedCategoryId,
      translationX: gestureState.dx,
      translationY: gestureState.dy,
    }) === 'board',
    onPanResponderGrant: () => {
      setSurfaceSwipeLocked(true);
      onTransientActionStart();
    },
    onPanResponderMove: (_, gestureState) => {
      onSurfaceSwipeProgress(getSurfaceSwipeProgress({
        direction: 'all-to-board',
        translationX: gestureState.dx,
        width,
      }));
    },
    onPanResponderRelease: (_, gestureState) => {
      if (getSurfaceSwipeCompletionTarget({
        currentSurface: 'collection',
        selectedCategoryId,
        translationX: gestureState.dx,
        velocityX: gestureState.vx,
        width,
      }) !== 'board') {
        setSurfaceSwipeLocked(false);
        onSurfaceSwipeCancel();
        return;
      }

      setSurfaceSwipeLocked(false);
      onSwipeToBoard();
    },
    onPanResponderTerminate: () => {
      setSurfaceSwipeLocked(false);
      onSurfaceSwipeCancel();
    },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [
    allSelectionMode,
    drawingCategoryId,
    onSurfaceSwipeCancel,
    onSurfaceSwipeProgress,
    onSwipeToBoard,
    onTransientActionStart,
    selectedCategoryId,
    trashState.draggingId,
    width,
  ]);

  useEffect(() => {
    if (measuredHeight <= 0) {
      return;
    }

    const lastScrollState = categoryScrollStateRef.current;
    const hasExplicitRequest = !lastScrollState || lastScrollState.request !== categorySnapRequest.id;
    const reason = getCategorySnapReason({
      hasExplicitRequest,
      requestedReason: categorySnapRequest.reason,
    });
    const command = getCategorySnapCommand({
      categories,
      categoryId: selectedCategoryId,
      pageHeight: boardHeight,
      reason,
      stagedSnagId,
    });

    if (!command) {
      return;
    }

    const targetChanged = !lastScrollState ||
      lastScrollState.categoryId !== selectedCategoryId ||
      Math.abs(lastScrollState.pageHeight - boardHeight) >= 1 ||
      Math.abs(lastScrollState.y - command.y) >= 1;

    if (!hasExplicitRequest && !targetChanged) {
      return;
    }

    if (hasExplicitRequest) {
      categorySnapGuardRef.current = {
        expiresAt: Date.now() + 1300,
        targetY: command.y,
      };
    }

    let readyFrame: number | null = null;
    const frame = requestAnimationFrame(() => {
      verticalPagerRef.current?.scrollTo(command);
      categoryScrollStateRef.current = {
        categoryId: selectedCategoryId,
        pageHeight: boardHeight,
        request: categorySnapRequest.id,
        y: command.y,
      };

      if (!initialPageReadyRef.current) {
        readyFrame = requestAnimationFrame(() => {
          initialPageReadyRef.current = true;
          onInitialPageReady();
        });
      }
    });

    return () => {
      cancelAnimationFrame(frame);
      if (readyFrame !== null) {
        cancelAnimationFrame(readyFrame);
      }
    };
  }, [
    boardHeight,
    categories,
    categorySnapRequest.id,
    categorySnapRequest.reason,
    measuredHeight,
    onInitialPageReady,
    selectedCategoryId,
    stagedSnagId,
  ]);

  useEffect(() => {
    if (overlayDismissSignal <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setCopyAnchor(null);
      setPasteAnchor(null);
    }, 0);

    return () => clearTimeout(timeout);
  }, [overlayDismissSignal]);

  useEffect(() => {
    if (!pasteAnchor) {
      return;
    }

    const timeout = setTimeout(() => {
      setPasteAnchor(null);
    }, actionOverlayConfig.autoDismissMs);

    return () => clearTimeout(timeout);
  }, [actionOverlayConfig.autoDismissMs, pasteAnchor]);

  useEffect(() => {
    if (!copyAnchor) {
      return;
    }

    const timeout = setTimeout(() => {
      setCopyAnchor(null);
    }, actionOverlayConfig.autoDismissMs);

    return () => clearTimeout(timeout);
  }, [actionOverlayConfig.autoDismissMs, copyAnchor]);

  useEffect(() => {
    if (!textEditAnchor) {
      return;
    }

    const timeout = setTimeout(() => {
      setTextEditAnchor(null);
    }, actionOverlayConfig.autoDismissMs);

    return () => clearTimeout(timeout);
  }, [actionOverlayConfig.autoDismissMs, textEditAnchor]);

  function clearActionAnchors() {
    setCopyAnchor(null);
    setPasteAnchor(null);
    setTextEditAnchor(null);
  }

  function clearTransientActions() {
    clearActionAnchors();
  }

  function handleDrawingStart() {
    suppressBoardPress(900);
    clearTransientActions();
    onTransientActionStart();
  }

  function handleCategoryMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!shouldHandleCategoryPagerScrollEvent({
      currentTarget: event.currentTarget,
      target: event.target,
    })) {
      return;
    }

    const offsetY = event.nativeEvent?.contentOffset?.y;

    if (typeof offsetY !== 'number') {
      return;
    }

    const snapGuard = categorySnapGuardRef.current;
    const snapGuardActive = Boolean(snapGuard && snapGuard.expiresAt >= Date.now());

    if (snapGuard && !snapGuardActive) {
      categorySnapGuardRef.current = null;
    }

    if (!shouldAcceptCategoryPagerSettle({
      offsetY,
      pageHeight: boardHeight,
      snapActive: snapGuardActive,
      targetY: snapGuard?.targetY ?? offsetY,
    })) {
      return;
    }

    if (snapGuardActive) {
      categorySnapGuardRef.current = null;
    }

    const categoryId = getCategoryIdFromPageOffset({
      categories,
      offsetY,
      pageHeight: boardHeight,
    });

    if (categoryId !== selectedCategoryId) {
      onCategoryPageSettled(categoryId);
    }
  }

  function updateTrashState(nextState: TrashDragState) {
    const currentState = trashStateRef.current;

    if (
      currentState.draggingId === nextState.draggingId &&
      currentState.armedId === nextState.armedId
    ) {
      return;
    }

    trashStateRef.current = nextState;
    setTrashState(nextState);
    onTrashDragChange(nextState);
  }

  function getCategoryTrashDropZone(categoryId: string): SnagTrashDropZone {
    return getSnagTrashDropZone({
      screenHeight: height,
      scrollX: horizontalScrollOffsets[categoryId] ?? 0,
      viewportHeight: boardHeight,
      viewportWidth: width,
    });
  }

  function handleHorizontalScroll(categoryId: string, event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextOffsetX = event.nativeEvent.contentOffset.x;

    setHorizontalScrollOffsets((currentOffsets) => {
      const currentOffset = currentOffsets[categoryId] ?? 0;

      if (Math.abs(currentOffset - nextOffsetX) < 3) {
        return currentOffsets;
      }

      return {
        ...currentOffsets,
        [categoryId]: nextOffsetX,
      };
    });
  }

  function suppressBoardPress(durationMs = 480) {
    ignoreBoardPressRef.current = true;
    setTimeout(() => {
      ignoreBoardPressRef.current = false;
    }, durationMs);
  }

  function handleSnagInteractionStart(snagId: string) {
    suppressBoardPress(900);
    clearTransientActions();
    onTransientActionStart();
    onSnagInteractionStart(snagId);
  }

  function handleSnagTouchPrepare() {
    suppressBoardPress(900);
    clearTransientActions();
    onTransientActionStart();
  }

  function handleSnagInteractionEnd() {
    suppressBoardPress(520);
    setTimeout(() => {
      if (!trashStateRef.current.draggingId) {
        return;
      }

      updateTrashState({
        armedId: null,
        draggingId: null,
      });
    }, getSnagReleaseUnlockDelayMs());
  }

  function handleSnagCopyRequested(categoryId: string, snagId: string, point: SnagCopyRequestPoint) {
    suppressBoardPress(1400);
    onTransientActionStart();
    setPasteAnchor(null);
    setTextEditAnchor(null);
    setCopyAnchor({
      categoryId,
      screenX: point.screenX,
      screenY: point.screenY,
      snagId,
      x: point.x,
      y: point.y,
    });
  }

  function handleSnagTextEditRequested(categoryId: string, snagId: string, point: SnagCopyRequestPoint) {
    suppressBoardPress(1400);
    onTransientActionStart();
    setCopyAnchor(null);
    setPasteAnchor(null);
    setTextEditAnchor({
      categoryId,
      screenX: point.screenX,
      screenY: point.screenY,
      snagId,
      x: point.x,
      y: point.y,
    });
  }

  function handleSnagDragStart(snagId: string) {
    clearTransientActions();
    onTransientActionStart();
    onSnagBringToFront(snagId);
    updateTrashState({
      armedId: null,
      draggingId: snagId,
    });

    if (stagedSnagId === snagId) {
      requestAnimationFrame(() => onSnagInteractionStart(snagId));
    }
  }

  function handleSnagDragMove(categoryId: string, snagId: string, point: SnagBoardPoint) {
    const zone = getCategoryTrashDropZone(categoryId);
    const nextArmedId = isSnagInTrashDropZone({ point, zone }) ? snagId : null;

    updateTrashState({
      armedId: nextArmedId,
      draggingId: snagId,
    });
  }

  function handleSnagDragEnd(categoryId: string, snagId: string, point: SnagBoardPoint, willDelete?: boolean) {
    const zone = getCategoryTrashDropZone(categoryId);
    const shouldDelete = willDelete || isSnagInTrashDropZone({ point, zone });

    updateTrashState({
      armedId: null,
      draggingId: null,
    });

    if (shouldDelete && !willDelete) {
      onDeleteSnag(snagId);
    }
  }

  function handleBoardLongPress(categoryId: string, event: GestureResponderEvent) {
    if (
      trashStateRef.current.draggingId ||
      ignoreBoardPressRef.current ||
      !shouldAllowPasteAction({ categoryId })
    ) {
      return;
    }

    onTransientActionStart();
    ignoreNextBoardTapRef.current = true;
    setTimeout(() => {
      ignoreNextBoardTapRef.current = false;
    }, 450);
    setCopyAnchor(null);
    setPasteAnchor({
      categoryId,
      x: event.nativeEvent.locationX,
      y: event.nativeEvent.locationY,
    });
  }

  function handleBoardTap() {
    if (ignoreNextBoardTapRef.current) {
      ignoreNextBoardTapRef.current = false;
      return;
    }

    if (copyAnchor || pasteAnchor || textEditAnchor) {
      clearTransientActions();
      return;
    }

    onBackgroundTap();
  }

  async function handleSavePress() {
    if (!copyAnchor || copyAnchor.saved) {
      return;
    }

    const anchor = copyAnchor;
    const snag = snags.find((item) => item.id === anchor.snagId);

    if (!snag?.imageUri || isTextSnag(snag)) {
      setCopyAnchor(null);
      return;
    }

    if (!anchor.saveConfirming) {
      setCopyAnchor({ ...anchor, saveConfirming: true });
      return;
    }

    try {
      await saveSnagImageToLibraryAsync(snag.imageUri);
      setCopyAnchor({ ...anchor, saved: true });
      setTimeout(() => {
        setCopyAnchor((currentAnchor) => (
          currentAnchor?.categoryId === anchor.categoryId &&
          currentAnchor?.snagId === anchor.snagId &&
          currentAnchor.saved
            ? null
            : currentAnchor
        ));
      }, 900);
    } catch (error) {
      console.warn('Could not save Snag image', error);
      setCopyAnchor(null);
    }
  }

  async function handleCopyPress() {
    if (!copyAnchor || copyAnchor.copied) {
      return;
    }

    const anchor = copyAnchor;
    const snag = snags.find((item) => item.id === anchor.snagId);

    if (!snag?.imageUri || isTextSnag(snag)) {
      setCopyAnchor(null);
      return;
    }

    setCopyAnchor({ ...anchor, copied: true });
    setTimeout(() => {
      setCopyAnchor((currentAnchor) => (
        currentAnchor?.snagId === anchor.snagId && currentAnchor.copied
          ? null
          : currentAnchor
      ));
    }, 900);

    try {
      await copySnagImageAsync(snag.imageUri);
      setLastCopiedSnagId(snag.id);
    } catch (error) {
      console.warn('Could not copy Snag image', error);
      setCopyAnchor(null);
    }
  }

  function handlePastePress() {
    if (!pasteAnchor || !shouldAllowPasteAction({ categoryId: pasteAnchor.categoryId })) {
      return;
    }

    const anchor = pasteAnchor;
    const isAllPasteTarget = isAllCollectionAutoArranged({ categoryId: anchor.categoryId });
    const targetBoardWidth = isAllPasteTarget ? Math.max(width, 1) : boardWidth;
    const targetBoardHeight = isAllPasteTarget
      ? getAllCollectionContentHeight({
          boardHeight,
          boardWidth: targetBoardWidth,
          itemCount: getSnagsForCategory({ categoryId: anchor.categoryId, snags }).length,
        })
      : boardHeight;

    clearActionAnchors();
    onPasteSnag({
      boardHeight: targetBoardHeight,
      boardWidth: targetBoardWidth,
      categoryId: anchor.categoryId,
      pointerX: anchor.x,
      pointerY: anchor.y,
      sourceSnagId: lastCopiedSnagId ?? undefined,
    });
  }

  function handleTextEditPress() {
    if (!textEditAnchor) {
      return;
    }

    const anchor = textEditAnchor;

    setTextEditAnchor(null);
    onTextSnagEditRequest(anchor.snagId);
  }

  const copyActionPresentation = getCopyActionPresentation({ viewportWidth: width });
  const saveActionPresentation = getCopyActionPresentation({ actionWidth: 132, viewportWidth: width });
  const copyActionShiftedPresentation = {
    ...copyActionPresentation,
    top: copyActionPresentation.top + 52,
  };

  return (
    <View
      {...(selectedCategoryId === 'all' ? allSwipeResponder.panHandlers : {})}
      onLayout={(event) => setMeasuredHeight(event.nativeEvent.layout.height)}
      style={styles.collectionWrap}>
      <ScrollView
        bounces={false}
        contentOffset={{ x: 0, y: initialCategoryPageOffset }}
        decelerationRate="fast"
        directionalLockEnabled
        onMomentumScrollEnd={handleCategoryMomentumEnd}
        pagingEnabled
        ref={verticalPagerRef}
        scrollEnabled={!drawingCategoryId && !allSelectionMode && !surfaceSwipeLocked}
        showsVerticalScrollIndicator={false}
        snapToInterval={boardHeight}
        style={styles.collectionPager}>
        {categories.map((category) => {
          const isAllCategory = isAllCollectionAutoArranged({ categoryId: category.id });
          const isDrawingCategory = drawingCategoryId === category.id && !isAllCategory;
          const gridVisible = categoryGridPreferences[category.id] !== false;
          const categoryBackground = getCategoryBackground(category);
          const currentBoardWidth = isAllCategory ? Math.max(width, 1) : boardWidth;
          const visibleSnags = getSnagsForCategory({
            categoryId: category.id,
            snags,
          });
          const renderedSnags = isAllCategory ? visibleSnags : getLayeredSnags(visibleSnags);
          const currentBoardHeight = isAllCategory
            ? getAllCollectionContentHeight({
                boardHeight,
                boardWidth: currentBoardWidth,
                itemCount: visibleSnags.length,
              })
            : boardHeight;
          const hasStarterBlockingDrawing = (drawingsByCategoryId[category.id] ?? []).length > 0;
          const showStarterPrompts = category.id === firstCollectionCategoryId && !isAllCategory && visibleSnags.length === 0 && !isDrawingCategory && !hasStarterBlockingDrawing;
          const trashDropZone = trashState.draggingId ? getCategoryTrashDropZone(category.id) : null;
          const boardContent = (
            <Pressable
              delayLongPress={boardPasteLongPressConfig.minDurationMs}
              onPress={handleBoardTap}
              onLongPress={isAllCategory ? undefined : (event) => handleBoardLongPress(category.id, event)}
              style={[
                styles.collectionBoard,
                isAllCategory && gridVisible && styles.collectionBoardAll,
                { width: currentBoardWidth, height: currentBoardHeight },
              ]}>
              {isAllCategory && gridVisible && (
                <BoardGrid
                  canvasHeight={currentBoardHeight}
                  canvasWidth={currentBoardWidth}
                  gridSize={34}
                />
              )}
              {!isAllCategory && gridVisible && (
                <CategoryBackdrop
                  background={categoryBackground}
                  canvasHeight={currentBoardHeight}
                  canvasWidth={currentBoardWidth}
                  strength={getCategoryBackgroundStrength(category)}
                />
              )}
              {!isAllCategory && (
                <DrawingArtwork
                  canvasHeight={currentBoardHeight}
                  canvasWidth={currentBoardWidth}
                  strokes={drawingsByCategoryId[category.id] ?? []}
                />
              )}
              {showStarterPrompts && (
                <CollectionStarterPrompt
                  fontFamily={brandFont}
                  onPromptPress={onOpenCamera}
                  viewportHeight={boardHeight}
                  viewportWidth={width}
                />
              )}
              {renderedSnags.map((item, itemIndex) => {
                if (isAllCategory) {
                  const frame = getAllCollectionSnagFrame({
                    boardWidth: currentBoardWidth,
                    index: itemIndex,
                  });

                  return (
                    <AllCollectionSticker
                      item={item}
                      key={getSnagRenderKey(item)}
                      onCopyRequested={(snagId, point) => handleSnagCopyRequested(category.id, snagId, point)}
                      onSelectionToggle={onToggleAllSelection}
                      selected={selectedAllSnagIds.includes(item.id)}
                      selectionMode={allSelectionMode}
                      size={frame.size}
                      x={frame.canvasX}
                      y={frame.canvasY}
                    />
                  );
                }

                return (
                  <Fragment key={getSnagRenderKey(item)}>
                    <TransformableSnag
                      containerHeight={currentBoardHeight}
                      containerWidth={currentBoardWidth}
                      displaySize={item.size}
                      gestureSurface="full-board"
                      initialRotation={item.rotate}
                      isStaged={item.id === stagedSnagId}
                      isTransformUnlocked={trashState.draggingId === item.id}
                      item={item}
                      onCopyRequested={(snagId, point) => handleSnagCopyRequested(category.id, snagId, point)}
                      onDeleteComplete={onDeleteComplete}
                      onDragEnd={(snagId, point, willDelete) => handleSnagDragEnd(category.id, snagId, point, willDelete)}
                      onDragMove={(snagId, point) => handleSnagDragMove(category.id, snagId, point)}
                      onDragStart={handleSnagDragStart}
                      onInteractionEnd={handleSnagInteractionEnd}
                      onInteractionStart={handleSnagInteractionStart}
                      onTextEditRequested={(snagId, point) => handleSnagTextEditRequested(category.id, snagId, point)}
                      onTransformEnd={onSnagTransformEnd}
                      onTouchPrepare={handleSnagTouchPrepare}
                      trashDropZone={trashState.draggingId === item.id ? trashDropZone : null}
                      x={item.canvasX}
                      y={item.canvasY}
                    />
                    {item.id === stagedSnagId && (
                      <StagedSnagHint
                        canvasHeight={currentBoardHeight}
                        canvasWidth={currentBoardWidth}
                        fontFamily={brandFont}
                        size={item.size}
                        x={item.canvasX}
                        y={item.canvasY}
                      />
                    )}
                  </Fragment>
                );
              })}
              {isDrawingCategory && (
                <DrawingInputLayer
                  canvasHeight={currentBoardHeight}
                  canvasWidth={currentBoardWidth}
                  categoryId={category.id}
                  color={drawingStrokeColor}
                  onDrawingStart={handleDrawingStart}
                  onStrokeComplete={(stroke) => onDrawingStrokeComplete(category.id, stroke)}
                />
              )}
            </Pressable>
          );
          return (
            <View
              key={category.id}
              style={[
                styles.collectionPage,
                category.id === 'all' && gridVisible && styles.collectionPageAll,
                { height: boardHeight },
              ]}>
              {isAllCategory ? (
                <ScrollView
                  bounces={false}
                  directionalLockEnabled
                  nestedScrollEnabled
                  onMomentumScrollEnd={(event) => event.stopPropagation()}
                  onScrollEndDrag={(event) => event.stopPropagation()}
                  scrollEnabled={!surfaceSwipeLocked}
                  showsVerticalScrollIndicator={false}
                  style={styles.collectionScroller}>
                  {boardContent}
                </ScrollView>
              ) : (
                <ScrollView
                  horizontal
                  bounces={false}
                  onScroll={(event) => handleHorizontalScroll(category.id, event)}
                  scrollEventThrottle={16}
                  scrollEnabled={!isDrawingCategory}
                  showsHorizontalScrollIndicator={false}
                  style={styles.collectionScroller}>
                  {boardContent}
                </ScrollView>
              )}
            </View>
          );
        })}
      </ScrollView>
      {!drawingCategoryId && pasteAnchor?.categoryId === selectedCategoryId && shouldAllowPasteAction({ categoryId: pasteAnchor.categoryId }) && (
        <FloatingActionButton
          accessibilityLabel="Paste snag"
          label="Paste"
          onPress={handlePastePress}
          style={copyActionPresentation}
        />
      )}
      {!drawingCategoryId && copyAnchor?.categoryId === selectedCategoryId && (
        <>
          <FloatingActionButton
            accessibilityLabel="Save snag"
            label={getSaveActionLabel({ confirming: copyAnchor.saveConfirming === true, saved: copyAnchor.saved === true })}
            onPress={handleSavePress}
            style={saveActionPresentation}
          />
          <FloatingActionButton
            accessibilityLabel="Copy snag"
            label={getCopyActionLabel({ copied: copyAnchor.copied === true })}
            onPress={handleCopyPress}
            style={copyActionShiftedPresentation}
          />
        </>
      )}
      {!drawingCategoryId && textEditAnchor?.categoryId === selectedCategoryId && (
        <FloatingActionButton
          accessibilityLabel="Edit text snag"
          label="Edit"
          onPress={handleTextEditPress}
          style={copyActionPresentation}
        />
      )}
    </View>
  );
}

function clampDrawingValue(value: number, maxValue: number) {
  return Math.max(0, Math.min(value, maxValue));
}

function getDrawingPointFromEvent(
  event: GestureResponderEvent,
  canvasWidth: number,
  canvasHeight: number,
): SnagDrawingPoint {
  return {
    x: clampDrawingValue(event.nativeEvent.locationX, canvasWidth),
    y: clampDrawingValue(event.nativeEvent.locationY, canvasHeight),
  };
}

function getDrawingDistance(from: SnagDrawingPoint, to: SnagDrawingPoint) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function getDrawingPath(points: SnagDrawingPoint[]) {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.01} ${points[0].y + 0.01}`;
  }

  return points.reduce((path, point, index) => (
    index === 0
      ? `M ${point.x} ${point.y}`
      : `${path} L ${point.x} ${point.y}`
  ), '');
}

function DrawingArtwork({
  canvasHeight,
  canvasWidth,
  strokes,
}: {
  canvasHeight: number;
  canvasWidth: number;
  strokes: SnagDrawingStroke[];
}) {
  if (strokes.length === 0) {
    return null;
  }

  return (
    <Svg
      pointerEvents="none"
      style={styles.drawingArtwork}
      width={canvasWidth}
      height={canvasHeight}>
      {strokes.map((stroke) => (
        <Path
          d={getDrawingPath(stroke.points)}
          fill="none"
          key={stroke.id}
          opacity={0.82}
          stroke={stroke.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={stroke.width}
        />
      ))}
    </Svg>
  );
}

function DrawingInputLayer({
  canvasHeight,
  canvasWidth,
  categoryId,
  color,
  onDrawingStart,
  onStrokeComplete,
}: {
  canvasHeight: number;
  canvasWidth: number;
  categoryId: string;
  color: string;
  onDrawingStart: () => void;
  onStrokeComplete: (stroke: SnagDrawingStroke) => void;
}) {
  const [livePoints, setLivePoints] = useState<SnagDrawingPoint[]>([]);
  const pointsRef = useRef<SnagDrawingPoint[]>([]);

  function appendPoint(point: SnagDrawingPoint) {
    const previousPoint = pointsRef.current[pointsRef.current.length - 1];

    if (previousPoint && getDrawingDistance(previousPoint, point) < DRAWING_POINT_SPACING) {
      return;
    }

    const nextPoints = [...pointsRef.current, point];
    pointsRef.current = nextPoints;
    setLivePoints(nextPoints);
  }

  function handleResponderGrant(event: GestureResponderEvent) {
    onDrawingStart();
    const firstPoint = getDrawingPointFromEvent(event, canvasWidth, canvasHeight);

    pointsRef.current = [firstPoint];
    setLivePoints([firstPoint]);
  }

  function handleResponderMove(event: GestureResponderEvent) {
    appendPoint(getDrawingPointFromEvent(event, canvasWidth, canvasHeight));
  }

  function finishStroke() {
    const points = pointsRef.current;

    pointsRef.current = [];
    setLivePoints([]);

    if (points.length < 2) {
      return;
    }

    onStrokeComplete({
      color,
      id: `stroke-${categoryId}-${Date.now()}-${Math.round(points[0].x)}-${Math.round(points[0].y)}`,
      points,
      width: DRAWING_STROKE_WIDTH,
    });
  }

  return (
    <View
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleResponderGrant}
      onResponderMove={handleResponderMove}
      onResponderRelease={finishStroke}
      onResponderTerminate={finishStroke}
      onResponderTerminationRequest={() => false}
      onStartShouldSetResponder={() => true}
      style={styles.drawingInputLayer}>
      {livePoints.length > 0 && (
        <Svg
          pointerEvents="none"
          style={styles.drawingLiveArtwork}
          width={canvasWidth}
          height={canvasHeight}>
          <Path
            d={getDrawingPath(livePoints)}
            fill="none"
            opacity={0.86}
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={DRAWING_STROKE_WIDTH}
          />
        </Svg>
      )}
    </View>
  );
}

function BoardView({
  brandFont,
  boardLimitState,
  drawingRoomId,
  drawingStrokeColor,
  drawingsByRoomId,
  onCreateRoom,
  onDeleteComplete,
  onDeleteSnag,
  onDrawingStrokeComplete,
  onJoinRoom,
  onPasteSnag,
  onSelectRoom,
  onSnagBringToFront,
  onSnagTransformEnd,
  onTextSnagEditRequest,
  onSurfaceSwipeCancel,
  onSurfaceSwipeProgress,
  onSwipeToCollection,
  onTransientActionStart,
  onTrashDragChange,
  room,
  rooms,
  snagLimitCopy,
  snags,
}: {
  brandFont: string;
  boardLimitState: ReturnType<typeof getBoardLimitState>;
  drawingRoomId: string | null;
  drawingStrokeColor: string;
  drawingsByRoomId: Record<string, SnagDrawingStroke[]>;
  onCreateRoom: (options?: { openRoom?: boolean }) => Promise<BoardRoom | null>;
  onDeleteComplete: (roomId: string, snagId: string) => void;
  onDeleteSnag: (roomId: string, snagId: string) => void;
  onDrawingStrokeComplete: (roomId: string, stroke: SnagDrawingStroke) => void;
  onJoinRoom: (inviteCode: string) => Promise<boolean>;
  onPasteSnag: (request: BoardPasteSnagRequest) => void;
  onSelectRoom: (roomId: string) => void;
  onSnagBringToFront: (roomId: string, snagId: string) => void;
  onSnagTransformEnd: (roomId: string, snagId: string, transform: SnagTransformPatch) => void;
  onTextSnagEditRequest: (roomId: string, snagId: string) => void;
  onSurfaceSwipeCancel: () => void;
  onSurfaceSwipeProgress: (progress: number) => void;
  onSwipeToCollection: () => void;
  onTransientActionStart: () => void;
  onTrashDragChange: (state: TrashDragState) => void;
  room: BoardRoom | null;
  rooms: BoardRoom[];
  snagLimitCopy: ReturnType<typeof getBoardLimitCopy> | null;
  snags: SnagItem[];
}) {
  const { height, width } = useWindowDimensions();
  const ignoreBoardPressRef = useRef(false);
  const ignoreNextBoardTapRef = useRef(false);
  const trashStateRef = useRef<TrashDragState>({ armedId: null, draggingId: null });
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [sharingInvite, setSharingInvite] = useState(false);
  const [pasteAnchor, setPasteAnchor] = useState<{
    roomId: string;
    x: number;
    y: number;
  } | null>(null);
  const [copyAnchor, setCopyAnchor] = useState<CopySnagRequest | null>(null);
  const [textEditAnchor, setTextEditAnchor] = useState<CopySnagRequest | null>(null);
  const [trashState, setTrashState] = useState<TrashDragState>({
    armedId: null,
    draggingId: null,
  });
  const [viewportSize, setViewportSize] = useState({ height: 0, width: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
  const scrollOffsetRef = useRef(scrollOffset);
  const boardPanActiveRef = useRef(false);
  const lastBoardStateCommitAtRef = useRef(0);
  const [boardCanvasOffset] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [boardPanResponder, setBoardPanResponder] = useState(() => PanResponder.create({}));
  const [miniMapOpacity] = useState(() => new Animated.Value(BOARD_MINI_MAP_VISIBILITY.hiddenOpacity));
  const [snagRenderLimit, setSnagRenderLimit] = useState(BOARD_INITIAL_SNAG_RENDER_LIMIT);
  const miniMapHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderableRooms = useMemo(() => getRenderableBoardRooms(rooms), [rooms]);
  const boardPasteLongPressConfig = getBoardPasteLongPressConfig();
  const actionOverlayConfig = getCollectionActionOverlayConfig();
  const boardPanStateCommitConfig = getBoardPanStateCommitConfig();
  const viewportWidth = Math.max(1, viewportSize.width || width - 32);
  const viewportHeight = Math.max(1, viewportSize.height || height - 190);
  const metrics = getBoardCanvasMetrics({
    viewportHeight,
    viewportWidth,
  });
  const activeRoomId = room?.id ?? null;
  const indicator = getBoardViewportIndicator({
    canvasHeight: metrics.canvasHeight,
    canvasWidth: metrics.canvasWidth,
    offsetX: scrollOffset.x,
    offsetY: scrollOffset.y,
    viewportHeight,
    viewportWidth,
  });
  useEffect(() => () => {
    if (miniMapHideTimeoutRef.current) {
      clearTimeout(miniMapHideTimeoutRef.current);
    }
    onTrashDragChange({ armedId: null, draggingId: null });
  }, [onTrashDragChange]);

  useEffect(() => {
    if (boardPanActiveRef.current) {
      return;
    }

    scrollOffsetRef.current = scrollOffset;
  }, [scrollOffset]);

  useEffect(() => {
    if (!pasteAnchor) {
      return;
    }

    const timeout = setTimeout(() => {
      setPasteAnchor(null);
    }, actionOverlayConfig.autoDismissMs);

    return () => clearTimeout(timeout);
  }, [actionOverlayConfig.autoDismissMs, pasteAnchor]);

  useEffect(() => {
    if (!copyAnchor) {
      return;
    }

    const timeout = setTimeout(() => {
      setCopyAnchor(null);
    }, actionOverlayConfig.autoDismissMs);

    return () => clearTimeout(timeout);
  }, [actionOverlayConfig.autoDismissMs, copyAnchor]);

  const showBoardMiniMapTemporarily = useCallback(() => {
    if (miniMapHideTimeoutRef.current) {
      clearTimeout(miniMapHideTimeoutRef.current);
    }

    Animated.timing(miniMapOpacity, {
      toValue: BOARD_MINI_MAP_VISIBILITY.visibleOpacity,
      duration: BOARD_MINI_MAP_VISIBILITY.fadeInMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    miniMapHideTimeoutRef.current = setTimeout(() => {
      Animated.timing(miniMapOpacity, {
        toValue: BOARD_MINI_MAP_VISIBILITY.hiddenOpacity,
        duration: BOARD_MINI_MAP_VISIBILITY.fadeOutMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, BOARD_MINI_MAP_VISIBILITY.idleMs);
  }, [miniMapOpacity]);

  async function handleJoinPress() {
    const normalizedCode = normalizeSocialInviteCode(inviteCode);

    if (!normalizedCode || !boardLimitState.canJoinRoom) {
      setJoinError(getBoardJoinFailureCopy().message);
      return;
    }

    setJoiningRoom(true);

    try {
      const joined = await onJoinRoom(normalizedCode);

      if (joined) {
        setInviteCode('');
        setJoinError(null);
        return;
      }

      setJoinError(getBoardJoinFailureCopy().message);
    } catch {
      setJoinError(getBoardJoinFailureCopy().message);
    } finally {
      setJoiningRoom(false);
    }
  }

  async function handleShareSnagInvite() {
    if (sharingInvite) {
      return;
    }

    setSharingInvite(true);

    try {
      if (renderableRooms.length === 0) {
        const createdRoom = await onCreateRoom({ openRoom: false });

        if (!createdRoom) {
          return;
        }
      }

      await Share.share({
        message: getBoardInviteShareCopy({}).message,
      });
    } catch (error) {
      console.warn('Could not share board invite', error);
    } finally {
      setSharingInvite(false);
    }
  }

  const clearActionAnchors = useCallback(() => {
    setCopyAnchor(null);
    setPasteAnchor(null);
    setTextEditAnchor(null);
  }, []);

  const clearTransientActions = useCallback(() => {
    clearActionAnchors();
  }, [clearActionAnchors]);

  const applyBoardVisualOffset = useCallback((nextOffset: { x: number; y: number }) => {
    scrollOffsetRef.current = nextOffset;
    boardCanvasOffset.setValue({
      x: -nextOffset.x,
      y: -nextOffset.y,
    });
  }, [boardCanvasOffset]);

  const commitBoardScrollOffset = useCallback((
    nextOffset: { x: number; y: number },
    options: { syncVisual?: boolean } = {},
  ) => {
    scrollOffsetRef.current = nextOffset;

    if (options.syncVisual !== false) {
      boardCanvasOffset.setValue({
        x: -nextOffset.x,
        y: -nextOffset.y,
      });
    }

    setScrollOffset((currentOffset) => {
      if (currentOffset.x === nextOffset.x && currentOffset.y === nextOffset.y) {
        return currentOffset;
      }

      return nextOffset;
    });
  }, [boardCanvasOffset]);

  const maybeCommitBoardScrollOffset = useCallback((nextOffset: { x: number; y: number }) => {
    const now = Date.now();

    if (now - lastBoardStateCommitAtRef.current < boardPanStateCommitConfig.stateCommitIntervalMs) {
      return;
    }

    lastBoardStateCommitAtRef.current = now;
    commitBoardScrollOffset(nextOffset, { syncVisual: false });
  }, [boardPanStateCommitConfig.stateCommitIntervalMs, commitBoardScrollOffset]);

  useEffect(() => {
    let panStartOffset = scrollOffsetRef.current;
    let isPreviewingSurfaceSwipe = false;

    const nextBoardPanResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return shouldStartBoardPanGesture({
          activeRoomId,
          drawingActive: Boolean(drawingRoomId),
          draggingSnagId: trashStateRef.current.draggingId,
          scrollOffsetX: scrollOffsetRef.current.x,
          translationX: gestureState.dx,
          translationY: gestureState.dy,
        });
      },
      onPanResponderGrant: () => {
        boardPanActiveRef.current = true;
        lastBoardStateCommitAtRef.current = 0;
        panStartOffset = scrollOffsetRef.current;
        isPreviewingSurfaceSwipe = false;
        clearTransientActions();
        onTransientActionStart();
      },
      onPanResponderMove: (_, gestureState) => {
        const horizontalDistance = Math.abs(gestureState.dx);
        const verticalDistance = Math.abs(gestureState.dy);
        const shouldPreviewBoardToAll = panStartOffset.x <= 12 &&
          gestureState.dx > 0 &&
          horizontalDistance >= 10 &&
          horizontalDistance >= verticalDistance * 0.5;

        if (isPreviewingSurfaceSwipe || shouldPreviewBoardToAll) {
          isPreviewingSurfaceSwipe = true;
          onSurfaceSwipeProgress(1 - getSurfaceSwipeProgress({
            direction: 'board-to-all',
            translationX: gestureState.dx,
            width,
          }));
          return;
        }

        if (!activeRoomId) {
          return;
        }

        const nextOffset = getNextBoardPanOffset({
          canvasHeight: metrics.canvasHeight,
          canvasWidth: metrics.canvasWidth,
          deltaX: gestureState.dx,
          deltaY: gestureState.dy,
          startOffset: panStartOffset,
          viewportHeight,
          viewportWidth,
        });

        applyBoardVisualOffset(nextOffset);
        maybeCommitBoardScrollOffset(nextOffset);
        showBoardMiniMapTemporarily();
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isPreviewingSurfaceSwipe) {
          boardPanActiveRef.current = false;
          commitBoardScrollOffset(scrollOffsetRef.current);
          return;
        }

        const navigationTarget = getSurfaceSwipeCompletionTarget({
          boardScrollX: panStartOffset.x,
          currentSurface: 'board',
          translationX: gestureState.dx,
          velocityX: gestureState.vx,
          width,
        });

        if (navigationTarget === 'collection') {
          isPreviewingSurfaceSwipe = false;
          boardPanActiveRef.current = false;
          onSwipeToCollection();
          return;
        }

        isPreviewingSurfaceSwipe = false;
        boardPanActiveRef.current = false;
        onSurfaceSwipeCancel();
      },
      onPanResponderTerminate: () => {
        if (!isPreviewingSurfaceSwipe) {
          boardPanActiveRef.current = false;
          commitBoardScrollOffset(scrollOffsetRef.current);
          return;
        }

        isPreviewingSurfaceSwipe = false;
        boardPanActiveRef.current = false;
        onSurfaceSwipeCancel();
      },
    });

    setBoardPanResponder(nextBoardPanResponder);
  }, [
    activeRoomId,
    applyBoardVisualOffset,
    clearTransientActions,
    commitBoardScrollOffset,
    drawingRoomId,
    maybeCommitBoardScrollOffset,
    metrics.canvasHeight,
    metrics.canvasWidth,
    onSurfaceSwipeCancel,
    onSurfaceSwipeProgress,
    onSwipeToCollection,
    onTransientActionStart,
    showBoardMiniMapTemporarily,
    viewportHeight,
    viewportWidth,
    width,
  ]);

  function updateTrashState(nextState: TrashDragState) {
    const currentState = trashStateRef.current;

    if (
      currentState.draggingId === nextState.draggingId &&
      currentState.armedId === nextState.armedId
    ) {
      return;
    }

    trashStateRef.current = nextState;
    setTrashState(nextState);
    onTrashDragChange(nextState);
  }

  function getBoardTrashDropZone(): SnagTrashDropZone {
    return getSnagTrashDropZone({
      screenHeight: height,
      scrollX: scrollOffset.x,
      scrollY: scrollOffset.y,
      viewportHeight,
      viewportWidth,
    });
  }

  function suppressBoardPress(durationMs = 520) {
    ignoreBoardPressRef.current = true;
    setTimeout(() => {
      ignoreBoardPressRef.current = false;
    }, durationMs);
  }

  function handleSnagInteractionStart() {
    suppressBoardPress(900);
    clearTransientActions();
    onTransientActionStart();
  }

  function handleSnagTouchPrepare() {
    suppressBoardPress(900);
    clearTransientActions();
    onTransientActionStart();
  }

  function handleSnagInteractionEnd() {
    suppressBoardPress(520);
    setTimeout(() => {
      if (!trashStateRef.current.draggingId) {
        return;
      }

      updateTrashState({
        armedId: null,
        draggingId: null,
      });
    }, getSnagReleaseUnlockDelayMs());
  }

  function handleSnagCopyRequested(roomId: string, snagId: string, point: SnagCopyRequestPoint) {
    suppressBoardPress(1400);
    onTransientActionStart();
    setPasteAnchor(null);
    setTextEditAnchor(null);
    setCopyAnchor({
      categoryId: roomId,
      screenX: point.screenX,
      screenY: point.screenY,
      roomId: roomId,
      snagId,
      x: point.x,
      y: point.y,
    });
  }

  function handleSnagTextEditRequested(roomId: string, snagId: string, point: SnagCopyRequestPoint) {
    suppressBoardPress(1400);
    onTransientActionStart();
    setCopyAnchor(null);
    setPasteAnchor(null);
    setTextEditAnchor({
      categoryId: roomId,
      screenX: point.screenX,
      screenY: point.screenY,
      roomId,
      snagId,
      x: point.x,
      y: point.y,
    });
  }

  function handleSnagDragStart(snagId: string) {
    clearTransientActions();
    onTransientActionStart();
    if (activeRoomId) {
      onSnagBringToFront(activeRoomId, snagId);
    }
    updateTrashState({
      armedId: null,
      draggingId: snagId,
    });
  }

  function handleSnagDragMove(snagId: string, point: SnagBoardPoint) {
    const zone = getBoardTrashDropZone();
    const nextArmedId = isSnagInTrashDropZone({ point, zone }) ? snagId : null;

    updateTrashState({
      armedId: nextArmedId,
      draggingId: snagId,
    });
  }

  function handleSnagDragEnd(roomId: string, snagId: string, point: SnagBoardPoint, willDelete?: boolean) {
    const zone = getBoardTrashDropZone();
    const shouldDelete = willDelete || isSnagInTrashDropZone({ point, zone });

    updateTrashState({
      armedId: null,
      draggingId: null,
    });

    if (shouldDelete && !willDelete) {
      onDeleteSnag(roomId, snagId);
    }
  }

  function handleDrawingStart() {
    suppressBoardPress(900);
    clearTransientActions();
    onTransientActionStart();
  }

  function handleBoardLongPress(roomId: string, event: GestureResponderEvent) {
    if (trashStateRef.current.draggingId || ignoreBoardPressRef.current || !boardLimitState.canAddSnag) {
      return;
    }

    onTransientActionStart();
    ignoreNextBoardTapRef.current = true;
    setTimeout(() => {
      ignoreNextBoardTapRef.current = false;
    }, 450);
    setCopyAnchor(null);
    setTextEditAnchor(null);
    setPasteAnchor({
      roomId,
      x: event.nativeEvent.locationX,
      y: event.nativeEvent.locationY,
    });
  }

  function handleBoardTap() {
    if (ignoreNextBoardTapRef.current) {
      ignoreNextBoardTapRef.current = false;
      return;
    }

    if (copyAnchor || pasteAnchor || textEditAnchor) {
      clearTransientActions();
      onTransientActionStart();
      return;
    }

    onTransientActionStart();
  }

  async function handleCopyPress() {
    if (!copyAnchor || copyAnchor.copied) {
      return;
    }

    const anchor = copyAnchor;
    const snag = snags.find((item) => item.id === anchor.snagId);

    if (!snag?.imageUri || isTextSnag(snag)) {
      setCopyAnchor(null);
      return;
    }

    setCopyAnchor({ ...anchor, copied: true });
    setTimeout(() => {
      setCopyAnchor((currentAnchor) => (
        currentAnchor?.roomId === anchor.roomId &&
        currentAnchor?.snagId === anchor.snagId &&
        currentAnchor.copied
          ? null
          : currentAnchor
      ));
    }, 900);

    try {
      await copySnagImageAsync(snag.imageUri);
    } catch (error) {
      console.warn('Could not copy board Snag image', error);
      setCopyAnchor(null);
    }
  }

  function handlePastePress() {
    if (!pasteAnchor || !boardLimitState.canAddSnag) {
      return;
    }

    const anchor = pasteAnchor;

    clearActionAnchors();
    onPasteSnag({
      boardHeight: metrics.canvasHeight,
      boardWidth: metrics.canvasWidth,
      pointerX: anchor.x,
      pointerY: anchor.y,
      roomId: anchor.roomId,
    });
  }

  function handleTextEditPress() {
    const roomId = textEditAnchor?.roomId;

    if (!textEditAnchor || !roomId) {
      return;
    }

    const { snagId } = textEditAnchor;

    setTextEditAnchor(null);
    onTextSnagEditRequest(roomId, snagId);
  }

  const visibleBoardSnags = useMemo(() => getVisibleBoardSnags({
    offsetX: scrollOffset.x,
    offsetY: scrollOffset.y,
    snags: getLayeredSnags(snags),
    viewportHeight,
    viewportWidth,
  }), [scrollOffset.x, scrollOffset.y, snags, viewportHeight, viewportWidth]);

  useEffect(() => {
    if (!activeRoomId || visibleBoardSnags.length <= snagRenderLimit) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setSnagRenderLimit((currentLimit) => getNextBoardSnagRenderLimit({
        currentLimit,
        totalCount: visibleBoardSnags.length,
      }));
    });

    return () => cancelAnimationFrame(frame);
  }, [activeRoomId, snagRenderLimit, visibleBoardSnags.length]);

  const renderedSnags = useMemo(() => getProgressiveBoardSnags({
    renderLimit: snagRenderLimit,
    snags: visibleBoardSnags,
  }), [snagRenderLimit, visibleBoardSnags]);

  if (!room) {
    return (
      <View {...boardPanResponder.panHandlers} style={styles.boardLobby}>
        <GlassSurface interactive style={styles.boardLobbyCard}>
          <Text style={[styles.boardTitle, { fontFamily: brandFont }]}>Board</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create board room"
            disabled={!boardLimitState.canCreateRoom}
            onPress={() => {
              void onCreateRoom();
            }}
            style={({ pressed }) => [
              styles.boardPrimaryButton,
              !boardLimitState.canCreateRoom && styles.boardPrimaryButtonDisabled,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.boardPrimaryButtonText}>Create Room</Text>
          </Pressable>
          <View style={styles.boardJoinRow}>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              onChangeText={(value) => {
                setInviteCode(value);
                setJoinError(null);
              }}
              onSubmitEditing={handleJoinPress}
              placeholder="Invite code"
              placeholderTextColor="rgba(23, 23, 23, 0.34)"
              returnKeyType="join"
              selectionColor={INK}
              style={styles.boardCodeInput}
              value={inviteCode}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Join board room"
              disabled={!boardLimitState.canJoinRoom || joiningRoom}
              onPress={handleJoinPress}
              style={({ pressed }) => [
                styles.boardJoinButton,
                (!boardLimitState.canJoinRoom || joiningRoom) && styles.boardJoinButtonDisabled,
                pressed && styles.pressed,
              ]}>
              <SymbolView name={symbolName('arrow.right')} size={18} tintColor={INK} weight="bold" />
            </Pressable>
          </View>
          {joinError && (
            <Text style={styles.boardJoinNotice}>{joinError}</Text>
          )}
          {renderableRooms.length > 0 && (
            <View style={styles.boardRoomList}>
              {renderableRooms.map((joinedRoom) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${joinedRoom.title}`}
                  key={joinedRoom.id}
                  onPress={() => onSelectRoom(joinedRoom.id)}
                  style={({ pressed }) => [styles.boardRoomListItem, pressed && styles.pressed]}>
                  <View>
                    <View style={[styles.boardRoomNamePill, { backgroundColor: joinedRoom.color ?? BOARD_COLOR_OPTIONS[0] }]}>
                      <Text style={styles.boardRoomListTitle} numberOfLines={1}>{joinedRoom.title}</Text>
                    </View>
                    <Text style={styles.boardRoomListCode}>{joinedRoom.code}</Text>
                  </View>
                  <View style={styles.boardRoomMemberCountPill}>
                    <SymbolView name={symbolName('person.2.fill')} size={14} tintColor="rgba(23, 23, 23, 0.52)" weight="bold" />
                    <Text style={styles.boardRoomMemberCountText}>{getBoardRoomMemberCount(joinedRoom)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={renderableRooms.length > 0 ? 'Share Snag app' : 'Share Snag and create a room'}
            disabled={sharingInvite || (renderableRooms.length === 0 && !boardLimitState.canCreateRoom)}
            onPress={handleShareSnagInvite}
            style={({ pressed }) => [
              styles.boardInvitePrompt,
              (sharingInvite || (renderableRooms.length === 0 && !boardLimitState.canCreateRoom)) && styles.boardInvitePromptDisabled,
              pressed && styles.pressed,
            ]}>
            <View style={styles.boardInviteIcon}>
              <SymbolView
                name={symbolName(renderableRooms.length > 0 ? 'square.and.arrow.up' : 'sparkles')}
                size={18}
                tintColor="rgba(23, 23, 23, 0.64)"
                weight="bold"
              />
            </View>
            <View style={styles.boardInviteCopy}>
              <Text style={styles.boardInviteTitle}>Start together</Text>
              <Text style={styles.boardInviteText} numberOfLines={1}>
                {renderableRooms.length > 0 ? 'Share Snag' : 'Share Snag + Create a room'}
              </Text>
            </View>
            <SymbolView name={symbolName('square.and.arrow.up')} size={18} tintColor="rgba(23, 23, 23, 0.52)" weight="bold" />
          </Pressable>
          {joiningRoom && (
            <View pointerEvents="auto" style={styles.boardLobbyLoadingOverlay}>
              <View style={styles.boardEntryLoadingCard}>
                <Text style={[styles.boardEntryLoadingTitle, { fontFamily: brandFont }]} numberOfLines={1}>Board</Text>
                <Text style={styles.boardEntryLoadingMessage} numberOfLines={1}>Entering room...</Text>
              </View>
            </View>
          )}
        </GlassSurface>
      </View>
    );
  }

  const isDrawingBoard = drawingRoomId === room.id;
  const showBoardStarterPrompt = snags.length === 0 && !isDrawingBoard && (drawingsByRoomId[room.id] ?? []).length === 0;
  const trashDropZone = trashState.draggingId ? getBoardTrashDropZone() : null;
  const boardActionPresentation = getCopyActionPresentation({
    viewportWidth: viewportWidth || Math.max(1, width - 32),
  });

  return (
    <View
      {...boardPanResponder.panHandlers}
      onLayout={(event) => setViewportSize({
        height: event.nativeEvent.layout.height,
        width: event.nativeEvent.layout.width,
      })}
      style={styles.boardFrame}>
      <View style={styles.boardViewport}>
        <AnimatedPressable
          delayLongPress={boardPasteLongPressConfig.minDurationMs}
          onLongPress={isDrawingBoard ? undefined : (event) => handleBoardLongPress(room.id, event)}
          onPress={handleBoardTap}
          style={[
            styles.boardCanvas,
            {
              height: metrics.canvasHeight,
              transform: boardCanvasOffset.getTranslateTransform(),
              width: metrics.canvasWidth,
            },
          ]}>
            <BoardGrid
              canvasHeight={metrics.canvasHeight}
              canvasWidth={metrics.canvasWidth}
              gridSize={metrics.gridSize}
            />
            <DrawingArtwork
              canvasHeight={metrics.canvasHeight}
              canvasWidth={metrics.canvasWidth}
              strokes={drawingsByRoomId[room.id] ?? []}
            />
            {showBoardStarterPrompt && (
              <BoardStarterPrompt
                canvasHeight={metrics.canvasHeight}
                canvasWidth={metrics.canvasWidth}
                fontFamily={brandFont}
                viewportHeight={viewportHeight}
                viewportWidth={viewportWidth}
              />
            )}
            {renderedSnags.map((item) => (
              <TransformableSnag
                containerHeight={metrics.canvasHeight}
                containerWidth={metrics.canvasWidth}
                displaySize={item.size}
                gestureSurface="full-board"
                initialRotation={item.rotate}
                isStaged={false}
                isTransformUnlocked={trashState.draggingId === item.id}
                item={item}
                key={getSnagRenderKey(item)}
                onCopyRequested={(snagId, point) => handleSnagCopyRequested(room.id, snagId, point)}
                onDeleteComplete={(snagId) => onDeleteComplete(room.id, snagId)}
                onDragEnd={(snagId, point, willDelete) => handleSnagDragEnd(room.id, snagId, point, willDelete)}
                onDragMove={handleSnagDragMove}
                onDragStart={handleSnagDragStart}
                onInteractionEnd={handleSnagInteractionEnd}
                onInteractionStart={handleSnagInteractionStart}
                onTextEditRequested={(snagId, point) => handleSnagTextEditRequested(room.id, snagId, point)}
                onTransformEnd={(snagId, transform) => onSnagTransformEnd(room.id, snagId, transform)}
                onTouchPrepare={handleSnagTouchPrepare}
                trashDropZone={trashState.draggingId === item.id ? trashDropZone : null}
                x={item.canvasX}
                y={item.canvasY}
              />
            ))}
            {isDrawingBoard && (
              <DrawingInputLayer
                canvasHeight={metrics.canvasHeight}
                canvasWidth={metrics.canvasWidth}
                categoryId={room.id}
                color={drawingStrokeColor}
                onDrawingStart={handleDrawingStart}
                onStrokeComplete={(stroke) => onDrawingStrokeComplete(room.id, stroke)}
              />
            )}
        </AnimatedPressable>
      </View>
      {!isDrawingBoard && boardLimitState.canAddSnag && pasteAnchor?.roomId === room.id && (
        <FloatingActionButton
          accessibilityLabel="Paste snag to board"
          label="Paste"
          onPress={handlePastePress}
          style={boardActionPresentation}
        />
      )}
      {!isDrawingBoard && copyAnchor?.roomId === room.id && (
        <FloatingActionButton
          accessibilityLabel="Copy board snag"
          label={getCopyActionLabel({ copied: copyAnchor.copied === true })}
          onPress={handleCopyPress}
          style={boardActionPresentation}
        />
      )}
      {!isDrawingBoard && textEditAnchor?.roomId === room.id && (
        <FloatingActionButton
          accessibilityLabel="Edit board text snag"
          label="Edit"
          onPress={handleTextEditPress}
          style={boardActionPresentation}
        />
      )}
      {snagLimitCopy && (
        <GlassSurface style={styles.boardLimitPill}>
          <Text style={styles.boardLimitPillText}>{snagLimitCopy.message}</Text>
        </GlassSurface>
      )}
      <Animated.View pointerEvents="none" style={[styles.boardMiniMap, { height: metrics.indicatorHeight, opacity: miniMapOpacity, width: metrics.indicatorWidth }]}>
        <View
          style={[
            styles.boardMiniViewport,
            {
              height: indicator.height,
              left: indicator.left,
              top: indicator.top,
              width: indicator.width,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

function CategoryBackdrop({
  background,
  canvasHeight,
  canvasWidth,
  preview,
  strength = getCategoryBackgroundStrength({}),
}: {
  background: SnagCategoryBackgroundOption;
  canvasHeight: number;
  canvasWidth: number;
  preview?: boolean;
  strength?: number;
}) {
  const dotGap = preview ? 14 : 38;
  const shelfGap = preview ? 24 : 142;
  const journalGap = preview ? 12 : 34;
  const dotColumns = Math.ceil(canvasWidth / dotGap);
  const dotRows = Math.ceil(canvasHeight / dotGap);
  const shelfRows = Math.ceil(canvasHeight / shelfGap);
  const journalRows = Math.ceil(canvasHeight / journalGap);
  const normalizedStrength = getCategoryBackgroundStrength({ backgroundStrength: strength });
  const defaultStrength = getCategoryBackgroundStrength({});
  const strengthRatio = normalizedStrength / defaultStrength;
  const strengthOpacity = preview ? Math.min(1, Math.max(0.78, strengthRatio)) : 1;
  const gridLineColor = getBackdropLineColor(0.082, normalizedStrength, preview);
  const dotColor = getBackdropLineColor(0.095, normalizedStrength, preview);
  const shelfColor = getBackdropLineColor(0.115, normalizedStrength, preview);
  const journalLineColor = getBackdropLineColor(0.075, normalizedStrength, preview);
  const journalMarginColor = getBackdropLineColor(0.13, normalizedStrength, preview, '255, 150, 150');

  switch (background.id) {
    case 'grid':
      return (
        <View pointerEvents="none" style={[styles.categoryBackdrop, styles.categoryBackdropBase, { opacity: strengthOpacity }]}>
          <BoardGrid
            canvasHeight={canvasHeight}
            canvasWidth={canvasWidth}
            gridSize={preview ? 16 : 34}
            lineColor={gridLineColor}
          />
        </View>
      );
    case 'dots':
      return (
        <View pointerEvents="none" style={[styles.categoryBackdrop, styles.categoryBackdropBase, { opacity: strengthOpacity }]}>
          {Array.from({ length: dotRows }).map((_, row) => (
            Array.from({ length: dotColumns }).map((__, column) => (
              <View
                key={`${row}-${column}`}
                style={[
                  styles.categoryBackdropDot,
                  {
                    backgroundColor: dotColor,
                    left: column * dotGap + dotGap * 0.5,
                    top: row * dotGap + dotGap * 0.5,
                  },
                ]}
              />
            ))
          ))}
        </View>
      );
    case 'shelves':
      return (
        <View pointerEvents="none" style={[styles.categoryBackdrop, styles.categoryBackdropBase, { opacity: strengthOpacity }]}>
          {Array.from({ length: shelfRows }).map((_, row) => (
            <View
              key={row}
              style={[
                styles.categoryBackdropShelf,
                {
                  backgroundColor: shelfColor,
                  left: 0,
                  top: Math.max(18, row * shelfGap + shelfGap * 0.78),
                  width: canvasWidth,
                },
              ]}
            />
          ))}
        </View>
      );
    case 'journal':
      return (
        <View pointerEvents="none" style={[styles.categoryBackdrop, styles.categoryBackdropBase, { opacity: strengthOpacity }]}>
          {Array.from({ length: journalRows }).map((_, row) => (
            <View
              key={row}
              style={[
                styles.categoryBackdropJournalLine,
                { backgroundColor: journalLineColor, top: row * journalGap + journalGap },
              ]}
            />
          ))}
          <View style={[styles.categoryBackdropJournalMargin, { backgroundColor: journalMarginColor, left: preview ? 18 : 74 }]} />
        </View>
      );
    default:
      return <View pointerEvents="none" style={[styles.categoryBackdrop, styles.categoryBackdropBase]} />;
  }
}

function BoardGrid({
  canvasHeight,
  canvasWidth,
  gridSize,
  lineColor = BOARD_GRID_CHROME.lineColor,
}: {
  canvasHeight: number;
  canvasWidth: number;
  gridSize: number;
  lineColor?: string;
}) {
  const verticalLines = useMemo(() => (
    Array.from({ length: Math.ceil(canvasWidth / gridSize) + 1 }, (_, index) => index * gridSize)
  ), [canvasWidth, gridSize]);
  const horizontalLines = useMemo(() => (
    Array.from({ length: Math.ceil(canvasHeight / gridSize) + 1 }, (_, index) => index * gridSize)
  ), [canvasHeight, gridSize]);

  return (
    <>
      {verticalLines.map((left) => (
        <View
          key={`v-${left}`}
          style={[
            styles.boardGridLineVertical,
            {
              backgroundColor: lineColor,
              height: canvasHeight,
              left,
            },
          ]}
        />
      ))}
      {horizontalLines.map((top) => (
        <View
          key={`h-${top}`}
          style={[
            styles.boardGridLineHorizontal,
            {
              backgroundColor: lineColor,
              top,
              width: canvasWidth,
            },
          ]}
        />
      ))}
    </>
  );
}

function getBackdropLineColor(
  baseAlpha: number,
  strength: number,
  preview?: boolean,
  rgb = '23, 23, 23',
) {
  const defaultStrength = getCategoryBackgroundStrength({});
  const previewBoost = preview ? 1.72 : 1;
  const alpha = Math.min(0.26, Math.max(0.018, baseAlpha * (strength / defaultStrength) * previewBoost));

  return `rgba(${rgb}, ${Math.round(alpha * 1000) / 1000})`;
}

const styles = StyleSheet.create({
  glassSurface: {
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    overflow: 'hidden',
  },
  screen: {
    flex: 1,
    backgroundColor: PAPER,
  },
  appLoadingScreen: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PAPER,
    zIndex: 40,
    elevation: 40,
  },
  appLoadingText: {
    color: INK,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: 0,
  },
  boardEntryLoadingScreen: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    zIndex: 38,
    elevation: 38,
  },
  boardEntryLoadingCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.045)',
    shadowColor: INK,
    shadowOpacity: 0.052,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 30,
  },
  boardEntryLoadingTitle: {
    maxWidth: '100%',
    color: INK,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: 0,
  },
  boardEntryLoadingMessage: {
    color: 'rgba(23, 23, 23, 0.5)',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  boardEntryMemberRow: {
    maxWidth: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
    paddingTop: 3,
  },
  boardEntryMemberChip: {
    minHeight: 28,
    maxWidth: 128,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.66)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.055)',
  },
  boardEntryMemberText: {
    color: 'rgba(23, 23, 23, 0.66)',
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: COLLECTION_CHROME.safeAreaPaddingTop,
    paddingBottom: 18,
    position: 'relative',
  },
  header: {
    minHeight: COLLECTION_CHROME.headerMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    zIndex: 24,
  },
  brandLockup: {
    flex: 1,
  },
  elasticPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkButton: {
    alignSelf: 'flex-start',
    width: 254,
    height: 58,
    marginLeft: -48,
    marginTop: COLLECTION_CHROME.wordmarkOffsetY,
  },
  wordmark: {
    position: 'relative',
    width: '100%',
    height: 58,
    justifyContent: 'center',
  },
  wordmarkLetters: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginLeft: 54,
    minHeight: 48,
  },
  wordmarkSnagged: {
    position: 'absolute',
    left: 54,
    bottom: 6,
    color: INK,
    fontSize: 39,
    lineHeight: 43,
    fontWeight: '800',
    letterSpacing: 0,
  },
  wordmarkLetter: {
    color: INK,
    fontSize: 42,
    lineHeight: 45,
    fontWeight: '800',
    letterSpacing: 0,
  },
  wordmarkS: {
    transform: [{ rotate: '-4deg' }, { translateY: 1 }],
  },
  wordmarkN: {
    marginLeft: -3,
    transform: [{ rotate: '3deg' }, { translateY: -1 }],
  },
  wordmarkA: {
    marginLeft: -4,
    transform: [{ rotate: '-2deg' }, { translateY: 2 }],
  },
  wordmarkG: {
    marginLeft: -4,
    transform: [{ rotate: '5deg' }, { translateY: 1 }],
  },
  content: {
    flex: 1,
    paddingTop: COLLECTION_CHROME.contentPaddingTop,
    paddingBottom: COLLECTION_CHROME.contentPaddingBottom,
    position: 'relative',
  },
  surfaceLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    paddingTop: COLLECTION_CHROME.contentPaddingTop,
    paddingBottom: COLLECTION_CHROME.contentPaddingBottom,
  },
  surfaceLayerActive: {
    opacity: 1,
    zIndex: 2,
  },
  surfaceLayerInactive: {
    opacity: 0,
    zIndex: 0,
  },
  captureRoot: {
    flex: 1,
    backgroundColor: '#050505',
  },
  captureLive: {
    flex: 1,
    backgroundColor: '#050505',
  },
  cameraPreviewFrame: {
    flex: 1,
    position: 'relative',
  },
  cameraPreview: {
    flex: 1,
  },
  cameraZoomPill: {
    position: 'absolute',
    left: '50%',
    bottom: 138,
    minWidth: 54,
    height: 34,
    marginLeft: -27,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  cameraZoomText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  cameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    backgroundColor: '#050505',
  },
  cameraFallbackOrb: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  cameraFallbackTitle: {
    marginTop: 18,
    color: '#FFFFFF',
    fontFamily: Fonts.sans,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700',
  },
  cameraFallbackText: {
    marginTop: 8,
    color: 'rgba(255, 255, 255, 0.62)',
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
  },
  cameraPermissionButton: {
    minHeight: 44,
    marginTop: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  cameraPermissionButtonText: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  captureTopBar: {
    position: 'absolute',
    left: 12,
    right: 10,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  captureTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 0,
  },
  captureIconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  autoCutoutIconWrap: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoCutoutBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 13,
    height: 13,
    borderRadius: 6.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  autoCutoutBadgeText: {
    color: '#050505',
    fontFamily: Fonts.sans,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
  },
  captureBottomBar: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 28,
    height: 98,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  galleryButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  galleryButtonSpacer: {
    width: 58,
    height: 58,
  },
  shutterButton: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  shutterButtonPressed: {
    transform: [{ scale: 0.92 }],
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },
  capturePressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  captureDisabled: {
    opacity: 0.52,
  },
  cutoutChoiceScreen: {
    flex: 1,
    backgroundColor: PAPER,
  },
  cutoutChoicePreview: {
    flex: 1,
    marginHorizontal: 18,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F6F6',
    overflow: 'hidden',
  },
  cutoutChoiceImage: {
    width: '100%',
    height: '100%',
  },
  cutoutChoiceActions: {
    minHeight: 146,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PAPER,
  },
  cutoutChoiceButton: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(23, 23, 23, 0.055)',
  },
  cutoutChoiceButtonPrimary: {
    backgroundColor: INK,
    shadowColor: INK,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
  },
  cutoutChoiceButtonText: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
  },
  cutoutChoiceButtonTextPrimary: {
    color: '#FFFFFF',
  },
  processingScreen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#050505',
  },
  processingImage: {
    width: '100%',
    height: '100%',
  },
  refineScreen: {
    flex: 1,
    backgroundColor: PAPER,
  },
  refineTopBar: {
    height: 88,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refineGlassPressable: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  refineGlassButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    shadowColor: INK,
    shadowOpacity: 0.055,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    overflow: 'hidden',
  },
  refineGlassButtonDark: {
    backgroundColor: 'rgba(23, 23, 23, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.24)',
    shadowOpacity: 0.12,
  },
  refineGlassButtonAccent: {
    backgroundColor: 'rgba(218, 255, 93, 0.96)',
    borderColor: 'rgba(23, 23, 23, 0.06)',
    shadowOpacity: 0.14,
  },
  refineSavePressable: {
    minWidth: 96,
    height: 50,
    borderRadius: 25,
  },
  refineSaveGlass: {
    minWidth: 96,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 17,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.84)',
    shadowColor: INK,
    shadowOpacity: 0.055,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    overflow: 'hidden',
  },
  refineSaveText: {
    color: INK,
    fontFamily: BRAND_FONT,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '800',
  },
  refineTopButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23, 23, 23, 0.055)',
  },
  refineDoneButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INK,
    shadowColor: INK,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
  },
  refineStage: {
    flex: 1,
    marginHorizontal: 14,
    borderRadius: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F2',
  },
  refineGrid: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  refineGridCell: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  refineGridCellAlt: {
    backgroundColor: '#D8D8D8',
  },
  cutoutNotice: {
    position: 'absolute',
    top: 18,
    maxWidth: '86%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.08)',
    zIndex: 2,
  },
  cutoutNoticeText: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  cutoutShadow: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: INK,
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    overflow: 'visible',
  },
  cutoutImage: {
    width: '100%',
    height: '100%',
  },
  refineToolbar: {
    height: 88,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: PAPER,
  },
  refineToolButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23, 23, 23, 0.055)',
  },
  refineToolButtonActive: {
    backgroundColor: INK,
  },
  brushPreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    shadowColor: INK,
    shadowOpacity: 0.045,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
  brushDot: {
    backgroundColor: INK,
    opacity: 0.72,
  },
  brushSliderWrap: {
    flex: 1,
    minWidth: 0,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  brushSliderGlass: {
    flex: 1,
    minWidth: 0,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    shadowColor: INK,
    shadowOpacity: 0.055,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    overflow: 'hidden',
  },
  brushSliderPreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.045)',
  },
  brushSliderSizeDot: {
    backgroundColor: 'rgba(23, 23, 23, 0.82)',
  },
  brushSliderHitbox: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
  },
  brushSliderTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(23, 23, 23, 0.095)',
    overflow: 'visible',
  },
  brushSliderFill: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(23, 23, 23, 0.82)',
  },
  brushSliderThumb: {
    position: 'absolute',
    top: -10,
    width: 27,
    height: 27,
    marginLeft: -13.5,
    borderRadius: 13.5,
    backgroundColor: INK,
    shadowColor: INK,
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.74)',
  },
  cameraFrame: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: SKY,
    shadowColor: INK,
    shadowOpacity: 0.055,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
  },
  worldCanvas: {
    flexGrow: 1,
    position: 'relative',
    backgroundColor: SKY,
  },
  road: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(23, 23, 23, 0.035)',
  },
  capturedSticker: {
    position: 'absolute',
  },
  capturedTextSticker: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  capturedTextStickerText: {
    color: INK,
    fontFamily: BRAND_FONT,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    textAlign: 'center',
  },
  capturedStickerImage: {
    width: '100%',
    height: '100%',
  },
  stickerOutline: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  stickerOutlineImage: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  allCollectionSticker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: INK,
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
  },
  allCollectionStickerSelected: {
    transform: [{ scale: 0.96 }],
  },
  allCollectionStickerImage: {
    height: '100%',
    width: '100%',
  },
  allSelectionCheck: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.075)',
  },
  allSelectionCheckActive: {
    backgroundColor: INK,
    borderColor: INK,
  },
  collectionWrap: {
    flex: 1,
    marginHorizontal: -16,
    position: 'relative',
  },
  categoryHeaderControls: {
    minHeight: COLLECTION_CHROME.headerMinHeight,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 30,
    transform: [{ translateY: COLLECTION_CHROME.wordmarkOffsetY }],
  },
  categoryHeaderActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryHeaderBadgeButton: {
    borderRadius: 17,
    shadowColor: INK,
    shadowOpacity: CATEGORY_HEADER_BADGE_CHROME.shadowOpacity,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 13,
  },
  categoryHeaderBadge: {
    minWidth: 82,
    maxWidth: 154,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CATEGORY_HEADER_BADGE_CHROME.borderColor,
  },
  allSelectionDeleteButton: {
    width: 56,
    height: 34,
    borderRadius: 17,
    shadowColor: INK,
    shadowOpacity: 0.035,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 12,
  },
  allSelectionDeleteGlass: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 59, 48, 0.13)',
    overflow: 'hidden',
  },
  allSelectionDeleteText: {
    color: '#FF3B30',
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  collectionCategoryText: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  categoryEditMenuShell: {
    position: CATEGORY_HEADER_MENU_LAYOUT.position,
    top: CATEGORY_HEADER_MENU_LAYOUT.top,
    right: CATEGORY_HEADER_MENU_LAYOUT.right,
    width: 214,
    borderRadius: 25,
  },
  categoryEditMenu: {
    borderRadius: 25,
    padding: 8,
    gap: 3,
    shadowColor: INK,
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
  },
  categoryEditRow: {
    height: 42,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
  },
  categoryEditRowActive: {
    backgroundColor: 'rgba(23, 23, 23, 0.055)',
  },
  categoryEditRowDisabled: {
    opacity: 0.44,
  },
  categoryEditRowText: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  categoryEditRowTextDisabled: {
    color: 'rgba(23, 23, 23, 0.34)',
  },
  categoryEditRowDestructiveText: {
    color: '#FF3B30',
  },
  categoryColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    paddingHorizontal: 12,
    paddingTop: 3,
    paddingBottom: 8,
  },
  categoryColorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.08)',
  },
  categoryColorSwatchWhite: {
    borderWidth: 1.2,
    borderColor: 'rgba(23, 23, 23, 0.22)',
    shadowColor: INK,
    shadowOpacity: 0.055,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  categoryColorSwatchActive: {
    borderWidth: 1.4,
    borderColor: 'rgba(23, 23, 23, 0.32)',
  },
  categoryBackgroundDialog: {
    width: '100%',
    maxWidth: 348,
    borderRadius: 30,
    padding: 16,
    gap: 14,
    shadowColor: INK,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 32,
  },
  categoryBackgroundHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryBackgroundCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.055)',
  },
  categoryBackgroundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryBackgroundOption: {
    width: '47.8%',
    minHeight: 104,
    borderRadius: 23,
    padding: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.052)',
  },
  categoryBackgroundOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1.2,
    borderColor: 'rgba(23, 23, 23, 0.28)',
  },
  categoryBackgroundPreview: {
    height: 58,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#FEFEFC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.055)',
    marginBottom: 9,
  },
  categoryBackgroundOptionLabel: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  categoryBackgroundStrengthRow: {
    minHeight: 48,
    borderRadius: 24,
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.075)',
  },
  categoryBackgroundStrengthLabel: {
    width: 34,
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  categoryBackgroundSliderHitbox: {
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
  },
  categoryBackgroundSliderTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(23, 23, 23, 0.08)',
  },
  categoryBackgroundSliderFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: 'rgba(23, 23, 23, 0.42)',
  },
  categoryBackgroundSliderThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    marginLeft: -10,
    borderRadius: 10,
    backgroundColor: PAPER,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.18)',
    shadowColor: INK,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 9,
  },
  categoryBackgroundDoneButton: {
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23, 23, 23, 0.88)',
  },
  categoryBackgroundDoneText: {
    color: PAPER,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  categoryDialogOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  categoryDialog: {
    width: '100%',
    maxWidth: 338,
    borderRadius: 30,
    padding: 18,
    gap: 14,
    shadowColor: INK,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 32,
  },
  categoryDialogTitle: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  textSnagDialogTitle: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '700',
  },
  categoryNameInput: {
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.54)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.06)',
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  textSnagInput: {
    height: 64,
    fontSize: 22,
    fontWeight: '700',
  },
  categoryDialogActions: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryDialogButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23, 23, 23, 0.055)',
  },
  categoryDialogButtonPrimary: {
    backgroundColor: INK,
  },
  categoryDialogButtonText: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  categoryDialogButtonPrimaryText: {
    color: PAPER,
  },
  categoryDeleteDialog: {
    borderColor: 'rgba(255, 59, 48, 0.22)',
  },
  categoryDeleteTitle: {
    color: '#FF3B30',
  },
  categoryDeleteCopy: {
    color: 'rgba(23, 23, 23, 0.62)',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryDeleteButton: {
    backgroundColor: '#FF3B30',
  },
  categoryDeleteButtonText: {
    color: PAPER,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  collectionScroller: {
    flex: 1,
  },
  collectionPager: {
    flex: 1,
  },
  collectionPage: {
    backgroundColor: PAPER,
  },
  collectionPageAll: {
    backgroundColor: BOARD_GRID_CHROME.backgroundColor,
  },
  collectionBoard: {
    height: '100%',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  collectionBoardAll: {
    backgroundColor: BOARD_GRID_CHROME.backgroundColor,
  },
  collectionStarterPrompt: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 5,
  },
  collectionStarterTitle: {
    color: INK,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  collectionStarterCameraTarget: {
    position: 'absolute',
    alignItems: 'center',
  },
  collectionStarterCameraTargetPressed: {
    transform: [{ scale: 0.96 }, { translateY: 2 }],
  },
  collectionStarterCameraLine: {
    marginTop: 6,
  },
  collectionStarterCameraHint: {
    alignSelf: 'center',
    color: 'rgba(23, 23, 23, 0.48)',
    fontSize: 15,
    lineHeight: 18,
    marginTop: -20,
  },
  collectionStarterNameHint: {
    position: 'absolute',
    left: 40,
    top: 108,
    width: 210,
  },
  collectionStarterNameArrow: {
    position: 'absolute',
    left: 50,
    top: -56,
  },
  collectionStarterSwipeHint: {
    position: 'absolute',
    right: 12,
    width: 132,
    alignItems: 'flex-end',
  },
  collectionStarterSideText: {
    color: 'rgba(23, 23, 23, 0.58)',
    fontSize: 16,
    lineHeight: 20,
  },
  stagedSnagHint: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 7,
  },
  stagedSnagHintText: {
    color: 'rgba(23, 23, 23, 0.5)',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  drawingArtwork: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  drawingInputLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 6,
  },
  drawingLiveArtwork: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  pasteButton: {
    position: 'absolute',
    zIndex: 80,
    elevation: 80,
    width: 88,
    height: 44,
    borderRadius: 22,
    shadowColor: INK,
    shadowOpacity: FLOATING_ACTION_CHROME.shadowOpacity,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
  floatingActionPressable: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  pasteButtonGlass: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FLOATING_ACTION_CHROME.backgroundColor,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FLOATING_ACTION_CHROME.borderColor,
    overflow: 'hidden',
  },
  pasteButtonText: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
  },
  boardLobby: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  boardLobbyCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 30,
    padding: 16,
    gap: 14,
    overflow: 'hidden',
    shadowColor: INK,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 26,
  },
  boardLobbyLoadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    zIndex: 4,
  },
  boardTitle: {
    color: INK,
    fontFamily: BRAND_FONT,
    fontSize: 42,
    lineHeight: 45,
    fontWeight: '800',
    textAlign: 'center',
  },
  boardPrimaryButton: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INK,
  },
  boardPrimaryButtonDisabled: {
    opacity: 0.34,
  },
  boardPrimaryButtonText: {
    color: PAPER,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
  },
  boardJoinRow: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.055)',
    overflow: 'hidden',
  },
  boardCodeInput: {
    flex: 1,
    height: '100%',
    paddingLeft: 17,
    paddingRight: 8,
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
  },
  boardJoinButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardJoinButtonDisabled: {
    opacity: 0.28,
  },
  boardJoinNotice: {
    marginTop: -7,
    color: 'rgba(23, 23, 23, 0.42)',
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  boardRoomList: {
    gap: 8,
  },
  boardRoomListItem: {
    minHeight: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.045)',
  },
  boardRoomNamePill: {
    alignSelf: 'flex-start',
    minHeight: 21,
    maxWidth: 190,
    borderRadius: 11,
    justifyContent: 'center',
    paddingHorizontal: 9,
    marginBottom: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.045)',
  },
  boardRoomListTitle: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  boardRoomListCode: {
    color: 'rgba(23, 23, 23, 0.46)',
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
  },
  boardRoomMemberCountPill: {
    minWidth: 42,
    height: 26,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.055)',
  },
  boardRoomMemberCountText: {
    color: 'rgba(23, 23, 23, 0.62)',
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
  },
  boardInvitePrompt: {
    minHeight: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.05)',
  },
  boardInvitePromptDisabled: {
    opacity: 0.52,
  },
  boardInviteIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.045)',
  },
  boardInviteCopy: {
    flex: 1,
    minWidth: 0,
  },
  boardInviteTitle: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  boardInviteText: {
    color: 'rgba(23, 23, 23, 0.45)',
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  boardFrame: {
    flex: 1,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    overflow: 'hidden',
    backgroundColor: PAPER,
    position: 'relative',
    shadowColor: INK,
    shadowOpacity: 0.055,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 34,
  },
  boardViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  boardStarterPrompt: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 5,
  },
  boardStarterText: {
    color: 'rgba(23, 23, 23, 0.46)',
    fontSize: 22,
    lineHeight: 27,
    textAlign: 'center',
  },
  boardVerticalScroller: {
    flex: 1,
  },
  boardCanvas: {
    position: 'relative',
    backgroundColor: BOARD_GRID_CHROME.backgroundColor,
  },
  categoryBackdrop: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  categoryBackdropBase: {
    backgroundColor: '#FEFEFC',
  },
  categoryBackdropDot: {
    position: 'absolute',
    width: 2.2,
    height: 2.2,
    borderRadius: 1.1,
    backgroundColor: 'rgba(23, 23, 23, 0.095)',
  },
  categoryBackdropShelf: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
    shadowColor: INK,
    shadowOpacity: 0.035,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
  },
  categoryBackdropJournalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(23, 23, 23, 0.075)',
  },
  categoryBackdropJournalMargin: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 150, 150, 0.18)',
  },
  boardGridLineVertical: {
    position: 'absolute',
    top: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: BOARD_GRID_CHROME.lineColor,
  },
  boardGridLineHorizontal: {
    position: 'absolute',
    left: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: BOARD_GRID_CHROME.lineColor,
  },
  boardMiniMap: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.055)',
    overflow: 'hidden',
  },
  boardLimitPill: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    minHeight: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
  },
  boardLimitPillText: {
    color: 'rgba(23, 23, 23, 0.52)',
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  boardMiniViewport: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: 'rgba(23, 23, 23, 0.22)',
  },
  bottomDock: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 20,
    height: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 7,
  },
  dockPopLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  drawingDockContent: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawingDockButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: INK,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 14,
  },
  drawingDockButtonGlass: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.78)',
    overflow: 'hidden',
  },
  drawingDockButtonEmphasized: {
    shadowOpacity: 0.09,
  },
  drawingDockButtonGlassEmphasized: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: INK,
    borderColor: INK,
  },
  drawingColorRail: {
    flex: 1,
    height: 58,
    minWidth: 0,
    borderRadius: 29,
    shadowColor: INK,
    shadowOpacity: 0.045,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  drawingColorRailTouch: {
    flex: 1,
    height: '100%',
    borderRadius: 29,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  drawingColorLiquidIndicator: {
    position: 'absolute',
    top: 11,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.14)',
    shadowColor: INK,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 9,
  },
  drawingColorSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawingColorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.08)',
  },
  drawingColorSwatchActive: {
    height: 24,
    borderRadius: 9,
    borderColor: 'rgba(23, 23, 23, 0.18)',
  },
  drawingColorSwatchInk: {
    borderColor: 'rgba(255, 255, 255, 0.62)',
  },
  dockButton: {
    position: 'absolute',
    top: 4,
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: INK,
    shadowOpacity: 0.035,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 14,
  },
  dockButtonCenter: {
    left: '50%',
    marginLeft: -34,
  },
  dockButtonRight: {
    right: 0,
  },
  collectionDockButton: {
    left: 0,
  },
  collectionPressLayer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockButtonGlass: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.54)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.78)',
    overflow: 'hidden',
  },
  collectionDockGlass: {
    width: '100%',
  },
  collectionPieceRail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionPiece: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    borderRadius: 5,
    backgroundColor: 'rgba(23, 23, 23, 0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.08)',
  },
  collectionPiecePrimary: {
    backgroundColor: INK,
    borderColor: INK,
  },
  socialDockPeople: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  socialDockPerson: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTrayShell: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 104,
    zIndex: 9,
  },
  categoryTray: {
    minHeight: 54,
    borderRadius: 27,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: INK,
    shadowOpacity: 0.055,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
  },
  categoryDismissLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 104,
    zIndex: 6,
  },
  categoryTrayPill: {
    height: 38,
    maxWidth: 128,
    minWidth: 64,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.055)',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
  },
  categoryTrayPillActive: {
    borderColor: 'rgba(23, 23, 23, 0.2)',
    shadowColor: INK,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  categoryTrayText: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
  },
  categoryAddButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.05)',
  },
  settingsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
    paddingHorizontal: 18,
    paddingTop: 144,
  },
  settingsPanel: {
    width: '100%',
    borderRadius: 34,
    padding: 16,
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 36,
  },
  settingsTitleRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  settingsEyebrow: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  settingsTitle: {
    color: PAPER,
    fontFamily: Fonts.sans,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
  },
  settingsCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  settingsSection: {
    gap: 8,
  },
  settingsInputRow: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  settingsInput: {
    flex: 1,
    height: '100%',
    paddingLeft: 16,
    paddingRight: 8,
    color: PAPER,
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '700',
  },
  settingsSaveButton: {
    width: 42,
    height: 42,
    marginRight: 3,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingsSaveButtonActive: {
    backgroundColor: PAPER,
  },
  settingsHint: {
    color: 'rgba(255, 255, 255, 0.46)',
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  settingsContactFooter: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: 28,
    gap: 8,
  },
  settingsContactLink: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 4,
  },
  settingsContactIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsContactValue: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.64)',
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  settingsHelpSection: {
    borderRadius: 24,
    padding: 14,
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  settingsHelpTitle: {
    color: PAPER,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  settingsHelpText: {
    color: 'rgba(255, 255, 255, 0.56)',
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  settingsLanguageControl: {
    minHeight: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.11)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  settingsLanguageControlLabel: {
    color: PAPER,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
  },
  settingsLanguageControlValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  settingsLanguageControlText: {
    color: 'rgba(255, 255, 255, 0.68)',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  settingsLanguageOption: {
    minHeight: 42,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  settingsLanguageOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  settingsLanguageOptionText: {
    color: 'rgba(255, 255, 255, 0.64)',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  settingsLanguageOptionTextActive: {
    color: PAPER,
  },
  settingsLanguageRow: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.13)',
  },
  settingsLanguageButton: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLanguageButtonActive: {
    backgroundColor: PAPER,
  },
  settingsLanguageText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  settingsLanguageTextActive: {
    color: INK,
  },
  settingsPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.97 }],
  },
  boardMembersTrayShell: {
    position: 'absolute',
    right: 28,
    bottom: 104,
    width: 184,
    zIndex: 12,
    elevation: 12,
  },
  boardMembersTray: {
    borderRadius: 27,
    gap: 6,
    padding: 8,
    shadowColor: INK,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
  },
  boardMemberRow: {
    minHeight: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.045)',
  },
  boardMemberRowCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.64)',
    borderColor: 'rgba(23, 23, 23, 0.08)',
  },
  boardMemberAvatar: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
  },
  boardMemberTextStack: {
    flex: 1,
    minWidth: 0,
  },
  boardMemberName: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  boardMemberRole: {
    color: 'rgba(23, 23, 23, 0.48)',
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
  },
  boardMemberActionMenu: {
    marginTop: 5,
    marginBottom: 3,
    marginLeft: 38,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23, 23, 23, 0.06)',
  },
  boardMemberActionButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  boardMemberActionButtonDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(23, 23, 23, 0.06)',
  },
  boardMemberActionButtonDanger: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(23, 23, 23, 0.06)',
  },
  boardMemberActionText: {
    color: INK,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  boardMemberActionTextDanger: {
    color: '#D64242',
  },
  dockButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(23, 23, 23, 0.08)',
  },
  dockButtonTrash: {
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
  },
  dockButtonTrashArmed: {
    backgroundColor: 'rgba(255, 245, 245, 0.82)',
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  dockActiveDot: {
    position: 'absolute',
    bottom: 10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: INK,
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
