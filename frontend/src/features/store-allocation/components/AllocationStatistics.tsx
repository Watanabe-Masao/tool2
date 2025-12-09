import { Box, Card, CardContent, Typography } from '@mui/material';

/**
 * AllocationStatistics Props
 */
export interface AllocationStatisticsProps {
  /** 配分済み合計 */
  totalAllocated: number;
  /** 総納品数 */
  totalDelivery: number;
  /** 原価合計 */
  totalCost: number;
  /** 売価合計 */
  totalPrice: number;
  /** 粗利合計 */
  totalProfit: number;
  /** 粗利率（%） */
  profitRate: number;
}

/**
 * 配分統計表示コンポーネント
 *
 * 配分の統計情報（原価・売価・粗利）を表示します。
 */
export const AllocationStatistics: React.FC<AllocationStatisticsProps> = ({
  totalAllocated,
  totalDelivery,
  totalCost,
  totalPrice,
  totalProfit,
  profitRate,
}) => {
  const remaining = totalDelivery - totalAllocated;

  return (
    <Card
      variant="outlined"
      sx={{
        mt: 2,
        borderWidth: 2,
        borderColor: 'primary.main',
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, color: 'text.secondary' }}>
            配分統計
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
            配分数: {totalAllocated} / {totalDelivery} ({remaining < 0 ? `超過${Math.abs(remaining)}` : `残${remaining}`})
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary', display: 'block' }}>
              原価合計
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.primary' }}>
              ¥{totalCost.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary', display: 'block' }}>
              売価合計
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'primary.main' }}>
              ¥{totalPrice.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary', display: 'block' }}>
              粗利合計
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: totalProfit >= 0 ? 'success.main' : 'error.main' }}>
              ¥{totalProfit.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary', display: 'block' }}>
              粗利率
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: profitRate >= 0 ? 'success.main' : 'error.main' }}>
              {profitRate.toFixed(1)}%
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
