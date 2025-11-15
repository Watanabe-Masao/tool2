import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import { Close, Inventory2 } from '@mui/icons-material';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';
import { getCategoryName } from '@/utils/categories';

/**
 * ProductPresetModalのProps
 */
interface ProductPresetModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 閉じる時のハンドラー */
  onClose: () => void;
  /** プリセット選択時のハンドラー */
  onSelect: (preset: ProductHistoryItem) => void;
  /** プリセット一覧 */
  presets: ProductHistoryItem[];
}

/**
 * 商品プリセット選択モーダル
 *
 * 保存された商品プリセットを一括で読み込むためのモーダルです。
 */
export const ProductPresetModal: React.FC<ProductPresetModalProps> = ({
  open,
  onClose,
  onSelect,
  presets,
}) => {
  /**
   * プリセットを選択
   */
  const handleSelectPreset = (preset: ProductHistoryItem) => {
    onSelect(preset);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Inventory2 />
          <Typography variant="h6">プリセットから選択</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} edge="end">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {presets.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              保存されたプリセットがありません
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              商品番号を長押しして、商品情報をプリセットとして保存できます
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {presets.map((preset) => (
              <ListItemButton
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                sx={{ py: 2, px: 2 }}
              >
                <ListItemText
                  primary={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {preset.name}
                      </Typography>
                      {preset.categoryCode && (
                        <Chip
                          label={getCategoryName(preset.categoryCode)}
                          size="small"
                          color="primary"
                          sx={{ fontSize: '0.7rem', height: 20, mt: 0.5 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        産地: {preset.origin}
                      </Typography>
                      {preset.specification && (
                        <Typography variant="body2" color="text.secondary">
                          規格: {preset.specification}
                        </Typography>
                      )}
                      {preset.quantityPerPackage && (
                        <Typography variant="body2" color="text.secondary">
                          入数: {preset.quantityPerPackage}
                          {preset.unit && ` ${preset.unit}`}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.disabled">
                        使用回数: {preset.usageCount}回
                      </Typography>
                    </Stack>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};
