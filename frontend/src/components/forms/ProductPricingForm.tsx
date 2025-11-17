import React from 'react';
import { useFieldArray } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import { Box, Typography, Alert } from '@mui/material';
import { ProductFormCardPricing } from './ProductFormCardPricing';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * ProductPricingFormのProps
 */
interface ProductPricingFormProps {
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
}

/**
 * Step 4: 商品価格情報フォーム
 *
 * 商品の価格情報（原価、売価）を入力します。
 */
export const ProductPricingForm: React.FC<ProductPricingFormProps> = ({
  control,
  errors,
  onEnterPress,
}) => {
  const { fields } = useFieldArray({
    control,
    name: 'products',
  });

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
        商品情報2（価格）を入力してください
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        各商品の原価と売価を入力してください。（{fields.length}件の商品）
      </Typography>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* 商品リスト */}
      {fields.length === 0 ? (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          まだ商品が追加されていません。前のステップで商品を追加してください。
        </Alert>
      ) : (
        fields.map((field, index) => (
          <ProductFormCardPricing
            key={field.id}
            index={index}
            control={control}
            errors={errors}
            onEnterPress={onEnterPress}
          />
        ))
      )}
    </Box>
  );
};
