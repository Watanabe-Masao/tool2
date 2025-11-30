/**
 * Allocation History Feature (Public API)
 *
 * Feature-Sliced Design に基づく配分履歴機能の公開API
 *
 * **使用方法:**
 * ```tsx
 * import { useAllocationHistory } from '@/features/allocation-history';
 *
 * const MyComponent = () => {
 *   const allocationHistory = useAllocationHistory({ userId });
 *   // ...
 * };
 * ```
 *
 * **アーキテクチャ:**
 * ```
 * features/allocation-history/
 * ├── hooks/          - Custom Hooks (5個 + 統合フック)
 * ├── utils/          - Pure Functions (3ファイル)
 * ├── types/          - Type Definitions
 * ├── components/     - Presentational Components (未実装)
 * └── index.ts        - Public API (このファイル)
 * ```
 */

// ============================================
// 統合フック (推奨)
// ============================================
export {
  useAllocationHistory,
  type UseAllocationHistoryReturn,
  type UseAllocationHistoryParams,
  type AllocationHistoryBatches,
  type AllocationHistoryFilters,
  type AllocationHistoryModals,
  type AllocationHistoryView,
  type AllocationHistoryTableData,
} from './hooks/useAllocationHistory';

// ============================================
// 個別フック (詳細制御が必要な場合のみ)
// ============================================
export {
  useAllocationBatches,
  type UseAllocationBatchesReturn,
} from './hooks/useAllocationBatches';

export {
  useAllocationFilters,
  type UseAllocationFiltersReturn,
  type GroupMode,
  type SortOrder,
  type CompositeKeyField,
  type FilterState,
} from './hooks/useAllocationFilters';

export {
  useAllocationModals,
  type UseAllocationModalsReturn,
} from './hooks/useAllocationModals';

export {
  useAllocationView,
  type UseAllocationViewReturn,
  type ViewMode,
} from './hooks/useAllocationView';

export {
  useAllocationTableData,
  type UseAllocationTableDataReturn,
  type UseAllocationTableDataParams,
} from './hooks/useAllocationTableData';

// ============================================
// 型定義
// ============================================
export type {
  DetailGridRow,
  AvailableFilterValues,
  AllocationDetailWithDate,
  StoreAggregation,
} from './types';

// ============================================
// Utils (テスト・高度な用途向け)
// ============================================
export {
  // Row Generators
  aggregateStoreAllocations,
  createDataRow,
  createSubtotalRow,
  createGrandTotalRow,
  generateSingleBatchRows,
  // Grouping Strategies
  generateRowsByDate,
  generateRowsByProduct,
  generateRowsByComposite,
  // Column Helpers
  renderStoreCell,
  createStoreColumns,
} from './utils';
