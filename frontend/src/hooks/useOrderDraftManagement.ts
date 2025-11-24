import { useEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';
import { SessionStorageService } from '@/utils/sessionStorageService';

/**
 * useOrderDraftManagementのパラメータ
 */
interface UseOrderDraftManagementParams {
  user: { uid: string } | null;
  methods: UseFormReturn<OrderFormData>;
  products: any[] | undefined;
  suppliers: string[] | undefined;
  deliveryDate: Date | null | undefined;
}

/**
 * useOrderDraftManagement
 *
 * 注文フォームの下書き管理機能を提供するカスタムフック
 *
 * 責務:
 * - 初回ロード時の下書き復元確認
 * - フォームデータの自動保存（debounce付き）
 * - ページ離脱時の警告表示
 *
 * @example
 * ```typescript
 * const {
 *   restoreDialogOpen,
 *   setRestoreDialogOpen,
 *   hasUnsavedChanges,
 *   setHasUnsavedChanges,
 * } = useOrderDraftManagement({
 *   user,
 *   methods,
 *   products,
 *   suppliers,
 *   deliveryDate,
 * });
 * ```
 */
export const useOrderDraftManagement = ({
  user,
  methods,
  products,
  suppliers,
  deliveryDate,
}: UseOrderDraftManagementParams) => {
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimer = useRef<number | null>(null);
  const isInitialLoad = useRef(true);

  /**
   * 下書き復元確認
   * 初回ロード時に下書きが存在する場合、復元ダイアログを表示
   */
  useEffect(() => {
    if (!user || !isInitialLoad.current) return;

    isInitialLoad.current = false;

    const draft = SessionStorageService.loadDraft(user.uid);
    if (draft) {
      setRestoreDialogOpen(true);
    }
  }, [user]);

  /**
   * フォームデータの自動保存（debounce付き）
   * React#185対策: watch()を使わず、必要なフィールドのみ監視
   */
  useEffect(() => {
    if (!user || isInitialLoad.current) return;

    // 変更があることをマーク
    setHasUnsavedChanges(true);

    // 既存のタイマーをクリア
    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
    }

    // 2秒後に自動保存
    autoSaveTimer.current = window.setTimeout(() => {
      const currentFormData = methods.getValues();
      SessionStorageService.saveDraft(user.uid, currentFormData);
      console.log('Form auto-saved');
    }, 2000);

    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current);
      }
    };
  }, [products, suppliers, deliveryDate, user, methods]);

  /**
   * ページ離脱時の警告
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return {
    restoreDialogOpen,
    setRestoreDialogOpen,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    isInitialLoad,
  };
};
