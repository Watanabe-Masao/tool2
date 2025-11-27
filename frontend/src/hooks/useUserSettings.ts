import { useState, useEffect, useRef } from 'react';
import { UserSettingsService } from '@/services/firebase/userSettingsService';
import type { UserSettings } from '@/types/userSettings';

/**
 * useUserSettings
 *
 * ユーザー設定の読み込みを管理するカスタムフック
 *
 * NOTE: user.uidを依存配列に使用し、オブジェクト参照ではなく値で比較することで
 * 無限ループ(React #185)を防止
 *
 * 責務:
 * - ユーザー設定の非同期読み込み
 * - ユーザー変更時の自動再読み込み
 * - エラーハンドリング
 *
 * @param user - 認証ユーザー情報
 * @returns ユーザー設定（読み込み中/未ログイン時はnull）
 *
 * @example
 * ```typescript
 * const { user } = useAuthContext();
 * const userSettings = useUserSettings(user);
 * ```
 */
export const useUserSettings = (user: { uid: string } | null): UserSettings | null => {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  // user.uidを安定した値として保持（オブジェクト参照ではなく値で比較）
  const userId = user?.uid;

  // userをrefで保持して非同期処理中の参照を安定化
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const loadUserSettings = async () => {
      if (!userId) {
        setUserSettings(null);
        return;
      }

      try {
        const settings = await UserSettingsService.getOrCreate(userId);
        setUserSettings(settings);
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };

    loadUserSettings();
  }, [userId]); // user.uidで比較（文字列なので安定）

  return userSettings;
};
