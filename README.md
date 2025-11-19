# 配分表テンプレート作成ツール

店舗への商品配分を管理するExcelテンプレートを生成するWebアプリケーションです。

## 🌟 主な機能

### ✨ 基本機能
- **Excelテンプレート自動生成**: 36店舗への商品配分表を自動作成
- **5ステップワークフロー**: 店着日 → 帳合先 → 商品情報入力の直感的なUI
- **複数商品対応**: 1つのファイルに複数商品を追加可能
- **自動計算機能**: 合計、差異、税込価格を自動計算

### 📱 モバイル対応
- **レスポンシブUI**: スマートフォン・タブレットで快適に操作
- **iPhoneダウンロード対応**: Safari専用モーダルでダウンロード
- **タッチ最適化**: モバイルでの入力を考慮したUI設計

### 🔐 認証・データ管理
- **Firebaseログイン**: Google認証による安全なアクセス管理
- **オフライン対応**: IndexedDBでローカルデータ保存
- **データ同期**: Firestoreとの自動同期機能
- **カレンダー表示**: 過去の配分データを日付で閲覧・管理

### 📄 プレビュー機能
- **PDFプレビュー**: ブラウザで配分表をプレビュー
- **Safari日付対応**: 日本語曜日付き日付表示
- **モバイルフォールバック**: PDFが表示できない場合のダウンロード対応

### 📧 メール送信機能 (v2.4.0)
- **Resend API統合**: Googleアプリ検証不要の簡単メール送信
- **Excel添付**: 生成した配分表を自動添付
- **カスタマイズ可能**: 宛先、件名、本文を自由に編集
- **無料枠充実**: 月3,000通まで無料

### 📊 データ入力補助
- **オートコンプリート**: 過去の入力履歴から自動補完
- **商品名・産地の履歴**: よく使うデータをすぐに入力
- **バイヤー名記憶**: ユーザー情報を自動設定

### 🔒 セキュリティ・運用 (v2.3.0)
- **Firebase設定の強化**: 環境変数の厳密な検証、ハードコード削除
- **統一ログシステム**: 構造化ログによる監視・デバッグの容易性向上
- **定期的なファイルクリーンアップ**: 24時間以上古い一時ファイルを自動削除
- **統一例外ハンドリング**: カスタム例外による一貫したエラーレスポンス

### ✅ コード品質 (v2.3.0)
- **包括的なテスト**: サービス層、API層のユニット・統合テスト
- **ロギングの統一**: print()からloggingモジュールへの完全移行
- **例外の統一**: HTTPExceptionからカスタム例外への統一

## 🚀 クイックスタート

### 必要要件
- Python 3.11以上
- LibreOffice（PDF変換用、本番環境のみ）
- Firebase プロジェクト（認証・データベース用）

### ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/Watanabe-Masao/tool2.git
cd tool2

# 依存パッケージをインストール
pip install -r requirements.txt

# 開発用パッケージもインストール（テスト実行時）
pip install -r requirements-dev.txt

# Firebase設定
# .env.example を .env にコピーして設定
cp .env.example .env

# サーバー起動
python app.py
```

ブラウザで `http://localhost:8000` にアクセス

### Docker起動

```bash
# Docker Composeで起動
docker-compose up -d

# ログ確認
docker-compose logs -f
```

アクセス: `http://localhost:8000`

## 📖 使い方

### 1. ログイン
- Googleアカウントでログイン
- ログイン後、担当バイヤー名が自動設定

### 2. 新規作成
**ステップ1: 店着日**
- 商品が店舗に届く日付を選択

**ステップ2: 帳合先**
- 帳合先（仕入先）を入力
- オートコンプリートで過去の履歴から選択可能

**ステップ3-5: 商品情報**
- 品名、産地、規格、価格など入力
- 「商品を追加」で複数商品に対応
- 36店舗への配分数を入力

**テンプレート生成**
- 「テンプレート生成」ボタンをクリック
- ダウンロードまたはプレビュー

### 3. カレンダー表示
- 過去の配分データを日付で閲覧
- 既存ファイルに商品を追加可能

## 🏗️ プロジェクト構造

**モジュラーアーキテクチャ** を採用し、保守性と拡張性を重視した設計になっています。

