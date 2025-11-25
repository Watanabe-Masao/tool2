import {
  Firestore,

  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { FirestoreBaseService } from '../base/FirestoreBaseService';
import type { ProductHistory, DeleteProductHistoryConditions } from '@/types/repository';

/**
 * Firestore保存形式
 */
interface FirestoreProductHistory {
  userId: string;
  supplier: string;
  categoryCode?: string;
  name: string;
  origin: string;
  specification: string;
  quantityPerPackage: number | null;
  unit: string;
  usageCount: number;
  pinned: boolean;
  pinOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 商品履歴Repository
 *
 * 商品履歴データのFirestore操作を担当
 *
 * @example
 * ```typescript
 * const productHistoryRepo = new ProductHistoryRepository(firestore);
 *
 * // 商品履歴を保存（既存の場合は使用回数をインクリメント）
 * const historyId = await productHistoryRepo.saveOrUpdate(productHistory);
 *
 * // 帳合先でフィルタして取得
 * const history = await productHistoryRepo.findBySupplier(userId, supplier);
 *
 * // ピン留めアイテムを取得
 * const pinned = await productHistoryRepo.findPinnedBySupplier(userId, supplier);
 * ```
 */
export class ProductHistoryRepository extends FirestoreBaseService<
  ProductHistory,
  FirestoreProductHistory
> {
  constructor(db: Firestore) {
    super('product_history', db);
  }

  /**
   * ProductHistory → Firestore形式に変換
   */
  toFirestoreFormat(history: ProductHistory): FirestoreProductHistory {
    return {
      userId: history.userId,
      supplier: history.supplier,
      categoryCode: history.categoryCode,
      name: history.name,
      origin: history.origin,
      specification: history.specification,
      quantityPerPackage: history.quantityPerPackage,
      unit: history.unit,
      usageCount: history.usageCount || 1,
      pinned: history.pinned || false,
      pinOrder: history.pinOrder ?? 9999,
      createdAt: history.createdAt ? Timestamp.fromDate(history.createdAt) : Timestamp.now(),
      updatedAt: history.updatedAt ? Timestamp.fromDate(history.updatedAt) : Timestamp.now(),
    };
  }

  /**
   * Firestore形式 → ProductHistory に変換
   */
  fromFirestoreFormat(data: FirestoreProductHistory, id: string): ProductHistory {
    return {
      id,
      userId: data.userId,
      supplier: data.supplier,
      categoryCode: data.categoryCode,
      name: data.name,
      origin: data.origin,
      specification: data.specification,
      quantityPerPackage: data.quantityPerPackage ?? null,
      unit: data.unit || '',
      usageCount: data.usageCount || 1,
      pinned: data.pinned || false,
      pinOrder: data.pinOrder ?? 9999,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }

  /**
   * 商品履歴を保存または更新
   *
   * 同じ商品（userId, supplier, name, origin, specification, quantityPerPackage, unit）が
   * 既に存在する場合は、使用回数をインクリメントして更新日時を更新する。
   * 存在しない場合は新規作成する。
   *
   * @param history - 商品履歴
   * @returns 履歴ID
   */
  async saveOrUpdate(history: ProductHistory): Promise<string> {
    const ref = this.getCollectionRef();

    // 既存の同一レコードをチェック
    const q = query(
      ref,
      where('userId', '==', history.userId),
      where('supplier', '==', history.supplier),
      where('name', '==', history.name),
      where('origin', '==', history.origin),
      where('specification', '==', history.specification),
      where('quantityPerPackage', '==', history.quantityPerPackage),
      where('unit', '==', history.unit)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // 既存のレコードがあれば更新
      const docRef = snapshot.docs[0].ref;

      await updateDoc(docRef, {
        updatedAt: Timestamp.now(),
        usageCount: increment(1),
        // categoryCodeがあれば更新
        ...(history.categoryCode && { categoryCode: history.categoryCode }),
      });

      console.log(`[${this.collectionName}] Updated existing history: ${history.name}`);
      return snapshot.docs[0].id;
    }

    // 新規作成
    const id = await this.save(history);
    console.log(`[${this.collectionName}] Created new history: ${history.name}`);
    return id;
  }

  /**
   * ユーザーIDで商品履歴を取得
   *
   * @param userId - ユーザーID
   * @returns 商品履歴配列（更新日時の降順）
   */
  async findByUserId(userId: string): Promise<ProductHistory[]> {
    const ref = this.getCollectionRef();
    const q = query(ref, where('userId', '==', userId), orderBy('updatedAt', 'desc'));

    return this.executeQuery(q);
  }

  /**
   * ユーザーIDと帳合先で商品履歴を取得
   *
   * @param userId - ユーザーID
   * @param supplier - 帳合先
   * @returns 商品履歴配列（更新日時の降順）
   */
  async findBySupplier(userId: string, supplier: string): Promise<ProductHistory[]> {
    const ref = this.getCollectionRef();
    const q = query(
      ref,
      where('userId', '==', userId),
      where('supplier', '==', supplier),
      orderBy('updatedAt', 'desc')
    );

    return this.executeQuery(q);
  }

  /**
   * ピン留めされた商品履歴を取得
   *
   * @param userId - ユーザーID
   * @param supplier - 帳合先
   * @returns ピン留めされた商品履歴配列（pinOrderの昇順）
   */
  async findPinnedBySupplier(userId: string, supplier: string): Promise<ProductHistory[]> {
    const ref = this.getCollectionRef();
    const q = query(
      ref,
      where('userId', '==', userId),
      where('supplier', '==', supplier),
      where('pinned', '==', true),
      orderBy('pinOrder', 'asc')
    );

    return this.executeQuery(q);
  }

  /**
   * 条件に一致する商品履歴を削除
   *
   * @param userId - ユーザーID
   * @param conditions - 削除条件
   * @returns 削除されたドキュメント数
   */
  async deleteByConditions(
    userId: string,
    conditions: DeleteProductHistoryConditions
  ): Promise<number> {
    const ref = this.getCollectionRef();

    // ベースクエリ
    let q = query(
      ref,
      where('userId', '==', userId),
      where('supplier', '==', conditions.supplier)
    );

    // 条件を動的に追加
    if (conditions.name !== undefined) {
      q = query(q, where('name', '==', conditions.name));
    }
    if (conditions.origin !== undefined) {
      q = query(q, where('origin', '==', conditions.origin));
    }
    if (conditions.specification !== undefined) {
      q = query(q, where('specification', '==', conditions.specification));
    }
    if (conditions.quantityPerPackage !== undefined) {
      q = query(q, where('quantityPerPackage', '==', conditions.quantityPerPackage));
    }
    if (conditions.unit !== undefined) {
      q = query(q, where('unit', '==', conditions.unit));
    }

    const snapshot = await getDocs(q);

    // 一致するドキュメントをすべて削除
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log(`[${this.collectionName}] Deleted ${snapshot.docs.length} documents by conditions`);
    return snapshot.docs.length;
  }

  /**
   * ピン留め状態をトグル
   *
   * @param historyId - 履歴ID
   * @param pinned - ピン留め状態
   * @param userId - ユーザーID（ピン留め順序計算用）
   * @param supplier - 帳合先（ピン留め順序計算用）
   */
  async togglePinned(
    historyId: string,
    pinned: boolean,
    userId?: string,
    supplier?: string
  ): Promise<void> {
    const docRef = this.getDocRef(historyId);

    const updateData: any = {
      pinned,
      updatedAt: Timestamp.now(),
    };

    // ピン留めを有効にする場合、現在のピン留めアイテムの最大pinOrderを取得して+1
    if (pinned && userId && supplier) {
      const maxPinOrder = await this.getMaxPinOrder(userId, supplier);
      updateData.pinOrder = maxPinOrder + 1;
    } else if (!pinned) {
      // ピン留め解除時はpinOrderをデフォルト値に
      updateData.pinOrder = 9999;
    }

    await updateDoc(docRef, updateData);

    console.log(`[${this.collectionName}] Toggled pinned status for ${historyId}: ${pinned}`);
  }

  /**
   * ピン留めアイテムの順序を更新
   *
   * @param reorderedItems - 並び替え後のアイテム配列（IDとpinOrderのペア）
   */
  async reorderPinned(reorderedItems: Array<{ id: string; pinOrder: number }>): Promise<void> {
    // バッチで複数のドキュメントを更新
    const updates = reorderedItems.map(async (item) => {
      const docRef = this.getDocRef(item.id);
      await updateDoc(docRef, {
        pinOrder: item.pinOrder,
        updatedAt: Timestamp.now(),
      });
    });

    await Promise.all(updates);

    console.log(`[${this.collectionName}] Reordered ${reorderedItems.length} pinned items`);
  }

  /**
   * 現在のピン留めアイテムの最大pinOrderを取得
   *
   * @param userId - ユーザーID
   * @param supplier - 帳合先
   * @returns 最大pinOrder（ピン留めアイテムがない場合は0）
   */
  private async getMaxPinOrder(userId: string, supplier: string): Promise<number> {
    const ref = this.getCollectionRef();
    const q = query(
      ref,
      where('userId', '==', userId),
      where('supplier', '==', supplier),
      where('pinned', '==', true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return 0;
    }

    const maxOrder = snapshot.docs.reduce((max, doc) => {
      const order = doc.data().pinOrder ?? 0;
      return Math.max(max, order);
    }, 0);

    return maxOrder;
  }
}
