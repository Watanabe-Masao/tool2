# アーキテクチャ原則レビュー

**レビュー日**: 2025-11-25
**対象プロジェクト**: Tool2 (配分表作成ツール)
**技術スタック**: React 19 + TypeScript + FastAPI + Firebase

---

## 総合評価サマリー

| 原則 | 評価 | 主な強み | 主な課題 |
|------|------|----------|----------|
| 1. SSOT | ⭐⭐⭐⭐ | env.ts, messages/, constants.ts の集約 | STORE_DATAのハードコード |
| 2-3. 関心分離・責務明確化 | ⭐⭐⭐⭐ | Repository/Service/Hook の分離 | OrderFormContext の肥大化 |
| 4-5. 疎結合・高凝集 | ⭐⭐⭐⭐ | DI パターン、インターフェース分離 | 循環依存の検出未導入 |
| 6. 抽象化・隠蔽 | ⭐⭐⭐⭐⭐ | Facade, Repository, 抽象基底クラス | - |
| 7. 変更容易性 | ⭐⭐⭐⭐ | Zod スキーマ、テスト整備 | E2E テストの充実度 |
| 8. スケーラビリティ | ⭐⭐⭐ | オフライン対応、IndexedDB | CQRS 未適用、キャッシュ戦略 |
| 9. 信頼性・可用性 | ⭐⭐⭐⭐ | ErrorBoundary、オフライン同期 | ヘルスチェック多層化 |
| 10. セキュリティ | ⭐⭐⭐⭐⭐ | Firestore Rules、認証バリデーション | - |
| 11. シンプルさ | ⭐⭐⭐ | 単一目的フック | 一部ファイルの巨大化 |
| 12. 標準化・再利用 | ⭐⭐⭐⭐ | ESLint、Prettier、型定義 | 共有コンポーネントライブラリ化 |
| 13. トレードオフ設計 | ⭐⭐⭐ | コメントでの設計意図記録 | ADR 未導入 |

---

## 1. 単一情報源の原則（SSOT）

### 評価: ⭐⭐⭐⭐ (良好)

### 強み

#### 環境変数の一元管理
```
frontend/src/config/env.ts
```
- 全環境変数を単一ファイルで管理
- 静的エクスポートと動的評価関数の両方を提供
- テスト時の動的変更に対応

#### 定数の集約
```
frontend/src/utils/constants.ts
```
- API_ENDPOINTS, FIRESTORE_COLLECTIONS, INDEXEDDB_STORES を定義
- MAX_LENGTH, NUMBER_RANGE などのバリデーション定数も集約
- `as const` による型安全性確保

#### メッセージの単一情報源
```
frontend/src/messages/
├── notification.ts  # SUCCESS/ERROR/WARNING/INFO_MESSAGES
├── validation.ts    # REQUIRED_MESSAGES, FIELD_VALIDATION_MESSAGES
└── ui.ts            # UIラベル
```

### 改善点

1. **STORE_DATA のハードコード問題**
   - `constants.ts:71-108` で36店舗データが静的に定義
   - 店舗の追加・変更時にコード変更が必要

2. **API_BASE_URL の二重定義**
   - `env.ts` から `constants.ts` に再エクスポートされているが、使用箇所が分散

### 推奨アクション

```typescript
// 改善案: 店舗データの外部化
// 1. Firestore から取得するか、環境変数で設定可能に
// 2. または設定ファイル (stores.json) として管理

// frontend/src/config/stores.ts
export const loadStoreData = async (): Promise<StoreData[]> => {
  // 環境に応じて Firestore または静的データから取得
  if (env.isProduction()) {
    return await fetchStoreDataFromFirestore();
  }
  return STATIC_STORE_DATA;
};
```

---

## 2-3. 関心の分離 & 責務の明確化

### 評価: ⭐⭐⭐⭐ (良好)

### 強み

#### 明確なレイヤー分離
```
UI層        → components/, pages/
ロジック層   → hooks/, context/, stores/
サービス層   → services/
データ層     → services/firestore/repositories/
```

#### Repository パターンの適用
```typescript
// services/firestore/repositories/
├── OrderRepository.ts
├── ProductHistoryRepository.ts
├── PricingHistoryRepository.ts
├── AutocompleteRepository.ts
├── PresetRepository.ts
└── EmailAddressRepository.ts
```

#### DI パターンによるテスタビリティ
```typescript
// context/ServiceContext.tsx
<ServiceProvider services={{ firestoreService: mockService }}>
  <ComponentUnderTest />
</ServiceProvider>
```

### 改善点

