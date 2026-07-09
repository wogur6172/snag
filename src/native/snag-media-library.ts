import { Directory, File, Paths } from 'expo-file-system';

const MEDIA_LIBRARY_DIRECTORY = 'snag-media-library';

function getMediaLibraryDirectory() {
  return new Directory(Paths.cache, MEDIA_LIBRARY_DIRECTORY);
}

function ensureMediaLibraryStorage() {
  getMediaLibraryDirectory().create({ idempotent: true, intermediates: true });
}

function isRemoteImageUri(imageUri: string) {
  return imageUri.startsWith('http://') || imageUri.startsWith('https://');
}

async function getLocalSnagImageUriAsync(imageUri: string) {
  if (!isRemoteImageUri(imageUri)) {
    return imageUri;
  }

  ensureMediaLibraryStorage();

  const imageFile = new File(getMediaLibraryDirectory(), `snag-save-${Date.now()}.png`);
  const downloadedFile = await File.downloadFileAsync(imageUri, imageFile);

  return downloadedFile.uri;
}

export async function saveSnagImageToLibraryAsync(imageUri: string) {
  const { Asset, requestPermissionsAsync } = await import('expo-media-library');
  const permission = await requestPermissionsAsync(true);

  if (permission.status !== 'granted') {
    throw new Error('Photo library save permission was not granted.');
  }

  const localUri = await getLocalSnagImageUriAsync(imageUri);
  await Asset.create(localUri);
}
