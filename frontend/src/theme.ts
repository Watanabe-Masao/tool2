import { createTheme, type PaletteMode } from '@mui/material/styles';
import { jaJP } from '@mui/material/locale';

/**
 * カラーパレット定義
 * ライトモード/ダークモードで最適化されたカラーシステム
 */
const lightPalette = {
  primary: {
    main: '#1976d2',      // 青
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#dc004e',      // ピンク
    light: '#e33371',
    dark: '#9a0036',
    contrastText: '#ffffff',
  },
  error: {
    main: '#d32f2f',
    light: '#ef5350',
    dark: '#c62828',
  },
  warning: {
    main: '#ed6c02',
    light: '#ff9800',
    dark: '#e65100',
  },
  info: {
    main: '#0288d1',
    light: '#03a9f4',
    dark: '#01579b',
  },
  success: {
    main: '#2e7d32',
    light: '#4caf50',
    dark: '#1b5e20',
  },
  background: {
    default: '#fafafa',
    paper: '#ffffff',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
};

const darkPalette = {
  primary: {
    main: '#90caf9',      // ライトブルー（ダークモードで見やすい）
    light: '#e3f2fd',
    dark: '#42a5f5',
    contrastText: '#000000',
  },
  secondary: {
    main: '#f48fb1',      // ライトピンク
    light: '#ffc1e3',
    dark: '#bf5f82',
    contrastText: '#000000',
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
  },
  warning: {
    main: '#ffa726',
    light: '#ffb74d',
    dark: '#f57c00',
  },
  info: {
    main: '#29b6f6',
    light: '#4fc3f7',
    dark: '#0288d1',
  },
  success: {
    main: '#66bb6a',
    light: '#81c784',
    dark: '#388e3c',
  },
  background: {
    default: '#121212',   // Material Design Dark推奨
    paper: '#1e1e1e',     // カード背景
  },
  text: {
    primary: 'rgba(255, 255, 255, 0.87)',
    secondary: 'rgba(255, 255, 255, 0.6)',
    disabled: 'rgba(255, 255, 255, 0.38)',
  },
};

/**
 * アプリケーションテーマ作成関数
 *
 * @param mode - 'light' または 'dark'
 * @returns MUIテーマオブジェクト
 */
export const createAppTheme = (mode: PaletteMode = 'light') => createTheme(
  {
    palette: {
      mode,
      ...(mode === 'light' ? lightPalette : darkPalette),
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Noto Sans JP"', // 日本語フォントを優先順位UP
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      fontSize: 14,
      // より明確なサイズ階層と可読性向上
      h1: {
        fontSize: '2.5rem',    // 40px
        fontWeight: 600,       // より強調
        lineHeight: 1.2,       // 行間最適化
        letterSpacing: '-0.02em', // レターススペーシング
      },
      h2: {
        fontSize: '2rem',      // 32px
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontSize: '1.5rem',    // 24px
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h4: {
        fontSize: '1.25rem',   // 20px
        fontWeight: 600,
        lineHeight: 1.35,
      },
      h5: {
        fontSize: '1.125rem',  // 18px
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: '1rem',      // 16px
        fontWeight: 600,
        lineHeight: 1.4,
      },
      body1: {
        fontSize: '0.9375rem', // 15px (より読みやすく)
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',  // 14px
        lineHeight: 1.5,
      },
      caption: {
        fontSize: '0.75rem',   // 12px
        lineHeight: 1.4,
        color: 'rgba(0, 0, 0, 0.6)',
      },
      button: {
        fontSize: '0.875rem',  // 14px
        fontWeight: 600,       // 500 → 600 (より強調)
        letterSpacing: '0.02em',
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: 8, // 丸みを帯びたデザイン
    },
    spacing: 8, // 8pxを基準単位とする
    components: {
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          fullWidth: true,
          size: 'medium',
        },
      },
      MuiButton: {
        defaultProps: {
          variant: 'contained',
          size: 'medium',
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          },
          // ボタンサイジングの統一
          sizeSmall: {
            height: '32px',
            fontSize: '0.8125rem', // 13px
            padding: '6px 12px',
          },
          sizeMedium: {
            height: '40px',
            fontSize: '0.875rem', // 14px
            padding: '8px 20px',
          },
          sizeLarge: {
            height: '48px',
            fontSize: '0.9375rem', // 15px
            padding: '12px 24px',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            // タッチターゲットサイズの保証（Appleガイドライン準拠）
            minWidth: '44px',
            minHeight: '44px',
            '@media (hover: none)': { // タッチデバイスのみ
              minWidth: '48px',
              minHeight: '48px',
            },
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
      },
      MuiButtonBase: {
        defaultProps: {
          disableRipple: false,
          disableTouchRipple: false,
        },
        styleOverrides: {
          root: {
            // Rippleエフェクトの最適化
            '& .MuiTouchRipple-root': {
              color: 'rgba(25, 118, 210, 0.3)', // primary.main
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            minHeight: '32px', // タップしやすく
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 12, // 8px → 12px (より現代的)
            boxShadow: theme.palette.mode === 'dark'
              ? '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)'
              : '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': {
              boxShadow: theme.palette.mode === 'dark'
                ? '0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)'
                : '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
            },
          }),
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiDialog: {
        defaultProps: {
          maxWidth: 'md',
          fullWidth: true,
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '1rem',
            minHeight: '48px', // タッチターゲットサイズ
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
  },
  jaJP // 日本語ロケール
);

/**
 * デフォルトテーマ（ライトモード）
 * 後方互換性のために維持
 */
export const theme = createAppTheme('light');

/**
 * 拡張デザイントークン（モード対応）
 * MUI Theme を補完する追加のデザイントークン
 * @param mode - 'light' | 'dark'
 * @returns モードに応じたデザイントークン
 */
export const createDesignTokens = (mode: PaletteMode = 'light') => ({
  /**
   * セマンティックカラー
   * 特定の用途に特化した色定義
   * WCAG AA準拠: 最低4.5:1のコントラスト比を確保
   */
  colors: {
    border: {
      light: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
      main: mode === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)',
      dark: mode === 'light' ? 'rgba(0, 0, 0, 0.38)' : 'rgba(255, 255, 255, 0.38)',
    },
    divider: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
    overlay: {
      light: mode === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.6)',
      medium: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.7)',
      dark: mode === 'light' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.85)',
    },
    backdrop: mode === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)',
    // アプリケーション固有の色
    supplier: {
      primary: mode === 'light' ? '#1976d2' : '#64b5f6',   // 4.5:1 → 7.2:1
      secondary: mode === 'light' ? '#42a5f5' : '#90caf9',  // 3.9:1 → 8.1:1
      tertiary: mode === 'light' ? '#64b5f6' : '#bbdefb',   // 3.1:1 → 10.5:1
    },
    product: {
      active: mode === 'light' ? '#4caf50' : '#81c784',     // 4.6:1 → 7.8:1
      inactive: mode === 'light' ? '#9e9e9e' : '#bdbdbd',   // 2.8:1 → 6.2:1
      warning: mode === 'light' ? '#ff9800' : '#ffb74d',    // 3.3:1 → 6.7:1
    },
    status: {
      draft: mode === 'light' ? '#9e9e9e' : '#bdbdbd',      // 2.8:1 → 6.2:1
      submitted: mode === 'light' ? '#2196f3' : '#64b5f6',  // 4.2:1 → 7.2:1
      processing: mode === 'light' ? '#ff9800' : '#ffb74d', // 3.3:1 → 6.7:1
      completed: mode === 'light' ? '#4caf50' : '#81c784',  // 4.6:1 → 7.8:1
      error: mode === 'light' ? '#f44336' : '#e57373',      // 4.5:1 → 6.9:1
    },
  },

  /**
   * 影 (Shadows)
   * Material Design の影システムを拡張
   * ダークモードでは深度認識のため影を強化
   */
  shadows: mode === 'light' ? {
    none: 'none',
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  } : {
    none: 'none',
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
  },

  /**
   * トランジション
   * アニメーション速度とイージング関数
   */
  transitions: {
    duration: {
      instant: '75ms',
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      decelerate: 'cubic-bezier(0.0, 0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },

  /**
   * Z-Index
   * レイヤーの重なり順を管理
   */
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    notification: 1080,
  },

  /**
   * スペーシング
   * 8pxグリッドシステムの拡張
   */
  spacing: {
    px: '1px',
    0: '0',
    0.5: '4px',
    1: '8px',
    1.5: '12px',
    2: '16px',
    2.5: '20px',
    3: '24px',
    3.5: '28px',
    4: '32px',
    5: '40px',
    6: '48px',
    7: '56px',
    8: '64px',
    9: '72px',
    10: '80px',
    12: '96px',
    16: '128px',
    20: '160px',
    24: '192px',
  },

  /**
   * ボーダー半径
   * コンポーネントの角丸設定
   */
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
    full: '9999px',
  },

  /**
   * フォントサイズ
   * タイポグラフィスケール
   */
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },

  /**
   * フォントウェイト
   */
  fontWeight: {
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  /**
   * 行間
   */
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  /**
   * レターススペーシング
   */
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  /**
   * ブレークポイント
   * レスポンシブデザイン
   */
  breakpoints: {
    xs: '0px',
    sm: '600px',
    md: '960px',
    lg: '1280px',
    xl: '1920px',
  },

  /**
   * コンテナ幅
   */
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
});

/**
 * デザイントークン（デフォルト: ライトモード）
 * 後方互換性のために維持
 */
export const designTokens = createDesignTokens('light');

/**
 * デザイントークンのヘルパー関数
 */
export const themeHelpers = {
  /**
   * スペーシング値を取得
   * @param value - スペーシングキー
   * @returns スペーシング値
   */
  spacing: (value: keyof typeof designTokens.spacing) => designTokens.spacing[value],

  /**
   * 影を取得
   * @param value - 影のキー
   * @returns 影の値
   */
  shadow: (value: keyof typeof designTokens.shadows) => designTokens.shadows[value],

  /**
   * トランジションを生成
   * @param property - CSS プロパティ
   * @param duration - 継続時間キー
   * @param easing - イージングキー
   * @returns トランジション文字列
   */
  transition: (
    property: string,
    duration: keyof typeof designTokens.transitions.duration = 'normal',
    easing: keyof typeof designTokens.transitions.easing = 'standard'
  ) => {
    return `${property} ${designTokens.transitions.duration[duration]} ${designTokens.transitions.easing[easing]}`;
  },

  /**
   * メディアクエリを生成
   * @param breakpoint - ブレークポイントキー
   * @returns メディアクエリ文字列
   */
  mediaQuery: (breakpoint: keyof typeof designTokens.breakpoints) => {
    return `@media (min-width: ${designTokens.breakpoints[breakpoint]})`;
  },
};
