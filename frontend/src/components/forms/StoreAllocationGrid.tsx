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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_NAMES } from '@/utils/constants';

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
 * Material-UIのTableを使用して36店舗への配分数を入力します。
 * - 編集可能なテーブル
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
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                </Box>

                {/* ステータスチップ */}
                <Box sx={{ mt: 2 }}>
                  {remaining === 0 ? (
                    <Chip label="配分完了" color="success" size="small" />
                  ) : remaining > 0 ? (
                    <Chip label={`残り ${remaining} 個を配分してください`} color="warning" size="small" />
                  ) : (
                    <Chip label={`${Math.abs(remaining)} 個超過しています`} color="error" size="small" />
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* 店舗配分テーブル */}
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                      店舗名
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }} align="right">
                      配分数
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {STORE_NAMES.map((storeName, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                        '&:hover': { bgcolor: 'action.selected' },
                      }}
                    >
                      <TableCell component="th" scope="row">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {storeName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={allocations[index] || 0}
                          onChange={(e) => handleChange(index, e.target.value)}
                          inputProps={{
                            min: 0,
                            step: 1,
                            style: { textAlign: 'right' },
                          }}
                          sx={{
                            width: 100,
                            '& input': {
                              bgcolor: allocations[index] > 0 ? 'success.lighter' : 'transparent',
                              fontWeight: allocations[index] > 0 ? 600 : 400,
                            },
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* 合計表示 */}
            <Card variant="outlined" sx={{ mt: 2, bgcolor: remaining === 0 ? 'success.lighter' : 'warning.lighter' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">合計</Typography>
                  <Typography
                    variant="h5"
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
