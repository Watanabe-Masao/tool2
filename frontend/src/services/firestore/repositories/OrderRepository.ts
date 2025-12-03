import type { Firestore } from 'firebase/firestore';
import {
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { FirestoreBaseService } from '../base/FirestoreBaseService';
import type { PaginatedResult, QueryOptions } from '../base/FirestoreBaseService';
import type { OrderData } from '@/types';
import { FIRESTORE_COLLECTIONS } from '@/utils/constants';

/**
 * Firestore保存形式の注文データ
 */
interface FirestoreOrder {
  delivery_date: string;
  suppliers: string[];
  products: Array<{
    supplier: string;
    name: string;
    origin: string;
    specification?: string;
    quantity_per_package: number | null;
    unit?: string;
    store_cost: number | null;
    price_excluding_tax: number | null;
    total_delivery: number | null;
    store_allocations: number[];
  }>;
  buyer_name: string;
  timestamp: Timestamp;
  userId: string;
}

/**
 * 注文データRepository
 *
 * 注文データのFirestore操作を担当
 *
 * @example
 * ```typescript
 * const orderRepo = new OrderRepository(firestore);
 *
 * // 注文を保存
 * const orderId = await orderRepo.save(orderData);
 *
 * // 注文を取得
 * const order = await orderRepo.findById(orderId);
 *
 * // ユーザーの注文一覧を取得（ページネーション）
 * const result = await orderRepo.findByUserIdPaginated(userId, { limit: 20 });
 * ```
 */
export class OrderRepository extends FirestoreBaseService<OrderData, FirestoreOrder> {
  constructor(db: Firestore) {
    super(FIRESTORE_COLLECTIONS.ORDERS, db);
  }

  /**
   * OrderData → Firestore形式に変換
   */
  toFirestoreFormat(order: OrderData): FirestoreOrder {
    return {
      delivery_date: format(order.deliveryDate, 'yyyy-MM-dd'),
      suppliers: order.suppliers,
      products: order.products.map((product) => ({
        supplier: product.supplier,
        name: product.name,
        origin: product.origin,
        specification: product.specification || '',
        quantity_per_package: product.quantityPerPackage,
        unit: product.unit || '',
        store_cost: product.storeCost,
        price_excluding_tax: product.priceExcludingTax,
        total_delivery: product.totalDelivery,
        store_allocations: product.storeAllocations,
      })),
      buyer_name: order.buyerName,
      timestamp: order.timestamp ? Timestamp.fromDate(order.timestamp) : Timestamp.now(),
      userId: order.userId,
    };
  }

  /**
   * Firestore形式 → OrderData に変換
   */
  fromFirestoreFormat(data: FirestoreOrder, id: string): OrderData {
    return {
      id,
      deliveryDate: new Date(data.delivery_date),
      suppliers: data.suppliers || [],
      products: data.products.map((product) => {
        // V1形式のunitをV2形式（specification + unit分離）に変換
        const { specification, unit } = this.migrateUnitToV2(
          product.specification || '',
          product.unit || ''
        );

        return {
          supplier: product.supplier || '',
          name: product.name,
          origin: product.origin,
          specification,
          quantityPerPackage: product.quantity_per_package,
          unit,
          storeCost: product.store_cost,
          priceExcludingTax: product.price_excluding_tax,
          totalDelivery: product.total_delivery,
          storeAllocations: product.store_allocations,
        };
      }),
      buyerName: data.buyer_name,
      timestamp: data.timestamp?.toDate() || new Date(),
      userId: data.userId,
    };
  }

  /**
   * V1形式のunit（"100gあたり"など）をV2形式に変換
   *
   * @param specification - 規格（既にV2形式の場合）
   * @param unit - 単位
   * @returns V2形式の specification と unit
   *
   * @example
   * ```typescript
   * // V1形式データ（古いデータ）
   * migrateUnitToV2('', '100gあたり')
   * // → { specification: '100', unit: 'gあたり' }
   *
   * // V2形式データ（新しいデータ）
   * migrateUnitToV2('100', 'gあたり')
   * // → { specification: '100', unit: 'gあたり' }
   * ```
   */
  private migrateUnitToV2(specification: string, unit: string): { specification: string; unit: string } {
    // V2形式として既にspecificationが設定されている場合はそのまま返す
    if (specification) {
      return { specification, unit };
    }

    // V1形式のパターン: "100gあたり", "50kgあたり" など
    const v1Pattern = /^(\d+)(g|kg)あたり$/;
    const match = unit.match(v1Pattern);

    if (match) {
      // V1形式を検出 → V2形式に変換
      const value = match[1]; // "100"
      const baseUnit = match[2]; // "g" または "kg"
      return {
        specification: value,
        unit: `${baseUnit}あたり`, // "gあたり" または "kgあたり"
      };
    }

    // "gあたり", "kgあたり" のように数値なしの場合も処理
    const baseUnitPattern = /^(g|kg)あたり$/;
    if (baseUnitPattern.test(unit)) {
      return {
        specification: '', // 数値なし → 空文字列（1として扱われる）
        unit,
      };
    }

    // その他（個数ベースなど）はそのまま
    return { specification, unit };
  }

  /**
   * ユーザーIDで注文を検索
   *
   * @param userId - ユーザーID
   * @param limitCount - 取得件数制限（オプション）
   * @returns 注文データの配列
   */
  async findByUserId(userId: string, limitCount?: number): Promise<OrderData[]> {
    const ref = this.getCollectionRef();
    let q = query(
      ref,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    return this.executeQuery(q);
  }

  /**
   * ユーザーIDで注文を検索（ページネーション対応）
   *
   * @param userId - ユーザーID
   * @param options - クエリオプション
   * @returns ページネーション結果
   *
   * @example
   * ```typescript
   * // 1ページ目（20件）
   * const page1 = await orderRepo.findByUserIdPaginated(userId, { limit: 20 });
   *
   * // 2ページ目（前回の lastDoc を指定）
   * const page2 = await orderRepo.findByUserIdPaginated(userId, {
   *   limit: 20,
   *   startAfter: page1.lastDoc,
   * });
   * ```
   */
  async findByUserIdPaginated(
    userId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<OrderData>> {
    const {
      limit: limitCount = 20,
      startAfter: startAfterDoc,
      orderBy: orderByField = 'timestamp',
      direction = 'desc',
    } = options;

    const ref = this.getCollectionRef();

    // +1件取得して次ページの有無を判定
    let q = query(
      ref,
      where('userId', '==', userId),
      orderBy(orderByField, direction),
      limit(limitCount + 1)
    );

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const snapshot = await getDocs(q);
    const orders: OrderData[] = [];
    const docs = snapshot.docs;

    // limitCount件のみ変換
    for (let i = 0; i < Math.min(docs.length, limitCount); i++) {
      const doc = docs[i];
      try {
        const order = this.fromFirestoreFormat(doc.data() as FirestoreOrder, doc.id);
        orders.push(order);
      } catch (error) {
        console.error(`Error converting document ${doc.id}:`, error);
      }
    }

    return {
      items: orders,
      hasMore: docs.length > limitCount,
      lastDoc: docs.length > 0 ? docs[Math.min(docs.length - 1, limitCount - 1)] : undefined,
    };
  }

  /**
   * 特定の日付の注文を検索
   *
   * @param userId - ユーザーID
   * @param deliveryDate - 店着日（YYYY-MM-DD）
   * @returns 注文データの配列
   */
  async findByDate(userId: string, deliveryDate: string): Promise<OrderData[]> {
    const ref = this.getCollectionRef();
    const q = query(
      ref,
      where('userId', '==', userId),
      where('delivery_date', '==', deliveryDate),
      orderBy('timestamp', 'desc')
    );

    return this.executeQuery(q);
  }

  /**
   * 日付範囲で注文を検索
   *
   * @param userId - ユーザーID
   * @param startDate - 開始日（YYYY-MM-DD）
   * @param endDate - 終了日（YYYY-MM-DD）
   * @returns 注文データの配列
   */
  async findByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<OrderData[]> {
    const ref = this.getCollectionRef();
    const q = query(
      ref,
      where('userId', '==', userId),
      where('delivery_date', '>=', startDate),
      where('delivery_date', '<=', endDate),
      orderBy('delivery_date', 'desc'),
      orderBy('timestamp', 'desc')
    );

    return this.executeQuery(q);
  }

  /**
   * 注文を保存（カスタムメソッド）
   *
   * userIdを明示的に設定するためのヘルパーメソッド
   *
   * @param orderData - 注文データ
   * @param userId - ユーザーID
   * @returns 生成されたドキュメントID
   */
  async saveOrder(orderData: OrderData, userId: string): Promise<string> {
    return this.save({
      ...orderData,
      userId,
      timestamp: new Date(),
    });
  }

  /**
   * 注文を更新（カスタムメソッド）
   *
   * @param orderId - 注文ID
   * @param orderData - 更新する注文データ
   * @param userId - ユーザーID
   */
  async updateOrder(orderId: string, orderData: OrderData, userId: string): Promise<void> {
    return this.update(orderId, {
      ...orderData,
      userId,
    });
  }
}
