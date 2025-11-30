# 開発ガイド

## ガイド一覧

| ガイド | 説明 |
|-------|------|
| [テスト戦略](testing.md) | ユニット・統合・E2Eテストの実行方法 |
| [E2Eテスト](e2e-testing.md) | Playwrightによるエンドツーエンドテスト |
| [DIパターン](di-pattern.md) | 依存性注入の実装パターン |
| [認証トラブルシューティング](troubleshooting-auth.md) | Firebase認証エラーの解決 |

## 開発フロー

```
1. ブランチ作成
   └→ git checkout -b feature/xxx

2. 開発
   └→ コード実装

3. テスト
   └→ pytest (バックエンド)
   └→ npm test (フロントエンド)

4. コミット
   └→ git commit -m "feat: xxx"

5. プルリクエスト
   └→ レビュー → マージ
```

## コーディング規約

### フロントエンド (TypeScript)

- ESLint + Prettier によるフォーマット
- 関数コンポーネント + Hooks を使用
- 型定義は `types/` に配置
- バリデーションスキーマは `schemas/` に配置

### バックエンド (Python)

- PEP 8 に準拠
- Pydantic でリクエスト/レスポンスをモデル化
- ロギングは `logging` モジュールを使用

## コミットメッセージ

```
<type>: <description>

types:
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント
- refactor: リファクタリング
- test: テスト
- chore: その他
```

## 関連リソース

- [課題・技術的負債](../issues/README.md)
- [アーキテクチャ](../architecture/README.md)
