import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Typography,
  Box,
  Paper,
  TextField,
  Autocomplete,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { ja } from 'date-fns/locale';
import { addDays, isToday as checkIsToday, isTomorrow as checkIsTomorrow } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { useSupplierPresets } from '@/hooks/useSupplierPresets';

/**
 * DeliveryDateFormのProps
 */
interface DeliveryDateFormProps {
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** 帳合先のオートコンプリート候補 */
  supplierOptions?: string[];
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
  /** 帳合先変更時のカスタムハンドラー */
  onSuppliersChange?: (newValue: string[]) => string[];
}

/**
 * Step 1: 店着日選択・帳合先入力フォーム
 *
 * 商品が店舗に届く日付を選択し、複数の帳合先を入力します。
 * インラインカレンダーでタップして日付を選択できます。
 */
export const DeliveryDateForm: React.FC<DeliveryDateFormProps> = ({
  control,
  errors,
  supplierOptions = [],
  onEnterPress,
  onSuppliersChange,
}) => {
  const { presets } = useSupplierPresets();

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1.5 }}>
        店着日を選択
      </Typography>

      <Controller
        name="deliveryDate"
        control={control}
        render={({ field }) => (
          <Box sx={{ mb: 3 }}>
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
                  color: '#d32f2f',
                },
                // 土曜日を青色に
                '& .rdp-day_button[aria-label*="土曜日"]': {
                  color: '#1976d2',
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

      {/* 帳合先入力セクション */}
      <Box>
        <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
          帳合先を選択
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          複数の帳合先を選択できます
        </Typography>

        <Controller
          name="suppliers"
          control={control}
          render={({ field }) => (
            <Box>
              {/* プリセットボタン */}
              {presets.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {presets.map((preset) => {
                      const isSelected = field.value?.includes(preset.supplier);
                      return (
                        <Chip
                          key={preset.id}
                          label={preset.supplier}
                          onClick={() => {
                            const currentValue = field.value || [];
                            let newValue: string[];
                            if (isSelected) {
                              // 既に選択されている場合は削除
                              newValue = currentValue.filter((s: string) => s !== preset.supplier);
                            } else {
                              // 選択されていない場合は追加
                              newValue = [...currentValue, preset.supplier];
                            }
                            // カスタムハンドラーがあれば、それを使用して変更を処理
                            const finalValue = onSuppliersChange ? onSuppliersChange(newValue) : newValue;
                            field.onChange(finalValue);
                          }}
                          color={isSelected ? 'primary' : 'default'}
                          size="small"
                          sx={{ mb: 0.5 }}
                        />
                      );
                    })}
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                </Box>
              )}

              {/* 入力フィールド（複数選択対応） */}
              <Autocomplete
                multiple
                options={supplierOptions}
                freeSolo
                value={field.value || []}
                onChange={(_, newValue) => {
                  // カスタムハンドラーがあれば、それを使用して変更を処理
                  const finalValue = onSuppliersChange ? onSuppliersChange(newValue) : newValue;
                  field.onChange(finalValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="帳合先"
                    placeholder="例: ○○商事"
                    error={!!errors.suppliers}
                    helperText={errors.suppliers?.message}
                    fullWidth
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
          )}
        />
      </Box>
    </Box>
  );
};
