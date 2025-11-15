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

  // 商品名を監視して表示
  const productName = useWatch({
    control,
    name: `products.${index}.name`,
  });

  /**
   * Enterキー押下時のハンドラー
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnterPress && e.target instanceof HTMLInputElement) {
      // テキストエリア以外でEnterが押された場合
      if (e.target.type !== 'textarea') {
        e.preventDefault();
        onEnterPress();
      }
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }} onKeyDown={handleKeyDown}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            商品 {index + 1}: {productName || '未入力'}
          </Typography>
        </Box>

        <Grid container spacing={1.5}>
          {/* 店原（原価） */}
          <Grid item xs={12} sm={6}>
            <Controller
              name={`products.${index}.storeCost`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="店原（原価）"
                  placeholder="例: 500"
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

          {/* 本体価格（税抜）（売価） */}
          <Grid item xs={12} sm={6}>
            <Controller
              name={`products.${index}.priceExcludingTax`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="本体価格（税抜・売価）"
                  placeholder="例: 1000"
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
      </CardContent>
    </Card>
  );
};
