/**
 * Allocation History Custom Hooks
 *
 * このディレクトリは配分履歴機能のカスタムフックを提供します。
 *
 * **推奨:** ページコンポーネントでは `useAllocationHistory` 統合フックを使用してください。
 * 個別のhooksは、部分的な機能が必要な場合や、テスト時にのみ直接使用します。
 */

// 統合フック（推奨）
export {
  useAllocationHistory,
  type UseAllocationHistoryReturn,
  type UseAllocationHistoryParams,
  type AllocationHistoryBatches,
  type AllocationHistoryFilters,
  type AllocationHistoryModals,
  type AllocationHistoryView,
  type AllocationHistoryTableData,
} from './useAllocationHistory';

// 個別フック（詳細制御が必要な場合のみ）
export { useAllocationBatches, type UseAllocationBatchesReturn } from './useAllocationBatches';
export { useAllocationFilters, type UseAllocationFiltersReturn, type GroupMode, type SortOrder, type CompositeKeyField, type FilterState } from './useAllocationFilters';
export { useAllocationModals, type UseAllocationModalsReturn } from './useAllocationModals';
export { useAllocationView, type UseAllocationViewReturn, type ViewMode } from './useAllocationView';
export { useAllocationTableData, type UseAllocationTableDataReturn, type UseAllocationTableDataParams } from './useAllocationTableData';

// ヘルパーフック（Phase C）
export { useToggleSetItem } from './useToggleSetItem';
export { useFilterCount } from './useFilterCount';
