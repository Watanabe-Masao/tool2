# 開発ガイド

このドキュメントでは、開発環境のセットアップ、開発フロー、コーディング規約、今後の計画を記述しています。

---

## 目次

1. [開発環境セットアップ](#development-setup)
2. [開発ワークフロー](#development-workflow)
3. [コーディング規約](#coding-standards)
4. [テスト戦略](#testing-strategy)
5. [デバッグガイド](#debugging-guide)
6. [リファクタリング計画](#refactoring-plan)
7. [ロードマップ](#roadmap)

---

## Development Setup

### 必要なツール

- **Python 3.11+**: メイン言語
- **Git**: バージョン管理
- **LibreOffice**: PDF変換（本番環境のみ、ローカルではオプション）
- **Docker** (オプション): コンテナ環境
- **VS Code** (推奨): エディタ

### セットアップ手順

#### 1. リポジトリクローン

```bash
git clone https://github.com/Watanabe-Masao/tool2.git
cd tool2
```

#### 2. Python仮想環境作成

```bash
# venv作成
python3 -m venv venv

# venv有効化
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 依存パッケージインストール
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

#### 3. 環境変数設定

```bash
# .env.exampleをコピー
cp .env.example .env

# .envファイルを編集（必要に応じて）
# 注: Firebase設定はクライアント側で直接行うため不要
```

#### 4. Firebaseプロジェクト設定

[FIREBASE_SETUP.md](../FIREBASE_SETUP.md) を参照

#### 5. サーバー起動

```bash
# 開発サーバー起動
python app.py

# または
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

ブラウザで `http://localhost:8000` にアクセス

#### 6. テスト実行

```bash
# すべてのテスト実行
pytest -v

# カバレッジレポート生成
pytest --cov=haibun_template_creator --cov-report=html

# HTMLレポート確認
open htmlcov/index.html  # macOS
```

---

## Development Workflow

### Git ブランチ戦略

```
main
  └── claude/feature-name-XXXXX
        └── feature/my-feature
```

- **main**: 本番ブランチ（Renderに自動デプロイ）
- **claude/***：Claude開発用ブランチ
- **feature/***：機能開発ブランチ

### 開発フロー

#### 1. 新機能開発

```bash
# 最新を取得
git checkout main
git pull origin main

# 機能ブランチ作成
git checkout -b feature/add-csv-import

# 開発...

# コミット
git add .
git commit -m "feat: Add CSV import functionality"

# プッシュ
git push origin feature/add-csv-import

# GitHubでプルリクエスト作成
```

#### 2. バグ修正

```bash
# バグ修正ブランチ作成
git checkout -b bugfix/fix-date-format

# 修正...

# テスト実行
pytest -v

# コミット
git commit -m "fix: Correct date format in PDF preview"

# プッシュ
git push origin bugfix/fix-date-format
```

#### 3. コミットメッセージ規約

[Conventional Commits](https://www.conventionalcommits.org/) に従う

```
<type>: <description>

[optional body]

[optional footer]
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: コードフォーマット
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド・設定変更

**例**:
```
feat: Add CSV import feature

- Implement CSV parser
- Add import button to UI
- Update tests

Closes #123
```

---

## Coding Standards

### Python (PEP 8準拠)

#### 命名規則

```python
# クラス: PascalCase
class HaibunTemplateCreator:
    pass

# 関数・変数: snake_case
def create_template():
    product_data = get_product_data()

# 定数: UPPER_SNAKE_CASE
MAX_PRODUCTS = 100
DEFAULT_WIDTH = 13.5714285714

# プライベートメソッド: _snake_case
def _setup_columns(self):
    pass
```

#### 型ヒント

```python
from typing import List, Optional, Dict

def create_template(
    products: Optional[List[ProductData]] = None,
    buyer_name: Optional[str] = None
) -> None:
    """
    テンプレート作成

    Args:
        products: 商品データリスト
        buyer_name: 担当バイヤー名

    Returns:
        None
    """
    pass
```

#### Docstring

```python
def calculate_total(prices: List[float]) -> float:
    """
    合計金額を計算

    Args:
        prices: 価格リスト

    Returns:
        float: 合計金額

    Raises:
        ValueError: 価格が負の値の場合

    Examples:
        >>> calculate_total([100, 200, 300])
        600
    """
    if any(p < 0 for p in prices):
        raise ValueError("Prices must be non-negative")
    return sum(prices)
```

### JavaScript (ESLint準拠)

#### 命名規則

```javascript
// クラス: PascalCase
class AuthService {
}

// 関数・変数: camelCase
function handleDownload() {
    const downloadUrl = getUrl();
}

// 定数: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// プライベートメソッド: _camelCase
function _validateInput(data) {
}
```

#### ESM (ES Modules)

```javascript
// エクスポート
export function loginWithGoogle() {
    // ...
}

export default AuthService;

// インポート
import { loginWithGoogle } from './auth-service.js';
import AuthService from './auth-service.js';
```

#### async/await

```javascript
// 非同期処理
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
```

### HTML/CSS

#### BEM命名規則

```html
<!-- Block__Element--Modifier -->
<div class="download-modal">
    <div class="download-modal__content">
        <h3 class="download-modal__title">タイトル</h3>
        <button class="download-modal__button download-modal__button--primary">
            ダウンロード
        </button>
    </div>
</div>
```

```css
.download-modal {
    /* Block */
}

.download-modal__content {
    /* Element */
}

.download-modal__button--primary {
    /* Modifier */
}
```

---

## Testing Strategy

### テストピラミッド

```
        ┌─────────────┐
        │  E2E Tests  │  ← 少数（手動）
        ├─────────────┤
        │ Integration │  ← 中程度
        │    Tests    │
        ├─────────────┤
        │    Unit     │  ← 多数（自動）
        │    Tests    │
        └─────────────┘
```

### ユニットテスト

**対象**: `haibun_template_creator.py`

```python
# test_haibun_template_creator.py

class TestHeaderStructure:
    """ヘッダー構造のテスト"""

    def test_header_cell_merges(self, temp_output_path):
        """セル結合の検証"""
        config = TemplateConfig(num_blocks=1, default_output_path=str(temp_output_path))
        creator = HaibunTemplateCreator(config=config)
        creator.create_template()

        wb = openpyxl.load_workbook(temp_output_path)
        ws = wb.active

        merged_ranges = [str(r) for r in ws.merged_cells.ranges]

        assert 'B7:C8' in merged_ranges
        assert 'AW7:AW8' in merged_ranges
        # ...
```

**実行**:
```bash
pytest test_haibun_template_creator.py -v
```

### インテグレーションテスト

**対象**: API エンドポイント

```python
# test_api_integration.py

from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_generate_endpoint():
    """テンプレート生成APIのテスト"""
    response = client.post("/api/generate", json={
        "num_blocks": 1,
        "products": [
            {
                "name": "りんご",
                "origin": "青森",
                # ...
            }
        ]
    })

    assert response.status_code == 200
    assert "download_url" in response.json()
```

**実行**:
```bash
pytest test_api_integration.py -v
```

### E2Eテスト（手動）

1. ブラウザで `http://localhost:8000` にアクセス
2. ログイン
3. 商品情報入力
4. 「テンプレート生成」クリック
5. ダウンロード確認
6. Excelファイルを開いて内容確認
7. PDFプレビュー表示確認

**チェックリスト**:
- [ ] ログイン/ログアウト動作
- [ ] 商品追加/削除
- [ ] オートコンプリート動作
- [ ] Excelダウンロード（デスクトップ）
- [ ] Excelダウンロード（モバイル・モーダル）
- [ ] PDFプレビュー表示
- [ ] カレンダー表示
- [ ] データ同期

---

## Debugging Guide

### バックエンドデバッグ

#### ログ出力

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@app.post("/api/generate")
async def generate_template(req: TemplateRequest):
    logger.debug(f"Request received: {req}")
    # ...
    logger.info(f"Template created: {temp_excel_path}")
```

#### pdb使用

```python
import pdb

def create_template(self):
    # ブレークポイント設定
    pdb.set_trace()

    # ステップ実行
    # n: next line
    # s: step into
    # c: continue
    # p variable: print variable
```

#### VS Code デバッグ設定

`.vscode/launch.json`:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "FastAPI",
            "type": "python",
            "request": "launch",
            "module": "uvicorn",
            "args": [
                "app:app",
                "--reload",
                "--host",
                "0.0.0.0",
                "--port",
                "8000"
            ],
            "jinja": true
        }
    ]
}
```

### フロントエンドデバッグ

#### Chrome DevTools

```javascript
// コンソールログ
console.log('Debug:', data);
console.error('Error:', error);
console.table(products);

// デバッガー
debugger;  // ブレークポイント

// ネットワーク確認
// DevTools > Network タブ
```

#### モバイルデバッグ

**iPhoneでSafariデバッグ**:
1. iPhone設定 > Safari > 詳細 > Webインスペクタ ON
2. Mac Safari > 開発 > iPhoneデバイス選択
3. コンソール・ネットワーク確認

**Androidでデバッグ**:
1. Android設定 > 開発者オプション > USBデバッグ ON
2. Chrome > chrome://inspect
3. デバイス選択してインスペクト

---

## Refactoring Plan

### ✅ 完了済み（v2.0）

#### 1. app.py の分割 ✅

**実施済み**: モジュール化完了（2025-01）

**成果**: app.py 619行 → 132行（-79%削減）

```
config/
  ├── config.py           # アプリケーション設定
  ├── exceptions.py       # カスタム例外クラス
  ├── handlers.py         # 例外ハンドラー
  ├── models/
  │   ├── requests.py     # リクエストモデル
  │   └── responses.py    # レスポンスモデル
  ├── services/
  │   ├── excel_service.py  # Excel生成サービス
  │   └── pdf_service.py    # PDF変換サービス
  └── api/
      └── routes.py       # APIエンドポイント定義
```

#### 2. JavaScript のモジュール化 ✅

**実施済み**: ES6モジュール化完了（2025-01）

**成果**: script.js 484行 → 234行（-52%削減）

```
static/js/
  ├── script.js           # エントリーポイント
  ├── api/
  │   ├── client.js       # APIクライアント
  │   └── endpoints.js    # エンドポイント定義
  ├── services/
  │   ├── form-service.js # フォーム処理
  │   ├── download-service.js # ダウンロード処理
  │   └── validation-service.js # バリデーション
  ├── ui/
  │   ├── loading.js      # ローディング表示
  │   └── notification.js # 通知表示
  └── utils/
      ├── device-detector.js # デバイス判定
      ├── error-handler.js   # エラーハンドリング
      └── form-utils.js      # フォームヘルパー
```

#### 3. エラーハンドリング統一 ✅

**実施済み**: バックエンド・フロントエンド両方で統一（2025-01）

```python
# config/exceptions.py
class AppException(Exception):
    """アプリケーション基底例外"""
    def __init__(self, message: str, detail: Optional[str] = None):
        self.message = message
        self.detail = detail

class TemplateCreationError(AppException):
    pass

class PDFConversionError(AppException):
    pass

# config/handlers.py
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=400,
        content=ErrorResponse(
            error=exc.message,
            detail=exc.detail,
            error_type=exc.__class__.__name__
        ).dict()
    )
```

```javascript
// static/js/utils/error-handler.js
export class ErrorHandler {
    static handle(error, context = '') {
        const errorType = this.detectErrorType(error);
        const message = this.getErrorMessage(error, errorType);
        return context ? `${context}: ${message}` : message;
    }
}
```

詳細は [docs/MODULE_STRUCTURE.md](MODULE_STRUCTURE.md) を参照

#### 4. 設定ファイル外部化 ✅

**実施済み**: Pydantic Settings導入（2025-01）

```python
# config/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Haibun Template Creator"
    app_version: str = "2.0.0"
    debug: bool = False

    temp_dir: Path = Path("temp_files")
    max_products: int = 100
    libreoffice_timeout: int = 30

    pixel_100: float = 13.5714285714
    pixel_50: float = 6.4285714286

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

### 今後の優先度中

#### 1. キャッシュ導入

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_store_data() -> StoreData:
    """店舗データをキャッシュ"""
    return StoreData.get_default_data()
```

### 今後の優先度低

#### 1. TypeScript移行

```typescript
// types.ts
interface ProductData {
    name: string;
    origin: string;
    standard: string;
    // ...
}

// api-client.ts
async function generateTemplate(data: TemplateRequest): Promise<TemplateResponse> {
    // ...
}
```

---

## Roadmap

### v2.1（2025年1月-2月）

**目標**: モバイル対応強化・UX改善

- [x] PDFプレビュー列ずれ修正
- [x] iPhoneダウンロード対応
- [x] センター送信日欄追加（AW列）
- [ ] ダークモード対応
- [ ] エクスポート履歴表示
- [ ] プログレスバー追加

### v2.2（2025年3月-4月）

**目標**: 機能拡充

- [ ] CSVインポート機能
- [ ] CSVエクスポート機能
- [ ] テンプレートプリセット保存
- [ ] バルク操作（複数ファイル一括生成）
- [ ] 店舗グループ設定

### v3.0（2025年5月-）

**目標**: エンタープライズ対応

- [ ] マルチテナント対応
- [ ] 権限管理（管理者/一般ユーザー）
- [ ] API認証（APIキー）
- [ ] Webhook機能
- [ ] 監査ログ
- [ ] 店舗マスタ管理画面
- [ ] React/Vueへの移行検討

### 技術的改善（継続）

- [ ] テストカバレッジ90%以上維持
- [ ] CI/CDパイプライン構築（GitHub Actions）
- [ ] パフォーマンス最適化（PDF変換10秒以内）
- [ ] ドキュメント自動生成（Sphinx/MkDocs）
- [ ] コードレビュー文化の確立

---

## 貢献ガイドライン

### プルリクエスト

1. **Issue作成**: 機能追加・バグ修正前にIssue作成
2. **ブランチ作成**: `feature/` または `bugfix/` プレフィックス
3. **コミット**: Conventional Commits準拠
4. **テスト**: 必ずテストを追加・実行
5. **ドキュメント更新**: 必要に応じて更新
6. **PR作成**: 詳細な説明を記載

### コードレビューチェックリスト

- [ ] コードが規約に準拠しているか
- [ ] テストが追加されているか
- [ ] テストがすべて合格しているか
- [ ] ドキュメントが更新されているか
- [ ] パフォーマンスへの影響は許容範囲か
- [ ] セキュリティ上の問題がないか
- [ ] 後方互換性が保たれているか

---

## リソース

### 公式ドキュメント

- [FastAPI](https://fastapi.tiangolo.com/)
- [openpyxl](https://openpyxl.readthedocs.io/)
- [Firebase](https://firebase.google.com/docs)
- [Firestore](https://firebase.google.com/docs/firestore)

### ツール

- [pytest](https://docs.pytest.org/)
- [Black](https://black.readthedocs.io/) - Pythonフォーマッター
- [ESLint](https://eslint.org/) - JavaScriptリンター
- [Prettier](https://prettier.io/) - コードフォーマッター

### コミュニティ

- [GitHub Discussions](https://github.com/Watanabe-Masao/tool2/discussions)
- [Issue Tracker](https://github.com/Watanabe-Masao/tool2/issues)

---

**ドキュメント最終更新**: 2025-01-13
