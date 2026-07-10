import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  openSnagPublicLinkAsync,
  SNAG_PUBLIC_LINKS,
} from '../src/utils/public-links.ts';

describe('Snag public links', () => {
  it('keeps the public support and social destinations in one stable list', () => {
    assert.deepEqual(SNAG_PUBLIC_LINKS, [
      {
        accessibilityLabel: 'Email Snag support',
        id: 'email',
        label: 'Email',
        url: 'mailto:snagboardapp@gmail.com',
        value: 'snagboardapp@gmail.com',
      },
      {
        accessibilityLabel: 'Open Snag Board on Instagram',
        id: 'instagram',
        label: 'Instagram',
        url: 'https://www.instagram.com/snag_board/',
        value: '@Snag_board',
      },
      {
        accessibilityLabel: 'Open Snag Board on TikTok',
        id: 'tiktok',
        label: 'TikTok',
        url: 'https://www.tiktok.com/@snag_board',
        value: '@Snag_board',
      },
    ]);
  });

  it('reports whether the operating system opened a public link', async () => {
    const openedUrls = [];

    assert.equal(await openSnagPublicLinkAsync(
      'https://www.instagram.com/snag_board/',
      async (url) => {
        openedUrls.push(url);
      },
    ), true);
    assert.deepEqual(openedUrls, ['https://www.instagram.com/snag_board/']);

    assert.equal(await openSnagPublicLinkAsync(
      'mailto:snagboardapp@gmail.com',
      async () => {
        throw new Error('No mail app');
      },
    ), false);
  });
});
