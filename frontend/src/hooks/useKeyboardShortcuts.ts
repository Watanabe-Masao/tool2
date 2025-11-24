import { useEffect, useCallback } from 'react';

/**
 * キーボードショートカットの定義
 */
export interface KeyboardShortcut {
  /** キーの組み合わせ（例: 'ctrl+s', 'cmd+enter'） */
  key: string;
  /** 説明 */
  description: string;
  /** 実行する関数 */
  handler: () => void;
  /** 有効/無効フラグ */
  enabled?: boolean;
}

/**
 * キーの組み合わせをパースする
 */
const parseKeyCombo = (combo: string): {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
} => {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];

  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('cmd') || parts.includes('meta'),
    key,
  };
};

/**
 * キーイベントがショートカットと一致するかチェック
 */
const matchesShortcut = (event: KeyboardEvent, combo: string): boolean => {
  const parsed = parseKeyCombo(combo);
  const key = event.key.toLowerCase();

  // 修飾キーのチェック
  const ctrlMatch = parsed.ctrl ? event.ctrlKey : !event.ctrlKey;
  const shiftMatch = parsed.shift ? event.shiftKey : !event.shiftKey;
  const altMatch = parsed.alt ? event.altKey : !event.altKey;
  const metaMatch = parsed.meta ? event.metaKey : !event.metaKey;

  // キーのチェック
  const keyMatch = key === parsed.key;

  return ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch;
};

/**
 * キーボードショートカットフック
 *
 * @param shortcuts - ショートカットの配列
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 'ctrl+s',
 *     description: '保存',
 *     handler: handleSave,
 *   },
 *   {
 *     key: 'ctrl+enter',
 *     description: '次のステップへ',
 *     handler: handleNext,
 *   },
 *   {
 *     key: 'ctrl+arrowleft',
 *     description: '前の商品へ',
 *     handler: () => handleProductNavigation(-1),
 *   },
 *   {
 *     key: 'ctrl+arrowright',
 *     description: '次の商品へ',
 *     handler: () => handleProductNavigation(1),
 *   },
 * ]);
 * ```
 */
export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 入力フィールド内では無効化
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // ショートカットを探索
      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) {
          continue;
        }

        if (matchesShortcut(event, shortcut.key)) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
};

/**
 * グローバルキーボードショートカットの定義
 */
export const GLOBAL_SHORTCUTS = {
  SAVE: 'ctrl+s',
  NEXT_STEP: 'ctrl+enter',
  PREV_PRODUCT: 'ctrl+arrowleft',
  NEXT_PRODUCT: 'ctrl+arrowright',
  TOGGLE_THEME: 'ctrl+shift+d',
  SHOW_SHORTCUTS: 'ctrl+/',
} as const;
