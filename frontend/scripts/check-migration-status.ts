/**
 * Firestore Unit Format Migration Status Check Script
 *
 * 現在のFirestoreデータがV1形式かV2形式かを確認するスクリプト
 *
 * 使用方法:
 * ```bash
 * npx tsx scripts/check-migration-status.ts
 * ```
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// .envファイルから環境変数を読み込み
function loadEnv(): Record<string, string> {
  const envPath = join(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });

  return env;
}

const env = loadEnv();

// 環境変数から設定を読み込み
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface MigrationStatus {
  collection: string;
  total: number;
  v1Format: number;  // "100gあたり" 形式
  v2Format: number;  // specification + "gあたり" 形式
  other: number;     // 個数ベースなど
  samples: {
    v1: any[];
    v2: any[];
  };
}

/**
 * データ形式を判定
 */
function detectFormat(doc: any): 'v1' | 'v2' | 'other' {
  const unit = doc.unit || '';
  const specification = doc.specification;

  // V1形式: unitに数値が含まれている（例: "100gあたり"）
  if (/^\d+/.test(unit)) {
    return 'v1';
  }

  // V2形式: unitは基本形式 + specificationフィールドがある
  if (/^(g|kg)あたり$/.test(unit) && specification) {
    return 'v2';
  }

  // その他（個数ベースなど）
  return 'other';
}

/**
 * コレクションの移行状況を確認
 */
async function checkCollectionStatus(collectionName: string): Promise<MigrationStatus> {
  console.log(`\n🔍 ${collectionName} を確認中...`);

  const status: MigrationStatus = {
    collection: collectionName,
    total: 0,
    v1Format: 0,
    v2Format: 0,
    other: 0,
    samples: {
      v1: [],
      v2: [],
    },
  };

  try {
    // unitフィールドがあるドキュメントを取得（最大100件サンプリング）
    const q = query(
      collection(db, collectionName),
      limit(100)
    );

    const snapshot = await getDocs(q);
    status.total = snapshot.size;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const format = detectFormat(data);

      if (format === 'v1') {
        status.v1Format++;
        if (status.samples.v1.length < 3) {
          status.samples.v1.push({
            id: doc.id,
            unit: data.unit,
            specification: data.specification,
          });
        }
      } else if (format === 'v2') {
        status.v2Format++;
        if (status.samples.v2.length < 3) {
          status.samples.v2.push({
            id: doc.id,
            unit: data.unit,
            specification: data.specification,
          });
        }
      } else {
        status.other++;
      }
    });

    console.log(`  ✅ ${status.total}件のドキュメントを確認`);
  } catch (error: any) {
    console.error(`  ❌ エラー: ${error.message}`);
  }

  return status;
}

/**
 * 結果を表示
 */
function displayResults(results: MigrationStatus[]) {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 Firestore Migration Status Report');
  console.log('='.repeat(60));
  console.log('');

  for (const result of results) {
    console.log(`\n【${result.collection}】`);
    console.log(`  総件数: ${result.total}`);
    console.log(`  V1形式 ("100gあたり"): ${result.v1Format}件`);
    console.log(`  V2形式 (specification + "gあたり"): ${result.v2Format}件`);
    console.log(`  その他 (個数ベースなど): ${result.other}件`);

    if (result.v1Format > 0) {
      console.log('\n  ⚠️  V1形式のサンプル:');
      result.samples.v1.forEach((sample, i) => {
        console.log(`    ${i + 1}. ID: ${sample.id.substring(0, 20)}...`);
        console.log(`       unit: "${sample.unit}"`);
        console.log(`       specification: "${sample.specification || '(なし)'}"`);
      });
    }

    if (result.v2Format > 0) {
      console.log('\n  ✅ V2形式のサンプル:');
      result.samples.v2.forEach((sample, i) => {
        console.log(`    ${i + 1}. ID: ${sample.id.substring(0, 20)}...`);
        console.log(`       unit: "${sample.unit}"`);
        console.log(`       specification: "${sample.specification}"`);
      });
    }
  }

  // 総括
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📋 Summary');
  console.log('='.repeat(60));

  const totalV1 = results.reduce((sum, r) => sum + r.v1Format, 0);
  const totalV2 = results.reduce((sum, r) => sum + r.v2Format, 0);
  const totalOther = results.reduce((sum, r) => sum + r.other, 0);
  const totalDocs = results.reduce((sum, r) => sum + r.total, 0);

  console.log(`\n全体サマリー（サンプリング結果）:`);
  console.log(`  総件数: ${totalDocs}`);
  console.log(`  V1形式: ${totalV1}件 (${((totalV1 / totalDocs) * 100).toFixed(1)}%)`);
  console.log(`  V2形式: ${totalV2}件 (${((totalV2 / totalDocs) * 100).toFixed(1)}%)`);
  console.log(`  その他: ${totalOther}件 (${((totalOther / totalDocs) * 100).toFixed(1)}%)`);

  if (totalV1 === 0 && totalV2 > 0) {
    console.log('\n✅ 移行完了: すべてV2形式です！');
  } else if (totalV1 > 0 && totalV2 === 0) {
    console.log('\n⚠️  未移行: すべてV1形式です。移行スクリプトの実行が必要です。');
  } else if (totalV1 > 0 && totalV2 > 0) {
    console.log('\n⚠️  移行途中: V1とV2が混在しています。移行スクリプトの再実行を推奨します。');
  } else {
    console.log('\n📝 データなし、または個数ベースのみです。');
  }

  console.log('\n');
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Firestore Migration Status Check');
  console.log('====================================');
  console.log('');
  console.log('プロジェクト:', firebaseConfig.projectId);
  console.log('');
  console.log('⚠️  注意: 最大100件ずつサンプリングして確認します');

  const collections = [
    'pricing_history',
    'product_history',
    'allocation_details',
  ];

  const results: MigrationStatus[] = [];

  for (const collectionName of collections) {
    const status = await checkCollectionStatus(collectionName);
    results.push(status);
  }

  displayResults(results);

  process.exit(0);
}

// 実行
main().catch((error) => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
