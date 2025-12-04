# Firestoreデータ移行状況の確認方法

## 現在の状況

✅ スクリプトを実行しましたが、**Firestoreセキュリティルールにより読み取りが制限されています**

```
❌ エラー: Missing or insufficient permissions.
```

これは**正常な動作**です。Firestoreルールでは、すべてのデータが認証済みユーザーのみアクセス可能に設定されています（`firestore.rules:192-246`）。

## データ移行状況を確認する3つの方法

### 方法1: Firebase Console（推奨・最も簡単）

#### 手順

1. **Firebase Consoleにアクセス**
   ```
   https://console.firebase.google.com/project/haibun-distribution/firestore/databases/-default-/data
   ```

2. **コレクションを選択**
   - `pricing_history` - 価格履歴
   - `product_history` - 商品履歴
   - `allocation_details` - 配分履歴明細
   - `haibun_orders` - 注文データ

3. **ランダムに数件のドキュメントを開く**

4. **`unit` フィールドを確認**

   **V1形式（未移行）の例:**
   ```json
   {
     "unit": "100gあたり",
     "specification": "",
     ...
   }
   ```

   **V2形式（移行済み）の例:**
   ```json
   {
     "unit": "gあたり",
     "specification": "100",
     ...
   }
   ```

5. **判定**
   - ✅ すべてのドキュメントで `unit` が `"gあたり"` または `"kgあたり"` の基本形式 → **移行完了**
   - ⚠️ `unit` に数値が含まれる（例: `"100gあたり"`） → **移行が必要**
   - ℹ️ `unit` が `"個"`, `"本"`, `"玉"` など → 移行不要（個数ベース）

### 方法2: Firebase Admin SDK（サービスアカウント認証）

#### 前提条件
- Firebase Console からサービスアカウントキーを取得済み
- `GOOGLE_APPLICATION_CREDENTIALS` 環境変数を設定済み

#### 手順

1. **環境変数設定**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

2. **確認スクリプトを修正して実行**

   現在の `check-migration-status.ts` は Firebase Client SDK を使用していますが、Admin SDK版を作成することもできます。

   または、移行スクリプト自体にデータ確認機能を追加できます：

   ```bash
   # 移行スクリプトのドライランで確認可能
   npm run migrate:unit-format:dry-run
   ```

   **期待される出力:**
   ```
   🔄 pricing_history の移行を開始...
   ✅ 50件のV1形式ドキュメントを検出
   例: "100gあたり" → "100" + "gあたり"

   移行が必要なドキュメント総数: 50件
   ```

### 方法3: アプリケーション経由（フロントエンドで確認）

#### 手順

1. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

2. **ブラウザでログイン**
   - アプリケーションにログイン
   - ユーザー認証を完了

3. **ブラウザのコンソールでクエリ実行**

   ```javascript
   // V1形式のデータを検索
   const db = getFirestore();
   const q = query(
     collection(db, 'pricing_history'),
     limit(10)
   );

   const snapshot = await getDocs(q);
   snapshot.forEach(doc => {
     const data = doc.data();
     console.log('unit:', data.unit);
     console.log('specification:', data.specification);
     console.log('---');
   });
   ```

4. **結果を確認**
   - `unit` に数値が含まれていれば V1形式
   - `unit` が基本形式（"gあたり"）で `specification` に数値があれば V2形式

## 移行が必要かどうかの判断基準

### ケース1: すべてV1形式
```
unit: "100gあたり", "5kgあたり", "200gあたり"
specification: "" または null
```
**→ 移行スクリプトの実行が必要**

### ケース2: すべてV2形式
```
unit: "gあたり", "kgあたり"
specification: "100", "5", "200"
```
**→ 移行完了・Phase 9に進める**

### ケース3: V1とV2が混在
```
一部: unit: "100gあたり"
一部: unit: "gあたり", specification: "100"
```
**→ 移行スクリプトを再実行して完了させる**

### ケース4: 個数ベースのみ
```
unit: "個", "本", "玉", "枚"
specification: "" または "1"
```
**→ 移行不要（重量ベースではない）**

## データ移行実行の判断

### 移行を実行する条件
1. Firebase Consoleで V1形式のデータが確認できた
2. サービスアカウントキーを取得済み
3. バックアップを取得済み（または取得可能）

### 移行の実行手順
```bash
# 1. 認証設定
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# 2. ドライランで影響範囲を確認
npm run migrate:unit-format:dry-run

# 3. バックアップ取得
gcloud firestore export gs://haibun-distribution-backup/backup-$(date +%Y%m%d-%H%M%S) \
  --project=haibun-distribution

# 4. 本番実行
npm run migrate:unit-format

# 5. Firebase Consoleで結果を確認
```

## よくある質問

### Q: データがない場合はどうする？
A: 新規プロジェクトまたはテスト環境の場合、データ移行は不要です。直接V2形式でデータを保存してください。

### Q: 一部のコレクションだけ移行したい
A: 移行スクリプトは `--collection` オプションで特定のコレクションを指定できます。

```bash
npm run migrate:unit-format -- --collection=pricing_history
```

### Q: エラーが発生した場合は？
A: バックアップから復元できます。`MIGRATION_TEST_PLAN.md` のトラブルシューティングセクションを参照してください。

### Q: 移行後にV1形式のデータが追加された場合は？
A: 現在のコードは `calculateEffectiveQuantityWithMigration` を使用しているため、V1/V2どちらでも正常に動作します。移行スクリプトを再実行すれば、新しいV1形式データもV2に変換されます。

## 次のステップ

### 移行前（現在）
1. ✅ Firebase Consoleでデータ形式を確認
2. [ ] V1形式データの有無を判断
3. [ ] 移行が必要な場合は、サービスアカウントキーを取得

### 移行中
4. [ ] ドライランで影響範囲を確認
5. [ ] バックアップを取得
6. [ ] 本番移行を実行
7. [ ] Firebase Consoleで結果を検証

### 移行後（Phase 9）
8. [ ] V2直接呼び出しに更新
9. [ ] 移行ヘルパー関数を非推奨化
10. [ ] テスト実行して動作確認

## 関連ドキュメント
- [MIGRATION_TEST_PLAN.md](./MIGRATION_TEST_PLAN.md) - 移行テスト計画
- [README.md](./README.md) - 移行スクリプト使用方法
- [../../unit-conversion-logic-analysis.md](../../unit-conversion-logic-analysis.md) - オプションX実装計画