1. **OrderFormContext の肥大化** (`context/OrderFormContext.tsx:512行`)
   - 12以上のフックを統合
   - 責務が多すぎる（認証、フォーム、ナビゲーション、モーダル、送信、下書き、帳合先、オートコンプリート）

2. **StoreCategoryManagementPage の巨大化** (`1469行`)
   - UI とロジックの分離が不十分

### 推奨アクション

```typescript
// OrderFormContext の分割案
// 1. AuthFormContext - 認証・ユーザー設定
// 2. FormNavigationContext - ステップ・商品ナビゲーション
// 3. FormSubmissionContext - 送信・生成ロジック
// 4. FormDraftContext - 下書き管理

// または Compound Component パターンの適用
<OrderForm>
  <OrderForm.Navigation />
  <OrderForm.Products />
  <OrderForm.Submission />
</OrderForm>
```

---

## 4-5. 疎結合・高凝集 & 依存削減

### 評価: ⭐⭐⭐⭐ (良好)

### 強み

#### インターフェース分離
```typescript
// types/services.ts
interface IFirestoreService { ... }
interface ITemplateService { ... }
interface ISessionStorageService { ... }
```

#### Facade パターンによる API 統一
```typescript
// FirestoreServiceFacade.ts
class FirestoreServiceFacade {
  private orderRepo: OrderRepository;
  private productHistoryRepo: ProductHistoryRepository;
  // ... 内部の Repository を隠蔽
}
```

#### 凝集度の高いフック設計
```
hooks/
├── useOrderSubmit.ts        # 注文送信に関連する処理を集約
├── useSupplierManagement.ts # 帳合先管理を集約
├── useAutocompleteFields.ts # オートコンプリートを集約
```

### 改善点

1. **循環依存の検出が未導入**
   - CI に循環依存チェックが組み込まれていない

2. **共有ユーティリティの整理**
   - `utils/` 配下の役割が混在

### 推奨アクション

```json
// package.json に追加
{
  "scripts": {
    "check:circular": "madge --circular --extensions ts,tsx src/"
  },
  "devDependencies": {
    "madge": "^6.0.0"
  }
}
```

```yaml
# CI に追加
- name: Check circular dependencies
  run: npm run check:circular
```

---

## 6. 抽象化・隠蔽

### 評価: ⭐⭐⭐⭐⭐ (優秀)

### 強み

#### 抽象基底クラスの活用
```typescript
// FirestoreBaseService.ts
abstract class FirestoreBaseService<T, F = any> {
  abstract toFirestoreFormat(entity: T): F;
  abstract fromFirestoreFormat(data: F, id: string): T;

  async save(entity: T): Promise<string> { ... }
  async findById(id: string): Promise<T | null> { ... }
  async update(id: string, entity: T): Promise<void> { ... }
  async delete(id: string): Promise<void> { ... }
}
```

#### 型安全な Branded Types
```typescript
// utils/brandedTypes.ts
type UserId = string & { __brand: 'UserId' };
type OrderId = string & { __brand: 'OrderId' };
```

#### HOC パターンの提供
```typescript
// ErrorBoundary.tsx
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P>;
```

### 現状で十分な実装

- 具体クラスの直接参照が避けられている
- インターフェース経由での依存注入が実現
- テスト時の実装差し替えが容易

---

## 7. 変更容易性

### 評価: ⭐⭐⭐⭐ (良好)

### 強み

#### Zod によるスキーマバリデーション
```typescript
// schemas/orderSchema.ts
export const productSchema = z.object({
  supplier: z.string().min(1).max(MAX_LENGTH.SUPPLIER),
  name: z.string().min(1).max(MAX_LENGTH.PRODUCT_NAME),
  // ... 定数から制約値を参照
});
```

#### テストピラミッドの整備
```
__tests__/
├── hooks/       # 16 unit tests
├── stores/      # 1 store test
├── utils/       # 5 utility tests
├── integration/ # 1 integration test
└── components/  # 2 component tests

e2e/
├── draft-management.spec.ts
├── order-creation-flow.spec.ts
└── template-generation.spec.ts
```

### 改善点

1. **ADR (Architecture Decision Records) の未導入**
   - 設計判断の記録が散在

2. **E2E テストのカバレッジ不足**
   - 3ファイルのみ

### 推奨アクション

```markdown
<!-- docs/adr/001-repository-pattern.md -->
# ADR 001: Repository パターンの採用

## ステータス
Accepted

## コンテキスト
Firestore への直接アクセスがコンポーネントに散在していた

## 決定
Repository パターンを導入し、データアクセスを抽象化

## 結果
- テスタビリティの向上
- Firestore 依存の局所化
- 将来の DB 変更への対応容易性
```

