/**
 * Firestore Unit Format Migration Script
 *
 * V1形式（unit: "100gあたり"）からV2形式（specification: "100", unit: "gあたり"）への
 * データ移行スクリプト
 *
 * 対象コレクション:
 * - pricing_history
 * - product_history
 * - allocation_details
 * - haibun_orders (products配列内)
 *
 * 使用方法:
 * ```bash
 * # ドライラン（実際には更新しない）
 * npx tsx scripts/migrate-unit-format.ts --dry-run
 *
 * # 本番実行
 * npx tsx scripts/migrate-unit-format.ts
 *
 * # 特定のコレクションのみ
 * npx tsx scripts/migrate-unit-format.ts --collection pricing_history
 * ```
 *
 * 注意事項:
 * - 必ず事前にFirestoreのバックアップを取得してください
 * - まずドライランで影響範囲を確認してください
 * - 本番実行は低負荷時間帯に実施してください
 */

import * as admin from 'firebase-admin';
import * as readline from 'readline';

// Firebase Admin SDK初期化
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id',
  });
}

const db = admin.firestore();

/**
 * 重量単位のパターン（V1形式）
 * 例: "100gあたり" -> { specification: "100", unit: "gあたり" }
 */
const WEIGHT_UNIT_PATTERN = /^(\d+)?(g|kg)あたり$/;

/**
 * Unit変換結果
 */
interface UnitMigrationResult {
  /** 変換が必要か */
  needsMigration: boolean;
  /** 変換後の specification */
  specification?: string;
  /** 変換後の unit */
  unit?: string;
  /** 元の値 */
  originalUnit: string;
}

/**
 * V1形式のunitをV2形式に変換
 *
 * @param unit - V1形式のunit（例: "100gあたり", "個"）
 * @returns 変換結果
 */
function migrateUnitFormat(unit: string): UnitMigrationResult {
  if (!unit) {
    return {
      needsMigration: false,
      originalUnit: unit,
    };
  }

  const match = unit.match(WEIGHT_UNIT_PATTERN);

  if (match) {
    // 重量ベース: "100gあたり" → specification: "100", unit: "gあたり"
    const specValue = match[1] || '';
    const baseUnit = `${match[2]}あたり`;

    // すでにV2形式の場合（specification が含まれていない）
    if (!specValue) {
      return {
        needsMigration: false,
        originalUnit: unit,
      };
    }

    return {
      needsMigration: true,
      specification: specValue,
      unit: baseUnit,
      originalUnit: unit,
    };
  }

  // 個数ベース: 変換不要
  return {
    needsMigration: false,
    originalUnit: unit,
  };
}

/**
 * 移行統計
 */
interface MigrationStats {
  totalDocuments: number;
  migratedDocuments: number;
  skippedDocuments: number;
  errorDocuments: number;
  errors: Array<{ docId: string; error: string }>;
}

/**
 * 統計を初期化
 */
function createStats(): MigrationStats {
  return {
    totalDocuments: 0,
    migratedDocuments: 0,
    skippedDocuments: 0,
    errorDocuments: 0,
    errors: [],
  };
}

/**
 * 統計を表示
 */
function printStats(collectionName: string, stats: MigrationStats) {
  console.log(`\n📊 ${collectionName} 移行結果:`);
  console.log(`  Total: ${stats.totalDocuments}`);
  console.log(`  Migrated: ${stats.migratedDocuments} ✅`);
  console.log(`  Skipped: ${stats.skippedDocuments}`);
  console.log(`  Errors: ${stats.errorDocuments} ❌`);

  if (stats.errors.length > 0) {
    console.log('\n⚠️ エラー詳細:');
    stats.errors.forEach(({ docId, error }) => {
      console.log(`  - ${docId}: ${error}`);
    });
  }
}

/**
 * pricing_history コレクションを移行
 */
