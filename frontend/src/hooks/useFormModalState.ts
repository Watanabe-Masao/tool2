import { useState, useCallback } from 'react';

/**
 * モーダル状態の型定義
 */
export interface ModalState {
  open: boolean;
  bookName: string;
}

/**
 * useFormModalState
 *
 * フォームモーダル状態管理 Hook
 *
 * 責務:
 * - モーダルの開閉状態
 * - モーダル内のフォーム状態
 * - プレビュー表示状態
 *
 * useOrderFormState から分割された hook。
 * 単一責任原則に従い、モーダル管理のみに責務を限定。
 *
 * @returns モーダル状態と操作関数
 *
 * @example
 * ```tsx
 * const {
 *   bookNameDialog,
 *   showGeneratedPreview,
 *   openBookNameDialog,
 *   closeBookNameDialog,
 *   updateBookName,
 *   showPreview,
 *   hidePreview
 * } = useFormModalState();
 *
 * // ブック名入力ダイアログ
 * <Dialog open={bookNameDialog.open} onClose={closeBookNameDialog}>
 *   <TextField
 *     value={bookNameDialog.bookName}
 *     onChange={(e) => updateBookName(e.target.value)}
 *   />
 * </Dialog>
 *
 * // プレビュー表示
 * {showGeneratedPreview && <PreviewPanel onClose={hidePreview} />}
 * ```
 */
export const useFormModalState = () => {
  const [bookNameDialog, setBookNameDialog] = useState<ModalState>({
    open: false,
    bookName: '',
  });

  const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);

  /**
   * ブック名ダイアログを開く
   *
   * @param initialName - 初期ブック名（オプション）
   */
  const openBookNameDialog = useCallback((initialName: string = '') => {
    setBookNameDialog({ open: true, bookName: initialName });
  }, []);

  /**
   * ブック名ダイアログを閉じる
   */
  const closeBookNameDialog = useCallback(() => {
    setBookNameDialog({ open: false, bookName: '' });
  }, []);

  /**
   * ブック名を更新
   *
   * @param name - 新しいブック名
   */
  const updateBookName = useCallback((name: string) => {
    setBookNameDialog((prev) => ({ ...prev, bookName: name }));
  }, []);

  /**
   * ブック名を取得して閉じる
   *
   * @returns 入力されたブック名
   */
  const closeWithBookName = useCallback(() => {
    const { bookName } = bookNameDialog;
    closeBookNameDialog();
    return bookName;
  }, [bookNameDialog, closeBookNameDialog]);

  /**
   * プレビューを表示
   */
  const showPreview = useCallback(() => {
    setShowGeneratedPreview(true);
  }, []);

  /**
   * プレビューを非表示
   */
  const hidePreview = useCallback(() => {
    setShowGeneratedPreview(false);
  }, []);

  /**
   * プレビュー表示をトグル
   */
  const togglePreview = useCallback(() => {
    setShowGeneratedPreview((prev) => !prev);
  }, []);

  /**
   * すべてのモーダルを閉じる
   */
  const closeAllModals = useCallback(() => {
    closeBookNameDialog();
    hidePreview();
  }, [closeBookNameDialog, hidePreview]);

  return {
    // State
    bookNameDialog,
    setBookNameDialog,
    showGeneratedPreview,
    setShowGeneratedPreview,

    // ブック名ダイアログ操作
    openBookNameDialog,
    closeBookNameDialog,
    updateBookName,
    closeWithBookName,

    // プレビュー操作
    showPreview,
    hidePreview,
    togglePreview,

    // Utility
    closeAllModals,

    // Computed
    hasOpenModal: bookNameDialog.open || showGeneratedPreview,
  };
};

/**
 * Return type for useFormModalState
 *
 * TypeScript 型定義用。
 */
export type UseFormModalStateReturn = ReturnType<typeof useFormModalState>;
