import { getDefaultSnagLibraryState } from './snag-library.ts';

export type AccountDeletionStatus = 'idle' | 'confirming' | 'deleting' | 'failed' | 'deleted';

export const ACCOUNT_DELETION_COPY = {
  action: 'Delete my data',
  body: "This permanently deletes your collection, Snags stored in Snag, nickname, shared-board posts, and account. Shared boards with other members will stay open under a new owner. Snags saved to Photos won't be deleted.",
  cancel: 'Cancel',
  confirm: 'Delete',
  title: 'Delete your data?',
} as const;

export function getAccountDeletionPresentation(status: AccountDeletionStatus) {
  switch (status) {
    case 'deleting':
      return {
        blocksInteraction: true,
        message: 'Deleting your data...',
      };
    case 'failed':
      return {
        blocksInteraction: false,
        message: "Couldn't delete your data. Nothing on this device was cleared. Please try again.",
      };
    case 'deleted':
      return {
        blocksInteraction: false,
        message: 'Your data has been deleted.',
      };
    default:
      return {
        blocksInteraction: false,
        message: '',
      };
  }
}

export function shouldClearLocalData(result: { deleted?: boolean } | null | undefined) {
  return result?.deleted === true;
}

export function getPostDeletionLibraryState() {
  return getDefaultSnagLibraryState();
}
