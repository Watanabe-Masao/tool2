import type { Firestore } from 'firebase/firestore';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { format } from 'date-fns';
import type {
  AllocationBatch,
  AllocationDetail,
  SaveAllocationHistoryInput,
  AllocationHistoryView,
  AllocationDaySummary,
} from '@/types/allocationHistory';

/**
 * Firestore保存形式の配分バッチ
 */
interface FirestoreAllocationBatch {
  userId: string;
  delivery_date: string;
  center_delivery_date?: string;
  suppliers: string[];
  product_count: number;
  total_quantity: number;
  buyer_name: string;
  book_name: string;
  sheet_name: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Firestore保存形式の配分明細
 */
interface FirestoreAllocationDetail {
  batch_id: string;
  userId: string;
  product_name: string;
  origin: string;
  specification: string;
  supplier: string;
  category_code?: string;
  quantity_per_package: number | null;
  unit: string;
  center_cost: number;
  center_fee_rate: number;
  store_cost: number;
  price_excluding_tax: number;
  total_delivery: number;
  store_allocations: number[];
  allocation_method: string;
  has_manual_adjustment: boolean;
  created_at: Timestamp;
}

/**
 * 配分履歴Repository
 *
 * 配分履歴の保存・取得を担当
 */
export class AllocationHistoryRepository {
  private db: Firestore;
  private batchesCollection = 'allocation_batches';
  private detailsCollection = 'allocation_details';

  constructor(db: Firestore) {
    this.db = db;
  }

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
    const batch = writeBatch(this.db);

    // 1. バッチドキュメントを作成
    const batchRef = doc(collection(this.db, this.batchesCollection));
    const totalQuantity = input.products.reduce(
      (sum, p) => sum + p.totalDelivery,
      0
    );

    const batchData: FirestoreAllocationBatch = {
      userId,
      delivery_date: format(input.deliveryDate, 'yyyy-MM-dd'),
      center_delivery_date: input.centerDeliveryDate
        ? format(input.centerDeliveryDate, 'yyyy-MM-dd')
        : undefined,
      suppliers: input.suppliers,
      product_count: input.products.length,
      total_quantity: totalQuantity,
      buyer_name: input.buyerName,
      book_name: input.bookName,
      sheet_name: input.sheetName || '配分書',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    };

    batch.set(batchRef, batchData);

    // 2. 各商品の明細ドキュメントを作成
    for (const product of input.products) {
      const detailRef = doc(collection(this.db, this.detailsCollection));
      const detailData: FirestoreAllocationDetail = {
        batch_id: batchRef.id,
        userId,
        product_name: product.name,
        origin: product.origin,
        specification: product.specification,
        supplier: product.supplier,
        category_code: product.categoryCode,
        quantity_per_package: product.quantityPerPackage,
        unit: product.unit,
        center_cost: product.centerCost,
        center_fee_rate: product.centerFeeRate,
        store_cost: product.storeCost,
        price_excluding_tax: product.priceExcludingTax,
        total_delivery: product.totalDelivery,
        store_allocations: product.storeAllocations,
        allocation_method: product.allocationMethod || 'manual',
        has_manual_adjustment: product.hasManualAdjustment ?? true,
        created_at: Timestamp.now(),
      };

      batch.set(detailRef, detailData);
    }

    // 3. バッチコミット
    await batch.commit();

    return batchRef.id;
  }

  /**
   * 日付範囲で配分バッチを取得
   *
   * @param userId - ユーザーID
   * @param startDate - 開始日（YYYY-MM-DD）
   * @param endDate - 終了日（YYYY-MM-DD）
   * @returns 配分バッチの配列
   */
  async findBatchesByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<AllocationBatch[]> {
    const ref = collection(this.db, this.batchesCollection);
    const q = query(
      ref,
      where('userId', '==', userId),
      where('delivery_date', '>=', startDate),
      where('delivery_date', '<=', endDate),
      orderBy('delivery_date', 'desc'),
      orderBy('created_at', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreAllocationBatch;
      return {
        id: doc.id,
        userId: data.userId,
        deliveryDate: data.delivery_date,
        centerDeliveryDate: data.center_delivery_date,
        suppliers: data.suppliers,
        productCount: data.product_count,
        totalQuantity: data.total_quantity,
        buyerName: data.buyer_name,
        bookName: data.book_name,
        sheetName: data.sheet_name,
        createdAt: data.created_at?.toDate(),
        updatedAt: data.updated_at?.toDate(),
      };
    });
  }

  /**
   * 特定日の配分バッチを取得
   *
   * @param userId - ユーザーID
   * @param deliveryDate - 納品日（YYYY-MM-DD）
   * @returns 配分バッチの配列
   */
  async findBatchesByDate(
    userId: string,
    deliveryDate: string
  ): Promise<AllocationBatch[]> {
    const ref = collection(this.db, this.batchesCollection);
    const q = query(
      ref,
      where('userId', '==', userId),
      where('delivery_date', '==', deliveryDate),
      orderBy('created_at', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreAllocationBatch;
      return {
        id: doc.id,
        userId: data.userId,
        deliveryDate: data.delivery_date,
        centerDeliveryDate: data.center_delivery_date,
        suppliers: data.suppliers,
        productCount: data.product_count,
        totalQuantity: data.total_quantity,
        buyerName: data.buyer_name,
        bookName: data.book_name,
        sheetName: data.sheet_name,
        createdAt: data.created_at?.toDate(),
        updatedAt: data.updated_at?.toDate(),
      };
    });
  }

