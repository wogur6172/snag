import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync(new URL('../src/components/transformable-snag.tsx', import.meta.url), 'utf8');

describe('transformable snag image rendering', () => {
  it('asks expo-image to downscale large legacy images before display', () => {
    assert.match(source, /allowDownscaling/);
    assert.match(source, /enforceEarlyResizing/);
  });

  it('supports item-sized gesture surfaces so idle board snags stay lightweight', () => {
    assert.match(source, /gestureSurface = 'full-board'/);
    assert.match(source, /surface: gestureSurface/);
    assert.match(source, /pointerEvents=\{isTransformUnlocked \? 'auto' : 'box-none'\}/);
    assert.match(source, /baseTranslateX\.value - transformGestureFrame\.left/);
  });

  it('renders text snags as editable text instead of copyable images', () => {
    assert.match(source, /import \{ StyleSheet, Text, View \} from 'react-native'/);
    assert.match(source, /const isTextItem = item\.kind === 'text'/);
    assert.match(source, /function reportTextEditRequest/);
    assert.match(source, /isTextItem \? reportTextEditRequest : reportCopyRequest/);
    assert.match(source, /styles\.textSticker/);
    assert.match(source, /item\.text/);
    assert.match(source, /numberOfLines=\{1\}/);
    assert.match(source, /allowFontScaling=\{false\}/);
    assert.match(source, /ellipsizeMode="clip"/);
    assert.match(source, /getTextSnagLayout\(\{ size, text: item\.text \?\? item\.title \}\)/);
    assert.match(source, /const itemWidth = textLayout\?\.width \?\? size/);
    assert.match(source, /const baseWidth = useSharedValue\(itemWidth\)/);
    assert.doesNotMatch(source, /adjustsFontSizeToFit/);
    assert.doesNotMatch(source, /numberOfLines=\{2\}/);
  });

  it('keeps low-frequency copy and edit long presses explicitly on the JS thread', () => {
    assert.match(source, /const longPress = Gesture\.LongPress\(\)[\s\S]*?\.runOnJS\(true\)[\s\S]*?\.onStart/);
    assert.doesNotMatch(source, /runOnJS\(isTextItem \? reportTextEditRequest : reportCopyRequest\)/);
  });

  it('marks high-frequency drag, pinch, and rotate callbacks as worklets', () => {
    assert.match(source, /const pan = panGesture[\s\S]*?\.onStart\(\(\) => \{\s*'worklet';/);
    assert.match(source, /const pan = panGesture[\s\S]*?\.onUpdate\(\(event\) => \{\s*'worklet';/);
    assert.match(source, /const pan = panGesture[\s\S]*?\.onEnd\(\(event\) => \{\s*'worklet';/);
    assert.match(source, /const pan = panGesture[\s\S]*?\.onFinalize\(\(\) => \{\s*'worklet';/);
    assert.match(source, /const pinch = Gesture\.Pinch\(\)[\s\S]*?\.onBegin\(\(\) => \{\s*'worklet';/);
    assert.match(source, /const pinch = Gesture\.Pinch\(\)[\s\S]*?\.onUpdate\(\(event\) => \{\s*'worklet';/);
    assert.match(source, /const pinch = Gesture\.Pinch\(\)[\s\S]*?\.onEnd\(\(\) => \{\s*'worklet';/);
    assert.match(source, /const rotate = Gesture\.Rotation\(\)[\s\S]*?\.onBegin\(\(\) => \{\s*'worklet';/);
    assert.match(source, /const rotate = Gesture\.Rotation\(\)[\s\S]*?\.onUpdate\(\(event\) => \{\s*'worklet';/);
    assert.match(source, /const rotate = Gesture\.Rotation\(\)[\s\S]*?\.onEnd\(\(\) => \{\s*'worklet';/);
  });

  it('keeps a dragged snag under the finger while its viewport edge-pans', () => {
    assert.match(source, /type SharedValue/);
    assert.match(source, /viewportOffsetX\?: SharedValue<number>/);
    assert.match(source, /viewportOffsetY\?: SharedValue<number>/);
    assert.match(source, /dragStartViewportOffsetX/);
    assert.match(source, /dragStartViewportOffsetY/);
    assert.match(source, /viewportDeltaX/);
    assert.match(source, /viewportDeltaY/);
    assert.match(source, /nextTranslateX = translateX\.value \+ viewportDeltaX/);
    assert.match(source, /nextTranslateY = translateY\.value \+ viewportDeltaY/);
  });

});
