import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync(new URL('../src/native/board-snag-preview.ts', import.meta.url), 'utf8');

describe('board snag preview native loading', () => {
  it('does not import expo-image-manipulator at module load time', () => {
    assert.equal(/^import .*expo-image-manipulator/m.test(source), false);
    assert.match(source, /loadImageManipulatorAsync/);
    assert.match(source, /import\('expo-image-manipulator'\)/);
  });
});
