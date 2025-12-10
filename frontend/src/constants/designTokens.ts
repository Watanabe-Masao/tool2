/**
 * デザイントークン定数
 *
 * AIコーディング事故を防ぐため、デザイン値を一元管理します。
 * MUIテーマと連携しつつ、sx propで直接使用可能な形式で提供します。
 *
 * @example
 * ```tsx
 * import { FONT_SIZE, COLORS } from '@/constants/designTokens';
 *
 * <Box sx={{ fontSize: FONT_SIZE.xs, color: COLORS.text.secondary }}>
 *   Small text
 * </Box>
 * ```
 */

// ============================================
// フォントサイズ定数
// ============================================

/**
 * フォントサイズ定数
 *
 * MUIのtypographyシステムと整合性を保ちつつ、
 * sxプロパティで直接使用可能な形式で提供します。
 *
 * 推奨: 可能な限りMUIのvariant（Typography variant="body1"）を使用
 * やむを得ない場合のみこの定数を使用してください。
 */
export const FONT_SIZE = {
  /** 10px - バッジ、極小テキスト */
  '2xs': '0.625rem',
  /** 10.4px - バッジ内テキスト、補助情報 */
  xs: '0.65rem',
  /** 11.2px - 非常に小さいテキスト */
  'xs-plus': '0.7rem',
  /** 12px - キャプション、ラベル */
  sm: '0.75rem',
  /** 12.8px - 小さめのボディテキスト */
  'sm-plus': '0.8rem',
  /** 14px - body2相当 */
  base: '0.875rem',
  /** 14.4px - body1とbody2の中間 */
  'base-plus': '0.9rem',
  /** 15px - body1相当 */
  md: '0.9375rem',
  /** 16px - 標準テキスト */
  lg: '1rem',
  /** 17.6px - 少し大きめ */
  'lg-plus': '1.1rem',
  /** 18px - h5相当 */
  xl: '1.125rem',
  /** 20px - h4相当 */
  '2xl': '1.25rem',
  /** 24px - h3相当 */
  '3xl': '1.5rem',
  /** 32px - h2相当 */
  '4xl': '2rem',
  /** 40px - h1相当 */
  '5xl': '2.5rem',
} as const;

/**
 * レスポンシブフォントサイズ
 *
 * モバイル/デスクトップで異なるサイズを適用する場合に使用
 */
export const FONT_SIZE_RESPONSIVE = {
  /** モバイル: 0.7rem, デスクトップ: 0.875rem */
  tableCell: { xs: FONT_SIZE['xs-plus'], sm: FONT_SIZE.base },
  /** モバイル: 0.65rem, デスクトップ: 0.75rem */
  tableHeader: { xs: FONT_SIZE.xs, sm: FONT_SIZE.sm },
  /** モバイル: 0.75rem, デスクトップ: 0.85rem */
  subtotal: { xs: FONT_SIZE.sm, sm: '0.85rem' },
  /** モバイル: 0.8rem, デスクトップ: 0.9rem */
  grandtotal: { xs: FONT_SIZE['sm-plus'], sm: FONT_SIZE['base-plus'] },
  /** モバイル: 0.7rem, デスクトップ: 0.8rem */
  cardContent: { xs: FONT_SIZE['xs-plus'], sm: FONT_SIZE['sm-plus'] },
} as const;

// ============================================
// アイコンサイズ定数
// ============================================

/**
 * アイコンサイズ定数
 *
 * MUI Iconコンポーネントのfontプロパティやsx={{ fontSize }}で使用
 */
export const ICON_SIZE = {
  /** 12px - 極小アイコン */
  '2xs': 12,
  /** 14px - 非常に小さいアイコン */
  xs: 14,
  /** 16px - 小さいアイコン */
  sm: 16,
  /** 18px - 小さめアイコン */
  'sm-plus': 18,
  /** 20px - 標準アイコン */
  md: 20,
  /** 24px - 標準〜やや大きめ（MUIデフォルト） */
  base: 24,
  /** 28px - やや大きいアイコン */
  lg: 28,
  /** 32px - 大きいアイコン */
  xl: 32,
  /** 40px - 非常に大きいアイコン */
  '2xl': 40,
  /** 48px - 特大アイコン */
  '3xl': 48,
} as const;

// ============================================
// カラー定数
// ============================================

/**
 * カラー定数
 *
 * MUIパレットカラーのショートカット
 * sxプロパティで直接使用可能: sx={{ color: COLORS.primary.main }}
 *
 * 注: MUIのsx propでは 'primary.main' などの文字列形式が推奨
 * この定数は主にJSXの条件分岐やスタイル計算で使用
 */
