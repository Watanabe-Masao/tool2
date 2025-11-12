# 配分表テンプレート作成ツール

Excelの配分表テンプレートを自動生成するWebアプリケーション / Pythonスクリプトです。

## 概要

このツールは、店舗への商品配分を管理するためのExcelテンプレートを生成します。生成されるテンプレートには以下の機能が含まれます：

- 商品情報の入力欄（納品日、産地、規格、品名、価格など）
- 36店舗への配分数入力欄
- 自動計算機能（合計、差異、税込価格）
- 名前付き範囲の定義

## 特徴

✨ **Webアプリケーション対応**: ブラウザから簡単にテンプレート生成
🚀 **FastAPI**: 高速・モダンなWeb APIフレームワーク
🎨 **レスポンシブUI**: スマートフォンでも使いやすいデザイン
📦 **自動ダウンロード**: 生成されたExcelファイルをワンクリックでダウンロード
⚙️ **カスタマイズ可能**: 商品ブロック数や列幅を自由に設定

## 必要要件

- Python 3.7以上
- 必要なライブラリ（requirements.txtに記載）

## テスト

このプロジェクトには、ヘッダー構造やデータ配置が正しいことを検証する自動テストが含まれています。

### テストの実行

```bash
# 開発用パッケージのインストール
pip install -r requirements-dev.txt

# すべてのテストを実行
pytest test_haibun_template_creator.py -v

# カバレッジレポート付きで実行
pytest test_haibun_template_creator.py --cov=haibun_template_creator --cov-report=term-missing

# ヘッダー構造のテストのみ実行
pytest test_haibun_template_creator.py::TestHeaderStructure -v
```

### テスト内容

✅ **ヘッダー構造テスト**
- セル結合が正しいか（A7:A8, B7:C8, D8:E8など）
- ヘッダーテキストが正しい位置にあるか
- H8（税込）がH7（税抜）の下、I8（入数）がI7（ケース）の下にあるか

✅ **基本機能テスト**
- 担当バイヤー名の入力
- 期間の入力
- 商品データの配置
- 店舗配分数の配置
- 複数商品の処理

✅ **書式設定テスト**
- 印刷設定（A4横、全列を1ページに収める）
- 列幅の設定
- 行高の設定

✅ **数式テスト**
- 税込価格の計算式
- 合計の計算式
- 差異の計算式

### CI/CD

GitHub Actionsによる自動テストが設定されています：

- **プッシュ時**: すべてのテストを自動実行
- **プルリクエスト時**: テスト結果をPRにコメント
- **ヘッダー構造チェック**: ヘッダーが崩れていないか重点的にチェック

テストが失敗した場合、PRにコメントが自動的に追加されます。

## インストール

### 1. リポジトリのクローン

```bash
git clone https://github.com/Watanabe-Masao/tool2.git
cd tool2
```

### 2. 依存パッケージのインストール

```bash
pip install -r requirements.txt
```

または、個別にインストール：

```bash
pip install openpyxl fastapi uvicorn jinja2 python-multipart
```

## 使用方法

### 方法1: Webアプリケーション（推奨）

#### サーバーの起動

```bash
python app.py
```

または

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

#### ブラウザでアクセス

サーバーが起動したら、ブラウザで以下のURLにアクセスします：

```
http://localhost:8000
```

#### 使い方

1. **商品ブロック数**を入力（1〜100）
2. **出力ファイル名**を入力（オプション）
3. 必要に応じて**詳細設定**を調整
4. 「テンプレート生成」ボタンをクリック
5. 生成完了後、「Excelファイルをダウンロード」ボタンをクリック

#### API ドキュメント

FastAPIの自動生成ドキュメントも利用できます：

```
http://localhost:8000/docs
```

### 方法2: Pythonスクリプト（コマンドライン）

```bash
python haibun_template_creator.py
```

デフォルトで `配分表_テンプレート.xlsx` が生成されます。

### カスタマイズ例

ブロック数（商品数）を変更する場合：

```python
from haibun_template_creator import HaibunTemplateCreator, TemplateConfig

# 3商品分のテンプレートを作成
config = TemplateConfig(num_blocks=3, default_output_path='配分表_3商品.xlsx')
creator = HaibunTemplateCreator(config=config)
creator.create_template()
```

## プロジェクト構造

```
tool2/
├── app.py                          # FastAPI Webアプリケーション
├── haibun_template_creator.py      # テンプレート生成エンジン
├── requirements.txt                # 依存パッケージ
├── README.md                       # このファイル
├── .gitignore                      # Git除外設定
├── .dockerignore                   # Docker除外設定
├── Dockerfile                      # Dockerイメージ定義
├── docker-compose.yml              # Docker Compose設定
├── render.yaml                     # Render Blueprint設定
├── templates/                      # HTMLテンプレート
│   └── index.html                  # メインUI
├── static/                         # 静的ファイル
│   ├── style.css                   # スタイルシート
│   └── script.js                   # フロントエンドロジック
└── temp_files/                     # 一時ファイル（自動生成）
    └── .gitkeep
```

### 主要コンポーネント

#### `haibun_template_creator.py`
- **TemplateConfig**: 設定クラス（列幅、行高、色など）
- **StoreData**: 店舗データクラス（店舗コード、店舗名）
- **BorderFactory**: 罫線生成ファクトリークラス
- **HaibunTemplateCreator**: メインクラス
  - `create_template()`: テンプレート生成
  - `_setup_columns()`: 列設定
  - `_setup_rows()`: 行設定
  - `_setup_header_area()`: タイトルエリア設定
  - `_setup_column_headers()`: ヘッダー設定
  - `_setup_data_rows()`: データ行設定
  - `_setup_borders()`: 罫線設定
  - `_setup_named_ranges()`: 名前定義

