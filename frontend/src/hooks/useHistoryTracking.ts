import { useCallback } from 'react';
import type { OrderFormData } from '@/schemas/orderSchema';
import { useFirestoreService } from '@/context/ServiceContext';

/**
 * useHistoryTrackingのパラメータ
 */
interface UseHistoryTrackingParams {
  user: {
    uid: string;
  } | null;
  supplierAutocomplete: {
    addToHistory: (value: string) => Promise<void>;
  };
  productNameAutocomplete: {
    addToHistory: (value: string) => Promise<void>;
  };
  originAutocomplete: {
    addToHistory: (value: string) => Promise<void>;
  };
}

/**
 * useHistoryTracking
 *
 * 履歴保存機能を提供するカスタムフック
 *
 * 責務:
 * - オートコンプリート履歴の保存（帳合先、商品名、産地）
 * - 商品履歴の保存（帳合先ごと）
 * - 価格履歴の保存（商品名・規格・入数ごと）
 *
 * API設計:
 * 単一メソッド saveAllHistories() のみを公開することで、
 * シンプルで使いやすいAPIを提供します。
 *
 * @example
 * ```typescript
 * const { saveAllHistories } = useHistoryTracking({
 *   user,
 *   supplierAutocomplete,
 *   productNameAutocomplete,
 *   originAutocomplete,
 * });
 *
 * // 注文送信後に呼び出す
 * await saveAllHistories(formData);
 * ```
 */
export const useHistoryTracking = ({
  user,
  supplierAutocomplete,
  productNameAutocomplete,
  originAutocomplete,
}: UseHistoryTrackingParams) => {
  // Service Context から FirestoreService を取得
  const firestoreService = useFirestoreService();

  /**
   * すべての履歴を保存
   * - オートコンプリート履歴（帳合先、商品名、産地）
   * - 商品履歴（帳合先ごと）
   * - 価格履歴（商品名・規格・入数ごと）
   *
   * @param data - フォームデータ
   */
  const saveAllHistories = useCallback(
    async (data: OrderFormData) => {
      if (!user) return;

      try {
        // 帳合先履歴
        for (const supplier of data.suppliers) {
          await supplierAutocomplete.addToHistory(supplier);
        }

        // 商品関連履歴
        for (const product of data.products) {
          // オートコンプリート履歴
          await productNameAutocomplete.addToHistory(product.name);
          await originAutocomplete.addToHistory(product.origin);

          // 商品履歴（各商品の帳合先ごとに）
          await firestoreService.saveProductHistory(
            user.uid,
            product.supplier,
            product.name,
            product.origin,
            product.specification || '',
            product.quantityPerPackage ?? null,
            product.unit || '',
            product.categoryCode
          );

          // 価格履歴
          if (
            product.centerCost &&
            product.storeCost &&
            product.priceExcludingTax &&
            product.quantityPerPackage
          ) {
            await firestoreService.savePricingHistory(
              user.uid,
              product.name,
              product.specification || '',
              product.quantityPerPackage,
              product.unit || '',
              product.centerCost,
              product.storeCost,
              product.priceExcludingTax,
              product.centerFeeRate
            );
          }
        }
      } catch (error) {
        console.error('履歴保存エラー:', error);
        // 履歴保存の失敗は致命的ではないのでエラーログのみ
      }
    },
    [user, supplierAutocomplete, productNameAutocomplete, originAutocomplete, firestoreService]
  );

  return {
    saveAllHistories,
  };
};
