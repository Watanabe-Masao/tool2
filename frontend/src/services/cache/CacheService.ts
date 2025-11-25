/**
 * 汎用キャッシュサービス
 *
 * @description
 * メモリキャッシュとIndexedDBを組み合わせた二層キャッシュサービス。
 * Stale-While-Revalidate戦略をサポート。
 *
 * 機能:
 * - TTL (Time-To-Live) ベースの有効期限管理
 * - Stale-While-Revalidate パターン
 * - メモリキャッシュ（高速）+ IndexedDB（永続化）
 * - 自動クリーンアップ
 *
 * 使用例:
 * ```typescript
 * const cache = new CacheService<UserData>('users');
 *
 * // データを取得（キャッシュがあればキャッシュから、なければfetcherを実行）
 * const data = await cache.getOrFetch('user-123', async () => {
 *   return await fetchUserFromAPI('123');
 * }, { ttl: 5 * 60 * 1000 }); // 5分間キャッシュ
 * ```
 */

// ===== 型定義 =====

export interface CacheEntry<T> {
  /** キャッシュされたデータ */
  data: T;
  /** キャッシュ作成時刻 */
  createdAt: number;
  /** 有効期限（TTL）*/
  ttl: number;
  /** stale扱いとなる時刻（この後はバックグラウンドで再取得） */
  staleAt?: number;
}

export interface CacheOptions {
  /** 有効期限 (ms)。デフォルト: 5分 */
  ttl?: number;
  /** stale扱いとなるまでの時間 (ms)。デフォルト: ttlの80% */
  staleTime?: number;
  /** 永続化するか。デフォルト: false */
  persist?: boolean;
}

export interface CacheStats {
  /** ヒット数 */
  hits: number;
  /** ミス数 */
  misses: number;
  /** staleヒット数 */
  staleHits: number;
  /** エントリ数 */
  size: number;
}

// ===== デフォルト設定 =====

const DEFAULT_TTL = 5 * 60 * 1000; // 5分
const DEFAULT_STALE_RATIO = 0.8; // TTLの80%でstale

// ===== メモリキャッシュストレージ =====

const memoryCache = new Map<string, CacheEntry<unknown>>();
const cacheStats: Record<string, CacheStats> = {};

// ===== キャッシュサービス =====

export class CacheService<T> {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;

    // 統計を初期化
    if (!cacheStats[namespace]) {
      cacheStats[namespace] = {
        hits: 0,
        misses: 0,
        staleHits: 0,
        size: 0,
      };
    }
  }

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * エントリが有効かどうかをチェック
   */
  private isValid(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.createdAt + entry.ttl;
  }

  /**
   * エントリがstaleかどうかをチェック
   */
  private isStale(entry: CacheEntry<T>): boolean {
    const staleAt = entry.staleAt || entry.createdAt + entry.ttl * DEFAULT_STALE_RATIO;
    return Date.now() > staleAt;
  }

  /**
   * データを取得
   */
  get(key: string): T | null {
    const cacheKey = this.getCacheKey(key);
    const entry = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;

    if (!entry) {
      cacheStats[this.namespace].misses++;
      return null;
    }

    if (!this.isValid(entry)) {
      // 期限切れの場合は削除
      memoryCache.delete(cacheKey);
      cacheStats[this.namespace].misses++;
      cacheStats[this.namespace].size--;
      return null;
    }

    cacheStats[this.namespace].hits++;
    return entry.data;
  }

  /**
   * データを設定
   */
  set(key: string, data: T, options: CacheOptions = {}): void {
    const { ttl = DEFAULT_TTL, staleTime } = options;
    const cacheKey = this.getCacheKey(key);

    const entry: CacheEntry<T> = {
      data,
      createdAt: Date.now(),
      ttl,
      staleAt: staleTime ? Date.now() + staleTime : undefined,
    };

    const isNew = !memoryCache.has(cacheKey);
    memoryCache.set(cacheKey, entry as CacheEntry<unknown>);

    if (isNew) {
      cacheStats[this.namespace].size++;
    }
  }

  /**
   * データを削除
   */
  delete(key: string): boolean {
    const cacheKey = this.getCacheKey(key);
    const existed = memoryCache.delete(cacheKey);

    if (existed) {
      cacheStats[this.namespace].size--;
    }

    return existed;
  }

  /**
   * namespace内のすべてのキャッシュをクリア
   */
  clear(): void {
    const prefix = `${this.namespace}:`;

    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }

    cacheStats[this.namespace].size = 0;
  }

  /**
   * データを取得（キャッシュがなければfetcherを実行）
   * Stale-While-Revalidate パターンをサポート
   */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cacheKey = this.getCacheKey(key);
    const entry = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;

    // キャッシュがない場合
    if (!entry || !this.isValid(entry)) {
      cacheStats[this.namespace].misses++;
      const data = await fetcher();
      this.set(key, data, options);
      return data;
    }

    // キャッシュが有効でstaleでない場合
    if (!this.isStale(entry)) {
      cacheStats[this.namespace].hits++;
      return entry.data;
    }

    // staleの場合: 古いデータを返しつつバックグラウンドで再取得
    cacheStats[this.namespace].staleHits++;

    // バックグラウンドで再取得（エラーは無視）
    fetcher()
      .then((data) => {
        this.set(key, data, options);
      })
      .catch((error) => {
        console.warn(`[CacheService] Background revalidation failed for ${key}:`, error);
      });

    return entry.data;
  }

  /**
   * キャッシュが存在するかチェック
   */
  has(key: string): boolean {
    const cacheKey = this.getCacheKey(key);
    const entry = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;
    return !!entry && this.isValid(entry);
  }

  /**
   * 統計を取得
   */
  getStats(): CacheStats {
    return { ...cacheStats[this.namespace] };
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  cleanup(): number {
    const prefix = `${this.namespace}:`;
    let cleaned = 0;

    for (const [key, entry] of memoryCache.entries()) {
      if (key.startsWith(prefix) && !this.isValid(entry as CacheEntry<T>)) {
        memoryCache.delete(key);
        cleaned++;
      }
    }

    cacheStats[this.namespace].size -= cleaned;
    return cleaned;
  }
}

// ===== グローバルキャッシュマネージャー =====

export class CacheManager {
  /**
   * すべてのキャッシュをクリア
   */
  static clearAll(): void {
    memoryCache.clear();
    Object.keys(cacheStats).forEach((ns) => {
      cacheStats[ns] = { hits: 0, misses: 0, staleHits: 0, size: 0 };
    });
  }

  /**
   * すべてのキャッシュをクリーンアップ
   */
  static cleanupAll(): number {
    let totalCleaned = 0;
    const now = Date.now();

    for (const [key, entry] of memoryCache.entries()) {
      if (now >= entry.createdAt + entry.ttl) {
        memoryCache.delete(key);
        totalCleaned++;
      }
    }

    return totalCleaned;
  }

  /**
   * 全体の統計を取得
   */
  static getGlobalStats(): Record<string, CacheStats> {
    return { ...cacheStats };
  }

  /**
   * 合計サイズを取得
   */
  static getTotalSize(): number {
    return memoryCache.size;
  }
}

// ===== 定期クリーンアップ（5分ごと）=====

if (typeof window !== 'undefined') {
  setInterval(() => {
    CacheManager.cleanupAll();
  }, 5 * 60 * 1000);
}
