import * as Clipboard from 'expo-clipboard';
import { Directory, File, Paths } from 'expo-file-system';

type ClipboardSnagAsset = {
  height?: number;
  uri: string;
  width?: number;
};

const CLIPBOARD_DIRECTORY = 'snag-clipboard';

function getClipboardDirectory() {
  return new Directory(Paths.cache, CLIPBOARD_DIRECTORY);
}

function ensureClipboardStorage() {
  getClipboardDirectory().create({ idempotent: true, intermediates: true });
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triplet = (first << 16) | (second << 8) | third;

    output += alphabet[(triplet >> 18) & 63];
    output += alphabet[(triplet >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(triplet >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? alphabet[triplet & 63] : '=';
  }

  return output;
}

function stripDataUriPrefix(dataUri: string) {
  const separatorIndex = dataUri.indexOf(',');
  return separatorIndex >= 0 ? dataUri.slice(separatorIndex + 1) : dataUri;
}

function isRemoteImageUri(imageUri: string) {
  return imageUri.startsWith('http://') || imageUri.startsWith('https://');
}

async function readImageArrayBufferAsync(imageUri: string) {
  if (isRemoteImageUri(imageUri)) {
    const response = await fetch(imageUri);

    if (!response.ok) {
      throw new Error(`Could not load remote Snag image: ${response.status}`);
    }

    return response.arrayBuffer();
  }

  const sourceImage = new File(imageUri);
  return sourceImage.arrayBuffer();
}

export async function copySnagImageAsync(imageUri: string) {
  const base64Image = arrayBufferToBase64(await readImageArrayBufferAsync(imageUri));

  await Clipboard.setImageAsync(base64Image);
}

export async function getClipboardSnagImageAsync(): Promise<ClipboardSnagAsset | null> {
  const hasImage = await Clipboard.hasImageAsync();

  if (!hasImage) {
    return null;
  }

  const clipboardImage = await Clipboard.getImageAsync({ format: 'png' });

  if (!clipboardImage?.data) {
    return null;
  }

  ensureClipboardStorage();

  const imageFile = new File(getClipboardDirectory(), `paste-${Date.now()}.png`);
  imageFile.write(stripDataUriPrefix(clipboardImage.data), { encoding: 'base64' });

  return {
    height: clipboardImage.size.height,
    uri: imageFile.uri,
    width: clipboardImage.size.width,
  };
}
