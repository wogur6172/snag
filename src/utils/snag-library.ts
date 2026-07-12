import type { SnagDrawingStroke, SnagItem } from '../data/snags';
import { DEFAULT_CATEGORY_BACKGROUND_STRENGTH, getCategoryBackground, getCategoryBackgroundStrength, type SnagCategoryItem } from './snags.ts';

export const SNAG_LIBRARY_VERSION = 1;
export const PROFILE_NAME_MAX_LENGTH = 16;

export type SnagUserSettings = {
  profileName: string;
};

export type SnagLibraryState = {
  categories: SnagCategoryItem[];
  categoryGridPreferences: Record<string, boolean>;
  drawingsByCategoryId: Record<string, SnagDrawingStroke[]>;
  settings: SnagUserSettings;
  selectedCategoryId: string;
  snagCount: number;
  snags: SnagItem[];
};

export type SnagLibrarySnapshot = SnagLibraryState & {
  version: typeof SNAG_LIBRARY_VERSION;
};

const ALL_CATEGORY: SnagCategoryItem = { id: 'all', title: 'All' };
const DEFAULT_CATEGORY: SnagCategoryItem = { background: 'grid', backgroundStrength: DEFAULT_CATEGORY_BACKGROUND_STRENGTH, color: '#FFD6D6', id: 'category-1', title: 'Category 1' };
const DEFAULT_SETTINGS: SnagUserSettings = {
  profileName: 'You',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function normalizeProfileDisplayName(value: unknown) {
  if (!isString(value)) {
    return DEFAULT_SETTINGS.profileName;
  }

  const trimmedName = value.trim().replace(/\s+/g, ' ');
  const compactName = trimmedName.slice(0, PROFILE_NAME_MAX_LENGTH).trim();

  return compactName.length > 0
    ? compactName
    : DEFAULT_SETTINGS.profileName;
}

export function getProfileDisplayName(settings?: Partial<SnagUserSettings>) {
  return normalizeProfileDisplayName(settings?.profileName);
}

function normalizeSettings(value: unknown): SnagUserSettings {
  if (!isRecord(value)) {
    return DEFAULT_SETTINGS;
  }

  return {
    profileName: normalizeProfileDisplayName(value.profileName),
  };
}

function normalizeCategoryGridPreferences(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, boolean>>((preferences, [categoryId, enabled]) => {
    if (categoryId.length === 0 || typeof enabled !== 'boolean') {
      return preferences;
    }

    return {
      ...preferences,
      [categoryId]: enabled,
    };
  }, {});
}

function normalizeCategories(value: unknown): SnagCategoryItem[] {
  const rawCategories = Array.isArray(value)
    ? value
      .filter(isRecord)
      .map((category) => {
        const normalizedCategory = {
          background: isString(category.background)
            ? getCategoryBackground({ background: category.background }).id
            : undefined,
          backgroundStrength: isNumber(category.backgroundStrength)
            ? getCategoryBackgroundStrength({ backgroundStrength: category.backgroundStrength })
            : undefined,
          color: isString(category.color) ? category.color : undefined,
          id: isString(category.id) ? category.id : '',
          title: isString(category.title) ? category.title : '',
        };

        const nextCategory: SnagCategoryItem = {
          color: normalizedCategory.color,
          id: normalizedCategory.id,
          title: normalizedCategory.title,
        };

        if (normalizedCategory.background) {
          nextCategory.background = normalizedCategory.background;
        }

        if (normalizedCategory.backgroundStrength !== undefined) {
          nextCategory.backgroundStrength = normalizedCategory.backgroundStrength;
        }

        return nextCategory;
      })
      .filter((category) => category.id.length > 0 && category.title.length > 0)
    : [];
  const customCategories = rawCategories.filter((category) => category.id !== ALL_CATEGORY.id);
  const categories = customCategories.length > 0 ? customCategories : [DEFAULT_CATEGORY];

  return [...categories, ALL_CATEGORY];
}

function normalizeSnags(value: unknown): SnagItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<SnagItem[]>((snags, candidate) => {
    if (!isRecord(candidate)) {
      return snags;
    }

    const candidateKind = candidate.kind === 'text' ? 'text' : 'image';
    const candidateText = isString(candidate.text) ? candidate.text.trim() : '';

    if (
      !isString(candidate.id) ||
      !isString(candidate.category) ||
      !isString(candidate.rotate) ||
      !isString(candidate.title) ||
      !isNumber(candidate.canvasX) ||
      !isNumber(candidate.canvasY) ||
      !isNumber(candidate.createdAt) ||
      !isNumber(candidate.size)
    ) {
      return snags;
    }

    if (candidateKind === 'image' && !isString(candidate.imageUri)) {
      return snags;
    }

    if (candidateKind === 'text' && !candidateText) {
      return snags;
    }

    const snag: SnagItem = {
      category: candidate.category,
      canvasX: candidate.canvasX,
      canvasY: candidate.canvasY,
      createdAt: candidate.createdAt,
      ...(candidate.excludeFromAll === true ? { excludeFromAll: true } : {}),
      id: candidate.id,
      ...(candidateKind === 'text' ? { kind: 'text' as const, text: candidateText } : {}),
      ...(isString(candidate.imageUri) ? { imageUri: candidate.imageUri } : {}),
      ...(isString(candidate.previewUri) ? { previewUri: candidate.previewUri } : {}),
      ...(isString(candidate.originSnagId) ? { originSnagId: candidate.originSnagId } : {}),
      rotate: candidate.rotate,
      size: candidate.size,
      title: candidate.title,
    };

    if (isNumber(candidate.layerIndex)) {
      snag.layerIndex = candidate.layerIndex;
    }

    if (isNumber(candidate.imageHeight)) {
      snag.imageHeight = candidate.imageHeight;
    }

    if (isNumber(candidate.imageWidth)) {
      snag.imageWidth = candidate.imageWidth;
    }

    return [...snags, snag];
  }, []);
}

