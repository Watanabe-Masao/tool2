import { Typography, type SxProps, type Theme } from '@mui/material';

/**
 * StatusBadge Variant
 */
export type StatusBadgeVariant = 'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'success';

/**
 * StatusBadge Size
 */
export type StatusBadgeSize = 'small' | 'medium';

/**
 * StatusBadge Props
 */
export interface StatusBadgeProps {
  /** バッジに表示するテキスト */
  children: React.ReactNode;
  /** バッジの色バリアント */
  variant?: StatusBadgeVariant;
  /** バッジのサイズ */
  size?: StatusBadgeSize;
  /** 追加のスタイル */
  sx?: SxProps<Theme>;
}

/**
 * StatusBadge Component
 *
 * ステータス表示用のバッジコンポーネント。
 * 一貫したスタイルでステータス、カウント、ラベルなどを表示します。
 *
 * **特徴:**
 * - 6つのカラーバリアント（default, primary, secondary, warning, error, success）
 * - 2つのサイズ（small, medium）
 * - 統一されたパディング・ボーダー・フォント設定
 * - カスタムスタイル追加可能
 *
 * @example
 * ```tsx
 * <StatusBadge variant="primary">10件</StatusBadge>
 * <StatusBadge variant="warning" size="small">フィルター 3</StatusBadge>
 * <StatusBadge variant="default">配分履歴</StatusBadge>
 * ```
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  children,
  variant = 'default',
  size = 'small',
  sx = {},
}) => {
  // バリアントごとの色設定
  const variantStyles: Record<StatusBadgeVariant, { color: string; bgcolor: string }> = {
    default: {
      color: 'grey.500',
      bgcolor: 'grey.100',
    },
    primary: {
      color: 'primary.main',
      bgcolor: 'primary.50',
    },
    secondary: {
      color: 'secondary.main',
      bgcolor: 'secondary.50',
    },
    warning: {
      color: 'warning.main',
      bgcolor: 'warning.50',
    },
    error: {
      color: 'error.main',
      bgcolor: 'error.50',
    },
    success: {
      color: 'success.main',
      bgcolor: 'success.50',
    },
  };

  // サイズごとのスタイル設定
  const sizeStyles: Record<StatusBadgeSize, SxProps<Theme>> = {
    small: {
      fontSize: '0.65rem',
      px: 0.75,
      py: 0.25,
    },
    medium: {
      fontSize: '0.7rem',
      px: 1,
      py: 0.375,
    },
  };

  return (
    <Typography
      component="span"
      sx={{
        fontWeight: 600,
        borderRadius: 1,
        display: 'inline-block',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
};
