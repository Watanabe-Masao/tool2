# システムアーキテクチャ

このドキュメントでは、配分表テンプレート作成ツールのシステム構造を詳細に記述しています。

---

## 目次

1. [システム概要](#system-overview)
2. [アーキテクチャ図](#architecture-diagram)
3. [バックエンド](#backend)
4. [フロントエンド](#frontend)
5. [データフロー](#data-flow)
6. [Excelテンプレート構造](#excel-template-structure)
7. [認証とデータ管理](#authentication-and-data)

---

## System Overview

### 設計思想

- **シンプル**: 複雑なフレームワークを避け、必要最小限の技術スタック
- **レスポンシブ**: デスクトップ・タブレット・スマートフォン対応
- **オフライン対応**: IndexedDBでローカルデータ保存
- **高速**: FastAPIとVanilla JSによる軽量実装

### 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| バックエンド | Python 3.11+ | openpyxl対応、型ヒント |
| Webフレームワーク | FastAPI | 高速、自動ドキュメント生成 |
| Excel操作 | openpyxl 3.1+ | Excelファイル生成 |
| PDF変換 | LibreOffice | 高品質なPDF変換 |
| 設定管理 | Pydantic Settings 2.0+ | 環境変数管理、型安全 (v2.3) |
| タスクスケジューラ | APScheduler 3.10+ | 定期的なファイルクリーンアップ (v2.3) |
| ログ | Python logging | 構造化ログ、デバッグ支援 (v2.3) |
| フロントエンド | Vanilla JavaScript (ES6) | 軽量、フレームワーク不要 |
| 認証 | Firebase Authentication | Google認証、簡単統合 |
| データベース | Firestore | NoSQL、リアルタイム同期 |
| ローカルDB | IndexedDB | オフライン対応 |
| ホスティング | Render | 無料枠、自動デプロイ |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User (Browser)                          │
│  - Desktop / Tablet / Smartphone                                │
│  - Chrome / Safari / Firefox / Edge                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend (HTML/CSS/JS)                    │
├─────────────────────────────────────────────────────────────────┤
│  templates/index.html          │  static/js/                    │
│  - メインUI                    │  - firebase-config.js          │
│  - タブナビゲーション          │  - auth-service.js             │
│  - フォーム                    │  - firestore-service.js        │
│  - モーダル                    │  - indexeddb-service.js        │
│                                │  - data-sync-service.js        │
│  static/script.js              │  - app-workflow.js             │
│  - メインロジック              │  - calendar-view.js            │
│  - API呼び出し                 │                                │
│  - モバイル対応                │  static/style.css              │
└────────────┬────────────────────┴────────────────────────────────┘
             │
             │ HTTPS/JSON
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                            │
├─────────────────────────────────────────────────────────────────┤
│  app.py                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Endpoints:                                              │   │
│  │  GET  /                  → index.html                   │   │
│  │  GET  /login             → login.html                   │   │
│  │  POST /api/generate      → Excel生成                    │   │
│  │  POST /api/preview       → PDF生成                      │   │
│  │  GET  /api/download/{id} → ファイルダウンロード        │   │
│  │  GET  /api/health        → ヘルスチェック              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  haibun_template_creator.py                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Classes:                                                │   │
│  │  - TemplateConfig      : 設定管理                      │   │
│  │  - StoreData           : 店舗データ                    │   │
│  │  - BorderFactory       : 罫線生成                      │   │
│  │  - HaibunTemplateCreator : テンプレート生成            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  prepare_excel_for_pdf_conversion()                             │
│  - 非表示列の処理                                               │
│  - 日付フォーマット変換                                         │
│                                                                 │
│  excel_to_pdf()                                                 │
│  - LibreOffice呼び出し                                          │
│  - Excel → ODS → PDF 変換                                       │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
├─────────────────────────────────────────────────────────────────┤
│  Firebase Authentication                                        │
│  - Google認証                                                   │
│  - ユーザー管理                                                 │
│                                                                 │
│  Firestore                                                      │
│  - 配分データ保存                                               │
│  - リアルタイム同期                                             │
│                                                                 │
│  LibreOffice (本番環境)                                         │
│  - PDF変換処理                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend

### app.py

FastAPIアプリケーションのメインファイル。

#### v2.3.0 新機能

**定期的なファイルクリーンアップ**
```python
# APSchedulerによる定期実行
scheduler = BackgroundScheduler()

def cleanup_old_files():
    """24時間以上古いファイルを削除"""
    cutoff_time = datetime.now() - timedelta(hours=24)
    for file in temp_dir.glob("*.xlsx", "*.pdf", "*.ods"):
        if file.stat().st_mtime < cutoff_time:
            file.unlink()

@app.on_event("startup")
async def startup_event():
    scheduler.add_job(cleanup_old_files, 'interval', hours=1)
    scheduler.start()
```

**統一ロギング**
```python
# 構造化ログ
logger = logging.getLogger(__name__)

logger.info("Application started")
logger.debug(f"Excel template created: {path.exists()}")
logger.error("Error occurred", exc_info=True)
```

#### エンドポイント構成

```python
@app.get("/")
async def root(request: Request)
    """メインUI表示"""
    return templates.TemplateResponse("index.html", {...})

@app.get("/login")
async def login_page(request: Request)
    """ログインページ表示"""
    return templates.TemplateResponse("login.html", {...})

@app.post("/api/generate")
async def generate_template(req: TemplateRequest)
    """Excelテンプレート生成"""
    1. リクエスト検証
    2. ExcelService.create_template()呼び出し (v2.3)
    3. 一時ファイルに保存
    4. ダウンロードURL返却

    # カスタム例外を使用 (v2.3)
    except Exception as e:
        raise TemplateCreationError(message="...", detail=str(e))

@app.post("/api/preview")
async def preview_template(req: TemplateRequest)
    """PDFプレビュー生成"""
    1. Excelテンプレート生成
    2. PDFService.prepare_for_conversion() 実行 (v2.3)
       - 非表示列の内容クリア
       - 日付を文字列に変換
    3. PDFService.convert_to_pdf() 呼び出し (v2.3)
       - Excel → ODS変換
       - ODS → PDF変換
    4. PDFファイル返却

    # ロギング統一 (v2.3)
    logger.debug("Creating Excel template...")
    logger.error("PDF preview generation failed", exc_info=True)

@app.get("/api/download/{file_id}")
async def download_file(file_id: str)
    """ファイルダウンロード"""
    # カスタム例外 (v2.3)
    if not temp_path.exists():
        raise AppFileNotFoundError(message="...", detail=f"ファイルID: {file_id}")

@app.get("/api/health")
async def health_check()
    """ヘルスチェック（Render用）"""

@app.get("/api/firebase-config")
async def get_firebase_config()
    """Firebase設定取得 (v2.3: セキュリティ強化)"""
    # 環境変数の検証
    if missing_vars:
        raise ConfigurationError(message="...", detail="...")
```

#### サービス層 (v2.3.0)

**config/services/excel_service.py**
```python
class ExcelService:
    @staticmethod
    def generate_filename(output_filename: Optional[str]) -> str
        """ファイル名生成（タイムスタンプ付き）"""

    @staticmethod
    def convert_product_data(...) -> List[ProductData]
        """商品データ変換（後方互換性あり）"""

    @staticmethod
    def create_template(...) -> tuple[Path, str]
        """テンプレート生成（HaibunTemplateCreatorの抽象化）"""
```

**config/services/pdf_service.py**
```python
class PDFService:
    @staticmethod
    def prepare_for_conversion(excel_path: Path) -> None
        """PDF変換前の最適化"""
        # ロギング統一 (v2.3)
        logger.debug("Processing hidden column...")
        logger.error("PDF conversion preparation failed", exc_info=True)

    @staticmethod
    def convert_to_pdf(excel_path: Path, pdf_path: Path) -> bool
        """LibreOffice PDF変換"""
        # Excel → ODS → PDF の2段階変換
```

### haibun_template_creator.py

Excelテンプレート生成エンジン。

#### クラス構成

```python
@dataclass
class TemplateConfig:
    """設定管理クラス"""
    num_blocks: int = 1              # 商品ブロック数
    pixel_100: float = 13.5714285714 # 100ピクセル列幅
    pixel_50: float = 6.4285714286   # 50ピクセル列幅
    default_output_path: str = '配分表_テンプレート.xlsx'
    # ... その他の設定

@dataclass
class ProductData:
    """商品データクラス"""
    delivery_date: Optional[str] = None
    origin: Optional[str] = None
    standard: Optional[str] = None
    product_name: Optional[str] = None
    store_cost: Optional[float] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    total_delivery: Optional[int] = None
    delivery_dest: Optional[str] = None
    store_quantities: Dict[str, int] = field(default_factory=dict)

@dataclass
class StoreData:
    """店舗データクラス"""
    codes: List[Tuple[str, Union[str, int]]]
    names: List[Tuple[str, str, int]]

class BorderFactory:
    """罫線生成ファクトリー"""
    @staticmethod
    def create(top, bottom, left, right) -> Border
        """罫線オブジェクト生成"""

class HaibunTemplateCreator:
    """メインクラス - テンプレート生成"""
```

#### 主要メソッド

```python
def create_template(
    self,
    products: Optional[List[ProductData]] = None,
    buyer_name: Optional[str] = None
) -> None:
    """テンプレート作成のメインフロー"""
    1. _setup_print_settings()    # 印刷設定
    2. _setup_columns()            # 列設定
    3. _setup_rows()               # 行設定
    4. _setup_header_area()        # タイトルエリア
    5. _setup_column_headers()     # 列ヘッダー
    6. _setup_data_rows()          # データ行
    7. _setup_borders()            # 罫線
    8. _setup_named_ranges()       # 名前定義
    9. wb.save()                   # 保存
```

#### 列構成

| 列 | 用途 | hidden | width |
|----|------|--------|-------|
| A  | 商品コード（未使用） | True | 0.08333 |
| B  | 店着日 | False | 7.296875 |
| C  | （店着日と結合） | False | 7.296875 |
| D  | 産地 | False | 10.0 |
| E  | 規格 | False | 13.3984375 |
| F  | LFC着（未使用） | True | 0.08333 |
| G  | 店着原価 | False | 8.3984375 |
| H  | 税抜 | False | 13.0 |
| I  | ケース | False | pixel_100 |
| J-AS | 店舗配分（36店舗） | False | pixel_50 |
| AT | 合計 | False | 7.09765625 |
| AU | 納品数 | False | 13.0 |
| AV | 帳合先 | False | 12.8984375 |
| **AW** | **センター送信日** | **False** | **12.0** |
| AX | センター送信 | False | 8.09765625 |

---

## Frontend

### モジュール構成

```
static/
├── script.js                   # メインロジック
├── style.css                   # スタイル
└── js/
    ├── firebase-config.js      # Firebase設定
    ├── auth-service.js         # 認証サービス
    ├── firestore-service.js    # Firestore操作
    ├── indexeddb-service.js    # IndexedDB操作
    ├── data-sync-service.js    # データ同期
    ├── app-workflow.js         # ワークフロー管理
    └── calendar-view.js        # カレンダー表示
```

### script.js

メインJavaScriptファイル。

```javascript
// グローバル変数
let downloadUrl = '';
let downloadFilename = '';

// イベントリスナー
document.addEventListener('DOMContentLoaded', () => {
    templateForm.addEventListener('submit', handleFormSubmit);
    previewBtn.addEventListener('click', handlePreview);
    downloadBtn.addEventListener('click', handleDownload);
});

// フォーム送信
async function handleFormSubmit(event) {
    1. バリデーション
    2. フォームデータ収集
    3. /api/generate POSTリクエスト
    4. レスポンス処理
    5. ダウンロードボタン表示
}

// プレビュー
async function handlePreview() {
    1. バリデーション
    2. フォームデータ収集
    3. /api/preview POSTリクエスト
    4. PDFモーダル表示
}

// ダウンロード
function handleDownload() {
    1. デバイス検出（モバイル/デスクトップ）
    2. モバイル: showDownloadModal()
    3. デスクトップ: 自動ダウンロード
}
```

### app-workflow.js

5ステップワークフローの管理。

```javascript
// グローバル状態
let productCounter = 0;
let products = [];
let currentUser = null;

// 商品追加
export function addProduct() {
    1. product-${productId} HTMLテンプレート生成
    2. productsContainerに追加
    3. イベントリスナー設定
    4. オートコンプリート初期化
}

// 商品削除
window.removeProduct = function(productId) {
    1. DOM要素削除
    2. products配列更新
}
```

### firebase-config.js

Firebase初期化設定。

```javascript
const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    // ...
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### auth-service.js

認証サービス。

```javascript
export async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
}

export async function logout() {
    await signOut(auth);
}

export function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}
```

### firestore-service.js

Firestoreデータ操作。

```javascript
export async function saveDistributionData(userId, data) {
    const docRef = collection(db, 'users', userId, 'distributions');
    return await addDoc(docRef, data);
}

export async function getDistributionsByDate(userId, date) {
    const q = query(
        collection(db, 'users', userId, 'distributions'),
        where('deliveryDate', '==', date)
    );
    return await getDocs(q);
}
```

### indexeddb-service.js

IndexedDB操作（オフライン対応）。

```javascript
export async function saveLocalData(storeName, data) {
    const db = await openDB('HaibunDB', 1);
    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.add(data);
}

export async function getLocalData(storeName, key) {
    const db = await openDB('HaibunDB', 1);
    return await db.get(storeName, key);
}
```

---

## Data Flow

### 1. テンプレート生成フロー

```
User Input (Form)
    ↓
JavaScript (script.js)
    ↓ POST /api/generate (JSON)
FastAPI (app.py)
    ↓
HaibunTemplateCreator
    ↓
openpyxl (Excel生成)
    ↓
temp_files/*.xlsx
    ↓ download_url
User (ダウンロード)
```

### 2. PDFプレビューフロー

```
User Input (Form)
    ↓
JavaScript (script.js)
    ↓ POST /api/preview (JSON)
FastAPI (app.py)
    ↓
HaibunTemplateCreator (Excel生成)
    ↓
prepare_excel_for_pdf_conversion()
    - 非表示列クリア
    - 日付文字列化
    ↓
excel_to_pdf()
    ↓ Excel → ODS
LibreOffice
    ↓ ODS → PDF
temp_files/*.pdf
    ↓ PDF data
JavaScript (PDFモーダル表示)
    ↓
User (プレビュー閲覧)
```

### 3. データ同期フロー

```
User Input
    ↓
IndexedDB (ローカル保存)
    ↓
Firebase Auth (認証確認)
    ↓
Firestore (クラウド同期)
    ↓
Calendar View (表示更新)
```

---

## Excel Template Structure

### シート構成

```
┌──────────────────────────────────────────────────────────────┐
│ 行1-6: タイトルエリア                                        │
│  - 商品連絡書                                                │
│  - 配分                                                      │
│  - 担当バイヤー                                              │
│  - 期間                                                      │
├──────────────────────────────────────────────────────────────┤
│ 行7-8: ヘッダーエリア                                        │
│  ┌─────┬─────┬─────┬─────┬───┬─────┬───┬───┬───┬──...──┐│
│  │店着日│産地 │規格 │店着 │税抜│ケース│01 │02 │...│AW   ││
│  │     │     │     │原価 │    │      │   │   │   │ｾﾝﾀｰ ││
│  │     │品名 │     │     │税込│入数  │朝倉│伊野│...│送信日││
│  └─────┴─────┴─────┴─────┴───┴─────┴───┴───┴───┴──...──┘│
├──────────────────────────────────────────────────────────────┤
│ 行9-11: 商品1ブロック（3行構成）                             │
│  - 9行目:  商品情報（産地、原価、税抜など）                  │
│  - 10行目: 詳細情報（品名、税込、入数、配分数）              │
│  - 11行目: 空白行（10行目と結合）                            │
├──────────────────────────────────────────────────────────────┤
│ 行12-14: 商品2ブロック                                       │
│  ...                                                         │
├──────────────────────────────────────────────────────────────┤
│ （以降、商品数に応じて繰り返し）                             │
└──────────────────────────────────────────────────────────────┘
```

### セル結合パターン

```python
# ヘッダーエリア（7-8行）
'B7:C8'   # 店着日
'D8:E8'   # 品名
'G7:G8'   # 店着原価
'AT7:AT8' # 合計
'AV7:AV8' # 帳合先
'AW7:AW8' # センター送信日

# データエリア（各商品ブロック、例: 9-11行）
'B9:C11'  # 店着日（3行結合）
'D10:E11' # 品名（2行結合）
'G9:G11'  # 店着原価（3行結合）
'H10:H11' # 税込（2行結合）
'I10:I11' # 入数（2行結合）
'J10:J11' # 店舗配分（各列、2行結合）
...
'AW9:AW11' # センター送信日（3行結合）
```

### 数式

```python
# 税込価格（H10セル、商品1の例）
=ROUND(H9*1.08,0)

# 合計（AT9セル、商品1の例）
=SUM(J9:AS9)

# 差異（AU9セル、商品1の例）
=AT9-AU9
```

---

## Authentication and Data

### 認証フロー

```
1. User → [ログインボタンクリック]
    ↓
2. auth-service.js → loginWithGoogle()
    ↓
3. Firebase Auth → Google認証ポップアップ
    ↓
4. User → Googleアカウント選択
    ↓
5. Firebase Auth → トークン発行
    ↓
6. auth-service.js → onAuthStateChanged() コールバック
    ↓
7. app-workflow.js → init(user) 呼び出し
    ↓
8. UI更新 → ユーザー名表示、機能有効化
```

### データ保存構造

#### Firestore

```
users/
  {userId}/
    distributions/
      {distributionId}/
        - deliveryDate: "2025-01-20"
        - supplier: "本社"
        - buyerName: "山田太郎"
        - products: [
            {
              name: "りんご",
              origin: "青森",
              standard: "10kg",
              ...
            }
          ]
        - createdAt: Timestamp
        - updatedAt: Timestamp
```

#### IndexedDB

```
HaibunDB/
  autocomplete/
    - product_names: ["りんご", "みかん", ...]
    - origins: ["青森", "愛媛", ...]
    - suppliers: ["本社", "A社", ...]

  distributions/
    - {id}: {deliveryDate, supplier, products, ...}

  user/
    - currentUser: {displayName, email, ...}
```

---

## 今後の拡張ポイント

### 1. バックエンド拡張
- [ ] Redis導入（セッション管理、キャッシュ）
- [ ] Celery導入（非同期タスク処理）
- [ ] S3互換ストレージ（ファイル永続化）

### 2. フロントエンド拡張
- [ ] React/Vue導入（状態管理の複雑化に対応）
- [ ] TypeScript導入（型安全性向上）
- [ ] Progressive Web App（オフライン強化）

### 3. 機能拡張
- [ ] CSVインポート/エクスポート
- [ ] テンプレートカスタマイズUI
- [ ] 店舗マスタ管理画面
- [ ] バッチ処理機能
- [ ] 権限管理（管理者/一般ユーザー）

---

**ドキュメント最終更新**: 2025-01-13
