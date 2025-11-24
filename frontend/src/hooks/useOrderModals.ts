import { useState, useCallback } from 'react';

/**
 * 生成されたファイル情報
 */
export interface GeneratedFiles {
  filename: string;
  downloadUrl: string;
  pdfFilename?: string;
  pdfDownloadUrl?: string;
}

/**
 * ブック名ダイアログの状態
 */
export interface BookNameDialogState {
  open: boolean;
  bookName: string;
}

/**
 * 注文フォームのモーダル状態管理フック
 *
 * PDF プレビュー、ダウンロード、メール送信、配分プレビューなど
 * 複数のモーダルの開閉状態を一元管理
 *
 * @returns モーダル状態とハンドラー
 */
export const useOrderModals = () => {
  // PDF プレビューモーダル
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  // ダウンロードモーダル
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // 配分プレビューモーダル
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // メール送信モーダル
  const [showEmailModal, setShowEmailModal] = useState(false);

  // 生成後のプレビュー表示
  const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);

  // 生成されたファイル情報
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFiles | null>(null);

  // Excel Blob
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);

  // ブック名入力ダイアログ
  const [bookNameDialog, setBookNameDialog] = useState<BookNameDialogState>({
    open: false,
    bookName: '',
  });

  /**
   * PDF プレビューを開く
   */
  const openPDFPreview = useCallback(() => {
    setShowPDFPreview(true);
  }, []);

  /**
   * PDF プレビューを閉じる
   */
  const closePDFPreview = useCallback(() => {
    setShowPDFPreview(false);
  }, []);

  /**
   * ダウンロードモーダルを開く
   */
  const openDownloadModal = useCallback(() => {
    setShowDownloadModal(true);
  }, []);

  /**
   * ダウンロードモーダルを閉じる
   */
  const closeDownloadModal = useCallback(() => {
    setShowDownloadModal(false);
  }, []);

  /**
   * 配分プレビューモーダルを開く
   */
  const openPreviewModal = useCallback(() => {
    setShowPreviewModal(true);
  }, []);

  /**
   * 配分プレビューモーダルを閉じる
   */
  const closePreviewModal = useCallback(() => {
    setShowPreviewModal(false);
  }, []);

  /**
   * メール送信モーダルを開く
   */
  const openEmailModal = useCallback(() => {
    setShowEmailModal(true);
  }, []);

  /**
   * メール送信モーダルを閉じる
   */
  const closeEmailModal = useCallback(() => {
    setShowEmailModal(false);
  }, []);

  /**
   * 生成後のプレビューを開く
   */
  const openGeneratedPreview = useCallback((files: GeneratedFiles, blob: Blob) => {
    setGeneratedFiles(files);
    setExcelBlob(blob);
    setShowGeneratedPreview(true);
  }, []);

  /**
   * 生成後のプレビューを閉じる
   */
  const closeGeneratedPreview = useCallback(() => {
    setShowGeneratedPreview(false);
  }, []);

  /**
   * ブック名ダイアログを開く
   */
  const openBookNameDialog = useCallback((defaultBookName: string) => {
    setBookNameDialog({
      open: true,
      bookName: defaultBookName,
    });
  }, []);

  /**
   * ブック名ダイアログを閉じる
   */
  const closeBookNameDialog = useCallback(() => {
    setBookNameDialog({
      open: false,
      bookName: '',
    });
  }, []);

  /**
   * ブック名を更新
   */
  const updateBookName = useCallback((bookName: string) => {
    setBookNameDialog(prev => ({
      ...prev,
      bookName,
    }));
  }, []);

  /**
   * すべてのモーダルを閉じる
   */
  const closeAllModals = useCallback(() => {
    setShowPDFPreview(false);
    setShowDownloadModal(false);
    setShowPreviewModal(false);
    setShowEmailModal(false);
    setShowGeneratedPreview(false);
    setBookNameDialog({ open: false, bookName: '' });
  }, []);

  return {
    // 状態
    showPDFPreview,
    showDownloadModal,
    showPreviewModal,
    showEmailModal,
    showGeneratedPreview,
    generatedFiles,
    excelBlob,
    bookNameDialog,

    // セッター（直接アクセスが必要な場合）
    setShowPDFPreview,
    setShowDownloadModal,
    setShowPreviewModal,
    setShowEmailModal,
    setShowGeneratedPreview,
    setGeneratedFiles,
    setExcelBlob,
    setBookNameDialog,

    // ハンドラー
    openPDFPreview,
    closePDFPreview,
    openDownloadModal,
    closeDownloadModal,
    openPreviewModal,
    closePreviewModal,
    openEmailModal,
    closeEmailModal,
    openGeneratedPreview,
    closeGeneratedPreview,
    openBookNameDialog,
    closeBookNameDialog,
    updateBookName,
    closeAllModals,
  };
};
