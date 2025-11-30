# Firebase 認証ドメインエラーの修正手順

## エラー内容
```
auth/unauthorized-domain
```

スマートフォンでログイン時に上記のエラーが発生し、ログインボタンが押せない現象。

## 原因
Render.comのデプロイメントドメインがFirebase Consoleの「承認済みドメイン」に登録されていないため。

## 解決手順

### 1. デプロイメントURLの確認

まず、Render.comでデプロイされているアプリのURLを確認します:

```
https://dashboard.render.com/
```

1. Render.comダッシュボードにログイン
2. `tool2` サービスを選択
3. URLをコピー（例: `https://tool2.onrender.com`）

### 2. Firebase Consoleで承認済みドメインを追加

1. **Firebase Consoleにアクセス**
   ```
   https://console.firebase.google.com/
   ```

2. **プロジェクト「haibun-distribution」を選択**

3. **Authentication → Settings に移動**
   ```
   左メニュー → Authentication → Settings タブ → Authorized domains
   ```

4. **「ドメインを追加」をクリック**

5. **以下のドメインを追加**

   必要なドメイン:
   - `localhost` (ローカル開発用 - 既に追加されているはず)
   - `tool2.onrender.com` (本番環境用 - **これを追加!**)
   - または実際のRender URLのドメイン部分

   **重要**:
   - `https://` や末尾の `/` は含めない
   - ドメイン名のみを入力 (例: `tool2.onrender.com`)

6. **「追加」ボタンをクリック**

### 3. 動作確認

1. スマートフォンでアプリにアクセス
2. ログイン画面を開く
3. Googleアカウントでログインを試す
4. エラーが出ずにログインできることを確認

## スクリーンショット付き手順

### Firebase Console - Authorized domainsの場所

```
Firebase Console
└── Authentication
    └── Settings タブ
        └── Authorized domains セクション
            └── [ドメインを追加] ボタン
```

### 追加すべきドメインの例

```
現在承認されているドメイン:
✅ haibun-distribution.firebaseapp.com
✅ localhost

追加が必要:
➕ tool2.onrender.com (または実際のRender URL)
```

## トラブルシューティング

### エラーが解消しない場合

1. **ブラウザのキャッシュをクリア**
   - スマホのブラウザ設定からキャッシュを削除
   - アプリを完全に閉じて再度開く

2. **正しいドメインが追加されているか確認**
   - Render.comダッシュボードで実際のURLを再確認
   - Firebase Consoleの承認済みドメインリストを確認

3. **数分待つ**
   - Firebase側の設定が反映されるまで最大5分程度かかる場合があります

4. **スマホの開発者ツールで確認**
   - SafariまたはChromeのリモートデバッグ機能を使用
   - コンソールログで実際のドメインを確認

### その他の確認ポイント

- **カスタムドメインを使用している場合**
  - カスタムドメインも承認済みドメインに追加する必要があります

- **サブドメインを使用している場合**
  - サブドメインも個別に追加が必要です

## 参考リンク

- [Firebase Authentication - Authorized domains](https://firebase.google.com/docs/auth/web/hosting)
- [Firebase Console](https://console.firebase.google.com/)
- [Render Dashboard](https://dashboard.render.com/)

## 完了確認

- [ ] Render.comでデプロイメントURLを確認した
- [ ] Firebase Consoleで承認済みドメインに追加した
- [ ] スマホでログインが成功することを確認した
- [ ] エラーログが出ないことを確認した

---

**作成日**: 2025-01-14
**対象プロジェクト**: haibun-distribution
**関連ファイル**: `FIREBASE_SETUP.md`
