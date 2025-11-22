import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
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
import {
  Close,
  Download,
  Email,
  ZoomIn,
  ZoomOut,
  NavigateBefore,
  NavigateNext,
  Fullscreen,
} from '@mui/icons-material';
import { isIPhoneSafari } from '@/utils/deviceDetection';

// PDF.js worker設定 - jsDelivrを使用（npmパッケージを直接提供）
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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
  /** PDFファイルダウンロードハンドラ（オプション） */
  onDownloadPdf?: () => void;
  /** メール送信ハンドラ（オプション） */
  onSendEmail?: () => void;
}

/**
 * PDFプレビューモーダル（react-pdf使用）
 *
 * react-pdfを使用してPDFをプレビュー表示します。
 * すべてのブラウザ（iPhone Safariを含む）で動作します。
 *
 * 機能:
 * - ページネーション（前へ/次へ）
 * - ズーム（拡大/縮小）
 * - ダウンロード（Excel/PDF）
 * - メール送信
 *
 * 使用例:
 * ```tsx
 * <PDFPreviewModal
 *   open={showPreview}
 *   onClose={() => setShowPreview(false)}
 *   pdfUrl="/api/download/sample.pdf"
 *   onDownloadExcel={handleDownload}
 *   onDownloadPdf={handleDownloadPdf}
 * />
 * ```
 */
export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  open,
  onClose,
  pdfUrl,
  onDownloadExcel,
  onDownloadPdf,
  onSendEmail,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [error, setError] = useState<string | null>(null);

  // iPhone Safari判定
  const isIPhone = isIPhoneSafari();

  /**
   * PDF読み込み成功時
   */
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setError(null);
  };

  /**
   * PDF読み込み失敗時
   */
  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('PDFの読み込みに失敗しました');
  };

  /**
   * ページ変更
   */
  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => {
      const newPage = prevPageNumber + offset;
      return Math.max(1, Math.min(newPage, numPages));
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  /**
   * ズーム
   */
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => setScale(1.0);

  /**
   * モーダルを閉じる時の処理
   */
  const handleClose = () => {
    setPageNumber(1);
    setScale(1.0);
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' },
      }}
    >
      {/* ヘッダー */}
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">PDFプレビュー</Typography>

          {/* コントロールボタン */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* ズームコントロール */}
            {!isIPhone && numPages > 0 && (
              <>
                <IconButton onClick={zoomOut} size="small" disabled={scale <= 0.5}>
                  <ZoomOut />
                </IconButton>
                <Typography
                  variant="body2"
                  sx={{ minWidth: '50px', textAlign: 'center', cursor: 'pointer' }}
                  onClick={resetZoom}
                  title="クリックでリセット"
                >
                  {Math.round(scale * 100)}%
                </Typography>
                <IconButton onClick={zoomIn} size="small" disabled={scale >= 3.0}>
                  <ZoomIn />
                </IconButton>
              </>
            )}
            <IconButton onClick={handleClose} aria-label="閉じる">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      {/* コンテンツ */}
      <DialogContent
        dividers
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'auto',
          bgcolor: '#f5f5f5',
        }}
      >
        {/* iPhone Safariの場合は代替UI */}
        {isIPhone ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              iPhone Safariでは、PDFプレビューの一部機能が制限されます。
              <br />
              下のボタンからPDFを開いて表示できます。
            </Alert>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Fullscreen />}
                onClick={() => window.open(pdfUrl, '_blank')}
                size="large"
                fullWidth
                sx={{ maxWidth: 300 }}
              >
                PDFを開く
              </Button>
              {onDownloadPdf && (
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={onDownloadPdf}
                  size="large"
                  fullWidth
                  sx={{ maxWidth: 300 }}
                >
                  PDFをダウンロード
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={onDownloadExcel}
                size="large"
                fullWidth
                sx={{ maxWidth: 300 }}
              >
                Excelをダウンロード
              </Button>
            </Box>
          </Box>
        ) : (
          <>
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
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  py: 2,
                }}
              >
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                      <Typography sx={{ ml: 2 }}>PDFを読み込んでいます...</Typography>
                    </Box>
                  }
                  error={
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                      <Alert severity="error">PDFの読み込みに失敗しました</Alert>
                    </Box>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading={
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    }
                  />
                </Document>

                {/* ページネーション */}
                {numPages > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      alignItems: 'center',
                      bgcolor: 'white',
                      px: 2,
                      py: 1,
                      borderRadius: 1,
                      boxShadow: 1,
                    }}
                  >
                    <IconButton
                      onClick={previousPage}
                      disabled={pageNumber <= 1}
                      size="small"
                      color="primary"
                    >
                      <NavigateBefore />
                    </IconButton>
                    <Typography variant="body2" sx={{ minWidth: '80px', textAlign: 'center' }}>
                      {pageNumber} / {numPages}
                    </Typography>
                    <IconButton
                      onClick={nextPage}
                      disabled={pageNumber >= numPages}
                      size="small"
                      color="primary"
                    >
                      <NavigateNext />
                    </IconButton>
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      {/* フッター */}
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose}>閉じる</Button>
        <Box sx={{ flexGrow: 1 }} />
        {onSendEmail && (
          <Button variant="outlined" startIcon={<Email />} onClick={onSendEmail}>
            メールで送信
          </Button>
        )}
        {onDownloadPdf && !isIPhone && (
          <Button variant="outlined" startIcon={<Download />} onClick={onDownloadPdf}>
            PDFダウンロード
          </Button>
        )}
        {!isIPhone && (
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={onDownloadExcel}
            color="success"
          >
            Excelダウンロード
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
