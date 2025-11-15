import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Card,
  CardContent,
  TextField,
  Grid,
  IconButton,
  Typography,
  Autocomplete,
  Box,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * ProductFormCardBasicのProps
 */
interface ProductFormCardBasicProps {
  /** 商品のインデックス */
  index: number;
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** 削除ハンドラ */
  onRemove: () => void;
  /** 削除ボタンの表示 */
  showRemove: boolean;
  /** 品名のオートコンプリート候補 */
  productNameOptions?: string[];
  /** 産地のオートコンプリート候補 */
  originOptions?: string[];
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
}

/**
 * 商品基本情報フォームカード
 *
 * 1つの商品の基本情報を入力するフォームです。
 * 品名、産地、規格、入数を入力します。
 */
export const ProductFormCardBasic: React.FC<ProductFormCardBasicProps> = ({
  index,
  control,
  errors,
  onRemove,
  showRemove,
  productNameOptions = [],
  originOptions = [],
  onEnterPress,
}) => {
  const productErrors = errors.products?.[index];

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="medium">商品 {index + 1}</Typography>
          {showRemove && (
            <IconButton onClick={onRemove} color="error" size="small" aria-label="商品を削除">
              <Delete fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Grid container spacing={1.5}>
          {/* 品名 */}
          <Grid item xs={12} sm={6}>
            <Controller
              name={`products.${index}.name`}
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={productNameOptions}
                  freeSolo
                  value={field.value || ''}
                  onChange={(_, newValue) => field.onChange(newValue || '')}
                  onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="品名"
                      placeholder="例: りんご"
                      error={!!productErrors?.name}
                      helperText={productErrors?.name?.message}
                      required
                    />
                  )}
                />
              )}
            />
          </Grid>

          {/* 産地 */}
          <Grid item xs={12} sm={6}>
            <Controller
              name={`products.${index}.origin`}
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={originOptions}
                  freeSolo
                  value={field.value || ''}
                  onChange={(_, newValue) => field.onChange(newValue || '')}
                  onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="産地"
                      placeholder="例: 青森県"
                      error={!!productErrors?.origin}
                      helperText={productErrors?.origin?.message}
                      required
                    />
                  )}
                />
              )}
            />
          </Grid>

          {/* 規格 */}
          <Grid item xs={12} sm={6}>
            <Controller
              name={`products.${index}.specification`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="規格"
                  placeholder="例: 10kg箱"
                  error={!!productErrors?.specification}
                  helperText={productErrors?.specification?.message}
                  value={field.value || ''}
                />
              )}
            />
          </Grid>

          {/* 入数（1パックの数量から名前変更） */}
          <Grid item xs={12} sm={6}>
            <Controller
              name={`products.${index}.quantityPerPackage`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="入数"
                  placeholder="例: 5"
                  error={!!productErrors?.quantityPerPackage}
                  helperText={productErrors?.quantityPerPackage?.message}
                  required
                  inputProps={{ min: 1, step: 1 }}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseInt(value, 10) : 1);
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
