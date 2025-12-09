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
import { getCategoryName } from '@/utils/categories';

/**
 * 保存する商品情報
 */
export interface SaveProductInfo {
  categoryCode?: string;
  name: string;
  origin: string;
  specification?: string;
  specificationUnit?: string;
  quantityPerPackage?: number | null;
  packageUnit?: string;
  supplier?: string;
}

/**
 * SaveProductDialogのProps
 */
export interface SaveProductDialogProps {
  /** ダイアログが開いているか */
  open: boolean;
  /** 保存する商品情報 */
  product: SaveProductInfo | null;
  /** 閉じるハンドラー */
  onClose: () => void;
  /** 保存ハンドラー */
  onSave: () => void;
  /** タイトル */
  title?: string;
  /** 説明文 */
  description?: string;
}

/**
 * 商品保存確認ダイアログ
 *
 * 商品情報を履歴として保存する際の確認ダイアログ。
 */
export const SaveProductDialog: React.FC<SaveProductDialogProps> = ({
  open,
  product,
  onClose,
  onSave,
  title = '履歴に保存',
  description = 'この商品情報を履歴として保存しますか？',
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
        {product && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            {product.categoryCode && (
              <Typography variant="body2" color="text.secondary">
                カテゴリー: {getCategoryName(product.categoryCode)}
              </Typography>
            )}
            <Typography variant="body2" fontWeight="medium">
              品名: {product.name}
            </Typography>
            <Typography variant="body2">
              産地: {product.origin}
            </Typography>
            {product.specification && (
              <Typography variant="body2">
                規格: {product.specification}
                {product.specificationUnit && ` ${product.specificationUnit}`}
              </Typography>
            )}
            {product.quantityPerPackage && (
              <Typography variant="body2">
                入数: {product.quantityPerPackage}
                {product.packageUnit && ` ${product.packageUnit}`}
              </Typography>
            )}
            {product.supplier && (
              <Typography variant="body2" color="text.secondary">
                帳合先: {product.supplier}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button onClick={onSave} color="primary" variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};
