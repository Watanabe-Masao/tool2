import { useCallback, useMemo } from 'react';
import type { UseFormReturn, FieldArrayWithId, UseFieldArrayRemove } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * useProductActionsのパラメータ
 */
interface UseProductActionsParams {
  // Form methods
  setValue: UseFormReturn<OrderFormData>['setValue'];
  productFields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
  removeProduct: UseFieldArrayRemove;

  // State
  activeProductIndex: number;
  setActiveProductIndex: (index: number) => void;
  suppliers: string[] | undefined;
}

/**
 * useProductActions
 *
 * 商品管理機能を提供するカスタムフック
 *
 * 責務:
 * - 商品の削除
 * - 商品フィールドのクリア
 *
 * @example
 * ```typescript
 * const {
 *   handleRemoveProduct,
 *   handleClearProduct,
 * } = useProductActions({
 *   setValue,
 *   productFields,
 *   removeProduct,
 *   activeProductIndex,
 *   setActiveProductIndex,
 *   suppliers,
 * });
 * ```
 */
export const useProductActions = ({
  setValue,
  productFields,
  removeProduct,
  activeProductIndex,
  setActiveProductIndex,
  suppliers,
}: UseProductActionsParams) => {
  /**
   * 商品削除ハンドラー（FloatingProgressSummary用）
   *
   * 最後の1つの商品は削除できない。
   * 削除後、アクティブなインデックスを調整する。
   */
  const handleRemoveProduct = useCallback(
    (index: number) => {
      if (productFields.length <= 1) return; // 最後の1つは削除しない
      removeProduct(index);
      // アクティブなインデックスを調整
      if (activeProductIndex >= index && activeProductIndex > 0) {
        setActiveProductIndex(activeProductIndex - 1);
      }
    },
    [productFields.length, removeProduct, activeProductIndex, setActiveProductIndex]
  );

  /**
   * 商品フィールドクリアハンドラー（FloatingProgressSummary用）
   *
   * 指定されたインデックスの商品フィールドをすべてクリアする。
   * 帳合先はデフォルト値（最初の帳合先）にリセットされる。
   */
  const handleClearProduct = useCallback(
    (index: number) => {
      const defaultSupplier = suppliers && suppliers.length > 0 ? suppliers[0] : '';
      setValue(`products.${index}.categoryCode`, '');
      setValue(`products.${index}.supplier`, defaultSupplier);
      setValue(`products.${index}.name`, '');
      setValue(`products.${index}.origin`, '');
      setValue(`products.${index}.specification`, '');
      setValue(`products.${index}.quantityPerPackage`, null);
      setValue(`products.${index}.unit`, '');
    },
    [suppliers, setValue]
  );

  // 戻り値をメモ化（無限ループ防止）
  return useMemo(
    () => ({
      handleRemoveProduct,
      handleClearProduct,
    }),
    [handleRemoveProduct, handleClearProduct]
  );
};
