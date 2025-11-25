import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * useAllocationActionsのパラメータ
 */
interface UseAllocationActionsParams {
  setValue: UseFormReturn<OrderFormData>['setValue'];
  setLockedStores: (
    storesOrUpdater: Map<number, Set<string>> | ((prev: Map<number, Set<string>>) => Map<number, Set<string>>)
  ) => void;
}

/**
 * useAllocationActions
 *
 * 配分数量管理・店舗ロック管理機能を提供するカスタムフック
 *
 * 責務:
 * - 配分数量の変更
 * - 店舗ロック状態の切り替え
 *
 * @example
 * ```typescript
 * const {
 *   handleAllocationChange,
 *   handleToggleLock,
 * } = useAllocationActions({
 *   setValue,
 *   setLockedStores,
 * });
 * ```
 */
export const useAllocationActions = ({
  setValue,
  setLockedStores,
}: UseAllocationActionsParams) => {
  /**
   * プレビュー画面での配分数量変更ハンドラ（React#185対策: メモ化）
   *
   * 指定された商品・店舗の配分数量を変更する。
   * バリデーションとdirtyフラグを有効にする。
   */
  const handleAllocationChange = useCallback(
    (productIndex: number, storeIndex: number, newValue: number) => {
      setValue(`products.${productIndex}.storeAllocations.${storeIndex}`, newValue, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [setValue]
  );

  /**
   * ロック状態切り替えハンドラ（FloatingProgressSummary用）
   *
   * 指定された商品・店舗のロック状態を切り替える。
   * ロックされた店舗は自動配分の対象外となる。
   */
  const handleToggleLock = useCallback(
    (productIndex: number, storeCode: string) => {
      setLockedStores((prev) => {
        const newMap = new Map(prev);
        const productLocks = new Set(newMap.get(productIndex) || []);

        if (productLocks.has(storeCode)) {
          productLocks.delete(storeCode);
        } else {
          productLocks.add(storeCode);
        }

        newMap.set(productIndex, productLocks);
        return newMap;
      });
    },
    [setLockedStores]
  );

  return {
    handleAllocationChange,
    handleToggleLock,
  };
};
