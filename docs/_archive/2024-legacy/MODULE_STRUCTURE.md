# モジュール構造ドキュメント

このドキュメントは、リファクタリング後のモジュール構造を詳細に説明します。

## 概要

リファクタリングにより、モノリシックな構造からモジュラーアーキテクチャに移行しました。

**削減実績**:
- バックエンド: 619行 → 132行 (-487行, -79%)
- フロントエンド: 484行 → 234行 (-250行, -52%)
- **合計削減: -737行**

**新規モジュール**:
- バックエンド: 13ファイル
- フロントエンド: 9ファイル

---

## バックエンド構造

### ディレクトリ構成

```
tool2/
├── app.py (132行)              # アプリケーションエントリーポイント
├── config/                      # 設定とコアモジュール
│   ├── __init__.py
│   ├── config.py                # アプリケーション設定（Pydantic Settings）
│   ├── exceptions.py            # カスタム例外クラス
│   ├── handlers.py              # 例外ハンドラー
│   ├── models/                  # データモデル
│   │   ├── __init__.py
│   │   ├── requests.py          # リクエストモデル
│   │   └── responses.py         # レスポンスモデル
│   ├── services/                # ビジネスロジック
│   │   ├── __init__.py
│   │   ├── excel_service.py     # Excel生成サービス
│   │   └── pdf_service.py       # PDF変換サービス
│   └── api/                     # APIルーター
│       ├── __init__.py
│       └── routes.py            # エンドポイント定義
├── tests/                       # テスト
│   ├── __init__.py
│   ├── test_config.py
│   └── test_models.py
├── test_api_integration.py
└── test_haibun_template_creator.py
```

### モジュール詳細

#### 1. `app.py` (132行)

**責務**: アプリケーション初期化とWebページルーティング

**主な機能**:
- FastAPIアプリケーションの初期化
- 例外ハンドラーの登録
- APIルーターの登録
- キャッシュ制御ミドルウェア
- 静的ファイルとテンプレートの設定
- 起動/終了イベントハンドラー
- ログ設定

**依存関係**:
```python
from config.api import router
from config.config import settings
from config.handlers import register_exception_handlers
```

**削減**: 619行 → 132行 (-79%)

---

#### 2. `config/config.py`

**責務**: アプリケーション設定の一元管理

**主なクラス**:
```python
class Settings(BaseSettings):
    # アプリケーション設定
    app_name: str
    app_version: str
    debug: bool
    
    # ファイル設定
    temp_dir: Path
    max_file_age_hours: int
    
    # Excel設定
    max_products: int
    pixel_100: float
    pixel_50: float
    
    # LibreOffice設定
    libreoffice_timeout: int
    
    # キャッシュ設定
    cache_max_age_with_version: int
    cache_max_age_without_version: int
```

**設計原則**:
- SSOT: すべての設定を一箇所で管理
- 環境変数のサポート: `.env`ファイルから読み込み
- Pydantic Settingsによる型安全性

---

#### 3. `config/exceptions.py`

**責務**: カスタム例外クラスの定義

**例外階層**:
```
AppException (基底クラス)
├── TemplateCreationError
├── PDFConversionError
├── ValidationError
├── FileNotFoundError
├── ConfigurationError
└── ServiceError
```

**使用例**:
```python
raise TemplateCreationError(
    message="テンプレート生成に失敗しました",
    detail="商品データが不正です"
)
```

---

#### 4. `config/handlers.py`

**責務**: 例外ハンドラーの定義と登録

**主な関数**:
```python
async def app_exception_handler(request, exc)
async def validation_error_handler(request, exc)
async def pydantic_validation_error_handler(request, exc)
async def file_not_found_handler(request, exc)
async def template_creation_error_handler(request, exc)
async def pdf_conversion_error_handler(request, exc)
async def generic_exception_handler(request, exc)

def register_exception_handlers(app)
```

**設計原則**:
- 統一されたエラーレスポンス
- 適切なHTTPステータスコード
- ログ記録の統一

---

#### 5. `config/models/`

**責務**: データモデルの定義とバリデーション

