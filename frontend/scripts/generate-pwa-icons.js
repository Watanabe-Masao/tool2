/**
 * PWAアイコン生成スクリプト
 *
 * SVGアイコンからPWA用の各サイズのPNG画像を生成します。
 * このスクリプトはビルド前に実行してください。
 *
 * 使用方法:
 * 1. オンラインツールを使用してSVGをPNGに変換:
 *    - https://svgtopng.com/
 *    - https://cloudconvert.com/svg-to-png
 *
 * 2. 以下のサイズのPNG画像を生成し、frontend/publicディレクトリに配置:
 *    - pwa-192x192.png (192x192px)
 *    - pwa-512x512.png (512x512px)
 *    - pwa-maskable-192x192.png (192x192px, マスカブル用)
 *    - pwa-maskable-512x512.png (512x512px, マスカブル用)
 *
 * マスカブルアイコンについて:
 * - アイコンの重要な部分を中央80%の「セーフゾーン」に配置
 * - 周囲20%は切り取られる可能性がある
 * - 背景色を設定し、アイコン全体をカバーする
 *
 * 注意:
 * このファイルは手動実行のガイドです。
 * 自動変換を行う場合は、sharpやImageMagickをインストールし、
 * 以下のようなコードを追加してください:
 *
 * const sharp = require('sharp');
 * const fs = require('fs');
 *
 * const sizes = [192, 512];
 * const inputSvg = './public/icon.svg';
 *
 * sizes.forEach(size => {
 *   sharp(inputSvg)
 *     .resize(size, size)
 *     .png()
 *     .toFile(`./public/pwa-${size}x${size}.png`)
 *     .then(() => console.log(`Generated ${size}x${size}`))
 *     .catch(err => console.error(err));
 * });
 */

console.log(`
PWAアイコン生成ガイド
===================

このプロジェクトではPWAアイコンが必要です。
以下の手順でアイコンを生成してください:

1. frontend/public/icon.svg を開く

2. オンラインSVG→PNG変換ツールを使用:
   - https://svgtopng.com/
   - https://cloudconvert.com/svg-to-png

3. 以下のサイズで変換:
   ✓ 192x192px → pwa-192x192.png
   ✓ 512x512px → pwa-512x512.png
   ✓ 192x192px (maskable) → pwa-maskable-192x192.png
   ✓ 512x512px (maskable) → pwa-maskable-512x512.png

4. 生成したファイルを frontend/public/ に配置

5. npm run build を実行

マスカブルアイコンの作成方法:
- 既存のアイコンに背景を追加
- 重要な部分を中央80%の範囲内に配置
- ツール: https://maskable.app/editor

完了したら、ビルドを実行してPWA機能を確認してください。
`);
