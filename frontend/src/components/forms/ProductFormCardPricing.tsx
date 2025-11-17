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
  const quantityPerPackage = useWatch({ control, name: `products.${index}.quantityPerPackage` });
  const centerCost = useWatch({ control, name: `products.${index}.centerCost` });
  const storeCost = useWatch({ control, name: `products.${index}.storeCost` });
  const priceExcludingTax = useWatch({ control, name: `products.${index}.priceExcludingTax` });
  const totalDelivery = useWatch({ control, name: 'totalDelivery' }) || 0;

  // センターフィー込原価を計算（13%込）
  const centerCostWithFee = centerCost ? Math.round(centerCost * 1.13) : 0;

  // 値入率を計算（(売価 - センターフィー込原価) / 売価 × 100）
  const profitMargin = priceExcludingTax && centerCostWithFee
    ? ((priceExcludingTax - centerCostWithFee) / priceExcludingTax * 100).toFixed(1)
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
        {/* 1. 商品名のチップ表示 */}
        <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.3, alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight="medium" sx={{ mr: 0.5 }}>
            商品 {index + 1}:
          </Typography>
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
        </Box>

        {/* 2. 総納品数入力欄 */}
        <Box sx={{ mb: 1.5 }}>
          <Controller
            name="totalDelivery"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="総納品数"
                placeholder="例: 100"
                size="small"
                fullWidth
                error={!!errors.totalDelivery}
                helperText={errors.totalDelivery?.message}
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
        </Box>

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
              helperText="センター着原価 × 1.13"
              sx={{
                '& .MuiInputBase-input': {
                  bgcolor: 'grey.50',
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
              helperText="(売価 - センターフィー込原価) / 売価 × 100"
              sx={{
                '& .MuiInputBase-input': {
                  bgcolor: 'grey.50',
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
                  bgcolor: 'grey.50',
                },
              }}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
