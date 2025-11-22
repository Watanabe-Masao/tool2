import { useState, useEffect } from 'react';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { useAuthContext } from '@/context/AuthContext';

/**
 * 価格履歴アイテム
 */
export interface PricingHistoryItem {
  id: string;
  /** 商品名 */
  productName: string;
  /** 規格 */
  specification: string;
  /** 入数 */
  quantityPerPackage: number;
  /** 単位 */
  unit: string;
  /** センター着原価 */
  centerCost: number;
  /** 店着原価 */
  storeCost: number;
  /** 本体価格（税抜売価） */
  priceExcludingTax: number;
  /** センターフィー率（デフォルト13%） */
  centerFeeRate?: number;
  /** 使用回数 */
  usageCount: number;
  /** 最終使用日 */
  lastUsedAt: Date;
  /** 作成日 */
  createdAt: Date;
}

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

  /**
   * 価格履歴をロード
   */
  const loadPricingHistory = async () => {
    if (!user) {
      setPricingHistory([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const history = await FirestoreService.getPricingHistory(user.uid);
      setPricingHistory(history);
    } catch (err) {
      console.error('[usePricingHistory] Failed to load pricing history:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 価格履歴を保存または更新
   *
   * 同じキー（商品名・規格・入数）の履歴が存在する場合は使用回数をインクリメント、
   * 存在しない場合は新規作成します。
   */
  const savePricingHistory = async (
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
      await FirestoreService.savePricingHistory(
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
  };

  /**
   * 価格履歴を削除
   */
  const deletePricingHistory = async (historyId: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      await FirestoreService.deletePricingHistory(historyId);
      // 履歴をリロード
      await loadPricingHistory();
    } catch (err) {
      console.error('[usePricingHistory] Failed to delete pricing history:', err);
      throw err;
    }
  };

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
  }, [user]);

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
