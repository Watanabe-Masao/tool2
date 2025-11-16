import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { FIRESTORE_COLLECTIONS } from '@/utils/constants';
import type { OrderData, FirestoreOrderData } from '@/types';
import { format } from 'date-fns';

/**
 * Firestoreサービス
 *
 * 注文データの保存・取得・更新・削除を管理します。
 */
export class FirestoreService {
  /**
   * 注文データをFirestore形式に変換
   */
  private static convertToFirestoreFormat(
    orderData: OrderData,
    userId: string
  ): FirestoreOrderData {
    return {
      delivery_date: format(orderData.deliveryDate, 'yyyy-MM-dd'),
      supplier: orderData.supplier,
      total_delivery: orderData.totalDelivery,
      products: orderData.products.map((product) => ({
        name: product.name,
        origin: product.origin,
        specification: product.specification || '',
        quantity_per_package: product.quantityPerPackage,
        unit: product.unit || '',
        store_cost: product.storeCost,
        price_excluding_tax: product.priceExcludingTax,
        store_allocations: product.storeAllocations,
      })),
      buyer_name: orderData.buyerName,
      timestamp: new Date(),
      userId: userId, // user_id → userId に変更
    };
  }

  /**
   * Firestore形式から注文データに変換
   */
  private static convertFromFirestoreFormat(
    firestoreData: any,
    id: string
  ): OrderData {
    return {
      id,
      deliveryDate: new Date(firestoreData.delivery_date),
      supplier: firestoreData.supplier,
      totalDelivery: firestoreData.total_delivery,
      products: firestoreData.products.map((product: any) => ({
        name: product.name,
        origin: product.origin,
        specification: product.specification || '',
        quantityPerPackage: product.quantity_per_package,
        unit: product.unit || '',
        storeCost: product.store_cost,
        priceExcludingTax: product.price_excluding_tax,
        storeAllocations: product.store_allocations,
      })),
      buyerName: firestoreData.buyer_name,
      timestamp: firestoreData.timestamp?.toDate() || new Date(),
      userId: firestoreData.userId, // user_id → userId に変更
    };
  }

  /**
   * 注文を保存
   *
   * @param orderData - 注文データ
   * @param userId - ユーザーID
   * @returns 保存されたドキュメントID
   */
  static async saveOrder(orderData: OrderData, userId: string): Promise<string> {
    const db = getFirebaseFirestore();
    const ordersRef = collection(db, FIRESTORE_COLLECTIONS.ORDERS);

    const firestoreData = this.convertToFirestoreFormat(orderData, userId);

    const docRef = await addDoc(ordersRef, {
      ...firestoreData,
      timestamp: Timestamp.now(),
    });

    console.log('[Firestore] Order saved:', docRef.id);
    return docRef.id;
  }

