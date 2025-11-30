import { Box, Typography, IconButton, CircularProgress } from '@mui/material';
import { Refresh, CalendarToday } from '@mui/icons-material';

/**
 * AllocationHistoryToolbar Props
 */
export interface AllocationHistoryToolbarProps {
  /** 配分履歴の件数 */
  batchCount: number;
  /** 読み込み中かどうか */
  loading: boolean;
  /** 更新ボタンクリック */
  onRefresh: () => void;
  /** カレンダー表示に切り替え */
  onViewModeChange: () => void;
}

/**
 * AllocationHistoryToolbar Component
 *
 * 配分履歴ページのツールバー（テーブル表示モード用）。
 * タイトル、件数、更新ボタン、カレンダー切り替えボタンを表示します。
 *
 * @example
 * ```tsx
 * <AllocationHistoryToolbar
 *   batchCount={batches.length}
 *   loading={loading}
 *   onRefresh={fetchHistory}
 *   onViewModeChange={() => setViewMode('calendar')}
 * />
 * ```
 */
export const AllocationHistoryToolbar: React.FC<AllocationHistoryToolbarProps> = ({
  batchCount,
  loading,
  onRefresh,
  onViewModeChange,
}) => {
  return (
    <Box
      sx={{
        mb: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        minHeight: 36,
      }}
    >
      {/* 左側: タイトル + カウント */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          sx={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'text.primary',
          }}
        >
          配分履歴
        </Typography>
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'grey.500',
            bgcolor: 'grey.100',
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
          }}
        >
          {batchCount}件
        </Typography>
      </Box>

      {/* 右側: コントロール */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton
          size="small"
          onClick={onRefresh}
          disabled={loading}
          sx={{ p: 0.5, color: 'grey.600' }}
        >
          {loading ? <CircularProgress size={16} /> : <Refresh sx={{ fontSize: 18 }} />}
        </IconButton>
        <IconButton
          size="small"
          onClick={onViewModeChange}
          sx={{ p: 0.5, color: 'grey.600' }}
        >
          <CalendarToday sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
};
