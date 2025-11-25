import { useState, useEffect } from 'react';
import { UserSettingsService } from '@/services/firebase/userSettingsService';
import type { UserSettings } from '@/types/userSettings';

/**
 * useUserSettings
 *
 * ユーザー設定の読み込みを管理するカスタムフック
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

  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user) return;

      try {
        const settings = await UserSettingsService.getOrCreate(user.uid);
        setUserSettings(settings);
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };

    loadUserSettings();
  }, [user]);

  return userSettings;
};
