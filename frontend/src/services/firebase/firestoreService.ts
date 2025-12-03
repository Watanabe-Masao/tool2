/**
 * @deprecated このファイルは非推奨です。
 *
 * 新規コードでは FirestoreServiceFacade を使用してください。
 *
 * 移行例:
 * ```typescript
 * // Before (非推奨)
 * import { FirestoreService } from '@/services/firebase/firestoreService';
 * const orders = await FirestoreService.getUserOrders(userId);
 *
 * // After (推奨)
 * import { getFirebaseFirestore } from '@/services/firebase/config';
 * import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
 *
 * const db = getFirebaseFirestore();
 * const facade = new FirestoreServiceFacade(db);
 * const orders = await facade.getUserOrders(userId);
 * ```
 *
 * または、ServiceContextを使用:
 * ```typescript
 * import { useFirestoreService } from '@/context/ServiceContext';
 *
 * const firestoreService = useFirestoreService();
 * const orders = await firestoreService.getUserOrders(userId);
 * ```
 *
 * @see {@link FirestoreServiceFacade} - 推奨される新しいサービス
 * @see {@link ../firestore/README.md} - 詳細なマイグレーションガイド
 */

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
  increment,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { FIRESTORE_COLLECTIONS } from '@/utils/constants';
import type { OrderData, FirestoreOrderData, EmailAddressEntity, SupplierPresetEntity } from '@/types';
import { format } from 'date-fns';
import { EmailAddressRepository } from '../firestore/repositories/EmailAddressRepository';
import { PresetRepository } from '../firestore/repositories/PresetRepository';

