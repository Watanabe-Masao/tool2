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
        store_cost: product.storeCost,
        price_excluding_tax: product.priceExcludingTax,
        store_allocations: product.storeAllocations,
      })),
      buyer_name: orderData.buyerName,
      timestamp: new Date(),
      user_id: userId,
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
        storeCost: product.store_cost,
        priceExcludingTax: product.price_excluding_tax,
        storeAllocations: product.store_allocations,
      })),
      buyerName: firestoreData.buyer_name,
      timestamp: firestoreData.timestamp?.toDate() || new Date(),
      userId: firestoreData.user_id,
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
      where('user_id', '==', userId),
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
      where('user_id', '==', userId),
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
      where('user_id', '==', userId),
      where('field', '==', field)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // 新規作成
      await addDoc(historyRef, {
        user_id: userId,
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
      where('user_id', '==', userId),
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
}
