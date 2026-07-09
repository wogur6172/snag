import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync(new URL('../src/components/editable-cutout.tsx', import.meta.url), 'utf8');

describe('editable cutout gesture source', () => {
  it('keeps manual move and rotate gestures explicit about running on JS', () => {
    assert.match(source, /const pan = Gesture\.Pan\(\)[\s\S]*?\.runOnJS\(true\)[\s\S]*?\.onUpdate/);
    assert.match(source, /const rotate = Gesture\.Rotation\(\)[\s\S]*?\.runOnJS\(true\)[\s\S]*?\.onUpdate/);
  });
});
