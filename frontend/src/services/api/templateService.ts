import { apiClient } from './client';
import { API_ENDPOINTS, STORE_CODES } from '@/utils/constants';
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
    return {
      delivery_date: format(formData.deliveryDate, 'yyyy-MM-dd'),
      supplier: formData.supplier,
      buyer_name: buyerName,
      products: formData.products.map((product) => ({
        name: product.name,
        origin: product.origin,
        standard: product.specification || '',
        quantity: product.quantityPerPackage,
        store_cost: product.storeCost,
        price: product.priceExcludingTax,
        total_delivery: formData.totalDelivery,
        delivery_dest: formData.supplier,
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

    if (customFilename) {
      requestData.custom_filename = customFilename;
    }

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
   * @returns ダウンロードURL
   */
  static getDownloadUrl(filename: string): string {
    return `${API_ENDPOINTS.DOWNLOAD}/${filename}`;
  }

  /**
   * ファイルをダウンロード（ブラウザ）
   *
   * @param filename - ダウンロードするファイル名
   */
  static downloadFile(filename: string): void {
    const url = this.getDownloadUrl(filename);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }
}
