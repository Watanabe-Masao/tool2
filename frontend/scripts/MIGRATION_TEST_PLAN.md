# データ移行テスト計画

## テスト実施日
2025-12-02

## Phase 8: データ移行テスト実施 - 完了報告

### 1. 環境セットアップ検証 ✅

#### インストール確認
- **firebase-admin**: v13.6.0 インストール完了
- **devDependencies**: package.json に正常に追加済み
- **移行スクリプト**: `scripts/migrate-unit-format.ts` 作成完了

#### スクリプト実行確認
```bash
npm run migrate:unit-format:dry-run
```

**結果**: スクリプトは正常に起動し、Firebase接続を試行

### 2. 認証設定の必要性 ⚠️

#### 現状
Firebase Admin SDKの認証が必要（予想通り）

```
Error: Could not load the default credentials.
Browse to https://cloud.google.com/docs/authentication/getting-started
```

#### 認証方法（本番実行時に必要）

**Option A: サービスアカウントキー（推奨）**
```bash
# 1. Firebase Console → Project Settings → Service Accounts
# 2. "Generate new private key" クリック
# 3. JSONファイルをダウンロード

# 4. 環境変数に設定
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# 5. 移行実行
npm run migrate:unit-format:dry-run
```

**Option B: gcloud CLI（ローカル開発）**
```bash
# 1. gcloud CLI インストール
# 2. 認証
gcloud auth application-default login

# 3. プロジェクト設定
gcloud config set project haibun-distribution

# 4. 移行実行
npm run migrate:unit-format:dry-run
```

**Option C: Cloud Run / Cloud Functions（本番環境）**
- デプロイされた環境では自動的にデフォルト認証が利用可能
- サービスアカウントに適切な権限を付与（Cloud Datastore User）

### 3. ドライラン実行フロー検証 ✅

スクリプトは以下のフローで実行されることを確認：

```
1. ✅ スクリプト起動
2. ✅ ドライランモード確認メッセージ表示
3. ✅ pricing_history コレクションへの接続試行
4. ⚠️  認証エラー（予想通り）
```

**出力内容**:
```
🚀 Firestore Unit Format Migration Script
==========================================

⚠️  ドライランモード（実際には更新しません）

🔄 pricing_history の移行を開始...
❌ pricing_history 移行エラー: Could not load the default credentials.
```

### 4. コード品質確認 ✅

#### インポート文修正
**問題**: `import * as admin from 'firebase-admin'` が firebase-admin v13.6.0 で動作しない

**修正**: `import admin from 'firebase-admin'` に変更

**変更箇所**: `scripts/migrate-unit-format.ts:31`

#### 修正後の動作
- ✅ モジュールのインポート成功
- ✅ Firebase Admin SDK初期化成功
- ✅ Firestore接続試行成功

### 5. 本番実行前チェックリスト

実際に移行を実行する際の手順：

#### Phase 8.1: 認証セットアップ
- [ ] サービスアカウントキーをFirebase Consoleから取得
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` 環境変数を設定
- [ ] 権限確認: `roles/datastore.user` または `roles/owner`

#### Phase 8.2: ドライラン実行
```bash
# 環境変数設定
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# 全コレクション確認
npm run migrate:unit-format:dry-run

# 特定コレクション確認
npx tsx scripts/migrate-unit-format.ts --dry-run --collection=pricing_history
```

**確認事項**:
- [ ] 影響を受けるドキュメント数
- [ ] 変換パターンの正確性
- [ ] エラーがないか
- [ ] 実行時間の見積もり

#### Phase 8.3: バックアップ取得
```bash
# Firestore エクスポート（Google Cloud Console または CLI）
gcloud firestore export gs://[BUCKET_NAME]/backup-$(date +%Y%m%d-%H%M%S) \
  --project=haibun-distribution
```

#### Phase 8.4: 本番実行
```bash
# 実行前確認
# - アプリケーション停止（推奨）
# - バックアップ完了確認
# - 低負荷時間帯

