/**
 * Allocation History Style Constants
 *
 * 配分履歴機能のスタイル定数。
 * マジックナンバーを削減し、一貫性を向上させます。
 *
 * **Phase D 最適化:**
 * - フォントサイズ、アイコンサイズ、スペーシングなどの定数を集約
 * - ~50行のマジックナンバー削減を目標
 */

/**
 * Font Sizes
 *
 * 配分履歴機能で使用するフォントサイズ定数。
 * Material-UI の Typography variant と組み合わせて使用。
 */
export const FONT_SIZE = {
  /** 極小サイズ（バッジ、アイコンラベル） */
  XS: '0.65rem',
  /** 小サイズ（補足情報、キャプション） */
  SM: '0.7rem',
  /** 中サイズ（通常テキスト） */
  MD: '0.75rem',
  /** 標準サイズ（テーブルセル） */
  BASE: '0.8rem',
  /** やや大きめ（見出し補助） */
  LG: '0.85rem',
  /** 大サイズ（小見出し） */
  XL: '0.9rem',
  /** 特大サイズ（大見出し） */
  XXL: '1rem',
} as const;

/**
 * Icon Sizes
 *
 * アイコンのサイズ定数（単位: px）。
 * Material-UI の IconButton や Icon コンポーネントの fontSize に使用。
 */
export const ICON_SIZE = {
  /** 極小（バッジ内アイコン） */
  XS: 12,
  /** 小（インラインアイコン） */
  SM: 14,
  /** 中（ボタン内アイコン） */
  MD: 16,
  /** 標準（通常アイコン） */
  BASE: 18,
  /** やや大きめ（強調アイコン） */
  LG: 20,
  /** 大（主要アイコン） */
  XL: 24,
  /** 特大（空状態アイコン） */
  XXL: 28,
} as const;

/**
 * Spacing
 *
 * スペーシング定数（Material-UI の spacing 単位）。
 * sx prop での px, py, gap などに使用。
 */
export const SPACING = {
  /** 極小 (2px) */
  XXS: 0.25,
  /** 極小 (4px) */
  XS: 0.5,
  /** 小 (6px) */
  SM: 0.75,
  /** 中 (8px) */
  MD: 1,
  /** やや大 (10px) */
  LG: 1.25,
  /** 大 (12px) */
  XL: 1.5,
  /** 特大 (16px) */
  XXL: 2,
} as const;

/**
 * Padding
 *
 * パディング定数（Material-UI の spacing 単位）。
 * コンポーネントの内側余白に使用。
 */
export const PADDING = {
  /** セル内パディング（極小デバイス） */
  CELL_XS: { xs: '4px 6px', sm: '8px 12px' },
  /** ボックス内パディング（小） */
  BOX_SM: { xs: 0.75, sm: 1 },
  /** ボックス内パディング（中） */
  BOX_MD: { xs: 1.5, sm: 2 },
} as const;

/**
 * Border Radius
 *
 * 角丸の半径定数（単位: px）。
 */
export const BORDER_RADIUS = {
  /** 小（ボタン、バッジ） */
  SM: 1,
  /** 中（カード） */
  MD: 2,
  /** 大（モーダル） */
  LG: 3,
  /** 特大（ドロワー） */
  XL: 4,
} as const;

/**
 * Opacity
 *
 * 透明度定数。
 * ホバー効果やdisabled状態に使用。
 */
export const OPACITY = {
  /** 軽いホバー */
  HOVER_LIGHT: 0.7,
  /** 標準ホバー */
  HOVER: 0.8,
  /** 無効状態 */
  DISABLED: 0.5,
} as const;

/**
 * Heights
 *
 * 高さ定数（単位: vh または px）。
 * DataGrid やコンテナの高さに使用。
 */
export const HEIGHT = {
  /** DataGrid（モバイル） */
  GRID_MOBILE: 400,
  /** DataGrid（タブレット） */
  GRID_TABLET: 500,
  /** DataGrid（デスクトップ） */
  GRID_DESKTOP: 600,
  /** フルスクリーンオフセット */
  FULLSCREEN_OFFSET: 'calc(100vh - 140px)',
} as const;

/**
 * Min Heights
 *
 * 最小高さ定数（単位: px）。
 * テーブルヘッダーや行の最小高さに使用。
 */
export const MIN_HEIGHT = {
  /** 列ヘッダー（モバイル） */
  HEADER_XS: '40px !important',
  /** 列ヘッダー（デスクトップ） */
  HEADER_SM: '48px !important',
  /** 行（モバイル） */
  ROW_XS: '36px !important',
  /** 行（デスクトップ） */
  ROW_SM: '44px !important',
} as const;

/**
 * Line Heights
 *
 * 行間定数。
 */
export const LINE_HEIGHT = {
  /** コンパクト */
  COMPACT: 1.2,
  /** 標準 */
  NORMAL: 1.4,
  /** ゆったり */
  RELAXED: 1.6,
} as const;

/**
 * Transitions
 *
 * トランジション定数。
 */
export const TRANSITION = {
  /** 高速 */
  FAST: '0.15s ease',
  /** 標準 */
  NORMAL: '0.2s ease',
  /** ゆっくり */
  SLOW: '0.3s ease',
} as const;
