import type { Firestore, Unsubscribe } from 'firebase/firestore';
import { OrderRepository } from './repositories/OrderRepository';
import { ProductHistoryRepository } from './repositories/ProductHistoryRepository';
import { PricingHistoryRepository } from './repositories/PricingHistoryRepository';
import { AutocompleteRepository, type AutocompleteField } from './repositories/AutocompleteRepository';
import { PresetRepository } from './repositories/PresetRepository';
import { EmailAddressRepository } from './repositories/EmailAddressRepository';
import { AllocationHistoryRepository } from './repositories/AllocationHistoryRepository';
import type { OrderData } from '@/types';
import type {
  AllocationBatch,
  AllocationDetail,
  SaveAllocationHistoryInput,
  AllocationHistoryView,
  AllocationDaySummary,
} from '@/types/allocationHistory';

/**
 * FirestoreServiceFacade
 *
 * 既存のFirestoreService.tsとの互換性を保ちながら、
 * 内部的には新しいRepositoryパターンを使用するFacadeクラス。
 *
 * 段階的な移行を可能にし、既存コードを壊さずに
 * アーキテクチャの改善を実現する。
 *
 * @example
 * ```typescript
 * import { getFirebaseFirestore } from '@/services/firebase/config';
 * import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
 *
 * const db = getFirebaseFirestore();
 * const facade = new FirestoreServiceFacade(db);
 *
 * // 既存のコードと同じインターフェースで使用可能
 * const orderId = await facade.saveOrder(orderData, userId);
 * const orders = await facade.getUserOrders(userId);
 * ```
 */
export class FirestoreServiceFacade {
  private orderRepo: OrderRepository;
  private productHistoryRepo: ProductHistoryRepository;
  private pricingHistoryRepo: PricingHistoryRepository;
  private autocompleteRepo: AutocompleteRepository;
  private presetRepo: PresetRepository;
  private emailRepo: EmailAddressRepository;
  private allocationHistoryRepo: AllocationHistoryRepository;

  constructor(db: Firestore) {
    this.orderRepo = new OrderRepository(db);
    this.productHistoryRepo = new ProductHistoryRepository(db);
    this.pricingHistoryRepo = new PricingHistoryRepository(db);
    this.autocompleteRepo = new AutocompleteRepository(db);
    this.presetRepo = new PresetRepository(db);
    this.emailRepo = new EmailAddressRepository(db);
    this.allocationHistoryRepo = new AllocationHistoryRepository(db);
  }

  // ==========================================
  // 注文関連メソッド
  // ==========================================

  /**
   * 注文を保存
   */
  async saveOrder(orderData: OrderData, userId: string): Promise<string> {
    return this.orderRepo.saveOrder(orderData, userId);
  }

  /**
   * ユーザーの注文一覧を取得
   */
  async getUserOrders(userId: string, limitCount?: number): Promise<OrderData[]> {
    return this.orderRepo.findByUserId(userId, limitCount);
  }

  /**
   * 特定の日付の注文を取得
   */
  async getOrdersByDate(userId: string, deliveryDate: string): Promise<OrderData[]> {
    return this.orderRepo.findByDate(userId, deliveryDate);
  }

  /**
   * 注文を更新
   */
  async updateOrder(orderId: string, orderData: OrderData, userId: string): Promise<void> {
    return this.orderRepo.updateOrder(orderId, orderData, userId);
  }

  /**
   * 注文を削除
   */
  async deleteOrder(orderId: string): Promise<void> {
    return this.orderRepo.delete(orderId);
  }

  // ==========================================
  // オートコンプリート履歴関連メソッド
  // ==========================================

  /**
   * オートコンプリート用の履歴を保存
   */
  async saveAutocompleteHistory(
    userId: string,
    field: 'productName' | 'origin' | 'specification' | 'supplier',
    value: string
  ): Promise<void> {
    await this.autocompleteRepo.saveValue(userId, field as AutocompleteField, value);
  }

  /**
   * オートコンプリート履歴を取得
   */
  async getAutocompleteHistory(
    userId: string,
    field: 'productName' | 'origin' | 'specification' | 'supplier'
  ): Promise<string[]> {
    const history = await this.autocompleteRepo.findByField(userId, field as AutocompleteField);
    return history?.values || [];
  }

