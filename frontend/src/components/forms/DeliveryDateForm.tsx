import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import { Typography, Box, Paper } from '@mui/material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

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
 * インラインカレンダーでタップして選択できます。
 */
export const DeliveryDateForm: React.FC<DeliveryDateFormProps> = ({ control, errors }) => {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', py: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        店着日を選択
      </Typography>

      <Controller
        name="deliveryDate"
        control={control}
        render={({ field }) => (
          <Box>
            {/* 選択された日付の表示 */}
            <Paper
              elevation={1}
              sx={{
                p: 2,
                mb: 2,
                textAlign: 'center',
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
              }}
            >
              <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                選択された日付
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {field.value ? format(field.value, 'yyyy年M月d日(E)', { locale: ja }) : '未選択'}
              </Typography>
            </Paper>

            {/* インラインカレンダー */}
            <Paper
              elevation={2}
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'center',
                '& .rdp': {
                  margin: 0,
                },
                '& .rdp-day_button': {
                  fontSize: '1rem',
                  padding: '0.75rem',
                },
              }}
            >
              <DayPicker
                mode="single"
                selected={field.value}
                onSelect={(date) => field.onChange(date || new Date())}
                locale={ja}
                showOutsideDays
                fixedWeeks
              />
            </Paper>

            {/* エラーメッセージ */}
            {errors.deliveryDate && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                {errors.deliveryDate.message}
              </Typography>
            )}
          </Box>
        )}
      />
    </Box>
  );
};
