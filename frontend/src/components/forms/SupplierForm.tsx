import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  TextField,
  Typography,
  Box,
  Autocomplete,
  Stack,
  Chip,
} from '@mui/material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { useSupplierPresets } from '@/hooks/useSupplierPresets';

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
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
  /** 帳合先変更時のカスタムハンドラー */
  onSuppliersChange?: (newValue: string[]) => string[];
}

/**
 * Step 1: 帳合先入力フォーム
 *
 * 商品の帳合先（仕入先）を複数入力します。
 * プリセット機能で頻繁に使う帳合先を素早く選択できます。
 */
export const SupplierForm: React.FC<SupplierFormProps> = ({
  control,
  errors,
  supplierOptions = [],
  onEnterPress,
  onSuppliersChange,
}) => {
  const { presets } = useSupplierPresets();

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1.5 }}>帳合先を選択</Typography>

      <Controller
        name="suppliers"
        control={control}
        render={({ field }) => (
          <Box>
            {/* プリセットボタン */}
            {presets.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  プリセット
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  {presets.map((preset) => {
                    const isSelected = field.value?.includes(preset.supplier);
                    return (
                      <Chip
                        key={preset.id}
                        label={preset.supplier}
                        onClick={() => {
                          const currentValue = field.value || [];
                          if (isSelected) {
                            // 既に選択されている場合は削除
                            field.onChange(currentValue.filter((s: string) => s !== preset.supplier));
                          } else {
                            // 選択されていない場合は追加
                            field.onChange([...currentValue, preset.supplier]);
                          }
                        }}
                        color={isSelected ? 'primary' : 'default'}
                        size="small"
                        sx={{ mb: 0.5 }}
                      />
                    );
                  })}
                </Stack>
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
              size="small"
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
  );
};
