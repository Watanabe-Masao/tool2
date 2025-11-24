import type { OrderFormData } from '@/schemas/orderSchema';
import type { UserSettings } from '@/types/userSettings';
import { useOrderDataSubmit } from './useOrderDataSubmit';
import { useHistoryTracking } from './useHistoryTracking';
import { useTemplateGeneration } from './useTemplateGeneration';
import { useFileDownloads } from './useFileDownloads';

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
 * useOrderSubmitフックのパラメータ
 */
interface UseOrderSubmitParams {
  userId: string | undefined;
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
  } | null;
  userSettings: UserSettings | null;
  isOnline: boolean;
  saveOrderWithSync: (data: OrderFormData, buyerName: string) => Promise<void>;
  supplierAutocomplete: {
    addToHistory: (value: string) => Promise<void>;
  };
  productNameAutocomplete: {
    addToHistory: (value: string) => Promise<void>;
  };
  originAutocomplete: {
    addToHistory: (value: string) => Promise<void>;
  };
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showLoading: () => void;
  hideLoading: () => void;
}

/**
 * useOrderSubmit
 *
 * 注文送信ロジックを管理するカスタムフック（統合版）
 *
 * このhookは、以下の4つの小さなhooksを組み合わせて構成されています:
 * - useOrderDataSubmit: データ送信・バリデーション・保存
 * - useHistoryTracking: オートコンプリート・商品・価格履歴の保存
 * - useTemplateGeneration: Excel/PDFテンプレート生成
 * - useFileDownloads: ファイルダウンロード処理（DRY化）
 *
 * 各小hookは単一責任の原則に従い、テストしやすく保守しやすい設計になっています。
 * この統合hookは既存のインターフェースを維持し、後方互換性を保証します。
 *
 * 責務:
 * - 注文データの送信とFirestore保存
 * - オートコンプリート履歴の更新
 * - 商品履歴・価格履歴の保存
 * - Excel/PDFテンプレート生成
 * - ファイルダウンロード処理
 *
 * @example
 * ```typescript
 * const {
 *   generatedFiles,
 *   excelBlob,
 *   handleSubmit,
 *   handleGenerateTemplate,
 *   handleDownloadExcel,
 *   handleDownloadPdf,
 * } = useOrderSubmit({
 *   userId,
 *   user,
 *   userSettings,
 *   isOnline,
 *   saveOrderWithSync,
 *   supplierAutocomplete,
 *   productNameAutocomplete,
 *   originAutocomplete,
 *   showSuccess,
 *   showError,
 *   showLoading,
 *   hideLoading,
 * });
 * ```
 */
export const useOrderSubmit = (params: UseOrderSubmitParams) => {
  const {
    user,
    userSettings,
    isOnline,
    saveOrderWithSync,
    supplierAutocomplete,
    productNameAutocomplete,
    originAutocomplete,
    showSuccess,
    showError,
    showLoading,
    hideLoading,
  } = params;

  // 1. データ送信機能
  const { submitOrderData } = useOrderDataSubmit({
    user,
    userSettings,
    isOnline,
    saveOrderWithSync,
    showSuccess,
    showError,
    showLoading,
    hideLoading,
  });

  // 2. 履歴保存機能
  const { saveAllHistories } = useHistoryTracking({
    user,
    supplierAutocomplete,
    productNameAutocomplete,
    originAutocomplete,
  });

  // 3. テンプレート生成機能
  const {
    generatedFiles,
    setGeneratedFiles,
    excelBlob,
    setExcelBlob,
    generateTemplate,
  } = useTemplateGeneration({
    user,
    userSettings,
    showSuccess,
    showError,
    showLoading,
    hideLoading,
  });

  // 4. ファイルダウンロード機能
  const { downloadExcel, downloadPdf } = useFileDownloads({
    generatedFiles,
    showError,
    showLoading,
    hideLoading,
  });

  /**
   * フォーム送信処理（統合版）
   *
   * データ送信後、履歴を保存します。
   *
   * @param data - フォームデータ
   * @param onBookNameDialogOpen - ブック名ダイアログを開くコールバック
   * @returns 成功時にtrue、ブック名ダイアログ表示時にfalse
   */
  const handleSubmit = async (
    data: OrderFormData,
    onBookNameDialogOpen: () => void
  ): Promise<boolean> => {
    // データ送信
    const result = await submitOrderData(data, onBookNameDialogOpen);

    // 成功時のみ履歴保存
    if (result && user) {
      await saveAllHistories(data);
    }

    return result;
  };

  /**
   * ブック名確認後のテンプレート生成
   *
   * @param data - フォームデータ
   * @param bookName - ブック名
   * @param setHasUnsavedChanges - 未保存変更フラグの更新関数
   */
  const handleGenerateTemplate = async (
    data: OrderFormData,
    bookName: string,
    setHasUnsavedChanges: (value: boolean) => void
  ): Promise<boolean> => {
    return await generateTemplate(data, bookName, setHasUnsavedChanges);
  };

  /**
   * Excelファイルをダウンロード
   */
  const handleDownloadExcel = async () => {
    await downloadExcel();
  };

  /**
   * PDFファイルをダウンロード
   */
  const handleDownloadPdf = async () => {
    await downloadPdf();
  };

  // 既存のインターフェースを維持（後方互換性）
  return {
    generatedFiles,
    setGeneratedFiles,
    excelBlob,
    setExcelBlob,
    handleSubmit,
    handleGenerateTemplate,
    handleDownloadExcel,
    handleDownloadPdf,
  };
};