```
tool2/
├── app.py (132行)                  # FastAPI アプリケーション (-79%削減)
├── haibun_template_creator.py      # Excelテンプレート生成エンジン
├── requirements.txt                # Python依存パッケージ
├── requirements-dev.txt            # 開発用パッケージ
│
├── config/                         # 設定とコアモジュール
│   ├── config.py                   # アプリケーション設定（Pydantic Settings）
│   ├── exceptions.py               # カスタム例外クラス
│   ├── handlers.py                 # 例外ハンドラー
│   ├── models/                     # データモデル（Pydantic）
│   │   ├── requests.py             # リクエストモデル
│   │   └── responses.py            # レスポンスモデル
│   ├── services/                   # ビジネスロジック層
│   │   ├── excel_service.py        # Excel生成サービス
│   │   └── pdf_service.py          # PDF変換サービス
│   └── api/                        # APIルーター層
│       └── routes.py               # エンドポイント定義
│
├── docs/                           # ドキュメント
│   ├── ARCHITECTURE.md             # システムアーキテクチャ
│   ├── MODULE_STRUCTURE.md         # モジュール構造詳細（NEW!）
│   ├── TECHNICAL_DETAILS.md        # 技術詳細（PDF問題等）
│   ├── DEVELOPMENT.md              # 開発ガイド
│   └── REFACTORING_PLAN.md         # リファクタリング計画
│
├── templates/                      # HTMLテンプレート
│   ├── index.html                  # メインUI
│   └── login.html                  # ログインページ
│
├── static/                         # 静的ファイル
│   ├── style.css                   # CSS
│   ├── script.js (234行)           # メインJS (-52%削減)
│   └── js/                         # JavaScriptモジュール（ES6）
│       ├── api/                    # API通信層
│       │   ├── client.js           # APIクライアント
│       │   └── endpoints.js        # エンドポイント定義
│       ├── services/               # サービス層
│       │   ├── form-service.js     # フォーム処理
│       │   ├── download-service.js # ダウンロード処理
│       │   └── validation-service.js # バリデーション
│       ├── ui/                     # UI層
│       │   ├── loading.js          # ローディング表示
│       │   └── notification.js     # 通知表示
│       ├── utils/                  # ユーティリティ層
│       │   ├── device-detector.js  # デバイス判定
│       │   ├── error-handler.js    # エラーハンドリング
│       │   └── form-utils.js       # フォームヘルパー
│       ├── firebase-config.js      # Firebase設定
│       ├── auth-service.js         # 認証サービス
│       ├── firestore-service.js    # Firestore操作
│       ├── indexeddb-service.js    # IndexedDB操作
│       ├── data-sync-service.js    # データ同期
│       ├── app-workflow.js         # ワークフロー管理
│       └── calendar-view.js        # カレンダー表示
│
├── tests/                          # テストスイート (v2.3.0 拡充)
│   ├── test_config.py              # 設定のテスト
│   ├── test_models.py              # モデルのテスト
│   ├── test_excel_service.py       # ExcelServiceのテスト (NEW!)
│   ├── test_pdf_service.py         # PDFServiceのテスト (NEW!)
│   └── test_api_routes.py          # APIエンドポイントの統合テスト (NEW!)
├── test_haibun_template_creator.py # テンプレート生成テスト
├── test_api_integration.py         # API統合テスト
│
├── Dockerfile                      # Docker設定
├── docker-compose.yml              # Docker Compose設定
├── render.yaml                     # Render デプロイ設定
└── temp_files/                     # 一時ファイル（自動生成）
```

### アーキテクチャの特徴

✅ **関心の分離**: API、サービス、UI、ユーティリティを明確に分離
✅ **SSOT**: 設定やエンドポイントを一箇所で管理
✅ **テスト容易性**: 各モジュールを独立してテスト可能
✅ **コード削減**: 合計-737行（-60%）のリファクタリング達成
✅ **統一エラーハンドリング**: バックエンドとフロントエンドで一貫したエラー処理

詳細は [docs/MODULE_STRUCTURE.md](docs/MODULE_STRUCTURE.md) を参照

## 🧪 テスト

### テストの実行

```bash
# すべてのテストを実行
pytest -v

# カバレッジレポート付き
pytest --cov=config --cov=haibun_template_creator --cov-report=html

# 特定のテストのみ
pytest tests/test_excel_service.py -v
pytest tests/test_api_routes.py::TestHealthAndVersion -v
```

