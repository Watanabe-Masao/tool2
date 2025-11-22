# デプロイメントガイド

## 方法1: Google Cloud Shell（推奨・最も簡単）

Google Cloud Shellはブラウザ上で動作する無料のLinux環境で、Firebase CLIがプリインストールされています。

### 手順:

1. **Google Cloud Shellを開く**
   - https://shell.cloud.google.com/ にアクセス
   - Googleアカウントでログイン（Firebaseと同じアカウント）

2. **このリポジトリをクローン**
   ```bash
   git clone https://github.com/Watanabe-Masao/tool2.git
   cd tool2
   ```

3. **適切なブランチに切り替え**
   ```bash
   git checkout claude/fix-slide-index-bug-012iMMzRj7Cz9em2QPFfJZMF
   ```

4. **Firebaseにログイン**
   ```bash
   firebase login --no-localhost
   ```
   - 表示されたURLをクリック
   - 認証コードをコピー＆ペースト

5. **Firestoreルールをデプロイ**
   ```bash
   firebase deploy --only firestore:rules
   ```

6. **フロントエンドをデプロイ**
   ```bash
   firebase deploy --only hosting
   ```

完了！https://your-project.web.app で確認できます。

---

## 方法2: Firebase Consoleで手動デプロイ

### A. Firestoreルール（必須）

1. Firebase Console → Firestore Database → ルール
2. 以下の内容をコピー＆ペースト:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ヘルパー関数
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // ユーザープロファイル
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }

    // 配分表コレクション
    match /distributions/{distributionId} {
      // 読み取り: 認証済みユーザーのみ
      allow read: if isAuthenticated();

      // 作成: 認証済みユーザーのみ + 所有者が自分自身
      allow create: if isAuthenticated() &&
                       request.resource.data.userId == request.auth.uid;

      // 更新・削除: 所有者のみ
      allow update, delete: if isAuthenticated() &&
                               resource.data.userId == request.auth.uid;
    }

    // 店舗情報
    match /stores/{storeId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated(); // 管理者のみに制限する場合は条件を追加
    }

    // グループ情報
    match /groups/{groupId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // ストアランクマッピング
    match /store_rank_mappings/{storeId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // 商品情報
    match /products/{productId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // デバッグ情報（開発環境のみ）
    match /debug/{document=**} {
      allow read, write: if isAuthenticated();
    }

    // メールアドレス帳
    match /email_addresses/{addressId} {
      // 読み取り: 認証済みユーザーのみ（自分のアドレス帳のみ）
      allow read: if isAuthenticated() &&
                     resource.data.userId == request.auth.uid;

      // 作成: 認証済みユーザーのみ + 必須フィールドチェック
      allow create: if isAuthenticated() &&
                       request.resource.data.userId == request.auth.uid &&
                       request.resource.data.keys().hasAll(['name', 'email', 'userId']) &&
                       request.resource.data.name is string &&
                       request.resource.data.name.size() > 0 &&
                       request.resource.data.email is string &&
                       request.resource.data.email.size() > 0;

      // 更新: 自分のアドレス帳のみ
      allow update: if isAuthenticated() &&
                       resource.data.userId == request.auth.uid;

      // 削除: 自分のアドレス帳のみ
      allow delete: if isAuthenticated() &&
                       resource.data.userId == request.auth.uid;
    }
  }
}
```

3. 「公開」をクリック

### B. フロントエンド（Firebase Consoleからは直接アップロード不可）

Firebase Consoleのホスティングタブでは、CLIを使用する必要があります。
**方法1（Google Cloud Shell）を使用してください。**

---

## 方法3: GitHub Actions（自動化・今後のため）

将来的に自動デプロイを設定する場合:

1. Firebase CI tokenを取得（Google Cloud Shellで）:
   ```bash
   firebase login:ci
   ```

2. GitHubリポジトリ Settings → Secrets and variables → Actions
3. New repository secret:
   - Name: `FIREBASE_TOKEN`
   - Value: 上記で取得したトークン

4. GitHub Actionsワークフローが自動的にデプロイを実行

---

## 現在のデプロイ状況チェック

### Firestoreルール
Firebase Console → Firestore Database → ルール で確認
- `email_addresses` コレクションのルールが追加されているか確認

### インデックス
Firebase Console → Firestore Database → インデックス で確認
- `email_addresses` コレクションのインデックスが「有効」になっているか確認

### フロントエンド
現在デプロイされているURL: https://your-project.web.app
- ブラウザのキャッシュをクリア
- Service Workerを削除: DevTools → Application → Service Workers → Unregister

---

## トラブルシューティング

### PWAファイルエラー（Unexpected token '<'）
→ フロントエンドの再デプロイが必要（firebase.jsonの変更を反映）

### アドレス帳の+ボタンが動かない
→ フロントエンドの再デプロイが必要（バグ修正を反映）

### permission-denied エラー
→ Firestoreルールのデプロイが必要
