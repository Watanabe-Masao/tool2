import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
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
  TextField,
  Tooltip,
  Divider,
  ButtonGroup,
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
  FullscreenExit,
  RotateRight,
  FitScreen,
  AspectRatio,
  CropOriginal,
} from '@mui/icons-material';
import { isIPhoneSafari } from '@/utils/deviceDetection';

// PDF.js worker設定 - Viteで自動バンドル（推奨方法）
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

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

type FitMode = 'width' | 'page' | 'actual';

/**
 * リッチPDFプレビューモーダル
 *
 * 機能:
 * - ページネーション（前へ/次へ、ジャンプ）
 * - ズーム（拡大/縮小、フィット）
 * - 回転（90度ずつ）
 * - キーボードショートカット
 * - フルスクリーンモード
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
  const [rotation, setRotation] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<FitMode>('width');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pageInputValue, setPageInputValue] = useState<string>('1');

  const containerRef = useRef<HTMLDivElement>(null);
  const isIPhone = isIPhoneSafari();

  /**
   * PDF読み込み成功時
   */
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setPageInputValue('1');
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
    const newPage = Math.max(1, Math.min(pageNumber + offset, numPages));
    setPageNumber(newPage);
    setPageInputValue(String(newPage));
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  /**
   * ページジャンプ
   */
  const handlePageJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInputValue, 10);
      if (page >= 1 && page <= numPages) {
        setPageNumber(page);
      } else {
        setPageInputValue(String(pageNumber));
      }
    }
  };

  /**
   * ズーム
   */
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => {
    setScale(1.0);
    setFitMode('actual');
  };

  /**
   * フィットモード切り替え
   */
  const setFitToWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 40;
      // A4サイズ（595pt）を基準に計算
      const newScale = containerWidth / 595;
      setScale(Math.min(newScale, 2.0));
      setFitMode('width');
    }
  };

  const setFitToPage = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 40;
      const containerHeight = containerRef.current.clientHeight - 100;
      // A4比率（595x842）を基準に計算
      const scaleWidth = containerWidth / 595;
      const scaleHeight = containerHeight / 842;
      const newScale = Math.min(scaleWidth, scaleHeight, 1.5);
      setScale(newScale);
      setFitMode('page');
    }
  };

  /**
   * 回転
   */
  const rotateRight = () => setRotation((prev) => (prev + 90) % 360);

  /**
   * フルスクリーン
   */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  /**
   * モーダルを閉じる時の処理
   */
  const handleClose = () => {
    setPageNumber(1);
    setPageInputValue('1');
    setScale(1.0);
    setRotation(0);
    setFitMode('width');
    setError(null);
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    onClose();
  };

  /**
   * キーボードショートカット
   */
  useEffect(() => {
    if (!open || isIPhone) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フィールドにフォーカスがある場合は無視
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          previousPage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextPage();
          break;
        case 'ArrowUp':
          e.preventDefault();
          zoomIn();
          break;
        case 'ArrowDown':
          e.preventDefault();
          zoomOut();
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          rotateRight();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            e.preventDefault();
            document.exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, pageNumber, numPages, isIPhone]);

  /**
   * フルスクリーン変更監視
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isFullscreen}
      PaperProps={{
        sx: { height: isFullscreen ? '100vh' : '90vh' },
      }}
    >
      {/* ヘッダー */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">PDFプレビュー</Typography>

          {/* ツールバー */}
          {!isIPhone && numPages > 0 && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* ページネーション */}
              <ButtonGroup size="small" variant="outlined">
                <Tooltip title="前のページ (←)">
                  <span>
                    <IconButton onClick={previousPage} disabled={pageNumber <= 1} size="small">
                      <NavigateBefore />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="次のページ (→)">
                  <span>
                    <IconButton onClick={nextPage} disabled={pageNumber >= numPages} size="small">
                      <NavigateNext />
                    </IconButton>
                  </span>
                </Tooltip>
              </ButtonGroup>

              <TextField
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onKeyDown={handlePageJump}
                onBlur={() => setPageInputValue(String(pageNumber))}
                size="small"
                sx={{ width: '60px' }}
                inputProps={{
                  style: { textAlign: 'center', padding: '4px 8px' },
                }}
              />
              <Typography variant="body2" sx={{ minWidth: '40px' }}>
                / {numPages}
              </Typography>

              <Divider orientation="vertical" flexItem />

              {/* ズームコントロール */}
              <ButtonGroup size="small" variant="outlined">
                <Tooltip title="縮小 (-)">
                  <span>
                    <IconButton onClick={zoomOut} disabled={scale <= 0.5} size="small">
                      <ZoomOut />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="拡大 (+)">
                  <span>
                    <IconButton onClick={zoomIn} disabled={scale >= 3.0} size="small">
                      <ZoomIn />
                    </IconButton>
                  </span>
                </Tooltip>
              </ButtonGroup>

              <Tooltip title="リセット (0)">
                <Typography
                  variant="body2"
                  sx={{
                    minWidth: '55px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={resetZoom}
                >
                  {Math.round(scale * 100)}%
                </Typography>
              </Tooltip>

              <Divider orientation="vertical" flexItem />

              {/* フィット */}
              <ButtonGroup size="small" variant="outlined">
                <Tooltip title="幅に合わせる">
                  <IconButton
                    onClick={setFitToWidth}
                    size="small"
                    color={fitMode === 'width' ? 'primary' : 'default'}
                  >
                    <AspectRatio />
                  </IconButton>
                </Tooltip>
                <Tooltip title="ページ全体">
                  <IconButton
                    onClick={setFitToPage}
                    size="small"
                    color={fitMode === 'page' ? 'primary' : 'default'}
                  >
                    <FitScreen />
                  </IconButton>
                </Tooltip>
                <Tooltip title="実サイズ">
                  <IconButton
                    onClick={resetZoom}
                    size="small"
                    color={fitMode === 'actual' ? 'primary' : 'default'}
                  >
                    <CropOriginal />
                  </IconButton>
                </Tooltip>
              </ButtonGroup>

              <Divider orientation="vertical" flexItem />

              {/* 回転 */}
              <Tooltip title="90度回転 (R)">
                <IconButton onClick={rotateRight} size="small">
                  <RotateRight />
                </IconButton>
              </Tooltip>

              {/* フルスクリーン */}
              <Tooltip title={isFullscreen ? 'フルスクリーン解除 (F)' : 'フルスクリーン (F)'}>
                <IconButton onClick={toggleFullscreen} size="small">
                  {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem />

              {/* 閉じる */}
              <Tooltip title="閉じる (Esc)">
                <IconButton onClick={handleClose} size="small">
                  <Close />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {isIPhone && (
            <IconButton onClick={handleClose}>
              <Close />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      {/* コンテンツ */}
      <DialogContent
        ref={containerRef}
        dividers
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'auto',
          bgcolor: '#f5f5f5',
          p: 2,
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
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={onDownloadExcel}
                  size="medium"
                  sx={{
                    px: { xs: 1.5, sm: 2, md: 3 },
                    py: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                  }}
                >
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                      <CircularProgress />
                      <Typography sx={{ mt: 2 }}>PDFを読み込んでいます...</Typography>
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
                    rotate={rotation}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    }
                  />
                </Document>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      {/* フッター */}
      <DialogActions sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2 }, gap: { xs: 0.5, sm: 1 } }}>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          <Typography variant="caption">
            キーボード: ← → (ページ) / + - (ズーム) / R (回転) / F (フルスクリーン)
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        {onSendEmail && (
          <Button
            variant="outlined"
            startIcon={<Email />}
            onClick={onSendEmail}
            size="medium"
            sx={{
              px: { xs: 1.5, sm: 2, md: 3 },
              py: { xs: 0.75, sm: 1 },
              fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
            }}
          >
            メールで送信
          </Button>
        )}
        {onDownloadPdf && !isIPhone && (
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={onDownloadPdf}
            size="medium"
            sx={{
              px: { xs: 1.5, sm: 2, md: 3 },
              py: { xs: 0.75, sm: 1 },
              fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
            }}
          >
            PDFダウンロード
          </Button>
        )}
        {!isIPhone && (
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={onDownloadExcel}
            color="success"
            size="medium"
            sx={{
              px: { xs: 1.5, sm: 2, md: 3 },
              py: { xs: 0.75, sm: 1 },
              fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
            }}
          >
            Excelダウンロード
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
