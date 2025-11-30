import { useState, useCallback, useEffect, useMemo } from 'react';
import { format, subDays, addMonths } from 'date-fns';
import { getFirebaseFirestore } from '@/services/firebase/config';
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
import { StoreCategoryService } from '@/services/firebase/storeCategoryService';
import type { AllocationBatch, AllocationDetail } from '@/types/allocationHistory';
import type { StoreCategory } from '@/types/storeCategory';
import type { CalendarEvent, PreviewProduct } from '@/components/calendar/GlassCalendar';

/**
 * 配分履歴バッチ管理フック
 *
 * データフェッチング、バッチ詳細取得、削除機能を提供します。
 *
 * @param userId - ユーザーID
 * @returns バッチデータと操作関数
 *
 * @example
 * ```tsx
 * const { batches, loading, error, fetchHistory, fetchBatchDetails, deleteBatch } =
 *   useAllocationBatches(user?.uid);
 * ```
 */
export const useAllocationBatches = (userId: string | undefined) => {
  // 基本状態
  const [batches, setBatches] = useState<AllocationBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 詳細関連状態
  const [selectedBatch, setSelectedBatch] = useState<AllocationBatch | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string } | null>(null);
  const [details, setDetails] = useState<AllocationDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // プレビュー関連状態
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 店舗カテゴリ
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);

  // 削除関連状態
  const [deleting, setDeleting] = useState(false);

  /**
   * GlassCalendar用のイベントデータを生成
   */
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return batches.map((batch) => {
      // ファイル名がある場合はそれを使用、なければ帳合先名を使用
      const fileName = (batch as any).fileName;
      const displayTitle = fileName || batch.suppliers.join(', ');
      const productCount = batch.productCount || 0;

      return {
        id: batch.id || '',
        date: batch.deliveryDate,
        title: `${displayTitle} (${productCount}件)`,
        suppliers: batch.suppliers,
        data: batch,
      };
    });
  }, [batches]);

  /**
   * 履歴を取得（過去90日間）
   */
  const fetchHistory = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      const endDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');

      const fetchedBatches = await firestoreService.getAllocationBatchesByDateRange(
        userId,
        startDate,
        endDate
      );

      console.log('📦 取得したバッチ数:', fetchedBatches.length);
      console.log('📦 バッチ一覧:', fetchedBatches.map(b => ({ id: b.id, date: b.deliveryDate })));

      setBatches(fetchedBatches);
    } catch (err) {
      console.error('Failed to fetch allocation history:', err);
      setError('履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * バッチの詳細を取得
   */
  const fetchBatchDetails = useCallback(async (batch: AllocationBatch) => {
    if (!batch.id || !userId) return;

    setSelectedBatch(batch);
    setSelectedDateRange(null); // 日付範囲選択をクリア
    setDetailsLoading(true);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      const fetchedDetails = await firestoreService.getAllocationDetails(userId, batch.id);
      setDetails(fetchedDetails);
    } catch (err) {
      console.error('Failed to fetch batch details:', err);
      setError(`詳細の取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setDetailsLoading(false);
    }
  }, [userId]);

  /**
   * 日付範囲の詳細を取得
   */
  const fetchDateRangeDetails = useCallback(async (start: Date, end: Date) => {
    if (!userId) return;

    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    console.log('📅 Date range selected:', { startDate, endDate });

    setSelectedDateRange({ start: startDate, end: endDate });
    setSelectedBatch(null); // 単一バッチ選択をクリア
    setDetailsLoading(true);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      // 選択範囲のバッチを取得
      const rangeBatches = await firestoreService.getAllocationBatchesByDateRange(
        userId,
        startDate,
        endDate
      );

      console.log('📦 Found batches in range:', rangeBatches.length);

      // 各バッチの詳細を取得
      const allDetails: AllocationDetail[] = [];
      for (const batch of rangeBatches) {
        if (batch.id) {
          const batchDetails = await firestoreService.getAllocationDetails(userId, batch.id);
          // 各詳細に日付情報を追加
          batchDetails.forEach(detail => {
            (detail as any).deliveryDate = batch.deliveryDate;
          });
          allDetails.push(...batchDetails);
        }
      }

      console.log('📋 Total details fetched:', allDetails.length);
      setDetails(allDetails);
    } catch (err) {
      console.error('Failed to fetch date range details:', err);
      setError(`詳細の取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setDetailsLoading(false);
    }
  }, [userId]);

  /**
   * 選択日付変更時のプレビューデータ取得（複数日対応）
   */
  const fetchPreviewProducts = useCallback(async (dates: string[]) => {
    if (!userId) return;

    // 選択解除時はプレビューをクリア
    if (dates.length === 0) {
      setPreviewProducts([]);
      return;
    }

    // 選択された全日付のバッチを取得
    const selectedBatches = batches.filter(b => dates.includes(b.deliveryDate));

    if (selectedBatches.length === 0) {
      setPreviewProducts([]);
      return;
    }

    setPreviewLoading(true);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      // 各バッチの詳細を取得してマージ
      const allDetails: AllocationDetail[] = [];
      for (const batch of selectedBatches) {
        if (batch.id) {
          const batchDetails = await firestoreService.getAllocationDetails(userId, batch.id);
          allDetails.push(...batchDetails);
        }
      }

      // PreviewProduct形式に変換
      const previewData: PreviewProduct[] = allDetails.map((detail) => ({
        productName: detail.productName,
        origin: detail.origin || '',
        specification: detail.specification || '',
        supplier: selectedBatches.find(b => b.id === detail.batchId)?.suppliers[0] || '',
      }));

      setPreviewProducts(previewData);
    } catch (err) {
      console.error('Failed to fetch preview products:', err);
    } finally {
      setPreviewLoading(false);
    }
  }, [userId, batches]);

  /**
   * 店舗カテゴリーを取得
   */
  const fetchStoreCategories = useCallback(async () => {
    if (!userId) return;

    try {
      const categories = await StoreCategoryService.getAll(userId);
      setStoreCategories(categories);
    } catch (err) {
      console.error('Failed to fetch store categories:', err);
    }
  }, [userId]);

  /**
   * 配分履歴を削除
   */
  const deleteBatch = useCallback(async (batchId: string) => {
    if (!userId) return false;

    setDeleting(true);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      const success = await firestoreService.deleteAllocationBatch(userId, batchId);

      if (success) {
        // 一覧から削除
        setBatches((prev) => prev.filter((b) => b.id !== batchId));
        return true;
      } else {
        setError('削除に失敗しました');
        return false;
      }
    } catch (err) {
      console.error('Failed to delete batch:', err);
      setError(`削除に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [userId]);

  /**
   * 詳細モーダルを閉じる
   */
  const closeDetails = useCallback(() => {
    setSelectedBatch(null);
    setSelectedDateRange(null);
    setDetails([]);
  }, []);

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 初回読み込み
   */
  useEffect(() => {
    fetchHistory();
    fetchStoreCategories();
  }, [fetchHistory, fetchStoreCategories]);

  return {
    // データ
    batches,
    selectedBatch,
    selectedDateRange,
    details,
    calendarEvents,
    previewProducts,
    storeCategories,

    // 状態
    loading,
    detailsLoading,
    previewLoading,
    deleting,
    error,

    // 操作関数
    fetchHistory,
    fetchBatchDetails,
    fetchDateRangeDetails,
    fetchPreviewProducts,
    deleteBatch,
    closeDetails,
    clearError,
  };
};

/**
 * useAllocationBatches の戻り値型
 */
export type UseAllocationBatchesReturn = ReturnType<typeof useAllocationBatches>;
