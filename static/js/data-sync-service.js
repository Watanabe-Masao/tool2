// Data Sync Service - Firestore と IndexedDB の統合
import firestoreService from './firestore-service.js';
import indexedDBService from './indexeddb-service.js';

class DataSyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;

    // オンライン/オフライン状態の監視
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('オンラインになりました');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('オフラインになりました');
    });
  }

  /**
   * 初期化
   */
  async init() {
    await indexedDBService.init();
    if (this.isOnline) {
      await this.syncAll();
    }
  }

  /**
   * すべてのデータを同期
   */
  async syncAll() {
    if (this.syncInProgress) return;

    this.syncInProgress = true;
    try {
      console.log('データ同期を開始...');

      // 帳合先を同期
      const suppliers = await firestoreService.getSuppliers();
      await indexedDBService.syncFromFirestore('suppliers', suppliers);

      // 商品を同期（全ユーザーの商品）
      // 注：実際の実装では、ユーザーごとの商品のみ取得するようにする

      console.log('データ同期完了');
    } catch (error) {
      console.error('同期エラー:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 帳合先を保存（オンライン/オフライン対応）
   */
  async saveSupplier(supplierData) {
    // まずIndexedDBに保存（即座に反映）
    await indexedDBService.save('suppliers', {
      ...supplierData,
      _pendingSync: !this.isOnline
    });

    // オンラインならFirestoreにも保存
    if (this.isOnline) {
      const result = await firestoreService.saveSupplier(supplierData);
      if (result.success) {
        // 同期済みフラグを更新
        await indexedDBService.save('suppliers', {
          ...supplierData,
          id: result.id,
          _pendingSync: false
        });
      }
      return result;
    }

    return { success: true, offline: true };
  }

  /**
   * 帳合先を取得（キャッシュ優先）
   */
  async getSuppliers(forceRefresh = false) {
    // オフラインまたはキャッシュが有効な場合はIndexedDBから取得
    if (!this.isOnline || (!forceRefresh && await indexedDBService.isCacheValid('suppliers'))) {
      return await indexedDBService.getAll('suppliers');
    }

    // オンラインで最新データが必要な場合はFirestoreから取得
    const suppliers = await firestoreService.getSuppliers();
    await indexedDBService.syncFromFirestore('suppliers', suppliers);
    return suppliers;
  }

  /**
   * 商品を保存
   */
  async saveProduct(productData) {
    await indexedDBService.save('products', {
      ...productData,
      _pendingSync: !this.isOnline
    });

    if (this.isOnline) {
      const result = await firestoreService.saveProduct(productData);
      if (result.success) {
        await indexedDBService.save('products', {
          ...productData,
          id: result.id,
          _pendingSync: false
        });
      }
      return result;
    }

    return { success: true, offline: true };
  }

  /**
   * 商品を検索
   */
  async searchProducts(searchTerm, supplierId = null) {
    if (this.isOnline) {
      return await firestoreService.searchProducts(searchTerm, supplierId);
    }

    // オフライン時はIndexedDBから検索
    let products = await indexedDBService.getAll('products');

    if (supplierId) {
      products = products.filter(p => p.supplierId === supplierId);
    }

    if (searchTerm) {
      products = products.filter(p =>
        p.name.includes(searchTerm)
      );
    }

    return products.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 10);
  }

  /**
   * 帳合先別の商品を取得
   */
  async getProductsBySupplier(supplierId) {
    if (this.isOnline) {
      const products = await firestoreService.getProductsBySupplier(supplierId);
      // キャッシュに保存
      for (const product of products) {
        await indexedDBService.save('products', product);
      }
      return products;
    }

    // オフライン時
    return await indexedDBService.getByIndex('products', 'supplierId', supplierId);
  }

  /**
   * 注文を保存
   */
  async saveOrder(orderData) {
    await indexedDBService.save('orders', {
      ...orderData,
      _pendingSync: !this.isOnline
    });

    if (this.isOnline) {
      const result = await firestoreService.saveOrder(orderData);
      if (result.success) {
        await indexedDBService.save('orders', {
          ...orderData,
          id: result.id,
          _pendingSync: false
        });
      }
      return result;
    }

    return { success: true, offline: true };
  }

  /**
   * 日付別の注文を取得
   */
  async getOrdersByDate(date) {
    if (this.isOnline) {
      const orders = await firestoreService.getOrdersByDate(date);
      // キャッシュに保存
      for (const order of orders) {
        await indexedDBService.save('orders', order);
      }
      return orders;
    }

    // オフライン時
    return await indexedDBService.getByIndex('orders', 'deliveryDate', date);
  }

  /**
   * 期間内の注文を取得（カレンダー用）
   */
  async getOrdersInRange(startDate, endDate) {
    if (this.isOnline) {
      return await firestoreService.getOrdersInRange(startDate, endDate);
    }

    // オフライン時：全注文を取得してフィルタリング
    const orders = await indexedDBService.getAll('orders');
    return orders.filter(order =>
      order.deliveryDate >= startDate && order.deliveryDate <= endDate
    ).sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
  }

  /**
   * 履歴を追加
   */
  async addToHistory(type, value) {
    const historyItem = {
      id: `${type}_${indexedDBService.sanitizeId(value)}`,
      type: type,
      value: value,
      lastUsed: new Date().toISOString()
    };

    await indexedDBService.save('history', historyItem);

    if (this.isOnline) {
      await firestoreService.addToHistory(type, value);
    }
  }

  /**
   * 履歴を取得
   */
  async getHistory(type, limitCount = 10) {
    if (this.isOnline) {
      return await firestoreService.getHistory(type, limitCount);
    }

    // オフライン時
    const history = await indexedDBService.getByIndex('history', 'type', type);
    return history
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, limitCount)
      .map(h => h.value);
  }

  /**
   * 同期待ちのデータがあるかチェック
   */
  async hasPendingSync() {
    const stores = ['suppliers', 'products', 'orders'];
    for (const store of stores) {
      const data = await indexedDBService.getAll(store);
      if (data.some(item => item._pendingSync)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 同期ステータスを取得
   */
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress
    };
  }
}

// シングルトンインスタンスをエクスポート
const dataSyncService = new DataSyncService();
export default dataSyncService;
