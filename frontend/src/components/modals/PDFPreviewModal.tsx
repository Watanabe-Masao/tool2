import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Close, Download, Email } from '@mui/icons-material';
import { isIPhoneSafari } from '@/utils/deviceDetection';

/**
 * PDFPreviewModalのProps
 */
interface PDFPreviewModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 閉じるハンドラ */
  onClose: () => void;
  /** PDFファイルのURL */
  pdfUrl: string;
  /** Excelファイルダウンロードハンドラ */
  onDownloadExcel: () => void;
  /** メール送信ハンドラ（オプション） */
  onSendEmail?: () => void;
}

/**
 * PDFプレビューモーダル
 *
 * 生成されたExcelファイルのPDFプレビューを表示します。
 * iPhone SafariではiframeでPDFが表示できないため、ダウンロードリンクを表示します。
 *
 * 使用例:
 * ```tsx
 * <PDFPreviewModal
 *   open={showPreview}
 *   onClose={() => setShowPreview(false)}
 *   pdfUrl="/api/download/sample.pdf"
 *   onDownloadExcel={handleDownload}
 * />
 * ```
 */
export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  open,
  onClose,
  pdfUrl,
  onDownloadExcel,
  onSendEmail,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // iPhone Safari判定
  const isIPhone = isIPhoneSafari();

  /**
   * iframeの読み込み完了
   */
  const handleIframeLoad = () => {
    setLoading(false);
  };

  /**
   * iframeのエラー
   */
  const handleIframeError = () => {
    setLoading(false);
    setError('PDFの読み込みに失敗しました');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' },
      }}
    >
      {/* ヘッダー */}
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">プレビュー</Typography>
          <IconButton onClick={onClose} aria-label="閉じる">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* コンテンツ */}
      <DialogContent dividers>
        {/* iPhone Safariの場合はダウンロードリンクを表示 */}
        {isIPhone ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              iPhone SafariではPDFプレビューがサポートされていません。
              <br />
              ファイルをダウンロードしてご確認ください。
            </Alert>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={onDownloadExcel}
              size="large"
            >
              Excelファイルをダウンロード
            </Button>
          </Box>
        ) : (
          <>
            {/* ローディング表示 */}
            {loading && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <CircularProgress />
              </Box>
            )}

            {/* エラー表示 */}
            {error && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
                <Button variant="contained" startIcon={<Download />} onClick={onDownloadExcel}>
                  Excelファイルをダウンロード
                </Button>
              </Box>
            )}

            {/* PDFプレビュー */}
            {!error && (
              <iframe
                src={pdfUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: loading ? 'none' : 'block',
                }}
                title="PDFプレビュー"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            )}
          </>
        )}
      </DialogContent>

      {/* フッター */}
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        {onSendEmail && (
          <Button
            variant="outlined"
            startIcon={<Email />}
            onClick={onSendEmail}
          >
            メールで送信
          </Button>
        )}
        {!isIPhone && (
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={onDownloadExcel}
          >
            Excelをダウンロード
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