  // ==========================================
  // 帳合先プリセット関連メソッド
  // ==========================================

  /**
   * プリセットを保存
   */
  async saveSupplierPreset(userId: string, supplier: string, centerFeeRate?: number): Promise<string> {
    return this.presetRepo.save({
      userId,
      supplier,
      centerFeeRate,
    });
  }

  /**
   * プリセット一覧を取得
   */
  async getSupplierPresets(userId: string): Promise<
    Array<{
      id: string;
      supplier: string;
      centerFeeRate?: number;
      displayOrder?: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const presets = await this.presetRepo.findByUserId(userId);
    return presets.map((preset) => ({
      id: preset.id!,
      supplier: preset.supplier,
      centerFeeRate: preset.centerFeeRate,
      displayOrder: preset.displayOrder,
      createdAt: preset.createdAt!,
      updatedAt: preset.updatedAt!,
    }));
  }

  /**
   * 帳合先プリセット一覧をリアルタイムで監視
   */
  subscribeToSupplierPresets(
    userId: string,
    onSuccess: (presets: Array<{
      id: string;
      supplier: string;
      centerFeeRate?: number;
      displayOrder?: number;
      createdAt: Date;
      updatedAt: Date;
    }>) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    return this.presetRepo.subscribeToPresets(
      userId,
      (presets) => {
        onSuccess(
          presets.map((preset) => ({
            id: preset.id!,
            supplier: preset.supplier,
            centerFeeRate: preset.centerFeeRate,
            displayOrder: preset.displayOrder,
            createdAt: preset.createdAt!,
            updatedAt: preset.updatedAt!,
          }))
        );
      },
      onError
    );
  }

  /**
   * プリセットを削除
   */
  async deleteSupplierPreset(presetId: string): Promise<void> {
    return this.presetRepo.delete(presetId);
  }

  /**
   * プリセットを更新
   */
  async updateSupplierPreset(presetId: string, supplier: string, centerFeeRate?: number): Promise<void> {
    return this.presetRepo.updateSupplier(presetId, supplier, centerFeeRate);
  }

  /**
   * 帳合先プリセットの並び順を更新
   */
  async reorderSupplierPresets(
    reorderedItems: Array<{ id: string; displayOrder: number }>
  ): Promise<void> {
    return this.presetRepo.reorder(reorderedItems);
  }

  // ==========================================
  // メールアドレス帳関連メソッド
  // ==========================================

  /**
   * メールアドレス帳を保存
   */
  async saveEmailAddress(userId: string, name: string, email: string): Promise<string> {
    return this.emailRepo.save({
      userId,
      name,
      email,
    });
  }

  /**
   * メールアドレス帳一覧を取得
   */
  async getEmailAddresses(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      displayOrder?: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const addresses = await this.emailRepo.findByUserId(userId);
    return addresses.map((address) => ({
      id: address.id!,
      name: address.name,
      email: address.email,
      displayOrder: address.displayOrder,
      createdAt: address.createdAt!,
      updatedAt: address.updatedAt!,
    }));
  }

  /**
   * メールアドレス帳一覧をリアルタイムで監視
   */
  subscribeToEmailAddresses(
    userId: string,
    onSuccess: (addresses: Array<{
      id: string;
      name: string;
      email: string;
      displayOrder?: number;
      createdAt: Date;
      updatedAt: Date;
    }>) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    return this.emailRepo.subscribeToAddresses(
      userId,
      (addresses) => {
        onSuccess(
          addresses.map((address) => ({
            id: address.id!,
            name: address.name,
            email: address.email,
            displayOrder: address.displayOrder,
            createdAt: address.createdAt!,
            updatedAt: address.updatedAt!,
          }))
        );
      },
      onError
    );
  }

  /**
   * メールアドレス帳を削除
   */
  async deleteEmailAddress(addressId: string): Promise<void> {
    return this.emailRepo.delete(addressId);
  }

  /**
   * メールアドレス帳を更新
   */
  async updateEmailAddress(addressId: string, name: string, email: string): Promise<void> {
    return this.emailRepo.updateAddress(addressId, name, email);
  }

