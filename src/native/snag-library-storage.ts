import { Directory, File, Paths } from 'expo-file-system';

import type { SnagItem } from '@/data/snags';
import {
  createSnagLibrarySnapshot,
  getDefaultSnagLibraryState,
  getStoredSnagImageName,
  parseSnagLibrarySnapshot,
  type SnagLibraryState,
} from '@/utils/snag-library';

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

export async function loadSnagLibraryAsync(): Promise<SnagLibraryState> {
  ensureLibraryStorage();

  const libraryFile = getLibraryFile();

  if (!libraryFile.exists) {
    return getDefaultSnagLibraryState();
  }

  const rawSnapshot = await libraryFile.text();
  return parseSnagLibrarySnapshot(rawSnapshot);
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

  if (snag.imageUri === storedImage.uri) {
    return snag;
  }

  const sourceImage = new File(snag.imageUri);
  await sourceImage.copy(storedImage, { overwrite: true });

  return {
    ...snag,
    imageUri: storedImage.uri,
  };
}
