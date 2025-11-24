import { useState } from 'react';
import { format } from 'date-fns';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { UserSettings } from '@/types/userSettings';
import { TemplateService } from '@/services/api/templateService';
import { FirestoreService } from '@/services/firebase/firestoreService';
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
 * 注文送信ロジックを管理するカスタムフック
 *
 * 以下の責務を持つ:
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
   * フォーム送信処理
   *
   * @param data - フォームデータ
   * @param onBookNameDialogOpen - ブック名ダイアログを開くコールバック
   * @returns 成功時にtrue、ブック名ダイアログ表示時にfalse
   */
  const handleSubmit = async (
    data: OrderFormData,
    onBookNameDialogOpen: () => void
  ): Promise<boolean> => {
    try {
      // オンライン時はダイアログを表示するため、まだローディングを表示しない
      if (!isOnline) {
        showLoading();
      }

      console.log('Form data:', data);

      // バリデーション: すべての商品の帳合先がステップ1で選択された帳合先リストに含まれているかチェック
      const invalidProducts = data.products.filter(
        (product) => !data.suppliers.includes(product.supplier)
      );

      if (invalidProducts.length > 0) {
        if (!isOnline) {
          hideLoading();
        }
        showError(
          `一部の商品の帳合先がステップ1で選択されていません。` +
          `該当する商品の帳合先を修正してください。`
        );
        return false;
      }

      // オンライン時: 先にローディングを表示してデータ保存
      if (isOnline) {
        showLoading();
      }

      // バイヤー名を取得（UserSettings > ユーザー名 > メールアドレス > '匿名'）
      const buyerName = userSettings?.buyerName?.trim() || user?.displayName || user?.email || '匿名';

      // オフライン同期を使用してデータを保存
      // オンライン時: Firestore + API呼び出し
      // オフライン時: IndexedDBのみ
      await saveOrderWithSync(data, buyerName);

      // オートコンプリート履歴に追加
      if (user) {
        // 複数の帳合先を履歴に追加
        for (const supplier of data.suppliers) {
          await supplierAutocomplete.addToHistory(supplier);
        }

        for (const product of data.products) {
          await productNameAutocomplete.addToHistory(product.name);
          await originAutocomplete.addToHistory(product.origin);

          // 商品履歴を保存（各商品の帳合先ごとに）
          await FirestoreService.saveProductHistory(
            user.uid,
            product.supplier,
            product.name,
            product.origin,
            product.specification || '',
            product.quantityPerPackage ?? null,
            product.unit || '',
            product.categoryCode
          );

          // 価格履歴を保存（商品名・規格・入数をキーとして）
          if (
            product.centerCost &&
            product.storeCost &&
            product.priceExcludingTax &&
            product.quantityPerPackage
          ) {
            await FirestoreService.savePricingHistory(
              user.uid,
              product.name,
              product.specification || '',
              product.quantityPerPackage,
              product.unit || '',
              product.centerCost,
              product.storeCost,
              product.priceExcludingTax,
              product.centerFeeRate
            );
          }
        }
      }

      // オンライン時: データ保存後にローディングを隠してブック名ダイアログを表示
      if (isOnline) {
        hideLoading();
        onBookNameDialogOpen();
        return false; // ダイアログ確認待ち
      }

      // オフライン時: テンプレート生成をスキップ
      showSuccess('オフラインのため配分表を保存しました');
      hideLoading();
      return true;
    } catch (error) {
      hideLoading();
      showError(error instanceof Error ? error.message : 'テンプレートの生成に失敗しました');
      return false;
    }
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

  /**
   * Excelファイルをダウンロード
   */
  const handleDownloadExcel = async () => {
    if (!generatedFiles) return;

    try {
      showLoading();

      // 相対URLを絶対URLに変換
      // Firebase Hosting版では環境変数のバックエンドURLを使用
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const baseUrl = apiBaseUrl
        ? apiBaseUrl.replace(/\/api$/, '') // /apiサフィックスを削除
        : window.location.origin; // Render版（同一オリジン）
      const absoluteUrl = new URL(generatedFiles.downloadUrl, baseUrl).href;
      console.log('📥 Excel download URL:', generatedFiles.downloadUrl);
      console.log('📥 Base URL:', baseUrl);
      console.log('📥 Absolute URL:', absoluteUrl);

      // fetchでファイルを取得してContent-Typeを確認
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
        throw new Error('サーバーからHTMLが返されました。ファイルが生成されていない可能性があります。');
      }

      const blob = await response.blob();
      console.log('Downloaded blob size:', blob.size, 'bytes');

      // Blobからダウンロードリンクを作成
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = generatedFiles.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Blob URLをクリーンアップ
      window.URL.revokeObjectURL(blobUrl);

      hideLoading();
    } catch (error) {
      hideLoading();
      console.error('Excel download error:', error);
      showError(error instanceof Error ? error.message : 'Excelファイルのダウンロードに失敗しました');
    }
  };

  /**
   * PDFファイルをダウンロード
   */
  const handleDownloadPdf = async () => {
    if (!generatedFiles || !generatedFiles.pdfDownloadUrl) return;

    try {
      showLoading();

      // 相対URLを絶対URLに変換
      // Firebase Hosting版では環境変数のバックエンドURLを使用
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const baseUrl = apiBaseUrl
        ? apiBaseUrl.replace(/\/api$/, '') // /apiサフィックスを削除
        : window.location.origin; // Render版（同一オリジン）
      const absoluteUrl = new URL(generatedFiles.pdfDownloadUrl, baseUrl).href;
      console.log('📥 PDF download URL:', generatedFiles.pdfDownloadUrl);
      console.log('📥 Base URL:', baseUrl);
      console.log('📥 Absolute URL:', absoluteUrl);

      // PDFをfetchしてblobとして取得
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
        throw new Error('サーバーからHTMLが返されました。PDFファイルが生成されていない可能性があります。');
      }

      const blob = await response.blob();
      console.log('Downloaded blob size:', blob.size, 'bytes');

      // Blobからダウンロードリンクを作成
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      // PDFファイル名を生成（Excelファイル名の.xlsxを.pdfに置き換え）
      const pdfFilename = generatedFiles.filename.replace('.xlsx', '.pdf');
      link.download = pdfFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Blob URLをクリーンアップ
      window.URL.revokeObjectURL(blobUrl);

      hideLoading();
    } catch (error) {
      hideLoading();
      console.error('PDF download error:', error);
      showError(error instanceof Error ? error.message : 'PDFのダウンロードに失敗しました');
    }
  };

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
