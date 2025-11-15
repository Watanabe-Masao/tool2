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
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
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
                p: 1.5,
                mb: 1.5,
                textAlign: 'center',
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
              }}
            >
              <Typography variant="caption" display="block" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                選択された日付
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {field.value ? format(field.value, 'yyyy年M月d日(E)', { locale: ja }) : '未選択'}
              </Typography>
            </Paper>

            {/* インラインカレンダー */}
            <Paper
              elevation={2}
              sx={{
                p: 1,
                display: 'flex',
                justifyContent: 'center',
                '& .rdp': {
                  margin: 0,
                  fontSize: '0.9rem',
                },
                '& .rdp-day_button': {
                  fontSize: '0.9rem',
                  padding: '0.5rem',
                },
                '& .rdp-month': {
                  margin: '0.5rem',
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
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {errors.deliveryDate.message}
              </Typography>
            )}
          </Box>
        )}
      />
    </Box>
  );
};
