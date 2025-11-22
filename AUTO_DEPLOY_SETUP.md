# 自動デプロイ設定ガイド

このガイドに従って設定すると、**mainブランチにプッシュするだけで自動的にFirebaseにデプロイ**されます。

---

## セットアップ手順（5分）

### ステップ1: Firebase CI Token を取得

Google Cloud Shellで以下を実行：

```bash
firebase login:ci
```

**出力例：**
```
✔  Success! Use this token to login on a CI server:

1//0gHU9x7xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Example: firebase deploy --token "$FIREBASE_TOKEN"
```

この `1//0g...` で始まる**長いトークンをコピー**してください。

---

### ステップ2: GitHub Secrets に保存

#### 2-1. GitHub リポジトリの設定ページにアクセス

https://github.com/Watanabe-Masao/tool2/settings/secrets/actions

#### 2-2. "New repository secret" をクリック

#### 2-3. Firebase Token を追加

- **Name**: `FIREBASE_TOKEN`
- **Secret**: コピーしたトークン（`1//0g...` で始まる文字列）を貼り付け
- **Add secret** をクリック

---

## 完了！🎉

これだけで自動デプロイが有効になります。

---

## 使い方

### 自動デプロイ（main/masterブランチにプッシュ時）

```bash
git checkout main
git merge your-feature-branch
git push origin main
```

→ **自動的にデプロイが開始されます**

### 手動デプロイ（任意のタイミング）

GitHubリポジトリの **Actions** タブ → **Deploy to Firebase** → **Run workflow**

---

## デプロイ内容

GitHub Actionsが自動的に以下を実行：

1. ✅ フロントエンドの依存関係をインストール
2. ✅ フロントエンドをビルド（`npm run build`）
3. ✅ Firestoreルールをデプロイ
4. ✅ Firebase Hostingにデプロイ
5. ✅ Firestoreインデックスを更新

---

## デプロイ状況の確認

### GitHub Actions の確認

https://github.com/Watanabe-Masao/tool2/actions

- ✅ 緑のチェックマーク：デプロイ成功
- ❌ 赤いバツマーク：デプロイ失敗（ログを確認）

### 本番環境の確認

デプロイ後、以下のURLで確認：
https://haibun-distribution.web.app

---

## トラブルシューティング

### Q: デプロイが失敗する

**A**: GitHub Actions のログを確認
1. https://github.com/Watanabe-Masao/tool2/actions
2. 失敗したワークフローをクリック
3. エラーメッセージを確認

### Q: FIREBASE_TOKEN が無効

**A**: トークンを再取得
```bash
firebase login:ci
```
新しいトークンでGitHub Secretsを更新

### Q: ビルドエラーが出る

**A**: ローカルでビルドを確認
```bash
cd frontend
npm install
npm run build
```

エラーを修正してからプッシュ

---

## 従来の手動デプロイとの比較

### 🔴 従来（手動）

1. Google Cloud Shellにアクセス
2. `git clone` & `git checkout`
3. `firebase login --no-localhost`
4. `cd frontend && npm install && npm run build`
5. `cd .. && firebase deploy`

**所要時間：約10分**

### 🟢 自動化後

1. `git push origin main`

**所要時間：約10秒（あとは自動）**

---

## セキュリティ

- ✅ Firebase CI tokenはGitHub Secretsで暗号化保存
- ✅ トークンはコードに含まれない
- ✅ トークンはログに表示されない
- ✅ トークンは管理者のみアクセス可能

---

## 次のステップ

### ブランチ保護ルールの設定（推奨）

mainブランチへの直接プッシュを禁止し、プルリクエスト経由のみを許可：

1. GitHub → Settings → Branches → Add rule
2. Branch name pattern: `main`
3. ✅ Require pull request reviews before merging
4. ✅ Require status checks to pass before merging
5. Save changes

これにより、mainへのマージ前にレビューが必須になります。

### プレビューデプロイの設定（上級）

プルリクエストごとに一時的なプレビューURLを自動生成：

```yaml
# .github/workflows/firebase-preview.yml
on: pull_request

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      # ... ビルドステップ
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: haibun-distribution
```

これにより、PRごとに `https://haibun-distribution--pr123-xxx.web.app` のようなURLが生成されます。
