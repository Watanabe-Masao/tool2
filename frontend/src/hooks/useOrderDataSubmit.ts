import { useCallback, useMemo } from 'react';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { UserSettings } from '@/types/userSettings';

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
   * フォームデータのバリデーション
   */
  const validateFormData = useCallback((data: OrderFormData): string | null => {
    const missingFields: string[] = [];

    // 店着日チェック
    if (!data.deliveryDate) {
      missingFields.push('店着日');
    }

    // 帳合先チェック
    if (!data.suppliers || data.suppliers.length === 0) {
      missingFields.push('帳合先');
    }

    // 商品チェック
    if (!data.products || data.products.length === 0) {
      missingFields.push('商品情報');
    } else {
      data.products.forEach((product, index) => {
        const productNum = index + 1;
        const productErrors: string[] = [];

        if (!product.name?.trim()) {
          productErrors.push('品名');
        }
        if (!product.origin?.trim()) {
          productErrors.push('産地');
        }
        if (!product.specification?.trim()) {
          productErrors.push('規格');
        }
        if (!product.specificationUnit?.trim()) {
          productErrors.push('規格の単位');
        }
        if (!product.quantityPerPackage || product.quantityPerPackage <= 0) {
          productErrors.push('入数');
        }
        if (!product.packageUnit?.trim()) {
          productErrors.push('入数の単位');
        }
        if (product.centerCost === undefined || product.centerCost === null) {
          productErrors.push('センター着原価');
        }
        if (product.centerFeeRate === undefined || product.centerFeeRate === null) {
          productErrors.push('センターフィー率');
        }
        if (product.storeCost === undefined || product.storeCost === null) {
          productErrors.push('店着原価');
        }
        if (product.priceExcludingTax === undefined || product.priceExcludingTax === null) {
          productErrors.push('税抜売価');
        }
        if (!product.totalDelivery || product.totalDelivery <= 0) {
          productErrors.push('総納品数');
        }
        if (!product.supplier?.trim()) {
          productErrors.push('納品先（帳合先）');
        }

        if (productErrors.length > 0) {
          missingFields.push(`商品${productNum}: ${productErrors.join(', ')}`);
        }
      });
    }

    if (missingFields.length > 0) {
      return `以下の項目を入力してください:\n\n${missingFields.join('\n')}`;
    }

    return null;
  }, []);

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

        // 送信前バリデーション
        const validationError = validateFormData(data);
        if (validationError) {
          if (!isOnline) {
            hideLoading();
          }
          showError(validationError);
          return false;
        }

        // バリデーション: すべての商品の帳合先がステップ1で選択された帳合先リストに含まれているかチェック
        const invalidProducts = data.products.filter(
          (product) => !data.suppliers.includes(product.supplier)
        );

        if (invalidProducts.length > 0) {
          if (!isOnline) {
            hideLoading();
          }
          showError('一部の商品の帳合先がステップ1で選択されていません');
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
    [isOnline, showLoading, showError, hideLoading, userSettings, user, saveOrderWithSync, showSuccess, validateFormData]
  );

  // 戻り値をメモ化して安定した参照を維持（無限ループ防止）
  return useMemo(
    () => ({
      submitOrderData,
    }),
    [submitOrderData]
  );
};
