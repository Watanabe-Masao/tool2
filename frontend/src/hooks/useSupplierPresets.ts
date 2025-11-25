import { useState, useEffect, useCallback } from 'react';
import { useFirestoreService } from '@/context/ServiceContext';
import { useAuthContext } from '@/context/AuthContext';
import type { SupplierPresetEntity } from '@/types/entities';

/**
 * 帳合先プリセット管理フック
 */
export const useSupplierPresets = () => {
  const { user } = useAuthContext();
  const firestoreService = useFirestoreService();
  const [presets, setPresets] = useState<SupplierPresetEntity[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * プリセット一覧を読み込み
   */
  const loadPresets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await firestoreService.getSupplierPresets(user.uid);
      setPresets(data);
    } catch (error) {
      console.error('Failed to load supplier presets:', error);
    } finally {
      setLoading(false);
    }
  }, [user, firestoreService]);

  /**
   * プリセットを追加
   */
  const addPreset = useCallback(async (supplier: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await firestoreService.saveSupplierPreset(user.uid, supplier);
      await loadPresets(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to add supplier preset:', error);
      return false;
    }
  }, [user, firestoreService, loadPresets]);

  /**
   * プリセットを削除
   */
  const deletePreset = useCallback(async (presetId: string): Promise<boolean> => {
    try {
      await firestoreService.deleteSupplierPreset(presetId);
      await loadPresets(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to delete supplier preset:', error);
      return false;
    }
  }, [firestoreService, loadPresets]);

  /**
   * プリセットを更新
   */
  const updatePreset = useCallback(async (presetId: string, supplier: string): Promise<boolean> => {
    try {
      await firestoreService.updateSupplierPreset(presetId, supplier);
      await loadPresets(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to update supplier preset:', error);
      return false;
    }
  }, [firestoreService, loadPresets]);

  // 初回読み込みとリアルタイム同期
  useEffect(() => {
    if (!user) return;

    // リアルタイムリスナーを設定
    setLoading(true);
    const unsubscribe = firestoreService.subscribeToSupplierPresets(
      user.uid,
      (data) => {
        setPresets(data);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to subscribe to supplier presets:', error);
        setLoading(false);
      }
    );

    // クリーンアップ
    return () => {
      unsubscribe();
    };
  }, [user, firestoreService]);

  return {
    presets,
    loading,
    loadPresets,
    addPreset,
    deletePreset,
    updatePreset,
  };
};

// Re-export for backward compatibility
export type { SupplierPresetEntity } from '@/types/entities';
