import { Box, type SxProps, type Theme } from '@mui/material';
import { forwardRef } from 'react';

/**
 * ClickableBox Props
 */
export interface ClickableBoxProps {
  /** 子要素 */
  children: React.ReactNode;
  /** クリック時のハンドラ */
  onClick: () => void;
  /** アクセシビリティ用のラベル */
  ariaLabel: string;
  /** role属性（デフォルト: button） */
  role?: string;
  /** 無効化するか */
  disabled?: boolean;
  /** タブ順序（デフォルト: 0） */
  tabIndex?: number;
  /** 追加のスタイル */
  sx?: SxProps<Theme>;
}

/**
 * ClickableBox Component
 *
 * アクセシビリティ対応済みのクリック可能なBoxコンポーネント。
 * キーボード操作（Enter/Space）、フォーカス、ARIA属性を適切に処理します。
 *
 * **特徴:**
 * - キーボード操作対応（Enter/Space）
 * - ARIA属性自動設定（role, aria-label, aria-disabled）
 * - フォーカス管理（tabIndex）
 * - カーソルスタイル自動適用
 * - disabled状態のサポート
 *
 * **アクセシビリティ:**
 * - WCAG 2.1 AA準拠
 * - スクリーンリーダー対応
 * - キーボードナビゲーション対応
 *
 * @example
 * ```tsx
 * <ClickableBox
 *   onClick={() => setDatePickerOpen(true)}
 *   ariaLabel="日付範囲を変更"
 *   sx={{ px: 0.75, py: 0.25, borderRadius: 1, bgcolor: 'primary.50' }}
 * >
 *   <DateRange sx={{ fontSize: 14 }} />
 *   <Typography>1/1 - 1/7</Typography>
 * </ClickableBox>
 * ```
 */
export const ClickableBox = forwardRef<HTMLDivElement, ClickableBoxProps>(
  (
    {
      children,
      onClick,
      ariaLabel,
      role = 'button',
      disabled = false,
      tabIndex = 0,
      sx = {},
    },
    ref
  ) => {
    // キーボードハンドラ（Enter または Space）
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    };

    // クリックハンドラ
    const handleClick = () => {
      if (disabled) return;
      onClick();
    };

    return (
      <Box
        ref={ref}
        role={role}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : tabIndex}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        sx={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          outline: 'none',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
          ...sx,
        }}
      >
        {children}
      </Box>
    );
  }
);

ClickableBox.displayName = 'ClickableBox';
