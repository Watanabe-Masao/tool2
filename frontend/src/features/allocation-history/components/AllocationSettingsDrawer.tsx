import { Drawer, Box, Stack, Typography, IconButton, Divider, Button } from '@mui/material';
import { Close, Visibility } from '@mui/icons-material';
import { MODAL_Z_INDEX } from '@/utils/constants';
import type {
  AllocationHistoryFilters,
  AllocationHistoryView,
  AllocationHistoryTableData,
} from '../hooks';
import { AllocationFiltersSection } from './AllocationFiltersSection';
import { ColumnVisibilitySection } from './ColumnVisibilitySection';
import { SortAndCompositeSection } from './SortAndCompositeSection';

/**
 * AllocationSettingsDrawer Props
 */
export interface AllocationSettingsDrawerProps {
  /** 開閉状態 */
  open: boolean;
  /** 閉じる */
  onClose: () => void;
  /** フィルター状態 */
  filters: AllocationHistoryFilters;
  /** ビュー状態 */
  view: AllocationHistoryView;
  /** テーブルデータ */
  tableData: AllocationHistoryTableData;
}

/**
 * AllocationSettingsDrawer Component
 *
 * 配分履歴詳細モーダルの設定ドロワー（Phase B最適化済み）。
 * フィルター、列表示/非表示、ソート、複合キー設定を提供します。
 *
 * **Phase B 最適化:**
 * - AllocationFiltersSection コンポーネント抽出（~120行削減）
 * - ColumnVisibilitySection コンポーネント抽出（~120行削減）
 * - SortAndCompositeSection コンポーネント抽出（~80行削減）
 * - 薄いラッパーコンポーネントに（489 → ~90行）
 *
 * **機能:**
 * - フィルター設定（商品名/産地/規格/日付）
 * - 列表示/非表示（基本項目 + 店舗36個）
 * - 店舗カテゴリー一括選択
 * - ソート順設定
 * - 複合キー設定
 * - 非表示行の一括再表示
 *
 * @example
 * ```tsx
 * <AllocationSettingsDrawer
 *   open={settingsOpen}
 *   onClose={() => setSettingsOpen(false)}
 *   filters={allocationHistory.filters}
 *   view={allocationHistory.view}
 *   tableData={allocationHistory.tableData}
 * />
 * ```
 */
export const AllocationSettingsDrawer: React.FC<AllocationSettingsDrawerProps> = ({
  open,
  onClose,
  filters,
  view,
  tableData,
}) => {
  const { hiddenRowIds, showAllRows } = view;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}
      PaperProps={{
        sx: {
          borderRadius: '16px 16px 0 0',
          maxHeight: '90vh',
          overflow: 'auto',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* ヘッダー */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            詳細設定
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="設定を閉じる">
            <Close />
          </IconButton>
        </Stack>

        <Stack spacing={3}>
          {/* フィルターセクション（抽出済みコンポーネント） */}
          <AllocationFiltersSection filters={filters} tableData={tableData} />

          <Divider />

          {/* 列表示/非表示セクション（抽出済みコンポーネント） */}
          <ColumnVisibilitySection view={view} />

          <Divider />

          {/* 非表示行の管理 */}
          {hiddenRowIds.size > 0 && (
            <Box>
              <Button variant="outlined" fullWidth startIcon={<Visibility />} onClick={showAllRows}>
                非表示の行を再表示 ({hiddenRowIds.size}件)
              </Button>
            </Box>
          )}

          {/* ソート&複合キー設定セクション（抽出済みコンポーネント） */}
          <SortAndCompositeSection filters={filters} />
        </Stack>

        {/* 閉じるボタン */}
        <Button fullWidth variant="contained" color="primary" sx={{ mt: 3 }} onClick={onClose}>
          閉じる
        </Button>
      </Box>
    </Drawer>
  );
};