**requests.py**:
```python
class ProductDataRequest(BaseModel):
    name: Optional[str]
    delivery_date: Optional[str]
    origin: Optional[str]
    standard: Optional[str]
    # ...

class TemplateRequest(BaseModel):
    delivery_date: Optional[str]
    supplier: Optional[str]
    buyer_name: Optional[str]
    products: List[ProductDataRequest]
    # ...
```

**responses.py**:
```python
class TemplateResponse(BaseModel):
    success: bool
    message: str
    download_url: Optional[str]
    filename: Optional[str]

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str]
    error_type: str
```

**設計原則**:
- Pydanticによる自動バリデーション
- 型ヒントによる型安全性
- APIドキュメントの自動生成

---

#### 6. `config/services/`

**責務**: ビジネスロジックの実装

**excel_service.py**:
```python
class ExcelService:
    @staticmethod
    def generate_filename(output_filename: Optional[str]) -> str
    
    @staticmethod
    def convert_product_data(
        product_requests: List[ProductDataRequest],
        common_delivery_date: Optional[str],
        common_supplier: Optional[str]
    ) -> List[ProductData]
    
    @staticmethod
    def create_template(
        temp_dir: Path,
        request: TemplateRequest,
        file_id: Optional[str]
    ) -> tuple[Path, str]
```

**pdf_service.py**:
```python
class PDFService:
    @staticmethod
    def prepare_for_conversion(excel_path: Path) -> None
    
    @staticmethod
    def convert_to_pdf(excel_path: Path, pdf_path: Path) -> bool
    
    @staticmethod
    def _clear_hidden_columns(ws) -> None
    
    @staticmethod
    def _convert_dates_to_strings(ws) -> None
```

**設計原則**:
- 抽象化: 外部ライブラリの詳細を隠蔽
- 責務の明確化: 各サービスが単一の責務
- 再利用性: 独立したサービスとして使用可能

---

#### 7. `config/api/routes.py`

**責務**: APIエンドポイントの定義

**エンドポイント**:
```python
router = APIRouter(prefix="/api", tags=["api"])

@router.post("/generate")
async def generate_template(req: TemplateRequest)

@router.get("/download/{file_id}")
async def download_template(file_id: str, filename: str)

@router.post("/preview")
async def preview_template(req: TemplateRequest)

@router.get("/health")
@router.head("/health")
async def health_check()

@router.get("/version")
async def get_version()

@router.get("/firebase-config")
async def get_firebase_config()
```

**設計原則**:
- 関心の分離: ルーティングとビジネスロジックを分離
- SSOT: すべてのエンドポイントを一箇所で管理

---

## フロントエンド構造

### ディレクトリ構成

```
static/
├── script.js (234行)           # メインスクリプト
└── js/
    ├── api/                     # API通信層
    │   ├── client.js            # APIクライアント
    │   └── endpoints.js         # エンドポイント定義
    ├── services/                # サービス層
    │   ├── form-service.js      # フォーム処理
    │   ├── download-service.js  # ダウンロード処理
    │   └── validation-service.js # バリデーション
    ├── ui/                      # UI層
    │   ├── loading.js           # ローディング表示
    │   └── notification.js      # 通知表示
    └── utils/                   # ユーティリティ層
        ├── device-detector.js   # デバイス判定
        ├── error-handler.js     # エラーハンドリング
        └── form-utils.js        # フォームヘルパー
```

### モジュール詳細

#### 1. `script.js` (234行)

**責務**: アプリケーションの初期化とオーケストレーション

**主な機能**:
```javascript
// モジュールインポート
import { APIClient } from './js/api/client.js';
import { FormService } from './js/services/form-service.js';
import { ValidationService } from './js/services/validation-service.js';
import { DownloadService } from './js/services/download-service.js';
import { LoadingUI } from './js/ui/loading.js';
import { NotificationUI } from './js/ui/notification.js';
import { ErrorHandler } from './js/utils/error-handler.js';

// イベントハンドラー
async function handleFormSubmit(event)
async function handlePreview(event)
function showPDFModal(blob)
function handleSuccess(data)
function handleError(error)
function handleDownload()
```

**削減**: 484行 → 234行 (-52%)

---

#### 2. `js/api/`

**責務**: サーバーとの通信を抽象化

