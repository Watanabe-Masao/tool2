/**
 * Allocation History Components
 *
 * Phase 1 Week 2で抽出されたコンポーネント群。
 * AllocationHistoryPageから分離し、単一責任の原則に従って整理されています。
 *
 * Phase A 最適化: 共通UIコンポーネント（StatusBadge, EmptyState, ClickableBox, TableHeaderCell）を導入し、
 * コード重複を削減（~330行削減）、アクセシビリティ向上、パフォーマンス最適化（useMemo）を実施。
 */

// 詳細モーダル
export { AllocationDetailModal } from './AllocationDetailModal';
export type { AllocationDetailModalProps } from './AllocationDetailModal';

// 削除確認ダイアログ
export { AllocationDeleteDialog } from './AllocationDeleteDialog';
export type { AllocationDeleteDialogProps } from './AllocationDeleteDialog';

// 設定ドロワー（フィルター、列表示、ソート、複合キー設定）
export { AllocationSettingsDrawer } from './AllocationSettingsDrawer';
export type { AllocationSettingsDrawerProps } from './AllocationSettingsDrawer';

// 日付範囲選択ダイアログ
export { AllocationDateRangePicker } from './AllocationDateRangePicker';
export type { AllocationDateRangePickerProps } from './AllocationDateRangePicker';

// 履歴テーブル
export { AllocationHistoryTable } from './AllocationHistoryTable';
export type { AllocationHistoryTableProps, WeekBatchGroup } from './AllocationHistoryTable';

// ツールバー
export { AllocationHistoryToolbar } from './AllocationHistoryToolbar';
export type { AllocationHistoryToolbarProps } from './AllocationHistoryToolbar';

// 空状態表示（共通UIコンポーネントを使用）
// Note: AllocationEmptyStateは削除され、@/components/ui/EmptyStateに統合されました
export { EmptyState as AllocationEmptyState } from '@/components/ui';
