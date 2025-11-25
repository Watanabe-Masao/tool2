import { useState, useEffect, useCallback } from 'react';
import { useFirestoreService } from '@/context/ServiceContext';
import { useAuthContext } from '@/context/AuthContext';
import type { PricingHistoryItem } from '@/types/hooks';

/**
 * 価格履歴フック
 *
 * 商品の価格履歴を管理します。
 * 商品名・規格・入数をキーとして、過去に使用した原価と売価を保存・呼び出しできます。
 */
export const usePricingHistory = () => {
  const [pricingHistory, setPricingHistory] = useState<PricingHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuthContext();
  const firestoreService = useFirestoreService();

  /**
   * 価格履歴をロード
   */
  const loadPricingHistory = useCallback(async () => {
    if (!user) {
      setPricingHistory([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const history = await firestoreService.getPricingHistory(user.uid);
      setPricingHistory(history);
    } catch (err) {
      console.error('[usePricingHistory] Failed to load pricing history:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user, firestoreService]);

  /**
   * 価格履歴を保存または更新
   *
   * 同じキー（商品名・規格・入数）の履歴が存在する場合は使用回数をインクリメント、
   * 存在しない場合は新規作成します。
   */
  const savePricingHistory = useCallback(async (
    productName: string,
    specification: string,
    quantityPerPackage: number,
    unit: string,
    centerCost: number,
    storeCost: number,
    priceExcludingTax: number,
    centerFeeRate?: number
  ): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      await firestoreService.savePricingHistory(
        user.uid,
        productName,
        specification,
        quantityPerPackage,
        unit,
        centerCost,
        storeCost,
        priceExcludingTax,
        centerFeeRate
      );
      // 履歴をリロード
      await loadPricingHistory();
    } catch (err) {
      console.error('[usePricingHistory] Failed to save pricing history:', err);
      throw err;
    }
  }, [user, firestoreService, loadPricingHistory]);

  /**
   * 価格履歴を削除
   */
  const deletePricingHistory = useCallback(async (historyId: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      await firestoreService.deletePricingHistory(historyId);
      // 履歴をリロード
      await loadPricingHistory();
    } catch (err) {
      console.error('[usePricingHistory] Failed to delete pricing history:', err);
      throw err;
    }
  }, [user, firestoreService, loadPricingHistory]);

  /**
   * 特定のキーに一致する価格履歴を検索
   */
  const findMatchingHistory = (
    productName: string,
    specification: string,
    quantityPerPackage: number
  ): PricingHistoryItem[] => {
    return pricingHistory.filter(
      (item) =>
        item.productName === productName &&
        item.specification === specification &&
        item.quantityPerPackage === quantityPerPackage
    );
  };

  /**
   * 初回ロード
   */
  useEffect(() => {
    loadPricingHistory();
  }, [loadPricingHistory]);

  return {
    pricingHistory,
    loading,
    error,
    loadPricingHistory,
    savePricingHistory,
    deletePricingHistory,
    findMatchingHistory,
  };
};

// Re-export for backward compatibility
export type { PricingHistoryItem } from '@/types/hooks';
