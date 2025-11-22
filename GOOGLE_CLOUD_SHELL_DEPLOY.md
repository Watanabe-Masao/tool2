# Google Cloud Shell でのデプロイ手順（完全版）

## ステップ1: Google Cloud Shell を開く

1. https://shell.cloud.google.com/ にアクセス
2. Firebaseプロジェクトと同じGoogleアカウントでログイン
3. 新しいターミナルが開きます

## ステップ2: リポジトリをクローン

```bash
git clone https://github.com/Watanabe-Masao/tool2.git
cd tool2
```

## ステップ3: ブランチを切り替え

```bash
git checkout claude/fix-slide-index-bug-012iMMzRj7Cz9em2QPFfJZMF
```

## ステップ4: Firebaseにログイン

```bash
firebase login --no-localhost
```

**重要**:
- URLが表示されるので、それをクリック
- Googleアカウントで認証
- **認証コード（長い文字列）をコピー**
- ターミナルに戻ってペースト

## ステップ5: Firestoreルールをデプロイ

```bash
firebase deploy --only firestore:rules
```

出力例：
```
✔  Deploy complete!
```

## ステップ6: フロントエンドをデプロイ

```bash
firebase deploy --only hosting
```

出力例：
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/haibun-distribution/overview
Hosting URL: https://haibun-distribution.web.app
```

## 完了！

アプリが本番環境で動作します。
ブラウザでホスティングURLにアクセスして確認してください。

---

## トラブルシューティング

### Q: "firebase: command not found" エラーが出る

**A**: Firebase CLIをインストール
```bash
npm install -g firebase-tools
```

### Q: プロジェクトが見つからない

**A**: プロジェクトを明示的に指定
```bash
firebase use haibun-distribution
```

### Q: ビルドエラーが出る

**A**: Node.jsバージョンを確認
```bash
node -v  # v18以上が必要
```

古い場合は更新:
```bash
nvm install 20
nvm use 20
```

---

## デプロイ後の確認

1. **ブラウザキャッシュをクリア**: Ctrl+Shift+Delete
2. **Service Workerを削除**: F12 → Application → Service Workers → Unregister
3. **アプリを再読み込み**: Ctrl+Shift+R
4. **動作確認**:
   - メールアドレス帳の+ボタンが動作するか
   - PWAエラーが出ないか
   - Firestoreへの書き込みができるか

---

## 参考: CI Token取得（GitHub Actions用）

将来的に自動デプロイを設定する場合:

```bash
firebase login:ci
```

このコマンドで出力されるトークン（`1//...` で始まる長い文字列）を:
- GitHubリポジトリ Settings → Secrets and variables → Actions
- New repository secret: `FIREBASE_TOKEN`

として保存すると、GitHub Actionsで自動デプロイ可能になります。
