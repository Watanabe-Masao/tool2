/**
 * ヘルスチェックフック
 *
 * @description
 * 多層ヘルスチェックサービスを使用して、
 * アプリケーションの健全性を監視するReactフック。
 *
 * 機能:
 * - 定期的な自動チェック
 * - 手動チェックトリガー
 * - ステータス変化の検出
 * - オフライン/オンライン復帰の検知
 *
 * 使用例:
 * ```tsx
 * const { health, isLoading, error, refetch } = useHealthCheck({
 *   interval: 60000, // 1分ごとに自動チェック
 *   enabled: true,
 * });
 *
 * if (health?.overall === 'unhealthy') {
 *   // エラー表示
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { HealthCheckService, type OverallHealth } from '@/services/healthCheck';

interface UseHealthCheckOptions {
  /** 自動チェック間隔 (ms)。0で無効化。デフォルト: 60000 (1分) */
  interval?: number;
  /** ヘルスチェックを有効にするか。デフォルト: true */
  enabled?: boolean;
  /** ステータス変化時のコールバック */
  onStatusChange?: (health: OverallHealth) => void;
}

interface UseHealthCheckReturn {
  /** 現在のヘルス状態 */
  health: OverallHealth | null;
  /** チェック中かどうか */
  isLoading: boolean;
  /** エラー */
  error: Error | null;
  /** 手動でチェックを実行 */
  refetch: () => Promise<void>;
  /** 個別サービスが健全かどうか */
  isNetworkHealthy: boolean;
  isBackendHealthy: boolean;
  isFirestoreHealthy: boolean;
  /** 全体が健全かどうか */
  isHealthy: boolean;
  /** 一部サービスに問題があるかどうか */
  isDegraded: boolean;
}

export const useHealthCheck = (options: UseHealthCheckOptions = {}): UseHealthCheckReturn => {
  const { interval = 60000, enabled = true, onStatusChange } = options;

  const [health, setHealth] = useState<OverallHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const previousStatusRef = useRef<string | null>(null);

  /**
   * ヘルスチェックを実行
   */
  const checkHealth = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await HealthCheckService.checkAll(forceRefresh);
      setHealth(result);

      // ステータス変化を検出
      if (previousStatusRef.current !== null && previousStatusRef.current !== result.overall) {
        onStatusChange?.(result);
      }
      previousStatusRef.current = result.overall;
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, onStatusChange]);

  /**
   * 手動リフレッシュ
   */
  const refetch = useCallback(async () => {
    await checkHealth(true);
  }, [checkHealth]);

  /**
   * 初回チェックと定期チェック
   */
  useEffect(() => {
    if (!enabled) return;

    // 初回チェック
    checkHealth();

    // 定期チェック
    if (interval > 0) {
      const timer = setInterval(() => {
        checkHealth();
      }, interval);

      return () => clearInterval(timer);
    }
  }, [enabled, interval, checkHealth]);

  /**
   * オンライン/オフライン状態の変化を監視
   */
  useEffect(() => {
    const handleOnline = () => {
      // オンライン復帰時に即座にチェック
      checkHealth(true);
    };

    const handleOffline = () => {
      // オフライン時は即座に状態を更新
      setHealth((prev) =>
        prev
          ? {
              ...prev,
              overall: 'unhealthy',
              network: {
                status: 'unhealthy',
                lastChecked: new Date(),
                error: 'オフライン',
              },
              timestamp: new Date(),
            }
          : null
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkHealth]);

  // 便利なbooleanプロパティ
  const isNetworkHealthy = health?.network.status === 'healthy';
  const isBackendHealthy = health?.backend.status === 'healthy';
  const isFirestoreHealthy = health?.firestore.status === 'healthy';
  const isHealthy = health?.overall === 'healthy';
  const isDegraded = health?.overall === 'degraded';

  return {
    health,
    isLoading,
    error,
    refetch,
    isNetworkHealthy,
    isBackendHealthy,
    isFirestoreHealthy,
    isHealthy,
    isDegraded,
  };
};
