import { Directory, File, Paths } from 'expo-file-system';

const AUTH_STORAGE_DIRECTORY = 'snag-social-auth';

function getAuthStorageDirectory() {
  return new Directory(Paths.document, AUTH_STORAGE_DIRECTORY);
}

function getAuthStorageFile(key: string) {
  const safeFileName = `${key.replace(/[^a-z0-9._-]/gi, '_')}.json`;

  return new File(getAuthStorageDirectory(), safeFileName);
}

function ensureAuthStorageDirectory() {
  getAuthStorageDirectory().create({ idempotent: true, intermediates: true });
}

export const snagSupabaseAuthStorage = {
  async getItem(key: string) {
    ensureAuthStorageDirectory();

    const file = getAuthStorageFile(key);

    if (!file.exists) {
      return null;
    }

    return file.text();
  },
  async removeItem(key: string) {
    ensureAuthStorageDirectory();

    const file = getAuthStorageFile(key);

    if (file.exists) {
      file.delete();
    }
  },
  async setItem(key: string, value: string) {
    ensureAuthStorageDirectory();
    getAuthStorageFile(key).write(value);
  },
};
