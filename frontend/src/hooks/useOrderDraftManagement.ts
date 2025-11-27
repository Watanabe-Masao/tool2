import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';
import { SessionStorageService } from '@/utils/sessionStorageService';

// 下書き復元ダイアログの表示済みフラグ（セッション中に一度だけ表示）
const DRAFT_DIALOG_SHOWN_KEY = 'draft-dialog-shown';

/**
 * useOrderDraftManagementのパラメータ
 *
 * NOTE: products, suppliers, deliveryDateは依存配列から除外
 * これらはuseWatchから取得され、毎回新しい参照が作成されるため
 * 無限ループ(React #185)を引き起こす
 * フォームデータはmethods.getValues()経由で取得するため問題なし
 */
interface UseOrderDraftManagementParams {
  user: { uid: string } | null;
  methods: UseFormReturn<OrderFormData>;
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
 *   triggerAutoSave,
 * } = useOrderDraftManagement({
 *   user,
 *   methods,
 * });
 *
 * // フォーム変更時に呼び出す
 * triggerAutoSave();
 * ```
 */
export const useOrderDraftManagement = ({
  user,
  methods,
}: UseOrderDraftManagementParams) => {
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimer = useRef<number | null>(null);
  const isInitialLoad = useRef(true);

  // userとmethodsをrefで保持して安定した参照を維持
  const userRef = useRef(user);
  const methodsRef = useRef(methods);

  useEffect(() => {
    userRef.current = user;
    methodsRef.current = methods;
  }, [user, methods]);

  /**
   * 下書き復元確認
   * 初回ロード時に下書きが存在する場合、復元ダイアログを表示
   * セッション中に一度表示した場合は再表示しない（プロフィール等から戻った時の対策）
   */
  useEffect(() => {
    if (!user || !isInitialLoad.current) return;

    isInitialLoad.current = false;

    // 既にダイアログを表示済みかチェック（プロフィール等から戻った場合の対策）
    const dialogAlreadyShown = sessionStorage.getItem(DRAFT_DIALOG_SHOWN_KEY);
    if (dialogAlreadyShown) {
      return;
    }

    const draft = SessionStorageService.loadDraft(user.uid);
    if (draft) {
      // ダイアログ表示済みフラグを設定
      sessionStorage.setItem(DRAFT_DIALOG_SHOWN_KEY, 'true');
      setRestoreDialogOpen(true);
    }
  }, [user]);

  /**
   * フォームデータの自動保存をトリガー（debounce付き）
   *
   * NOTE: React#185対策 - useWatchの値を依存配列に含めず、
   * 呼び出し側から明示的にトリガーする設計に変更。
   * これによりuseWatchからの不安定な参照による無限ループを防止。
   */
  const triggerAutoSave = useCallback(() => {
    if (!userRef.current || isInitialLoad.current) return;

    // 変更があることをマーク
    setHasUnsavedChanges(true);

    // 既存のタイマーをクリア
    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
    }

    // 2秒後に自動保存
    autoSaveTimer.current = window.setTimeout(() => {
      if (!userRef.current) return;
      const currentFormData = methodsRef.current.getValues();
      SessionStorageService.saveDraft(userRef.current.uid, currentFormData);
      console.log('Form auto-saved');
    }, 2000);
  }, []);

  // クリーンアップ用のuseEffect
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

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

  /**
   * 下書きダイアログ表示フラグをリセット
   * フォーム送信成功後など、新しいフォーム入力を開始する際に呼び出す
   */
  const resetDraftDialogFlag = useCallback(() => {
    sessionStorage.removeItem(DRAFT_DIALOG_SHOWN_KEY);
  }, []);

  // 戻り値をメモ化して安定した参照を維持（無限ループ防止）
  return useMemo(
    () => ({
      restoreDialogOpen,
      setRestoreDialogOpen,
      hasUnsavedChanges,
      setHasUnsavedChanges,
      isInitialLoad,
      resetDraftDialogFlag,
      triggerAutoSave,
    }),
    [
      restoreDialogOpen,
      hasUnsavedChanges,
      resetDraftDialogFlag,
      triggerAutoSave,
    ]
  );
};
