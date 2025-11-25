import { useState, useEffect } from 'react';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { useAuthContext } from '@/context/AuthContext';
import type { SupplierPresetEntity } from '@/types/entities';

/**
 * 帳合先プリセット管理フック
 */
export const useSupplierPresets = () => {
  const { user } = useAuthContext();
  const [presets, setPresets] = useState<SupplierPresetEntity[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * プリセット一覧を読み込み
   */
  const loadPresets = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const presets = await FirestoreService.getSupplierPresets(user.uid);
      setPresets(presets);
    } catch (error) {
      console.error('Failed to load supplier presets:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * プリセットを追加
   */
  const addPreset = async (supplier: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await FirestoreService.saveSupplierPreset(user.uid, supplier);
      await loadPresets(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to add supplier preset:', error);
      return false;
    }
  };

  /**
   * プリセットを削除
   */
  const deletePreset = async (presetId: string): Promise<boolean> => {
    try {
      await FirestoreService.deleteSupplierPreset(presetId);
      await loadPresets(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to delete supplier preset:', error);
      return false;
    }
  };

  /**
   * プリセットを更新
   */
  const updatePreset = async (presetId: string, supplier: string): Promise<boolean> => {
    try {
      await FirestoreService.updateSupplierPreset(presetId, supplier);
      await loadPresets(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to update supplier preset:', error);
      return false;
    }
  };

  // 初回読み込みとリアルタイム同期
  useEffect(() => {
    if (!user) return;

    // リアルタイムリスナーを設定
    setLoading(true);
    const unsubscribe = FirestoreService.subscribeToSupplierPresets(
      user.uid,
      (presets) => {
        setPresets(presets);
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
  }, [user]);

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
