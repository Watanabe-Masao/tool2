import { createTheme } from '@mui/material/styles';
import { jaJP } from '@mui/material/locale';

/**
 * MUIテーマ設定
 * 日本語対応 + カスタムカラー + 世界基準のUI/UX最適化
 */
export const theme = createTheme(
  {
    palette: {
      primary: {
        main: '#1976d2', // 青
        light: '#42a5f5',
        dark: '#1565c0',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#dc004e', // ピンク
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
          root: {
            borderRadius: 12, // 8px → 12px (より現代的)
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
            },
          },
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
