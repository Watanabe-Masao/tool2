import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';
import { SessionStorageService } from '@/utils/sessionStorageService';
import { SUCCESS_MESSAGES } from '@/messages';

/**
 * useDraftActionsのパラメータ
 */
interface UseDraftActionsParams {
  user: { uid: string } | null;
  reset: UseFormReturn<OrderFormData>['reset'];
  setRestoreDialogOpen: (open: boolean) => void;
  showSuccess: (message: string) => void;
  setActiveStep: (step: number) => void;
  isInitialLoad: React.MutableRefObject<boolean>;
}

/**
 * useDraftActions
 *
 * 下書き管理機能を提供するカスタムフック
 *
 * 責務:
 * - 下書きの復元
 * - 下書きの破棄
 *
 * @example
 * ```typescript
 * const {
 *   handleRestoreDraft,
 *   handleDiscardDraft,
 * } = useDraftActions({
 *   user,
 *   reset,
 *   setRestoreDialogOpen,
 *   showSuccess,
 *   setActiveStep,
 *   isInitialLoad,
 * });
 * ```
 */
export const useDraftActions = ({
  user,
  reset,
  setRestoreDialogOpen,
  showSuccess,
  setActiveStep,
  isInitialLoad,
}: UseDraftActionsParams) => {
  /**
   * 下書きを復元
   *
   * SessionStorageから下書きを読み込み、フォームに適用する。
   * 復元後は最初のステップに戻り、自動保存を一時的に無効化する。
   */
  const handleRestoreDraft = useCallback(() => {
    if (!user) return;

    const draft = SessionStorageService.loadDraft(user.uid);
    if (draft) {
      reset(draft);
      setRestoreDialogOpen(false);
      showSuccess(SUCCESS_MESSAGES.draftRestored);

      // 最初のステップに戻す
      setActiveStep(0);

      isInitialLoad.current = true; // 復元後は自動保存を一時的に無効化
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 1000);
    }
  }, [user, reset, setRestoreDialogOpen, showSuccess, setActiveStep, isInitialLoad]);

  /**
   * 下書きを破棄
   *
   * SessionStorageから下書きを削除し、ダイアログを閉じる。
   */
  const handleDiscardDraft = useCallback(() => {
    if (!user) return;

    SessionStorageService.clearDraft(user.uid);
    setRestoreDialogOpen(false);
  }, [user, setRestoreDialogOpen]);

  return {
    handleRestoreDraft,
    handleDiscardDraft,
  };
};
