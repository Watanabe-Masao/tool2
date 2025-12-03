import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFirestoreServiceRef } from '@/context/ServiceContext';
import { useAuthContext } from '@/context/AuthContext';
import type { PricingHistoryItem } from '@/types/hooks';

/**
 * 価格履歴フック
 *
 * 商品の価格履歴を管理します。
 * 商品名・規格・入数をキーとして、過去に使用した原価と売価を保存・呼び出しできます。
 *
 * NOTE: firestoreServiceはuseFirestoreServiceRefで取得し、
 * 依存配列に含めないことで無限ループ(React #185)を防止
 */
export const usePricingHistory = () => {
  const [pricingHistory, setPricingHistory] = useState<PricingHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuthContext();
  const firestoreServiceRef = useFirestoreServiceRef();

  // userをrefで保持して安定した参照を維持
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /**
   * 価格履歴をロード
   * NOTE: 依存配列にfirestoreServiceを含めないことで無限ループを防止
   */
  const loadPricingHistory = useCallback(async () => {
    if (!userRef.current) {
      setPricingHistory([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const history = await firestoreServiceRef.current.getPricingHistory(userRef.current.uid);
      setPricingHistory(history);
    } catch (err) {
      console.error('[usePricingHistory] Failed to load pricing history:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
    // NOTE: refは安定しているため依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    specificationUnit: string,
    packageUnit: string,
    centerCost: number,
    storeCost: number,
    priceExcludingTax: number,
    centerFeeRate?: number
  ): Promise<void> => {
    if (!userRef.current) {
      throw new Error('User not authenticated');
    }

    try {
      await firestoreServiceRef.current.savePricingHistory(
        userRef.current.uid,
        productName,
        specification,
        quantityPerPackage,
        specificationUnit,
        packageUnit,
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
    // NOTE: refは安定しているため依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPricingHistory]);

  /**
   * 価格履歴を削除
   */
  const deletePricingHistory = useCallback(async (historyId: string): Promise<void> => {
    if (!userRef.current) {
      throw new Error('User not authenticated');
    }

    try {
      await firestoreServiceRef.current.deletePricingHistory(historyId);
      // 履歴をリロード
      await loadPricingHistory();
    } catch (err) {
      console.error('[usePricingHistory] Failed to delete pricing history:', err);
      throw err;
    }
    // NOTE: refは安定しているため依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPricingHistory]);

  /**
   * 初回ロード
   */
  useEffect(() => {
    loadPricingHistory();
  }, [loadPricingHistory]);

  // findMatchingHistoryをメモ化
  const findMatchingHistoryMemo = useCallback(
    (productName: string, specification: string, quantityPerPackage: number): PricingHistoryItem[] => {
      return pricingHistory.filter(
        (item) =>
          item.productName === productName &&
          item.specification === specification &&
          item.quantityPerPackage === quantityPerPackage
      );
    },
    [pricingHistory]
  );

  // 戻り値をメモ化して安定した参照を維持（無限ループ防止）
  return useMemo(
    () => ({
      pricingHistory,
      loading,
      error,
      loadPricingHistory,
      savePricingHistory,
      deletePricingHistory,
      findMatchingHistory: findMatchingHistoryMemo,
    }),
    [
      pricingHistory,
      loading,
      error,
      loadPricingHistory,
      savePricingHistory,
      deletePricingHistory,
      findMatchingHistoryMemo,
    ]
  );
};

// Re-export for backward compatibility
export type { PricingHistoryItem } from '@/types/hooks';
