import { Box, Typography, IconButton } from '@mui/material';
import { Close, Fullscreen, FullscreenExit, Settings, DateRange, Visibility } from '@mui/icons-material';
import type { AllocationBatch } from '@/types/allocationHistory';
import { StatusBadge, ClickableBox } from '@/components/ui';
import { formatAllocationDate } from '../utils';
import { useCallback } from 'react';

/**
 * AllocationDetailModalHeader Props
 */
export interface AllocationDetailModalHeaderProps {
  /** タイトル */
  title: string;
  /** 選択されたバッチ（単一バッチ表示時） */
  selectedBatch: AllocationBatch | null;
  /** 選択された日付範囲（範囲表示時） */
  selectedDateRange: { start: string; end: string } | null;
  /** 詳細データ件数 */
  detailsCount: number;
  /** フルスクリーン状態 */
  isFullScreen: boolean;
  /** 非表示行数 */
  hiddenRowsCount: number;
  /** 設定ドロワーが開いているか */
  settingsOpen: boolean;
  /** フルスクリーン切り替え */
  onToggleFullScreen: () => void;
  /** 設定ドロワーを開く */
  onSettingsOpen: () => void;
  /** 日付範囲ピッカーを開く */
  onDatePickerOpen: () => void;
  /** 非表示行を再表示 */
  onShowAllRows: () => void;
  /** モーダルを閉じる */
  onClose: () => void;
}

/**
 * AllocationDetailModalHeader Component
 *
 * 配分履歴詳細モーダルのヘッダー部分（Phase C最適化済み）。
 * タイトル、バッジ、コントロールボタンを表示します。
 *
 * **Phase C 最適化:**
 * - formatAllocationDate 関数導入（~10行削減）
 *
 * **機能:**
 * - タイトル表示
 * - バッチ日付 or 日付範囲表示
 * - 詳細件数表示
 * - 非表示行インジケーター（クリック可能）
 * - フルスクリーン切り替えボタン
 * - 設定ボタン（日付範囲表示時のみ）
 * - 閉じるボタン
 *
 * @example
 * ```tsx
 * <AllocationDetailModalHeader
 *   title="配分履歴"
 *   selectedBatch={null}
 *   selectedDateRange={{ start: '2025-01-01', end: '2025-01-07' }}
 *   detailsCount={15}
 *   isFullScreen={false}
 *   hiddenRowsCount={0}
 *   settingsOpen={false}
 *   onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
 *   onSettingsOpen={() => setSettingsOpen(true)}
 *   onDatePickerOpen={() => setDatePickerOpen(true)}
 *   onShowAllRows={() => showAllRows()}
 *   onClose={() => closeDetails()}
 * />
 * ```
 */
export const AllocationDetailModalHeader: React.FC<AllocationDetailModalHeaderProps> = ({
  title,
  selectedBatch,
  selectedDateRange,
  detailsCount,
  isFullScreen,
  hiddenRowsCount,
  settingsOpen,
  onToggleFullScreen,
  onSettingsOpen,
  onDatePickerOpen,
  onShowAllRows,
  onClose,
}) => {
  // useCallbackでメモ化してパフォーマンス最適化
  const handleToggleFullScreen = useCallback(() => onToggleFullScreen(), [onToggleFullScreen]);
  const handleClose = useCallback(() => onClose(), [onClose]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        borderBottom: '1px solid',
        borderColor: 'grey.200',
        bgcolor: 'white',
      }}
    >
      {/* 左側: タイトル + バッジ */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          sx={{
            fontSize: { xs: '0.9rem', sm: '1rem' },
            fontWeight: 700,
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>

        {/* 単一バッチ: 日付バッジ */}
        {selectedBatch && (
          <StatusBadge variant="default" size="medium">
            {formatAllocationDate(selectedBatch.deliveryDate, 'short')}
          </StatusBadge>
        )}

        {/* 日付範囲: クリック可能な日付範囲バッジ */}
        {selectedDateRange && (
          <ClickableBox
            onClick={onDatePickerOpen}
            ariaLabel="日付範囲を変更"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              bgcolor: 'primary.50',
              '&:hover': { bgcolor: 'primary.100' },
            }}
          >
            <DateRange sx={{ fontSize: 14, color: 'primary.main' }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'primary.main' }}>
              {formatAllocationDate(selectedDateRange.start, 'short').replace(/\(.\)$/, '')} -{' '}
              {formatAllocationDate(selectedDateRange.end, 'short').replace(/\(.\)$/, '')}
            </Typography>
          </ClickableBox>
        )}

        {/* 詳細件数バッジ */}
        {detailsCount > 0 && (
          <StatusBadge variant="default">
            {detailsCount}品
          </StatusBadge>
        )}
      </Box>

      {/* 右側: コントロール */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        {/* 非表示行インジケーター */}
        {hiddenRowsCount > 0 && (
          <ClickableBox
            onClick={onShowAllRows}
            ariaLabel="非表示の行を再表示"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              bgcolor: 'warning.50',
              '&:hover': { bgcolor: 'warning.100' },
            }}
          >
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: 'warning.main' }}>
              {hiddenRowsCount}件非表示
            </Typography>
            <Visibility sx={{ fontSize: 14, color: 'warning.main' }} />
          </ClickableBox>
        )}

        {/* フルスクリーンボタン */}
        <IconButton
          size="small"
          onClick={handleToggleFullScreen}
          aria-label={isFullScreen ? 'フルスクリーンを解除' : 'フルスクリーンにする'}
          sx={{ p: 0.5, color: 'grey.500' }}
        >
          {isFullScreen ? <FullscreenExit sx={{ fontSize: 18 }} /> : <Fullscreen sx={{ fontSize: 18 }} />}
        </IconButton>

        {/* 設定ボタン（日付範囲表示時のみ） */}
        {selectedDateRange && (
          <IconButton
            size="small"
            onClick={onSettingsOpen}
            aria-label="詳細設定を開く"
            sx={{
              p: 0.5,
              color: settingsOpen ? 'primary.main' : 'grey.500',
            }}
          >
            <Settings sx={{ fontSize: 18 }} />
          </IconButton>
        )}

        {/* 閉じるボタン */}
        <IconButton
          size="small"
          onClick={handleClose}
          aria-label="閉じる"
          sx={{ p: 0.5, color: 'grey.500' }}
        >
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
};
