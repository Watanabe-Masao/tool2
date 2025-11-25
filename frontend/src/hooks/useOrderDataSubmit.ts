import { useCallback } from 'react';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { UserSettings } from '@/types/userSettings';
import { ERROR_MESSAGES } from '@/messages';

/**
 * useOrderDataSubmitのパラメータ
 */
interface UseOrderDataSubmitParams {
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
  } | null;
  userSettings: UserSettings | null;
  isOnline: boolean;
  saveOrderWithSync: (data: OrderFormData, buyerName: string) => Promise<void>;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showLoading: () => void;
  hideLoading: () => void;
}

/**
 * useOrderDataSubmit
 *
 * 注文データの送信・バリデーション・保存機能を提供するカスタムフック
 *
 * 責務:
 * - フォームデータのバリデーション
 * - Firestoreへのデータ保存（オンライン時）
 * - IndexedDBへの保存（オフライン時）
 * - バイヤー名の取得・管理
 *
 * 注意:
 * 履歴保存（オートコンプリート、商品履歴、価格履歴）は
 * useHistoryTracking が担当します。
 *
 * @example
 * ```typescript
 * const { submitOrderData } = useOrderDataSubmit({
 *   user,
 *   userSettings,
 *   isOnline,
 *   saveOrderWithSync,
 *   showSuccess,
 *   showError,
 *   showLoading,
 *   hideLoading,
 * });
 * ```
 */
export const useOrderDataSubmit = ({
  user,
  userSettings,
  isOnline,
  saveOrderWithSync,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
}: UseOrderDataSubmitParams) => {
  /**
   * フォーム送信処理
   *
   * @param data - フォームデータ
   * @param onBookNameDialogOpen - ブック名ダイアログを開くコールバック
   * @returns 成功時にtrue、ブック名ダイアログ表示時にfalse
   */
  const submitOrderData = useCallback(
    async (
      data: OrderFormData,
      onBookNameDialogOpen: () => void
    ): Promise<boolean> => {
      try {
        // オンライン時はダイアログを表示するため、まだローディングを表示しない
        if (!isOnline) {
          showLoading();
        }

        console.log('Form data:', data);

        // バリデーション: すべての商品の帳合先がステップ1で選択された帳合先リストに含まれているかチェック
        const invalidProducts = data.products.filter(
          (product) => !data.suppliers.includes(product.supplier)
        );

        if (invalidProducts.length > 0) {
          if (!isOnline) {
            hideLoading();
          }
          showError(ERROR_MESSAGES.validationError);
          return false;
        }

        // オンライン時: 先にローディングを表示してデータ保存
        if (isOnline) {
          showLoading();
        }

        // バイヤー名を取得（UserSettings > ユーザー名 > メールアドレス > '匿名'）
        const buyerName = userSettings?.buyerName?.trim() || user?.displayName || user?.email || '匿名';

        // オフライン同期を使用してデータを保存
        // オンライン時: Firestore + API呼び出し
        // オフライン時: IndexedDBのみ
        await saveOrderWithSync(data, buyerName);

        // オンライン時: データ保存後にローディングを隠してブック名ダイアログを表示
        if (isOnline) {
          hideLoading();
          onBookNameDialogOpen();
          return false; // ダイアログ確認待ち
        }

        // オフライン時: テンプレート生成をスキップ
        showSuccess('オフラインのため配分表を保存しました');
        hideLoading();
        return true;
      } catch (error) {
        hideLoading();
        showError(error instanceof Error ? error.message : 'テンプレートの生成に失敗しました');
        return false;
      }
    },
    [isOnline, showLoading, showError, hideLoading, userSettings, user, saveOrderWithSync, showSuccess]
  );

  return {
    submitOrderData,
  };
};
