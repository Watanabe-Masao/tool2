import { apiClient } from './client';
import { API_ENDPOINTS, API_BASE_URL, STORE_CODES } from '@/utils/constants';
import type { TemplateRequest, TemplateResponse } from '@/types';
import { format } from 'date-fns';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * テンプレート生成サービス
 */
export class TemplateService {
  /**
   * 注文フォームデータをAPIリクエスト形式に変換
   */
  private static convertToApiRequest(
    formData: OrderFormData,
    buyerName: string
  ): TemplateRequest {
    // 最初の商品の帳合先、または選択された帳合先の最初を使用
    const primarySupplier = formData.products[0]?.supplier || formData.suppliers[0] || '';

    return {
      delivery_date: format(formData.deliveryDate, 'yyyy-MM-dd'),
      supplier: primarySupplier,
      buyer_name: buyerName,
      products: formData.products.map((product) => ({
        name: product.name,
        origin: product.origin,
        standard: product.specification || '',
        quantity: product.quantityPerPackage,
        unit: product.unit || '',
        store_cost: product.storeCost,
        price: product.priceExcludingTax,
        total_delivery: product.totalDelivery,
        delivery_dest: product.supplier,
        store_quantities: this.convertStoreAllocations(product.storeAllocations),
      })),
    };
  }

  /**
   * 店舗配分配列を店舗コードマップに変換
   *
   * @param allocations - 36店舗分の配分数配列
   * @returns 店舗コード→配分数のマップ（0の値は除外）
   */
  private static convertStoreAllocations(allocations: number[]): Record<string, number> {
    const storeQuantities: Record<string, number> = {};

    allocations.forEach((quantity, index) => {
      if (quantity > 0 && index < STORE_CODES.length) {
        storeQuantities[STORE_CODES[index]] = quantity;
      }
    });

    return storeQuantities;
  }

  /**
   * テンプレートを生成
   *
   * @param formData - 注文フォームデータ
   * @param buyerName - バイヤー名
   * @param customFilename - カスタムファイル名（オプション）
   * @returns テンプレート生成結果
   */
  static async generateTemplate(
    formData: OrderFormData,
    buyerName: string,
    customFilename?: string
  ): Promise<TemplateResponse> {
    const requestData = this.convertToApiRequest(formData, buyerName);

    // デバッグログ: カスタムファイル名の確認
    console.log('🔍 Template generation debug:');
    console.log('  - customFilename parameter:', customFilename);
    console.log('  - formData.deliveryDate:', formData.deliveryDate);

    if (customFilename) {
      requestData.output_filename = customFilename;
      console.log('  - output_filename set to:', requestData.output_filename);
    } else {
      console.log('  - ⚠️ customFilename is empty, output_filename not set');
    }

    console.log('  - Full request data:', JSON.stringify(requestData, null, 2));

    const response = await apiClient.post<TemplateResponse>(
      API_ENDPOINTS.GENERATE_TEMPLATE,
      requestData
    );

    return response.data;
  }

  /**
   * ファイルをダウンロード
   *
   * @param filename - ダウンロードするファイル名
   * @param ext - ファイル拡張子 ("xlsx" または "pdf")
   * @returns ダウンロードURL
   */
  static getDownloadUrl(filename: string, ext: string = 'xlsx'): string {
    return `${API_BASE_URL}${API_ENDPOINTS.DOWNLOAD}/${filename}?ext=${ext}`;
  }

  /**
   * PDFファイルのプレビューURL取得
   *
   * @param fileId - ファイルID
   * @returns PDFプレビューURL
   */
  static getPdfPreviewUrl(fileId: string): string {
    return this.getDownloadUrl(fileId, 'pdf');
  }

  /**
   * ファイルをダウンロード（ブラウザ）
   *
   * @param filename - ダウンロードするファイル名
   * @param ext - ファイル拡張子
   */
  static downloadFile(filename: string, ext: string = 'xlsx'): void {
    const url = this.getDownloadUrl(filename, ext);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }
}
