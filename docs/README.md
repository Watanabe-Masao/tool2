# ドキュメント

配分表テンプレート作成ツールの技術ドキュメント

## ドキュメント構造

```
docs/
├── getting-started/        # 初期セットアップ
│   ├── GOOGLE_OAUTH_SETUP.md
│   └── RESEND_SETUP.md
│
├── architecture/           # アーキテクチャ
│   ├── README.md           # 概要
│   ├── ARCHITECTURE_REVIEW.md
│   └── library-framework-analysis.md
│
├── guides/                 # 開発ガイド
│   ├── testing.md          # テスト戦略
│   ├── e2e-testing.md      # E2Eテスト
│   ├── di-pattern.md       # 依存性注入
│   └── troubleshooting-auth.md
│
├── issues/                 # 課題・技術的負債
│   ├── README.md           # 課題一覧
│   └── IMPROVEMENT_ACTION_PLAN.md
│
└── _archive/               # アーカイブ（参照用）
    ├── 2024-legacy/        # React移行前
    ├── 2025-phase-reports/ # フェーズ報告
    ├── 2025-refactoring/   # リファクタリング
    └── 2025-reviews/       # レビュー
```

## クイックリンク

### 開発を始める

1. [Google OAuth設定](getting-started/GOOGLE_OAUTH_SETUP.md) - Firebase認証の設定
2. [Resend設定](getting-started/RESEND_SETUP.md) - メール送信機能の設定

### 設計を理解する

1. [アーキテクチャ概要](architecture/README.md) - システム全体の設計
2. [フレームワーク分析](architecture/library-framework-analysis.md) - 技術選定の理由

### 開発ガイド

1. [テストガイド](guides/testing.md) - テスト戦略と実行方法
2. [DIパターン](guides/di-pattern.md) - 依存性注入の使い方
3. [認証トラブルシューティング](guides/troubleshooting-auth.md) - 認証エラーの解決

### 課題・改善

1. [技術的負債と課題](issues/README.md) - 既知の問題と改善計画

## 関連ドキュメント

| 場所 | 内容 |
|------|------|
| `/README.md` | プロジェクト概要 |
| `/CHANGELOG.md` | 変更履歴 |
| `/SECURITY.md` | セキュリティポリシー |
| `/FIREBASE_SETUP.md` | Firebase初期設定 |
| `/DEPLOYMENT_GUIDE.md` | デプロイメント手順 |
| `/frontend/README.md` | フロントエンド設定 |

## アーカイブについて

`_archive/` ディレクトリには、以下の古いドキュメントを保管しています：

- **2024-legacy**: React移行前のドキュメント
- **2025-phase-reports**: 開発フェーズの報告書
- **2025-refactoring**: リファクタリング計画・報告
- **2025-reviews**: コードレビュー関連

これらは参照用のみで、現在の実装とは異なる場合があります。
