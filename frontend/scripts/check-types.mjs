#!/usr/bin/env node
/**
 * 型定義チェックスクリプト
 *
 * @description
 * ベタ打ちの型定義（インポートされていない型）を検出し、
 * types/ ディレクトリへの移行を促します。
 *
 * ## チェック内容
 * 1. src/ 配下の .ts/.tsx ファイルで定義されている型
 * 2. types/ ディレクトリ以外で定義されている共通型
 * 3. 重複している可能性のある型定義
 *
 * ## 許可される型定義
 * - Component の Props (末尾が Props)
 * - Component の State (末尾が State)
 * - test ファイル内の型
 * - types/ ディレクトリ内の型
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 設定
const SRC_DIR = join(__dirname, '../src');
const ALLOWED_PATTERNS = [
  /Props$/,           // ComponentProps
  /State$/,           // ComponentState
  /Context$/,         // React Context
  /Ref$/,             // React Ref
  /Handler$/,         // Event Handler
  /Config$/,          // Configuration
];

// 許可されるディレクトリ
const ALLOWED_DIRS = [
  'types',            // types/ ディレクトリ
  '__tests__',        // テストファイル
  '__mocks__',        // モックファイル
];

// チェック対象の型定義パターン
const TYPE_PATTERNS = [
  /export\s+interface\s+(\w+)/g,      // export interface
  /export\s+type\s+(\w+)/g,           // export type
];

/**
 * ファイルを再帰的に取得
 */
function getFiles(dir, files = []) {
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // node_modules, dist などをスキップ
      if (!item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
        getFiles(fullPath, files);
      }
    } else if (stat.isFile()) {
      const ext = extname(fullPath);
      if (ext === '.ts' || ext === '.tsx') {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * ファイルパスが許可されたディレクトリ内かチェック
 */
function isInAllowedDir(filePath) {
  const relativePath = relative(SRC_DIR, filePath);
  return ALLOWED_DIRS.some(dir => relativePath.includes(dir));
}

/**
 * 型名が許可されたパターンにマッチするかチェック
 */
function isAllowedTypeName(typeName) {
  return ALLOWED_PATTERNS.some(pattern => pattern.test(typeName));
}

/**
 * ファイルから型定義を抽出
 */
function extractTypes(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const types = [];

  for (const pattern of TYPE_PATTERNS) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const typeName = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      types.push({ name: typeName, line: lineNumber });
    }
  }

  return types;
}

/**
 * メイン処理
 */
function main() {
  console.log('🔍 型定義チェックを開始します...\n');

  const files = getFiles(SRC_DIR);
  const violations = [];
  const typeUsage = new Map(); // 型名の使用状況

  for (const file of files) {
    // 許可されたディレクトリはスキップ
    if (isInAllowedDir(file)) {
      continue;
    }

    const types = extractTypes(file);

    for (const type of types) {
      // 許可された型名パターンはスキップ
      if (isAllowedTypeName(type.name)) {
        continue;
      }

      // 違反として記録
      const relativePath = relative(SRC_DIR, file);
      violations.push({
        file: relativePath,
        type: type.name,
        line: type.line,
      });

      // 重複チェック用に記録
      if (!typeUsage.has(type.name)) {
        typeUsage.set(type.name, []);
      }
      typeUsage.get(type.name).push({ file: relativePath, line: type.line });
    }
  }

  // 結果の表示
  if (violations.length === 0) {
    console.log('✅ 問題は見つかりませんでした！\n');
    return 0;
  }

  console.log(`❌ ${violations.length} 件の問題が見つかりました:\n`);

  // 重複している型を先に表示
  console.log('📋 重複している型定義:\n');
  let duplicateCount = 0;
  for (const [typeName, locations] of typeUsage.entries()) {
    if (locations.length > 1) {
      duplicateCount++;
      console.log(`  ⚠️  ${typeName} (${locations.length}箇所で定義)`);
      for (const loc of locations) {
        console.log(`      - ${loc.file}:${loc.line}`);
      }
      console.log('');
    }
  }

  if (duplicateCount === 0) {
    console.log('  なし\n');
  }

  // types/ 以外で定義されている型
  console.log('📋 types/ ディレクトリに移動すべき型定義:\n');
  const groupedByFile = new Map();
  for (const v of violations) {
    if (!groupedByFile.has(v.file)) {
      groupedByFile.set(v.file, []);
    }
    groupedByFile.get(v.file).push(v);
  }

  for (const [file, types] of groupedByFile.entries()) {
    console.log(`  📄 ${file}`);
    for (const type of types) {
      console.log(`      - ${type.type} (line ${type.line})`);
    }
    console.log('');
  }

  // ガイド表示
  console.log('💡 修正方法:\n');
  console.log('  1. types/ ディレクトリの適切なファイルに型を移動');
  console.log('  2. import type { ... } from \'@/types/...\' で import');
  console.log('  3. Component Props など、ローカルで良い型は末尾に Props を付ける');
  console.log('');
  console.log('  詳細: frontend/src/types/README.md を参照\n');

  return 1; // エラーコード
}

// 実行
const exitCode = main();
process.exit(exitCode);
