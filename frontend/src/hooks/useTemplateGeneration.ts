import { useState } from 'react';
import { format } from 'date-fns';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { UserSettings } from '@/types/userSettings';
import { TemplateService } from '@/services/api/templateService';
import { SessionStorageService } from '@/utils/sessionStorageService';

/**
 * 生成されたファイル情報の型
 */
export interface GeneratedFiles {
  filename: string;
  downloadUrl: string;
  pdfFilename?: string;
  pdfDownloadUrl?: string;
}

/**
 * useTemplateGenerationのパラメータ
 */
interface UseTemplateGenerationParams {
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
  } | null;
  userSettings: UserSettings | null;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showLoading: () => void;
  hideLoading: () => void;
}

/**
 * useTemplateGeneration
 *
 * Excel/PDFテンプレート生成機能を提供するカスタムフック
 *
 * 責務:
 * - Excel/PDFテンプレートの生成
 * - 生成されたファイル情報の管理（generatedFiles）
 * - ExcelファイルのBlob管理（メール送信用）
 * - カスタムファイル名の生成
 * - 下書きのクリア
 *
 * @example
 * ```typescript
 * const {
 *   generatedFiles,
 *   setGeneratedFiles,
 *   excelBlob,
 *   setExcelBlob,
 *   generateTemplate,
 * } = useTemplateGeneration({
 *   user,
 *   userSettings,
 *   showSuccess,
 *   showError,
 *   showLoading,
 *   hideLoading,
 * });
 * ```
 */
export const useTemplateGeneration = ({
  user,
  userSettings,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
}: UseTemplateGenerationParams) => {
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFiles | null>(null);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);

  /**
   * ExcelファイルをBlobとして取得
   */
  const fetchExcelAsBlob = async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Excelファイルの取得に失敗しました');
    }
    return await response.blob();
  };

  /**
   * ブック名確認後のテンプレート生成
   *
   * @param data - フォームデータ
   * @param bookName - ブック名
   * @param setHasUnsavedChanges - 未保存変更フラグの更新関数
   */
  const generateTemplate = async (
    data: OrderFormData,
    bookName: string,
    setHasUnsavedChanges: (value: boolean) => void
  ): Promise<boolean> => {
    try {
      showLoading();

      // バイヤー名を取得
      const buyerName = userSettings?.buyerName?.trim() || user?.displayName || user?.email || '匿名';

      // カスタムファイル名を生成（配分表_{customName}_{YYYYMMDD}）
      const dateStr = format(data.deliveryDate, 'yyyyMMdd');
      const customName = bookName.trim() || '';
      const customFilename = customName ? `配分表_${customName}_${dateStr}` : `配分表_${dateStr}`;

      // デバッグログ
      console.log('📝 Custom filename generation:');
      console.log('  - bookName:', bookName);
      console.log('  - customName (trimmed):', customName);
      console.log('  - dateStr:', dateStr);
      console.log('  - customFilename:', customFilename);

      const response = await TemplateService.generateTemplate(data, buyerName, customFilename);

      console.log('Template generated:', response);

      // 生成されたファイル情報を保存
      setGeneratedFiles({
        filename: response.filename,
        downloadUrl: response.download_url,
        pdfFilename: response.pdf_filename,
        pdfDownloadUrl: response.pdf_download_url,
      });

      // ExcelファイルをBlobとして取得（メール送信用）
      try {
        const blob = await fetchExcelAsBlob(response.download_url);
        setExcelBlob(blob);
        console.log('Excel blob fetched successfully');
      } catch (err) {
        console.error('Failed to fetch Excel blob:', err);
        // Blobの取得に失敗してもテンプレート生成は成功しているので続行
      }

      hideLoading();

      // 成功メッセージ
      showSuccess('テンプレートを生成しました');

      // SessionStorageの下書きをクリア（成功時）
      if (user) {
        SessionStorageService.clearDraft(user.uid);
        setHasUnsavedChanges(false);
      }

      return true;
    } catch (error) {
      hideLoading();
      showError(error instanceof Error ? error.message : 'テンプレートの生成に失敗しました');
      return false;
    }
  };

  return {
    generatedFiles,
    setGeneratedFiles,
    excelBlob,
    setExcelBlob,
    generateTemplate,
  };
};
