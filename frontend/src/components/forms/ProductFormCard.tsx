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
 * ProductFormCardのProps
 */
interface ProductFormCardProps {
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
}

/**
 * 商品情報フォームカード
 *
 * 1つの商品の情報を入力するフォームです。
 * 品名、産地、規格、数量、店原、価格を入力します。
 */
export const ProductFormCard: React.FC<ProductFormCardProps> = ({
  index,
  control,
  errors,
  onRemove,
  showRemove,
  productNameOptions = [],
  originOptions = [],
}) => {
  const productErrors = errors.products?.[index];

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">商品 {index + 1}</Typography>
          {showRemove && (
            <IconButton onClick={onRemove} color="error" aria-label="商品を削除">
              <Delete />
            </IconButton>
          )}
        </Box>

        <Grid container spacing={2}>
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

          {/* 1パックの数量 */}
          <Grid item xs={12} sm={6}>
            <Controller
              name={`products.${index}.quantityPerPackage`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="1パックの数量"
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

          {/* 店原 */}
          <Grid item xs={12} sm={6}>
            <Controller
              name={`products.${index}.storeCost`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="店原"
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

          {/* 本体価格（税抜） */}
          <Grid item xs={12} sm={6}>
            <Controller
              name={`products.${index}.priceExcludingTax`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="本体価格（税抜）"
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