  /**
   * ユーザーの注文一覧を取得
   *
   * @param userId - ユーザーID
   * @param limit - 取得件数（オプション）
   * @returns 注文データの配列
   */
  static async getUserOrders(userId: string, limitCount?: number): Promise<OrderData[]> {
    const db = getFirebaseFirestore();
    const ordersRef = collection(db, FIRESTORE_COLLECTIONS.ORDERS);

    let q = query(
      ordersRef,
      where('userId', '==', userId), // user_id → userId に変更
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const orders: OrderData[] = [];

    snapshot.forEach((doc) => {
      try {
        const orderData = this.convertFromFirestoreFormat(doc.data(), doc.id);
        orders.push(orderData);
      } catch (error) {
        console.error('[Firestore] Error converting document:', doc.id, error);
      }
    });

    console.log(`[Firestore] Retrieved ${orders.length} orders for user ${userId}`);

    if (limitCount && orders.length > limitCount) {
      return orders.slice(0, limitCount);
    }

    return orders;
  }

  /**
   * 特定の日付の注文を取得
   *
   * @param userId - ユーザーID
   * @param deliveryDate - 店着日（YYYY-MM-DD）
   * @returns 注文データの配列
   */
  static async getOrdersByDate(userId: string, deliveryDate: string): Promise<OrderData[]> {
    const db = getFirebaseFirestore();
    const ordersRef = collection(db, FIRESTORE_COLLECTIONS.ORDERS);

    const q = query(
      ordersRef,
      where('userId', '==', userId), // user_id → userId に変更
      where('delivery_date', '==', deliveryDate),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const orders: OrderData[] = [];

    snapshot.forEach((doc) => {
      try {
        const orderData = this.convertFromFirestoreFormat(doc.data(), doc.id);
        orders.push(orderData);
      } catch (error) {
        console.error('[Firestore] Error converting document:', doc.id, error);
      }
    });

    console.log(`[Firestore] Retrieved ${orders.length} orders for date ${deliveryDate}`);
    return orders;
  }

  /**
   * 注文を更新
   *
   * @param orderId - 注文ID
   * @param orderData - 更新する注文データ
   * @param userId - ユーザーID
   */
  static async updateOrder(
    orderId: string,
    orderData: OrderData,
    userId: string
  ): Promise<void> {
    const db = getFirebaseFirestore();
    const orderRef = doc(db, FIRESTORE_COLLECTIONS.ORDERS, orderId);

    const firestoreData = this.convertToFirestoreFormat(orderData, userId);

    await updateDoc(orderRef, {
      ...firestoreData,
      updated_at: Timestamp.now(),
    });

    console.log('[Firestore] Order updated:', orderId);
  }

  /**
   * 注文を削除
   *
   * @param orderId - 注文ID
   */
  static async deleteOrder(orderId: string): Promise<void> {
    const db = getFirebaseFirestore();
    const orderRef = doc(db, FIRESTORE_COLLECTIONS.ORDERS, orderId);

    await deleteDoc(orderRef);

    console.log('[Firestore] Order deleted:', orderId);
  }

  /**
   * オートコンプリート用の履歴を保存
   *
   * @param userId - ユーザーID
   * @param field - フィールド名
   * @param value - 値
   */
  static async saveAutocompleteHistory(
    userId: string,
    field: 'productName' | 'origin' | 'specification' | 'supplier',
    value: string
  ): Promise<void> {
    if (!value || value.trim() === '') return;

    const db = getFirebaseFirestore();
    const historyRef = collection(db, FIRESTORE_COLLECTIONS.AUTOCOMPLETE_HISTORY);

    // 既存の履歴を取得
    const q = query(
      historyRef,
      where('userId', '==', userId),
      where('field', '==', field)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // 新規作成
      await addDoc(historyRef, {
        userId: userId,
        field,
        values: [value],
        last_updated: Timestamp.now(),
      });
    } else {
      // 既存のドキュメントを更新
      const docRef = snapshot.docs[0].ref;
      const existingValues = snapshot.docs[0].data().values || [];

      // 重複を除外して追加
      if (!existingValues.includes(value)) {
        const newValues = [value, ...existingValues].slice(0, 50); // 最大50件
        await updateDoc(docRef, {
          values: newValues,
          last_updated: Timestamp.now(),
        });
      }
    }

    console.log(`[Firestore] Autocomplete history saved: ${field} = ${value}`);
  }

  /**
   * オートコンプリート履歴を取得
   *
   * @param userId - ユーザーID
   * @param field - フィールド名
   * @returns 値の配列
   */
  static async getAutocompleteHistory(
    userId: string,
    field: 'productName' | 'origin' | 'specification' | 'supplier'
  ): Promise<string[]> {
    const db = getFirebaseFirestore();
    const historyRef = collection(db, FIRESTORE_COLLECTIONS.AUTOCOMPLETE_HISTORY);

    const q = query(
      historyRef,
      where('userId', '==', userId),
      where('field', '==', field)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    const values = snapshot.docs[0].data().values || [];
    console.log(`[Firestore] Retrieved ${values.length} autocomplete options for ${field}`);
    return values;
  }

  /**
   * プリセットを保存
   *
   * @param userId - ユーザーID
   * @param supplier - 帳合先の値
   * @returns プリセットID
   */
  static async saveSupplierPreset(userId: string, supplier: string): Promise<string> {
    const db = getFirebaseFirestore();
    const presetsRef = collection(db, FIRESTORE_COLLECTIONS.SUPPLIER_PRESETS);

    const docRef = await addDoc(presetsRef, {
      userId,
      supplier,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log(`[Firestore] Supplier preset saved: ${supplier}`);
    return docRef.id;
  }

  /**
   * プリセット一覧を取得
   *
   * @param userId - ユーザーID
   * @returns プリセット配列
   */
  static async getSupplierPresets(userId: string): Promise<
    Array<{
      id: string;
      supplier: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const db = getFirebaseFirestore();
    const presetsRef = collection(db, FIRESTORE_COLLECTIONS.SUPPLIER_PRESETS);

    const q = query(presetsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);

    const presets = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        supplier: data.supplier,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });

    console.log(`[Firestore] Retrieved ${presets.length} supplier presets`);
    return presets;
  }

  /**
   * プリセットを削除
   *
   * @param presetId - プリセットID
   */
  static async deleteSupplierPreset(presetId: string): Promise<void> {
    const db = getFirebaseFirestore();
    const presetRef = doc(db, FIRESTORE_COLLECTIONS.SUPPLIER_PRESETS, presetId);

    await deleteDoc(presetRef);

    console.log(`[Firestore] Supplier preset deleted: ${presetId}`);
  }

  /**
   * プリセットを更新
   *
   * @param presetId - プリセットID
   * @param supplier - 帳合先の値
   */
  static async updateSupplierPreset(presetId: string, supplier: string): Promise<void> {
    const db = getFirebaseFirestore();
    const presetRef = doc(db, FIRESTORE_COLLECTIONS.SUPPLIER_PRESETS, presetId);

    await updateDoc(presetRef, {
      supplier,
      updatedAt: Timestamp.now(),
    });

    console.log(`[Firestore] Supplier preset updated: ${presetId}`);
  }

  /**
   * 商品履歴を保存
   *
   * @param userId - ユーザーID
   * @param supplier - 帳合先
   * @param name - 品名
   * @param origin - 産地
   * @param specification - 規格
   * @param quantityPerPackage - 入数
   * @param unit - 単位
   * @returns 履歴ID
   */
  static async saveProductHistory(
    userId: string,
    supplier: string,
    name: string,
    origin: string,
    specification: string,
    quantityPerPackage: number | null,
    unit: string,
    categoryCode?: string
  ): Promise<string> {
    const db = getFirebaseFirestore();
    const historyRef = collection(db, 'product_history');

    // 既存の同一レコードをチェック
    const q = query(
      historyRef,
      where('userId', '==', userId),
      where('supplier', '==', supplier),
      where('name', '==', name),
      where('origin', '==', origin),
      where('specification', '==', specification),
      where('quantityPerPackage', '==', quantityPerPackage),
      where('unit', '==', unit)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // 既存のレコードがあれば更新日時のみ更新
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, {
        updatedAt: Timestamp.now(),
        usageCount: (snapshot.docs[0].data().usageCount || 0) + 1,
        ...(categoryCode && { categoryCode }), // カテゴリーコードがあれば更新
      });
      console.log(`[Firestore] Product history updated: ${name}`);
      return snapshot.docs[0].id;
    }

    // 新規作成
    const docRef = await addDoc(historyRef, {
      userId,
      supplier,
      name,
      origin,
      specification,
      quantityPerPackage,
      unit,
      ...(categoryCode && { categoryCode }),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      usageCount: 1,
    });

    console.log(`[Firestore] Product history saved: ${name}`);
    return docRef.id;
  }

  /**
   * 商品履歴を取得（帳合先でフィルタ）
   *
   * @param userId - ユーザーID
   * @param supplier - 帳合先（オプション）
   * @returns 商品履歴配列
   */
  static async getProductHistory(
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
      usageCount: number;
      pinned?: boolean;
      pinOrder?: number;
    }>
  > {
    const db = getFirebaseFirestore();
    const historyRef = collection(db, 'product_history');

    let q;
    if (supplier) {
      q = query(
        historyRef,
        where('userId', '==', userId),
        where('supplier', '==', supplier),
        orderBy('updatedAt', 'desc')
      );
    } else {
      q = query(historyRef, where('userId', '==', userId), orderBy('updatedAt', 'desc'));
    }

    const snapshot = await getDocs(q);

    const history = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
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
      };
    });