export const COLORS = {
  /** プライマリカラー（青系） */
  primary: {
    main: 'primary.main',
    light: 'primary.light',
    dark: 'primary.dark',
    contrastText: 'primary.contrastText',
  },
  /** セカンダリカラー（ピンク系） */
  secondary: {
    main: 'secondary.main',
    light: 'secondary.light',
    dark: 'secondary.dark',
  },
  /** エラーカラー（赤系） */
  error: {
    main: 'error.main',
    light: 'error.light',
    dark: 'error.dark',
  },
  /** 警告カラー（オレンジ系） */
  warning: {
    main: 'warning.main',
    light: 'warning.light',
    dark: 'warning.dark',
  },
  /** 情報カラー（水色系） */
  info: {
    main: 'info.main',
    light: 'info.light',
    dark: 'info.dark',
  },
  /** 成功カラー（緑系） */
  success: {
    main: 'success.main',
    light: 'success.light',
    dark: 'success.dark',
  },
  /** テキストカラー */
  text: {
    primary: 'text.primary',
    secondary: 'text.secondary',
    disabled: 'text.disabled',
  },
  /** 背景カラー */
  background: {
    default: 'background.default',
    paper: 'background.paper',
  },
  /** グレースケール */
  grey: {
    50: 'grey.50',
    100: 'grey.100',
    200: 'grey.200',
    300: 'grey.300',
    400: 'grey.400',
    500: 'grey.500',
    600: 'grey.600',
    700: 'grey.700',
    800: 'grey.800',
    900: 'grey.900',
  },
  /** 共通カラー */
  common: {
    white: 'common.white',
    black: 'common.black',
  },
} as const;

/**
 * セマンティックカラー定数
 *
 * 特定の用途に特化した色定義
 * コンポーネント間で統一されたカラーを使用するために定義
 */
export const SEMANTIC_COLORS = {
  /** 小計行の背景（青系グラデーション開始） */
  subtotalBgStart: '#eff6ff',
  /** 小計行の背景（青系グラデーション終了） */
  subtotalBgEnd: '#dbeafe',
  /** 小計行のテキスト色 */
  subtotalText: '#3b82f6',
  /** 小計行のボーダー色 */
  subtotalBorder: '#93c5fd',
  /** 総計行のグラデーション開始 */
  grandtotalBgStart: '#6366f1',
  /** 総計行のグラデーション終了 */
  grandtotalBgEnd: '#8b5cf6',
  /** ホバー時の背景（薄い紫） */
  hoverBg: 'rgba(99, 102, 241, 0.04)',
  /** 選択時の背景 */
  selectedBg: 'rgba(99, 102, 241, 0.08)',
  /** ボーダーカラー（ライト） */
  borderLight: 'grey.100',
  /** ボーダーカラー（メイン） */
  borderMain: 'grey.200',
  /** ボーダーカラー（ダーク） */
  borderDark: 'grey.300',
  /** 無効状態 */
  disabled: 'grey.400',
  /** 警告背景（黄色系） */
  warningBg: '#fff8e1',
  /** エラー背景（赤系） */
  errorBg: '#ffebee',
  /** 成功背景（緑系） */
  successBg: '#e8f5e9',
  /** 情報背景（青系） */
  infoBg: '#e3f2fd',
} as const;

/**
 * ステータスカラー
 *
 * 増減や状態を表す色
 */
export const STATUS_COLORS = {
  /** 増加（緑系） */
  increase: {
    text: 'success.main',
    bg: '#e8f5e9',
  },
  /** 減少（赤系） */
  decrease: {
    text: 'error.main',
    bg: '#ffebee',
  },
  /** 変更なし */
  unchanged: {
    text: 'grey.500',
    bg: 'grey.50',
  },
  /** 警告 */
  warning: {
    text: '#f57c00', // warning.dark
    bg: '#fff3e0',
  },
} as const;

// ============================================
// ボーダー半径定数
// ============================================

/**
 * ボーダー半径定数
 */
export const BORDER_RADIUS = {
  /** 0 - 角なし */
  none: 0,
  /** 4px - 小さい角丸 */
  sm: 1,
  /** 8px - 標準角丸（MUIデフォルト） */
  md: 2,
  /** 12px - やや大きい角丸 */
  lg: 3,
  /** 16px - 大きい角丸 */
  xl: 4,
  /** 9999px - 完全な円 */
  full: '9999px',
} as const;

// ============================================
// シャドウ定数
// ============================================

/**
 * シャドウ定数
 *
 * MUIのelevationシステムを補完するカスタムシャドウ
 */
export const SHADOWS = {
  /** 影なし */
  none: 'none',
  /** 極小の影 */
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  /** 小さい影 */
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  /** 中程度の影 */
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  /** 大きい影 */
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  /** 特大の影 */
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  /** 内側の影 */
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  /** カード用の影 */
  card: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
  /** カードホバー用の影 */
  cardHover: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
} as const;

// ============================================
// トランジション定数
// ============================================

/**
 * トランジション時間定数
 */
