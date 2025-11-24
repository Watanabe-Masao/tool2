import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, Download } from '@mui/icons-material';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * AllocationPreviewModalのProps
 */
interface AllocationPreviewModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** モーダルを閉じるハンドラ */
  onClose: () => void;
  /** フォームデータ */
  formData: OrderFormData;
  /** PDFファイル名（file_id） */
  pdfFilename?: string;
  /** Excelダウンロードハンドラ */
  onDownloadExcel?: () => void;
}

/**
 * 配分表プレビューモーダル
 *
 * 配分表のプレビューをモーダル表示します。
 * （注：このコンポーネントは現在使用されていない可能性があります）
 */
export const AllocationPreviewModal: React.FC<AllocationPreviewModalProps> = ({
  open,
  onClose,
  formData,
  pdfFilename,
  onDownloadExcel,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            配分表プレビュー
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            配分表のプレビューを表示します。
          </Typography>

          {/* 商品リスト */}
          {formData.products.map((product, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {product.name || `商品 ${index + 1}`}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">産地</Typography>
                  <Typography variant="body2">{product.origin || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">規格</Typography>
                  <Typography variant="body2">{product.specification || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">総納品数</Typography>
                  <Typography variant="body2">{product.totalDelivery || 0}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">配分済み</Typography>
                  <Typography variant="body2">
                    {product.storeAllocations?.reduce((sum, val) => sum + val, 0) || 0}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}

          {pdfFilename && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="body2" color="success.dark">
                ✓ 配分表が生成されました: {pdfFilename}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        {onDownloadExcel && (
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={onDownloadExcel}
          >
            Excelダウンロード
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
