import React, { useState } from 'react';
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
  IconButton,
  Button,
  ButtonGroup,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { ja } from 'date-fns/locale';
import { addDays, isToday as checkIsToday, isTomorrow as checkIsTomorrow } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { useSupplierPresets } from '@/hooks/useSupplierPresets';
import { SupplierPresetManagerModal } from '@/components/modals/SupplierPresetManagerModal';

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
}

/**
 * Step 1: 店着日選択・帳合先入力フォーム
 *
 * 商品が店舗に届く日付を選択し、帳合先を入力します。
 * インラインカレンダーでタップして日付を選択できます。
 */
export const DeliveryDateForm: React.FC<DeliveryDateFormProps> = ({
  control,
  errors,
  supplierOptions = [],
  onEnterPress,
}) => {
  const { presets } = useSupplierPresets();
  const [showPresetManager, setShowPresetManager] = useState(false);

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
            {/* ショートカットボタン */}
            <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
              <ButtonGroup size="small" variant="outlined">
                <Button
                  onClick={() => field.onChange(new Date())}
                  color={checkIsToday(field.value) ? 'primary' : 'inherit'}
                  variant={checkIsToday(field.value) ? 'contained' : 'outlined'}
                >
                  今日
                </Button>
                <Button
                  onClick={() => field.onChange(addDays(new Date(), 1))}
                  color={checkIsTomorrow(field.value) ? 'primary' : 'inherit'}
                  variant={checkIsTomorrow(field.value) ? 'contained' : 'outlined'}
                >
                  明日
                </Button>
              </ButtonGroup>
            </Box>

            {/* インラインカレンダー */}
            <Paper
              elevation={2}
              sx={{
                p: 1,
                display: 'flex',
                justifyContent: 'center',
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
                  marginBottom: '0.3rem',
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="medium">帳合先を入力</Typography>
          <IconButton
            size="small"
            onClick={() => setShowPresetManager(true)}
            title="プリセット管理"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>

        <Controller
          name="supplier"
          control={control}
          render={({ field }) => (
            <Box>
              {/* プリセットボタン */}
              {presets.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {presets.map((preset) => (
                      <Chip
                        key={preset.id}
                        label={preset.supplier}
                        onClick={() => field.onChange(preset.supplier)}
                        color={field.value === preset.supplier ? 'primary' : 'default'}
                        size="small"
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                </Box>
              )}

              {/* 入力フィールド */}
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

      {/* プリセット管理モーダル */}
      <SupplierPresetManagerModal
        open={showPresetManager}
        onClose={() => setShowPresetManager(false)}
      />
    </Box>
  );
};
