/**
 * useStoreSettings
 *
 * 店舗設定（販売構成比）を取得・管理するカスタムフック
 * 配分画面での自動配分に使用
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { StoreSettingsService } from '@/services/firebase/storeSettingsService';
import type { StoreSettings } from '@/types/storeSettings';

/**
 * useStoreSettingsの戻り値
 */
interface UseStoreSettingsReturn {
  /** 店舗設定（店舗コードをキーとするオブジェクト） */
  storeSettings: Record<string, StoreSettings>;
  /** 読み込み中フラグ */
  loading: boolean;
  /** エラー */
  error: Error | null;
  /** 設定を再読み込み */
  reload: () => Promise<void>;
}

/**
 * 店舗設定を取得するカスタムフック
 *
 * @returns 店舗設定と関連メソッド
 *
 * @example
 * ```typescript
 * const { storeSettings, loading } = useStoreSettings();
 *
 * // 自動配分に使用
 * const result = OrderService.calculateSalesRatioAllocation(
 *   totalDelivery,
 *   storeSettings
 * );
 * ```
 */
export const useStoreSettings = (): UseStoreSettingsReturn => {
  const { user } = useAuthContext();
  const [storeSettings, setStoreSettings] = useState<Record<string, StoreSettings>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 店舗設定を読み込み
   */
  const loadStoreSettings = useCallback(async () => {
    if (!user?.uid) {
      setStoreSettings({});
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await StoreSettingsService.getAll(user.uid);

      // 配列をオブジェクトに変換
      const settingsMap: Record<string, StoreSettings> = {};
      data.forEach((setting) => {
        settingsMap[setting.storeCode] = setting;
      });

      setStoreSettings(settingsMap);
    } catch (err) {
      console.error('[useStoreSettings] Failed to load store settings:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  /**
   * 初回読み込み
   */
  useEffect(() => {
    loadStoreSettings();
  }, [loadStoreSettings]);

  // 戻り値をメモ化
  return useMemo(
    () => ({
      storeSettings,
      loading,
      error,
      reload: loadStoreSettings,
    }),
    [storeSettings, loading, error, loadStoreSettings]
  );
};