### テスト構成 (v2.3.0 拡充)

#### ✅ **サービス層テスト** (NEW!)
**tests/test_excel_service.py** - ExcelServiceのテスト
- ファイル名生成ロジック
- 商品データ変換（単一・複数商品、共通フィールド）
- テンプレート生成（基本・複数商品・自動num_blocks）
- 後方互換性（nameとproduct_nameの優先順位）

**tests/test_pdf_service.py** - PDFServiceのテスト
- 非表示列のクリア処理
- 日付の文字列変換（日本語曜日付き）
- 結合セルのスキップ処理
- エラーハンドリング（グレースフルデグレデーション）

#### ✅ **API層テスト** (NEW!)
**tests/test_api_routes.py** - APIエンドポイントの統合テスト
- ヘルスチェック（GET/HEAD）
- バージョン情報取得
- Firebase設定取得（環境変数検証）
- テンプレート生成（単一・複数商品、カスタムファイル名）
- ファイルダウンロード
- ルートエンドポイント

#### ✅ **モデル層テスト**
**tests/test_models.py** - Pydanticモデルのテスト
- ProductDataRequest: バリデーション、最大長制限
- TemplateRequest: 必須フィールド、デフォルト値
- TemplateResponse/ErrorResponse: レスポンス構造

**tests/test_config.py** - 設定管理のテスト
- デフォルト値の検証
- 一時ディレクトリの自動作成
- キャッシュ設定

#### ✅ **コア機能テスト**
**test_haibun_template_creator.py** - テンプレート生成エンジンのテスト
- ヘッダー構造（セル結合、テキスト位置）
- 商品データ入力・店舗配分
- 書式設定（印刷設定、列幅・行高）
- 数式（税込価格、合計、差異計算）

**テスト結果**:
- **コア機能**: 13/13 合格 ✅
- **サービス層**: 18/18 合格 ✅ (NEW!)
- **API層**: 15/15 合格 ✅ (NEW!)
- **モデル層**: 12/12 合格 ✅
- **合計**: 58/58 合格 ✅

**テストカバレッジ**: 95%+ (v2.3.0)

## 🔧 主要技術

### バックエンド
- **FastAPI**: Web APIフレームワーク
- **openpyxl**: Excel操作ライブラリ
- **LibreOffice**: PDF変換（本番環境）
- **Pydantic Settings**: 設定管理（v2.3.0）
- **APScheduler**: 定期タスク実行（v2.3.0）
- **Python 3.11+**: メイン言語

### フロントエンド
- **Vanilla JavaScript**: ES6モジュール
- **Firebase Authentication**: Google認証
- **Firestore**: クラウドデータベース
- **IndexedDB**: ローカルストレージ

### インフラ
- **Render**: 本番環境ホスティング
- **Docker**: コンテナ化
- **GitHub Actions**: CI/CD（予定）

## 📚 詳細ドキュメント

- [システムアーキテクチャ](docs/ARCHITECTURE.md) - システム構造と設計思想
- [技術詳細](docs/TECHNICAL_DETAILS.md) - PDFプレビュー問題と解決策
- [開発ガイド](docs/DEVELOPMENT.md) - 開発手順と今後の計画
- [Firebase セットアップ](FIREBASE_SETUP.md) - Firebase プロジェクト設定
- [Resend メール設定](docs/RESEND_SETUP.md) - メール送信機能の設定（推奨）
- [セキュリティポリシー](SECURITY.md) - セキュリティ対策

## 🚢 デプロイ

### Renderデプロイ（推奨）

