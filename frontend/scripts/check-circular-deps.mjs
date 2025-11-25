#!/usr/bin/env node
/**
 * 循環依存検出スクリプト
 *
 * @description
 * TypeScript/JavaScriptプロジェクトの循環依存を検出し、
 * CIパイプラインで警告を出すスクリプト
 *
 * 使用方法:
 *   npm run check-circular-deps
 *   node scripts/check-circular-deps.mjs
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// ===== 設定 =====

const CONFIG = {
  // 循環依存を検出するエントリーポイント
  entryPoints: [
    'src/App.tsx',
    'src/main.tsx',
  ],
  // 検出対象のファイル拡張子
  extensions: ['ts', 'tsx'],
  // 除外するパターン
  excludeRegex: '(node_modules|\\.test\\.|__tests__|__mocks__|e2e)',
  // 許容する循環依存の最大数（これを超えるとエラー）
  maxAllowedCycles: 0,
  // 許容する循環依存（既知の問題で一時的に許容する場合）
  allowedCycles: [
    // 例: ['src/context/AuthContext.tsx', 'src/hooks/useAuth.ts']
  ],
};

// ===== ユーティリティ関数 =====

/**
 * madge がインストールされているかチェック
 */
function checkMadgeInstalled() {
  try {
    execSync('npx madge --version', { stdio: 'pipe', cwd: ROOT_DIR });
    return true;
  } catch {
    return false;
  }
}

/**
 * tsconfig.json の paths 設定を取得
 */
function getTsConfigPaths() {
  try {
    const tsconfigPath = join(ROOT_DIR, 'tsconfig.json');
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    return tsconfig.compilerOptions?.paths || {};
  } catch {
    return {};
  }
}

/**
 * 循環依存を検出
 */
function detectCircularDeps() {
  console.log('🔍 循環依存検出を開始します...\n');

  // madge コマンドの構築
  const madgeArgs = [
    '--circular',
    '--extensions', CONFIG.extensions.join(','),
    '--exclude', `'${CONFIG.excludeRegex}'`,
    '--ts-config', 'tsconfig.json',
    '--json',
    'src',
  ];

  const command = `npx madge ${madgeArgs.join(' ')}`;

  try {
    const result = execSync(command, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    // JSONとして解析
    const cycles = JSON.parse(result || '[]');
    return cycles;
  } catch (error) {
    // madge が循環依存を見つけた場合もエラーを投げる可能性がある
    if (error.stdout) {
      try {
        const cycles = JSON.parse(error.stdout);
        return cycles;
      } catch {
        // JSON解析に失敗した場合
      }
    }

    // エラーメッセージを解析して循環依存を抽出
    if (error.message && error.message.includes('circular')) {
      console.error('循環依存が検出されました（詳細は下記）');
    }

    // エラーを再スロー
    throw error;
  }
}

/**
 * 許容される循環依存かどうかをチェック
 */
function isAllowedCycle(cycle) {
  return CONFIG.allowedCycles.some(allowed => {
    if (allowed.length !== cycle.length) return false;
    return allowed.every((file, index) => cycle[index].includes(file));
  });
}

/**
 * 結果を表示
 */
function displayResults(cycles) {
  console.log('─'.repeat(60));
  console.log('📊 循環依存検出結果');
  console.log('─'.repeat(60));

  if (!cycles || cycles.length === 0) {
    console.log('\n✅ 循環依存は検出されませんでした！\n');
    return 0;
  }

  // 許容される循環依存を除外
  const problematicCycles = cycles.filter(cycle => !isAllowedCycle(cycle));

  if (problematicCycles.length === 0) {
    console.log('\n✅ 検出された循環依存はすべて許容リストに含まれています\n');
    return 0;
  }

  console.log(`\n⚠️  ${problematicCycles.length} 件の循環依存が検出されました\n`);

  // 各循環依存を表示
  problematicCycles.forEach((cycle, index) => {
    console.log(`🔄 循環依存 #${index + 1}:`);
    cycle.forEach((file, i) => {
      const arrow = i < cycle.length - 1 ? '  ↓' : '  ↩️ (最初に戻る)';
      console.log(`   ${file}`);
      if (i < cycle.length - 1) console.log(arrow);
    });
    console.log('');
  });

  // 修正ガイド
  console.log('─'.repeat(60));
  console.log('💡 修正ガイド:');
  console.log('─'.repeat(60));
  console.log('');
  console.log('循環依存を解消するための一般的なアプローチ:');
  console.log('');
  console.log('1. 依存関係の逆転 (Dependency Inversion)');
  console.log('   - インターフェースを別ファイルに抽出');
  console.log('   - 具体実装ではなく抽象に依存');
  console.log('');
  console.log('2. ファイルの分割');
  console.log('   - 共通の型定義を別ファイルに抽出');
  console.log('   - ユーティリティ関数を分離');
  console.log('');
  console.log('3. 遅延インポート (Dynamic Import)');
  console.log('   - どうしても解消できない場合の最後の手段');
  console.log('   - const module = await import("./module")');
  console.log('');
  console.log('4. Barrel File (index.ts) の見直し');
  console.log('   - 過度なre-exportが原因の場合がある');
  console.log('');

  return problematicCycles.length;
}

// ===== メイン実行 =====

async function main() {
  // madge のインストール確認
  if (!checkMadgeInstalled()) {
    console.error('❌ madge がインストールされていません');
    console.error('   npm install -D madge を実行してください');
    process.exit(1);
  }

  try {
    const cycles = detectCircularDeps();
    const issueCount = displayResults(cycles);

    console.log('='.repeat(60));
    if (issueCount === 0) {
      console.log('🎉 循環依存なし - コードの品質が保たれています！');
      process.exit(0);
    } else if (issueCount <= CONFIG.maxAllowedCycles) {
      console.log(`⚠️  ${issueCount} 件の循環依存があります（許容範囲内）`);
      process.exit(0);
    } else {
      console.log(`❌ ${issueCount} 件の循環依存があります（許容範囲: ${CONFIG.maxAllowedCycles}）`);
      console.log('   循環依存を解消するか、許容リストに追加してください');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 循環依存検出中にエラーが発生しました:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
