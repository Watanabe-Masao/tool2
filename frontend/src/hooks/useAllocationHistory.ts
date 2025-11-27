/**
 * useAllocationHistory
 *
 * 配分履歴を取得・管理するカスタムフック
 * カレンダーページや過去履歴の閲覧に使用
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseFirestore } from '@/services/firebase/config';
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
import type {
  AllocationBatch,
  AllocationDaySummary,
  AllocationHistoryView,
} from '@/types/allocationHistory';

/**
 * useAllocationHistoryの戻り値
 */
interface UseAllocationHistoryReturn {
  /** 日付別サマリー（カレンダー用） */
  daySummaries: AllocationDaySummary[];
  /** 選択された日付のバッチリスト */
  selectedDateBatches: AllocationBatch[];
  /** 選択されたバッチの詳細ビュー */
  selectedBatchView: AllocationHistoryView | null;
  /** 読み込み中フラグ */
  loading: boolean;
  /** エラー */
  error: Error | null;
  /** 表示中の月（YYYY-MM形式） */
  currentMonth: string;
  /** 月を変更 */
  setCurrentMonth: (month: string) => void;
  /** 日付を選択 */
  selectDate: (date: string) => Promise<void>;
  /** バッチを選択 */
  selectBatch: (batchId: string) => Promise<void>;
  /** 選択をクリア */
  clearSelection: () => void;
  /** データを再読み込み */
  reload: () => Promise<void>;
}

/**
 * 配分履歴を取得するカスタムフック
 *
 * @returns 配分履歴と関連メソッド
 *
 * @example
 * ```typescript
 * const {
 *   daySummaries,
 *   currentMonth,
 *   setCurrentMonth,
 *   selectDate,
 * } = useAllocationHistory();
 *
 * // カレンダーに日付別サマリーを表示
 * daySummaries.forEach(summary => {
 *   // summary.date, summary.batchCount, summary.totalProducts など
 * });
 * ```
 */
export const useAllocationHistory = (): UseAllocationHistoryReturn => {
  const { user } = useAuthContext();

  // 現在表示中の月
  const [currentMonth, setCurrentMonth] = useState<string>(() =>
    format(new Date(), 'yyyy-MM')
  );

  // 日付別サマリー
  const [daySummaries, setDaySummaries] = useState<AllocationDaySummary[]>([]);

  // 選択された日付のバッチ
  const [selectedDateBatches, setSelectedDateBatches] = useState<AllocationBatch[]>([]);

  // 選択されたバッチの詳細
  const [selectedBatchView, setSelectedBatchView] = useState<AllocationHistoryView | null>(
    null
  );

  // 読み込み状態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 月のデータを読み込み
   */
  const loadMonthData = useCallback(async () => {
    if (!user?.uid) {
      setDaySummaries([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      // 月の開始日と終了日を計算
      const monthDate = new Date(currentMonth + '-01');
      const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');

      // 日付別サマリーを取得
      const summaries = await firestoreService.getAllocationDaySummaries(
        user.uid,
        startDate,
        endDate
      );

      setDaySummaries(summaries);
    } catch (err) {
      console.error('[useAllocationHistory] Failed to load month data:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, currentMonth]);

  /**
   * 日付を選択してバッチリストを取得
   */
  const selectDate = useCallback(
    async (date: string) => {
      if (!user?.uid) return;

      try {
        setLoading(true);
        setSelectedBatchView(null);

        const db = getFirebaseFirestore();
        const firestoreService = new FirestoreServiceFacade(db);

        const batches = await firestoreService.getAllocationBatchesByDate(user.uid, date);
        setSelectedDateBatches(batches);
      } catch (err) {
        console.error('[useAllocationHistory] Failed to load batches:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [user?.uid]
  );

  /**
   * バッチを選択して詳細を取得
   */
  const selectBatch = useCallback(
    async (batchId: string) => {
      if (!user?.uid) return;

      try {
        setLoading(true);

        const db = getFirebaseFirestore();
        const firestoreService = new FirestoreServiceFacade(db);

        const view = await firestoreService.getAllocationHistoryView(user.uid, batchId);
        setSelectedBatchView(view);
      } catch (err) {
        console.error('[useAllocationHistory] Failed to load batch details:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [user?.uid]
  );

  /**
   * 選択をクリア
   */
  const clearSelection = useCallback(() => {
    setSelectedDateBatches([]);
    setSelectedBatchView(null);
  }, []);

  /**
   * データを再読み込み
   */
  const reload = useCallback(async () => {
    await loadMonthData();
  }, [loadMonthData]);

  /**
   * 月が変更されたときにデータを読み込み
   */
  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  // 戻り値をメモ化
  return useMemo(
    () => ({
      daySummaries,
      selectedDateBatches,
      selectedBatchView,
      loading,
      error,
      currentMonth,
      setCurrentMonth,
      selectDate,
      selectBatch,
      clearSelection,
      reload,
    }),
    [
      daySummaries,
      selectedDateBatches,
      selectedBatchView,
      loading,
      error,
      currentMonth,
      selectDate,
      selectBatch,
      clearSelection,
      reload,
    ]
  );
};
