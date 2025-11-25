#!/usr/bin/env node
/**
 * Single Source of Truth (SSOT) チェッカー
 *
 * @description
 * アプリケーション全体の単一情報源化を検証するスクリプト
 *
 * チェック項目:
 * 1. 型定義 (types/)
 * 2. メッセージ・テキスト (messages/)
 * 3. デザイントークン (theme.ts)
 * 4. State Schema (stores/, context/)
 * 5. 設定 (config.ts, constants.ts)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = join(__dirname, '../src');

// ===== ユーティリティ関数 =====

function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  files.forEach(file => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('__tests__') && !file.includes('e2e')) {
        getAllFiles(filePath, fileList);
      }
    } else if (file.match(/\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function getRelativePath(filePath) {
  return relative(SRC_DIR, filePath);
}

function extractFromFile(filePath, patterns) {
  const content = readFileSync(filePath, 'utf-8');
  const results = [];

  patterns.forEach(({ pattern, name }) => {
    let match;
    const regex = new RegExp(pattern, 'gm');
    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      results.push({
        type: name,
        value: match[1] || match[0],
        line: lineNumber,
        file: getRelativePath(filePath),
      });
    }
  });

  return results;
}

// ===== 各領域のチェック関数 =====

/**
 * 1. 型定義チェック
 */
function checkTypes() {
  console.log('\n📋 [1/5] 型定義チェック');
  console.log('─'.repeat(50));

  const allowedDirs = ['types', '__tests__', '__mocks__', 'e2e'];
  const allowedPatterns = [/Props$/, /State$/, /Context$/, /Ref$/, /Handler$/, /Config$/];

  const typePatterns = [
    { pattern: /export\s+interface\s+(\w+)/g, name: 'interface' },
    { pattern: /export\s+type\s+(\w+)/g, name: 'type' },
  ];

  const violations = [];
  const files = getAllFiles(SRC_DIR);

  files.forEach(file => {
    const relativePath = getRelativePath(file);
    const isAllowedDir = allowedDirs.some(dir => relativePath.includes(dir));

    if (isAllowedDir) return;

    const types = extractFromFile(file, typePatterns);
    types.forEach(({ type, value, line }) => {
      const isAllowedPattern = allowedPatterns.some(pattern => pattern.test(value));
      if (!isAllowedPattern) {
        violations.push({ file: relativePath, type: value, line });
      }
    });
  });

  if (violations.length === 0) {
    console.log('✅ 型定義: すべて types/ に集約されています');
  } else {
    console.log(`⚠️  ${violations.length} 件の型定義が types/ 外に存在します`);
    violations.slice(0, 10).forEach(({ file, type, line }) => {
      console.log(`   ${file}:${line} - ${type}`);
    });
    if (violations.length > 10) {
      console.log(`   ... 他 ${violations.length - 10} 件`);
    }
  }

  return violations.length;
}

/**
 * 2. メッセージ・テキストチェック
 */
