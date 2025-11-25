import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { BookNameDialog } from '@/stores/orderFormStore';

/**
 * useFormSubmitHandlerのパラメータ
 */
interface UseFormSubmitHandlerParams {
  getValues: UseFormReturn<OrderFormData>['getValues'];
  submitOrder: (data: OrderFormData, onBookNameDialogOpen: () => void) => Promise<void | boolean>;
  setBookNameDialog: (state: BookNameDialog) => void;
  bookNameDialog: BookNameDialog;
  handleGenerateTemplate: (
    data: OrderFormData,
    bookName: string,
    setHasUnsavedChanges: (value: boolean) => void
  ) => Promise<boolean>;
  setHasUnsavedChanges: (value: boolean) => void;
  setShowGeneratedPreview: (show: boolean) => void;
}

/**
 * useFormSubmitHandler
 *
 * フォーム送信・ブック名確認機能を提供するカスタムフック
 *
 * 責務:
 * - フォーム送信処理
 * - ブック名ダイアログの確認処理
 *
 * @example
 * ```typescript
 * const {
 *   onSubmit,
 *   handleBookNameDialogConfirm,
 * } = useFormSubmitHandler({
 *   getValues,
 *   submitOrder,
 *   setBookNameDialog,
 *   bookNameDialog,
 *   handleGenerateTemplate,
 *   setHasUnsavedChanges,
 *   setShowGeneratedPreview,
 * });
 * ```
 */
export const useFormSubmitHandler = ({
  getValues,
  submitOrder,
  setBookNameDialog,
  bookNameDialog,
  handleGenerateTemplate,
  setHasUnsavedChanges,
  setShowGeneratedPreview,
}: UseFormSubmitHandlerParams) => {
  /**
   * フォーム送信
   *
   * submitOrder を呼び出し、オンライン時はブック名ダイアログを開く。
   */
  const onSubmit = useCallback(
    async (data: OrderFormData) => {
      await submitOrder(data, () => setBookNameDialog({ open: true, bookName: '' }));
    },
    [submitOrder, setBookNameDialog]
  );

  /**
   * ブック名ダイアログの確認ハンドラー
   *
   * ユーザーがブック名を入力して確認ボタンを押したときに呼ばれる。
   * テンプレート生成を実行し、成功時はプレビュー画面を表示する。
   */
  const handleBookNameDialogConfirm = useCallback(async () => {
    const data = getValues();

    // ダイアログを閉じる
    setBookNameDialog({ open: false, bookName: '' });

    // テンプレート生成
    const success = await handleGenerateTemplate(data, bookNameDialog.bookName, setHasUnsavedChanges);

    // 成功時にプレビュー画面を表示
    if (success) {
      setShowGeneratedPreview(true);
    }
  }, [getValues, setBookNameDialog, bookNameDialog.bookName, handleGenerateTemplate, setHasUnsavedChanges, setShowGeneratedPreview]);

  return {
    onSubmit,
    handleBookNameDialogConfirm,
  };
};
