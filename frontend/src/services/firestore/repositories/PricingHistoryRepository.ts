import {
  Firestore,

  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { FirestoreBaseService } from '../base/FirestoreBaseService';
import type { PricingHistory } from '@/types/repository';

/**
 * Firestore保存形式
 */
interface FirestorePricingHistory {
  userId: string;
  productName: string;
  specification: string;
  quantityPerPackage: number;
  specificationUnit: string;
  packageUnit: string;
  // 後方互換性のため、古いフィールド名も許可
  unit?: string;
  centerCost: number;
  storeCost: number;
  priceExcludingTax: number;
  centerFeeRate: number;
  usageCount: number;
  createdAt: Timestamp;
  lastUsedAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 価格履歴Repository
 *
 * 価格履歴データのFirestore操作を担当
 *
 * @example
 * ```typescript
 * const pricingHistoryRepo = new PricingHistoryRepository(firestore);
 *
 * // 価格履歴を保存（既存の場合は更新）
 * await pricingHistoryRepo.saveOrUpdate({
 *   userId: 'user-123',
 *   productName: '商品1',
 *   specification: '規格A',
 *   quantityPerPackage: 10,
 *   specificationUnit: '個',
 *   centerCost: 90,
 *   storeCost: 100,
 *   priceExcludingTax: 150,
 *   centerFeeRate: 13,
 * });
 *
 * // ユーザーの価格履歴を取得
 * const histories = await pricingHistoryRepo.findByUserId(userId);
 * ```
 */
export class PricingHistoryRepository extends FirestoreBaseService<
  PricingHistory,
  FirestorePricingHistory
> {
  constructor(db: Firestore) {
    super('pricing_history', db);
  }

  /**
   * PricingHistory → Firestore形式に変換
   */
  toFirestoreFormat(history: PricingHistory): FirestorePricingHistory {
    return {
      userId: history.userId,
      productName: history.productName,
      specification: history.specification,
      quantityPerPackage: history.quantityPerPackage,
      specificationUnit: history.specificationUnit,
      packageUnit: history.packageUnit || '',
      centerCost: history.centerCost,
      storeCost: history.storeCost,
      priceExcludingTax: history.priceExcludingTax,
      centerFeeRate: history.centerFeeRate ?? 13, // デフォルト13%
      usageCount: history.usageCount || 1,
      createdAt: history.createdAt ? Timestamp.fromDate(history.createdAt) : Timestamp.now(),
      lastUsedAt: history.lastUsedAt ? Timestamp.fromDate(history.lastUsedAt) : Timestamp.now(),
      updatedAt: history.updatedAt ? Timestamp.fromDate(history.updatedAt) : Timestamp.now(),
    };
  }

  /**
   * Firestore形式 → PricingHistory に変換
   */
  fromFirestoreFormat(data: FirestorePricingHistory, id: string): PricingHistory {
    return {
      id,
      userId: data.userId,
      productName: data.productName,
      specification: data.specification,
      quantityPerPackage: data.quantityPerPackage,
      // 後方互換性: 古いunitフィールドは入数の単位（packageUnit）だった
      specificationUnit: data.specificationUnit || '',
      packageUnit: data.packageUnit || data.unit || '',
      centerCost: data.centerCost,
      storeCost: data.storeCost,
      priceExcludingTax: data.priceExcludingTax,
      centerFeeRate: data.centerFeeRate ?? 13,
      usageCount: data.usageCount || 1,
      createdAt: data.createdAt?.toDate(),
      lastUsedAt: data.lastUsedAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }

  /**
   * ユーザーIDで価格履歴を取得
   *
   * @param userId - ユーザーID
   * @returns 価格履歴配列（最終使用日時の降順）
   */
  async findByUserId(userId: string): Promise<PricingHistory[]> {
    const ref = this.getCollectionRef();
    const q = query(ref, where('userId', '==', userId), orderBy('lastUsedAt', 'desc'));

    return this.executeQuery(q);
  }

  /**
   * 商品名で価格履歴を検索
   *
   * @param userId - ユーザーID
   * @param productName - 商品名
   * @returns 価格履歴配列
   */
  async findByProductName(userId: string, productName: string): Promise<PricingHistory[]> {
    const ref = this.getCollectionRef();
    const q = query(
      ref,
      where('userId', '==', userId),
      where('productName', '==', productName),
      orderBy('lastUsedAt', 'desc')
    );

    return this.executeQuery(q);
  }

  /**
   * 価格履歴を保存または更新
   *
   * 同じキー（userId, productName, specification, quantityPerPackage）の履歴が存在する場合:
   * - 価格情報が同じ → スキップ（無駄な更新を避ける）
   * - 価格情報が異なる → 更新（usageCountをインクリメント）
   *
   * 存在しない場合は新規作成
   *
   * @param history - 価格履歴
   * @returns 履歴ID（スキップされた場合は既存ID）
   */
  async saveOrUpdate(history: PricingHistory): Promise<string> {
    const ref = this.getCollectionRef();

    // 同じキーの履歴が存在するかチェック
    const q = query(
      ref,
      where('userId', '==', history.userId),
      where('productName', '==', history.productName),
      where('specification', '==', history.specification),
      where('quantityPerPackage', '==', history.quantityPerPackage),
      where('packageUnit', '==', history.packageUnit || '')
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // 既存の履歴が存在する場合
      const existingDoc = snapshot.docs[0];
      const existingData = existingDoc.data() as FirestorePricingHistory;

      const normalizedCenterFeeRate = history.centerFeeRate ?? 13;

      // 全ての価格情報が同じ場合はスキップ
      if (
        existingData.centerCost === history.centerCost &&
        existingData.storeCost === history.storeCost &&
        existingData.priceExcludingTax === history.priceExcludingTax &&
        existingData.centerFeeRate === normalizedCenterFeeRate &&
        existingData.specificationUnit === history.specificationUnit &&
        existingData.packageUnit === (history.packageUnit || '')
      ) {
        console.log(
          `[${this.collectionName}] Unchanged, skipping update: ${history.productName} (${history.specification})`
        );
        return existingDoc.id;
      }

      // 値が変更されている場合のみ更新
      await updateDoc(existingDoc.ref, {
        centerCost: history.centerCost,
        storeCost: history.storeCost,
        priceExcludingTax: history.priceExcludingTax,
        centerFeeRate: normalizedCenterFeeRate,
        specificationUnit: history.specificationUnit,
        packageUnit: history.packageUnit || '',
        usageCount: increment(1),
        lastUsedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(
        `[${this.collectionName}] Updated: ${history.productName} (${history.specification})`
      );
      return existingDoc.id;
    }

    // 新規作成
    const id = await this.save({
      ...history,
      centerFeeRate: history.centerFeeRate ?? 13,
      usageCount: 1,
    });

    console.log(
      `[${this.collectionName}] Created: ${history.productName} (${history.specification})`
    );
    return id;
  }
}
