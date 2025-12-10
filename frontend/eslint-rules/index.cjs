/**
 * カスタムESLintルールプラグイン
 *
 * AIによるコーディング時の事故を防ぐためのルール集
 *
 * ## 利用可能なルール
 *
 * ### no-hardcoded-zindex
 * z-indexにハードコードされた数値を禁止
 * 代わりに @/constants/zIndex の定数を使用
 *
 * ### no-hardcoded-colors
 * ハードコードされた色値（#xxx, rgb(), rgba()など）を禁止
 * 代わりに MUI テーマカラーまたは @/theme.ts の designTokens.colors を使用
 *
 * ### no-hardcoded-fontsize
 * ハードコードされたフォントサイズ（'16px', '1.5rem'など）を禁止
 * 代わりに MUI の typography variant を使用
 *
 * ### no-hardcoded-spacing
 * ハードコードされたスペーシング値（'16px', '24px'など）を禁止
 * 代わりに MUI のスペーシングシステム（p: 2, m: 3など）を使用
 */

const noHardcodedZIndex = require('./no-hardcoded-zindex.cjs');
const noHardcodedColors = require('./no-hardcoded-colors.cjs');
const noHardcodedFontSize = require('./no-hardcoded-fontsize.cjs');
const noHardcodedSpacing = require('./no-hardcoded-spacing.cjs');

module.exports = {
  rules: {
    'no-hardcoded-zindex': noHardcodedZIndex,
    'no-hardcoded-colors': noHardcodedColors,
    'no-hardcoded-fontsize': noHardcodedFontSize,
    'no-hardcoded-spacing': noHardcodedSpacing,
  },
};
