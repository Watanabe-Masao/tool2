import { useCallback } from 'react';

/**
 * useToggleSetItem Hook
 *
 * Set内の要素をトグル（追加/削除）するカスタムフック。
 * Set操作の重複ロジックを削減します。
 *
 * **使用箇所:**
 * - ColumnVisibilitySection: hiddenColumns のトグル
 * - AllocationHistoryView: hiddenRowIds, hiddenColumns のトグル
 *
 * **削減効果:** ~60行の重複コードを削除
 *
 * @example
 * ```tsx
 * const toggleColumn = useToggleSetItem(hiddenColumns, setHiddenColumns);
 *
 * // 使用例
 * <Checkbox
 *   checked={!hiddenColumns.has(field)}
 *   onChange={() => toggleColumn(field)}
 * />
 * ```
 *
 * @param currentSet - 現在のSet
 * @param setSet - Setを更新する関数
 * @returns トグル関数
 */
export const useToggleSetItem = <T>(
  currentSet: Set<T>,
  setSet: (newSet: Set<T>) => void
): ((item: T) => void) => {
  return useCallback(
    (item: T) => {
      const newSet = new Set(currentSet);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      setSet(newSet);
    },
    [currentSet, setSet]
  );
};
