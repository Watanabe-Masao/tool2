# React + TypeScript 技術スタック移行計画

## 📋 目次

- [概要](#概要)
- [移行の目的](#移行の目的)
- [新しい技術スタック](#新しい技術スタック)
- [移行戦略](#移行戦略)
- [詳細タスク](#詳細タスク)
- [技術的な考慮事項](#技術的な考慮事項)
- [データモデル定義](#データモデル定義)
- [コンポーネント設計](#コンポーネント設計)
- [リスクと対策](#リスクと対策)
- [タイムライン](#タイムライン)

---

## 概要

現在のバニラJavaScript（約2,856行）のフロントエンドを、モダンな技術スタックに移行します。

### 現在の技術構成
- **言語**: Vanilla JavaScript (ES6 modules)
- **UI**: カスタムCSS（600行）
- **フォーム**: ネイティブHTML + カスタムバリデーション
- **グリッド**: CSS Grid（36店舗配分）
- **ナビゲーション**: シンプルなタブ切り替え

### 移行後の技術構成
- **基盤**: React 18+ + TypeScript 5+
- **フォーム**: MUI (Material-UI) + React Hook Form
- **グリッド**: ag-Grid (Community Edition)
- **ナビゲーション**: Ionic React（モバイルUX対応）
- **ビルドツール**: Vite

---

## 移行の目的

### 開発効率の向上
✅ **型安全性**: TypeScriptによるコンパイル時エラー検出
✅ **コンポーネント再利用**: Reactの宣言的UI
✅ **開発体験**: Hot Module Replacement、強力なエコシステム

### 保守性の向上
✅ **構造化**: コンポーネントベースアーキテクチャ
✅ **テスト**: React Testing Library、Jest
✅ **拡張性**: プラグイン、サードパーティライブラリの豊富さ

### ユーザー体験の向上
✅ **パフォーマンス**: Virtual DOM、最適化されたレンダリング
✅ **モバイルUX**: Ionic Reactのネイティブライクなナビゲーション
✅ **UIの一貫性**: MUIのデザインシステム

---

## 新しい技術スタック

### コア技術

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| **言語** | TypeScript | 5.x | 型安全な開発 |
| **フレームワーク** | React | 18.x | UI構築 |
| **ビルドツール** | Vite | 5.x | 高速ビルド・開発サーバー |
| **UIライブラリ** | MUI (Material-UI) | 5.x | コンポーネント・デザインシステム |
| **フォーム管理** | React Hook Form | 7.x | フォーム状態管理・バリデーション |
| **グリッド** | ag-Grid Community | 31.x | 36店舗配分グリッド |
| **ナビゲーション** | Ionic React | 7.x | モバイル最適化ナビゲーション |
| **ルーティング** | React Router | 6.x | SPA ルーティング |

### 状態管理・データフェッチ

| 技術 | 用途 |
|------|------|
| **React Context API** | グローバル状態（ユーザー情報、設定） |
| **TanStack Query (React Query)** | サーバー状態管理（Firebase、API） |
| **Zustand（オプション）** | 軽量なグローバル状態管理 |

### Firebase / データベース

| 技術 | 用途 |
|------|------|
| **Firebase SDK** | 認証、Firestore |
| **Firebase Authentication** | Google OAuth |
| **Firestore** | クラウドデータベース |
| **IndexedDB (Dexie.js)** | ローカルストレージ・オフライン対応 |

### 開発ツール

| 技術 | 用途 |
|------|------|
| **ESLint** | コード品質チェック |
| **Prettier** | コードフォーマット |
| **Vitest** | ユニットテスト |
| **React Testing Library** | コンポーネントテスト |
| **MSW (Mock Service Worker)** | APIモック |

---

## 移行戦略

### 段階的移行（推奨）

フロントエンドを完全に作り直し、バックエンド（Python FastAPI）はそのまま維持します。

#### フェーズ1: 基盤構築（3-4日）
- ✅ Vite + React + TypeScript プロジェクトセットアップ
- ✅ 依存関係インストール（MUI、React Hook Form、ag-Grid、Ionic）
- ✅ TypeScript型定義（ProductData, StoreData, etc.）
- ✅ プロジェクトフォルダ構成
- ✅ ESLint・Prettier設定

#### フェーズ2: 認証・レイアウト（2-3日）
- ✅ Firebase設定の移行
- ✅ ログイン画面（MUI + Firebase Auth）
- ✅ メインレイアウト（Ionic Tabs）
- ✅ ヘッダー・ユーザー情報表示

#### フェーズ3: フォーム画面（5-7日）
- ✅ Step 1-2: 日付・帳合先選択
- ✅ Step 3: 商品情報フォーム（React Hook Form）
  - 動的な商品追加・削除（Field Arrays）
  - オートコンプリート（MUI Autocomplete + Firestore）
- ✅ Step 4: 総納品数入力
- ✅ Step 5: 36店舗配分（ag-Grid）
  - リアルタイムバリデーション
  - 合計・差分計算

#### フェーズ4: その他機能（3-4日）
- ✅ PDFプレビューモーダル（MUI Dialog）
- ✅ ダウンロード機能（iPhone Safari対応）
- ✅ カレンダービュー（MUI Date Picker or カレンダーライブラリ）
- ✅ ローディング・通知（MUI Snackbar, CircularProgress）

#### フェーズ5: データ同期・テスト（3-4日）
- ✅ Firestore・IndexedDB カスタムフック
- ✅ オフライン対応
- ✅ ユニットテスト
- ✅ モバイルテスト（iPhone Safari）
- ✅ バグ修正

**合計**: 15-25日

### ディレクトリ構成（新規）

```
tool2/
├── frontend/                      # 新しいReactアプリ
│   ├── src/
│   │   ├── App.tsx                # ルートコンポーネント
│   │   ├── main.tsx               # エントリーポイント
│   │   ├── theme.ts               # MUIテーマ設定
│   │   │
│   │   ├── pages/                 # ページコンポーネント
│   │   │   ├── LoginPage.tsx
│   │   │   ├── MainPage.tsx
│   │   │   ├── NewOrderPage.tsx
│   │   │   └── CalendarPage.tsx
│   │   │
│   │   ├── components/            # 再利用可能なコンポーネント
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Navigation.tsx
│   │   │   │   └── UserInfo.tsx
│   │   │   ├── forms/
│   │   │   │   ├── DeliveryDateForm.tsx
│   │   │   │   ├── SupplierForm.tsx
│   │   │   │   ├── ProductForm.tsx
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── TotalDeliveryForm.tsx
│   │   │   │   └── StoreAllocationGrid.tsx  # ag-Grid
│   │   │   ├── modals/
│   │   │   │   ├── PDFPreviewModal.tsx
│   │   │   │   └── DownloadModal.tsx
│   │   │   ├── common/
│   │   │   │   ├── Loading.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── Notification.tsx
│   │   │   │   └── AutocompleteField.tsx
│   │   │   └── calendar/
│   │   │       └── OrderCalendar.tsx
│   │   │
│   │   ├── hooks/                 # カスタムフック
│   │   │   ├── useAuth.ts
│   │   │   ├── useFirestore.ts
│   │   │   ├── useIndexedDB.ts
│   │   │   ├── useDataSync.ts
│   │   │   ├── useFormValidation.ts
│   │   │   ├── useAutocomplete.ts
│   │   │   └── useDeviceDetection.ts
│   │   │
│   │   ├── services/              # サービス層
│   │   │   ├── api/
│   │   │   │   ├── client.ts
│   │   │   │   └── endpoints.ts
│   │   │   ├── firebase/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── firestore.ts
│   │   │   │   └── config.ts
│   │   │   ├── storage/
│   │   │   │   ├── indexeddb.ts
│   │   │   │   └── sync.ts
│   │   │   └── download/
│   │   │       └── download.ts
│   │   │
│   │   ├── types/                 # TypeScript型定義
│   │   │   ├── index.ts
│   │   │   ├── product.ts
│   │   │   ├── store.ts
│   │   │   ├── order.ts
│   │   │   ├── api.ts
│   │   │   └── firebase.ts
│   │   │
│   │   ├── utils/                 # ユーティリティ
│   │   │   ├── validation.ts
│   │   │   ├── formatting.ts
│   │   │   ├── deviceDetection.ts
│   │   │   └── constants.ts
│   │   │
│   │   ├── context/               # React Context
│   │   │   ├── AuthContext.tsx
│   │   │   └── NotificationContext.tsx
│   │   │
│   │   └── __tests__/             # テスト
│   │       ├── components/
│   │       ├── hooks/
│   │       └── utils/
│   │
│   ├── public/                    # 静的ファイル
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
│
├── app.py                         # FastAPI（既存、変更なし）
├── config/                        # バックエンド設定（既存）
├── templates/                     # 削除予定（Reactに置き換え）
└── static/                        # 削除予定（Reactに置き換え）
```

---

## 詳細タスク

### フェーズ1: 基盤構築（3-4日）

#### 1.1 プロジェクトセットアップ
```bash
# Vite + React + TypeScriptプロジェクト作成
npm create vite@latest frontend -- --template react-ts
cd frontend
```

#### 1.2 依存関係インストール
```bash
# コアライブラリ
npm install react react-dom react-router-dom

# UI・フォーム
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material
npm install react-hook-form @hookform/resolvers zod

# ag-Grid
npm install ag-grid-react ag-grid-community

# Ionic React
npm install @ionic/react @ionic/react-router

# Firebase
npm install firebase

# データフェッチ・状態管理
npm install @tanstack/react-query
npm install dexie dexie-react-hooks  # IndexedDB

# ユーティリティ
npm install axios date-fns

# 開発用
npm install -D @types/node
npm install -D eslint prettier
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D msw
```

#### 1.3 TypeScript設定
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### 1.4 プロジェクト構造作成
```bash
mkdir -p src/{pages,components/{layout,forms,modals,common,calendar},hooks,services/{api,firebase,storage,download},types,utils,context,__tests__}
```

### フェーズ2: 認証・レイアウト（2-3日）

#### 2.1 Firebase設定移行

**現在** (`static/js/firebase-config.js`):
```javascript
// CDNからロード
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
```

**移行後** (`src/services/firebase/config.ts`):
```typescript
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
```

#### 2.2 認証フック

**現在** (`static/js/auth-service.js` - 134行):
```javascript
async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}
```

**移行後** (`src/hooks/useAuth.ts`):
```typescript
import { useState, useEffect } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/services/firebase/config';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const signOut = () => firebaseSignOut(auth);

  return { user, loading, signIn, signOut };
};
```

#### 2.3 ログイン画面

**現在** (`templates/login.html` - 349行):
- インラインCSS
- Firebase CDN
- カスタムボタン

**移行後** (`src/pages/LoginPage.tsx`):
```typescript
import { Button, Container, Typography, Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '@/hooks/useAuth';

export const LoginPage = () => {
  const { signIn } = useAuth();

  const handleLogin = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          配分表作成ツール
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={handleLogin}
          sx={{ mt: 4 }}
        >
          Googleでログイン
        </Button>
      </Box>
    </Container>
  );
};
```

#### 2.4 メインレイアウト（Ionic Tabs）

**現在** (`templates/index.html`):
```html
<div class="tab-buttons">
  <button onclick="switchTab('new')">新規作成</button>
  <button onclick="switchTab('calendar')">カレンダー</button>
</div>
```

**移行後** (`src/App.tsx`):
```typescript
import { IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { addCircle, calendar } from 'ionicons/icons';
import { Route } from 'react-router-dom';

export const App = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/new-order" component={NewOrderPage} />
            <Route path="/calendar" component={CalendarPage} />
          </IonRouterOutlet>

          <IonTabBar slot="bottom">
            <IonTabButton tab="new-order" href="/new-order">
              <IonIcon icon={addCircle} />
              <IonLabel>新規作成</IonLabel>
            </IonTabButton>
            <IonTabButton tab="calendar" href="/calendar">
              <IonIcon icon={calendar} />
              <IonLabel>カレンダー</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};
```

### フェーズ3: フォーム画面（5-7日）

#### 3.1 フォーム状態管理（React Hook Form）

**現在** (`static/js/app-workflow.js` - 538行):
- 手動でDOM操作
- カスタムバリデーション
- formDataオブジェクトで管理

**移行後** (`src/pages/NewOrderPage.tsx`):
```typescript
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const productSchema = z.object({
  name: z.string().min(1, '品名を入力してください'),
  origin: z.string().min(1, '産地を入力してください'),
  specification: z.string(),
  quantityPerPackage: z.number().min(1),
  storeCost: z.number().min(0),
  priceExcludingTax: z.number().min(0),
  storeAllocations: z.array(z.number()).length(36)
});

const orderSchema = z.object({
  deliveryDate: z.date(),
  supplier: z.string().min(1),
  totalDelivery: z.number().min(1),
  products: z.array(productSchema).min(1)
});

type OrderFormData = z.infer<typeof orderSchema>;

export const NewOrderPage = () => {
  const { control, handleSubmit, formState: { errors } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      products: [{ storeAllocations: new Array(36).fill(0) }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'products'
  });

  const onSubmit = async (data: OrderFormData) => {
    // API呼び出し
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* フォームフィールド */}
    </form>
  );
};
```

#### 3.2 オートコンプリート（MUI Autocomplete）

**現在** (`static/js/app-workflow.js`):
```javascript
// カスタムドロップダウン実装
function createDropdown(id, options) {
  // 200行以上のカスタムロジック
}
```

**移行後** (`src/components/common/AutocompleteField.tsx`):
```typescript
import { Autocomplete, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';

interface AutocompleteFieldProps {
  name: string;
  control: any;
  label: string;
  options: string[];
  onInputChange?: (value: string) => void;
}

export const AutocompleteField = ({ name, control, label, options, onInputChange }: AutocompleteFieldProps) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Autocomplete
          {...field}
          options={options}
          freeSolo
          onInputChange={(_, value) => {
            field.onChange(value);
            onInputChange?.(value);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              error={!!error}
              helperText={error?.message}
            />
          )}
        />
      )}
    />
  );
};
```

#### 3.3 36店舗配分グリッド（ag-Grid）

**現在** (`templates/index.html`):
```html
<!-- 36個の<input>を手動生成 -->
<div class="stores-grid">
  <input type="number" id="store_1" />
  <input type="number" id="store_2" />
  <!-- ...繰り返し -->
</div>
```

**移行後** (`src/components/forms/StoreAllocationGrid.tsx`):
```typescript
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

interface StoreAllocationGridProps {
  productIndex: number;
  allocations: number[];
  totalDelivery: number;
  onChange: (allocations: number[]) => void;
}

export const StoreAllocationGrid = ({ allocations, totalDelivery, onChange }: StoreAllocationGridProps) => {
  const stores = [
    '阪急1', '阪急2', '阪急3', '阪急4', '阪急5', '阪急6',
    '阪急百貨店本店', '阪急百貨店千里店', '阪急百貨店西宮店',
    // ...36店舗
  ];

  const rowData = stores.map((storeName, index) => ({
    id: index,
    store: storeName,
    quantity: allocations[index] || 0
  }));

  const columnDefs: ColDef[] = [
    { field: 'store', headerName: '店舗', editable: false, flex: 1 },
    {
      field: 'quantity',
      headerName: '数量',
      editable: true,
      type: 'numericColumn',
      valueParser: (params) => Number(params.newValue)
    }
  ];

  const handleCellValueChanged = (event: any) => {
    const newAllocations = [...allocations];
    newAllocations[event.data.id] = event.data.quantity;
    onChange(newAllocations);
  };

  const totalAllocated = allocations.reduce((sum, val) => sum + val, 0);
  const remaining = totalDelivery - totalAllocated;

  return (
    <div>
      <div className="ag-theme-material" style={{ height: 400, width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          onCellValueChanged={handleCellValueChanged}
          suppressMovableColumns
        />
      </div>
      <div>
        <p>合計配分: {totalAllocated}</p>
        <p>残り: {remaining}</p>
        {remaining !== 0 && <p style={{ color: 'red' }}>配分が一致していません</p>}
      </div>
    </div>
  );
};
```

### フェーズ4: その他機能（3-4日）

#### 4.1 PDFプレビューモーダル

**現在** (`templates/index.html`):
```html
<div id="pdfModal" class="modal">
  <iframe id="pdfPreview"></iframe>
</div>
```

**移行後** (`src/components/modals/PDFPreviewModal.tsx`):
```typescript
import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface PDFPreviewModalProps {
  open: boolean;
  pdfUrl: string;
  onClose: () => void;
}

export const PDFPreviewModal = ({ open, pdfUrl, onClose }: PDFPreviewModalProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        PDFプレビュー
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <iframe
          src={pdfUrl}
          style={{ width: '100%', height: '80vh', border: 'none' }}
          title="PDF Preview"
        />
      </DialogContent>
    </Dialog>
  );
};
```

#### 4.2 ローディング・通知

**現在** (`static/js/ui/loading.js`):
```javascript
function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}
```

**移行後** (`src/context/NotificationContext.tsx`):
```typescript
import { createContext, useContext, useState } from 'react';
import { Snackbar, Alert, CircularProgress, Backdrop } from '@mui/material';

interface NotificationContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showLoading: () => void;
  hideLoading: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [loading, setLoading] = useState(false);

  const showSuccess = (message: string) => setSnackbar({ open: true, message, severity: 'success' });
  const showError = (message: string) => setSnackbar({ open: true, message, severity: 'error' });
  const showLoading = () => setLoading(true);
  const hideLoading = () => setLoading(false);

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, showLoading, hideLoading }}>
      {children}

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      <Backdrop open={loading} sx={{ color: '#fff', zIndex: 9999 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
```

### フェーズ5: データ同期・テスト（3-4日）

#### 5.1 Firestore カスタムフック

**現在** (`static/js/firestore-service.js` - 147行):
```javascript
async function saveFormData(formData) {
  const docRef = await addDoc(collection(db, 'haibun_orders'), {
    ...formData,
    timestamp: serverTimestamp()
  });
  return docRef.id;
}
```

**移行後** (`src/hooks/useFirestore.ts`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { OrderData } from '@/types';

export const useFirestore = () => {
  const queryClient = useQueryClient();

  // 注文履歴取得
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const q = query(collection(db, 'haibun_orders'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderData));
    }
  });

  // 注文保存
  const saveOrderMutation = useMutation({
    mutationFn: async (orderData: OrderData) => {
      return addDoc(collection(db, 'haibun_orders'), {
        ...orderData,
        timestamp: Timestamp.now()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  return {
    orders,
    isLoading,
    saveOrder: saveOrderMutation.mutate
  };
};
```

#### 5.2 IndexedDB + オフライン対応

**現在** (`static/js/indexeddb-service.js` - 165行):
- カスタムPromiseベースのDB操作

**移行後** (`src/services/storage/indexeddb.ts` with Dexie.js):
```typescript
import Dexie, { Table } from 'dexie';
import { OrderData } from '@/types';

export class HaibunDatabase extends Dexie {
  orders!: Table<OrderData>;

  constructor() {
    super('HaibunDB');
    this.version(1).stores({
      orders: '++id, deliveryDate, supplier, timestamp'
    });
  }
}

export const db = new HaibunDatabase();
```

**フック** (`src/hooks/useIndexedDB.ts`):
```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/storage/indexeddb';
import { OrderData } from '@/types';

export const useIndexedDB = () => {
  const orders = useLiveQuery(() => db.orders.toArray());

  const saveOrder = async (order: OrderData) => {
    await db.orders.add(order);
  };

  const deleteOrder = async (id: number) => {
    await db.orders.delete(id);
  };

  return { orders, saveOrder, deleteOrder };
};
```

---

## データモデル定義

### TypeScript型定義 (`src/types/index.ts`)

```typescript
// 商品データ
export interface ProductData {
  name: string;                    // 品名
  origin: string;                  // 産地
  specification: string;           // 規格
  quantityPerPackage: number;      // 1パックの数量
  storeCost: number;               // 店原
  priceExcludingTax: number;       // 本体価格（税抜）
  storeAllocations: number[];      // 36店舗への配分 (length = 36)
}

// 注文データ
export interface OrderData {
  id?: string;                     // Firestore ID
  deliveryDate: Date;              // 店着日
  supplier: string;                // 帳合先
  totalDelivery: number;           // 総納品数
  products: ProductData[];         // 商品リスト
  buyerName: string;               // バイヤー名
  timestamp: Date;                 // 作成日時
  userId: string;                  // ユーザーID
}

// 店舗データ
export interface StoreData {
  id: number;
  name: string;
  allocation: number;
}

// API リクエスト
export interface TemplateRequest {
  delivery_date: string;
  supplier: string;
  buyer_name: string;
  products: Array<{
    name: string;
    origin: string;
    specification: string;
    quantity_per_package: number;
    store_cost: number;
    price_excluding_tax: number;
    store_allocations: number[];
  }>;
  total_delivery: number;
  custom_filename?: string;
}

// API レスポンス
export interface TemplateResponse {
  filename: string;
  pdf_filename: string;
  message: string;
}
```

---

## コンポーネント設計

### コンポーネント階層

```
App
├── AuthProvider (Context)
├── NotificationProvider (Context)
├── QueryClientProvider (TanStack Query)
└── IonReactRouter
    ├── LoginPage
    └── MainLayout (認証後)
        └── IonTabs
            ├── NewOrderPage
            │   ├── DeliveryDateForm
            │   ├── SupplierForm (Autocomplete)
            │   ├── ProductFormSection
            │   │   └── ProductCard (複数、Field Array)
            │   │       ├── AutocompleteField (品名)
            │   │       ├── AutocompleteField (産地)
            │   │       ├── TextField (規格)
            │   │       ├── NumberField (数量、店原、価格)
            │   │       └── StoreAllocationGrid (ag-Grid)
            │   ├── TotalDeliveryForm
            │   ├── SubmitButton
            │   ├── PDFPreviewModal
            │   └── DownloadModal
            └── CalendarPage
                └── OrderCalendar
```

### 主要コンポーネント一覧

| コンポーネント | 責務 | 主要Props |
|--------------|------|----------|
| `LoginPage` | Google認証 | - |
| `NewOrderPage` | 注文フォーム全体 | - |
| `ProductCard` | 商品情報1件 | `index`, `control`, `remove` |
| `StoreAllocationGrid` | 36店舗配分 | `allocations`, `totalDelivery`, `onChange` |
| `AutocompleteField` | オートコンプリート入力 | `name`, `control`, `options` |
| `PDFPreviewModal` | PDFプレビュー | `open`, `pdfUrl`, `onClose` |
| `OrderCalendar` | カレンダービュー | `orders`, `onSelectDate` |

---

## 技術的な考慮事項

### 1. ag-Gridのパフォーマンス

**課題**: 36店舗 × 複数商品 = 大量のセル
**対策**:
- `suppressColumnVirtualisation={false}` で仮想スクロール有効化
- `rowBuffer={10}` でバッファ調整
- `debounceVerticalScrollbar={true}`

### 2. オートコンプリートのFirestoreクエリ最適化

**課題**: 毎回キーストロークでクエリ実行はコスト高
**対策**:
- TanStack Queryで5分間キャッシュ
- `useMemo`で重複クエリ防止
- debounce（300ms）

```typescript
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { debounce } from '@mui/material/utils';

export const useAutocomplete = (field: 'productName' | 'origin') => {
  const { data } = useQuery({
    queryKey: ['autocomplete', field],
    queryFn: () => fetchHistoricalData(field),
    staleTime: 5 * 60 * 1000 // 5分
  });

  const debouncedFilter = useMemo(
    () => debounce((inputValue: string, callback: (options: string[]) => void) => {
      const filtered = data?.filter(opt => opt.includes(inputValue)) || [];
      callback(filtered);
    }, 300),
    [data]
  );

  return { options: data || [], debouncedFilter };
};
```

### 3. iPhone Safariダウンロード対応

**現在の実装を維持**:
```typescript
// src/services/download/download.ts
export const downloadFile = (url: string, filename: string) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isIOS && isSafari) {
    // モーダルでリンク表示
    showDownloadModal(url, filename);
  } else {
    // 通常のダウンロード
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }
};
```

### 4. オフライン同期

**戦略**:
1. オンライン時: Firestoreに保存
2. オフライン時: IndexedDBに保存
3. 再接続時: IndexedDBからFirestoreに同期

```typescript
// src/hooks/useDataSync.ts
export const useDataSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveOrder = async (order: OrderData) => {
    if (isOnline) {
      await saveToFirestore(order);
    } else {
      await saveToIndexedDB(order);
    }
  };

  // 再接続時に同期
  useEffect(() => {
    if (isOnline) {
      syncIndexedDBToFirestore();
    }
  }, [isOnline]);

  return { saveOrder, isOnline };
};
```

### 5. MUIテーマ設定

**日本語フォント・カスタムカラー**:
```typescript
// src/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Noto Sans JP"',
    ].join(','),
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
    },
  },
});
```

### 6. バックエンドAPI変更

**最小限の変更**:
- レスポンスヘッダーにCORSを追加（既存で対応済みの可能性あり）
- 既存のAPIエンドポイントはそのまま使用可能

**TypeScript型定義をバックエンドと同期**:
```typescript
// Python Pydantic → TypeScript
// config/models/requests.py

class ProductDataRequest(BaseModel):
    name: str
    origin: str
    # ...
```

↓

```typescript
// frontend/src/types/api.ts
export interface ProductDataRequest {
  name: string;
  origin: string;
  // ...
}
```

---

## リスクと対策

### リスク1: ag-Gridパフォーマンス低下

**リスク**: 複数商品 × 36店舗でレンダリングが重い
**対策**:
- 仮想スクロール有効化
- React.memoでコンポーネント最適化
- 必要に応じてページネーション

**代替案**: MUI Data Gridに切り替え（無料版で十分な場合）

### リスク2: モバイルでag-Gridの操作性

**リスク**: タッチ操作が難しい
**対策**:
- セルサイズを大きく
- タッチデバイス用のイベント処理追加
- モバイル時は簡易入力モード提供

### リスク3: Firebase SDKのサイズ

**リスク**: バンドルサイズ増加（CDN→npmで300KB+）
**対策**:
- Tree-shaking（必要な機能のみimport）
- Code splitting（ページごとに分割）
- Viteの自動最適化

```typescript
// NG: 全部import
import firebase from 'firebase/app';

// OK: 必要な機能のみ
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
```

### リスク4: Ionic Reactとの競合

**リスク**: MUIとIonicのスタイルが競合
**対策**:
- Ionicはナビゲーションのみに限定
- MUIを優先してグローバルスタイルを設定
- CSS-in-JS（Emotion）でスコープ化

### リスク5: 開発期間の遅延

**リスク**: 見積もり15-25日だが、実際は30日以上かかる可能性
**対策**:
- MVP（Minimum Viable Product）を先にリリース
  - 新規作成機能のみ実装
  - カレンダービューは後回し
- 段階的リリース
  - Phase 1-3を先行デプロイ
  - Phase 4-5を次のイテレーション

---

## タイムライン

### 理想的なスケジュール（25日間）

| フェーズ | タスク | 日数 | 累計 |
|---------|-------|------|------|
| **Phase 1** | プロジェクトセットアップ | 1日 | 1日 |
| | 依存関係インストール・設定 | 1日 | 2日 |
| | TypeScript型定義 | 1日 | 3日 |
| | フォルダ構成作成 | 0.5日 | 3.5日 |
| **Phase 2** | Firebase設定移行 | 1日 | 4.5日 |
| | 認証システム（Login） | 1日 | 5.5日 |
| | メインレイアウト（Ionic） | 1日 | 6.5日 |
| **Phase 3** | Step 1-2フォーム | 1日 | 7.5日 |
| | Step 3: 商品フォーム（基本） | 2日 | 9.5日 |
| | オートコンプリート実装 | 1.5日 | 11日 |
| | Step 4: 総納品数 | 0.5日 | 11.5日 |
| | Step 5: ag-Grid実装 | 2日 | 13.5日 |
| | バリデーション・計算ロジック | 1日 | 14.5日 |
| **Phase 4** | PDFプレビューモーダル | 1日 | 15.5日 |
| | ダウンロード機能 | 1日 | 16.5日 |
| | カレンダービュー | 2日 | 18.5日 |
| | ローディング・通知 | 0.5日 | 19日 |
| **Phase 5** | Firestoreフック | 1日 | 20日 |
| | IndexedDBフック | 1日 | 21日 |
| | オフライン同期 | 1日 | 22日 |
| | ユニットテスト | 1.5日 | 23.5日 |
| | モバイルテスト・バグ修正 | 1.5日 | 25日 |

### 最小MVP（10日間）

カレンダービューとオフライン同期を除外:

| フェーズ | タスク | 日数 |
|---------|-------|------|
| Phase 1 | セットアップ・型定義 | 3日 |
| Phase 2 | 認証・レイアウト | 2日 |
| Phase 3 | フォーム（新規作成のみ） | 4日 |
| Phase 4 | PDF・ダウンロード | 1日 |
| **合計** | | **10日** |

---

## 次のステップ

1. ✅ **この移行計画書をレビュー**
2. ⬜ **Vite + React + TypeScript プロジェクトセットアップ**
3. ⬜ **package.jsonと依存関係インストール**
4. ⬜ **TypeScript型定義作成**
5. ⬜ **Firebase設定移行**

---

**作成日**: 2025-01-13
**バージョン**: v1.0
**作成者**: Claude (Anthropic AI)
