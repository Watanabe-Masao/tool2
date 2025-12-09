import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Stack,
  Box,
  Typography,
} from '@mui/material';
import { getSupplierColorByName, getSupplierColorWithOpacity } from '@/constants/supplierColors';

/**
 * 帳合先プリセット（カラー取得用の最小型）
 * getSupplierColorByNameと互換性のある型
 */
type SupplierPresetForColor = {
  supplier: string;
  displayOrder?: number;
};

/**
 * SupplierSelectDialogのProps
 */
export interface SupplierSelectDialogProps {
  /** ダイアログが開いているか */
  open: boolean;
  /** 閉じるハンドラー */
  onClose: () => void;
  /** 帳合先選択ハンドラー */
  onSelect: (supplier: string) => void;
  /** 選択可能な帳合先リスト */
  suppliers: string[];
  /** 現在選択中の帳合先 */
  currentSupplier?: string;
  /** 帳合先プリセット（カラー取得用） */
  supplierPresets?: SupplierPresetForColor[];
  /** タイトル */
  title?: string;
  /** 説明文 */
  description?: string;
}

/**
 * 帳合先選択ダイアログ
 *
 * 帳合先を選択するための共通ダイアログコンポーネント。
 * 帳合先ごとに色分けされたリストを表示します。
 */
export const SupplierSelectDialog: React.FC<SupplierSelectDialogProps> = ({
  open,
  onClose,
  onSelect,
  suppliers,
  currentSupplier,
  supplierPresets = [],
  title = '帳合先を選択',
  description = 'この商品の帳合先を選択してください',
}) => {
  const handleSelect = (supplier: string) => {
    onSelect(supplier);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2, fontSize: '0.85rem' }}>
          {description}
        </DialogContentText>
        <Stack spacing={0.75}>
          {suppliers.map((supplier) => {
            const supplierColor = getSupplierColorByName(supplier, supplierPresets);
            const isSelected = currentSupplier === supplier;
            return (
              <Box
                key={supplier}
                onClick={() => handleSelect(supplier)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  bgcolor: isSelected ? getSupplierColorWithOpacity(supplierColor, 0.15) : 'grey.50',
                  border: '1px solid',
                  borderColor: isSelected ? supplierColor : 'grey.200',
                  '&:hover': {
                    bgcolor: getSupplierColorWithOpacity(supplierColor, 0.1),
                    borderColor: supplierColor,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: supplierColor,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? supplierColor : 'text.primary',
                  }}
                >
                  {supplier}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" size="small">
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};
