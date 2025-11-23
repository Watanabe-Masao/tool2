import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
  Box,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';
import { getCategoryName } from '@/utils/categories';

/**
 * ProductBulkAddModalのProps
 */
interface ProductBulkAddModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** モーダルを閉じるハンドラー */
  onClose: () => void;
  /** 選択した商品を追加するハンドラー */
  onAddProducts: (presets: ProductHistoryItem[]) => void;
  /** 商品履歴リスト */
  presets: ProductHistoryItem[];
}

/**
 * 商品一括追加モーダル
 *
 * 履歴から複数の商品を選択して一度に追加できます。
 */
export const ProductBulkAddModal: React.FC<ProductBulkAddModalProps> = ({
  open,
  onClose,
  onAddProducts,
  presets,
}) => {
  // 選択された商品ID
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /**
   * チェックボックスのトグル
   */
  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  /**
   * すべて選択
   */
  const handleSelectAll = () => {
    if (selectedIds.size === presets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(presets.map((p) => p.id)));
    }
  };

  /**
   * 選択をクリア
   */
  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  /**
   * 選択した商品を追加
   */
  const handleAddSelected = () => {
    const selectedPresets = presets.filter((p) => selectedIds.has(p.id));
    onAddProducts(selectedPresets);
    setSelectedIds(new Set());
    onClose();
  };

  /**
   * モーダルを閉じる（選択をクリア）
   */
  const handleClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">PLから商品を追加</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {presets.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              保存されたプリセットがありません
            </Typography>
          </Box>
        ) : (
          <>
            {/* 選択コントロール */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {selectedIds.size} / {presets.length} 選択中
              </Typography>
              <Button size="small" onClick={handleSelectAll}>
                {selectedIds.size === presets.length ? 'すべて解除' : 'すべて選択'}
              </Button>
              {selectedIds.size > 0 && (
                <Button size="small" onClick={handleClearSelection}>
                  選択をクリア
                </Button>
              )}
            </Box>

            {/* 商品リスト */}
            <List sx={{ p: 0 }}>
              {presets.map((preset) => {
                const isSelected = selectedIds.has(preset.id);
                return (
                  <ListItem
                    key={preset.id}
                    disablePadding
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      '&:last-child': {
                        borderBottom: 0,
                      },
                    }}
                  >
                    <ListItemButton
                      onClick={() => handleToggle(preset.id)}
                      dense
                      sx={{
                        bgcolor: isSelected ? 'primary.50' : 'transparent',
                        '&:hover': {
                          bgcolor: isSelected ? 'primary.100' : 'action.hover',
                        },
                      }}
                    >
                      <Checkbox
                        edge="start"
                        checked={isSelected}
                        tabIndex={-1}
                        disableRipple
                      />
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {preset.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {preset.origin}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {preset.categoryCode && (
                              <Chip
                                label={getCategoryName(preset.categoryCode)}
                                size="small"
                                sx={{ fontSize: '0.65rem', height: 20 }}
                              />
                            )}
                            {preset.supplier && (
                              <Chip
                                label={preset.supplier}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 20 }}
                              />
                            )}
                            {preset.specification && (
                              <Typography variant="caption" color="text.secondary">
                                {preset.specification}
                              </Typography>
                            )}
                            {preset.quantityPerPackage && (
                              <Typography variant="caption" color="text.secondary">
                                {preset.quantityPerPackage}
                                {preset.unit && `${preset.unit}`}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          キャンセル
        </Button>
        <Button
          onClick={handleAddSelected}
          variant="contained"
          color="primary"
          disabled={selectedIds.size === 0}
        >
          {selectedIds.size}件追加
        </Button>
      </DialogActions>
    </Dialog>
  );
};
