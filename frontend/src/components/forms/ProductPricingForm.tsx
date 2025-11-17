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
  /** 商品数（親から渡される） */
  productCount?: number;
  /** 総納品数 */
  totalDelivery?: number;
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
  productCount = 1,
  totalDelivery = 0,
}) => {
  const { fields } = useFieldArray({
    control,
    name: 'products',
  });

  // デバッグ用ログ
  React.useEffect(() => {
    console.log('[ProductPricingForm] fields:', fields.length, 'productCount:', productCount);
  }, [fields, productCount]);

  // productCountとfields.lengthの大きい方を使用
  const actualProductCount = Math.max(fields.length, productCount);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
        商品情報2（価格）を入力してください（{actualProductCount}件の商品）
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        各商品の原価と売価を入力してください。
      </Typography>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* 商品リスト */}
      {Array.from({ length: actualProductCount }, (_, index) => (
        <ProductFormCardPricing
          key={`product-${index}`}
          index={index}
          control={control}
          errors={errors}
          onEnterPress={onEnterPress}
          totalDelivery={totalDelivery}
        />
      ))}
    </Box>
  );
};
