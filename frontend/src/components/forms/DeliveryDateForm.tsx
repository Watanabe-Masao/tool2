import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Typography,
  Box,
  Paper,
  Chip,
} from '@mui/material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { ja } from 'date-fns/locale';
import { addDays, isToday as checkIsToday, isTomorrow as checkIsTomorrow } from 'date-fns';
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
}

/**
 * Step 1: 店着日選択フォーム
 *
 * 商品が店舗に届く日付を選択します。
 * インラインカレンダーでタップして日付を選択できます。
 */
export const DeliveryDateForm: React.FC<DeliveryDateFormProps> = ({
  control,
  errors,
}) => {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1.5 }}>
        店着日を選択
      </Typography>

      <Controller
        name="deliveryDate"
        control={control}
        render={({ field }) => (
          <Box>
            {/* インラインカレンダー */}
            <Paper
              elevation={2}
              sx={{
                p: 1,
                position: 'relative',
                '& .rdp': {
                  margin: 0,
                  fontSize: '0.85rem',
                },
                '& .rdp-day_button': {
                  fontSize: '0.85rem',
                  padding: '0.4rem',
                },
                '& .rdp-month': {
                  margin: '0.3rem',
                },
                '& .rdp-caption': {
                  marginBottom: '0.5rem',
                },
                // 日曜日を赤色に
                '& .rdp-day_button[aria-label*="日曜日"]': {
                  color: 'error.main',
                },
                // 土曜日を青色に
                '& .rdp-day_button[aria-label*="土曜日"]': {
                  color: 'primary.main',
                },
              }}
            >
              {/* 今日・明日チップを月表示の横に配置 */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 0.5,
                  zIndex: 1,
                }}
              >
                <Chip
                  label="今日"
                  size="small"
                  onClick={() => field.onChange(new Date())}
                  color={checkIsToday(field.value) ? 'primary' : 'default'}
                  variant={checkIsToday(field.value) ? 'filled' : 'outlined'}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
                <Chip
                  label="明日"
                  size="small"
                  onClick={() => field.onChange(addDays(new Date(), 1))}
                  color={checkIsTomorrow(field.value) ? 'primary' : 'default'}
                  variant={checkIsTomorrow(field.value) ? 'filled' : 'outlined'}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              </Box>

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
