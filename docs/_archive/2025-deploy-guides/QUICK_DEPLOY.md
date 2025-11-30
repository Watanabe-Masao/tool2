# クイックデプロイガイド

## 最速の方法：Google Cloud Shell（5分）

1. **Google Cloud Shell を開く**: https://shell.cloud.google.com/

2. **以下のコマンドを実行**:
```bash
# リポジトリをクローン
git clone https://github.com/Watanabe-Masao/tool2.git
cd tool2

# ブランチを切り替え
git checkout claude/fix-slide-index-bug-012iMMzRj7Cz9em2QPFfJZMF

# Firebaseにログイン
firebase login --no-localhost
# ↑ URLをクリックして認証コードを入力

# すべてデプロイ
firebase deploy
```

**完了！** アプリが本番環境で動作します。

---

## 修正内容（このデプロイで反映される内容）

### 1. Firestoreセキュリティルール
- `email_addresses` コレクションのアクセス制御を追加
- ユーザーは自分のアドレス帳のみアクセス可能

### 2. PWAファイル配信の修正
- `registerSW.js` のContent-Typeを修正
- `manifest.webmanifest` のContent-Typeを修正
- Service Workerファイルのキャッシュ設定を最適化

### 3. アドレス帳UIバグ修正
- +ボタンが動作しない問題を修正
- 長押しメニューとの競合を解決

---

## デプロイ後の確認

1. **ブラウザキャッシュをクリア**
   - Ctrl+Shift+Delete (Windows/Linux)
   - Cmd+Shift+Delete (Mac)

2. **Service Worker を削除**
   - F12 → Application → Service Workers → Unregister

3. **アプリを再読み込み**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

4. **動作確認**
   - メールアドレス帳の+ボタンが動作するか
   - PWAエラーが出ないか

---

## トラブル時

詳細は `DEPLOYMENT_GUIDE.md` を参照してください。
