# フロントエンド セットアップガイド

## 1. 環境変数の設定

### Firebase設定の取得

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクトを選択（または新規作成）
3. **プロジェクト設定** > **全般** タブ
4. **マイアプリ** セクションで **ウェブアプリを追加** (初回のみ)
5. **SDK の設定と構成** から **構成** を選択
6. 表示された設定値をコピー

### .envファイルの作成

```bash
# .env.exampleをコピーして.envを作成
cp .env.example .env
```

### .envファイルの編集

`.env`ファイルを開いて、Firebaseの設定値を入力してください:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 2. 依存関係のインストール

```bash
npm install
```

## 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

## 4. トラブルシューティング

### Firebase初期化エラー

**エラー**: `Firebase環境変数が設定されていません`

**解決策**:
1. `.env`ファイルが存在するか確認
2. `.env`ファイル内のすべての`VITE_FIREBASE_*`変数が設定されているか確認
3. 開発サーバーを再起動 (Ctrl+C → `npm run dev`)

### ログインできない

**確認事項**:
1. Firebase Consoleで **Authentication** > **Sign-in method** > **Google** が有効になっているか
2. **承認済みドメイン** に `localhost` が追加されているか
3. ブラウザのコンソールにエラーが表示されていないか

## 5. ビルド

```bash
npm run build
```

ビルド成果物は `dist/` ディレクトリに出力されます。

## 6. プレビュー（本番ビルドのテスト）

```bash
npm run preview
```

## 技術スタック

- **React** 19.2.0
- **TypeScript** 5.9.3
- **Vite** 7.2.2
- **MUI (Material-UI)** 6.3.0
- **Ionic React** 8.5.4
- **React Hook Form** 7.54.2
- **ag-Grid** 33.3.2
- **Firebase** 11.1.0
- **React Router** 5.3.4

## ディレクトリ構成

```
frontend/
├── src/
│   ├── pages/           # ページコンポーネント
│   ├── components/      # 再利用可能なコンポーネント
│   ├── hooks/           # カスタムフック
│   ├── services/        # API・Firebase・ストレージ
│   ├── types/           # TypeScript型定義
│   ├── utils/           # ユーティリティ関数
│   ├── context/         # Reactコンテキスト
│   ├── theme.ts         # MUIテーマ設定
│   ├── App.tsx          # ルートコンポーネント
│   └── main.tsx         # エントリーポイント
├── public/              # 静的ファイル
├── .env                 # 環境変数（Gitignore済み）
├── .env.example         # 環境変数のテンプレート
└── package.json         # 依存関係
```

## サポート

問題が発生した場合は、[Issues](https://github.com/Watanabe-Masao/tool2/issues)で報告してください。
