import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, type PaletteMode } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { createAppTheme } from '@/theme';

/**
 * テーマコンテキストの型定義
 */
interface ThemeContextType {
  /** 現在のテーマモード */
  mode: PaletteMode;
  /** テーマモードを切り替える */
  toggleTheme: () => void;
  /** テーマモードを直接設定する */
  setThemeMode: (mode: PaletteMode) => void;
}

/**
 * テーマコンテキスト
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * LocalStorageのキー
 */
const THEME_STORAGE_KEY = 'app-theme-mode';

/**
 * システムのダークモード設定を検出
 */
const getSystemThemePreference = (): PaletteMode => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

/**
 * 保存されたテーマ設定を取得
 */
const getSavedThemePreference = (): PaletteMode | null => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  }
  return null;
};

/**
 * テーマプロバイダーのProps
 */
interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * テーマプロバイダー
 *
 * アプリケーション全体のテーマ管理を行います。
 * - LocalStorageへの保存
 * - システム設定の自動検出
 * - リアルタイムなテーマ切り替え
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 初期テーマ: 保存された設定 > システム設定 > ライト
  const [mode, setMode] = useState<PaletteMode>(() => {
    return getSavedThemePreference() || getSystemThemePreference();
  });

  // テーマオブジェクトをメモ化
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  /**
   * テーマモードを切り替える
   */
  const toggleTheme = useCallback(() => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
      return newMode;
    });
  }, []);

  /**
   * テーマモードを直接設定する
   */
  const setThemeMode = useCallback((newMode: PaletteMode) => {
    setMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  }, []);

  /**
   * システムのテーマ設定変更を監視
   */
  useEffect(() => {
    // 保存された設定がある場合はシステム設定を無視
    if (getSavedThemePreference()) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newMode = e.matches ? 'dark' : 'light';
      setMode(newMode);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Context valueをメモ化して安定した参照を維持（無限ループ防止）
  const contextValue = useMemo<ThemeContextType>(
    () => ({
      mode,
      toggleTheme,
      setThemeMode,
    }),
    [mode, toggleTheme, setThemeMode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

/**
 * テーマコンテキストを使用するフック
 *
 * @returns テーマコンテキスト
 * @throws コンテキストが存在しない場合
 *
 * @example
 * ```tsx
 * const { mode, toggleTheme } = useThemeContext();
 *
 * <IconButton onClick={toggleTheme}>
 *   {mode === 'dark' ? <LightMode /> : <DarkMode />}
 * </IconButton>
 * ```
 */
export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
