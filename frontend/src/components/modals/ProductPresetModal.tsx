import React, { useState } from 'react';
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
  Tabs,
  Tab,
  Button,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import { Close, Inventory2, Delete } from '@mui/icons-material';
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
  /** プリセット削除時のハンドラー */
  onDelete: (presetId: string) => Promise<void>;
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
  onDelete,
  presets,
}) => {
  // カテゴリーフィルターのタブ（0: 全て, 1: 果実, 2: 野菜）
  const [categoryFilter, setCategoryFilter] = useState(0);

  // 削除確認ダイアログの状態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<ProductHistoryItem | null>(null);

  /**
   * タブ変更ハンドラー
   */
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCategoryFilter(newValue);
  };

  /**
   * カテゴリーでフィルタリングしたプリセット
   */
  const filteredPresets = presets.filter((preset) => {
    if (categoryFilter === 0) return true; // 全て表示
    if (categoryFilter === 1) {
      // 果実（61）
      return preset.categoryCode?.startsWith('0006') && preset.categoryCode <= '000612';
    }
    if (categoryFilter === 2) {
      // 野菜（62）
      return preset.categoryCode?.startsWith('0006') && preset.categoryCode >= '000620';
    }
    return true;
  });

  /**
   * プリセットを選択
   */
  const handleSelectPreset = (preset: ProductHistoryItem) => {
    onSelect(preset);
    onClose();
  };

  /**
   * 削除ボタンをクリック
   */
  const handleDeleteClick = (e: React.MouseEvent, preset: ProductHistoryItem) => {
    e.stopPropagation(); // リストアイテムのクリックイベントを止める
    setPresetToDelete(preset);
    setDeleteDialogOpen(true);
  };

  /**
   * 削除を実行
   */
  const handleConfirmDelete = async () => {
    if (!presetToDelete) return;

    try {
      await onDelete(presetToDelete.id);
      setDeleteDialogOpen(false);
      setPresetToDelete(null);
    } catch (error) {
      console.error('[ProductPresetModal] Failed to delete preset:', error);
    }
  };

  /**
   * モーダルを閉じる際にフィルターをリセット
   */
  const handleClose = () => {
    setCategoryFilter(0);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '85vh',
            height: '85vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory2 />
            <Typography variant="h6">プリセットから選択</Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} edge="end">
            <Close />
          </IconButton>
        </DialogTitle>

        {/* カテゴリーフィルタータブ */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={categoryFilter} onChange={handleTabChange} variant="fullWidth">
            <Tab label={`全て (${presets.length})`} />
            <Tab
              label={`果実 (${presets.filter(p => p.categoryCode && p.categoryCode.startsWith('0006') && p.categoryCode <= '000612').length})`}
            />
            <Tab
              label={`野菜 (${presets.filter(p => p.categoryCode && p.categoryCode.startsWith('0006') && p.categoryCode >= '000620').length})`}
            />
          </Tabs>
        </Box>

        <DialogContent dividers sx={{ p: 0, flexGrow: 1, overflow: 'auto' }}>
          {filteredPresets.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {categoryFilter === 0
                  ? '保存されたプリセットがありません'
                  : 'このカテゴリーにはプリセットがありません'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                商品番号を長押しして、商品情報をプリセットとして保存できます
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {filteredPresets.map((preset) => (
                <ListItemButton
                  key={preset.id}
                  sx={{
                    py: 2,
                    px: 2,
                    '&:hover .delete-button': {
                      opacity: 1,
                    },
                  }}
                >
                  <ListItemText
                    onClick={() => handleSelectPreset(preset)}
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {preset.name}
                        </Typography>
                        {preset.categoryCode && (
                          <Chip
                            label={getCategoryName(preset.categoryCode)}
                            size="small"
                            color="primary"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Stack spacing={0.3} sx={{ mt: 0.5 }}>
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
                  <IconButton
                    className="delete-button"
                    onClick={(e) => handleDeleteClick(e, preset)}
                    color="error"
                    size="small"
                    sx={{
                      opacity: 0.5,
                      transition: 'opacity 0.2s',
                      ml: 1,
                    }}
                  >
                    <Delete />
                  </IconButton>
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>プリセットを削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            このプリセットを削除してもよろしいですか？
          </DialogContentText>
          {presetToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {presetToDelete.name}
              </Typography>
              {presetToDelete.categoryCode && (
                <Typography variant="body2" color="text.secondary">
                  カテゴリー: {getCategoryName(presetToDelete.categoryCode)}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                産地: {presetToDelete.origin}
              </Typography>
            </Box>
          )}
          <DialogContentText sx={{ mt: 2, fontSize: '0.875rem', color: 'error.main' }}>
            この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
