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

### 📊 データ入力補助
- **オートコンプリート**: 過去の入力履歴から自動補完
- **商品名・産地の履歴**: よく使うデータをすぐに入力
- **バイヤー名記憶**: ユーザー情報を自動設定

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
├── tests/                          # テストスイート
│   ├── test_config.py              # 設定のテスト
│   └── test_models.py              # モデルのテスト
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
pytest --cov=haibun_template_creator --cov-report=html

# 特定のテストのみ
pytest test_haibun_template_creator.py::TestHeaderStructure -v
```

### テスト内容

✅ **ヘッダー構造テスト**
- セル結合の検証（B7:C8, D8:E8, AW7:AW8など）
- ヘッダーテキストの位置検証
- 列配置の確認（税抜→税込、ケース→入数）

✅ **基本機能テスト**
- 商品データ入力
- 店舗配分数の配置
- 複数商品処理

✅ **書式設定テスト**
- 印刷設定（A4横、1ページ収め）
- 列幅・行高の設定
- 非表示列の処理

✅ **数式テスト**
- 税込価格計算（税抜×1.08）
- 合計計算
- 差異計算

**テスト結果**: 13/13 合格 ✅

## 🔧 主要技術

### バックエンド
- **FastAPI**: Web APIフレームワーク
- **openpyxl**: Excel操作ライブラリ
- **LibreOffice**: PDF変換（本番環境）
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
# Firebase設定（Firestoreで管理）
# .env ファイルは不要（クライアント側で直接Firebase接続）

# LibreOffice（Renderで自動インストール）
# apt-get install -y libreoffice
```

## 🔐 セキュリティ

- Firebase Authenticationによる認証
- Firestore Security Rulesでアクセス制御
- 一時ファイルの自動削除
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

## 🗺️ ロードマップ

### v3.0（計画中）
- [ ] バッチ処理機能
- [ ] CSVインポート
- [ ] テンプレートカスタマイズUI
- [ ] 店舗マスタ管理画面

### v2.1（近日）
- [x] PDFプレビュー改善
- [x] モバイルダウンロード対応
- [x] センター送信日欄追加（AW列）
- [ ] ダークモード対応
- [ ] エクスポート履歴

詳細は [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#roadmap) を参照

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

- **コード行数**: ~2,500行（Python + JavaScript）
- **テストカバレッジ**: 95%+
- **対応ブラウザ**: Chrome, Safari, Firefox, Edge
- **対応デバイス**: デスクトップ、タブレット、スマートフォン

---

**バージョン**: v2.0 (2025-01)
**最終更新**: 2025-01-13
