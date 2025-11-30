import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, CircularProgress } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { AllocationBatch } from '@/types/allocationHistory';

/**
 * AllocationDeleteDialog Props
 */
export interface AllocationDeleteDialogProps {
  /** ダイアログが開いているか */
  open: boolean;
  /** 削除対象のバッチ */
  batch: AllocationBatch | null;
  /** 削除処理中かどうか */
  deleting: boolean;
  /** ダイアログを閉じる */
  onClose: () => void;
  /** 削除を実行 */
  onDelete: () => Promise<void>;
}

/**
 * AllocationDeleteDialog Component
 *
 * 配分履歴削除確認ダイアログ。
 * 削除対象のバッチ情報を表示し、確認後に削除を実行します。
 *
 * **機能:**
 * - 削除対象バッチの詳細表示
 * - 削除確認UI
 * - 削除処理中の表示
 *
 * @example
 * ```tsx
 * <AllocationDeleteDialog
 *   open={deleteDialog.open}
 *   batch={deleteDialog.batch}
 *   deleting={deleting}
 *   onClose={deleteDialog.closeDialog}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export const AllocationDeleteDialog: React.FC<AllocationDeleteDialogProps> = ({
  open,
  batch,
  deleting,
  onClose,
  onDelete,
}) => {
  return (
    <Dialog
      open={open}
      onClose={deleting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 600, color: 'error.main' }}>
        配分履歴を削除しますか？
      </DialogTitle>

      <DialogContent>
        {batch && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              以下の配分履歴を削除します。この操作は取り消せません。
            </Typography>
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>納品日:</strong>{' '}
                {format(new Date(batch.deliveryDate), 'yyyy年M月d日(E)', {
                  locale: ja,
                })}
              </Typography>
              <Typography variant="body2">
                <strong>帳合先:</strong> {batch.suppliers.join(', ')}
              </Typography>
              <Typography variant="body2">
                <strong>商品数:</strong> {batch.productCount}品
              </Typography>
              <Typography variant="body2">
                <strong>合計数量:</strong> {batch.totalQuantity.toLocaleString()}個
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={deleting} variant="outlined">
          キャンセル
        </Button>
        <Button
          onClick={onDelete}
          variant="contained"
          color="error"
          disabled={deleting}
          startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
        >
          {deleting ? '削除中...' : '削除'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
