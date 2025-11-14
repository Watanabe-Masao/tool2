import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import { TextField, Typography, Box, Autocomplete } from '@mui/material';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * SupplierFormのProps
 */
interface SupplierFormProps {
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** オートコンプリート候補（オプション） */
  supplierOptions?: string[];
}

/**
 * Step 2: 帳合先入力フォーム
 *
 * 商品の帳合先（仕入先）を入力します。
 * オートコンプリート機能で過去の入力履歴から選択可能です。
 */
export const SupplierForm: React.FC<SupplierFormProps> = ({
  control,
  errors,
  supplierOptions = [],
}) => {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        帳合先を入力してください
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        商品の帳合先（仕入先）を入力してください。過去の入力履歴から選択することもできます。
      </Typography>

      <Controller
        name="supplier"
        control={control}
        render={({ field }) => (
          <Autocomplete
            {...field}
            options={supplierOptions}
            freeSolo
            value={field.value || ''}
            onChange={(_, newValue) => {
              field.onChange(newValue || '');
            }}
            onInputChange={(_, newInputValue) => {
              field.onChange(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="帳合先"
                placeholder="例: ○○商事"
                error={!!errors.supplier}
                helperText={errors.supplier?.message}
                fullWidth
              />
            )}
          />
        )}
      />
    </Box>
  );
};
