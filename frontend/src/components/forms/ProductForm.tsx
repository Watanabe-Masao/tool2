import React from 'react';
import { useFieldArray } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import { Box, Button, Typography, Alert } from '@mui/material';
import { Add } from '@mui/icons-material';
import { ProductFormCard } from './ProductFormCard';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';

/**
 * ProductFormのProps
 */
interface ProductFormProps {
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** 品名のオートコンプリート候補 */
  productNameOptions?: string[];
  /** 産地のオートコンプリート候補 */
  originOptions?: string[];
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
}

/**
 * Step 3: 商品情報フォーム
 *
 * 複数の商品情報を入力します。
 * 商品の追加・削除が可能です。
 */
export const ProductForm: React.FC<ProductFormProps> = ({
  control,
  errors,
  productNameOptions,
  originOptions,
  onEnterPress,
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'products',
  });

  /**
   * 商品を追加
   */
  const handleAddProduct = () => {
    append({
      ...DEFAULT_PRODUCT_FORM_DATA,
      totalDelivery: 0,
      storeAllocations: new Array(STORE_COUNT).fill(0),
    });
  };

  /**
   * 商品を削除
   */
  const handleRemoveProduct = (index: number) => {
    remove(index);
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
        商品情報を入力してください
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        配分表に掲載する商品の情報を入力してください。複数の商品を追加できます。
      </Typography>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* 商品リスト */}
      {fields.map((field, index) => (
        <ProductFormCard
          key={field.id}
          index={index}
          control={control}
          errors={errors}
          onRemove={() => handleRemoveProduct(index)}
          showRemove={fields.length > 1}
          productNameOptions={productNameOptions}
          originOptions={originOptions}
          onEnterPress={onEnterPress}
        />
      ))}

      {/* 商品を追加ボタン */}
      <Button
        variant="outlined"
        startIcon={<Add />}
        onClick={handleAddProduct}
        fullWidth
        sx={{ mt: 1.5 }}
        disabled={fields.length >= 10}
      >
        商品を追加
      </Button>

      {fields.length >= 10 && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          商品は最大10個まで追加できます
        </Typography>
      )}
    </Box>
  );
};
