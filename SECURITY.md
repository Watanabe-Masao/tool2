# セキュリティガイド

このドキュメントでは、配分表作成システムのセキュリティ設計と設定方法について説明します。

## 📋 目次

1. [Firebase API キーについて](#firebase-api-キーについて)
2. [Firestore Security Rules（必須設定）](#firestore-security-rules必須設定)
3. [環境変数の管理](#環境変数の管理)
4. [推奨セキュリティ対策](#推奨セキュリティ対策)

---

## 🔑 Firebase API キーについて

### なぜクライアント側に公開されても問題ないのか？

Firebase Web SDK の API キーは、以下の理由から公開されても問題ありません：

1. **API キーは識別子であり、秘密鍵ではない**
   - Firebase API キーはプロジェクトを識別するための公開識別子です
   - セキュリティは Firestore Security Rules で制御されます

2. **Firebase の設計思想**
   - すべての Web アプリで API キーはクライアント側のコードに含まれます
   - ブラウザの開発者ツールで簡単に確認できます

3. **本当のセキュリティ層**
   - **Firestore Security Rules** がデータアクセスを制御
   - **Firebase Authentication** がユーザー認証を管理
   - **Firebase App Check**（オプション）がボット対策

### ⚠️ 重要: 本当に保護すべきもの

保護すべきは API キーではなく、**データとビジネスロジック**です：

- ✅ Firestore Security Rules を正しく設定する
- ✅ サーバーサイドでの検証を行う
- ✅ 機密データは暗号化する
- ❌ API キーを隠すことに時間をかけない

---

## 🔒 Firestore Security Rules（必須設定）

以下の Security Rules を Firebase Console で設定してください。

### 設定手順

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト「haibun-distribution」を選択
3. 左メニューから「Firestore Database」→「ルール」タブを開く
4. 以下のルールをコピー&ペーストして「公開」をクリック

### 推奨 Security Rules

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
      // 読み取り: 本人のみ
      allow read: if isOwner(userId);
      // 作成: 認証済みで、自分のUIDのドキュメントのみ
      allow create: if isAuthenticated() && request.auth.uid == userId;
      // 更新: 本人のみ
      allow update: if isOwner(userId);
      // 削除: 禁止
      allow delete: if false;
    }

    // 帳合先マスター
    match /suppliers/{supplierId} {
      // 読み取り: 作成者のみ
      allow read: if isAuthenticated() &&
                     resource.data.createdBy == request.auth.uid;
      // 作成: 認証済みユーザーのみ
      allow create: if isAuthenticated() &&
                       request.resource.data.createdBy == request.auth.uid;
      // 更新: 作成者のみ
      allow update: if isAuthenticated() &&
                       resource.data.createdBy == request.auth.uid;
      // 削除: 作成者のみ
      allow delete: if isAuthenticated() &&
                       resource.data.createdBy == request.auth.uid;
    }

    // 商品マスター
    match /products/{productId} {
      // 読み取り: 作成者のみ
      allow read: if isAuthenticated() &&
                     resource.data.createdBy == request.auth.uid;
      // 作成: 認証済みユーザーのみ
      allow create: if isAuthenticated() &&
                       request.resource.data.createdBy == request.auth.uid;
      // 更新: 作成者のみ（使用回数の更新など）
      allow update: if isAuthenticated() &&
                       resource.data.createdBy == request.auth.uid;
      // 削除: 作成者のみ
      allow delete: if isAuthenticated() &&
                       resource.data.createdBy == request.auth.uid;
    }

    // 配分データ（注文）
    match /orders/{orderId} {
      // 読み取り: 作成者のみ
      allow read: if isAuthenticated() &&
                     resource.data.userId == request.auth.uid;
      // 作成: 認証済みユーザーのみ
      allow create: if isAuthenticated() &&
                       request.resource.data.userId == request.auth.uid;
      // 更新: 作成者のみ
      allow update: if isAuthenticated() &&
                       resource.data.userId == request.auth.uid;
      // 削除: 作成者のみ
      allow delete: if isAuthenticated() &&
                       resource.data.userId == request.auth.uid;
    }

    // 入力履歴（オートコンプリート用）
    match /history/{userId}/{type}/{itemId} {
      // 読み取り: 本人のみ
      allow read: if isOwner(userId);
      // 作成・更新: 本人のみ
      allow write: if isOwner(userId);
      // 削除: 本人のみ
      allow delete: if isOwner(userId);
    }

    // デフォルト: すべて拒否
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### ルールの説明

| コレクション | 読み取り | 作成 | 更新 | 削除 |
|------------|---------|------|------|------|
| `users` | 本人のみ | 本人のみ | 本人のみ | 不可 |
| `suppliers` | 作成者のみ | 認証済み | 作成者のみ | 作成者のみ |
| `products` | 作成者のみ | 認証済み | 作成者のみ | 作成者のみ |
| `orders` | 作成者のみ | 認証済み | 作成者のみ | 作成者のみ |
| `history` | 本人のみ | 本人のみ | 本人のみ | 本人のみ |

---

## 🔐 環境変数の管理

### 本番環境での設定（Render など）

1. **Render Dashboard で環境変数を設定**
   ```
   FIREBASE_API_KEY=AIzaSyCjuPCpB0wqHxdX4JWL6VnEj1LJWgr4cKc
   FIREBASE_AUTH_DOMAIN=haibun-distribution.firebaseapp.com
   FIREBASE_PROJECT_ID=haibun-distribution
   FIREBASE_STORAGE_BUCKET=haibun-distribution.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=742220611313
   FIREBASE_APP_ID=1:742220611313:web:bec0f006c4c648adcbb350
   ```

2. **自動デプロイ時に反映**
   - Render は環境変数を安全に管理します
   - Git リポジトリには含まれません

### ローカル開発環境での設定

1. **`.env` ファイルを作成**
   ```bash
   cp .env.example .env
   ```

2. **`.env` が `.gitignore` に含まれていることを確認**
   ```bash
   cat .gitignore | grep .env
   # 出力: .env
   ```

3. **環境変数の読み込み（必要に応じて）**
   - FastAPI は自動的に `.env` を読み込みません
   - `python-dotenv` パッケージを使用する場合:
     ```python
     from dotenv import load_dotenv
     load_dotenv()
     ```

---

## 🛡️ 推奨セキュリティ対策

### 1. Firebase Authentication の強化

**パスワードポリシー**
- 最小6文字以上（Firebase デフォルト）
- 将来的には多要素認証（MFA）の導入を検討

**Firebase Console での設定**
1. Authentication → Sign-in method
2. Email/Password を有効化
3. パスワードリセット機能を有効化

### 2. Firebase App Check の導入（推奨）

**App Check とは？**
- ボットや不正なクライアントからの攻撃を防ぐ
- reCAPTCHA Enterprise と連携

**設定方法**
1. Firebase Console → App Check
2. Web アプリを登録
3. reCAPTCHA v3 を設定
4. クライアント側コードに追加:
   ```javascript
   import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

   const appCheck = initializeAppCheck(app, {
     provider: new ReCaptchaV3Provider('reCAPTCHA-site-key'),
     isTokenAutoRefreshEnabled: true
   });
   ```

### 3. HTTPS の強制

- Render は自動的に HTTPS を有効化します
- カスタムドメインの場合も Let's Encrypt で自動証明書発行

### 4. CORS 設定（必要に応じて）

FastAPI で CORS を設定する場合:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 5. レート制限

**Firebase の自動保護**
- Firebase は自動的に異常なトラフィックを検出
- 必要に応じて追加のレート制限を実装

**FastAPI でのレート制限（オプション）**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/generate")
@limiter.limit("10/minute")
async def generate_template(request: Request, ...):
    ...
```

### 6. 監査ログ

**Firestore に操作ログを記録**
```javascript
// 例: 配分データ作成時
await setDoc(doc(db, 'audit_logs', logId), {
  userId: user.uid,
  action: 'create_order',
  orderId: orderId,
  timestamp: serverTimestamp(),
  ipAddress: request.ip  // サーバーサイドで記録
});
```

---

## 🔍 セキュリティチェックリスト

デプロイ前に以下を確認してください：

- [ ] Firestore Security Rules を設定済み
- [ ] Firebase Authentication（Email/Password）を有効化
- [ ] 環境変数を Render で設定済み
- [ ] `.env` が Git リポジトリに含まれていない
- [ ] HTTPS が有効（Render は自動）
- [ ] パスワードの最小文字数を設定（Firebase デフォルト: 6文字）
- [ ] エラーメッセージが機密情報を漏らしていない
- [ ] クライアント側で入力検証を実装
- [ ] サーバーサイドで入力検証を実装
- [ ] IndexedDB のデータは機密情報を含まない

---

## 📚 参考リンク

- [Firebase Security Rules ドキュメント](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication ドキュメント](https://firebase.google.com/docs/auth)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 🆘 問題が発生した場合

1. **Firestore アクセスエラー**
   - Security Rules が正しく設定されているか確認
   - Firebase Console → Firestore → ルールタブでテスト

2. **認証エラー**
   - Firebase Console → Authentication で Email/Password が有効か確認
   - ユーザーが正しく登録されているか確認

3. **環境変数が読み込まれない**
   - Render Dashboard で環境変数を確認
   - サービスを再デプロイ

---

**最終更新日**: 2025-01-12
**バージョン**: 2.0.1
