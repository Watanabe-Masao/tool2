import { useState, useEffect } from 'react';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { useAuthContext } from '@/context/AuthContext';

export interface SupplierPreset {
  id: string;
  supplier: string;
  displayOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 帳合先プリセット管理フック
 */
export const useSupplierPresets = () => {
  const { user } = useAuthContext();
  const [presets, setPresets] = useState<SupplierPreset[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * プリセット一覧を読み込み
   */
  const loadPresets = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await FirestoreService.getSupplierPresets(user.uid);
      setPresets(data);
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

  /**
   * プリセットの並び順を変更
   */
  const reorderPresets = async (reorderedPresets: SupplierPreset[]): Promise<boolean> => {
    try {
      const updates = reorderedPresets.map((preset, index) => ({
        id: preset.id,
        displayOrder: index,
      }));
      await FirestoreService.reorderSupplierPresets(updates);
      return true;
    } catch (error) {
      console.error('Failed to reorder supplier presets:', error);
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
  }, [user]);

  return {
    presets,
    loading,
    loadPresets,
    addPreset,
    deletePreset,
    updatePreset,
    reorderPresets,
  };
};