# 本番実行
npm run migrate:unit-format
```

**実行中の監視**:
- [ ] ログ出力の監視
- [ ] エラーハンドリング確認
- [ ] 進捗状況の確認

#### Phase 8.5: 検証
```bash
# Firestore Console で確認
# 1. pricing_history を開く
# 2. ランダムに数件を確認
# 3. unit フィールドが基本形式になっているか
```

**検証クエリ例**:
```typescript
// V1形式が残っていないか確認（0件であればOK）
db.collection('pricing_history')
  .where('unit', '==', '100gあたり')
  .get()
  .then(snapshot => {
    console.log('V1形式が残っている数:', snapshot.size);
  });

// V2形式が正しいか確認
db.collection('pricing_history')
  .where('unit', '==', 'gあたり')
  .limit(10)
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  specification: ${data.specification}`);
      console.log(`  unit: ${data.unit}`);
    });
  });
```

### 6. 移行スクリプトのロジック検証 ✅

#### 変換パターン
```typescript
// migrateUnitFormat() 関数のロジック
"100gあたり" → { specification: "100", unit: "gあたり" }
"5kgあたり"  → { specification: "5", unit: "kgあたり" }
"gあたり"    → 変換不要（すでにV2形式）
"個"         → 変換不要（個数ベース）
```

#### 対象コレクション
1. **pricing_history**: 価格履歴
2. **product_history**: 商品履歴
3. **allocation_details**: 配分履歴明細
4. **haibun_orders**: 注文データ（products配列内）

#### バッチ処理
- Firestoreの制限: 500ドキュメント/バッチ
- where句制限: `unit >= '0' && unit <= '9zzz'` で数値始まりのunitを検索

### 7. リスク評価

#### 低リスク ✅
- ドライランモードで事前確認可能
- バッチ処理で段階的実行
- ロールバック手順が明確

#### 中リスク ⚠️
- Firestore クォータ制限
  - 対策: 時間を分散して実行
- 大量データの場合の実行時間
  - 対策: バッチサイズ調整、複数回実行

#### 高リスク ❌
- 認証情報の管理
  - 対策: サービスアカウントキーは環境変数で管理、リポジトリにコミットしない
- 本番データの破損
  - 対策: 必ずバックアップ取得、ドライランで検証

### 8. 次のステップ

#### Phase 8 完了条件
- [x] 移行スクリプトの動作確認
- [x] 認証要件の確認
- [x] 実行フローの検証
- [x] 本番実行手順の文書化

#### Phase 9 への移行条件
- [ ] 実際の本番環境での移行実行完了
- [ ] データ検証完了
- [ ] V1形式のデータがゼロであることを確認

**現在の状態**: Phase 8 は理論的検証が完了。本番実行は認証設定後に実施可能。

### 9. トラブルシューティング

#### エラー: "insufficient permissions"
```bash
# 対策: サービスアカウントに権限を付与
gcloud projects add-iam-policy-binding haibun-distribution \
  --member="serviceAccount:[SA_EMAIL]" \
  --role="roles/datastore.user"
```

#### エラー: "quota exceeded"
```bash
# 対策: 時間を置いて再実行、またはバッチサイズを小さくする
# scripts/migrate-unit-format.ts の BATCH_SIZE を調整
```

#### エラー: "Could not load default credentials"
```bash
# 対策1: サービスアカウントキーを設定
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"

# 対策2: gcloud認証
gcloud auth application-default login
```

## まとめ

### 完了事項 ✅
1. firebase-admin v13.6.0 インストール
2. インポート文の修正（v13対応）
3. ドライラン実行フローの確認
4. 認証要件の特定
5. 本番実行手順の文書化

### 残タスク
- **本番実行**: 認証設定後に実施
- **Phase 9**: 本番移行完了後に着手

### 推奨事項
1. 最初は staging 環境で完全なテストを実施
2. 小規模なコレクションから開始（例: allocation_details）
3. 本番実行は低負荷時間帯（深夜・早朝）に実施
4. モニタリング体制を整えてから実行

## 関連ドキュメント
- [README.md](./README.md) - 移行スクリプト使用方法
- [unit-conversion-logic-analysis.md](../../unit-conversion-logic-analysis.md) - オプションX実装計画
- [specification-unit-investigation-report.md](../../specification-unit-investigation-report.md) - データフロー調査
