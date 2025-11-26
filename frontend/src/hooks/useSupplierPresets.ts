import { useState, useEffect, useCallback, useRef } from 'react';
import { useFirestoreServiceRef } from '@/context/ServiceContext';
import { useAuthContext } from '@/context/AuthContext';
import type { SupplierPresetEntity } from '@/types/entities';

/**
 * 帳合先プリセット管理フック
 *
 * NOTE: firestoreServiceはuseFirestoreServiceRefで取得し、
 * 依存配列に含めないことで無限ループ(React #185)を防止
 */
export const useSupplierPresets = () => {
  const { user } = useAuthContext();
  const firestoreServiceRef = useFirestoreServiceRef();
  const [presets, setPresets] = useState<SupplierPresetEntity[]>([]);
  const [loading, setLoading] = useState(false);

  // userをrefで保持して安定した参照を維持
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /**
   * プリセット一覧を読み込み
   * NOTE: 依存配列にfirestoreServiceを含めないことで無限ループを防止
   */
  const loadPresets = useCallback(async () => {
    if (!userRef.current) return;

    setLoading(true);
    try {
      const data = await firestoreServiceRef.current.getSupplierPresets(userRef.current.uid);
      setPresets(data);
    } catch (error) {
      console.error('Failed to load supplier presets:', error);
    } finally {
      setLoading(false);
    }
  }, [firestoreServiceRef]);

  /**
   * プリセットを追加
   */
  const addPreset = useCallback(async (supplier: string): Promise<boolean> => {
    if (!userRef.current) return false;

    try {
      await firestoreServiceRef.current.saveSupplierPreset(userRef.current.uid, supplier);
      await loadPresets(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to add supplier preset:', error);
      return false;
    }
  }, [firestoreServiceRef, loadPresets]);

  /**
   * プリセットを削除
   */
  const deletePreset = useCallback(async (presetId: string): Promise<boolean> => {
    try {
      await firestoreServiceRef.current.deleteSupplierPreset(presetId);
      await loadPresets(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to delete supplier preset:', error);
      return false;
    }
  }, [firestoreServiceRef, loadPresets]);

  /**
   * プリセットを更新
   */
  const updatePreset = useCallback(async (presetId: string, supplier: string): Promise<boolean> => {
    try {
      await firestoreServiceRef.current.updateSupplierPreset(presetId, supplier);
      await loadPresets(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to update supplier preset:', error);
      return false;
    }
  }, [firestoreServiceRef, loadPresets]);

  // 初回読み込みとリアルタイム同期
  // NOTE: firestoreServiceRefは安定した参照なので依存配列に含めても問題ない
  // userが変更された場合のみリスナーを再設定
  useEffect(() => {
    if (!user) return;

    // リアルタイムリスナーを設定
    setLoading(true);
    const unsubscribe = firestoreServiceRef.current.subscribeToSupplierPresets(
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
    // NOTE: firestoreServiceRefは安定した参照なので依存配列から除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
