/**
 * Allocation History Utilities
 *
 * 配分履歴機能の純粋関数とヘルパー関数を提供します。
 * すべての関数はテスト可能な純粋関数として実装されています。
 */

// Row Generators (純粋関数)
export {
  aggregateStoreAllocations,
  createDataRow,
  createSubtotalRow,
  createGrandTotalRow,
  generateSingleBatchRows,
} from './rowGenerators';

// Grouping Strategies (Strategy Pattern)
export {
  generateRowsByDate,
  generateRowsByProduct,
  generateRowsByComposite,
} from './groupingStrategies';

// Column Helpers
export {
  renderStoreCell,
  createStoreColumns,
} from './columnHelpers';

// Date Formatters (Phase C)
export {
  formatAllocationDate,
  formatDateRange,
  type DateFormatType,
} from './dateFormatters';
