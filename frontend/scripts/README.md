# データ移行スクリプト

## migrate-unit-format.ts

V1形式（`unit: "100gあたり"`）からV2形式（`specification: "100", unit: "gあたり"`）への
Firestoreデータ移行スクリプト。

### 対象コレクション

1. `pricing_history` - 価格履歴
2. `product_history` - 商品履歴
3. `allocation_details` - 配分履歴明細
4. `haibun_orders` - 注文データ（products配列内）

### 前提条件

- Firebase Admin SDK が利用可能
- 適切な権限を持つサービスアカウント
- Firestoreへのアクセス権限

### 使用方法

#### 1. ドライラン（推奨）

まず影響範囲を確認：

```bash
cd frontend
npx tsx scripts/migrate-unit-format.ts --dry-run
```

#### 2. 特定のコレクションのみ

```bash
# pricing_history のみ
npx tsx scripts/migrate-unit-format.ts --dry-run --collection=pricing_history

# product_history のみ
npx tsx scripts/migrate-unit-format.ts --dry-run --collection=product_history
```

#### 3. 本番実行

**⚠️ 必ず事前にバックアップを取得してください**

```bash
# Firestoreバックアップ（Google Cloud Console または gcloud CLI）
gcloud firestore export gs://[BUCKET_NAME]/backup-$(date +%Y%m%d-%H%M%S)

# 移行実行
npx tsx scripts/migrate-unit-format.ts
```

### 実行フロー

```
1. ドライラン実行
   ↓
2. 影響範囲の確認
   ↓
3. Firestoreバックアップ取得
   ↓
4. アプリケーション停止（推奨）
   ↓
5. 本番実行
   ↓
6. 検証
   ↓
7. アプリケーション再開
```

### 移行ロジック

```typescript
// 変換前（V1）
{
  specification: "100",
  unit: "100gあたり"  // ← 完全形式
}

// 変換後（V2）
{
  specification: "100",  // ← 既存値を維持
  unit: "gあたり"        // ← 基本形式のみ
}
```

**パターン**:
- `"100gあたり"` → `specification: "100", unit: "gあたり"`
- `"gあたり"` → 変換不要（すでにV2形式）
- `"kgあたり"` → 変換不要
- `"個"`, `"本"` → 変換不要（個数ベース）

### 制限事項

- Firestoreバッチサイズ: 500ドキュメント/バッチ
- where句の制限により、`unit >= '0'` で数値始まりのunitのみを対象
- 大量データの場合は複数バッチに分割して実行

### ロールバック手順

移行後に問題が発生した場合：

#### 方法1: バックアップからリストア

```bash
gcloud firestore import gs://[BUCKET_NAME]/backup-[TIMESTAMP]
```

#### 方法2: 逆変換スクリプト（手動）

```typescript
// V2 → V1 への逆変換
const unit = specification ? `${specification}${unit}` : unit;
// specification フィールドをクリア（必要に応じて）
```

### トラブルシューティング

#### エラー: "insufficient permissions"

→ サービスアカウントに適切な権限を付与

```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
  --member="serviceAccount:[SA_EMAIL]" \
  --role="roles/datastore.user"
```

#### エラー: "quota exceeded"

→ Firestoreのクォータ制限に達した場合、時間を置いて再実行

#### 一部のドキュメントがスキップされる

→ 正常な動作（すでにV2形式、または個数ベースのため変換不要）

### 検証方法

移行後の確認：

```typescript
// Firestore Console で確認
// 1. pricing_history を開く
// 2. ランダムに数件を確認
// 3. unit フィールドが基本形式になっているか確認

// サンプルクエリ
db.collection('pricing_history')
  .where('unit', '==', '100gあたり')
  .get()
  .then(snapshot => {
    console.log('V1形式が残っている数:', snapshot.size);
    // 0件であればOK
  });
```

### スケジュール例

#### 小規模環境（< 10,000ドキュメント）

1. ドライラン: 5分
2. バックアップ: 10分
3. 本番実行: 10-20分
4. 検証: 5分

**合計: 約30-40分**

#### 大規模環境（> 100,000ドキュメント）

1. ドライラン: 30分
2. バックアップ: 1-2時間
3. 本番実行: 1-3時間（バッチ分割）
4. 検証: 30分

**合計: 約3-6時間**

### 関連ドキュメント

- [unit-conversion-logic-analysis.md](../../unit-conversion-logic-analysis.md) - 単位変換ロジック詳細
- [specification-unit-investigation-report.md](../../specification-unit-investigation-report.md) - データフロー調査

### サポート

問題が発生した場合:
1. エラーログを確認
2. ドライランで再現を確認
3. 必要に応じてロールバック
