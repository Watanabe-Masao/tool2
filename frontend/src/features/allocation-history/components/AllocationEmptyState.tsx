import { Box, Typography } from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';

/**
 * AllocationEmptyState Component
 *
 * 配分履歴が存在しない場合の空状態表示。
 * ユーザーに次のアクションを促すメッセージを表示します。
 *
 * @example
 * ```tsx
 * {batches.length === 0 && <AllocationEmptyState />}
 * ```
 */
export const AllocationEmptyState: React.FC = () => {
  return (
    <Box
      sx={{
        py: 6,
        px: 3,
        textAlign: 'center',
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'grey.300',
        bgcolor: 'grey.50',
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: 'grey.200',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <CalendarMonth sx={{ fontSize: 24, color: 'grey.400' }} />
      </Box>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'grey.600', mb: 0.5 }}>
        配分履歴がありません
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: 'grey.500' }}>
        配分表を生成して「履歴を保存」すると、ここに表示されます
      </Typography>
    </Box>
  );
};