1. [Render](https://render.com) でアカウント作成
2. GitHubリポジトリを接続
3. 環境変数を設定（Firebase設定など）
4. 自動デプロイ開始

詳細は `render.yaml` を参照

### 環境変数

本番環境では以下の環境変数が必要：

```bash
# Resend API設定（メール送信用）
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# Firebase設定（Firestoreで管理）
# .env ファイルは不要（クライアント側で直接Firebase接続）

# LibreOffice（Renderで自動インストール）
# apt-get install -y libreoffice
```

詳細は [docs/RESEND_SETUP.md](docs/RESEND_SETUP.md) を参照

## 🔐 セキュリティ

### v2.3.0 セキュリティ強化
- **環境変数の厳密な検証**: Firebase設定のハードコード削除、明示的なバリデーション
- **統一例外ハンドリング**: カスタム例外による一貫したエラーレスポンス
- **構造化ログ**: セキュリティイベントの追跡可能性向上

### 基本セキュリティ
- Firebase Authenticationによる認証
- Firestore Security Rulesでアクセス制御
- 定期的なファイルクリーンアップ（24時間ごと）
- HTTPS通信（本番環境）

詳細は [SECURITY.md](SECURITY.md) を参照

## 🐛 既知の問題と対応

### PDFプレビューの列ずれ問題 ✅ 解決済み
- **問題**: LibreOfficeのPDF変換で列がずれる
- **原因**: 非表示列（A, F）の扱い
- **解決**: PDF変換前に非表示列の内容をクリア

詳細は [docs/TECHNICAL_DETAILS.md](docs/TECHNICAL_DETAILS.md#pdf-preview-column-alignment) を参照

### iPhoneダウンロード問題 ✅ 解決済み
- **問題**: iPhone Safariで自動ダウンロードが動作しない
- **原因**: プログラマティックダウンロードの制限
- **解決**: モーダルでダウンロードリンクを表示

詳細は [docs/TECHNICAL_DETAILS.md](docs/TECHNICAL_DETAILS.md#iphone-safari-download) を参照

### スマホログイン時の認証エラー (auth/unauthorized-domain)
- **問題**: スマートフォンでログイン時にエラーが発生し、ログインボタンが押せない
- **原因**: デプロイメントドメインがFirebaseの承認済みドメインに未登録
- **解決**: Firebase ConsoleでRender.comのドメインを承認済みドメインに追加

詳細な手順は [docs/FIX_AUTH_DOMAIN_ERROR.md](docs/FIX_AUTH_DOMAIN_ERROR.md) を参照

### Gmail API依存の削除 ✅ 解決済み（v2.4.0）
- **問題**: Gmail API使用時にGoogle OAuth同意画面で警告が表示される
- **原因**: Gmail APIの機密スコープ（gmail.send, gmail.compose）が未検証
- **解決**: Resend APIに移行し、Google OAuth検証プロセスが不要に

詳細な手順は [docs/RESEND_SETUP.md](docs/RESEND_SETUP.md) を参照

## 🗺️ ロードマップ

### v3.0（計画中）
- [ ] バッチ処理機能
- [ ] CSVインポート
- [ ] テンプレートカスタマイズUI
- [ ] 店舗マスタ管理画面

### v2.3（完了） ✅
- [x] Firebase設定のセキュリティ強化
- [x] ロギングの統一（print→logging）
- [x] 例外ハンドリングの統一
- [x] 包括的なテスト追加（サービス層・API層）
- [x] 定期的なファイルクリーンアップ
- [x] コード品質向上（レビュー対応）

### v2.2（完了）
- [x] PDFプレビュー改善
- [x] モバイルダウンロード対応
- [x] センター送信日欄追加（AW列）

### v2.4（近日）
- [ ] ダークモード対応
- [ ] エクスポート履歴
- [ ] CI/CD パイプライン

詳細は [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#roadmap) と [CHANGELOG.md](CHANGELOG.md) を参照

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 👤 作成者

**Watanabe Masao**

## 📞 サポート

問題や質問がある場合:
1. [Issue](https://github.com/Watanabe-Masao/tool2/issues) を作成
2. [ドキュメント](docs/) を確認
3. コードレビュー依頼

## 🙏 貢献

プルリクエストを歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📊 プロジェクト統計

- **コード行数**: ~3,500行（Python + JavaScript）
- **テスト数**: 58テスト（v2.3.0で+45テスト追加）
- **テストカバレッジ**: 95%+
- **対応ブラウザ**: Chrome, Safari, Firefox, Edge
- **対応デバイス**: デスクトップ、タブレット、スマートフォン

---

**バージョン**: v2.3.0 (2025-01)
**最終更新**: 2025-01-13

### v2.3.0の主な変更点
- ✅ セキュリティ強化（Firebase設定の検証）
- ✅ ロギング統一（構造化ログ）
- ✅ 例外ハンドリング統一
- ✅ テストカバレッジ拡充（+728行のテストコード）
- ✅ 定期的なファイルクリーンアップ
- ✅ コード品質向上

詳細は [CHANGELOG.md](CHANGELOG.md) を参照
