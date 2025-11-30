import { Box, Typography } from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';

/**
 * EmptyState Props
 */
export interface EmptyStateProps {
  /** アイコン（省略時はCalendarMonthを使用） */
  icon?: React.ReactNode;
  /** タイトル */
  title: string;
  /** 説明文（省略可） */
  description?: string;
  /** 枠線を表示するか */
  bordered?: boolean;
  /** アイコンの背景色（デフォルト: grey.200） */
  iconBgColor?: string;
  /** アイコンの色（デフォルト: grey.400） */
  iconColor?: string;
}

/**
 * EmptyState Component
 *
 * データが空の場合の状態表示コンポーネント。
 * アイコン、タイトル、説明文を含む統一されたUI。
 *
 * **特徴:**
 * - カスタマイズ可能なアイコン
 * - オプションの枠線表示
 * - レスポンシブデザイン
 * - 一貫したパディング・スタイル
 *
 * @example
 * ```tsx
 * // 基本的な使用
 * <EmptyState
 *   title="データがありません"
 *   description="検索条件を変更してください"
 * />
 *
 * // 枠線付き + カスタムアイコン
 * <EmptyState
 *   icon={<Inbox />}
 *   title="配分履歴がありません"
 *   description="配分表を生成して「履歴を保存」すると、ここに表示されます"
 *   bordered
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  bordered = false,
  iconBgColor = 'grey.200',
  iconColor = 'grey.400',
}) => {
  // デフォルトアイコン
  const defaultIcon = <CalendarMonth sx={{ fontSize: 24, color: iconColor }} />;

  return (
    <Box
      sx={{
        py: 6,
        px: 3,
        textAlign: 'center',
        ...(bordered && {
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'grey.300',
          bgcolor: 'grey.50',
        }),
      }}
    >
      {/* アイコン */}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: iconBgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        {icon || defaultIcon}
      </Box>

      {/* タイトル */}
      <Typography
        sx={{
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'grey.600',
          mb: description ? 0.5 : 0,
        }}
      >
        {title}
      </Typography>

      {/* 説明文 */}
      {description && (
        <Typography sx={{ fontSize: '0.75rem', color: 'grey.500' }}>
          {description}
        </Typography>
      )}
    </Box>
  );
};
