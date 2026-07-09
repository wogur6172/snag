import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync(new URL('../src/native/snag-clipboard.ts', import.meta.url), 'utf8');

describe('snag clipboard source', () => {
  it('copies remote board images by fetching them before writing to the native clipboard', () => {
    assert.match(source, /imageUri\.startsWith\('http:\/\/'\)/);
    assert.match(source, /imageUri\.startsWith\('https:\/\/'\)/);
    assert.match(source, /await fetch\(imageUri\)/);
    assert.match(source, /Clipboard\.setImageAsync/);
  });
});