  /**
   * メールアドレス帳の並び順を更新
   */
  async reorderEmailAddresses(
    reorderedItems: Array<{ id: string; displayOrder: number }>
  ): Promise<void> {
    return this.emailRepo.reorder(reorderedItems);
  }

  // ==========================================
  // 商品履歴関連メソッド
  // ==========================================

  /**
   * 商品履歴を保存
   */
  async saveProductHistory(
    userId: string,
    supplier: string,
    name: string,
    origin: string,
    specification: string,
    quantityPerPackage: number | null,
    unit: string,
    packageUnit: string,
    categoryCode?: string
  ): Promise<string> {
    return this.productHistoryRepo.saveOrUpdate({
      userId,
      supplier,
      name,
      origin,
      specification,
      quantityPerPackage,
      unit,
      packageUnit,
      categoryCode,
      usageCount: 1,
      pinned: false,
      pinOrder: 9999,
    });
  }

  /**
   * 商品履歴を取得（帳合先でフィルタ）
   */
  async getProductHistory(
    userId: string,
    supplier?: string
  ): Promise<
    Array<{
      id: string;
      supplier: string;
      categoryCode?: string;
      name: string;
      origin: string;
      specification: string;
      quantityPerPackage: number | null;
      unit: string;
      packageUnit: string;
      usageCount: number;
      pinned?: boolean;
      pinOrder?: number;
    }>
  > {
    const histories = supplier
      ? await this.productHistoryRepo.findBySupplier(userId, supplier)
      : await this.productHistoryRepo.findByUserId(userId);

    return histories.map((history) => ({
      id: history.id!,
      supplier: history.supplier,
      categoryCode: history.categoryCode,
      name: history.name,
      origin: history.origin,
      specification: history.specification,
      quantityPerPackage: history.quantityPerPackage,
      unit: history.unit,
      packageUnit: history.packageUnit,
      usageCount: history.usageCount,
      pinned: history.pinned,
      pinOrder: history.pinOrder,
    }));
  }

  /**
   * 条件に一致する商品履歴を削除
   */
  async deleteProductHistoryByCondition(
    userId: string,
    conditions: {
      supplier: string;
      name?: string;
      origin?: string;
      specification?: string;
      quantityPerPackage?: number | null;
      unit?: string;
    }
  ): Promise<number> {
    return this.productHistoryRepo.deleteByConditions(userId, conditions);
  }

  /**
   * 商品履歴をIDで削除
   */
  async deleteProductHistoryById(historyId: string): Promise<void> {
    return this.productHistoryRepo.delete(historyId);
  }

  /**
   * 商品履歴のピン留めをトグル
   */
  async toggleProductHistoryPinned(
    historyId: string,
    pinned: boolean,
    userId?: string,
    supplier?: string
  ): Promise<void> {
    return this.productHistoryRepo.togglePinned(historyId, pinned, userId, supplier);
  }

  /**
   * ピン留めアイテムの順序を更新
   */
  async reorderPinnedPresets(
    reorderedItems: Array<{ id: string; pinOrder: number }>
  ): Promise<void> {
    return this.productHistoryRepo.reorderPinned(reorderedItems);
  }

  // ==========================================
  // 価格履歴関連メソッド
  // ==========================================

  /**
   * 価格履歴を取得
   */
  async getPricingHistory(userId: string): Promise<any[]> {
    const histories = await this.pricingHistoryRepo.findByUserId(userId);
    return histories.map((history) => ({
      id: history.id,
      userId: history.userId,
      productName: history.productName,
      specification: history.specification,
      quantityPerPackage: history.quantityPerPackage,
      unit: history.unit,
      packageUnit: history.packageUnit,
      centerCost: history.centerCost,
      storeCost: history.storeCost,
      priceExcludingTax: history.priceExcludingTax,
      centerFeeRate: history.centerFeeRate,
      usageCount: history.usageCount,
      createdAt: history.createdAt,
      lastUsedAt: history.lastUsedAt,
      updatedAt: history.updatedAt,
    }));
  }

