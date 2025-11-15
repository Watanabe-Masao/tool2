import React from 'react';
import { Controller, useWatch } from 'react-hook-form';
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
  Stack,
  Chip,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { useProductHistory } from '@/hooks/useProductHistory';

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
  /** 帳合先（履歴フィルタ用） */
  supplier?: string;
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
  supplier,
}) => {
  const productErrors = errors.products?.[index];

  // 商品履歴フック（帳合先でフィルタ）
  const {
    getUniqueNames,
    getUniqueOrigins,
    getUniqueSpecifications,
    getUniqueQuantities,
    getUniqueUnits,
  } = useProductHistory(supplier);

  // 現在の値を監視
  const currentName = useWatch({ control, name: `products.${index}.name` });
  const currentOrigin = useWatch({ control, name: `products.${index}.origin` });
  const currentSpecification = useWatch({ control, name: `products.${index}.specification` });

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
          <Grid item xs={12}>
            <Controller
              name={`products.${index}.name`}
              control={control}
              render={({ field }) => (
                <Box>
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
                  {/* 品名履歴チップ */}
                  {supplier && getUniqueNames.length > 0 && (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      {getUniqueNames.slice(0, 10).map((name) => (
                        <Chip
                          key={name}
                          label={name}
                          size="small"
                          onClick={() => field.onChange(name)}
                          color={field.value === name ? 'primary' : 'default'}
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
            />
          </Grid>

          {/* 産地 */}
          <Grid item xs={12}>
            <Controller
              name={`products.${index}.origin`}
              control={control}
              render={({ field }) => {
                const origins = currentName ? getUniqueOrigins(currentName) : [];
                return (
                  <Box>
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
                    {/* 産地履歴チップ */}
                    {origins.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                        {origins.slice(0, 10).map((origin) => (
                          <Chip
                            key={origin}
                            label={origin}
                            size="small"
                            onClick={() => field.onChange(origin)}
                            color={field.value === origin ? 'primary' : 'default'}
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              }}
            />
          </Grid>

          {/* 規格 */}
          <Grid item xs={12}>
            <Controller
              name={`products.${index}.specification`}
              control={control}
              render={({ field }) => {
                const specifications =
                  currentName && currentOrigin
                    ? getUniqueSpecifications(currentName, currentOrigin)
                    : [];
                return (
                  <Box>
                    <TextField
                      {...field}
                      label="規格"
                      placeholder="例: 10kg箱"
                      error={!!productErrors?.specification}
                      helperText={productErrors?.specification?.message}
                      value={field.value || ''}
                      fullWidth
                    />
                    {/* 規格履歴チップ */}
                    {specifications.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                        {specifications.slice(0, 10).map((spec) => (
                          <Chip
                            key={spec}
                            label={spec}
                            size="small"
                            onClick={() => field.onChange(spec)}
                            color={field.value === spec ? 'primary' : 'default'}
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              }}
            />
          </Grid>

          {/* 入数 */}
          <Grid item xs={6}>
            <Controller
              name={`products.${index}.quantityPerPackage`}
              control={control}
              render={({ field }) => {
                const quantities =
                  currentName && currentOrigin && currentSpecification
                    ? getUniqueQuantities(currentName, currentOrigin, currentSpecification)
                    : [];
                return (
                  <Box>
                    <TextField
                      {...field}
                      type="number"
                      label="入数"
                      placeholder="例: 40"
                      error={!!productErrors?.quantityPerPackage}
                      helperText={productErrors?.quantityPerPackage?.message}
                      inputProps={{ min: 1, step: 1 }}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value ? parseInt(value, 10) : null);
                      }}
                      fullWidth
                    />
                    {/* 入数履歴チップ */}
                    {quantities.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                        {quantities.slice(0, 10).map((qty) => (
                          <Chip
                            key={qty}
                            label={String(qty)}
                            size="small"
                            onClick={() => field.onChange(qty)}
                            color={field.value === qty ? 'primary' : 'default'}
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              }}
            />
          </Grid>

          {/* 単位 */}
          <Grid item xs={6}>
            <Controller
              name={`products.${index}.unit`}
              control={control}
              render={({ field }) => {
                const units =
                  currentName && currentOrigin && currentSpecification
                    ? getUniqueUnits(currentName, currentOrigin, currentSpecification)
                    : [];
                return (
                  <Box>
                    <TextField
                      {...field}
                      label="単位"
                      placeholder="例: 玉、g、個"
                      error={!!productErrors?.unit}
                      helperText={productErrors?.unit?.message}
                      value={field.value || ''}
                      fullWidth
                    />
                    {/* 単位履歴チップ */}
                    {units.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                        {units.slice(0, 10).map((unit) => (
                          <Chip
                            key={unit}
                            label={unit}
                            size="small"
                            onClick={() => field.onChange(unit)}
                            color={field.value === unit ? 'primary' : 'default'}
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              }}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
