import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import { TextField, Typography, Box } from '@mui/material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { format } from 'date-fns';

/**
 * DeliveryDateFormのProps
 */
interface DeliveryDateFormProps {
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
}

/**
 * Step 1: 店着日選択フォーム
 *
 * 商品が店舗に届く日付を選択します。
 */
export const DeliveryDateForm: React.FC<DeliveryDateFormProps> = ({ control, errors, onEnterPress }) => {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        店着日を選択してください
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        商品が店舗に届く日付を選択してください
      </Typography>

      <Controller
        name="deliveryDate"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            type="date"
            label="店着日"
            fullWidth
            error={!!errors.deliveryDate}
            helperText={errors.deliveryDate?.message}
            InputLabelProps={{
              shrink: true,
            }}
            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
            onChange={(e) => {
              const dateValue = e.target.value;
              if (dateValue) {
                field.onChange(new Date(dateValue));
              } else {
                field.onChange(null);
              }
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