/**
 * Firestoreサービス
 *
 * @deprecated FirestoreServiceFacade を使用してください
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
      suppliers: orderData.suppliers,
      products: orderData.products.map((product) => ({
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
      suppliers: firestoreData.suppliers || [],
      products: firestoreData.products.map((product: any) => ({
        supplier: product.supplier || '',
        name: product.name,
        origin: product.origin,
        specification: product.specification || '',
        quantityPerPackage: product.quantity_per_package,
        unit: product.unit || '',
        storeCost: product.store_cost,
        priceExcludingTax: product.price_excluding_tax,
        totalDelivery: product.total_delivery,
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
   * @returns プリセットEntity配列
   */
  static async getSupplierPresets(userId: string): Promise<SupplierPresetEntity[]> {
    const db = getFirebaseFirestore();
    const repository = new PresetRepository(db);
    return repository.findByUserId(userId);
  }

  /**
   * 帳合先プリセット一覧をリアルタイムで監視
   *
   * @param userId - ユーザーID
   * @param onSuccess - データ更新時のコールバック
   * @param onError - エラー発生時のコールバック
   * @returns アンサブスクライブ関数
   */
  static subscribeToSupplierPresets(
    userId: string,
    onSuccess: (presets: SupplierPresetEntity[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const db = getFirebaseFirestore();
    const repository = new PresetRepository(db);
    return repository.subscribeToPresets(userId, onSuccess, onError);
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
   * 帳合先プリセットの並び順を更新
   *
   * @param reorderedItems - 並び替え後のID配列とdisplayOrder
   */
  static async reorderSupplierPresets(
    reorderedItems: Array<{ id: string; displayOrder: number }>
  ): Promise<void> {
    const db = getFirebaseFirestore();

    const updates = reorderedItems.map(async (item) => {
      const presetRef = doc(db, FIRESTORE_COLLECTIONS.SUPPLIER_PRESETS, item.id);
      await updateDoc(presetRef, {
        displayOrder: item.displayOrder,
        updatedAt: Timestamp.now(),
      });
    });

    await Promise.all(updates);

    console.log(`[Firestore] Reordered ${reorderedItems.length} supplier presets`);
  }

  /**
   * メールアドレス帳を保存
   *
   * @param userId - ユーザーID
   * @param name - 表示名
   * @param email - メールアドレス
   * @returns エントリID
   */
  static async saveEmailAddress(userId: string, name: string, email: string): Promise<string> {
    const db = getFirebaseFirestore();
    const addressesRef = collection(db, FIRESTORE_COLLECTIONS.EMAIL_ADDRESSES);

    const docRef = await addDoc(addressesRef, {
      userId,
      name,
      email,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log(`[Firestore] Email address saved: ${name} (${email})`);
    return docRef.id;
  }

  /**
   * メールアドレス帳一覧を取得
   *
   * @param userId - ユーザーID
   * @returns アドレス帳配列
   */
  static async getEmailAddresses(userId: string): Promise<EmailAddressEntity[]> {
    const db = getFirebaseFirestore();
    const repository = new EmailAddressRepository(db);
    return repository.findByUserId(userId);
  }

  /**
   * メールアドレス帳一覧をリアルタイムで監視
   *
   * @param userId - ユーザーID
   * @param onSuccess - データ更新時のコールバック
   * @param onError - エラー発生時のコールバック
   * @returns アンサブスクライブ関数
   */
  static subscribeToEmailAddresses(
    userId: string,
    onSuccess: (addresses: EmailAddressEntity[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const db = getFirebaseFirestore();
    const repository = new EmailAddressRepository(db);
    return repository.subscribeToAddresses(userId, onSuccess, onError);
  }

  /**
   * メールアドレス帳を削除
   *
   * @param addressId - アドレスID
   */
  static async deleteEmailAddress(addressId: string): Promise<void> {
    const db = getFirebaseFirestore();
    const addressRef = doc(db, FIRESTORE_COLLECTIONS.EMAIL_ADDRESSES, addressId);

    await deleteDoc(addressRef);

    console.log(`[Firestore] Email address deleted: ${addressId}`);
  }

  /**
   * メールアドレス帳を更新
   *
   * @param addressId - アドレスID
   * @param name - 表示名
   * @param email - メールアドレス
   */
  static async updateEmailAddress(addressId: string, name: string, email: string): Promise<void> {
    const db = getFirebaseFirestore();
    const addressRef = doc(db, FIRESTORE_COLLECTIONS.EMAIL_ADDRESSES, addressId);

    await updateDoc(addressRef, {
      name,
      email,
      updatedAt: Timestamp.now(),
    });

    console.log(`[Firestore] Email address updated: ${addressId}`);
  }

  /**
   * メールアドレス帳の並び順を更新
   *
   * @param reorderedItems - 並び替え後のID配列とdisplayOrder
   */
  static async reorderEmailAddresses(
    reorderedItems: Array<{ id: string; displayOrder: number }>
  ): Promise<void> {
    const db = getFirebaseFirestore();

    const updates = reorderedItems.map(async (item) => {
      const addressRef = doc(db, FIRESTORE_COLLECTIONS.EMAIL_ADDRESSES, item.id);
      await updateDoc(addressRef, {
        displayOrder: item.displayOrder,
        updatedAt: Timestamp.now(),
      });
    });

    await Promise.all(updates);

    console.log(`[Firestore] Reordered ${reorderedItems.length} email addresses`);
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
   * @param packageUnit - 入数の単位
   * @param categoryCode - カテゴリーコード
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
    packageUnit: string,
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
        packageUnit, // packageUnitも更新
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
      packageUnit,
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
      packageUnit: string;
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
        packageUnit: data.packageUnit || '',
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

  /**
   * 価格履歴を取得
   *
   * @param userId - ユーザーID
   * @returns 価格履歴一覧
   */
  static async getPricingHistory(userId: string): Promise<any[]> {
    const db = getFirebaseFirestore();
    const q = query(
      collection(db, 'pricing_history'),
      where('userId', '==', userId),
      orderBy('lastUsedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      lastUsedAt: doc.data().lastUsedAt?.toDate(),
    }));
  }

  /**
   * 価格履歴を保存または更新
   *
   * 同じキー（商品名・規格・入数）の履歴が存在する場合は更新、
   * 存在しない場合は新規作成します。
   *
   * @param userId - ユーザーID
   * @param productName - 商品名
   * @param specification - 規格
   * @param quantityPerPackage - 入数
   * @param unit - 単位
   * @param centerCost - センター着原価
   * @param storeCost - 店着原価
   * @param priceExcludingTax - 本体価格（税抜売価）
   * @param centerFeeRate - センターフィー率（省略可）
   */
  static async savePricingHistory(
    userId: string,
    productName: string,
    specification: string,
    quantityPerPackage: number,
    unit: string,
    centerCost: number,
    storeCost: number,
    priceExcludingTax: number,
    centerFeeRate?: number
  ): Promise<void> {
    const db = getFirebaseFirestore();

    // 同じキーの履歴が存在するかチェック
    const q = query(
      collection(db, 'pricing_history'),
      where('userId', '==', userId),
      where('productName', '==', productName),
      where('specification', '==', specification),
      where('quantityPerPackage', '==', quantityPerPackage)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // 既存の履歴が存在する場合、値が変更されているかチェック
      const existingDoc = snapshot.docs[0];
      const existingData = existingDoc.data();

      const normalizedCenterFeeRate = centerFeeRate ?? 13;

      // 全ての価格情報が同じ場合はスキップ
      if (
        existingData.centerCost === centerCost &&
        existingData.storeCost === storeCost &&
        existingData.priceExcludingTax === priceExcludingTax &&
        existingData.centerFeeRate === normalizedCenterFeeRate &&
        existingData.unit === unit
      ) {
        console.log(`[Firestore] Pricing history unchanged, skipping update for ${productName} (${specification})`);
        return;
      }

      // 値が変更されている場合のみ更新
      await updateDoc(doc(db, 'pricing_history', existingDoc.id), {
        centerCost,
        storeCost,
        priceExcludingTax,
        centerFeeRate: normalizedCenterFeeRate,
        unit,
        usageCount: increment(1),
        lastUsedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log(`[Firestore] Updated pricing history for ${productName} (${specification})`);
    } else {
      // 新規作成
      await addDoc(collection(db, 'pricing_history'), {
        userId,
        productName,
        specification,
        quantityPerPackage,
        unit,
        centerCost,
        storeCost,
        priceExcludingTax,
        centerFeeRate: centerFeeRate ?? 13,
        usageCount: 1,
        createdAt: Timestamp.now(),
        lastUsedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log(`[Firestore] Created pricing history for ${productName} (${specification})`);
    }
  }

  /**
   * 価格履歴を削除
   *
   * @param historyId - 削除する履歴ID
   */
  static async deletePricingHistory(historyId: string): Promise<void> {
    const db = getFirebaseFirestore();
    await deleteDoc(doc(db, 'pricing_history', historyId));
    console.log(`[Firestore] Deleted pricing history: ${historyId}`);
  }
}
