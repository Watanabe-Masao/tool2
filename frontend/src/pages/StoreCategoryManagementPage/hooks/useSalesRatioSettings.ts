/**
 * 販売構成比設定ロジックフック
 */

import { useState, useCallback, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { StoreSettingsService } from '@/services/firebase/storeSettingsService';
import type { StoreSettings } from '@/types/storeSettings';

interface UseSalesRatioSettingsProps {
  userId: string | undefined;
}

/**
 * 販売構成比設定のロジックを提供するカスタムフック
 */
export const useSalesRatioSettings = ({ userId }: UseSalesRatioSettingsProps) => {
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();

  const [storeSettings, setStoreSettings] = useState<Record<string, StoreSettings>>({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 店舗設定を読み込み
  const loadStoreSettings = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      showLoading();
      const data = await StoreSettingsService.getAll(userId);
      const settingsMap: Record<string, StoreSettings> = {};
      data.forEach((setting) => {
        settingsMap[setting.storeCode] = setting;
      });
      setStoreSettings(settingsMap);
    } catch (error) {
      console.error('Error loading store settings:', error);
      showError('店舗設定の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
      hideLoading();
    }
  }, [userId, showLoading, hideLoading, showError]);

  // 設定の変更
  const changeStoreSetting = useCallback(
    (storeCode: string, field: 'salesRatio' | 'enabled', value: number | boolean) => {
      setStoreSettings((prev) => ({
        ...prev,
        [storeCode]: {
          ...(prev[storeCode] || {
            id: storeCode,
            userId: userId || '',
            storeCode,
            salesRatio: 0,
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          [field]: value,
        },
      }));
    },
    [userId]
  );

  // 設定を保存
  const saveStoreSettings = useCallback(async () => {
    if (!userId) return;

    try {
      showLoading();
      const settingsToSave = Object.values(storeSettings).map((setting) => ({
        storeCode: setting.storeCode,
        salesRatio: setting.salesRatio,
        enabled: setting.enabled,
      }));

      await StoreSettingsService.batchUpsert(userId, settingsToSave);
      showSuccess('販売構成比を保存しました');
    } catch (error) {
      console.error('Error saving store settings:', error);
      showError('販売構成比の保存に失敗しました');
      throw error;
    } finally {
      hideLoading();
    }
  }, [userId, storeSettings, showLoading, hideLoading, showSuccess, showError]);

  // カテゴリーフィルターのトグル
  const toggleCategoryFilter = useCallback((categoryId: string) => {
    setSelectedCategoryFilter((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  return {
    storeSettings,
    selectedCategoryFilter,
    isLoading,
    loadStoreSettings,
    changeStoreSetting,
    saveStoreSettings,
    toggleCategoryFilter,
  };
};
