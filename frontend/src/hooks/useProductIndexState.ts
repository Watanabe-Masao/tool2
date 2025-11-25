import { useState, useCallback } from 'react';

/**
 * useProductIndexState
 *
 * 商品インデックス状態管理 Hook
 *
 * 責務:
 * - activeProductIndex の管理
 * - 商品選択ロジック
 * - 商品間のナビゲーション
 *
 * useOrderFormState から分割された hook。
 * 単一責任原則に従い、商品インデックス管理のみに責務を限定。
 *
 * @param totalProducts - 総商品数
 * @returns 商品インデックス状態と操作関数
 *
 * @example
 * ```tsx
 * const products = [
 *   { name: 'りんご' },
 *   { name: 'バナナ' },
 *   { name: 'オレンジ' }
 * ];
 *
 * const {
 *   activeProductIndex,
 *   goToNextProduct,
 *   goToPrevProduct,
 *   goToProduct,
 *   isFirstProduct,
 *   isLastProduct
 * } = useProductIndexState(products.length);
 *
 * // 現在選択されている商品
 * const currentProduct = products[activeProductIndex];
 *
 * // 次の商品へ
 * <Button onClick={goToNextProduct} disabled={isLastProduct}>Next</Button>
 *
 * // 前の商品へ
 * <Button onClick={goToPrevProduct} disabled={isFirstProduct}>Previous</Button>
 * ```
 */
export const useProductIndexState = (totalProducts: number) => {
  const [activeProductIndex, setActiveProductIndex] = useState(0);

  /**
   * 次の商品へ
   *
   * 最後の商品を超えることはできない。
   */
  const goToNextProduct = useCallback(() => {
    setActiveProductIndex((prev) => Math.min(prev + 1, Math.max(totalProducts - 1, 0)));
  }, [totalProducts]);

  /**
   * 前の商品へ
   *
   * 最初の商品より前には戻れない。
   */
  const goToPrevProduct = useCallback(() => {
    setActiveProductIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  /**
   * 特定の商品へ移動
   *
   * @param index - 移動先の商品インデックス（0-indexed）
   */
  const goToProduct = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalProducts) {
        setActiveProductIndex(index);
      }
    },
    [totalProducts]
  );

  /**
   * インデックスをリセット（最初の商品へ）
   */
  const resetProductIndex = useCallback(() => {
    setActiveProductIndex(0);
  }, []);

  /**
   * 商品が削除されたときのインデックス調整
   *
   * @param deletedIndex - 削除された商品のインデックス
   */
  const handleProductDeleted = useCallback(
    (deletedIndex: number) => {
      setActiveProductIndex((prev) => {
        // 削除された商品より後ろにいた場合、インデックスを1つ戻す
        if (prev > deletedIndex) {
          return prev - 1;
        }
        // 削除された商品を選択していた場合
        if (prev === deletedIndex) {
          // 最後の商品だった場合は前の商品へ
          if (prev === totalProducts - 1) {
            return Math.max(prev - 1, 0);
          }
          // そのままの位置（次の商品が繰り上がってくる）
          return prev;
        }
        // 削除された商品より前にいた場合は変更なし
        return prev;
      });
    },
    [totalProducts]
  );

  return {
    // State
    activeProductIndex,
    setActiveProductIndex,

    // Actions
    goToNextProduct,
    goToPrevProduct,
    goToProduct,
    resetProductIndex,
    handleProductDeleted,

    // Computed
    isFirstProduct: activeProductIndex === 0,
    isLastProduct: activeProductIndex === Math.max(totalProducts - 1, 0),
    hasProducts: totalProducts > 0,
    productCount: totalProducts,
  };
};

/**
 * Return type for useProductIndexState
 *
 * TypeScript 型定義用。
 */
export type UseProductIndexStateReturn = ReturnType<typeof useProductIndexState>;