**endpoints.js**:
```javascript
export const API_ENDPOINTS = {
    GENERATE: '/api/generate',
    PREVIEW: '/api/preview',
    DOWNLOAD: (fileId, filename) => `/api/download/${fileId}?filename=${filename}`,
    HEALTH: '/api/health',
    VERSION: '/api/version',
    FIREBASE_CONFIG: '/api/firebase-config'
};
```

**client.js**:
```javascript
export class APIClient {
    static async generateTemplate(data)
    static async generatePreview(data)
    static async checkHealth()
    static async getVersion()
    static async getFirebaseConfig()
}
```

**設計原則**:
- SSOT: エンドポイントURLを一箇所で管理
- 抽象化: fetch APIの詳細を隠蔽
- エラーハンドリング: 統一されたエラー処理

---

#### 3. `js/services/`

**責務**: ビジネスロジックの実装

**form-service.js**:
```javascript
export class FormService {
    static getFormData()
    static collectProductsData()
    static collectStoreQuantities(productId)
    static resetForm()
    static getStores()
}
```

**validation-service.js**:
```javascript
export class ValidationService {
    static validateForm()
    static validateProduct(productItem)
    static isValidNumber(value, allowZero)
    static isValidString(value, maxLength)
}
```

**download-service.js**:
```javascript
export class DownloadService {
    static downloadFile(url, filename)
    static triggerDownload(url, filename)
    static showDownloadModal(url, filename)
    static isMobileDevice()
    static isIOSDevice()
}
```

---

#### 4. `js/ui/`

**責務**: ユーザーインターフェース制御

**loading.js**:
```javascript
export class LoadingUI {
    static show()
    static hide()
    static toggle()
}
```

**notification.js**:
```javascript
export class NotificationUI {
    static showSuccess(message)
    static showError(message)
    static hideSuccess()
    static hideError()
    static hideAll()
    static showDownloadButton()
    static hideDownloadButton()
}
```

---

#### 5. `js/utils/`

**責務**: 汎用ユーティリティ機能

**device-detector.js**:
```javascript
export class DeviceDetector {
    static isMobile()
    static isIOS()
    static isAndroid()
    static isTablet()
    static isDesktop()
    static getDeviceInfo()
}
```

**error-handler.js**:
```javascript
export class ErrorHandler {
    static ErrorTypes = {
        NETWORK: 'NetworkError',
        VALIDATION: 'ValidationError',
        SERVER: 'ServerError',
        NOT_FOUND: 'NotFoundError',
        UNKNOWN: 'UnknownError'
    }
    
    static handle(error, context)
    static detectErrorType(error)
    static getErrorMessage(error, errorType)
    static isNetworkError(error)
    static isValidationError(error)
    static isServerError(error)
    static getErrorInfo(error)
    static display(message, displayFunction)
    static logDetailedError(error)
}
```

**form-utils.js**:
```javascript
export class FormUtils {
    static parseInt(value, defaultValue)
    static parseFloat(value, defaultValue)
    static trim(value, defaultValue)
    static emptyToNull(value)
    static getValue(elementId, defaultValue)
    static formatNumber(value)
    static formatDate(date)
    static getCurrentDate()
    static showElement(elementId, displayStyle)
    static hideElement(elementId)
}
```

---

## 設計原則の適用

### 1. SSOT (Single Source of Truth)

**バックエンド**:
- 設定: `config/config.py`
- エンドポイント: `config/api/routes.py`
- 例外: `config/exceptions.py`

**フロントエンド**:
- エンドポイントURL: `js/api/endpoints.js`
- 店舗データ: `js/services/form-service.js`

### 2. 関心の分離 (Separation of Concerns)

各レイヤーが明確な責務を持つ:
- API層: サーバー通信
- サービス層: ビジネスロジック
- UI層: ユーザーインターフェース
- ユーティリティ層: 汎用機能

### 3. DRY (Don't Repeat Yourself)

重複コードの排除:
- フォームデータ取得ロジック: 2箇所 → 1箇所
- バリデーションロジック: 2箇所 → 1箇所
- エラーハンドリング: 分散 → 統一

### 4. 抽象化・隠蔽

低レベルAPIの詳細を隠蔽:
- fetch API → APIClient
- LibreOffice → PDFService
- openpyxl → ExcelService

### 5. テスト容易性