---

## 8. スケーラビリティ

### 評価: ⭐⭐⭐ (改善の余地あり)

### 強み

#### オフライン対応 (IndexedDB)
```typescript
// services/storage/indexeddb.ts
const INDEXEDDB_STORES = {
  ORDERS: 'orders',
  AUTOCOMPLETE_HISTORY: 'autocomplete_history',
};
```

#### PWA 対応
```typescript
// vite.config.ts
VitePWA({
  workbox: {
    runtimeCaching: [
      { urlPattern: /^https:\/\/fonts\.googleapis\.com/, ... },
      { urlPattern: /^https:\/\/fonts\.gstatic\.com/, ... },
    ],
  },
});
```

### 改善点

1. **CQRS の未適用**
   - 読み取りと書き込みが同じパスを使用

2. **キャッシュ戦略の不足**
   - TanStack Query のキャッシュ設定が限定的

3. **バックプレッシャー/レートリミットの未導入**

### 推奨アクション

```typescript
// useQuery でのキャッシュ戦略強化
const { data: orders } = useQuery({
  queryKey: ['orders', userId],
  queryFn: () => firestoreService.getUserOrders(userId),
  staleTime: QUERY_CACHE_TIME.MEDIUM, // 30分
  gcTime: QUERY_CACHE_TIME.LONG,      // 1時間
  refetchOnWindowFocus: false,
});

// Firestore の読み取り最適化
// - 必要なフィールドのみ取得 (select)
// - ページネーションの活用
// - リアルタイムリスナーの適切な解除
```

---

## 9. 信頼性・可用性

### 評価: ⭐⭐⭐⭐ (良好)

### 強み

#### ErrorBoundary の実装
```typescript
// components/common/ErrorBoundary.tsx
<ErrorBoundary
  onError={(error, info) => logErrorToService(error, info)}
  fallback={<CustomErrorUI />}
>
  <App />
</ErrorBoundary>
```

#### オフライン同期機能
```typescript
// hooks/useDataSync.ts
const { isOnline, saveOrder: saveOrderWithSync } = useDataSync();
```

#### バックエンドのファイルクリーンアップ
```python
# app.py
scheduler.add_job(
    cleanup_old_files,
    'interval',
    hours=1,
)
```

### 改善点

1. **ヘルスチェックの多層化不足**
   - アプリレベルのヘルスチェックのみ
   - DB 接続、外部サービス依存のチェックなし

2. **SLO/SLA/SLI の未定義**

### 推奨アクション

```python
# config/api.py に追加
@router.get("/health/deep")
async def deep_health_check():
    """多層ヘルスチェック"""
    checks = {
        "app": "ok",
        "firestore": await check_firestore_connection(),
        "temp_storage": check_temp_storage(),
    }
    all_healthy = all(v == "ok" for v in checks.values())
    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks,
    }
```

---

## 10. セキュリティ設計

### 評価: ⭐⭐⭐⭐⭐ (優秀)

### 強み

#### Firestore Security Rules の徹底
```javascript
// firestore.rules
// 認証ヘルパー
function isAuthenticated() {
  return request.auth != null;
}

function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

// 注文データのバリデーション
function isValidOrder(data) {
  return data.keys().hasAll(['delivery_date', 'suppliers', ...]) &&
         data.userId == request.auth.uid;
}
```

#### 入力バリデーション (Zod)
```typescript
// 文字数制限、数値範囲、型チェックを徹底
export const productSchema = z.object({
  supplier: z.string().min(1).max(MAX_LENGTH.SUPPLIER),
  storeCost: z.number()
    .min(NUMBER_RANGE.STORE_COST.min)
    .max(NUMBER_RANGE.STORE_COST.max),
});
```

#### CORS 設定の明示
```python
# app.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://haibun-distribution.web.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
)
```

### 現状で優れている点

- ユーザー所有権の検証が全コレクションで実施
- デフォルト拒否ルール (`match /{document=**} { allow read, write: if false; }`)
- 開発環境でのみエラー詳細を表示 (`import.meta.env.DEV`)

---

## 11. シンプルさ

### 評価: ⭐⭐⭐ (改善の余地あり)

### 強み

#### 単一目的のフック
```typescript
// 各フックが明確な責務を持つ
useOrderSubmit      // 注文送信
useSupplierPresets  // 帳合先プリセット
useEmailAddressBook // メールアドレス帳
```

#### 薄い抽象層
```typescript
// FirestoreBaseService は必要最低限の共通機能のみ
abstract class FirestoreBaseService<T, F> {
  save, findById, update, delete, executeQuery
}
```