async function migratePricingHistory(dryRun: boolean): Promise<MigrationStats> {
  console.log('\n🔄 pricing_history の移行を開始...');
  const stats = createStats();

  try {
    // unit が数値で始まるドキュメントを取得
    const snapshot = await db.collection('pricing_history')
      .where('unit', '>=', '0')
      .where('unit', '<=', '9zzz')
      .get();

    stats.totalDocuments = snapshot.size;
    console.log(`  対象ドキュメント数: ${stats.totalDocuments}`);

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestoreのバッチサイズ制限

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const migrationResult = migrateUnitFormat(data.unit);

        if (migrationResult.needsMigration) {
          const updateData: any = {
            unit: migrationResult.unit,
          };

          // specification フィールドが既に存在する場合は更新、なければスキップ
          // （pricing_historyにはspecificationフィールドがある）
          if (data.specification !== undefined) {
            // 既存のspecificationが空の場合のみ、抽出した値をセット
            if (!data.specification && migrationResult.specification) {
              updateData.specification = migrationResult.specification;
            }
          }

          if (!dryRun) {
            batch.update(doc.ref, updateData);
            batchCount++;

            // バッチサイズに達したらコミット
            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              batchCount = 0;
            }
          }

          stats.migratedDocuments++;
          console.log(`  ✓ ${doc.id}: "${migrationResult.originalUnit}" → spec="${migrationResult.specification}", unit="${migrationResult.unit}"`);
        } else {
          stats.skippedDocuments++;
        }
      } catch (error: any) {
        stats.errorDocuments++;
        stats.errors.push({
          docId: doc.id,
          error: error.message,
        });
        console.error(`  ✗ ${doc.id}: ${error.message}`);
      }
    }

    // 残りのバッチをコミット
    if (!dryRun && batchCount > 0) {
      await batch.commit();
    }

  } catch (error: any) {
    console.error(`❌ pricing_history 移行エラー: ${error.message}`);
    throw error;
  }

  return stats;
}

/**
 * product_history コレクションを移行
 */
async function migrateProductHistory(dryRun: boolean): Promise<MigrationStats> {
  console.log('\n🔄 product_history の移行を開始...');
  const stats = createStats();

  try {
    const snapshot = await db.collection('product_history')
      .where('unit', '>=', '0')
      .where('unit', '<=', '9zzz')
      .get();

    stats.totalDocuments = snapshot.size;
    console.log(`  対象ドキュメント数: ${stats.totalDocuments}`);

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const migrationResult = migrateUnitFormat(data.unit);

        if (migrationResult.needsMigration) {
          const updateData: any = {
            unit: migrationResult.unit,
          };

          // specificationフィールドの更新
          if (data.specification !== undefined) {
            if (!data.specification && migrationResult.specification) {
              updateData.specification = migrationResult.specification;
            }
          }

          if (!dryRun) {
            batch.update(doc.ref, updateData);
            batchCount++;

            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              batchCount = 0;
            }
          }

          stats.migratedDocuments++;
          console.log(`  ✓ ${doc.id}: "${migrationResult.originalUnit}" → unit="${migrationResult.unit}"`);
        } else {
          stats.skippedDocuments++;
        }
      } catch (error: any) {
        stats.errorDocuments++;
        stats.errors.push({
          docId: doc.id,
          error: error.message,
        });
        console.error(`  ✗ ${doc.id}: ${error.message}`);
      }
    }

    if (!dryRun && batchCount > 0) {
      await batch.commit();
    }

  } catch (error: any) {
    console.error(`❌ product_history 移行エラー: ${error.message}`);
    throw error;
  }

  return stats;
}

/**
 * allocation_details コレクションを移行
 */
async function migrateAllocationDetails(dryRun: boolean): Promise<MigrationStats> {
  console.log('\n🔄 allocation_details の移行を開始...');
  const stats = createStats();

  try {
    const snapshot = await db.collection('allocation_details')
      .where('unit', '>=', '0')
      .where('unit', '<=', '9zzz')
      .get();

    stats.totalDocuments = snapshot.size;
    console.log(`  対象ドキュメント数: ${stats.totalDocuments}`);

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const migrationResult = migrateUnitFormat(data.unit);

        if (migrationResult.needsMigration) {
          const updateData: any = {
            unit: migrationResult.unit,
          };

          if (data.specification !== undefined) {
            if (!data.specification && migrationResult.specification) {
              updateData.specification = migrationResult.specification;
            }
          }

          if (!dryRun) {
            batch.update(doc.ref, updateData);
            batchCount++;

            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              batchCount = 0;
            }
          }

          stats.migratedDocuments++;
          console.log(`  ✓ ${doc.id}: "${migrationResult.originalUnit}" → unit="${migrationResult.unit}"`);
        } else {
          stats.skippedDocuments++;
        }
      } catch (error: any) {
        stats.errorDocuments++;
        stats.errors.push({
          docId: doc.id,
          error: error.message,
        });
        console.error(`  ✗ ${doc.id}: ${error.message}`);
      }
    }

    if (!dryRun && batchCount > 0) {
      await batch.commit();
    }

  } catch (error: any) {
    console.error(`❌ allocation_details 移行エラー: ${error.message}`);
    throw error;
  }

  return stats;
}