function checkMessages() {
  console.log('\n💬 [2/5] メッセージ・テキストチェック');
  console.log('─'.repeat(50));

  const allowedDirs = ['messages', '__tests__', '__mocks__', 'e2e', 'utils/schemaExtensions'];

  // ハードコードされた日本語メッセージを検出
  const messagePatterns = [
    // バリデーションメッセージ
    { pattern: /['"`]([^'"`]*(?:してください|必須|入力|選択|正しく|以上|以下|文字)[^'"`]*)['"`]/g, name: 'validation' },
    // 通知メッセージ
    { pattern: /['"`]([^'"`]*(?:しました|失敗|エラー|成功|保存|削除|更新)[^'"`]*)['"`]/g, name: 'notification' },
    // UIテキスト
    { pattern: /['"`]([^'"`]*(?:ボタン|クリック|選択|入力|表示|非表示)[^'"`]*)['"`]/g, name: 'ui' },
  ];

  const violations = [];
  const files = getAllFiles(SRC_DIR);

  files.forEach(file => {
    const relativePath = getRelativePath(file);
    const isAllowedDir = allowedDirs.some(dir => relativePath.includes(dir));

    if (isAllowedDir) return;

    const messages = extractFromFile(file, messagePatterns);
    messages.forEach(({ type, value, line }) => {
      // 短すぎるもの、コメント、インポートを除外
      if (value.length < 5 || relativePath.includes('.test.')) return;
      violations.push({ file: relativePath, message: value, line, type });
    });
  });

  if (violations.length === 0) {
    console.log('✅ メッセージ: すべて messages/ に集約されています');
  } else {
    console.log(`⚠️  ${violations.length} 件のハードコードされたメッセージが見つかりました`);

    // タイプ別に集計
    const byType = violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}件`);
    });

    console.log('\n   サンプル:');
    violations.slice(0, 5).forEach(({ file, message, line }) => {
      const shortMessage = message.length > 40 ? message.substring(0, 40) + '...' : message;
      console.log(`   ${file}:${line} - "${shortMessage}"`);
    });
    if (violations.length > 5) {
      console.log(`   ... 他 ${violations.length - 5} 件`);
    }
  }

  return violations.length;
}

/**
 * 3. デザイントークンチェック
 */
function checkDesignTokens() {
  console.log('\n🎨 [3/5] デザイントークンチェック');
  console.log('─'.repeat(50));

  const allowedDirs = ['theme', '__tests__', 'App.tsx'];

  // インラインスタイル検出
  const stylePatterns = [
    { pattern: /style=\{\{([^}]+)\}\}/g, name: 'inline-style' },
    { pattern: /sx=\{\{([^}]+)\}\}/g, name: 'sx-prop' },
    { pattern: /fontSize:\s*['"](\d+px|[\d.]+rem)['"]/g, name: 'hardcoded-size' },
    { pattern: /color:\s*['"]#[0-9a-fA-F]{3,6}['"]/g, name: 'hardcoded-color' },
  ];

  const violations = [];
  const files = getAllFiles(SRC_DIR).filter(f => f.endsWith('.tsx'));

  files.forEach(file => {
    const relativePath = getRelativePath(file);
    const isAllowedDir = allowedDirs.some(dir => relativePath.includes(dir));

    if (isAllowedDir) return;

    const styles = extractFromFile(file, stylePatterns);
    styles.forEach(({ type, value, line }) => {
      violations.push({ file: relativePath, style: type, line });
    });
  });

  if (violations.length === 0) {
    console.log('✅ デザイントークン: すべて theme.ts を使用しています');
  } else {
    console.log(`⚠️  ${violations.length} 件のインラインスタイルが見つかりました`);
    violations.slice(0, 10).forEach(({ file, style, line }) => {
      console.log(`   ${file}:${line} - ${style}`);
    });
    if (violations.length > 10) {
      console.log(`   ... 他 ${violations.length - 10} 件`);
    }
  }

  return violations.length;
}

/**
 * 4. State Schema チェック
 */
function checkStateSchemas() {
  console.log('\n🔄 [4/5] State Schema チェック');
  console.log('─'.repeat(50));

  // Context の型定義が各ファイルに散在していないかチェック
  const statePatterns = [
    { pattern: /interface\s+(\w+State)\s*\{/g, name: 'state-interface' },
    { pattern: /type\s+(\w+State)\s*=/g, name: 'state-type' },
  ];

  const allowedFiles = ['stores/', 'context/', 'types/'];
  const violations = [];
  const files = getAllFiles(SRC_DIR);

  files.forEach(file => {
    const relativePath = getRelativePath(file);
    const isAllowedFile = allowedFiles.some(allowed => relativePath.includes(allowed));

    if (isAllowedFile || relativePath.includes('__tests__')) return;

    const states = extractFromFile(file, statePatterns);
    states.forEach(({ type, value, line }) => {
      violations.push({ file: relativePath, state: value, line });
    });
  });

  if (violations.length === 0) {
    console.log('✅ State Schema: すべて stores/ または context/ に集約されています');
  } else {
    console.log(`⚠️  ${violations.length} 件の State 定義が stores/context/ 外に存在します`);
    violations.forEach(({ file, state, line }) => {
      console.log(`   ${file}:${line} - ${state}`);
    });
  }

  return violations.length;
}

/**
 * 5. 設定チェック
 */
function checkConfig() {
  console.log('\n⚙️  [5/5] 設定チェック');
  console.log('─'.repeat(50));

  // 環境変数の直接参照を検出
  const configPatterns = [
    { pattern: /import\.meta\.env\.VITE_/g, name: 'env-var' },
    { pattern: /process\.env\./g, name: 'process-env' },
  ];

  const allowedFiles = ['config.ts', 'vite.config', 'constants.ts'];
  const violations = [];
  const files = getAllFiles(SRC_DIR);

  files.forEach(file => {
    const relativePath = getRelativePath(file);
    const isAllowedFile = allowedFiles.some(allowed => relativePath.includes(allowed));

    if (isAllowedFile || relativePath.includes('__tests__')) return;

    const configs = extractFromFile(file, configPatterns);
    configs.forEach(({ type, value, line }) => {
      violations.push({ file: relativePath, type, line });
    });
  });

  if (violations.length === 0) {
    console.log('✅ 設定: すべて config.ts / constants.ts に集約されています');
  } else {
    console.log(`⚠️  ${violations.length} 件の環境変数直接参照が見つかりました`);
    violations.forEach(({ file, type, line }) => {
      console.log(`   ${file}:${line} - ${type}`);
    });
  }

  return violations.length;
}

// ===== メイン実行 =====

console.log('🔍 Single Source of Truth (SSOT) チェックを開始します...\n');

const results = {
  types: checkTypes(),
  messages: checkMessages(),
  designTokens: checkDesignTokens(),
  stateSchemas: checkStateSchemas(),
  config: checkConfig(),
};

const total = Object.values(results).reduce((sum, count) => sum + count, 0);

console.log('\n' + '='.repeat(50));
console.log('📊 チェック結果サマリー');
console.log('='.repeat(50));
console.log(`型定義:         ${results.types === 0 ? '✅' : '⚠️ '} ${results.types} 件`);
console.log(`メッセージ:     ${results.messages === 0 ? '✅' : '⚠️ '} ${results.messages} 件`);
console.log(`デザイントークン: ${results.designTokens === 0 ? '✅' : '⚠️ '} ${results.designTokens} 件`);
console.log(`State Schema:   ${results.stateSchemas === 0 ? '✅' : '⚠️ '} ${results.stateSchemas} 件`);
console.log(`設定:           ${results.config === 0 ? '✅' : '⚠️ '} ${results.config} 件`);
console.log('─'.repeat(50));
console.log(`合計:           ${total === 0 ? '✅' : '⚠️ '} ${total} 件`);

if (total === 0) {
  console.log('\n🎉 すべての領域で Single Source of Truth が確立されています！');
  process.exit(0);
} else {
  console.log('\n💡 修正ガイド:');
  console.log('   - 型定義: src/types/README.md を参照');
  console.log('   - メッセージ: src/messages/README.md を参照');
  console.log('   - デザイントークン: theme.ts を使用してください');
  console.log('   - State Schema: stores/ または context/ に配置してください');
  console.log('   - 設定: config.ts または constants.ts を経由してください');
  console.log('\n詳細: docs/SSOT_GUIDE.md (作成予定)');
  process.exit(0); // warning only - don't fail build
}
