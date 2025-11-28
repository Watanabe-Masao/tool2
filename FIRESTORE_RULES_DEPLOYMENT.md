# Firestore Rules Deployment Guide

## 現在の状況

✅ Firestore Indexes: デプロイ済み（すべて「有効」）
❌ Firestore Rules: デプロイが必要

## エラーの原因

```
FirebaseError: Missing or insufficient permissions
```

このエラーは、Firestore RulesがFirebaseにデプロイされていないために発生しています。
ローカルの `firestore.rules` ファイルには正しいルールが記述されていますが、
Firebase上にデプロイされていないため、権限エラーが発生します。

## デプロイ手順

### 方法1: Firebase Consoleから直接デプロイ（推奨）

1. **Firebase Consoleを開く**
   - https://console.firebase.google.com/
   - プロジェクト「haibun-distribution」を選択

2. **Firestore Databaseページへ移動**
   - 左メニューから「Firestore Database」をクリック

3. **ルールタブを開く**
   - 上部タブから「ルール」をクリック

4. **現在のルールを確認**
   - エディタに表示されているルールを確認
   - もし `allocation_batches` と `allocation_details` のルールが **ない** 場合は、次のステップへ

5. **ルールを更新**
   - エディタで以下の2つのセクションを追加（または確認）:

```javascript
// 配分履歴バッチ（学習データ用）
match /allocation_batches/{batchId} {
  // 読み取り: 認証済みユーザーのみ（自分のバッチのみ）
  allow read: if isAuthenticated() &&
                 resource.data.userId == request.auth.uid;
  // 作成: 認証済みユーザーのみ + 必須フィールドチェック
  allow create: if isAuthenticated() &&
                   request.resource.data.userId == request.auth.uid &&
                   request.resource.data.keys().hasAll(['userId', 'delivery_date', 'suppliers', 'product_count', 'total_quantity', 'created_at', 'updated_at']) &&
                   request.resource.data.delivery_date is string &&
                   request.resource.data.suppliers is list &&
                   request.resource.data.product_count is number &&
                   request.resource.data.total_quantity is number;
  // 更新: 自分のバッチのみ
  allow update: if isAuthenticated() &&
                   resource.data.userId == request.auth.uid;
  // 削除: 自分のバッチのみ
  allow delete: if isAuthenticated() &&
                   resource.data.userId == request.auth.uid;
}

// 配分履歴明細（学習データ用）
match /allocation_details/{detailId} {
  // 読み取り: 認証済みユーザーのみ（自分の明細のみ）
  allow read: if isAuthenticated() &&
                 resource.data.userId == request.auth.uid;
  // 作成: 認証済みユーザーのみ + 必須フィールドチェック
  allow create: if isAuthenticated() &&
                   request.resource.data.userId == request.auth.uid &&
                   request.resource.data.keys().hasAll(['batch_id', 'userId', 'product_name', 'origin', 'specification', 'supplier', 'total_delivery', 'store_allocations', 'allocation_method', 'has_manual_adjustment', 'created_at']) &&
                   request.resource.data.batch_id is string &&
                   request.resource.data.product_name is string &&
                   request.resource.data.store_allocations is list &&
                   request.resource.data.allocation_method is string;
  // 更新: 自分の明細のみ
  allow update: if isAuthenticated() &&
                   resource.data.userId == request.auth.uid;
  // 削除: 自分の明細のみ
  allow delete: if isAuthenticated() &&
                   resource.data.userId == request.auth.uid;
}
```

6. **公開ボタンをクリック**
   - エディタの右上にある **「公開」** または **"Publish"** ボタンをクリック
   - 確認ダイアログが表示されたら「公開」をクリック

7. **デプロイ完了を待つ**
   - 「ルールが正常に公開されました」というメッセージが表示されるまで待つ
   - 通常は数秒〜数十秒で完了します

### 方法2: ローカルファイル全体をコピー（簡単）

ローカルの `firestore.rules` ファイルの内容をそのままFirebase Consoleにコピーする方法です：

1. ローカルの `firestore.rules` ファイルを開く
2. ファイルの内容を **すべて** コピー（Ctrl+A → Ctrl+C）
3. Firebase Console → Firestore Database → ルール タブを開く
4. エディタの内容を **すべて削除**
5. コピーした内容を **貼り付け**
6. 右上の **「公開」** ボタンをクリック

## デプロイ後の確認

1. **アプリケーションをリロード**
   - ブラウザで配分表作成ツールを開いているタブをリロード（F5）

2. **配分履歴ページを確認**
   - ヘッダーメニューから「配分履歴」をクリック
   - エラーなく履歴が表示されることを確認

3. **削除機能を確認**
   - 履歴の🗑️ボタンをクリック
   - 削除確認ダイアログが表示され、削除が成功することを確認

4. **詳細表示を確認**
   - 履歴の👁️ボタンをクリック
   - 詳細モーダルが開き、商品一覧が表示されることを確認

## トラブルシューティング

### 「公開」ボタンが見つからない

- ページを再読み込みしてください
- Firebase Consoleで正しいプロジェクト（haibun-distribution）を選択しているか確認してください
- 権限が足りない場合は、プロジェクトオーナーに依頼してください

### デプロイ後もエラーが出る

1. **ブラウザのキャッシュをクリア**
   - Ctrl+Shift+Delete → キャッシュをクリア
   - アプリケーションをリロード

2. **認証状態を確認**
   - 一度ログアウトして再ログインしてみる
   - ブラウザの開発者ツール（F12）→ Console で `firebase.auth().currentUser` を実行
   - ユーザー情報が表示されるか確認

3. **ルールが正しくデプロイされたか確認**
   - Firebase Console → Firestore Database → ルール
   - 「allocation_batches」と「allocation_details」のルールが含まれているか確認
   - ページ上部に「最終公開日時」が表示されているか確認

### それでもエラーが出る場合

ブラウザの開発者ツール（F12）→ Consoleタブでエラーメッセージ全文をコピーして、
以下の情報とともに報告してください：

- エラーメッセージ全文
- Firebase Console のルールタブのスクリーンショット
- 最終公開日時

## 参考情報

- **プロジェクト名**: haibun-distribution
- **必要なコレクション**: `allocation_batches`, `allocation_details`
- **ローカルルールファイル**: `firestore.rules`
- **ローカルインデックスファイル**: `firestore.indexes.json`（✅ デプロイ済み）

## 次のステップ

1. ✅ このガイドに従ってFirestore Rulesをデプロイ
2. ✅ アプリケーションをリロードして動作確認
3. ✅ 配分履歴の表示・削除・詳細表示が正常に動作することを確認
