import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  TextField,
  Grid,
  Paper,
} from '@mui/material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_DATA } from '@/utils/constants';

/**
 * StoreAllocationGridのProps
 */
interface StoreAllocationGridProps {
  /** 商品のインデックス */
  productIndex: number;
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** 総納品数 */
  totalDelivery: number;
}

/**
 * Step 5: 36店舗配分グリッド
 *
 * 6列×6行のグリッドレイアウトで36店舗への配分数を入力します。
 * - 編集可能なグリッド
 * - リアルタイムバリデーション
 * - 合計・差分の自動計算
 */
export const StoreAllocationGrid: React.FC<StoreAllocationGridProps> = ({
  productIndex,
  control,
  errors,
  totalDelivery,
}) => {
  const productErrors = errors.products?.[productIndex];

  return (
    <Controller
      name={`products.${productIndex}.storeAllocations`}
      control={control}
      render={({ field }) => {
        const allocations = field.value || new Array(36).fill(0);

        /**
         * 合計配分数を計算
         */
        const totalAllocated = allocations.reduce((sum: number, val: number) => sum + val, 0);

        /**
         * 残りの配分数を計算
         */
        const remaining = totalDelivery - totalAllocated;

        /**
         * 配分数変更ハンドラー
         */
        const handleChange = (index: number, value: string) => {
          const newAllocations = [...allocations];
          const numValue = parseInt(value, 10);
          newAllocations[index] = isNaN(numValue) || numValue < 0 ? 0 : numValue;
          field.onChange(newAllocations);
        };

        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              店舗への配分数を入力してください
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              36店舗への配分数を入力してください。合計が総納品数と一致する必要があります。
            </Typography>

            {/* エラー表示 */}
            {productErrors?.storeAllocations && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {productErrors.storeAllocations.message}
              </Alert>
            )}

            {/* 統計情報 */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      総納品数
                    </Typography>
                    <Typography variant="h6">{totalDelivery}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      配分済み
                    </Typography>
                    <Typography variant="h6" color={remaining === 0 ? 'success.main' : 'text.primary'}>
                      {totalAllocated}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      残り
                    </Typography>
                    <Typography
                      variant="h6"
                      color={remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main'}
                    >
                      {remaining}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto' }}>
                    {remaining === 0 ? (
                      <Chip label="✓ 配分完了" color="success" />
                    ) : remaining > 0 ? (
                      <Chip label={`残り ${remaining} 個`} color="warning" />
                    ) : (
                      <Chip label={`${Math.abs(remaining)} 個超過`} color="error" />
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* 店舗配分グリッド（6列×6行） */}
            <Grid container spacing={2}>
              {STORE_DATA.map((store, index) => (
                <Grid item xs={12} sm={6} md={4} lg={2} key={store.code}>
                  <Paper
                    elevation={allocations[index] > 0 ? 3 : 1}
                    sx={{
                      p: 2,
                      height: '100%',
                      bgcolor: allocations[index] > 0 ? 'success.light' : 'background.paper',
                      border: allocations[index] > 0 ? '2px solid' : '1px solid',
                      borderColor: allocations[index] > 0 ? 'success.main' : 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 3,
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    {/* 店番 */}
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: 'text.secondary',
                        fontWeight: 600,
                        mb: 0.5,
                      }}
                    >
                      No.{store.code}
                    </Typography>

                    {/* 店舗名 */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        minHeight: '2.5em',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {store.name}
                    </Typography>

                    {/* 配分数入力 */}
                    <TextField
                      type="number"
                      size="small"
                      value={allocations[index] || ''}
                      onChange={(e) => handleChange(index, e.target.value)}
                      placeholder="0"
                      inputProps={{
                        min: 0,
                        step: 1,
                        style: { textAlign: 'center', fontSize: '1.1rem', fontWeight: 600 },
                      }}
                      sx={{
                        width: '100%',
                        '& input': {
                          bgcolor: 'background.paper',
                        },
                      }}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* 合計表示 */}
            <Card
              variant="outlined"
              sx={{
                mt: 3,
                bgcolor: remaining === 0 ? 'success.light' : remaining < 0 ? 'error.light' : 'warning.light',
                borderColor: remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main',
                borderWidth: 2,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    合計
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 'bold',
                      color: remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main',
                    }}
                  >
                    {totalAllocated} / {totalDelivery}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        );
      }}
    />
  );
};