/**
 * haibun_orders コレクション（products配列）を移行
 */
async function migrateHaibunOrders(dryRun: boolean): Promise<MigrationStats> {
  console.log('\n🔄 haibun_orders (products配列) の移行を開始...');
  const stats = createStats();

  try {
    // 全ドキュメントを取得（productsフィールドの中身を確認する必要があるため）
    const snapshot = await db.collection('haibun_orders').get();

    console.log(`  対象ドキュメント数: ${snapshot.size}`);

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const products = data.products || [];

        let hasChanges = false;
        const updatedProducts = products.map((product: any) => {
          const migrationResult = migrateUnitFormat(product.unit);

          if (migrationResult.needsMigration) {
            hasChanges = true;
            stats.migratedDocuments++;

            const updatedProduct = {
              ...product,
              unit: migrationResult.unit,
            };

            // specificationの更新
            if (product.specification !== undefined) {
              if (!product.specification && migrationResult.specification) {
                updatedProduct.specification = migrationResult.specification;
              }
            }

            console.log(`  ✓ ${doc.id}/product: "${migrationResult.originalUnit}" → unit="${migrationResult.unit}"`);
            return updatedProduct;
          }

          return product;
        });

        if (hasChanges) {
          if (!dryRun) {
            batch.update(doc.ref, { products: updatedProducts });
            batchCount++;

            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              batchCount = 0;
            }
          }
        } else {
          stats.skippedDocuments++;
        }

        stats.totalDocuments += products.length;

      } catch (error: any) {
        stats.errorDocuments++;
        stats.errors.push({
          docId: doc.id,
          error: error.message,
        });
        console.error(`  ✗ ${doc.id}: ${error.message}`);
      }
    }

    if (!dryRun && batchCount > 0) {
      await batch.commit();
    }

  } catch (error: any) {
    console.error(`❌ haibun_orders 移行エラー: ${error.message}`);
    throw error;
  }

  return stats;
}

/**
 * ユーザーに確認を求める
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetCollection = args.find(arg => arg.startsWith('--collection='))?.split('=')[1];

  console.log('🚀 Firestore Unit Format Migration Script');
  console.log('==========================================\n');

  if (dryRun) {
    console.log('⚠️  ドライランモード（実際には更新しません）\n');
  } else {
    console.log('🔥 本番実行モード\n');
    console.log('⚠️  重要な注意事項:');
    console.log('  1. 必ず事前にFirestoreのバックアップを取得してください');
    console.log('  2. 低負荷時間帯に実施してください');
    console.log('  3. 実行中はアプリケーションを停止することを推奨します\n');

    const confirmed = await confirm('本当に実行しますか？');
    if (!confirmed) {
      console.log('\n❌ 中止しました');
      process.exit(0);
    }
  }

  const allStats: Record<string, MigrationStats> = {};

  try {
    // 対象コレクションを決定
    const collections = targetCollection
      ? [targetCollection]
      : ['pricing_history', 'product_history', 'allocation_details', 'haibun_orders'];

    for (const collection of collections) {
      switch (collection) {
        case 'pricing_history':
          allStats['pricing_history'] = await migratePricingHistory(dryRun);
          break;
        case 'product_history':
          allStats['product_history'] = await migrateProductHistory(dryRun);
          break;
        case 'allocation_details':
          allStats['allocation_details'] = await migrateAllocationDetails(dryRun);
          break;
        case 'haibun_orders':
          allStats['haibun_orders'] = await migrateHaibunOrders(dryRun);
          break;
        default:
          console.error(`❌ 不明なコレクション: ${collection}`);
      }
    }

    // 全体の統計を表示
    console.log('\n');
    console.log('==========================================');
    console.log('📈 全体の移行結果');
    console.log('==========================================');

    Object.entries(allStats).forEach(([name, stats]) => {
      printStats(name, stats);
    });

    const totalMigrated = Object.values(allStats).reduce((sum, s) => sum + s.migratedDocuments, 0);
    const totalErrors = Object.values(allStats).reduce((sum, s) => sum + s.errorDocuments, 0);

    console.log('\n📊 合計:');
    console.log(`  Migrated: ${totalMigrated} ドキュメント ✅`);
    console.log(`  Errors: ${totalErrors} ドキュメント ❌`);

    if (dryRun) {
      console.log('\n✨ ドライラン完了（データは変更されていません）');
      console.log('   本番実行するには --dry-run フラグを外してください');
    } else {
      console.log('\n✅ 移行完了！');
    }

  } catch (error: any) {
    console.error('\n❌ 移行失敗:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
