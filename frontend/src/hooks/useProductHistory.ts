import { useState, useEffect, useMemo } from 'react';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { useAuthContext } from '@/context/AuthContext';

/**
 * 商品履歴アイテム
 */
export interface ProductHistoryItem {
  id: string;
  supplier: string;
  name: string;
  origin: string;
  specification: string;
  quantityPerPackage: number | null;
  unit: string;
  usageCount: number;
}

/**
 * 商品履歴フック
 *
 * 帳合先に基づいた商品履歴を管理し、
 * 品名、産地、規格、入数の階層的なフィルタリングを提供します。
 */
export const useProductHistory = (supplier?: string) => {
  const { user } = useAuthContext();
  const [history, setHistory] = useState<ProductHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * 履歴を読み込み
   */
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const data = await FirestoreService.getProductHistory(user.uid, supplier);
        setHistory(data);
      } catch (error) {
        console.error('[useProductHistory] Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user, supplier]);

  /**
   * 品名の一意のリストを取得
   */
  const getUniqueNames = useMemo(() => {
    const names = new Map<string, number>();
    history.forEach((item) => {
      const current = names.get(item.name) || 0;
      names.set(item.name, current + item.usageCount);
    });
    // 使用回数順にソート
    return Array.from(names.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
  }, [history]);

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

  return {
    history,
    loading,
    getUniqueNames,
    getUniqueOrigins,
    getUniqueSpecifications,
    getUniqueQuantities,
    getUniqueUnits,
  };
};
