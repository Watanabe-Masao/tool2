import React from 'react';
import { Controller, useWatch } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Card,
  CardContent,
  TextField,
  Grid,
  Typography,
  Box,
} from '@mui/material';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * ProductFormCardPricingのProps
 */
interface ProductFormCardPricingProps {
  /** 商品のインデックス */
  index: number;
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
}

/**
 * 商品価格情報フォームカード
 *
 * 1つの商品の価格情報を入力するフォームです。
 * 原価（店原）と売価（本体価格）を入力します。
 */
export const ProductFormCardPricing: React.FC<ProductFormCardPricingProps> = ({
  index,
  control,
  errors,
  onEnterPress,
}) => {
  const productErrors = errors.products?.[index];

  // 各フィールドを監視
  const productName = useWatch({ control, name: `products.${index}.name` });
  const origin = useWatch({ control, name: `products.${index}.origin` });
  const specification = useWatch({ control, name: `products.${index}.specification` });
  const quantityPerPackage = useWatch({ control, name: `products.${index}.quantityPerPackage` });
  const unit = useWatch({ control, name: `products.${index}.unit` });
  const centerCost = useWatch({ control, name: `products.${index}.centerCost` });
  const storeCost = useWatch({ control, name: `products.${index}.storeCost` });
  const priceExcludingTax = useWatch({ control, name: `products.${index}.priceExcludingTax` });
  const totalDelivery = useWatch({ control, name: `products.${index}.totalDelivery` }) || 0;
  const centerFeeRate = useWatch({ control, name: `products.${index}.centerFeeRate` }) || 13;

  // センターフィー込原価を計算（センター着原価 × (1 + センターフィー率 / 100)）
  const centerCostWithFee = centerCost ? Math.round(centerCost * (1 + centerFeeRate / 100)) : 0;

  // 値入率を計算（(売価 - 店着原価) / 売価 × 100）
  const profitMargin = priceExcludingTax && storeCost
    ? ((priceExcludingTax - storeCost) / priceExcludingTax * 100).toFixed(1)
    : '0.0';

  // 差益を計算（(店着原価 - センターフィー込原価) × (総納品数 × 入数)）
  const profitAmount = storeCost && centerCostWithFee && totalDelivery && quantityPerPackage
    ? Math.round((storeCost - centerCostWithFee) * (totalDelivery * quantityPerPackage))
    : 0;

  /**
   * Enterキー押下時のハンドラー
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnterPress && e.target instanceof HTMLInputElement) {
      if (e.target.type !== 'textarea') {
        e.preventDefault();
        onEnterPress();
      }
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }} onKeyDown={handleKeyDown}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* 1. 商品名のチップ表示: （産地）（商品名）（規格）（入数＋単位） */}
        <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.3, alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight="medium" sx={{ mr: 0.5 }}>
            商品 {index + 1}:
          </Typography>
          {origin && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: 'grey.200',
                color: 'text.primary',
                fontSize: '0.75rem',
              }}
            >
              {origin}
            </Box>
          )}
          {productName && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: 'grey.200',
                color: 'text.primary',
                fontSize: '0.75rem',
              }}
            >
              {productName}
            </Box>
          )}
          {specification && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: 'grey.200',
                color: 'text.primary',
                fontSize: '0.75rem',
              }}
            >
              {specification}
            </Box>
          )}
          {quantityPerPackage && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: 'grey.200',
                color: 'text.primary',
                fontSize: '0.75rem',
              }}
            >
              {quantityPerPackage}{unit}
            </Box>
          )}
        </Box>

        {/* 2. 総納品数 / センターフィー率 */}
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Controller
              name={`products.${index}.totalDelivery`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="総納品数"
                  placeholder="例: 100"
                  size="small"
                  fullWidth
                  error={!!productErrors?.totalDelivery}
                  helperText={productErrors?.totalDelivery?.message}
                  required
                  inputProps={{ min: 1, step: 1 }}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseInt(value, 10) : 0);
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={6}>
            <Controller
              name={`products.${index}.centerFeeRate`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="センターフィー（%）"
                  placeholder="例: 13"
                  size="small"
                  fullWidth
                  error={!!productErrors?.centerFeeRate}
                  helperText={productErrors?.centerFeeRate?.message}
                  required
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseFloat(value) : 13);
                  }}
                />
              )}
            />
          </Grid>
        </Grid>

        {/* 3. センター着原価 / センターフィー込原価 */}
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Controller
              name={`products.${index}.centerCost`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="センター着原価"
                  placeholder="例: 500"
                  size="small"
                  fullWidth
                  error={!!productErrors?.centerCost}
                  helperText={productErrors?.centerCost?.message}
                  required
                  inputProps={{ min: 0, step: 1 }}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseFloat(value) : 0);
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="センターフィー込原価"
              value={centerCostWithFee ? `¥${centerCostWithFee.toLocaleString()}` : '-'}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
              }}
              helperText={`センター着原価 × ${(1 + centerFeeRate / 100).toFixed(2)}`}
              sx={{
                '& .MuiInputBase-input': {
                  bgcolor: 'grey.200',
                  fontWeight: 'medium',
                },
              }}
            />
          </Grid>
        </Grid>

        {/* 4. 店着原価 / 売価 */}
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Controller
              name={`products.${index}.storeCost`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="店原（原価）"
                  placeholder="例: 600"
                  size="small"
                  fullWidth
                  error={!!productErrors?.storeCost}
                  helperText={productErrors?.storeCost?.message}
                  required
                  inputProps={{ min: 0, step: 1 }}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseFloat(value) : 0);
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={6}>
            <Controller
              name={`products.${index}.priceExcludingTax`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="本体価格（税抜・売価）"
                  placeholder="例: 1000"
                  size="small"
                  fullWidth
                  error={!!productErrors?.priceExcludingTax}
                  helperText={productErrors?.priceExcludingTax?.message}
                  required
                  inputProps={{ min: 0, step: 1 }}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseFloat(value) : 0);
                  }}
                />
              )}
            />
          </Grid>
        </Grid>

        {/* 5. 値入率 / 差益 */}
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <TextField
              label="値入率"
              value={`${profitMargin}%`}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
              }}
              helperText="(売価 - 店着原価) / 売価 × 100"
              sx={{
                '& .MuiInputBase-input': {
                  bgcolor: 'grey.200',
                  fontWeight: 'medium',
                },
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="差益"
              value={profitAmount ? `¥${profitAmount.toLocaleString()}` : '-'}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
              }}
              helperText="(店着原価 - センターフィー込原価) × (総納品数 × 入数)"
              sx={{
                '& .MuiInputBase-input': {
                  bgcolor: profitAmount < 0 ? 'error.light' : 'grey.200',
                  color: profitAmount < 0 ? 'error.dark' : 'text.primary',
                  fontWeight: 'medium',
                },
              }}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