  /**
   * バッチIDで配分明細を取得
   *
   * @param userId - ユーザーID
   * @param batchId - バッチID
   * @returns 配分明細の配列
   */
  async findDetailsByBatchId(userId: string, batchId: string): Promise<AllocationDetail[]> {
    const ref = collection(this.db, this.detailsCollection);
    const q = query(
      ref,
      where('batch_id', '==', batchId),
      where('userId', '==', userId),
      orderBy('created_at', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreAllocationDetail;
      return {
        id: doc.id,
        batchId: data.batch_id,
        userId: data.userId,
        productName: data.product_name,
        origin: data.origin,
        specification: data.specification,
        supplier: data.supplier,
        categoryCode: data.category_code,
        quantityPerPackage: data.quantity_per_package,
        unit: data.unit,
        centerCost: data.center_cost,
        centerFeeRate: data.center_fee_rate,
        storeCost: data.store_cost,
        priceExcludingTax: data.price_excluding_tax,
        totalDelivery: data.total_delivery,
        storeAllocations: data.store_allocations,
        allocationMethod: data.allocation_method as AllocationDetail['allocationMethod'],
        hasManualAdjustment: data.has_manual_adjustment,
        createdAt: data.created_at?.toDate(),
      };
    });
  }

  /**
   * バッチと明細を一括取得
   *
   * @param userId - ユーザーID
   * @param batchId - バッチID
   * @returns 配分履歴ビュー
   */
  async getHistoryView(
    userId: string,
    batchId: string
  ): Promise<AllocationHistoryView | null> {
    // バッチを取得
    const batchRef = collection(this.db, this.batchesCollection);
    const batchQuery = query(
      batchRef,
      where('userId', '==', userId)
    );
    const batchSnapshot = await getDocs(batchQuery);
    const batchDoc = batchSnapshot.docs.find((doc) => doc.id === batchId);

    if (!batchDoc) {
      return null;
    }

    const batchData = batchDoc.data() as FirestoreAllocationBatch;
    const batch: AllocationBatch = {
      id: batchDoc.id,
      userId: batchData.userId,
      deliveryDate: batchData.delivery_date,
      centerDeliveryDate: batchData.center_delivery_date,
      suppliers: batchData.suppliers,
      productCount: batchData.product_count,
      totalQuantity: batchData.total_quantity,
      buyerName: batchData.buyer_name,
      bookName: batchData.book_name,
      sheetName: batchData.sheet_name,
      createdAt: batchData.created_at?.toDate(),
      updatedAt: batchData.updated_at?.toDate(),
    };

    // 明細を取得
    const details = await this.findDetailsByBatchId(userId, batchId);

    return { batch, details };
  }

  /**
   * 日付別の配分サマリーを取得（カレンダー用）
   *
   * @param userId - ユーザーID
   * @param startDate - 開始日（YYYY-MM-DD）
   * @param endDate - 終了日（YYYY-MM-DD）
   * @returns 日付別サマリーの配列
   */
  async getDaySummaries(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<AllocationDaySummary[]> {
    const batches = await this.findBatchesByDateRange(userId, startDate, endDate);

    // 日付ごとに集計
    const summaryMap = new Map<string, AllocationDaySummary>();

    for (const batch of batches) {
      const existing = summaryMap.get(batch.deliveryDate);
      if (existing) {
        existing.batchCount += 1;
        existing.totalProducts += batch.productCount;
        existing.totalQuantity += batch.totalQuantity;
      } else {
        summaryMap.set(batch.deliveryDate, {
          date: batch.deliveryDate,
          batchCount: 1,
          totalProducts: batch.productCount,
          totalQuantity: batch.totalQuantity,
        });
      }
    }

    return Array.from(summaryMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
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
    const ref = collection(this.db, this.detailsCollection);
    let q = query(
      ref,
      where('userId', '==', userId),
      where('product_name', '==', productName),
      orderBy('created_at', 'desc')
    );

    const snapshot = await getDocs(q);
    let details = snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreAllocationDetail;
      return {
        supplier: data.supplier,
        storeAllocations: data.store_allocations,
      };
    });

    // 帳合先でフィルタ
    if (supplier) {
      details = details.filter((d) => d.supplier === supplier);
    }

    // 件数制限
    return details.slice(0, limitCount).map((d) => d.storeAllocations);
  }

  /**
   * 配分バッチを削除
   *
   * バッチドキュメントとそれに関連するすべての詳細ドキュメントを削除します。
   *
   * @param userId - ユーザーID
   * @param batchId - バッチID
   * @returns 削除が成功したらtrue
   */
  async deleteBatch(userId: string, batchId: string): Promise<boolean> {
    try {
      const batch = writeBatch(this.db);

      // 1. 関連する詳細ドキュメントを取得（userIdでもフィルタ）
      const detailsRef = collection(this.db, this.detailsCollection);
      const detailsQuery = query(
        detailsRef,
        where('batch_id', '==', batchId),
        where('userId', '==', userId)
      );
      const detailsSnapshot = await getDocs(detailsQuery);

      // 2. すべての詳細ドキュメントを削除対象に追加
      detailsSnapshot.docs.forEach((detailDoc) => {
        batch.delete(detailDoc.ref);
      });

      // 3. バッチドキュメントを削除対象に追加
      const batchRef = doc(this.db, this.batchesCollection, batchId);
      batch.delete(batchRef);

      // 4. 一括削除を実行
      await batch.commit();

      return true;
    } catch (error) {
      console.error('Failed to delete batch:', error);
      throw error; // エラーを上位に伝播
    }
  }
}
