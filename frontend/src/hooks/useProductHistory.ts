import { useState, useEffect, useMemo } from 'react';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { useAuthContext } from '@/context/AuthContext';
import type { ProductHistoryItem } from '@/types/hooks';

/**
 * 商品履歴フック
 *
 * 帳合先に基づいた商品履歴を管理し、
 * 品名、産地、規格、入数の階層的なフィルタリングを提供します。
 */
export const useProductHistory = (suppliers?: string | string[], categoryCode?: string) => {
  const { user } = useAuthContext();
  const [history, setHistory] = useState<ProductHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * 履歴を読み込み
   */
  const loadHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // suppliers が配列の場合、supplier条件なしで取得してから複数の帳合先でフィルタリング
      // suppliers が文字列の場合、その帳合先のみ取得
      // suppliers が undefined の場合、すべての帳合先の履歴を取得
      const supplierFilter = Array.isArray(suppliers) ? undefined : suppliers;
      const data = await FirestoreService.getProductHistory(user.uid, supplierFilter);

      // suppliers が配列の場合、配列内の帳合先でフィルタリング
      if (Array.isArray(suppliers) && suppliers.length > 0) {
        const filtered = data.filter(item => suppliers.includes(item.supplier));
        setHistory(filtered);
      } else {
        setHistory(data);
      }
    } catch (error) {
      console.error('[useProductHistory] Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, JSON.stringify(suppliers)]);

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
  const getUniqueOrigins = (name: string) => {
    const filtered = history.filter((item) => item.name === name);
    const origins = new Map<string, number>();
    filtered.forEach((item) => {
      const current = origins.get(item.origin) || 0;
      origins.set(item.origin, current + item.usageCount);
    });
    return Array.from(origins.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
  };

  /**
   * 指定した品名と産地に基づいて、規格の一意のリストを取得
   */
  const getUniqueSpecifications = (name: string, origin: string) => {
    const filtered = history.filter((item) => item.name === name && item.origin === origin);
    const specs = new Map<string, number>();
    filtered.forEach((item) => {
      const current = specs.get(item.specification) || 0;
      specs.set(item.specification, current + item.usageCount);
    });
    return Array.from(specs.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
  };

  /**
   * 指定した品名、産地、規格に基づいて、入数の一意のリストを取得
   */
  const getUniqueQuantities = (name: string, origin: string, specification: string) => {
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
  };

  /**
   * 指定した品名、産地、規格に基づいて、単位の一意のリストを取得
   */
  const getUniqueUnits = (name: string, origin: string, specification: string) => {
    const filtered = history.filter(
      (item) =>
        item.name === name && item.origin === origin && item.specification === specification
    );
    const units = new Map<string, number>();
    filtered.forEach((item) => {
      if (item.unit) {
        const current = units.get(item.unit) || 0;
        units.set(item.unit, current + item.usageCount);
      }
    });
    return Array.from(units.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
  };

  /**
   * 履歴を削除
   */
  const deleteHistory = async (
    conditions: {
      name?: string;
      origin?: string;
      specification?: string;
      quantityPerPackage?: number;
      unit?: string;
    },
    targetSupplier?: string
  ) => {
    if (!user) return;

    // 削除対象の帳合先を決定
    // targetSupplier が指定されていればそれを使用
    // suppliers が文字列の場合はそれを使用
    // それ以外の場合はエラー
    const supplier = targetSupplier || (typeof suppliers === 'string' ? suppliers : undefined);

    if (!supplier) {
      throw new Error('削除する履歴の帳合先を指定してください');
    }

    try {
      const count = await FirestoreService.deleteProductHistoryByCondition(user.uid, {
        supplier,
        ...conditions,
      });
      console.log(`[useProductHistory] Deleted ${count} items`);

      // 履歴を再読み込み
      await loadHistory();

      return count;
    } catch (error) {
      console.error('[useProductHistory] Failed to delete history:', error);
      throw error;
    }
  };

  /**
   * 品名からカテゴリーコードを取得
   */
  const getCategoryCodeByName = (name: string): string | undefined => {
    const item = history.find((h) => h.name === name);
    return item?.categoryCode;
  };

  return {
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
  };
};
