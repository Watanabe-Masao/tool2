import { useCallback, useRef, useEffect, useMemo } from 'react';
import type { OrderFormData } from '@/schemas/orderSchema';
import { useFirestoreServiceRef } from '@/context/ServiceContext';

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
 * NOTE: firestoreServiceはuseFirestoreServiceRefで取得し、
 * 依存配列に含めないことで無限ループ(React #185)を防止
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
  // Service Context から FirestoreService を取得（refで安定化）
  const firestoreServiceRef = useFirestoreServiceRef();

  // パラメータをrefで保持して安定した参照を維持
  const userRef = useRef(user);
  const supplierAutocompleteRef = useRef(supplierAutocomplete);
  const productNameAutocompleteRef = useRef(productNameAutocomplete);
  const originAutocompleteRef = useRef(originAutocomplete);

  useEffect(() => {
    userRef.current = user;
    supplierAutocompleteRef.current = supplierAutocomplete;
    productNameAutocompleteRef.current = productNameAutocomplete;
    originAutocompleteRef.current = originAutocomplete;
  }, [user, supplierAutocomplete, productNameAutocomplete, originAutocomplete]);

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
      if (!userRef.current) return;

      try {
        // 帳合先履歴
        for (const supplier of data.suppliers) {
          await supplierAutocompleteRef.current.addToHistory(supplier);
        }

        // 商品関連履歴
        for (const product of data.products) {
          // オートコンプリート履歴
          await productNameAutocompleteRef.current.addToHistory(product.name);
          await originAutocompleteRef.current.addToHistory(product.origin);

          // 商品履歴（各商品の帳合先ごとに）
          await firestoreServiceRef.current.saveProductHistory(
            userRef.current.uid,
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
            await firestoreServiceRef.current.savePricingHistory(
              userRef.current.uid,
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
    // NOTE: refは安定しているため依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 戻り値をメモ化して安定した参照を維持（無限ループ防止）
  return useMemo(
    () => ({
      saveAllHistories,
    }),
    [saveAllHistories]
  );
};
