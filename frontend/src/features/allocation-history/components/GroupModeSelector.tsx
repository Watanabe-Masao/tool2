import { Box, Typography } from '@mui/material';
import { StatusBadge } from '@/components/ui';
import { useCallback } from 'react';
import { FONT_SIZE, SPACING, BORDER_RADIUS, TRANSITION } from '../styles';

/**
 * GroupMode type
 */
export type GroupMode = 'date' | 'product' | 'composite';

/**
 * GroupModeSelector Props
 */
export interface GroupModeSelectorProps {
  /** 現在のグループモード */
  groupMode: GroupMode;
  /** グループモード変更ハンドラ */
  onGroupModeChange: (mode: GroupMode) => void;
  /** フィルター数 */
  filterCount: number;
  /** 非表示数 */
  hiddenCount: number;
}

/**
 * GroupModeSelector Component
 *
 * 配分履歴のグループ化モード選択コンポーネント。
 * 日付/商品/複合の3つのモードを切り替え、フィルター・非表示数を表示します。
 *
 * **機能:**
 * - グループモード切り替え（日付/商品/複合）
 * - アクティブモードのビジュアル表示
 * - フィルター数バッジ表示
 * - 非表示数バッジ表示
 *
 * @example
 * ```tsx
 * <GroupModeSelector
 *   groupMode="product"
 *   onGroupModeChange={(mode) => setGroupMode(mode)}
 *   filterCount={3}
 *   hiddenCount={5}
 * />
 * ```
 */
export const GroupModeSelector: React.FC<GroupModeSelectorProps> = ({
  groupMode,
  onGroupModeChange,
  filterCount,
  hiddenCount,
}) => {
  // グループモードオプション
  const groupModeOptions: Array<{ value: GroupMode; label: string }> = [
    { value: 'date', label: '日付' },
    { value: 'product', label: '商品' },
    { value: 'composite', label: '複合' },
  ];

  // useCallbackでメモ化
  const handleModeChange = useCallback(
    (mode: GroupMode) => {
      onGroupModeChange(mode);
    },
    [onGroupModeChange]
  );

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2 },
        py: 0.75,
        borderBottom: '1px solid',
        borderColor: 'grey.100',
        background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {/* グループラベル */}
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'grey.600' }}>
          グループ:
        </Typography>

        {/* グループモードボタン */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {groupModeOptions.map((option) => (
            <Box
              key={option.value}
              onClick={() => handleModeChange(option.value)}
              role="button"
              tabIndex={0}
              aria-label={`グループモードを${option.label}に変更`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleModeChange(option.value);
                }
              }}
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                bgcolor: groupMode === option.value ? 'primary.main' : 'white',
                color: groupMode === option.value ? 'white' : 'grey.600',
                border: '1px solid',
                borderColor: groupMode === option.value ? 'primary.main' : 'grey.300',
                '&:hover': {
                  bgcolor: groupMode === option.value ? 'primary.dark' : 'grey.50',
                },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: '2px',
                },
              }}
            >
              {option.label}
            </Box>
          ))}
        </Box>

        {/* フィルター数バッジ */}
        {filterCount > 0 && (
          <StatusBadge variant="primary">
            フィルター {filterCount}
          </StatusBadge>
        )}

        {/* 非表示数バッジ */}
        {hiddenCount > 0 && (
          <StatusBadge variant="warning">
            非表示 {hiddenCount}
          </StatusBadge>
        )}
      </Box>
    </Box>
  );
};
