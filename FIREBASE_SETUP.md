# Firebase セットアップガイド

このドキュメントでは、配分表作成システムの Firebase 設定手順を説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [方法1: Firebase Console での設定（推奨）](#方法1-firebase-console-での設定推奨)
3. [方法2: Firebase CLI での設定（上級者向け）](#方法2-firebase-cli-での設定上級者向け)
4. [動作確認](#動作確認)
5. [トラブルシューティング](#トラブルシューティング)

---

## 🔧 前提条件

- Firebase プロジェクト「haibun-distribution」が作成済み
- Firebase Console へのアクセス権限
- （CLI使用の場合）Node.js 18以上がインストール済み

---

## 方法1: Firebase Console での設定（推奨）

### ステップ1: Firestore Database の作成

1. **Firebase Console にアクセス**
   - URL: https://console.firebase.google.com/
   - プロジェクト「haibun-distribution」を選択

2. **Firestore Database を作成**
   ```
   左メニュー → Firestore Database → データベースを作成
   ```

3. **セキュリティルールを選択**
   - 「本番環境モードで開始」を選択
   - （後でルールを設定するので、どちらでも可）

4. **ロケーションを選択**
   - 推奨: `asia-northeast1`（東京）
   - または `asia-northeast2`（大阪）
   - ⚠️ ロケーションは後から変更できません

5. **「有効にする」をクリック**
   - データベース作成完了まで数分待ちます

### ステップ2: Firestore Security Rules の設定

1. **ルールタブに移動**
   ```
   Firestore Database → ルール タブ
   ```

2. **以下のルールをコピー&ペースト**

   プロジェクトの `firestore.rules` ファイルの内容をすべてコピーして貼り付けてください。

   または、以下を直接コピー:

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       // ヘルパー関数: 認証済みユーザーかチェック
       function isAuthenticated() {
         return request.auth != null;
       }

       // ヘルパー関数: 自分のデータかチェック
       function isOwner(userId) {
         return isAuthenticated() && request.auth.uid == userId;
       }

       // ユーザープロファイル
       match /users/{userId} {
         allow read: if isOwner(userId);
         allow create: if isAuthenticated() && request.auth.uid == userId;
         allow update: if isOwner(userId);
         allow delete: if false;
       }

       // 帳合先マスター
       match /suppliers/{supplierId} {
         allow read: if isAuthenticated() && resource.data.createdBy == request.auth.uid;
         allow create: if isAuthenticated() && request.resource.data.createdBy == request.auth.uid;
         allow update: if isAuthenticated() && resource.data.createdBy == request.auth.uid;
         allow delete: if isAuthenticated() && resource.data.createdBy == request.auth.uid;
       }

       // 商品マスター
       match /products/{productId} {
         allow read: if isAuthenticated() && resource.data.createdBy == request.auth.uid;
         allow create: if isAuthenticated() && request.resource.data.createdBy == request.auth.uid;
         allow update: if isAuthenticated() && resource.data.createdBy == request.auth.uid;
         allow delete: if isAuthenticated() && resource.data.createdBy == request.auth.uid;
       }

       // 配分データ（注文）
       match /orders/{orderId} {
         allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
         allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
         allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
         allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
       }

       // 入力履歴（オートコンプリート用）
       match /history/{userId}/{type}/{itemId} {
         allow read: if isOwner(userId);
         allow write: if isOwner(userId);
         allow delete: if isOwner(userId);
       }

       // デフォルト: すべて拒否
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```

3. **「公開」ボタンをクリック**
   - ルールが適用されます

### ステップ3: Authentication の有効化

1. **Authentication に移動**
   ```
   左メニュー → Authentication → 開始
   ```

2. **Sign-in method タブを選択**

3. **メール/パスワードを有効化**
   ```
   メール/パスワード → 有効にする → 保存
   ```

4. **（オプション）メールリンクを有効化**
   - パスワードレスログインを使用する場合

### ステップ4: Firestore インデックスの作成

複合クエリを使用するため、インデックスが必要です。

**自動作成（推奨）**
- アプリを実行してクエリを実行すると、Firebase が自動的にインデックス作成リンクを提供します
- エラーログのリンクをクリックして自動作成

**手動作成**
1. Firestore Database → インデックス タブ
2. 「複合」タブを選択
3. 以下のインデックスを作成:

   | コレクション | フィールド1 | フィールド2 | フィールド3 |
   |------------|-----------|-----------|-----------|
   | suppliers | createdBy (昇順) | updatedAt (降順) | - |
   | products | supplierId (昇順) | usageCount (降順) | - |
   | products | createdBy (昇順) | usageCount (降順) | - |
   | products | supplierId (昇順) | createdBy (昇順) | usageCount (降順) |
   | orders | userId (昇順) | deliveryDate (昇順) | createdAt (降順) |
   | orders | userId (昇順) | deliveryDate (昇順) | - |

---

## 方法2: Firebase CLI での設定（上級者向け）

### 前提条件

Node.js と Firebase CLI がインストール済みであること。

### インストール

```bash
# Firebase CLI をグローバルインストール
npm install -g firebase-tools

# バージョン確認
firebase --version
```

### ステップ1: ログイン

```bash
firebase login
```

ブラウザが開き、Google アカウントでログインします。

### ステップ2: プロジェクトの初期化（既存プロジェクトの場合はスキップ）

```bash
# プロジェクトディレクトリに移動
cd /home/user/tool2

# Firebase プロジェクトを選択
firebase use haibun-distribution
```

既存の `firebase.json` が使用されます。

### ステップ3: Firestore ルールのデプロイ

```bash
# Firestore ルールをデプロイ
firebase deploy --only firestore:rules

# 成功メッセージ
✔  Deploy complete!
```

### ステップ4: Firestore インデックスのデプロイ

```bash
# Firestore インデックスをデプロイ
firebase deploy --only firestore:indexes

# インデックス作成には数分かかる場合があります
✔  Deploy complete!
```

### すべてを一度にデプロイ

```bash
firebase deploy --only firestore
```

---

## 🧪 動作確認

### 1. Authentication のテスト

**ブラウザで確認:**
1. アプリの `/login` ページにアクセス
2. 「新規登録」タブをクリック
3. テストユーザーを作成:
   ```
   名前: テストユーザー
   メール: test@example.com
   パスワード: test123456
   ```
4. 「新規登録」ボタンをクリック
5. 自動的にログインし、メインページにリダイレクトされるはず

**Firebase Console で確認:**
```
Authentication → Users タブ
→ テストユーザーが表示されているか確認
```

### 2. Firestore のテスト

**ブラウザのコンソールで確認:**
1. F12 キーで開発者ツールを開く
2. Console タブを選択
3. 以下のメッセージが表示されるはず:
   ```
   Firebase initialized successfully
   User authenticated: test@example.com
   ```

**Firebase Console で確認:**
```
Firestore Database → データ タブ
→ users コレクションにユーザードキュメントが作成されているか確認
```

### 3. Security Rules のテスト

**Firebase Console でテスト:**
1. Firestore Database → ルール タブ
2. 「ルールのシミュレーション」をクリック
3. テストケースを実行:

   **テスト1: 認証なしでの読み取り（失敗すべき）**
   ```
   ロケーション: /users/test-user-id
   タイプ: get
   認証: なし
   → 結果: ❌ 拒否（正常）
   ```

   **テスト2: 認証ありでの自分のデータ読み取り（成功すべき）**
   ```
   ロケーション: /users/test-user-id
   タイプ: get
   認証: test-user-id
   → 結果: ✅ 許可（正常）
   ```

---

## 🐛 トラブルシューティング

### エラー1: "Missing or insufficient permissions"

**原因:** Security Rules が正しく設定されていない

**解決策:**
1. Firestore Database → ルール を確認
2. 上記のルールが正しく設定されているか確認
3. 「公開」ボタンを押したか確認

### エラー2: "The query requires an index"

**原因:** 複合クエリに必要なインデックスが作成されていない

**解決策:**
1. エラーメッセージ内のリンクをクリック
2. 自動的に Firebase Console のインデックス作成ページが開く
3. 「インデックスを作成」をクリック
4. 数分待ってから再試行

または、Firebase CLI を使用:
```bash
firebase deploy --only firestore:indexes
```

### エラー3: "Email/password accounts are not enabled"

**原因:** Authentication で Email/Password が有効化されていない

**解決策:**
1. Firebase Console → Authentication → Sign-in method
2. 「メール/パスワード」を選択
3. 「有効にする」をクリック
4. 保存

### エラー4: "Firebase: Error (auth/invalid-api-key)"

**原因:** API キーが間違っている

**解決策:**
1. Firebase Console → プロジェクトの設定 → 全般
2. Web アプリの設定を確認
3. `app.py` の `/api/firebase-config` エンドポイントの値を確認
4. 環境変数が正しく設定されているか確認

### エラー5: "auth/unauthorized-domain" エラー（スマホログイン時）

**症状:** スマートフォンでログイン時に `auth/unauthorized-domain` エラーが発生し、ログインボタンが押せない

**原因:** Render.comのデプロイメントドメインがFirebase の承認済みドメインリストに登録されていない

**解決策:**
1. Firebase Console → Authentication → Settings → Authorized domains
2. アプリのドメインを追加:
   - `localhost`（開発環境）
   - `tool2.onrender.com`（本番環境 - **Render.comのデプロイURL**）

**詳細な手順:** [docs/FIX_AUTH_DOMAIN_ERROR.md](docs/FIX_AUTH_DOMAIN_ERROR.md) を参照

### エラー6: "CORS policy" エラー

**原因:** Firebase のオリジン設定が間違っている

**解決策:**
1. Firebase Console → Authentication → Settings → Authorized domains
2. アプリのドメインを追加（上記と同様）

---

## 📚 参考リンク

- [Firestore Security Rules ドキュメント](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI リファレンス](https://firebase.google.com/docs/cli)
- [Firestore インデックス管理](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase Authentication ドキュメント](https://firebase.google.com/docs/auth)

---

## ✅ セットアップ完了チェックリスト

設定が完了したら、以下を確認してください:

- [ ] Firestore Database を作成済み（ロケーション: asia-northeast1）
- [ ] Firestore Security Rules をデプロイ済み
- [ ] Authentication で Email/Password を有効化済み
- [ ] テストユーザーを作成して動作確認済み
- [ ] Firestore にユーザードキュメントが作成されることを確認
- [ ] ブラウザコンソールにエラーが出ていない
- [ ] Security Rules シミュレーションでテスト済み
- [ ] （オプション）Firestore インデックスを作成済み

すべて完了したら、アプリケーションが正常に動作します！

---

**最終更新日**: 2025-01-12
**バージョン**: 2.0.1
