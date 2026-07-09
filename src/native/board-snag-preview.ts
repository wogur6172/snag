import type { SnagItem } from '@/data/snags';
import {
  BOARD_SNAG_PREVIEW_QUALITY,
  getBoardSnagPreviewDimensions,
  getBoardSnagPreviewResizeAction,
} from '@/utils/board-images';

type ImageManipulatorModule = typeof import('expo-image-manipulator');
type ImageManipulatorLoader = () => Promise<ImageManipulatorModule>;

function loadImageManipulatorAsync() {
  return import('expo-image-manipulator');
}

export async function createBoardSnagPreviewAsync(
  snag: SnagItem,
  loadManipulatorAsync: ImageManipulatorLoader = loadImageManipulatorAsync,
): Promise<SnagItem> {
  if (snag.kind === 'text' || !snag.imageUri) {
    return snag;
  }

  const { manipulateAsync, SaveFormat } = await loadManipulatorAsync();
  const resizeAction = getBoardSnagPreviewResizeAction({
    height: snag.imageHeight,
    width: snag.imageWidth,
  });
  const preview = await manipulateAsync(
    snag.imageUri,
    resizeAction ? [{ resize: resizeAction }] : [],
    {
      compress: BOARD_SNAG_PREVIEW_QUALITY,
      format: SaveFormat.WEBP,
    },
  );
  const fallbackDimensions = getBoardSnagPreviewDimensions({
    height: snag.imageHeight,
    width: snag.imageWidth,
  });

  return {
    ...snag,
    imageHeight: preview.height ?? fallbackDimensions.height ?? snag.imageHeight,
    imageUri: preview.uri,
    imageWidth: preview.width ?? fallbackDimensions.width ?? snag.imageWidth,
  };
}
