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

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 作者

Watanabe-Masao

## バージョン

v2.0 (2025)