### 改善点

1. **巨大ファイルの存在**
   - `StoreCategoryManagementPage.tsx`: 1469行
   - `OrderFormContext.tsx`: 512行
   - `orderFormStore.ts`: 437行

2. **過剰な型パラメータ**
   - 一部のジェネリクスが複雑

### 推奨アクション

```typescript
// StoreCategoryManagementPage の分割案
// 1. コンポーネント分割
StoreCategoryManagementPage/
├── index.tsx                    # メインコンポーネント (100行以下)
├── CategoryList.tsx             # カテゴリ一覧
├── CategoryEditor.tsx           # 編集フォーム
├── StoreAssignment.tsx          # 店舗割り当て
├── hooks/
│   ├── useCategoryManagement.ts
│   └── useStoreAssignment.ts
└── types.ts
```

---

## 12. 標準化・再利用

### 評価: ⭐⭐⭐⭐ (良好)

### 強み

#### コーディング規約の整備
```javascript
// eslint.config.js
export default defineConfig([
  {
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
  },
]);
```

#### Prettier による一貫したフォーマット
```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5"
}
```

#### パスエイリアスの統一
```typescript
// tsconfig.app.json
"paths": {
  "@/*": ["./src/*"]
}
```

### 改善点

1. **共通コンポーネントライブラリの未整備**
   - UI コンポーネントが pages/components に散在

2. **スタイルガイドの文書化不足**

### 推奨アクション

```markdown
# フロントエンドスタイルガイド

## コンポーネント設計原則
1. 1ファイル300行以下
2. Props は interface で定義
3. コンポーネント名はPascalCase

## フック設計原則
1. `use` プレフィックス必須
2. 単一責務
3. 戻り値はオブジェクト形式

## 型定義ルール
1. `types/` に集約
2. エンティティ型は `entities/` サブフォルダ
3. `as const` を活用
```

---

## 13. トレードオフ設計

### 評価: ⭐⭐⭐ (改善の余地あり)

### 強み

#### コード内コメントでの設計意図記録
```typescript
// firestore.rules
// Note: Firestore ルールでは配列の全要素をループできないため、
// 完全なバリデーションはクライアント側で行う必要があります
```

```typescript
// orderFormStore.ts
// 永続化する項目を限定（セキュリティ考慮）
partialize: (state) => ({
  activeStep: state.activeStep,
  progressSummaryHeight: state.progressSummaryHeight,
}),
```

### 改善点

1. **ADR (Architecture Decision Records) の未導入**
2. **技術負債の可視化が不十分**

### 推奨アクション

```markdown
<!-- docs/adr/README.md -->
# Architecture Decision Records

| ID | タイトル | ステータス | 日付 |
|----|---------|-----------|------|
| 001 | Repository パターンの採用 | Accepted | 2024-01 |
| 002 | Zustand vs Redux の選択 | Accepted | 2024-02 |
| 003 | オフライン対応戦略 | Accepted | 2024-03 |
| 004 | OrderFormContext の統合 | Superseded | 2024-04 |
```

---

## 優先度別改善ロードマップ

### 高優先度 (即座に対応)

1. **循環依存の検出を CI に導入**
   - `madge` の導入と GitHub Actions への統合

2. **ADR の導入開始**
   - 既存の重要な設計判断を記録

### 中優先度 (次のスプリント)

1. **OrderFormContext の分割**
   - 責務ごとに Context を分離

2. **StoreCategoryManagementPage のリファクタリング**
   - コンポーネント分割、フック抽出

3. **ヘルスチェックの多層化**
   - `/api/health/deep` エンドポイント追加

### 低優先度 (中長期)

1. **STORE_DATA の外部化**
   - Firestore または設定ファイルへの移行

2. **共通コンポーネントライブラリの整備**
   - Storybook 導入検討

3. **CQRS パターンの部分適用**
   - 読み取り頻度の高いデータに対して

---

## 結論

このプロジェクトは、**エンタープライズグレードのアプリケーションアーキテクチャ**として優れた設計がなされています。

### 特に優れている点
- DI パターンによるテスタビリティ
- Repository/Facade パターンによるデータ層の抽象化
- Firestore Security Rules によるセキュリティ
- Zod によるスキーマバリデーション
- メッセージ・定数の SSOT 管理

### 主な改善機会
- 大規模ファイルの分割
- ADR の導入による設計判断の記録
- 循環依存検出の自動化
- ヘルスチェック・監視の強化

全体として、**品質とメンテナビリティのバランスが取れた設計**であり、今後の拡張にも対応できる基盤が整っています。
