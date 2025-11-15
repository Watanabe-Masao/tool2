import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import { TextField, Typography, Box } from '@mui/material';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * TotalDeliveryFormのProps
 */
interface TotalDeliveryFormProps {
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
}

/**
 * Step 4: 総納品数入力フォーム
 *
 * 全店舗への総納品数を入力します。
 * この数値は各店舗への配分数の合計と一致する必要があります。
 */
export const TotalDeliveryForm: React.FC<TotalDeliveryFormProps> = ({ control, errors, onEnterPress }) => {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
        総納品数を入力してください
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        全店舗への総納品数を入力してください。次のステップで各店舗への配分数を入力します。
      </Typography>

      <Controller
        name="totalDelivery"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            type="number"
            label="総納品数"
            placeholder="例: 100"
            fullWidth
            error={!!errors.totalDelivery}
            helperText={errors.totalDelivery?.message}
            inputProps={{
              min: 1,
              step: 1,
            }}
            value={field.value || ''}
            onChange={(e) => {
              const value = e.target.value;
              field.onChange(value ? parseInt(value, 10) : 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onEnterPress) {
                e.preventDefault();
                onEnterPress();
              }
            }}
          />
        )}
      />
    </Box>
  );
};
