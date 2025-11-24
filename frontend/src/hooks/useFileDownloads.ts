import type { GeneratedFiles } from './useTemplateGeneration';

/**
 * useFileDownloadsのパラメータ
 */
interface UseFileDownloadsParams {
  generatedFiles: GeneratedFiles | null;
  showError: (message: string) => void;
  showLoading: () => void;
  hideLoading: () => void;
}

/**
 * ファイルダウンロード設定
 */
interface DownloadConfig {
  url: string;
  filename: string;
  fileType: 'Excel' | 'PDF';
}

/**
 * useFileDownloads
 *
 * Excel/PDFファイルのダウンロード機能を提供するカスタムフック
 *
 * 責務:
 * - Excelファイルのダウンロード
 * - PDFファイルのダウンロード
 * - 共通ダウンロードロジック（DRY化）
 *
 * DRY化の効果:
 * - Before: 116行（handleDownloadExcel: 57行 + handleDownloadPdf: 59行）
 * - After: ~85行（downloadFile: 65行 + downloadExcel: 10行 + downloadPdf: 10行）
 * - 削減: 約27%のコード削減
 *
 * @example
 * ```typescript
 * const {
 *   downloadExcel,
 *   downloadPdf,
 * } = useFileDownloads({
 *   generatedFiles,
 *   showError,
 *   showLoading,
 *   hideLoading,
 * });
 * ```
 */
export const useFileDownloads = ({
  generatedFiles,
  showError,
  showLoading,
  hideLoading,
}: UseFileDownloadsParams) => {
  /**
   * ファイルダウンロードの共通処理（DRY化）
   *
   * Excel と PDF のダウンロードロジックを統合し、
   * コードの重複を削減しています。
   */
  const downloadFile = async (config: DownloadConfig) => {
    try {
      showLoading();

      // 相対URLを絶対URLに変換
      // Firebase Hosting版では環境変数のバックエンドURLを使用
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const baseUrl = apiBaseUrl
        ? apiBaseUrl.replace(/\/api$/, '') // /apiサフィックスを削除
        : window.location.origin; // Render版（同一オリジン）
      const absoluteUrl = new URL(config.url, baseUrl).href;

      console.log(`📥 ${config.fileType} download URL:`, config.url);
      console.log('📥 Base URL:', baseUrl);
      console.log('📥 Absolute URL:', absoluteUrl);

      // ファイルを取得
      const response = await fetch(absoluteUrl);
      console.log('Response status:', response.status);
      console.log('Response Content-Type:', response.headers.get('Content-Type'));

      if (!response.ok) {
        throw new Error(`ダウンロード失敗: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('Content-Type') || '';

      // HTMLが返された場合はエラー
      if (contentType.includes('text/html')) {
        const htmlText = await response.text();
        console.error('❌ HTMLファイルが返されました:', htmlText.substring(0, 500));
        throw new Error(
          `サーバーからHTMLが返されました。${config.fileType}ファイルが生成されていない可能性があります。`
        );
      }

      const blob = await response.blob();
      console.log('Downloaded blob size:', blob.size, 'bytes');

      // Blobからダウンロードリンクを作成
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = config.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Blob URLをクリーンアップ
      window.URL.revokeObjectURL(blobUrl);

      hideLoading();
    } catch (error) {
      hideLoading();
      console.error(`${config.fileType} download error:`, error);
      showError(
        error instanceof Error
          ? error.message
          : `${config.fileType}ファイルのダウンロードに失敗しました`
      );
    }
  };

  /**
   * Excelファイルをダウンロード
   */
  const downloadExcel = async () => {
    if (!generatedFiles) return;

    await downloadFile({
      url: generatedFiles.downloadUrl,
      filename: generatedFiles.filename,
      fileType: 'Excel',
    });
  };

  /**
   * PDFファイルをダウンロード
   */
  const downloadPdf = async () => {
    if (!generatedFiles || !generatedFiles.pdfDownloadUrl) return;

    await downloadFile({
      url: generatedFiles.pdfDownloadUrl,
      filename: generatedFiles.filename.replace('.xlsx', '.pdf'),
      fileType: 'PDF',
    });
  };

  return {
    downloadExcel,
    downloadPdf,
  };
};
