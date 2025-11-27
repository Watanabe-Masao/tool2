import { useState, useCallback } from 'react';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { SaveAllocationHistoryInput } from '@/types/allocationHistory';
import { useAuthContext } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { getFirebaseFirestore } from '@/services/firebase/config';
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';

/**
 * useAllocationHistorySaveの戻り値
 */
interface UseAllocationHistorySaveReturn {
  /** 配分履歴を保存する */
  saveHistory: (formData: OrderFormData) => Promise<string | null>;
  /** 保存中かどうか */
  isSaving: boolean;
  /** 最後に保存したバッチID */
  lastSavedBatchId: string | null;
  /** 保存エラー */
  saveError: string | null;
}

/**
 * useAllocationHistorySave
 *
 * 配分履歴の保存機能を提供するカスタムフック
 *
 * 責務:
 * - 配分データをFirestoreに保存
 * - 保存状態の管理
 *
 * @example
 * ```typescript
 * const { saveHistory, isSaving } = useAllocationHistorySave();
 *
 * const handleSave = async () => {
 *   const batchId = await saveHistory(formData);
 *   if (batchId) {
 *     console.log('Saved with batchId:', batchId);
 *   }
 * };
 * ```
 */
export const useAllocationHistorySave = (): UseAllocationHistorySaveReturn => {
  const { user } = useAuthContext();
  const { showSuccess, showError } = useNotification();

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedBatchId, setLastSavedBatchId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * 配分履歴を保存
   */
  const saveHistory = useCallback(
    async (formData: OrderFormData): Promise<string | null> => {
      if (!user) {
        setSaveError('ログインが必要です');
        showError('ログインが必要です');
        return null;
      }

      setIsSaving(true);
      setSaveError(null);

      try {
        const db = getFirebaseFirestore();
        const firestoreService = new FirestoreServiceFacade(db);

        // SaveAllocationHistoryInputに変換
        const input: SaveAllocationHistoryInput = {
          deliveryDate: formData.deliveryDate,
          suppliers: formData.suppliers,
          products: formData.products.map((product) => ({
            name: product.name,
            origin: product.origin,
            specification: product.specification,
            supplier: product.supplier,
            categoryCode: product.categoryCode,
            totalDelivery: product.totalDelivery,
            storeAllocations: product.storeAllocations,
            // 既存のフォームデータにはこれらのフィールドがないのでデフォルト値を使用
            allocationMethod: 'manual' as const,
            hasManualAdjustment: true,
          })),
        };

        const batchId = await firestoreService.saveAllocationHistory(user.uid, input);

        setLastSavedBatchId(batchId);
        showSuccess('配分履歴を保存しました');

        return batchId;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '配分履歴の保存に失敗しました';
        setSaveError(errorMessage);
        showError(errorMessage);
        console.error('Failed to save allocation history:', error);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [user, showSuccess, showError]
  );

  return {
    saveHistory,
    isSaving,
    lastSavedBatchId,
    saveError,
  };
};