  /**
   * 価格履歴を保存または更新
   */
  async savePricingHistory(
    userId: string,
    productName: string,
    specification: string,
    quantityPerPackage: number,
    unit: string,
    packageUnit: string,
    centerCost: number,
    storeCost: number,
    priceExcludingTax: number,
    centerFeeRate?: number
  ): Promise<void> {
    await this.pricingHistoryRepo.saveOrUpdate({
      userId,
      productName,
      specification,
      quantityPerPackage,
      unit,
      packageUnit,
      centerCost,
      storeCost,
      priceExcludingTax,
      centerFeeRate: centerFeeRate ?? 13,
      usageCount: 1,
    });
  }

  /**
   * 価格履歴を削除
   */
  async deletePricingHistory(historyId: string): Promise<void> {
    return this.pricingHistoryRepo.delete(historyId);
  }

  // ==========================================
  // 配分履歴関連メソッド
  // ==========================================

  /**
   * 配分履歴を保存
   *
   * @param userId - ユーザーID
   * @param input - 配分履歴データ
   * @returns 作成されたバッチID
   */
  async saveAllocationHistory(
    userId: string,
    input: SaveAllocationHistoryInput
  ): Promise<string> {
    return this.allocationHistoryRepo.saveAllocationHistory(userId, input);
  }

  /**
   * 日付範囲で配分バッチを取得
   *
   * @param userId - ユーザーID
   * @param startDate - 開始日（YYYY-MM-DD）
   * @param endDate - 終了日（YYYY-MM-DD）
   * @returns 配分バッチの配列
   */
  async getAllocationBatchesByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<AllocationBatch[]> {
    return this.allocationHistoryRepo.findBatchesByDateRange(userId, startDate, endDate);
  }

  /**
   * 特定日の配分バッチを取得
   *
   * @param userId - ユーザーID
   * @param deliveryDate - 納品日（YYYY-MM-DD）
   * @returns 配分バッチの配列
   */
  async getAllocationBatchesByDate(
    userId: string,
    deliveryDate: string
  ): Promise<AllocationBatch[]> {
    return this.allocationHistoryRepo.findBatchesByDate(userId, deliveryDate);
  }

  /**
   * バッチIDで配分明細を取得
   *
   * @param userId - ユーザーID
   * @param batchId - バッチID
   * @returns 配分明細の配列
   */
  async getAllocationDetails(userId: string, batchId: string): Promise<AllocationDetail[]> {
    return this.allocationHistoryRepo.findDetailsByBatchId(userId, batchId);
  }

  /**
   * 配分バッチを削除
   *
   * @param userId - ユーザーID
   * @param batchId - バッチID
   * @returns 削除が成功したらtrue
   */
  async deleteAllocationBatch(userId: string, batchId: string): Promise<boolean> {
    return this.allocationHistoryRepo.deleteBatch(userId, batchId);
  }

  /**
   * バッチと明細を一括取得
   *
   * @param userId - ユーザーID
   * @param batchId - バッチID
   * @returns 配分履歴ビュー
   */
  async getAllocationHistoryView(
    userId: string,
    batchId: string
  ): Promise<AllocationHistoryView | null> {
    return this.allocationHistoryRepo.getHistoryView(userId, batchId);
  }

  /**
   * 日付別の配分サマリーを取得（カレンダー用）
   *
   * @param userId - ユーザーID
   * @param startDate - 開始日（YYYY-MM-DD）
   * @param endDate - 終了日（YYYY-MM-DD）
   * @returns 日付別サマリーの配列
   */
  async getAllocationDaySummaries(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<AllocationDaySummary[]> {
    return this.allocationHistoryRepo.getDaySummaries(userId, startDate, endDate);
  }

  /**
   * 商品名と帳合先で過去の配分パターンを取得（学習用）
   *
   * @param userId - ユーザーID
   * @param productName - 商品名
   * @param supplier - 帳合先（オプション）
   * @param limitCount - 取得件数制限
   * @returns 過去の配分配列
   */
  async getPastAllocations(
    userId: string,
    productName: string,
    supplier?: string,
    limitCount: number = 10
  ): Promise<number[][]> {
    return this.allocationHistoryRepo.getPastAllocations(userId, productName, supplier, limitCount);
  }
}
