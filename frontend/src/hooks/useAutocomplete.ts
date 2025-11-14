import { useState, useEffect, useCallback } from 'react';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { useAuthContext } from '@/context/AuthContext';
import { QUERY_CACHE_TIME } from '@/utils/constants';

/**
 * オートコンプリートフックの戻り値
 */
interface UseAutocompleteReturn {
  /** オートコンプリート候補 */
  options: string[];
  /** ローディング中かどうか */
  loading: boolean;
  /** エラー */
  error: Error | null;
  /** 履歴を追加 */
  addToHistory: (value: string) => Promise<void>;
  /** 履歴を再取得 */
  refetch: () => Promise<void>;
}

/**
 * オートコンプリートフック
 *
 * Firestoreから過去の入力履歴を取得し、オートコンプリート候補として提供します。
 * 新しい値を追加すると、Firestoreに自動的に保存されます。
 *
 * 使用例:
 * ```tsx
 * const { options, loading, addToHistory } = useAutocomplete('supplier');
 *
 * <Autocomplete
 *   options={options}
 *   loading={loading}
 *   onChange={(_, value) => {
 *     if (value) addToHistory(value);
 *   }}
 * />
 * ```
 */
export const useAutocomplete = (
  field: 'productName' | 'origin' | 'specification' | 'supplier'
): UseAutocompleteReturn => {
  const { user } = useAuthContext();
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  /**
   * 履歴を取得
   */
  const fetchHistory = useCallback(async () => {
    if (!user) {
      setOptions([]);
      return;
    }

    // キャッシュ確認（5分以内なら再取得しない）
    const now = Date.now();
    if (now - lastFetch < QUERY_CACHE_TIME.SHORT) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const history = await FirestoreService.getAutocompleteHistory(user.uid, field);
      setOptions(history);
      setLastFetch(now);
    } catch (err) {
      console.error(`[useAutocomplete] Error fetching history for ${field}:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user, field, lastFetch]);

  /**
   * 初回マウント時に履歴を取得
   */
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /**
   * 履歴に追加
   */
  const addToHistory = useCallback(
    async (value: string) => {
      if (!user || !value || value.trim() === '') {
        return;
      }

      try {
        await FirestoreService.saveAutocompleteHistory(user.uid, field, value);

        // ローカルの候補リストを更新
        setOptions((prev) => {
          if (prev.includes(value)) {
            // 既存の値を先頭に移動
            return [value, ...prev.filter((v) => v !== value)];
          } else {
            // 新しい値を追加
            return [value, ...prev].slice(0, 50); // 最大50件
          }
        });
      } catch (err) {
        console.error(`[useAutocomplete] Error adding to history for ${field}:`, err);
      }
    },
    [user, field]
  );

  /**
   * 履歴を再取得
   */
  const refetch = useCallback(async () => {
    setLastFetch(0); // キャッシュをクリア
    await fetchHistory();
  }, [fetchHistory]);

  return {
    options,
    loading,
    error,
    addToHistory,
    refetch,
  };
};
