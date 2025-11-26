import { useState, useEffect, useCallback, useRef } from 'react';
import { useFirestoreServiceRef } from '@/context/ServiceContext';
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
 * NOTE: firestoreServiceはuseFirestoreServiceRefで取得し、
 * 依存配列に含めないことで無限ループ(React #185)を防止
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
  const firestoreServiceRef = useFirestoreServiceRef();
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // NOTE: lastFetchをuseRefに変更して無限ループ(React #185)を防止
  // 状態ではなくrefなので、更新しても再レンダリングを引き起こさない
  const lastFetchRef = useRef<number>(0);

  // userをrefで保持して安定した参照を維持
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /**
   * 履歴を取得
   * NOTE: 依存配列にfirestoreServiceを含めないことで無限ループを防止
   */
  const fetchHistory = useCallback(async () => {
    if (!userRef.current) {
      setOptions([]);
      return;
    }

    // キャッシュ確認（5分以内なら再取得しない）
    const now = Date.now();
    if (now - lastFetchRef.current < QUERY_CACHE_TIME.SHORT) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const history = await firestoreServiceRef.current.getAutocompleteHistory(userRef.current.uid, field);
      setOptions(history);
      lastFetchRef.current = now;
    } catch (err) {
      console.error(`[useAutocomplete] Error fetching history for ${field}:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
    // NOTE: refは安定しているため依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field]);

  /**
   * 初回マウント時に履歴を取得
   */
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /**
   * 履歴に追加
   * NOTE: 依存配列にfirestoreServiceを含めないことで無限ループを防止
   */
  const addToHistory = useCallback(
    async (value: string) => {
      if (!userRef.current || !value || value.trim() === '') {
        return;
      }

      try {
        await firestoreServiceRef.current.saveAutocompleteHistory(userRef.current.uid, field, value);

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
    // NOTE: refは安定しているため依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [field]
  );

  /**
   * 履歴を再取得
   */
  const refetch = useCallback(async () => {
    lastFetchRef.current = 0; // キャッシュをクリア
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
