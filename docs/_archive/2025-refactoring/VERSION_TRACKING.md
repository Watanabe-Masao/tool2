# バージョン追跡ガイド

デプロイされたアプリケーションのバージョン（どのGitコミットがデプロイされているか）を確認する方法を説明します。

---

## 🔍 バージョン確認方法

### 方法1: ブラウザコンソールで確認（最速）

1. **アプリにアクセス**: https://haibun-distribution.web.app
2. **DevToolsを開く**: F12 キー（またはCmd+Option+I）
3. **Console タブ**を開く

以下の情報が自動的に表示されます：

```
🚀 配分表作成ツール
ビルド情報:
┌─────────────────────┬────────────────────────────────┐
│ ビルド時刻          │ 2025-11-22T12:34:56.789Z       │
│ Gitブランチ         │ claude/fix-slide-index-bug... │
│ コミットハッシュ    │ 2b075b9                        │
│ コミット日時        │ 2025-11-22 21:30:45 +0900     │
│ コミットメッセージ  │ feat: ビルド情報と...         │
└─────────────────────┴────────────────────────────────┘
完全なコミットハッシュ: 2b075b9a1b2c3d4e5f6g7h8i9j0k...
GitHub: https://github.com/Watanabe-Masao/tool2/commit/2b075b9a1b2c3d4e5f6g7h8i9j0k...
```

### 方法2: コンソールから直接取得

DevToolsのConsoleで以下を実行：

```javascript
__BUILD_INFO__
```

以下のようなオブジェクトが返されます：

```javascript
{
  buildTime: "2025-11-22T12:34:56.789Z",
  gitBranch: "claude/fix-slide-index-bug-012iMMzRj7Cz9em2QPFfJZMF",
  gitCommit: "2b075b9a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q",
  gitCommitShort: "2b075b9",
  gitCommitDate: "2025-11-22 21:30:45 +0900",
  gitCommitMessage: "feat: ビルド情報とGitコミット情報を埋め込み"
}
```

### 方法3: UIから確認

1. **アプリにアクセス**: https://haibun-distribution.web.app
2. **ヘッダーの Info アイコン (ℹ️)** をクリック
3. ビルド情報ダイアログが表示されます

表示される情報：
- ビルド時刻
- Gitブランチ
- コミットハッシュ（GitHubリンク付き）
- コミット日時
- コミットメッセージ

### 方法4: Firebase Console で確認

1. **Firebase Console にアクセス**:
   https://console.firebase.google.com/project/haibun-distribution/hosting

2. **Hosting → リリース履歴** を確認

表示される情報：
- デプロイ日時
- デプロイしたユーザー
- ファイル数

---

## 📊 ビルド情報の内容

### buildTime（ビルド時刻）
- アプリケーションがビルドされた日時（UTC）
- GitHub Actionsの場合、ワークフロー実行時刻

### gitBranch（Gitブランチ）
- ビルド時のブランチ名
- 例: `main`, `claude/fix-slide-index-bug-012iMMzRj7Cz9em2QPFfJZMF`

### gitCommit（コミットハッシュ）
- 完全なGitコミットハッシュ（40文字）
- GitHubコミットページへの直接リンクとして使用可能

### gitCommitShort（短縮コミットハッシュ）
- コミットハッシュの短縮版（7文字）
- 人間が読みやすい形式

### gitCommitDate（コミット日時）
- コミットが作成された日時
- フォーマット: `YYYY-MM-DD HH:MM:SS ±ZZZZ`

### gitCommitMessage（コミットメッセージ）
- コミットの説明（1行目のみ）
- 何が変更されたかを確認できる

---

## 🎯 使用例

### デプロイ確認

新しいバージョンをデプロイした後：

```bash
# GitHub Actionsでデプロイ
git push origin main

# デプロイ完了後、ブラウザで確認
# F12 → Console → ビルド時刻とコミットハッシュを確認
```

### バグ報告

ユーザーから問題報告を受けた場合：

1. ユーザーに「F12キーを押して、Consoleに表示されるビルド情報を共有してください」と依頼
2. コミットハッシュを確認して、問題が発生したバージョンを特定
3. GitHubでそのコミットを確認

### バージョン比較

本番環境と開発環境のバージョンが一致しているか確認：

```javascript
// 本番環境
__BUILD_INFO__.gitCommitShort  // "2b075b9"

// 開発環境
// 同じコマンドを実行して比較
```

---

## 🔗 GitHubコミットの確認

コミットハッシュがわかれば、GitHubで詳細を確認できます：

```
https://github.com/Watanabe-Masao/tool2/commit/<COMMIT_HASH>
```

例：
```
https://github.com/Watanabe-Masao/tool2/commit/2b075b9a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q
```

これにより、以下を確認できます：
- コミットの詳細な説明
- 変更されたファイル
- コードの差分
- コミット作成者
- 関連するプルリクエスト

---

## 🛠️ トラブルシューティング

### ビルド情報が表示されない

**原因**: 古いキャッシュが残っている

**解決策**:
1. ハードリフレッシュ: Ctrl+Shift+R（Windows/Linux）、Cmd+Shift+R（Mac）
2. キャッシュをクリア: DevTools → Application → Clear storage
3. Service Workerを削除: DevTools → Application → Service Workers → Unregister

### `__BUILD_INFO__ is not defined`

**原因**: ビルドプロセスでGit情報が取得できなかった

**解決策**:
- Gitリポジトリ内でビルドされているか確認
- `.git` ディレクトリが存在するか確認
- ビルドログでエラーを確認

### ブランチ名が "unknown"

**原因**: Gitコマンドが実行できない環境（CI/CDの一部）

**解決策**:
- GitHub Actionsの場合、環境変数から取得するように修正
- または、デプロイ時に環境変数として渡す

---

## 📝 開発者向け

### ビルド情報の実装

ビルド情報は `frontend/vite.config.ts` で定義されています：

```typescript
const getGitInfo = () => {
  try {
    return {
      commit: execSync('git rev-parse HEAD').toString().trim(),
      branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
      commitShort: execSync('git rev-parse --short HEAD').toString().trim(),
      commitDate: execSync('git log -1 --format=%cd --date=iso').toString().trim(),
      commitMessage: execSync('git log -1 --format=%s').toString().trim(),
    }
  } catch {
    return { /* defaults */ }
  }
}
```

### カスタマイズ

追加情報を埋め込みたい場合：

```typescript
// vite.config.ts
define: {
  '__BUILD_INFO__': JSON.stringify({
    ...gitInfo,
    buildNumber: process.env.BUILD_NUMBER,  // CI/CDから
    deployEnv: process.env.DEPLOY_ENV,      // production/staging
  }),
}
```

---

## 🎓 関連ドキュメント

- [自動デプロイ設定](AUTO_DEPLOY_SETUP.md)
- [デプロイメントガイド](DEPLOYMENT_GUIDE.md)
- [Google Cloud Shell デプロイ](GOOGLE_CLOUD_SHELL_DEPLOY.md)
