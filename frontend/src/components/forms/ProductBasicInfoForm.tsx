import React from 'react';
import { useFieldArray } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import { Box, IconButton, Typography, Alert } from '@mui/material';
import { Add } from '@mui/icons-material';
import { ProductFormCardBasic } from './ProductFormCardBasic';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';

/**
 * ProductBasicInfoFormのProps
 */
interface ProductBasicInfoFormProps {
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
  /** 帳合先（履歴フィルタ用） */
  supplier?: string;
}

/**
 * Step 3: 商品基本情報フォーム
 *
 * 商品の基本情報（品名、産地、規格、入数）を入力します。
 * 商品の追加・削除が可能です。
 */
export const ProductBasicInfoForm: React.FC<ProductBasicInfoFormProps> = ({
  control,
  errors,
  productNameOptions,
  originOptions,
  onEnterPress,
  supplier,
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
      {/* ヘッダーセクション（固定） */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight="medium">
          商品情報を入力してください
        </Typography>
        <IconButton
          onClick={handleAddProduct}
          disabled={fields.length >= 10}
          size="small"
          color="primary"
          aria-label="商品を追加"
        >
          <Add />
        </IconButton>
      </Box>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* 商品リスト */}
      {fields.map((field, index) => (
        <ProductFormCardBasic
          key={field.id}
          index={index}
          control={control}
          errors={errors}
          onRemove={() => handleRemoveProduct(index)}
          showRemove={fields.length > 1}
          productNameOptions={productNameOptions}
          originOptions={originOptions}
          onEnterPress={onEnterPress}
          supplier={supplier}
        />
      ))}

      {/* 最大数エラー */}
      {fields.length >= 10 && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          商品は最大10個まで追加できます
        </Typography>
      )}
    </Box>
  );
};