function normalizeDrawingStrokes(value: unknown): SnagDrawingStroke[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<SnagDrawingStroke[]>((strokes, candidate) => {
    if (!isRecord(candidate) || !isString(candidate.id) || !isString(candidate.color) || !isNumber(candidate.width)) {
      return strokes;
    }

    if (!Array.isArray(candidate.points)) {
      return strokes;
    }

    const points = candidate.points
      .filter(isRecord)
      .map((point) => ({
        x: isNumber(point.x) ? point.x : Number.NaN,
        y: isNumber(point.y) ? point.y : Number.NaN,
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

    if (points.length < 2) {
      return strokes;
    }

    return [
      ...strokes,
      {
        color: candidate.color,
        id: candidate.id,
        points,
        width: Math.max(1, Math.min(candidate.width, 32)),
      },
    ];
  }, []);
}

function normalizeDrawingsByCategoryId(value: unknown): Record<string, SnagDrawingStroke[]> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, SnagDrawingStroke[]>>((drawings, [categoryId, strokes]) => {
    if (categoryId.length === 0) {
      return drawings;
    }

    const normalizedStrokes = normalizeDrawingStrokes(strokes);

    if (normalizedStrokes.length === 0) {
      return drawings;
    }

    return {
      ...drawings,
      [categoryId]: normalizedStrokes,
    };
  }, {});
}

export function getDefaultSnagLibraryState(): SnagLibraryState {
  return {
    categories: [DEFAULT_CATEGORY, ALL_CATEGORY],
    categoryGridPreferences: {},
    drawingsByCategoryId: {},
    settings: DEFAULT_SETTINGS,
    selectedCategoryId: DEFAULT_CATEGORY.id,
    snagCount: 0,
    snags: [],
  };
}

export function createSnagLibrarySnapshot(state: SnagLibraryState): SnagLibrarySnapshot {
  const categories = normalizeCategories(state.categories);
  const selectedCategoryExists = categories.some((category) => category.id === state.selectedCategoryId);
  const fallbackCategoryId = categories.find((category) => category.id !== ALL_CATEGORY.id)?.id ?? ALL_CATEGORY.id;

  return {
    categories,
    categoryGridPreferences: normalizeCategoryGridPreferences(state.categoryGridPreferences),
    drawingsByCategoryId: normalizeDrawingsByCategoryId(state.drawingsByCategoryId),
    settings: normalizeSettings(state.settings),
    selectedCategoryId: selectedCategoryExists ? state.selectedCategoryId : fallbackCategoryId,
    snagCount: Math.max(state.snagCount, state.snags.length),
    snags: normalizeSnags(state.snags),
    version: SNAG_LIBRARY_VERSION,
  };
}

export function parseSnagLibrarySnapshot(rawSnapshot: unknown): SnagLibraryState {
  try {
    const snapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;

    if (!isRecord(snapshot) || snapshot.version !== SNAG_LIBRARY_VERSION) {
      return getDefaultSnagLibraryState();
    }

    const categories = normalizeCategories(snapshot.categories);
    const categoryGridPreferences = normalizeCategoryGridPreferences(snapshot.categoryGridPreferences);
    const drawingsByCategoryId = normalizeDrawingsByCategoryId(snapshot.drawingsByCategoryId);
    const settings = normalizeSettings(snapshot.settings);
    const snags = normalizeSnags(snapshot.snags);
    const selectedCategoryId = isString(snapshot.selectedCategoryId) &&
      categories.some((category) => category.id === snapshot.selectedCategoryId)
      ? snapshot.selectedCategoryId
      : categories.find((category) => category.id !== ALL_CATEGORY.id)?.id ?? ALL_CATEGORY.id;
    const savedSnagCount = isNumber(snapshot.snagCount) ? snapshot.snagCount : 0;

    return {
      categories,
      categoryGridPreferences,
      drawingsByCategoryId,
      settings,
      selectedCategoryId,
      snagCount: Math.max(savedSnagCount, snags.length),
      snags,
    };
  } catch {
    return getDefaultSnagLibraryState();
  }
}

export function getStoredSnagImageName({
  id,
  imageUri,
}: {
  id: string;
  imageUri?: string;
}) {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-');
  const extensionMatch = imageUri?.match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
  const extension = extensionMatch?.[1]?.toLowerCase() || 'png';

  return `${safeId}.${extension}`;
}

export function resolveStoredSnagImageUri({
  imageUri,
  storedImageExists,
  storedImageUri,
}: {
  imageUri?: string;
  storedImageExists: boolean;
  storedImageUri: string;
}) {
  if (!imageUri?.startsWith('file://') || !storedImageExists) {
    return imageUri;
  }

  return storedImageUri;
}
