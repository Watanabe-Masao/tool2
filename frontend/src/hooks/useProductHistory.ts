import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFirestoreServiceRef } from '@/context/ServiceContext';
import { useAuthContext } from '@/context/AuthContext';
import type { ProductHistoryItem } from '@/types/hooks';

/**
 * 商品履歴フック
 *
 * 帳合先に基づいた商品履歴を管理し、
 * 品名、産地、規格、入数の階層的なフィルタリングを提供します。
 *
 * NOTE: firestoreServiceはuseFirestoreServiceRefで取得し、
 * suppliersはJSON.stringifyで安定化することで無限ループ(React #185)を防止
 */
export const useProductHistory = (suppliers?: string | string[], categoryCode?: string) => {
  const { user } = useAuthContext();
  const firestoreServiceRef = useFirestoreServiceRef();
  const [history, setHistory] = useState<ProductHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // suppliersをJSON文字列化して安定した比較を可能にする
  // NOTE: 配列の場合、毎回新しい参照になるため、内容で比較する必要がある
  // NOTE: undefinedの場合はnullとして扱い、JSON.parse時のエラーを防止
  const suppliersJson = useMemo(
    () => JSON.stringify(suppliers ?? null),
    [suppliers]
  );

  // userをrefで保持して安定した参照を維持
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /**
   * 履歴を読み込み
   * NOTE: 依存配列にfirestoreServiceを含めないことで無限ループを防止
   */
  const loadHistory = useCallback(async () => {
    if (!userRef.current) return;

    // suppliersJsonをパースして現在の値を取得
    const currentSuppliers = JSON.parse(suppliersJson) as string | string[] | undefined;

    setLoading(true);
    try {
      // suppliers が配列の場合、supplier条件なしで取得してから複数の帳合先でフィルタリング
      // suppliers が文字列の場合、その帳合先のみ取得
      // suppliers が undefined の場合、すべての帳合先の履歴を取得
      const supplierFilter = Array.isArray(currentSuppliers) ? undefined : currentSuppliers;
      const data = await firestoreServiceRef.current.getProductHistory(userRef.current.uid, supplierFilter);

      // suppliers が配列の場合、配列内の帳合先でフィルタリング
      if (Array.isArray(currentSuppliers) && currentSuppliers.length > 0) {
        const filtered = data.filter(item => currentSuppliers.includes(item.supplier));
        setHistory(filtered);
      } else {
        setHistory(data);
      }
    } catch (error) {
      console.error('[useProductHistory] Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }, [suppliersJson, firestoreServiceRef]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /**
   * 品名の一意のリストを取得（カテゴリーフィルタリング適用）
   */
  const getUniqueNames = useMemo(() => {
    // カテゴリーコードが指定されている場合はフィルタリング
    const filteredHistory = categoryCode
      ? history.filter((item) => item.categoryCode === categoryCode)
      : history;

    const names = new Map<string, number>();
    filteredHistory.forEach((item) => {
      const current = names.get(item.name) || 0;
      names.set(item.name, current + item.usageCount);
    });
    // 使用回数順にソート
    return Array.from(names.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
  }, [history, categoryCode]);

  /**
   * 指定した品名に基づいて、産地の一意のリストを取得
   */
  const getUniqueOrigins = useCallback((name: string) => {
    const filtered = history.filter((item) => item.name === name);
    const origins = new Map<string, number>();
    filtered.forEach((item) => {
      const current = origins.get(item.origin) || 0;
      origins.set(item.origin, current + item.usageCount);
    });
    return Array.from(origins.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
  }, [history]);

  /**
   * 指定した品名と産地に基づいて、規格の一意のリストを取得
   */
  const getUniqueSpecifications = useCallback((name: string, origin: string) => {
    const filtered = history.filter((item) => item.name === name && item.origin === origin);
    const specs = new Map<string, number>();
    filtered.forEach((item) => {
      const current = specs.get(item.specification) || 0;
      specs.set(item.specification, current + item.usageCount);
    });
    return Array.from(specs.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
  }, [history]);

  /**
   * 指定した品名、産地、規格に基づいて、入数の一意のリストを取得
   */
  const getUniqueQuantities = useCallback((name: string, origin: string, specification: string) => {
    const filtered = history.filter(
      (item) =>
        item.name === name && item.origin === origin && item.specification === specification
    );
    const quantities = new Map<number | null, number>();
    filtered.forEach((item) => {
      const current = quantities.get(item.quantityPerPackage) || 0;
      quantities.set(item.quantityPerPackage, current + item.usageCount);
    });
    return Array.from(quantities.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0])
      .filter((qty): qty is number => qty !== null); // Filter out null values
  }, [history]);

  /**
   * 指定した品名、産地、規格に基づいて、単位の一意のリストを取得
   */
  const getUniqueUnits = useCallback((name: string, origin: string, specification: string) => {
    const filtered = history.filter(
      (item) =>
        item.name === name && item.origin === origin && item.specification === specification
    );
    const units = new Map<string, number>();
    filtered.forEach((item) => {
      if (item.specificationUnit) {
        const current = units.get(item.specificationUnit) || 0;
        units.set(item.specificationUnit, current + item.usageCount);
      }
    });
    return Array.from(units.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
  }, [history]);

  /**
   * 履歴を削除
   */
  const deleteHistory = useCallback(async (
    conditions: {
      name?: string;
      origin?: string;
      specification?: string;
      quantityPerPackage?: number | null;
      unit?: string;
    },
    targetSupplier?: string
  ) => {
    if (!userRef.current) return;

    // 削除対象の帳合先を決定
    // targetSupplier が指定されていればそれを使用
    // suppliers が文字列の場合はそれを使用
    // それ以外の場合はエラー
    const currentSuppliers = JSON.parse(suppliersJson) as string | string[] | undefined;
    const supplier = targetSupplier || (typeof currentSuppliers === 'string' ? currentSuppliers : undefined);

    if (!supplier) {
      throw new Error('削除する履歴の帳合先を指定してください');
    }

    try {
      const count = await firestoreServiceRef.current.deleteProductHistoryByCondition(userRef.current.uid, {
        supplier,
        ...conditions,
      });

      // 履歴を再読み込み
      await loadHistory();

      return count;
    } catch (error) {
      console.error('[useProductHistory] Failed to delete history:', error);
      throw error;
    }
  }, [suppliersJson, firestoreServiceRef, loadHistory]);

  /**
   * 品名からカテゴリーコードを取得
   */
  const getCategoryCodeByName = useCallback((name: string): string | undefined => {
    const item = history.find((h) => h.name === name);
    return item?.categoryCode;
  }, [history]);

  // 戻り値をメモ化して安定した参照を維持（無限ループ防止）
  return useMemo(
    () => ({
      history,
      loading,
      getUniqueNames,
      getUniqueOrigins,
      getUniqueSpecifications,
      getUniqueQuantities,
      getUniqueUnits,
      deleteHistory,
      getCategoryCodeByName,
      loadHistory, // 履歴を再読み込み
    }),
    [
      history,
      loading,
      getUniqueNames,
      getUniqueOrigins,
      getUniqueSpecifications,
      getUniqueQuantities,
      getUniqueUnits,
      deleteHistory,
      getCategoryCodeByName,
      loadHistory,
    ]
  );
};

// Re-export for backward compatibility
export type { ProductHistoryItem } from '@/types/hooks';