#### `app.py`
- FastAPIアプリケーション
- エンドポイント:
  - `GET /`: メインUI
  - `POST /api/generate`: テンプレート生成API
  - `GET /api/download/{file_id}`: ファイルダウンロード
  - `GET /api/health`: ヘルスチェック

## テンプレート構造

### シート構成

- **1～6行**: タイトルエリア（商品連絡書、配分、担当バイヤー、期間など）
- **7～8行**: ヘッダーエリア（列ヘッダー、店舗名など）
- **9行以降**: データエリア（商品ごとに3行構成のブロック）

### 各商品ブロック（3行構成）

1. **1行目（data_row）**: 商品情報行
   - 納品日、産地、規格、店着原価、税抜売価など
2. **2行目（detail_row）**: 詳細情報行
   - 品名、税込価格、入数、各店舗への配分数
3. **3行目（blank_row）**: 空白行（detail_rowと結合）

### 対応店舗（36店舗）

朝倉、伊野、高須、愛宕、神田、毎日屋土佐道路、山手、桟橋、大橋通、アクシス南国、瀬戸、清水、四万十、アクシスいの、土佐道路東、とさのさと御座、六泉寺、薊野、中万々、高岡、久米、森松、束本、仁井田、窪川、さが、丸味、サングリーン、大月、西土佐、十和、吾川、池川、上八川、下八川、惣菜

## 主な機能

### 自動計算

- **合計**: 全店舗の配分数の合計を自動計算
- **差異**: 総納品数と合計の差異を表示
- **税込価格**: 税抜価格×1.08を自動計算

### 名前付き範囲

各商品ブロックに以下の名前付き範囲が定義されます：

- `納品日_1`, `納品日_2`, ...
- `産地_1`, `産地_2`, ...
- `規格_1`, `規格_2`, ...
- `品名_1`, `品名_2`, ...
- `店着原価_1`, `店着原価_2`, ...
- `税抜売価_1`, `税抜売価_2`, ...
- `入数_1`, `入数_2`, ...
- `総納品数_1`, `総納品数_2`, ...
- `納品先_1`, `納品先_2`, ...
- `store01配分数_1`, `store02配分数_1`, ...

これらの名前付き範囲を使用することで、VBAや他のシートから簡単にセルを参照できます。

## カスタマイズ

### 設定のカスタマイズ

`TemplateConfig`クラスで以下の設定を変更できます：

- `num_blocks`: 商品ブロック数（デフォルト: 1）
- `default_output_path`: 出力ファイル名
- `pixel_100`, `pixel_50`: 列幅
- `color_red`, `color_blue`: 使用する色

### 店舗データのカスタマイズ

`StoreData.get_default_data()`メソッドを変更することで、店舗コードや店舗名をカスタマイズできます。

## クラウドデプロイ（本番環境）

### Renderでのデプロイ（推奨・無料）

[Render](https://render.com) を使用して無料でWebアプリをデプロイできます。

#### 手順

1. **Renderアカウントの作成**
   - [render.com](https://render.com) にアクセスしてアカウント作成
   - GitHubアカウントで連携

2. **新しいWebサービスの作成**
   - ダッシュボードから「New +」→「Web Service」を選択
   - GitHubリポジトリを接続（`Watanabe-Masao/tool2`）

3. **設定**
   以下の項目を設定します：

   - **Name**: `haibun-template-creator`（任意）
   - **Region**: `Oregon` または `Singapore`（近い方）
   - **Branch**: `claude/excel-distribution-template-creator-011CV3e6JaohqsZyk8DRq9nW`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`

4. **デプロイ**
   - 「Create Web Service」をクリック
   - 自動的にビルドとデプロイが開始されます
   - 5〜10分でデプロイ完了

5. **アクセス**
   - デプロイ完了後、Renderが生成したURL（例: `https://haibun-template-creator.onrender.com`）でアクセス可能

#### Blueprint設定（オプション）

`render.yaml`ファイルを使用すると、設定を自動化できます：

```yaml
services:
  - type: web
    name: haibun-template-creator
    env: python
    region: oregon
    plan: free
    branch: main
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app:app --host 0.0.0.0 --port $PORT
```

Renderダッシュボードで「New +」→「Blueprint」を選択し、リポジトリを接続すると自動的にデプロイされます。

#### 注意事項

- **無料プランの制限**:
  - 15分間アクセスがないとスリープ状態になります
  - スリープ後の初回アクセスは30秒〜1分程度かかります
  - 月750時間まで無料（継続稼働には有料プラン必要）

- **本番環境の推奨事項**:
  - 有料プラン（$7/月〜）でスリープ無効化
  - カスタムドメインの設定
  - 環境変数での機密情報管理

### その他のデプロイオプション

#### Railway
- [Railway](https://railway.app) - 無料枠500時間/月
- GitHubリポジトリを接続するだけで自動デプロイ

#### PythonAnywhere
- [PythonAnywhere](https://www.pythonanywhere.com) - Python特化ホスティング
- 初心者向けで設定が簡単

#### Docker

Dockerを使用すると、環境に依存せずに簡単にデプロイできます。

**前提条件**: Docker と Docker Compose のインストール

##### 方法1: Docker Compose（推奨）

```bash
# コンテナのビルドと起動
docker-compose up -d

# ログの確認
docker-compose logs -f

# 停止
docker-compose down
```

アクセス: `http://localhost:8000`

##### 方法2: Docker CLI

```bash
# イメージのビルド
docker build -t haibun-template-creator .

# コンテナの起動
docker run -d -p 8000:8000 --name haibun-app haibun-template-creator

# ログの確認
docker logs -f haibun-app

# 停止
docker stop haibun-app
docker rm haibun-app
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 作者

Watanabe-Masao

## バージョン

v2.0 (2025)
