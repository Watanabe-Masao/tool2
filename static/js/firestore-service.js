// Firestore Service
import { db, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from './firebase-config.js';
import authService from './auth-service.js';

class FirestoreService {
  constructor() {
    this.cache = new Map(); // 簡易キャッシュ
  }

  /**
   * 帳合先を保存
   */
  async saveSupplier(supplierData) {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('ログインが必要です');

      const supplierId = supplierData.id || this.generateId();
      const supplierRef = doc(db, 'suppliers', supplierId);

      await setDoc(supplierRef, {
        ...supplierData,
        id: supplierId,
        createdBy: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return { success: true, id: supplierId };
    } catch (error) {
      console.error('Save supplier error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 帳合先一覧を取得
   */
  async getSuppliers() {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('ログインが必要です');

      const suppliersRef = collection(db, 'suppliers');
      // インデックス不要のシンプルなクエリ
      const q = query(suppliersRef, where('createdBy', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const suppliers = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        suppliers.push({
          id: doc.id,
          ...data,
          // Timestamp を文字列に変換してソート可能にする
          _sortKey: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0
        });
      });

      // クライアント側で updatedAt でソート（降順）
      suppliers.sort((a, b) => b._sortKey - a._sortKey);

      return suppliers;
    } catch (error) {
      console.error('Get suppliers error:', error);
      return [];
    }
  }

  /**
   * 商品を保存（共通テンプレート）
   */
  async saveProduct(productData) {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('ログインが必要です');

      const productId = productData.id || this.generateId();
      const productRef = doc(db, 'products', productId);

      // 既存の商品があれば使用回数を増やす
      const existingDoc = await getDoc(productRef);
      const usageCount = existingDoc.exists() ? (existingDoc.data().usageCount || 0) + 1 : 1;

      await setDoc(productRef, {
        ...productData,
        id: productId,
        usageCount: usageCount,
        createdBy: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 履歴に追加
      await this.addToHistory('products', productData.name);

      return { success: true, id: productId };
    } catch (error) {
      console.error('Save product error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 帳合先で商品を検索
   */
  async getProductsBySupplier(supplierId) {
    try {
      const productsRef = collection(db, 'products');
      // インデックス不要のシンプルなクエリ
      const q = query(
        productsRef,
        where('supplierId', '==', supplierId)
      );
      const querySnapshot = await getDocs(q);

      const products = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          id: doc.id,
          ...data,
          _sortKey: data.usageCount || 0
        });
      });

      // クライアント側でソート（降順）して上位50件を返す
      products.sort((a, b) => b._sortKey - a._sortKey);
      return products.slice(0, 50);
    } catch (error) {
      console.error('Get products by supplier error:', error);
      return [];
    }
  }

  /**
   * 品名で商品を検索（オートコンプリート用）
   */
  async searchProducts(searchTerm, supplierId = null) {
    try {
      const user = authService.getCurrentUser();
      if (!user) return [];

      const productsRef = collection(db, 'products');
      let q;

      // インデックス不要のシンプルなクエリ
      if (supplierId) {
        q = query(
          productsRef,
          where('supplierId', '==', supplierId),
          where('createdBy', '==', user.uid)
        );
      } else {
        q = query(
          productsRef,
          where('createdBy', '==', user.uid)
        );
      }

      const querySnapshot = await getDocs(q);
      const products = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // クライアント側でフィルタリング（Firestoreの制限のため）
        if (!searchTerm || data.name.includes(searchTerm)) {
          products.push({
            id: doc.id,
            ...data,
            _sortKey: data.usageCount || 0
          });
        }
      });

      // クライアント側でソート（降順）して上位10件を返す
      products.sort((a, b) => b._sortKey - a._sortKey);
      return products.slice(0, 10);
    } catch (error) {
      console.error('Search products error:', error);
      return [];
    }
  }

  /**
   * 配分データ（注文）を保存
   */
  async saveOrder(orderData) {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('ログインが必要です');

      const orderId = orderData.id || this.generateId();
      const orderRef = doc(db, 'orders', orderId);

      await setDoc(orderRef, {
        ...orderData,
        id: orderId,
        userId: user.uid,
        buyerName: user.profile?.displayName || user.email,
        updatedAt: serverTimestamp(),
        createdAt: orderData.createdAt || serverTimestamp()
      }, { merge: true });

      return { success: true, id: orderId };
    } catch (error) {
      console.error('Save order error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 日付で注文を取得
   */
  async getOrdersByDate(date) {
    try {
      const user = authService.getCurrentUser();
      if (!user) return [];

      const ordersRef = collection(db, 'orders');
      // インデックス不要のシンプルなクエリ
      const q = query(
        ordersRef,
        where('userId', '==', user.uid),
        where('deliveryDate', '==', date)
      );

      const querySnapshot = await getDocs(q);
      const orders = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          ...data,
          _sortKey: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0
        });
      });

      // クライアント側でソート（降順）
      orders.sort((a, b) => b._sortKey - a._sortKey);
      return orders;
    } catch (error) {
      console.error('Get orders by date error:', error);
      return [];
    }
  }

  /**
   * 注文を取得（カレンダー用）
   */
  async getOrdersInRange(startDate, endDate) {
    try {
      const user = authService.getCurrentUser();
      if (!user) return [];

      const ordersRef = collection(db, 'orders');
      // インデックス不要のシンプルなクエリ（範囲クエリのみ）
      const q = query(
        ordersRef,
        where('userId', '==', user.uid),
        where('deliveryDate', '>=', startDate),
        where('deliveryDate', '<=', endDate)
      );

      const querySnapshot = await getDocs(q);
      const orders = [];

      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });

      // クライアント側でソート（昇順）
      orders.sort((a, b) => {
        if (a.deliveryDate < b.deliveryDate) return -1;
        if (a.deliveryDate > b.deliveryDate) return 1;
        return 0;
      });

      return orders;
    } catch (error) {
      console.error('Get orders in range error:', error);
      return [];
    }
  }

  /**
   * 履歴に追加（オートコンプリート用）
   */
  async addToHistory(type, value) {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const historyRef = doc(db, 'history', user.uid, type, this.sanitizeId(value));

      await setDoc(historyRef, {
        name: value,
        lastUsed: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Add to history error:', error);
    }
  }

  /**
   * 履歴を取得
   */
  async getHistory(type, limitCount = 10) {
    try {
      const user = authService.getCurrentUser();
      if (!user) return [];

      const historyRef = collection(db, 'history', user.uid, type);
      const q = query(historyRef, orderBy('lastUsed', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      const history = [];
      querySnapshot.forEach((doc) => {
        history.push(doc.data().name);
      });

      return history;
    } catch (error) {
      console.error('Get history error:', error);
      return [];
    }
  }

  /**
   * IDを生成
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ID用に文字列をサニタイズ
   */
  sanitizeId(str) {
    return str.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').toLowerCase();
  }
}

// シングルトンインスタンスをエクスポート
const firestoreService = new FirestoreService();
export default firestoreService;
