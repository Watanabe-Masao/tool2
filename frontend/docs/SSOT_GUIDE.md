# Single Source of Truth (SSOT) 完全ガイド

アプリケーション全体で一貫性を保つための設計原則とベストプラクティス

## 📚 目次

1. [SSOT とは](#ssot-とは)
2. [5つの重要領域](#5つの重要領域)
3. [実装ガイド](#実装ガイド)
4. [CI/CD 統合](#cicd-統合)
5. [移行手順](#移行手順)
6. [FAQ](#faq)

---

## SSOT とは

**Single Source of Truth (単一情報源)** は、データや定義を一箇所に集約し、重複を排除することで、一貫性と保守性を高める設計原則です。

### なぜ SSOT が重要か

❌ **SSOT なし**:
```typescript
// ComponentA.tsx
const ERROR_MESSAGE = 'データの保存に失敗しました';

// ComponentB.tsx
const SAVE_ERROR = 'データの保存に失敗しました';

// HookC.ts
showNotification({ message: 'データの保存に失敗しました' });
```

**問題点**:
- 同じメッセージが3箇所に散在
- 修正時に3箇所すべて変更が必要
- 変更漏れでメッセージが不一致になるリスク

✅ **SSOT あり**:
```typescript
// messages/notification.ts
export const ERROR_MESSAGES = {
  dataSaveFailed: 'データの保存に失敗しました',
} as const;

// どこからでも同じメッセージを参照
import { ERROR_MESSAGES } from '@/messages';
showNotification({ message: ERROR_MESSAGES.dataSaveFailed });
```

**利点**:
- ✅ メッセージが一箇所に集約
- ✅ 修正は1箇所だけ
- ✅ 型安全 + IDE補完
- ✅ 検索・置換が容易

---

## 5つの重要領域

このプロジェクトでは、以下の5つの領域で SSOT を確立しています:

### 1. 型定義 (Types)

**場所**: `src/types/`

```
types/
├── product.ts      # 商品ドメイン
├── order.ts        # 注文ドメイン
├── store.ts        # 店舗ドメイン
├── api.ts          # API 通信
├── firebase.ts     # Firebase
├── repository.ts   # Repository 層
├── ui.ts           # UI ユーティリティ
├── index.ts        # 統合エクスポート
└── README.md       # 詳細ガイド
```

**使用方法**:
```typescript
// ✅ 良い
import type { ProductData, OrderData } from '@/types';

// ❌ 悪い - コンポーネント内で型定義
interface ProductData {
  name: string;
  // ...
}
```

**詳細**: [types/README.md](../src/types/README.md)

---

### 2. メッセージ・テキスト (Messages)

**場所**: `src/messages/`

```
messages/
├── validation.ts      # バリデーションメッセージ
├── notification.ts    # 通知メッセージ
├── ui.ts              # UI テキスト
├── index.ts           # 統合エクスポート
└── README.md          # 詳細ガイド
```

**使用方法**:
```typescript
// ✅ 良い
import { SUCCESS_MESSAGES, BUTTON_LABELS } from '@/messages';
showNotification({ message: SUCCESS_MESSAGES.orderSaved });
<Button>{BUTTON_LABELS.save}</Button>

// ❌ 悪い - ハードコード
showNotification({ message: '注文を保存しました' });
<Button>保存</Button>
```

**詳細**: [messages/README.md](../src/messages/README.md)

---

### 3. デザイントークン (Design Tokens)

**場所**: `src/theme.ts`

**使用方法**:
```typescript
// ✅ 良い - theme を使用
import { useTheme } from '@mui/material/styles';
const theme = useTheme();
<Box sx={{ color: theme.palette.primary.main }}>

// ❌ 悪い - ハードコード
<Box sx={{ color: '#1976d2' }}>
<Typography sx={{ fontSize: '16px' }}>
```

**テーマ設定**:
- カラーパレット (primary, secondary, error, warning, info, success)
- タイポグラフィ (h1-h6, body1-2, button, caption)
- スペーシング (8px 単位)
- シェイプ (borderRadius: 8px)
- コンポーネントのデフォルト設定

---

### 4. 状態管理 (State Schema)

**場所**:
- `src/stores/` - Zustand stores
- `src/context/` - React Context

**使用方法**:
```typescript
// ✅ 良い - stores/ に状態定義
// stores/orderFormStore.ts
interface OrderFormState {
  activeStep: number;
  setActiveStep: (step: number) => void;
}

// ❌ 悪い - コンポーネント内で状態定義
// components/SomeComponent.tsx
interface ComponentState {
  activeStep: number;
}
```

**Zustand Store の例**:
```typescript
// stores/orderFormStore.ts
export const useOrderFormStore = create<OrderFormState>()(
  devtools(
    persist(
      (set) => ({
        activeStep: 0,
        setActiveStep: (step) => set({ activeStep: step }),
      }),
      { name: 'order-form-storage' }
    ),
    { name: 'OrderFormStore' }
  )
);
```

---

### 5. 設定 (Configuration)

**場所**:
- `src/services/firebase/config.ts` - Firebase 設定
- `src/utils/constants.ts` - アプリケーション定数

**使用方法**:
```typescript
// ✅ 良い - constants を使用
import { API_ENDPOINTS, MAX_LENGTH } from '@/utils/constants';
const url = `${API_ENDPOINTS.GENERATE_TEMPLATE}`;
const schema = z.string().max(MAX_LENGTH.PRODUCT_NAME);

// ❌ 悪い - 直接参照
const url = import.meta.env.VITE_API_BASE_URL + '/generate';
const schema = z.string().max(100);
```

**定数の種類**:
- API エンドポイント
- Firestore コレクション名
- バリデーション制限値
- UI 定数 (タイムアウト、デバウンス時間など)
- 日付フォーマット
- ファイルタイプ

---

## 実装ガイド

### 新しいコンポーネントを作成する場合

```typescript
import type { ProductData } from '@/types';           // 1. 型
import { BUTTON_LABELS, FIELD_LABELS } from '@/messages'; // 2. メッセージ
import { useTheme } from '@mui/material/styles';      // 3. テーマ
import { useOrderFormStore } from '@/stores';         // 4. 状態
import { API_ENDPOINTS } from '@/utils/constants';    // 5. 設定

function MyComponent() {
  const theme = useTheme();
  const { activeStep } = useOrderFormStore();

  return (
    <Box sx={{ color: theme.palette.primary.main }}>
      <Typography>{FIELD_LABELS.productName}</Typography>
      <Button>{BUTTON_LABELS.save}</Button>
    </Box>
  );
}
```

### 新しいバリデーションを追加する場合

```typescript
// ❌ 悪い - schema 内にメッセージハードコード
const schema = z.object({
  name: z.string().min(1, '品名を入力してください'),
});

// ✅ 良い - messages から取得
import { REQUIRED_MESSAGES, createMaxLengthMessage } from '@/messages/validation';
import { MAX_LENGTH } from '@/utils/constants';

const schema = z.object({
  name: z.string()
    .min(1, REQUIRED_MESSAGES.productName)
    .max(MAX_LENGTH.PRODUCT_NAME, createMaxLengthMessage('品名', MAX_LENGTH.PRODUCT_NAME)),
});
```

### 新しい API エンドポイントを追加する場合

```typescript
// 1. constants.ts に追加
export const API_ENDPOINTS = {
  GENERATE_TEMPLATE: '/generate',
  NEW_ENDPOINT: '/new-endpoint', // ← 追加
} as const;

// 2. 使用
import { API_ENDPOINTS } from '@/utils/constants';
const response = await fetch(API_ENDPOINTS.NEW_ENDPOINT);
```

---

## CI/CD 統合

### 自動チェック

プッシュ時に以下のチェックが自動実行されます:

```yaml
# .github/workflows/deploy.yml
- name: Check type definitions (warning only)
  run: npm run check-types
  continue-on-error: true

- name: Check SSOT compliance (warning only)
  run: npm run check-ssot
  continue-on-error: true
```

### ローカルでチェック

```bash
# 型定義のチェック
npm run check-types

# SSOT 全体のチェック
npm run check-ssot
```

### チェック内容

`npm run check-ssot` は以下を検出します:

1. **型定義**: types/ 外のインターフェース・型定義
2. **メッセージ**: ハードコードされた日本語メッセージ
3. **デザイントークン**: インラインスタイル、ハードコードされた色・サイズ
4. **State Schema**: stores/context/ 外の State 定義
5. **設定**: 環境変数の直接参照

**出力例**:
```
📊 チェック結果サマリー
型定義:         ⚠️  50 件
メッセージ:     ⚠️  922 件
デザイントークン: ⚠️  856 件
State Schema:   ⚠️  5 件
設定:           ⚠️  3 件
合計:           ⚠️  1836 件
```

---

## 移行手順

### 既存コードを SSOT に移行する

#### ステップ 1: 違反を確認
```bash
npm run check-ssot
```

#### ステップ 2: メッセージを移行

**Before**:
```typescript
// components/MyComponent.tsx
showNotification({ message: 'データを保存しました' });
```

**After**:
```typescript
// 1. messages/notification.ts に追加 (すでに存在する場合はスキップ)
export const SUCCESS_MESSAGES = {
  dataSaved: 'データを保存しました',
} as const;

// 2. コンポーネントを修正
import { SUCCESS_MESSAGES } from '@/messages';
showNotification({ message: SUCCESS_MESSAGES.dataSaved });
```

#### ステップ 3: 型定義を移行

**Before**:
```typescript
// components/MyComponent.tsx
interface MyData {
  id: string;
  name: string;
}
```

**After**:
```typescript
// 1. types/product.ts に追加
export interface MyData {
  id: string;
  name: string;
}

// 2. コンポーネントを修正
import type { MyData } from '@/types/product';
```

#### ステップ 4: 定数を移行

**Before**:
```typescript
const MAX_NAME_LENGTH = 100;
const API_URL = '/api/products';
```

**After**:
```typescript
// 1. constants.ts に追加
export const MAX_LENGTH = {
  PRODUCT_NAME: 100,
} as const;

export const API_ENDPOINTS = {
  PRODUCTS: '/api/products',
} as const;

// 2. 使用
import { MAX_LENGTH, API_ENDPOINTS } from '@/utils/constants';
```

---

## FAQ

### Q1: すべての違反を即座に修正する必要がありますか？

**A**: いいえ。CI/CD チェックは `continue-on-error: true` なので、警告のみでビルドは失敗しません。段階的に移行できます。

### Q2: コンポーネント固有の型定義も types/ に移動すべき？

**A**: いいえ。以下は例外として認められます:
- `ComponentProps` - コンポーネントの Props
- `ComponentState` - ローカル状態
- `ComponentContext` - コンポーネント専用 Context

### Q3: MUI の sx prop は違反として検出されますか？

**A**: はい、検出されます。ただし MUI の sx prop は theme を参照している場合が多く、許容範囲です。**ハードコードされた色やサイズ**がある場合は修正してください。

```typescript
// ⚠️  検出されるが許容範囲
<Box sx={{ color: theme.palette.primary.main }}>

// ❌ 修正すべき
<Box sx={{ color: '#1976d2', fontSize: '16px' }}>
```

### Q4: 新しいメッセージを追加する際の命名規則は？

**A**: 以下の規則に従ってください:

- **成功**: `<action>ed` (例: `orderSaved`, `fileDow nloaded`)
- **エラー**: `<target><Action>Failed` (例: `dataSaveFailed`, `loginFailed`)
- **確認**: `confirm<Action>` (例: `confirmDelete`, `confirmLogout`)
- **ボタン**: 動詞の原形 (例: `save`, `cancel`, `delete`)

### Q5: i18n (多言語化) 対応の予定は？

**A**: 現在の messages/ 構造は、将来的な i18n 対応を考慮した設計です:

```typescript
// 将来的には
messages/
├── ja/           # 日本語
│   ├── validation.ts
│   └── notification.ts
├── en/           # 英語
│   ├── validation.ts
│   └── notification.ts
└── index.ts      # ロケール切り替えロジック
```

### Q6: check-ssot の実行時間が長いです。高速化できますか？

**A**: 以下の方法で高速化できます:

1. **特定の領域のみチェック**:
   ```bash
   # 型定義のみ
   npm run check-types
   ```

2. **スクリプトのカスタマイズ**:
   `scripts/check-ssot.mjs` を編集して、不要なチェックをコメントアウト

### Q7: テストファイルも SSOT に従う必要がありますか？

**A**: テストファイルは `__tests__/` ディレクトリにあり、自動的にチェック対象外です。テスト専用の型定義やメッセージをテストファイル内に記述しても問題ありません。

---

## まとめ

SSOT の 5つの柱:

| 領域 | 場所 | 詳細ドキュメント |
|------|------|------------------|
| 型定義 | `types/` | [types/README.md](../src/types/README.md) |
| メッセージ | `messages/` | [messages/README.md](../src/messages/README.md) |
| デザイントークン | `theme.ts` | - |
| 状態管理 | `stores/`, `context/` | - |
| 設定 | `config.ts`, `constants.ts` | - |

**チェックコマンド**:
```bash
npm run check-ssot  # 全体チェック
npm run check-types # 型定義のみ
```

**設計原則**:
1. ✅ **DRY (Don't Repeat Yourself)**: 重複を排除
2. ✅ **集約**: 関連する定義を一箇所に
3. ✅ **型安全**: TypeScript の型システムを活用
4. ✅ **段階的移行**: 既存コードは段階的に改善
5. ✅ **自動検証**: CI/CD で自動チェック

---

**関連リンク**:
- [型定義ガイド](../src/types/README.md)
- [メッセージ管理ガイド](../src/messages/README.md)
- [CI/CD 設定](../../.github/workflows/deploy.yml)

**フィードバック・質問**:
- GitHub Issues で報告してください
- 改善提案も大歓迎です！
