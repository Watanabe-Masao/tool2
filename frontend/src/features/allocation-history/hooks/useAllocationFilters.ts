import { useState, useCallback, useMemo } from 'react';

/**
 * GroupMode type
 */
export type GroupMode = 'date' | 'product' | 'composite';

/**
 * SortOrder type
 */
export type SortOrder = 'totalDesc' | 'totalAsc';

/**
 * CompositeKeyField type
 */
export type CompositeKeyField = 'productName' | 'origin' | 'specification' | 'deliveryDate';

/**
 * FilterState interface
 */
export interface FilterState {
  productNames: string[];
  origins: string[];
  specifications: string[];
  dates: string[];
}

/**
 * 配分履歴フィルタリング・ソートフック
 *
 * フィルタリング、グループ化モード、ソート順の管理を提供します。
 *
 * @returns フィルタ状態と操作関数
 *
 * @example
 * ```tsx
 * const { filters, groupMode, sortOrder, setFilters, setGroupMode, resetFilters } =
 *   useAllocationFilters();
 * ```
 */
export const useAllocationFilters = () => {
  // フィルター状態
  const [filters, setFilters] = useState<FilterState>({
    productNames: [],
    origins: [],
    specifications: [],
    dates: [],
  });

  // グループ化モード
  const [groupMode, setGroupMode] = useState<GroupMode>('product');

  // ソート順
  const [sortOrder, setSortOrder] = useState<SortOrder>('totalDesc');

  // 複合キー設定
  const [compositeKeyFields, setCompositeKeyFields] = useState<CompositeKeyField[]>([
    'productName',
    'deliveryDate',
  ]);

  /**
   * フィルターを更新
   */
  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  /**
   * 商品名フィルターを追加/削除
   */
  const toggleProductName = useCallback((productName: string) => {
    setFilters((prev) => {
      const newProductNames = prev.productNames.includes(productName)
        ? prev.productNames.filter((name) => name !== productName)
        : [...prev.productNames, productName];

      return {
        ...prev,
        productNames: newProductNames,
      };
    });
  }, []);

  /**
   * 産地フィルターを追加/削除
   */
  const toggleOrigin = useCallback((origin: string) => {
    setFilters((prev) => {
      const newOrigins = prev.origins.includes(origin)
        ? prev.origins.filter((o) => o !== origin)
        : [...prev.origins, origin];

      return {
        ...prev,
        origins: newOrigins,
      };
    });
  }, []);

  /**
   * 規格フィルターを追加/削除
   */
  const toggleSpecification = useCallback((specification: string) => {
    setFilters((prev) => {
      const newSpecifications = prev.specifications.includes(specification)
        ? prev.specifications.filter((s) => s !== specification)
        : [...prev.specifications, specification];

      return {
        ...prev,
        specifications: newSpecifications,
      };
    });
  }, []);

  /**
   * 日付フィルターを追加/削除
   */
  const toggleDate = useCallback((date: string) => {
    setFilters((prev) => {
      const newDates = prev.dates.includes(date)
        ? prev.dates.filter((d) => d !== date)
        : [...prev.dates, date];

      return {
        ...prev,
        dates: newDates,
      };
    });
  }, []);

  /**
   * すべてのフィルターをリセット
   */
  const resetFilters = useCallback(() => {
    setFilters({
      productNames: [],
      origins: [],
      specifications: [],
      dates: [],
    });
  }, []);

  /**
   * フィルターが適用されているかどうか
   */
  const hasActiveFilters = useCallback(() => {
    return (
      filters.productNames.length > 0 ||
      filters.origins.length > 0 ||
      filters.specifications.length > 0 ||
      filters.dates.length > 0
    );
  }, [filters]);

  /**
   * 複合キーフィールドを追加/削除
   */
  const toggleCompositeKeyField = useCallback((field: CompositeKeyField) => {
    setCompositeKeyFields((prev) => {
      if (prev.includes(field)) {
        // 削除（最低1つは残す）
        return prev.length > 1 ? prev.filter((f) => f !== field) : prev;
      } else {
        // 追加
        return [...prev, field];
      }
    });
  }, []);

  // 戻り値をメモ化して無限ループを防止
  return useMemo(
    () => ({
      // 状態
      filters,
      groupMode,
      sortOrder,
      compositeKeyFields,

      // 操作関数
      setFilters,
      updateFilters,
      toggleProductName,
      toggleOrigin,
      toggleSpecification,
      toggleDate,
      resetFilters,
      hasActiveFilters,

      setGroupMode,
      setSortOrder,
      setCompositeKeyFields,
      toggleCompositeKeyField,
    }),
    [
      filters,
      groupMode,
      sortOrder,
      compositeKeyFields,
      setFilters,
      updateFilters,
      toggleProductName,
      toggleOrigin,
      toggleSpecification,
      toggleDate,
      resetFilters,
      hasActiveFilters,
      setGroupMode,
      setSortOrder,
      setCompositeKeyFields,
      toggleCompositeKeyField,
    ]
  );
};

/**
 * useAllocationFilters の戻り値型
 */
export type UseAllocationFiltersReturn = ReturnType<typeof useAllocationFilters>;
