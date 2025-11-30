import { useMemo } from 'react';
import type { AllocationHistoryFilters } from './useAllocationFilters';

/**
 * useFilterCount Hook
 *
 * アクティブなフィルター数を計算するカスタムフック。
 * useMemoで最適化し、不要な再計算を防ぎます。
 *
 * **使用箇所:**
 * - AllocationDetailModal: filterCount 計算
 * - GroupModeSelector: フィルター数バッジ表示
 * - AllocationSettingsDrawer: フィルター数計算
 *
 * **削減効果:** ~30行の重複コードを削除、パフォーマンス最適化
 *
 * @example
 * ```tsx
 * const filterCount = useFilterCount(filters);
 *
 * // 使用例
 * {filterCount > 0 && (
 *   <StatusBadge variant="primary">
 *     フィルター {filterCount}
 *   </StatusBadge>
 * )}
 * ```
 *
 * @param filters - AllocationHistoryFilters オブジェクト
 * @returns アクティブなフィルター数
 */
export const useFilterCount = (filters: AllocationHistoryFilters): number => {
  const { filters: filterState } = filters;

  return useMemo(
    () =>
      filterState.productNames.length +
      filterState.origins.length +
      filterState.specifications.length +
      filterState.dates.length,
    [filterState.productNames, filterState.origins, filterState.specifications, filterState.dates]
  );
};
