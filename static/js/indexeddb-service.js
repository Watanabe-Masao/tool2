// IndexedDB Service (キャッシュレイヤー)
class IndexedDBService {
  constructor() {
    this.dbName = 'HaibunDistributionDB';
    this.dbVersion = 1;
    this.db = null;
  }

  /**
   * データベースを初期化
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // オブジェクトストアの作成
        if (!db.objectStoreNames.contains('suppliers')) {
          const supplierStore = db.createObjectStore('suppliers', { keyPath: 'id' });
          supplierStore.createIndex('name', 'name', { unique: false });
          supplierStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('name', 'name', { unique: false });
          productStore.createIndex('supplierId', 'supplierId', { unique: false });
          productStore.createIndex('usageCount', 'usageCount', { unique: false });
        }

        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('deliveryDate', 'deliveryDate', { unique: false });
          orderStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('type', 'type', { unique: false });
          historyStore.createIndex('lastUsed', 'lastUsed', { unique: false });
        }

        console.log('IndexedDB schema created');
      };
    });
  }

  /**
   * データを保存
   */
  async save(storeName, data) {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB save error:', error);
      return false;
    }
  }

  /**
   * データを取得
   */
  async get(storeName, id) {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB get error:', error);
      return null;
    }
  }

  /**
   * 全データを取得
   */
  async getAll(storeName) {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB getAll error:', error);
      return [];
    }
  }

  /**
   * インデックスで検索
   */
  async getByIndex(storeName, indexName, value) {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB getByIndex error:', error);
      return [];
    }
  }

  /**
   * データを削除
   */
  async delete(storeName, id) {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB delete error:', error);
      return false;
    }
  }

  /**
   * 全データを削除
   */
  async clear(storeName) {
    try {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB clear error:', error);
      return false;
    }
  }

  /**
   * Firestoreからデータを同期
   */
  async syncFromFirestore(storeName, firestoreData) {
    try {
      // 既存データをクリア
      await this.clear(storeName);

      // 新しいデータを保存
      for (const item of firestoreData) {
        await this.save(storeName, item);
      }

      console.log(`Synced ${firestoreData.length} items to ${storeName}`);
      return true;
    } catch (error) {
      console.error('Sync from Firestore error:', error);
      return false;
    }
  }

  /**
   * キャッシュの有効期限をチェック
   */
  async isCacheValid(storeName, maxAge = 5 * 60 * 1000) {
    try {
      const data = await this.getAll(storeName);
      if (data.length === 0) return false;

      // 最後の更新時刻をチェック
      const latestItem = data.reduce((prev, current) =>
        (prev.updatedAt > current.updatedAt) ? prev : current
      );

      if (!latestItem.updatedAt) return false;

      const age = Date.now() - new Date(latestItem.updatedAt).getTime();
      return age < maxAge;
    } catch (error) {
      console.error('Cache validity check error:', error);
      return false;
    }
  }
}

// シングルトンインスタンスをエクスポート
const indexedDBService = new IndexedDBService();
export default indexedDBService;
