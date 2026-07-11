import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const appSource = readFileSync(new URL('../src/app/index.tsx', import.meta.url), 'utf8');

function getFunctionSource(functionName, nextFunctionName) {
  const startIndex = appSource.indexOf(`function ${functionName}`);
  const endIndex = appSource.indexOf(`function ${nextFunctionName}`, startIndex + 1);

  assert.notEqual(startIndex, -1, `${functionName} should exist`);
  assert.notEqual(endIndex, -1, `${nextFunctionName} should follow ${functionName}`);

  return appSource.slice(startIndex, endIndex);
}

describe('menu source layout', () => {
  it('renders the category color picker immediately below the Color row', () => {
    const source = getFunctionSource('CategoryEditMenu', 'CategoryEditRow');
    const colorIndex = source.indexOf('label="Color"');
    const pickerIndex = source.indexOf('{colorPickerOpen && canEdit && (');
    const drawIndex = source.indexOf('label="Draw"');

    assert.ok(colorIndex < pickerIndex);
    assert.ok(pickerIndex < drawIndex);
  });

  it('renders the board color picker immediately below the Color row', () => {
    const source = getFunctionSource('BoardEditMenu', 'BoardRenameDialog');
    const colorIndex = source.indexOf('label="Color"');
    const pickerIndex = source.indexOf('{colorPickerOpen && (');
    const drawIndex = source.indexOf('label="Draw"');

    assert.ok(colorIndex < pickerIndex);
    assert.ok(pickerIndex < drawIndex);
  });

  it('uses the loaded Snag brand font for the Board lobby title on first render', () => {
    assert.match(appSource, /brandFont=\{brandFont\}/);
    assert.match(appSource, /<Text style=\{\[styles\.boardTitle, \{ fontFamily: brandFont \}\]\}>Board<\/Text>/);
  });

  it('renders a centered brand-font loading screen before the library is ready', () => {
    assert.match(appSource, /<AppLoadingScreen fontFamily=\{brandFont\} \/>/);
    assert.match(appSource, /function AppLoadingScreen/);
    assert.match(appSource, /<Text style=\{\[styles\.appLoadingText, \{ fontFamily \}\]\}>Snag<\/Text>/);
    assert.match(appSource, /appLoadingScreen: \{/);
    assert.match(appSource, /alignItems: 'center'/);
    assert.match(appSource, /justifyContent: 'center'/);
  });

  it('adds category grid control before drawing actions', () => {
    const source = getFunctionSource('CategoryEditMenu', 'CategoryEditRow');
    const colorIndex = source.indexOf('label="Color"');
    const gridIndex = source.indexOf("label={gridVisible ? 'Grid On' : 'Grid Off'}", colorIndex);
    const drawIndex = source.indexOf('label="Draw"');

    assert.ok(colorIndex < gridIndex);
    assert.ok(gridIndex < drawIndex);
  });

  it('lets category creation and the top-right category menu choose a subtle backdrop', () => {
    const appSourceSlice = getFunctionSource('SnagApp', 'clampDrawingValue');
    const headerSource = getFunctionSource('CategoryHeaderControl', 'CategoryEditMenu');
    const menuSource = getFunctionSource('CategoryEditMenu', 'CategoryEditRow');
    const pickerSource = getFunctionSource('CategoryBackgroundPicker', 'CategoryHeaderControl');

    assert.match(appSource, /CATEGORY_BACKGROUND_OPTIONS/);
    assert.match(appSource, /CategoryBackgroundPicker/);
    assert.match(appSourceSlice, /categoryBackgroundPicker/);
    assert.match(appSourceSlice, /handleOpenCreateCategoryBackgroundPicker/);
    assert.match(appSourceSlice, /handleOpenCategoryBackgroundPicker/);
    assert.match(appSourceSlice, /handleCategoryBackgroundDraftSelect/);
    assert.match(appSourceSlice, /handleCategoryBackgroundStrengthChange/);
    assert.match(appSourceSlice, /handleCategoryBackgroundSubmit/);
    assert.match(appSourceSlice, /createSnagCategory\(\{\s*background,/);
    assert.match(appSourceSlice, /backgroundStrength/);
    assert.match(headerSource, /onBackgroundPress/);
    assert.match(menuSource, /label="Backdrop"/);
    assert.match(menuSource, /onBackgroundPress/);
    assert.match(pickerSource, /Pick a backdrop/);
    assert.match(pickerSource, /CATEGORY_BACKGROUND_OPTIONS\.map/);
    assert.match(pickerSource, /BackdropStrengthSlider/);
    assert.match(pickerSource, /Line/);
    assert.doesNotMatch(pickerSource, /subtitle|categoryBackgroundOptionSubtitle/);
    assert.doesNotMatch(appSource, /Paper/);
  });

  it('renders selected category backdrops behind snags without turning them into loud artwork', () => {
    const collectionSource = getFunctionSource('CollectionView', 'clampDrawingValue');
    const backdropSource = getFunctionSource('CategoryBackdrop', 'BoardGrid');

    assert.match(appSource, /function CategoryBackdrop/);
    assert.match(collectionSource, /const categoryBackground = getCategoryBackground\(category\)/);
    assert.match(collectionSource, /<CategoryBackdrop/);
    assert.match(collectionSource, /background=\{categoryBackground\}/);
    assert.match(backdropSource, /case 'dots'/);
    assert.match(backdropSource, /case 'shelves'/);
    assert.match(backdropSource, /case 'journal'/);
    assert.match(backdropSource, /strengthOpacity/);
    assert.match(backdropSource, /width: canvasWidth/);
    assert.doesNotMatch(backdropSource, /LinearGradient|ImageBackground|backgroundImage/);
  });

  it('renders settings as a full screen dark overlay while preserving the wordmark position', () => {
    assert.match(appSource, /settingsOpen && \(/);
    assert.match(appSource, /<SettingsOverlay/);
    assert.match(appSource, /inverted=\{settingsOpen\}/);
    assert.match(appSource, /onPress=\{settingsOpen \? handleCloseSettings : handleOpenSettings\}/);
    assert.match(appSource, /settingsOverlay: \{/);
    assert.match(appSource, /backgroundColor: 'rgba\(0, 0, 0, 0\.96\)'/);
    assert.match(appSource, /paddingTop: 144/);
  });

  it('removes language settings while keeping profile name keyboard dismissal', () => {
    const source = getFunctionSource('SettingsOverlay', 'CategoryHeaderControl');

    assert.equal(source.includes('<Text style={styles.settingsTitle}>Profile</Text>'), false);
    assert.match(appSource, /Keyboard\.dismiss\(\)/);
    assert.equal(appSource.includes('getSnagLanguageLabel'), false);
    assert.equal(appSource.includes('SettingsLanguageControl'), false);
    assert.equal(appSource.includes('Change language'), false);
  });

  it('keeps nickname editing focused on an inline placeholder and an active save glow', () => {
    const source = getFunctionSource('SettingsOverlay', 'CategoryHeaderControl');

    assert.equal(source.includes('<Text style={styles.settingsLabel}>Name</Text>'), false);
    assert.match(source, /placeholder="Set your nickname\?"/);
    assert.match(source, /profileNameDirty/);
    assert.match(source, /styles\.settingsSaveButtonActive/);
    assert.match(source, /tintColor=\{profileNameDirty \? INK : 'rgba\(255, 255, 255, 0\.54\)'\}/);
  });

  it('updates cached board member names and Supabase when a nickname is saved', () => {
    const source = getFunctionSource('handleSubmitProfileName', 'isCategoryGridVisible');

    assert.match(source, /updateBoardMemberDisplayName\(/);
    assert.match(source, /cacheSocialBoardSnapshot\(/);
    assert.match(source, /setSocialProfile\(/);
    assert.match(source, /updateSocialProfileDisplayNameAsync\(/);
    assert.match(source, /Could not update social profile name/);
  });

  it('shows tappable email, Instagram, and TikTok destinations in settings', () => {
    const source = getFunctionSource('SettingsOverlay', 'CategoryBackgroundPicker');
    const iconSource = getFunctionSource('SettingsContactIcon', 'SettingsOverlay');
    const panelIndex = source.indexOf('styles.settingsPanel');
    const panelCloseIndex = source.indexOf('</Animated.View>', panelIndex);
    const footerIndex = source.indexOf('styles.settingsContactFooter');

    assert.match(appSource, /import \* as Linking from 'expo-linking';/);
    assert.match(appSource, /SNAG_PUBLIC_LINKS/);
    assert.match(appSource, /openSnagPublicLinkAsync/);
    assert.match(source, /SNAG_PUBLIC_LINKS\.map\(\(link\) =>/);
    assert.match(source, /<SettingsContactIcon id=\{link\.id\} \/>/);
    assert.match(source, /openSnagPublicLinkAsync\(link\.url, Linking\.openURL\)/);
    assert.match(source, /accessibilityLabel=\{link\.accessibilityLabel\}/);
    assert.match(source, /\{link\.value\}/);
    assert.match(source, /Could not open Snag public link/);
    assert.ok(panelIndex < panelCloseIndex);
    assert.ok(panelCloseIndex < footerIndex);
    assert.doesNotMatch(source, /\{link\.label\}/);
    assert.doesNotMatch(source, /arrow\.up\.right/);
    assert.match(iconSource, /case 'email'/);
    assert.match(iconSource, /case 'instagram'/);
    assert.match(iconSource, /case 'tiktok'/);
    assert.match(iconSource, /envelope\.fill/);
    assert.match(iconSource, /<Svg/);
    assert.match(iconSource, /#EA4335/);
    assert.match(iconSource, /SvgLinearGradient/);
    assert.match(iconSource, /#25F4EE/);
    assert.match(iconSource, /#FE2C55/);
    assert.match(appSource, /settingsContactFooter: \{/);
    assert.match(appSource, /settingsContactLink: \{/);
    assert.match(appSource, /settingsContactIcon: \{/);
    assert.match(appSource, /settingsContactValue: \{/);
    assert.doesNotMatch(appSource, /settingsContactRow: \{/);
    assert.doesNotMatch(appSource, /settingsContactArrow: \{/);
  });

  it('moves social limit helper copy into settings instead of the board lobby', () => {
    const settingsSource = getFunctionSource('SettingsOverlay', 'CategoryHeaderControl');
    const boardSource = getFunctionSource('BoardView', 'BoardGrid');

    assert.match(settingsSource, /Social limits/);
    assert.match(settingsSource, /BOARD_SOCIAL_LIMITS\.boardsCreatedPerMember/);
    assert.doesNotMatch(boardSource, /createLimitCopy\.message/);
    assert.doesNotMatch(boardSource, /joinLimitCopy\.message/);
  });

  it('hydrates social boards from local cache before waiting for the cloud refresh', () => {
    const cacheIndex = appSource.indexOf('loadSocialBoardCacheAsync()');
    const profileIndex = appSource.indexOf('loadOrCreateSocialProfileAsync({');

    assert.notEqual(cacheIndex, -1);
    assert.notEqual(profileIndex, -1);
    assert.ok(cacheIndex < profileIndex);
    assert.match(appSource, /saveSocialBoardCacheAsync\(cachedSnapshot\)/);
    assert.match(appSource, /applySocialBoardSnapshot\(cachedSnapshot\)/);
  });

  it('quietly refreshes cloud social boards while the app stays open', () => {
    assert.match(appSource, /SOCIAL_BOARD_REFRESH_INTERVAL_MS/);
    assert.match(appSource, /setInterval\(refreshSocialBoardsQuietly, SOCIAL_BOARD_REFRESH_INTERVAL_MS\)/);
    assert.match(appSource, /loadJoinedSocialBoardsAsync\(\{/);
    assert.match(appSource, /saveSocialBoardCacheAsync\(cachedSnapshot\)/);
  });

  it('shows the member count on social board lobby rows', () => {
    assert.match(appSource, /getBoardRoomMemberCount\(joinedRoom\)/);
    assert.match(appSource, /styles\.boardRoomMemberCountPill/);
    assert.match(appSource, /styles\.boardRoomMemberCountText/);
  });

  it('shows a room entry loading screen with members before opening a heavy social board', () => {
    const appSourceSlice = getFunctionSource('SnagApp', 'clampDrawingValue');
    const joinHandlerStart = appSource.indexOf('async function handleJoinBoardRoom');
    const joinHandlerEnd = appSource.indexOf('function handleSelectBoardRoom', joinHandlerStart);
    const boardSource = getFunctionSource('BoardView', 'BoardGrid');

    assert.match(appSourceSlice, /enteringBoardRoomId/);
    assert.match(appSourceSlice, /enteringBoardRoom/);
    assert.match(appSourceSlice, /setEnteringBoardRoomId\(roomId\)/);
    assert.match(appSource.slice(joinHandlerStart, joinHandlerEnd), /openBoardRoomWithLoading\(nextRoom\.id\)/);
    assert.match(appSource.slice(joinHandlerStart, joinHandlerEnd), /loadJoinedSocialBoardsAsync/);
    assert.match(boardSource, /joiningRoom &&/);
    assert.match(boardSource, /Entering room\.\.\./);
    assert.match(boardSource, /styles\.boardLobbyLoadingOverlay/);
    assert.match(appSourceSlice, /requestAnimationFrame/);
    assert.match(appSourceSlice, /<BoardEntryLoadingScreen/);
    assert.match(appSource, /function BoardEntryLoadingScreen/);
    assert.match(appSource, /getBoardEntryLoadingPresentation/);
    assert.match(appSource, /boardEntryLoadingScreen/);
  });

  it('avoids preloading every social board image during startup', () => {
    assert.equal(appSource.includes('preloadBoardSnapshotImages'), false);
    assert.match(appSource, /getBoardRoomPrefetchSnags/);
    assert.match(appSource, /function handleSelectBoardRoom/);
    assert.match(appSource, /preloadBoardRoomImages\(\s*enteringBoardRoomId,/);
  });

  it('keeps free-board snag gesture surfaces full-board without blocking nearby idle snags', () => {
    const source = getFunctionSource('BoardView', 'BoardGrid');

    assert.match(source, /gestureSurface="full-board"/);
    assert.equal(source.includes("gestureSurface={trashState.draggingId === item.id ? 'full-board' : 'item'}"), false);
  });

  it('keeps collection snag gesture surfaces full-board so held snags can pinch from the board', () => {
    const source = getFunctionSource('CollectionView', 'BoardView');

    assert.match(source, /gestureSurface="full-board"/);
  });

  it('caches social board snag transforms immediately so force-closing the app keeps the last layout', () => {
    const transformSource = getFunctionSource('handleBoardSnagTransformEnd', 'handleSnagBringToFront');
    const cacheSource = getFunctionSource('cacheCurrentSocialBoardSnapshot', 'persistBoardSnagTransform');

    assert.match(cacheSource, /saveSocialBoardCacheAsync\(snapshot\)/);
    assert.match(transformSource, /cacheCurrentSocialBoardSnapshot\(\{\s*snagsByRoomId: boardSnagsByRoomIdRef\.current,\s*\}\)/);
  });

  it('adds pasted board snags to the ref and cache before React effects run', () => {
    const source = getFunctionSource('handlePasteBoardSnag', 'handleOpenCategoryTextDialog');

    assert.match(source, /boardSnagsByRoomIdRef\.current = \{/);
    assert.match(source, /setBoardSnagsByRoomId\(boardSnagsByRoomIdRef\.current\)/);
    assert.match(source, /cacheCurrentSocialBoardSnapshot\(\{\s*snagsByRoomId: boardSnagsByRoomIdRef\.current,\s*\}\)/);
  });

  it('moves the board canvas with an Animated value while throttling React scroll state commits', () => {
    const source = getFunctionSource('BoardView', 'BoardGrid');

    assert.match(source, /new Animated\.ValueXY/);
    assert.match(source, /applyBoardVisualOffset/);
    assert.match(source, /maybeCommitBoardScrollOffset/);
    assert.match(source, /getBoardPanStateCommitConfig/);
    assert.match(source, /AnimatedPressable/);
    assert.equal(source.includes('commitBoardScrollOffset(nextOffset);\n        showBoardMiniMapTemporarily();'), false);
  });

  it('does not attach the paste long press handler to the fixed All collection page', () => {
    assert.match(appSource, /onLongPress=\{isAllCategory \? undefined : \(event\) => handleBoardLongPress\(category\.id, event\)\}/);
  });

  it('seeds the category pager with the saved page offset before the first collection paint', () => {
    const source = getFunctionSource('CollectionView', 'clampDrawingValue');

    assert.match(source, /initialCategoryPageOffset/);
    assert.match(source, /getCategoryPageOffset\(\{/);
    assert.match(source, /contentOffset=\{\{ x: 0, y: initialCategoryPageOffset \}\}/);
  });

  it('keeps the startup loading overlay until the saved category page is measured and snapped', () => {
    const appSourceSlice = getFunctionSource('SnagApp', 'clampDrawingValue');
    const collectionSource = getFunctionSource('CollectionView', 'clampDrawingValue');

    assert.match(appSourceSlice, /collectionBootReady/);
    assert.match(appSourceSlice, /handleCollectionInitialPageReady/);
    assert.match(appSourceSlice, /onInitialPageReady=\{handleCollectionInitialPageReady\}/);
    assert.match(appSourceSlice, /\{appLoading && \(\s*<AppLoadingScreen fontFamily=\{brandFont\} \/>/);
    assert.doesNotMatch(appSourceSlice, /\) : appLoading \? \(/);
    assert.match(collectionSource, /onInitialPageReady/);
    assert.match(collectionSource, /measuredHeight <= 0/);
    assert.match(collectionSource, /onInitialPageReady\(\)/);
  });

  it('adds a social app invite prompt that uses the native share sheet from the lobby', () => {
    const boardSource = getFunctionSource('BoardView', 'BoardGrid');

    assert.match(appSource, /Share,/);
    assert.match(boardSource, /handleShareSnagInvite/);
    assert.match(boardSource, /getBoardInviteShareCopy\(\{/);
    assert.match(boardSource, /Share\.share\(\{/);
    assert.match(boardSource, /styles\.boardInvitePrompt/);
    assert.match(boardSource, /Start together/);
    assert.match(boardSource, /Share Snag \+ Create a room/);
    assert.doesNotMatch(boardSource, /Share Snag \+ join code/);
    assert.doesNotMatch(boardSource, /Bring friends in/);
  });

  it('keeps board copy state keyed to the active room until the feedback timeout finishes', () => {
    const source = getFunctionSource('BoardView', 'BoardGrid');

    assert.match(source, /roomId: roomId,/);
    assert.match(source, /copyAnchor\?\.roomId === room\.id/);
    assert.match(source, /currentAnchor\?\.roomId === anchor\.roomId/);
  });

  it('delays clearing the move-unlocked board state so the outline can fade out cleanly', () => {
    assert.match(appSource, /getSnagReleaseUnlockDelayMs\(\)/);
  });

  it('warms social board images quietly after startup interactions', () => {
    assert.match(appSource, /InteractionManager\.runAfterInteractions/);
    assert.match(appSource, /BOARD_IDLE_WARMUP_DELAY_MS/);
    assert.match(appSource, /getNextBoardWarmupRequest/);
    assert.match(appSource, /boardWarmupKeysRef/);
  });

  it('keeps owner-only social member safety actions inside the members tray', () => {
    const source = getFunctionSource('BoardMembersTray', 'SettingsOverlay');

    assert.match(source, /canManageBoardMember/);
    assert.match(source, /Make Owner/);
    assert.match(source, /Kick/);
    assert.match(source, /Report/);
    assert.doesNotMatch(source, /Block/);
    assert.match(source, /onMakeOwner/);
    assert.match(source, /onKickMember/);
    assert.match(source, /onReportMember/);
    assert.doesNotMatch(source, /onBlockMember/);
  });

  it('passes Free social limit state into the board lobby and board actions', () => {
    assert.match(appSource, /getBoardLimitState/);
    assert.match(appSource, /boardLimitState/);
    assert.match(appSource, /snagLimitCopy/);
  });

  it('shows a missing room message for failed invite joins without creating local cloud fallbacks', () => {
    const boardSource = getFunctionSource('BoardView', 'BoardGrid');
    const joinHandlerStart = appSource.indexOf('async function handleJoinBoardRoom');
    const joinHandlerEnd = appSource.indexOf('function handleSelectBoardRoom', joinHandlerStart);

    assert.notEqual(joinHandlerStart, -1);
    assert.notEqual(joinHandlerEnd, -1);
    assert.match(boardSource, /getBoardJoinFailureCopy\(\)\.message/);
    assert.match(boardSource, /joinError &&/);
    assert.match(boardSource, /styles\.boardJoinNotice/);
    assert.match(boardSource, /onJoinRoom: \(inviteCode: string\) => Promise<boolean>/);
    assert.match(appSource.slice(joinHandlerStart, joinHandlerEnd), /Promise<boolean>/);
    assert.doesNotMatch(appSource.slice(joinHandlerStart, joinHandlerEnd), /client: null/);
  });

  it('never replaces a failed cloud room creation with a same-code local room', () => {
    const source = getFunctionSource('handleCreateBoardRoom', 'handleJoinBoardRoom');
    const joinSource = getFunctionSource('handleJoinBoardRoom', 'handleSelectBoardRoom');

    assert.doesNotMatch(source, /client: null/);
    assert.match(source, /Could not create cloud board room/);
    assert.match(source, /return null/);
    assert.doesNotMatch(joinSource, /room\.code === nextRoom\.code/);
    assert.match(joinSource, /room\.id === nextRoom\.id/);
  });

  it('renders first-run starter guidance only on the first empty collection category', () => {
    const collectionSource = getFunctionSource('CollectionView', 'clampDrawingValue');

    assert.match(collectionSource, /onOpenCamera/);
    assert.match(collectionSource, /const firstCollectionCategoryId = categories\.find\(\(item\) => !isAllCollectionAutoArranged\(\{ categoryId: item\.id \}\)\)\?\.id/);
    assert.match(collectionSource, /const hasStarterBlockingDrawing = \(drawingsByCategoryId\[category\.id\] \?\? \[\]\)\.length > 0/);
    assert.match(collectionSource, /const showStarterPrompts = category\.id === firstCollectionCategoryId && !isAllCategory && visibleSnags\.length === 0 && !isDrawingCategory && !hasStarterBlockingDrawing/);
    assert.match(collectionSource, /<CollectionStarterPrompt/);
    assert.match(collectionSource, /onPromptPress=\{onOpenCamera\}/);
    assert.match(appSource, /function CollectionStarterPrompt/);
    assert.match(appSource, /Start with something nearby\./);
    assert.match(appSource, /set your nickname\?/);
    assert.match(appSource, /swipe right/);
    assert.match(appSource, /tap camera/);
    assert.match(appSource, /collectionStarterCameraLine/);
    assert.match(appSource, /const promptTop = Math\.max\(214, viewportHeight \* 0\.43\)/);
    assert.match(appSource, /const lineHeight = Math\.min\(Math\.max\(viewportHeight - promptTop - 22, 238\), 332\)/);
    assert.match(appSource, /const cameraLineCenterX = promptWidth \/ 2/);
    assert.match(appSource, /const lineEndX = cameraLineCenterX/);
    assert.match(appSource, /const lineEndY = lineHeight - 34/);
    assert.match(appSource, /viewBox=\{`0 0 \$\{promptWidth\} \$\{lineHeight\}`\}/);
    assert.match(appSource, /d=\{`M\$\{cameraLineCenterX - 30\} 12 C\$\{cameraLineCenterX \+ 58\} \$\{lineHeight \* 0\.22\} \$\{cameraLineCenterX - 42\} \$\{lineHeight \* 0\.64\} \$\{lineEndX\} \$\{lineEndY\}`\}/);
    assert.match(appSource, /d=\{`M\$\{lineEndX - 18\} \$\{lineEndY - 10\} L\$\{lineEndX\} \$\{lineEndY\} L\$\{lineEndX \+ 6\} \$\{lineEndY - 22\}`\}/);
    assert.doesNotMatch(appSource, /collectionStarterSwipeArrow/);
    assert.doesNotMatch(appSource, /on your desk/);
    assert.doesNotMatch(appSource, /tiny favorite/);
    assert.doesNotMatch(appSource, /funny face/);
  });

  it('shows a light drag hint next to a freshly snagged item until the first interaction', () => {
    const collectionSource = getFunctionSource('CollectionView', 'clampDrawingValue');
    const stagedHintSource = getFunctionSource('StagedSnagHint', 'BoardStarterPrompt');

    assert.match(appSource, /function StagedSnagHint/);
    assert.match(appSource, /drag it around\./);
    assert.doesNotMatch(stagedHintSource, /<Svg/);
    assert.doesNotMatch(stagedHintSource, /stagedSnagHintArrow/);
    assert.match(collectionSource, /item\.id === stagedSnagId && \(/);
    assert.match(collectionSource, /<StagedSnagHint/);
    assert.match(appSource, /onSnagInteractionStart=\{settleStagedSnag\}/);
  });

  it('adds a handwritten empty-board invite prompt pinned inside the board canvas', () => {
    const boardSource = getFunctionSource('BoardView', 'BoardGrid');
    const boardPromptSource = getFunctionSource('BoardStarterPrompt', 'SnagApp');
    const canvasIndex = boardSource.indexOf('style={[\n            styles.boardCanvas');
    const promptIndex = boardSource.indexOf('{showBoardStarterPrompt && (');
    const canvasCloseIndex = boardSource.indexOf('</AnimatedPressable>', canvasIndex);

    assert.match(appSource, /function BoardStarterPrompt/);
    assert.match(appSource, /invite a friend\. make this board together!/);
    assert.doesNotMatch(appSource, /invite a friend to drop something here\./);
    assert.doesNotMatch(boardPromptSource, /<Svg/);
    assert.doesNotMatch(boardPromptSource, /boardStarterArrow/);
    assert.match(boardSource, /const showBoardStarterPrompt = snags\.length === 0 && !isDrawingBoard && \(drawingsByRoomId\[room\.id\] \?\? \[\]\)\.length === 0/);
    assert.match(boardSource, /showBoardStarterPrompt && \(/);
    assert.match(boardSource, /<BoardStarterPrompt/);
    assert.match(boardSource, /fontFamily=\{brandFont\}/);
    assert.ok(canvasIndex < promptIndex);
    assert.ok(promptIndex < canvasCloseIndex);
  });

  it('places the starter side hints where they point at the real controls', () => {
    assert.match(appSource, /const swipeTop = Math\.max\(132, viewportHeight \* 0\.23\)/);
    assert.match(appSource, /collectionStarterSwipeHint: \{/);
    assert.match(appSource, /right: 12/);
    assert.match(appSource, /collectionStarterNameHint: \{/);
    assert.match(appSource, /top: 108/);
    assert.match(appSource, /<Text style=\{\[styles\.collectionStarterSideText, \{ fontFamily \}\]\}>set your nickname\?<\/Text>\s*<Svg height=\{54\} width=\{78\} style=\{styles\.collectionStarterNameArrow\}>/);
    assert.match(appSource, /d="M42 49 C39 35 35 21 30 8"/);
    assert.match(appSource, /d="M30 8 L21 21 M30 8 L44 15"/);
    assert.match(appSource, /position: 'absolute',\s*left: 50,\s*top: -56/);
  });

  it('remounts the camera when switching lenses so the front camera can become ready before capture', () => {
    const startIndex = appSource.indexOf('function CaptureFlow');
    const endIndex = appSource.indexOf('const styles = StyleSheet.create', startIndex + 1);

    assert.notEqual(startIndex, -1, 'CaptureFlow should exist');
    assert.notEqual(endIndex, -1, 'styles should follow CaptureFlow');

    const source = appSource.slice(startIndex, endIndex);

    assert.match(source, /key=\{facing\}/);
    assert.match(source, /mirror=\{facing === 'front'\}/);
    assert.match(source, /const captureFlash = getCameraCaptureFlashMode\(\{ facing, flash \}\)/);
    assert.match(source, /flash=\{captureFlash\}/);
    assert.match(source, /disabled=\{isCapturing \|\| !cameraReady\}/);
    assert.match(source, /setCameraReady\(false\);\s*updateCameraZoom\(0\);\s*setFacing/);
  });

  it('offers a direct camera permission action before the preview is ready', () => {
    const startIndex = appSource.indexOf('function CaptureFlow');
    const endIndex = appSource.indexOf('const styles = StyleSheet.create', startIndex + 1);

    assert.notEqual(startIndex, -1, 'CaptureFlow should exist');
    assert.notEqual(endIndex, -1, 'styles should follow CaptureFlow');

    const source = appSource.slice(startIndex, endIndex);

    assert.match(source, /const cameraPermissionRequestStarted = useRef\(false\)/);
    assert.match(source, /void requestPermission\(\)/);
    assert.match(source, /permission\?\.canAskAgain === false \? 'Open settings' : 'Allow camera'/);
    assert.match(source, /onPress=\{permission\?\.canAskAgain === false \? openCameraSettings : handleRequestCameraPermission\}/);
    assert.match(source, /Linking\.openSettings\(\)/);
  });

  it('passes the existing camera flow into collection starter prompts', () => {
    assert.match(appSource, /onOpenCamera=\{handleOpenCameraFlow\}/);
  });

  it('adds Text creation to collection and board edit menus with an edit-only text action', () => {
    const categoryMenuSource = getFunctionSource('CategoryEditMenu', 'CategoryEditRow');
    const boardMenuSource = getFunctionSource('BoardEditMenu', 'BoardRenameDialog');
    const collectionSource = getFunctionSource('CollectionView', 'clampDrawingValue');
    const boardSource = getFunctionSource('BoardView', 'BoardGrid');

    assert.match(categoryMenuSource, /label="Text"/);
    assert.match(categoryMenuSource, /onPress=\{onTextPress\}/);
    assert.match(boardMenuSource, /label="Text"/);
    assert.match(boardMenuSource, /onPress=\{onTextPress\}/);
    assert.match(collectionSource, /onTextSnagEditRequest/);
    assert.match(collectionSource, /label="Edit"/);
    assert.match(boardSource, /onTextSnagEditRequest/);
    assert.match(boardSource, /label="Edit"/);
    assert.match(appSource, /function TextSnagDialog/);
    assert.match(appSource, /handleOpenCategoryTextDialog/);
    assert.match(appSource, /handleOpenBoardTextDialog/);
    assert.doesNotMatch(collectionSource, /label=\{getCopyActionLabel\(\{ copied: textEditAnchor/);
  });

  it('adds a collection Save action above Copy for transparent image snags', () => {
    const collectionSource = getFunctionSource('CollectionView', 'clampDrawingValue');
    const saveIndex = collectionSource.indexOf('accessibilityLabel="Save snag"');
    const copyIndex = collectionSource.indexOf('accessibilityLabel="Copy snag"');

    assert.match(appSource, /saveSnagImageToLibraryAsync/);
    assert.match(collectionSource, /async function handleSavePress/);
    assert.match(collectionSource, /getSaveActionLabel\(\{ confirming: copyAnchor\.saveConfirming === true, saved: copyAnchor\.saved === true \}\)/);
    assert.match(collectionSource, /saveActionPresentation = getCopyActionPresentation\(\{ actionWidth: 132, viewportWidth: width \}\)/);
    assert.match(collectionSource, /copyActionShiftedPresentation/);
    assert.notEqual(saveIndex, -1);
    assert.notEqual(copyIndex, -1);
    assert.ok(saveIndex < copyIndex);
    assert.doesNotMatch(getFunctionSource('BoardView', 'BoardGrid'), /accessibilityLabel="Save board snag"/);
  });

  it('asks for a second confirmation before saving a collection snag to Photos', () => {
    const collectionSource = getFunctionSource('CollectionView', 'clampDrawingValue');

    assert.match(appSource, /saveConfirming\?: boolean/);
    assert.match(collectionSource, /if \(!anchor\.saveConfirming\)/);
    assert.match(collectionSource, /setCopyAnchor\(\{ \.\.\.anchor, saveConfirming: true \}\)/);
    assert.match(collectionSource, /return;\n\s+}\n\n\s+try \{/);
    assert.match(collectionSource, /getSaveActionLabel\(\{ confirming: copyAnchor\.saveConfirming === true, saved: copyAnchor\.saved === true \}\)/);
  });
});
