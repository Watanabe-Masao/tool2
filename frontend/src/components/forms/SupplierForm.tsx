import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  TextField,
  Typography,
  Box,
  Autocomplete,
  Stack,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { useSupplierPresets } from '@/hooks/useSupplierPresets';
import { SupplierPresetManagerModal } from '@/components/modals/SupplierPresetManagerModal';

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
}) => {
  const { presets } = useSupplierPresets();
  const [showPresetManager, setShowPresetManager] = useState(false);

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight="medium">帳合先を選択</Typography>
        <IconButton
          size="small"
          onClick={() => setShowPresetManager(true)}
          title="プリセット管理"
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Box>

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
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  プリセット
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
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
                field.onChange(newValue);
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

      {/* プリセット管理モーダル */}
      <SupplierPresetManagerModal
        open={showPresetManager}
        onClose={() => setShowPresetManager(false)}
      />
    </Box>
  );
};
