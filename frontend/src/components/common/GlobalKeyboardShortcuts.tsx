import React, { useState } from 'react';
import { useKeyboardShortcuts, GLOBAL_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { ShortcutsHelpDialog } from '@/components/common/ShortcutsHelpDialog';
import { useThemeContext } from '@/context/ThemeContext';

/**
 * グローバルキーボードショートカット
 *
 * アプリケーション全体で利用可能なキーボードショートカットを管理します。
 * - ダークモード切り替え
 * - ショートカットヘルプ表示
 * - ページナビゲーション
 */
export const GlobalKeyboardShortcuts: React.FC = () => {
  const { toggleTheme } = useThemeContext();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  /**
   * グローバルショートカットの定義
   */
  useKeyboardShortcuts([
    {
      key: GLOBAL_SHORTCUTS.TOGGLE_THEME,
      description: 'ダークモード切り替え',
      handler: () => {
        toggleTheme();
      },
    },
    {
      key: GLOBAL_SHORTCUTS.SHOW_SHORTCUTS,
      description: 'ショートカットヘルプを表示',
      handler: () => {
        setHelpDialogOpen(true);
      },
    },
    // ページナビゲーション用のショートカット（必要に応じて有効化）
    // {
    //   key: GLOBAL_SHORTCUTS.NEXT_STEP,
    //   description: '次のステップへ',
    //   handler: () => {
    //     // 実装はページごとに異なる
    //   },
    // },
  ]);

  return (
    <ShortcutsHelpDialog
      open={helpDialogOpen}
      onClose={() => setHelpDialogOpen(false)}
    />
  );
};
