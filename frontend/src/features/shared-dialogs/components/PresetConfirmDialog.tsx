import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';
import { getCategoryName } from '@/utils/categories';

/**
 * PresetConfirmDialogのProps
 */
export interface PresetConfirmDialogProps {
  /** ダイアログが開いているか */
  open: boolean;
  /** プリセットデータ */
  preset: ProductHistoryItem | null;
  /** 閉じるハンドラー */
  onClose: () => void;
  /** 上書きハンドラー */
  onOverwrite: () => void;
  /** 新規追加ハンドラー（オプション） */
  onAddNew?: () => void;
  /** タイトル */
  title?: string;
  /** 説明文 */
  description?: string;
}

/**
 * プリセット確認ダイアログ
 *
 * プリセットを読み込む際の確認ダイアログ。
 * 上書きか新規追加かを選択できます。
 */
export const PresetConfirmDialog: React.FC<PresetConfirmDialogProps> = ({
  open,
  preset,
  onClose,
  onOverwrite,
  onAddNew,
  title = 'プリセットの読み込み',
  description = '現在のカードにはすでに入力された値があります。どのように読み込みますか？',
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
        {preset && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            {preset.categoryCode && (
              <Typography variant="body2" color="text.secondary">
                カテゴリー: {getCategoryName(preset.categoryCode)}
              </Typography>
            )}
            <Typography variant="body2" fontWeight="medium">
              品名: {preset.name}
            </Typography>
            <Typography variant="body2">
              産地: {preset.origin}
            </Typography>
            {preset.specification && (
              <Typography variant="body2">
                規格: {preset.specification}
                {preset.specificationUnit && ` ${preset.specificationUnit}`}
              </Typography>
            )}
            {preset.quantityPerPackage && (
              <Typography variant="body2">
                入数: {preset.quantityPerPackage}
                {preset.packageUnit && ` ${preset.packageUnit}`}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 3, pb: 2 }}>
        <Button
          onClick={onOverwrite}
          color="warning"
          variant="contained"
          fullWidth
        >
          現在のカードに上書き
        </Button>
        {onAddNew && (
          <Button
            onClick={onAddNew}
            color="primary"
            variant="contained"
            fullWidth
          >
            新規カードとして追加
          </Button>
        )}
        <Button onClick={onClose} color="inherit" fullWidth>
          キャンセル
        </Button>
      </DialogActions>
    </Dialog>
  );
};
