# Resend メール送信設定ガイド

## 概要

このアプリケーションは、Gmail APIの代わりに**Resend API**を使用してメール送信機能を提供しています。ResendはモダンなメールAPIサービスで、簡単に統合でき、Googleアプリ検証プロセスが不要です。

## なぜResendを選んだのか

### Gmail APIの課題
- Googleアプリ検証が必要（2-4週間）
- 機密スコープの使用に警告画面が表示される
- OAuth認証が各ユーザーごとに必要
- プライバシーポリシー・利用規約の作成が必須

### Resendの利点
- ✅ Googleの検証プロセス不要
- ✅ 無料枠が充実（月3,000通）
- ✅ 実装が簡単（APIキーのみ）
- ✅ ファイル添付が簡単
- ✅ モダンなAPI設計
- ✅ 送信履歴・分析ダッシュボード

## セットアップ手順

### 1. Resendアカウント作成

1. [Resend](https://resend.com)にアクセス
2. 「Sign Up」をクリック
3. GitHubまたはGoogleアカウントでサインアップ
4. メールアドレスを確認

### 2. APIキー取得

1. Resendダッシュボードにログイン
2. 左メニューから「API Keys」を選択
3. 「Create API Key」をクリック
4. キー名を入力（例: `production`）
5. 「Create」をクリック
6. **表示されたAPIキーをコピー**（後で確認できないので注意！）

### 3. 環境変数設定

#### ローカル開発環境

プロジェクトルートに`.env`ファイルを作成（または追加）:

```bash
# Resend API設定
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

#### 本番環境（Render）

1. [Render Dashboard](https://dashboard.render.com)にログイン
2. 対象のWebサービスを選択
3. 「Environment」タブを開く
4. 「Add Environment Variable」をクリック
5. 以下を設定:
   - Key: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxxxxxxxxxxxxx`（ResendのAPIキー）
6. 「Save Changes」をクリック

**注意**: 環境変数を変更すると自動的にサービスが再デプロイされます。

## 使い方

### メール送信機能の使用

1. **Excelファイルを生成**
   - 配分表を作成し、「テンプレート生成」をクリック

2. **メール送信モーダルを開く**
   - 「メール送信」ボタンをクリック

3. **メール情報を入力**
   - 宛先メールアドレス
   - 件名（デフォルト: 配分表）
   - 本文

4. **送信**
   - 「送信」ボタンをクリック
   - Excelファイルが自動的に添付されます

### フロントエンドからの呼び出し

```typescript
import { sendEmail } from '@/services/gmail/gmailService';

// メール送信
await sendEmail({
  to: 'example@example.com',
  subject: '配分表',
  body: '配分表を添付いたします。',
  attachment: excelBlob,  // Blob形式のExcelファイル
  filename: '配分表.xlsx'
});
```

### バックエンドAPI

```bash
POST /api/send-email
Content-Type: application/json

{
  "to": "example@example.com",
  "subject": "配分表",
  "html": "<p>配分表を添付いたします。</p>",
  "attachment_data": "base64エンコードされたファイルデータ",
  "attachment_filename": "配分表.xlsx"
}
```

## 料金プラン

### 無料プラン
- **月3,000通**まで無料
- 送信履歴7日間保存
- APIアクセス
- 基本的なメトリクス

### Proプラン（$20/月）
- **月50,000通**
- 送信履歴無制限
- 専用IPアドレス
- 高度な分析
- 優先サポート

## 送信ドメインについて

### デフォルト設定（検証不要）

Resendのデフォルトドメインを使用する場合、設定不要ですぐに使えます:

```
From: 配本管理システム <onboarding@resend.dev>
```

**メリット:**
- 即座に使用可能
- DNS設定不要

**デメリット:**
- 送信元が`resend.dev`ドメイン
- 配信率がやや低い可能性

### 独自ドメイン設定（推奨）

独自ドメイン（例: `yourdomain.com`）を使用する場合:

#### 1. Resendでドメイン追加

1. Resendダッシュボード → 「Domains」
2. 「Add Domain」をクリック
3. ドメイン名を入力（例: `yourdomain.com`）
4. DNS設定値が表示される

#### 2. DNS設定

DNSプロバイダー（お名前.com、Cloudflareなど）で以下のレコードを追加:

| Type | Name | Value |
|------|------|-------|
| TXT | @ | `resend.com/verify/xxxxx` |
| MX | @ | `feedback-smtp.resend.com` (Priority: 10) |
| TXT | resend._domainkey | `p=MIGfMA0G...` (DKIM) |

#### 3. 検証

- Resendダッシュボードで「Verify」をクリック
- 検証に成功すると緑色のチェックマークが表示される
- 通常、5-30分で検証完了

#### 4. 送信元アドレスを変更

`config/services/email_service.py`を編集:

```python
params = {
    "from": "配本管理システム <noreply@yourdomain.com>",  # 独自ドメインに変更
    "to": [to],
    "subject": subject,
    "html": html,
}
```

## トラブルシューティング

### エラー: "Resend APIキーが設定されていません"

**原因**: `RESEND_API_KEY`環境変数が未設定

**解決方法**:
1. `.env`ファイルに`RESEND_API_KEY`を追加
2. Render環境変数を確認
3. サーバーを再起動

### エラー: "メール送信に失敗しました"

**原因**:
- 無効なAPIキー
- 月間送信制限超過
- ネットワークエラー

**解決方法**:
1. APIキーが正しいか確認
2. Resendダッシュボードで使用量を確認
3. ログを確認: `docker-compose logs -f`

### 添付ファイルが送信されない

**原因**: Base64エンコードエラー

**解決方法**:
1. ブラウザのコンソールでエラーを確認
2. ファイルサイズを確認（大きすぎる場合は分割）

## セキュリティ

### APIキーの管理

- ✅ 環境変数に保存（`.env`ファイル）
- ✅ `.gitignore`に`.env`を追加
- ❌ コード内にハードコードしない
- ❌ GitHubにコミットしない

### 送信制限

- デフォルトで月3,000通に制限
- レート制限: 1秒あたり10リクエスト
- スパム防止機能あり

## モニタリング

### Resendダッシュボード

1. [Resend Dashboard](https://resend.com/emails)にログイン
2. 「Emails」タブで送信履歴を確認
3. 配信率、開封率などを確認

### ログ確認

```bash
# バックエンドログ
docker-compose logs -f

# 特定のログをフィルタ
docker-compose logs | grep "Email"
```

## 参考リンク

- [Resend公式ドキュメント](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference/emails/send-email)
- [Resend Python SDK](https://github.com/resend/resend-python)
- [Resend料金プラン](https://resend.com/pricing)

## まとめ

Resendを使用することで、Gmail APIの複雑な検証プロセスを回避し、シンプルかつ信頼性の高いメール送信機能を実装できます。無料枠も充実しており、小規模なアプリケーションには十分です。
