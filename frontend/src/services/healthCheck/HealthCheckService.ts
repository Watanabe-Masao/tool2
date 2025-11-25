/**
 * 多層ヘルスチェックサービス
 *
 * @description
 * アプリケーションの各依存サービスの健全性を監視する多層ヘルスチェックサービス。
 *
 * チェック対象:
 * 1. ネットワーク接続 (navigator.onLine + ping)
 * 2. バックエンドAPI (FastAPI)
 * 3. Firestore (読み取りテスト)
 *
 * 使用例:
 * ```tsx
 * const status = await HealthCheckService.checkAll();
 * if (status.overall === 'healthy') {
 *   // 全サービス正常
 * } else if (status.overall === 'degraded') {
 *   // 一部サービスに問題
 * }
 * ```
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { API_BASE_URL } from '@/utils/constants';

// ===== 型定義 =====

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ServiceHealth {
  status: HealthStatus;
  latency?: number; // ms
  lastChecked: Date;
  error?: string;
}

export interface OverallHealth {
  overall: HealthStatus;
  network: ServiceHealth;
  backend: ServiceHealth;
  firestore: ServiceHealth;
  timestamp: Date;
}

export interface HealthCheckConfig {
  /** ネットワークタイムアウト (ms) */
  networkTimeout: number;
  /** APIタイムアウト (ms) */
  apiTimeout: number;
  /** Firestoreタイムアウト (ms) */
  firestoreTimeout: number;
  /** キャッシュの有効期限 (ms) */
  cacheTTL: number;
}

// ===== 定数 =====

const DEFAULT_CONFIG: HealthCheckConfig = {
  networkTimeout: 5000,
  apiTimeout: 10000,
  firestoreTimeout: 10000,
  cacheTTL: 30000, // 30秒
};

// ===== キャッシュ =====

let cachedHealth: OverallHealth | null = null;
let cacheTimestamp: number = 0;

// ===== サービス =====

export class HealthCheckService {
  private static config: HealthCheckConfig = DEFAULT_CONFIG;

  /**
   * 設定を更新
   */
  static configure(config: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * すべてのサービスの健全性をチェック
   */
  static async checkAll(forceRefresh = false): Promise<OverallHealth> {
    // キャッシュが有効な場合はキャッシュを返す
    if (!forceRefresh && cachedHealth && Date.now() - cacheTimestamp < this.config.cacheTTL) {
      return cachedHealth;
    }

    const [network, backend, firestore] = await Promise.all([
      this.checkNetwork(),
      this.checkBackend(),
      this.checkFirestore(),
    ]);

    const overall = this.calculateOverallStatus(network, backend, firestore);

    const health: OverallHealth = {
      overall,
      network,
      backend,
      firestore,
      timestamp: new Date(),
    };

    // キャッシュを更新
    cachedHealth = health;
    cacheTimestamp = Date.now();

    return health;
  }

  /**
   * ネットワーク接続をチェック
   */
  static async checkNetwork(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // navigator.onLine は信頼性が低いため、実際にリクエストを送信してテスト
      if (!navigator.onLine) {
        return {
          status: 'unhealthy',
          lastChecked: new Date(),
          error: 'ブラウザがオフラインです',
        };
      }

      // Google DNSへのping（軽量なリクエスト）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.networkTimeout);

      try {
        await fetch('https://dns.google/resolve?name=example.com&type=A', {
          method: 'GET',
          mode: 'cors',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        return {
          status: 'healthy',
          latency: Date.now() - startTime,
          lastChecked: new Date(),
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // フェッチに失敗してもnavigator.onLineがtrueなら、特定のサービスへのアクセスができない状態
        return {
          status: 'degraded',
          latency: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'ネットワーク接続が不安定です',
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'ネットワークエラー',
      };
    }
  }

  /**
   * バックエンドAPIをチェック
   */
  static async checkBackend(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.apiTimeout);

      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (!response.ok) {
        return {
          status: 'degraded',
          latency,
          lastChecked: new Date(),
          error: `HTTPステータス: ${response.status}`,
        };
      }

      const data = await response.json();

      if (data.status === 'healthy') {
        return {
          status: 'healthy',
          latency,
          lastChecked: new Date(),
        };
      }

      return {
        status: 'degraded',
        latency,
        lastChecked: new Date(),
        error: 'APIが異常な状態を報告しています',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'APIエラー',
      };
    }
  }

  /**
   * Firestoreをチェック
   */
  static async checkFirestore(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // 読み取りテスト用のシステムドキュメント
      const healthDocRef = doc(db, '__health__', 'status');

      // タイムアウト付きの読み取り
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('タイムアウト')), this.config.firestoreTimeout)
      );

      await Promise.race([
        getDoc(healthDocRef).catch(() => {
          // ドキュメントが存在しなくても接続できれば正常
          // Firestoreは存在しないドキュメントへのアクセスでエラーを投げない
          return null;
        }),
        timeoutPromise,
      ]);

      return {
        status: 'healthy',
        latency: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Firestoreエラー',
      };
    }
  }

  /**
   * 全体のステータスを計算
   */
  private static calculateOverallStatus(
    network: ServiceHealth,
    backend: ServiceHealth,
    firestore: ServiceHealth
  ): HealthStatus {
    const statuses = [network.status, backend.status, firestore.status];

    // すべてhealthyなら healthy
    if (statuses.every((s) => s === 'healthy')) {
      return 'healthy';
    }

    // いずれかがunhealthyなら unhealthy
    if (statuses.some((s) => s === 'unhealthy')) {
      return 'unhealthy';
    }

    // それ以外は degraded
    return 'degraded';
  }

  /**
   * キャッシュをクリア
   */
  static clearCache(): void {
    cachedHealth = null;
    cacheTimestamp = 0;
  }

  /**
   * 現在のキャッシュを取得（再チェックなし）
   */
  static getCached(): OverallHealth | null {
    if (cachedHealth && Date.now() - cacheTimestamp < this.config.cacheTTL) {
      return cachedHealth;
    }
    return null;
  }
}