    console.log(`[Firestore] Retrieved ${history.length} product history items`);
    return history;
  }

  /**
   * 条件に一致する商品履歴を削除
   *
   * @param userId - ユーザーID
   * @param conditions - 削除条件
   * @returns 削除されたドキュメント数
   */
  static async deleteProductHistoryByCondition(
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
    const db = getFirebaseFirestore();
    const historyRef = collection(db, 'product_history');

    // クエリを構築
    let q = query(historyRef, where('userId', '==', userId), where('supplier', '==', conditions.supplier));

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
    const deletePromises = snapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref));
    await Promise.all(deletePromises);

    console.log(`[Firestore] Deleted ${snapshot.docs.length} product history items`);
    return snapshot.docs.length;
  }

  /**
   * 商品履歴をIDで削除
   */
  static async deleteProductHistoryById(historyId: string): Promise<void> {
    const db = getFirebaseFirestore();
    const historyRef = doc(db, 'product_history', historyId);

    await deleteDoc(historyRef);

    console.log(`[Firestore] Deleted product history item: ${historyId}`);
  }

  /**
   * 商品履歴のピン留めをトグル
   *
   * @param historyId - 履歴ID
   * @param pinned - ピン留め状態
   * @param userId - ユーザーID（ピン留め順序の計算に使用）
   * @param supplier - 帳合先（ピン留め順序の計算に使用）
   */
  static async toggleProductHistoryPinned(
    historyId: string,
    pinned: boolean,
    userId?: string,
    supplier?: string
  ): Promise<void> {
    const db = getFirebaseFirestore();
    const historyRef = doc(db, 'product_history', historyId);

    const updateData: any = {
      pinned,
      updatedAt: Timestamp.now(),
    };

    // ピン留めを有効にする場合、現在のピン留めアイテムの最大pinOrderを取得して+1
    if (pinned && userId && supplier) {
      const q = query(
        collection(db, 'product_history'),
        where('userId', '==', userId),
        where('supplier', '==', supplier),
        where('pinned', '==', true)
      );
      const snapshot = await getDocs(q);
      const maxPinOrder =
        snapshot.docs.reduce((max, doc) => {
          const order = doc.data().pinOrder ?? 0;
          return Math.max(max, order);
        }, 0) || 0;

      updateData.pinOrder = maxPinOrder + 1;
    } else if (!pinned) {
      // ピン留め解除時はpinOrderを削除
      updateData.pinOrder = null;
    }

    await updateDoc(historyRef, updateData);

    console.log(`[Firestore] Toggled pinned status for ${historyId}: ${pinned}`);
  }

  /**
   * ピン留めアイテムの順序を更新
   *
   * @param reorderedItems - 並び替え後のアイテム配列（IDとpinOrderのペア）
   */
  static async reorderPinnedPresets(
    reorderedItems: Array<{ id: string; pinOrder: number }>
  ): Promise<void> {
    const db = getFirebaseFirestore();

    // バッチで複数のドキュメントを更新
    const updates = reorderedItems.map(async (item) => {
      const historyRef = doc(db, 'product_history', item.id);
      await updateDoc(historyRef, {
        pinOrder: item.pinOrder,
        updatedAt: Timestamp.now(),
      });
    });

    await Promise.all(updates);

    console.log(`[Firestore] Reordered ${reorderedItems.length} pinned items`);
  }
}
