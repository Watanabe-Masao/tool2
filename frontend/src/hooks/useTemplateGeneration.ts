import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { UserSettings } from '@/types/userSettings';
import { useTemplateService, useSessionStorageService } from '@/context/ServiceContext';
import type { GeneratedFiles } from '@/types/hooks';

/**
 * FastAPI Pydanticバリデーションエラーの詳細
 */
interface PydanticValidationDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
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
  // Service Context からサービスを取得
  const templateService = useTemplateService();
  const sessionStorageService = useSessionStorageService();

  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFiles | null>(null);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);

  /**
   * ExcelファイルをBlobとして取得
   */
  const fetchExcelAsBlob = useCallback(async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Excelファイルの取得に失敗しました');
    }
    return await response.blob();
  }, []);

  /**
   * フォームデータのバリデーション
   */
  const validateFormData = useCallback((data: OrderFormData): string | null => {
    const missingFields: string[] = [];

    // 店着日チェック
    if (!data.deliveryDate) {
      missingFields.push('店着日');
    }

    // 帳合先チェック
    if (!data.suppliers || data.suppliers.length === 0) {
      missingFields.push('帳合先');
    }

    // 商品チェック
    if (!data.products || data.products.length === 0) {
      missingFields.push('商品情報');
    } else {
      data.products.forEach((product, index) => {
        const productNum = index + 1;
        const productErrors: string[] = [];

        if (!product.name?.trim()) {
          productErrors.push('品名');
        }
        if (!product.origin?.trim()) {
          productErrors.push('産地');
        }
        if (!product.specification?.trim()) {
          productErrors.push('規格');
        }
        if (!product.specificationUnit?.trim()) {
          productErrors.push('規格の単位');
        }
        if (!product.quantityPerPackage || product.quantityPerPackage <= 0) {
          productErrors.push('入数');
        }
        if (!product.packageUnit?.trim()) {
          productErrors.push('入数の単位');
        }
        if (product.storeCost === undefined || product.storeCost === null) {
          productErrors.push('店着原価');
        }
        if (product.priceExcludingTax === undefined || product.priceExcludingTax === null) {
          productErrors.push('税抜売価');
        }
        if (!product.totalDelivery || product.totalDelivery <= 0) {
          productErrors.push('総納品数');
        }
        if (!product.supplier?.trim()) {
          productErrors.push('納品先（帳合先）');
        }

        if (productErrors.length > 0) {
          missingFields.push(`商品${productNum}: ${productErrors.join(', ')}`);
        }
      });
    }

    if (missingFields.length > 0) {
      return `以下の項目を入力してください:\n\n${missingFields.join('\n')}`;
    }

    return null;
  }, []);

  /**
   * ブック名確認後のテンプレート生成
   *
   * @param data - フォームデータ
   * @param bookName - ブック名
   * @param setHasUnsavedChanges - 未保存変更フラグの更新関数
   */
  const generateTemplate = useCallback(
    async (
      data: OrderFormData,
      bookName: string,
      setHasUnsavedChanges: (value: boolean) => void
    ): Promise<boolean> => {
      try {
        // 送信前バリデーション
        const validationError = validateFormData(data);
        if (validationError) {
          showError(validationError);
          return false;
        }

        showLoading();

        // バイヤー名を取得
        const buyerName = userSettings?.buyerName?.trim() || user?.displayName || user?.email || '匿名';

        // カスタムファイル名を生成（配分表_{customName}_{YYYYMMDD}）
        const dateStr = format(data.deliveryDate, 'yyyyMMdd');
        const customName = bookName.trim() || '';
        const customFilename = customName ? `配分表_${customName}_${dateStr}` : `配分表_${dateStr}`;

        const response = await templateService.generateTemplate(data, buyerName, customFilename);

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
        } catch (err) {
          console.error('Failed to fetch Excel blob:', err);
          // Blobの取得に失敗してもテンプレート生成は成功しているので続行
        }

        hideLoading();

        // 成功メッセージ
        showSuccess('テンプレートを生成しました');

        // SessionStorageの下書きをクリア（成功時）
        if (user) {
          sessionStorageService.clearDraft(user.uid);
          setHasUnsavedChanges(false);
        }

        return true;
      } catch (error) {
        hideLoading();

        // エラーメッセージを詳細に表示
        let errorMessage = 'テンプレートの生成に失敗しました';

        if (error && typeof error === 'object') {
          const err = error as any;

          // Axiosエラーの場合
          if (err.response?.data) {
            const responseData = err.response.data;

            // FastAPI Pydanticバリデーションエラー
            if (responseData.detail && Array.isArray(responseData.detail)) {
              const missingFields = (responseData.detail as PydanticValidationDetail[])
                .map((detail) => {
                  const fieldName = detail.loc?.slice(-1)[0] || 'unknown';
                  const message = detail.msg || '';
                  return `${fieldName}: ${message}`;
                })
                .join('\n');
              errorMessage = `入力項目に不足があります:\n${missingFields}`;
            }
            // 文字列のdetail
            else if (typeof responseData.detail === 'string') {
              errorMessage = responseData.detail;
            }
            // messageフィールド
            else if (responseData.message) {
              errorMessage = responseData.message;
            }
          }
          // Errorオブジェクトのmessage
          else if (err.message) {
            errorMessage = err.message;
          }
        }

        showError(errorMessage);
        return false;
      }
    },
    [validateFormData, showLoading, userSettings, user, showError, hideLoading, showSuccess, fetchExcelAsBlob, setGeneratedFiles, setExcelBlob, templateService, sessionStorageService]
  );

  // 戻り値をメモ化して安定した参照を維持（無限ループ防止）
  return useMemo(
    () => ({
      generatedFiles,
      setGeneratedFiles,
      excelBlob,
      setExcelBlob,
      generateTemplate,
    }),
    [generatedFiles, excelBlob, generateTemplate]
  );
};

// Re-export for backward compatibility
export type { GeneratedFiles } from '@/types/hooks';
