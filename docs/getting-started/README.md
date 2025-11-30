# セットアップガイド

## 開発環境構築

### 必要要件

- Node.js 18+
- Python 3.11+
- Firebase プロジェクト
- Git

### 1. リポジトリのクローン

```bash
git clone https://github.com/Watanabe-Masao/tool2.git
cd tool2
```

### 2. バックエンドセットアップ

```bash
# 仮想環境の作成（推奨）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存パッケージのインストール
pip install -r requirements.txt

# 開発用パッケージのインストール
pip install -r requirements-dev.txt

# 環境変数の設定
cp .env.example .env
# .envを編集して必要な値を設定
```

### 3. フロントエンドセットアップ

```bash
cd frontend

# 依存パッケージのインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集
```

### 4. 起動

**バックエンド:**
```bash
# プロジェクトルートで
python app.py
# → http://localhost:8000
```

**フロントエンド:**
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

## Firebase 設定

Firebase プロジェクトの設定については、以下のドキュメントを参照：

- [/FIREBASE_SETUP.md](/FIREBASE_SETUP.md) - Firebase初期設定
- [Google OAuth設定](GOOGLE_OAUTH_SETUP.md) - 認証設定
- [/FIRESTORE_RULES_DEPLOYMENT.md](/FIRESTORE_RULES_DEPLOYMENT.md) - セキュリティルール

### 環境変数

**フロントエンド (.env.local):**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

**バックエンド (.env):**
```env
DEBUG=true
RESEND_API_KEY=re_xxx  # メール送信用（オプション）
```

## メール送信設定

メール送信機能を使用する場合は、Resend API の設定が必要です。

詳細: [Resend設定](RESEND_SETUP.md)

## 次のステップ

- [アーキテクチャ概要](../architecture/README.md) - システム設計の理解
- [テストガイド](../guides/testing.md) - テストの実行方法
- [開発ガイド](../guides/) - 開発のベストプラクティス
