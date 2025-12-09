import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import type { DeleteDialogState } from '@/types/ui';

/**
 * DeleteHistoryDialogのProps
 */
export interface DeleteHistoryDialogProps {
  /** ダイアログ状態 */
  state: DeleteDialogState;
  /** 閉じるハンドラー */
  onClose: () => void;
  /** 削除ハンドラー */
  onDelete: () => void;
}

/**
 * 削除対象のフィールド名を日本語に変換
 */
const getFieldLabel = (type: DeleteDialogState['type']): string => {
  switch (type) {
    case 'name':
      return '品名';
    case 'origin':
      return '産地';
    case 'specification':
      return '規格';
    case 'quantity':
      return '入数';
    case 'specificationUnit':
      return '単位';
    default:
      return '';
  }
};

/**
 * 履歴削除確認ダイアログ
 *
 * 商品履歴の削除確認を行う共通ダイアログ。
 * フィールドタイプに応じたメッセージを表示します。
 */
export const DeleteHistoryDialog: React.FC<DeleteHistoryDialogProps> = ({
  state,
  onClose,
  onDelete,
}) => {
  const { open, type, value } = state;
  const fieldLabel = getFieldLabel(type);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>履歴の削除</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {fieldLabel}「{value}」の履歴を削除しますか？
        </DialogContentText>
        <DialogContentText sx={{ mt: 1, fontSize: '0.85rem', color: 'error.main' }}>
          この操作は取り消せません。
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button onClick={onDelete} color="error" variant="contained">
          削除
        </Button>
      </DialogActions>
    </Dialog>
  );
};