export const TRANSITION_DURATION = {
  /** 75ms - 即座 */
  instant: '75ms',
  /** 150ms - 速い */
  fast: '150ms',
  /** 200ms - 標準 */
  normal: '200ms',
  /** 300ms - 遅い */
  slow: '300ms',
  /** 500ms - 非常に遅い */
  slower: '500ms',
} as const;

/**
 * イージング関数定数
 */
export const TRANSITION_EASING = {
  /** 標準的なイージング */
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** 減速イージング */
  decelerate: 'cubic-bezier(0.0, 0, 0.2, 1)',
  /** 加速イージング */
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  /** シャープイージング */
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const;

/**
 * 頻繁に使用するトランジション
 */
export const TRANSITIONS = {
  /** 全プロパティの標準トランジション */
  all: `all ${TRANSITION_DURATION.normal} ${TRANSITION_EASING.standard}`,
  /** 色の変化 */
  color: `color ${TRANSITION_DURATION.fast} ${TRANSITION_EASING.standard}`,
  /** 背景色の変化 */
  background: `background-color ${TRANSITION_DURATION.fast} ${TRANSITION_EASING.standard}`,
  /** 変形（scale, translateなど） */
  transform: `transform ${TRANSITION_DURATION.normal} ${TRANSITION_EASING.standard}`,
  /** 透明度の変化 */
  opacity: `opacity ${TRANSITION_DURATION.normal} ${TRANSITION_EASING.standard}`,
  /** ボックスシャドウの変化 */
  shadow: `box-shadow ${TRANSITION_DURATION.normal} ${TRANSITION_EASING.standard}`,
} as const;

// ============================================
// タッチターゲットサイズ
// ============================================

/**
 * タッチターゲットサイズ（Apple HIG / Android Material準拠）
 */
export const TOUCH_TARGET = {
  /** 最小タッチエリア（44px） */
  minimum: 44,
  /** 快適なタッチエリア（48px） */
  comfortable: 48,
  /** コンパクト（32px） - カテゴリチップ等 */
  compact: 32,
} as const;

// ============================================
// レイアウト定数
// ============================================

/**
 * レイアウト寸法定数
 *
 * アプリケーション全体で共通使用する固定サイズ
 */
export const LAYOUT = {
  /** モバイルボトムナビゲーションの高さ */
  mobileBottomNavHeight: 64,
  /** モバイルボトムナビゲーションの高さ（px文字列） */
  mobileBottomNavHeightPx: '64px',
  /** ヘッダーの高さ */
  headerHeight: 64,
  /** ヘッダーの高さ（px文字列） */
  headerHeightPx: '64px',
  /** サイドバーの幅 */
  sidebarWidth: 240,
  /** サイドバーの幅（折りたたみ時） */
  sidebarWidthCollapsed: 64,
} as const;

// ============================================
// DataGrid専用スタイル
// ============================================

/**
 * DataGrid用のスタイル定数
 *
 * MUI DataGridで統一されたスタイルを適用するための定数
 */
export const DATA_GRID_STYLES = {
  /** セルのフォントサイズ（レスポンシブ） */
  cellFontSize: FONT_SIZE_RESPONSIVE.tableCell,
  /** ヘッダーのフォントサイズ（レスポンシブ） */
  headerFontSize: FONT_SIZE_RESPONSIVE.tableHeader,
  /** 小計行のスタイル */
  subtotalRow: {
    background: `linear-gradient(to right, ${SEMANTIC_COLORS.subtotalBgStart}, ${SEMANTIC_COLORS.subtotalBgEnd}) !important`,
    '& .MuiDataGrid-cell': {
      color: SEMANTIC_COLORS.subtotalText,
      fontWeight: 600,
      borderTop: `1px solid ${SEMANTIC_COLORS.subtotalBorder}`,
      borderBottom: `1px solid ${SEMANTIC_COLORS.subtotalBorder}`,
      fontSize: FONT_SIZE_RESPONSIVE.subtotal,
    },
  },
  /** 総計行のスタイル */
  grandtotalRow: {
    background: `linear-gradient(to right, ${SEMANTIC_COLORS.grandtotalBgStart}, ${SEMANTIC_COLORS.grandtotalBgEnd}) !important`,
    '& .MuiDataGrid-cell': {
      color: '#ffffff',
      fontWeight: 700,
      fontSize: FONT_SIZE_RESPONSIVE.grandtotal,
      borderTop: 'none',
      borderBottom: 'none',
    },
  },
} as const;

// ============================================
// 型エクスポート
// ============================================

export type FontSizeKey = keyof typeof FONT_SIZE;
export type IconSizeKey = keyof typeof ICON_SIZE;
export type BorderRadiusKey = keyof typeof BORDER_RADIUS;
export type ShadowKey = keyof typeof SHADOWS;
