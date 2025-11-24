import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

/**
 * OrderDialogs
 *
 * 注文フォームで使用される3つのダイアログコンポーネント:
 * 1. BookNameDialog - ブック名入力ダイアログ
 * 2. RestoreDraftDialog - 下書き復元確認ダイアログ
 * 3. SupplierRemovalDialog - 帳合先削除確認ダイアログ
 *
 * @example
 * ```typescript
 * <OrderDialogs
 *   bookNameDialog={bookNameDialog}
 *   onBookNameDialogChange={setBookNameDialog}
 *   onBookNameDialogConfirm={handleBookNameDialogConfirm}
 *   restoreDialogOpen={restoreDialogOpen}
 *   onRestoreDraft={handleRestoreDraft}
 *   onDiscardDraft={handleDiscardDraft}
 *   supplierRemovalDialog={supplierRemovalDialog}
 *   onConfirmSupplierRemoval={handleConfirmSupplierRemoval}
 *   onCancelSupplierRemoval={handleCancelSupplierRemoval}
 * />
 * ```
 */

interface BookNameDialogState {
  open: boolean;
  bookName: string;
}

interface SupplierRemovalDialogState {
  open: boolean;
  suppliersToRemove: string[];
  affectedProductsCount: number;
  newSuppliers: string[];
}

interface OrderDialogsProps {
  // BookNameDialog
  bookNameDialog: BookNameDialogState;
  onBookNameDialogChange: (state: BookNameDialogState) => void;
  onBookNameDialogConfirm: () => void;

  // RestoreDraftDialog
  restoreDialogOpen: boolean;
  onRestoreDraft: () => void;
  onDiscardDraft: () => void;

  // SupplierRemovalDialog
  supplierRemovalDialog: SupplierRemovalDialogState;
  onConfirmSupplierRemoval: () => void;
  onCancelSupplierRemoval: () => void;
}

export const OrderDialogs: React.FC<OrderDialogsProps> = ({
  bookNameDialog,
  onBookNameDialogChange,
  onBookNameDialogConfirm,
  restoreDialogOpen,
  onRestoreDraft,
  onDiscardDraft,
  supplierRemovalDialog,
  onConfirmSupplierRemoval,
  onCancelSupplierRemoval,
}) => {
  return (
    <>
      {/* ブック名入力ダイアログ */}
      <Dialog
        open={bookNameDialog.open}
        onClose={() => onBookNameDialogChange({ open: false, bookName: '' })}
      >
        <DialogTitle>ブック名を入力</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            生成するExcelファイルのブック名を指定できます（オプション）
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="ブック名"
            placeholder="例: テスト"
            fullWidth
            value={bookNameDialog.bookName}
            onChange={(e) => onBookNameDialogChange({ ...bookNameDialog, bookName: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onBookNameDialogConfirm();
              }
            }}
            helperText="未入力の場合は日付のみのファイル名になります"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onBookNameDialogChange({ open: false, bookName: '' })} color="inherit">
            キャンセル
          </Button>
          <Button onClick={onBookNameDialogConfirm} variant="contained" color="primary">
            生成
          </Button>
        </DialogActions>
      </Dialog>

      {/* 下書き復元確認ダイアログ */}
      <Dialog open={restoreDialogOpen} onClose={onDiscardDraft}>
        <DialogTitle>下書きを復元しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            前回の入力内容が見つかりました。続きから入力を再開できます。
          </DialogContentText>
          <DialogContentText sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
            下書きは24時間保存されます。復元しない場合、新規に入力を開始します。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onDiscardDraft} color="inherit">
            新規入力
          </Button>
          <Button onClick={onRestoreDraft} color="primary" variant="contained">
            復元する
          </Button>
        </DialogActions>
      </Dialog>

      {/* 帳合先削除確認ダイアログ */}
      <Dialog open={supplierRemovalDialog.open} onClose={onCancelSupplierRemoval}>
        <DialogTitle>帳合先の削除確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            削除しようとしている帳合先「{supplierRemovalDialog.suppliersToRemove.join('、')}」は
            {supplierRemovalDialog.affectedProductsCount}件の商品カードで使用されています。
          </DialogContentText>
          <DialogContentText sx={{ mt: 1.5 }}>
            帳合先を削除すると、これらの商品カードも削除されます。続行しますか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancelSupplierRemoval} color="inherit">
            キャンセル
          </Button>
          <Button onClick={onConfirmSupplierRemoval} color="error" variant="contained">
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
