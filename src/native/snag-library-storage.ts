import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import type { SnagItem } from '@/data/snags';
import {
  createSnagLibrarySnapshot,
  getDefaultSnagLibraryState,
  getStoredSnagImageName,
  parseSnagLibrarySnapshot,
  resolveStoredSnagImageUri,
  type SnagLibraryState,
} from '@/utils/snag-library';
import {
  LOCAL_SNAG_PREVIEW_QUALITY,
  getLocalSnagPreviewResizeAction,
  getStoredSnagPreviewName,
} from '@/utils/local-snag-preview';

const LIBRARY_DIRECTORY = 'snag-library';
const IMAGE_DIRECTORY = 'images';
const LIBRARY_FILE = 'library.json';

function getLibraryDirectory() {
  return new Directory(Paths.document, LIBRARY_DIRECTORY);
}

function getImageDirectory() {
  return new Directory(getLibraryDirectory(), IMAGE_DIRECTORY);
}

function getLibraryFile() {
  return new File(getLibraryDirectory(), LIBRARY_FILE);
}

function ensureLibraryStorage() {
  getLibraryDirectory().create({ idempotent: true, intermediates: true });
  getImageDirectory().create({ idempotent: true, intermediates: true });
}

export function resolvePersistedSnagImage(snag: SnagItem): SnagItem {
  if (snag.kind === 'text' || !snag.imageUri) {
    return snag;
  }

  const storedImage = new File(getImageDirectory(), getStoredSnagImageName(snag));
  const storedPreview = new File(getImageDirectory(), getStoredSnagPreviewName(snag));
  const snapshotPreview = snag.previewUri ? new File(snag.previewUri) : null;
  const imageUri = resolveStoredSnagImageUri({
    imageUri: snag.imageUri,
    storedImageExists: storedImage.exists,
    storedImageUri: storedImage.uri,
  });
  const previewUri = storedPreview.exists
    ? storedPreview.uri
    : snapshotPreview?.exists
      ? snapshotPreview.uri
      : undefined;

  return imageUri === snag.imageUri && previewUri === snag.previewUri
    ? snag
    : {
        ...snag,
        imageUri,
        previewUri,
      };
}

export async function persistSnagPreviewAsync(snag: SnagItem): Promise<SnagItem> {
  if (snag.kind === 'text' || !snag.imageUri) {
    return snag;
  }

  const resizeAction = getLocalSnagPreviewResizeAction({
    height: snag.imageHeight,
    width: snag.imageWidth,
  });

  if (!resizeAction) {
    return snag;
  }

  ensureLibraryStorage();

  const storedPreview = new File(getImageDirectory(), getStoredSnagPreviewName(snag));

  if (!storedPreview.exists) {
    const preview = await manipulateAsync(
      snag.imageUri,
      [{ resize: resizeAction }],
      {
        compress: LOCAL_SNAG_PREVIEW_QUALITY,
        format: SaveFormat.WEBP,
      },
    );
    const generatedPreview = new File(preview.uri);
    await generatedPreview.copy(storedPreview, { overwrite: true });
  }

  return {
    ...snag,
    previewUri: storedPreview.uri,
  };
}

export async function loadSnagLibraryAsync(): Promise<SnagLibraryState> {
  ensureLibraryStorage();

  const libraryFile = getLibraryFile();

  if (!libraryFile.exists) {
    return getDefaultSnagLibraryState();
  }

  const rawSnapshot = await libraryFile.text();
  const state = parseSnagLibrarySnapshot(rawSnapshot);

  return {
    ...state,
    snags: state.snags.map(resolvePersistedSnagImage),
  };
}

export async function saveSnagLibraryAsync(state: SnagLibraryState) {
  ensureLibraryStorage();

  const libraryFile = getLibraryFile();
  const snapshot = createSnagLibrarySnapshot(state);
  libraryFile.write(JSON.stringify(snapshot, null, 2));
}

export async function persistSnagImageAsync(snag: SnagItem): Promise<SnagItem> {
  if (snag.kind === 'text' || !snag.imageUri) {
    return snag;
  }

  ensureLibraryStorage();

  const imageDirectory = getImageDirectory();
  const storedImage = new File(imageDirectory, getStoredSnagImageName(snag));

  let storedSnag = snag;

  if (snag.imageUri !== storedImage.uri) {
    const sourceImage = new File(snag.imageUri);
    await sourceImage.copy(storedImage, { overwrite: true });
    storedSnag = {
      ...snag,
      imageUri: storedImage.uri,
    };
  }

  return persistSnagPreviewAsync(storedSnag);
}
