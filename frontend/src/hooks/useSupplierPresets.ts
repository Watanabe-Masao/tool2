import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

  // user.uidを安定した値として保持（オブジェクト参照ではなく値で比較）
  const userId = user?.uid;

  /**
   * プリセット一覧を読み込み
   * NOTE: 依存配列を空にして安定化
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
    // NOTE: refは安定しているため依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * プリセットを追加
   */
  const addPreset = useCallback(async (supplier: string, centerFeeRate?: number): Promise<boolean> => {
    if (!userRef.current) return false;

    try {
      await firestoreServiceRef.current.saveSupplierPreset(userRef.current.uid, supplier, centerFeeRate);
      await loadPresets(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to add supplier preset:', error);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPresets]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPresets]);

  /**
   * プリセットを更新
   */
  const updatePreset = useCallback(async (presetId: string, supplier: string, centerFeeRate?: number): Promise<boolean> => {
    try {
      await firestoreServiceRef.current.updateSupplierPreset(presetId, supplier, centerFeeRate);
      await loadPresets(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to update supplier preset:', error);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPresets]);

  // 初回読み込みとリアルタイム同期
  // NOTE: user.uidを依存配列に使用し、オブジェクト参照ではなく値で比較
  useEffect(() => {
    if (!userId) return;

    // リアルタイムリスナーを設定
    setLoading(true);
    let unsubscribe: (() => void) | null = null;
    let retryCount = 0;
    const maxRetries = 3;

    const setupListener = () => {
      unsubscribe = firestoreServiceRef.current.subscribeToSupplierPresets(
        userId,
        (data) => {
          setPresets(data);
          setLoading(false);
          retryCount = 0; // 成功したらリトライカウントをリセット
        },
        async (error) => {
          console.error('Failed to subscribe to supplier presets:', error);

          // リアルタイムリスナーが失敗した場合、通常のクエリにフォールバック
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying supplier presets subscription (${retryCount}/${maxRetries})...`);
            // 既存のリスナーをクリーンアップ
            if (unsubscribe) {
              unsubscribe();
              unsubscribe = null;
            }
            // 少し待ってからリトライ
            setTimeout(setupListener, 1000 * retryCount);
          } else {
            // リトライ上限に達した場合、一度だけ通常クエリを実行
            console.log('Falling back to one-time query for supplier presets');
            try {
              const data = await firestoreServiceRef.current.getSupplierPresets(userId);
              setPresets(data);
            } catch (fallbackError) {
              console.error('Fallback query also failed:', fallbackError);
            }
            setLoading(false);
          }
        }
      );
    };

    setupListener();

    // クリーンアップ
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // NOTE: userIdは文字列なので安定、firestoreServiceRefはrefなので安定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 戻り値をメモ化して安定した参照を維持
  return useMemo(
    () => ({
      presets,
      loading,
      loadPresets,
      addPreset,
      deletePreset,
      updatePreset,
    }),
    [presets, loading, loadPresets, addPreset, deletePreset, updatePreset]
  );
};

// Re-export for backward compatibility
export type { SupplierPresetEntity } from '@/types/entities';
