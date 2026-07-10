export const SNAG_PUBLIC_LINKS = [
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
] as const;

export async function openSnagPublicLinkAsync(
  url: string,
  openURL: (url: string) => Promise<unknown>,
) {
  try {
    await openURL(url);
    return true;
  } catch {
    return false;
  }
}
