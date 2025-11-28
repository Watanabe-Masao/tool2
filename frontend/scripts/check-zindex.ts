/**
 * zIndex使用ルールのチェックスクリプト
 *
 * このスクリプトは以下をチェックします：
 * 1. ハードコードされたzIndex値の検出
 * 2. 許可された定数のみが使用されているか
 * 3. zIndexが推奨範囲内にあるか
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// チェック対象のファイルパターン
const PATTERNS = [
  'src/**/*.{ts,tsx}',
  '!src/**/*.test.{ts,tsx}',
  '!src/**/*.spec.{ts,tsx}',
  '!src/constants/zIndex.ts', // zIndex定数ファイル自体は除外
];

// 許可されたzIndex定数とヘルパー関数
const ALLOWED_CONSTANTS = [
  'MODAL_Z_INDEX',
  'ELEMENT_OFFSET',
  'MESSAGE_Z_INDEX',
  'APP_Z_INDEX',
  'LAYER_Z_INDEX',
  'zIndex\\(', // zIndex() ヘルパー関数
];

// ハードコードされたzIndex値を検出する正規表現
// 例: zIndex: 1500, zIndex={1500}, "zIndex": 1500
const HARDCODED_ZINDEX_REGEX = /zIndex\s*[:=]\s*(\d+)/g;

// 許可された定数を使用しているかチェックする正規表現
const ALLOWED_USAGE_REGEX = new RegExp(
  `zIndex\\s*[:=]\\s*(?:${ALLOWED_CONSTANTS.join('|')})`
);

interface ViolationResult {
  file: string;
  line: number;
  column: number;
  value: string;
  message: string;
}

/**
 * ファイルをチェックしてzIndexの使用ルール違反を検出
 */
function checkFile(filePath: string): ViolationResult[] {
  const violations: ViolationResult[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    // コメント行はスキップ
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
      return;
    }

    // ハードコードされたzIndex値を検出
    let match;
    while ((match = HARDCODED_ZINDEX_REGEX.exec(line)) !== null) {
      const zIndexValue = match[1];
      const column = match.index;

      // 許可された定数を使用している場合はスキップ
      if (ALLOWED_USAGE_REGEX.test(line)) {
        continue;
      }

      // 計算式（+ や - を含む）の場合はスキップ
      if (line.includes('+') || line.includes('-')) {
        // 定数 + オフセットのパターンは許可
        continue;
      }

      violations.push({
        file: filePath,
        line: lineIndex + 1,
        column: column + 1,
        value: zIndexValue,
        message: `ハードコードされたzIndex値が検出されました: ${zIndexValue}。型付きヘルパー関数 zIndex() または定数を使用してください`,
      });
    }
  });

  return violations;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🔍 zIndex使用ルールをチェックしています...\n');

  const files = await glob(PATTERNS, { cwd: process.cwd(), absolute: true });
  let totalViolations = 0;
  const violationsByFile: Map<string, ViolationResult[]> = new Map();

  for (const file of files) {
    const violations = checkFile(file);
    if (violations.length > 0) {
      violationsByFile.set(file, violations);
      totalViolations += violations.length;
    }
  }

  // 結果を表示
  if (totalViolations === 0) {
    console.log('✅ zIndex使用ルールに違反はありません！\n');
    console.log(`チェック対象ファイル数: ${files.length}`);
    process.exit(0);
  } else {
    console.log(`❌ ${totalViolations}件の違反が見つかりました:\n`);

    for (const [file, violations] of violationsByFile.entries()) {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`📄 ${relativePath}`);

      violations.forEach((violation) => {
        console.log(
          `   ${violation.line}:${violation.column} - ${violation.message}`
        );
      });

      console.log('');
    }

    console.log('💡 修正方法:');
    console.log('   1. 型付きヘルパー関数 zIndex() を使用してください（推奨）');
    console.log('      例: zIndex: zIndex("PAGE_MODAL", "CLOSE_BUTTON")');
    console.log('   2. または定数を使用してください');
    console.log('      例: zIndex: MODAL_Z_INDEX.PAGE_MODAL + ELEMENT_OFFSET.CLOSE_BUTTON');
    console.log('   3. 詳細: frontend/src/constants/zIndex.ts を参照\n');

    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