各モジュールを独立してテスト可能:
- モックやスタブの作成が容易
- 単体テストと統合テストの分離

---

## データフロー

### テンプレート生成フロー

```
User Input
    ↓
[ValidationService] validate
    ↓
[FormService] getFormData
    ↓
[APIClient] generateTemplate
    ↓ HTTP POST
[routes.py] generate_template
    ↓
[ExcelService] create_template
    ↓
[HaibunTemplateCreator] generate
    ↓
[Response] TemplateResponse
    ↓ JSON
[script.js] handleSuccess
    ↓
[NotificationUI] showSuccess
[DownloadService] downloadFile
```

### エラーハンドリングフロー

```
Error Occurs
    ↓
Backend: Custom Exception
    ↓
[handlers.py] exception_handler
    ↓
[ErrorResponse] JSON
    ↓ HTTP Error
Frontend: APIClient catch
    ↓
[ErrorHandler] handle
    ↓
[NotificationUI] showError
```

---

## テスト戦略

### バックエンドテスト

**単体テスト**:
- `test_config.py`: 設定のテスト (5テスト)
- `test_models.py`: モデルのバリデーションテスト (13テスト)

**統合テスト**:
- `test_api_integration.py`: APIエンドポイントのテスト (13テスト)
- `test_haibun_template_creator.py`: テンプレート生成のテスト (13テスト)

**合計**: 44テスト、すべて合格

### フロントエンドテスト

現在未実装。推奨テストフレームワーク:
- Jest
- Vitest
- Mocha

---

## 依存関係グラフ

### バックエンド

```
app.py
  ├── config.api.router
  │     └── config.api.routes
  │           ├── config.services.ExcelService
  │           ├── config.services.PDFService
  │           └── config.models.*
  ├── config.config.settings
  └── config.handlers.register_exception_handlers
        ├── config.exceptions.*
        └── config.models.ErrorResponse
```

### フロントエンド

```
script.js
  ├── js/api/client.js
  │     └── js/api/endpoints.js
  ├── js/services/form-service.js
  ├── js/services/validation-service.js
  ├── js/services/download-service.js
  ├── js/ui/loading.js
  ├── js/ui/notification.js
  └── js/utils/error-handler.js
```

---

## メンテナンスガイド

### 新機能の追加

1. **新しいAPIエンドポイント**:
   - `config/api/routes.py`にエンドポイントを追加
   - 必要に応じて`config/services/`に新しいサービスを作成

2. **新しいデータモデル**:
   - `config/models/requests.py`または`responses.py`にモデルを追加

3. **新しいバリデーション**:
   - `js/services/validation-service.js`にバリデーションロジックを追加

### バグ修正

1. **該当するモジュールを特定**:
   - エラーメッセージから該当モジュールを特定

2. **テストを追加**:
   - バグを再現するテストを追加

3. **修正とテスト**:
   - モジュールを修正
   - すべてのテストが合格することを確認

### リファクタリング

1. **小さな変更から**:
   - 一度に1つのモジュールをリファクタリング

2. **テストの維持**:
   - リファクタリング後もすべてのテストが合格することを確認

3. **ドキュメントの更新**:
   - 変更内容をドキュメントに反映

---

## パフォーマンス最適化

### バックエンド

1. **非同期処理**: FastAPIの非同期エンドポイント
2. **ファイルクリーンアップ**: 定期的な一時ファイル削除
3. **キャッシュ**: 静的ファイルのキャッシュ制御

### フロントエンド

1. **ESモジュール**: ネイティブモジュールの使用
2. **遅延読み込み**: 必要なモジュールのみをインポート
3. **キャッシュバスティング**: バージョンクエリパラメータ

---

## まとめ

このモジュール構造は、以下の利点を提供します:

1. **保守性**: 各機能が独立したモジュールで管理
2. **拡張性**: 新機能の追加が容易
3. **テスト容易性**: 各モジュールを独立してテスト可能
4. **可読性**: コードが小さく、目的が明確
5. **再利用性**: モジュールを他のプロジェクトでも使用可能

**成果**:
- コード削減: -737行
- モジュール追加: 22ファイル
- テスト: 44/44合格

この構造により、今後の開発が効率的かつ安全に行えるようになっています。
