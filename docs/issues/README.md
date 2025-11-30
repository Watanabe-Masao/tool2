# 技術的負債と課題

現在のコードベースにおける技術的負債、課題、改善が必要な箇所をまとめています。

## 課題サマリー

| カテゴリ | 優先度 | 件数 | 説明 |
|---------|--------|------|------|
| **大規模コンポーネント** | 高 | 5 | 1000行超のコンポーネントが存在 |
| **コード重複** | 高 | 4 | 同じロジックが複数箇所に実装 |
| **テストカバレッジ** | 高 | 20+ | テストが不足しているファイル |
| **セキュリティ** | 高 | 6 | CORS設定、入力検証の強化が必要 |
| **パフォーマンス** | 中 | 4 | 同期処理、メモリ効率の改善 |

---

## フロントエンドの課題

### 1. 大規模コンポーネント（分割が必要）

以下のコンポーネントは行数が多く、責務の分離が必要です。

| ファイル | 行数 | 問題点 |
|---------|------|--------|
| `pages/AllocationHistoryPage.tsx` | 2486 | カレンダー、テーブル、フィルタリングが混在 |
| `components/forms/StoreAllocationMobile.tsx` | 1498 | ジェスチャー、配分計算、UIが混在 |
| `components/forms/ProductFormCardBasic.tsx` | 1412 | モーダル管理、長押し検出が複雑 |
| `components/modals/ProductPresetModal.tsx` | 1338 | フィルタリング、D&D、スワイプが混在 |

**改善案:**
```
AllocationHistoryPage.tsx (2486行)
└→ 分割案:
   ├── AllocationCalendarView.tsx    # カレンダー表示
   ├── AllocationTableView.tsx       # テーブル表示
   ├── useAllocationFiltering.ts     # フィルタリングロジック
   └── useAllocationGrouping.ts      # グループ化ロジック
```

### 2. コード重複（共通化が必要）

#### タッチジェスチャー検出の重複

8ファイル以上で同じパターンが実装されています。

```typescript
// 現状: 各ファイルで同じコード
const longPressTimer = useRef<number | null>(null);
const touchStartY = useRef<number | null>(null);
const handleTouchStart = (e) => { ... };
const handleTouchMove = (e) => { ... };
const handleTouchEnd = () => { ... };
```

**改善案:** `useTouchGesture` フックを作成
```typescript
// hooks/useTouchGesture.ts
export const useTouchGesture = (options: {
  onLongPress?: (x: number, y: number) => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  longPressDuration?: number;
  swipeThreshold?: number;
}) => { ... };
```

#### モーダル管理の重複

```typescript
// 現状: 各ファイルで同じパターン
const [modalOpen, setModalOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);
const handleOpen = () => setModalOpen(true);
const handleClose = () => setModalOpen(false);
```

**改善案:** `useModalState` フックを作成

#### 配分計算ロジックの重複

均等配分・構成比配分の計算が複数箇所に存在。

**改善案:** `useAllocationCalculation` フックを作成

### 3. テストカバレッジ不足

以下のファイルにはテストがありません。

| カテゴリ | ファイル | 重要度 |
|---------|---------|--------|
| Hooks | useTemplateGeneration.ts (280行) | 高 |
| Hooks | useDataSync.ts (246行) | 高 |
| Hooks | useProductHistory.ts (241行) | 高 |
| Hooks | useOrderSubmit.ts (230行) | 高 |
| Pages | AllocationHistoryPage.tsx (2486行) | 高 |
| Components | StoreAllocationMobile.tsx (1498行) | 高 |
| Components | ProductFormCardBasic.tsx (1412行) | 高 |

### 4. パフォーマンスの問題

#### useWatch の過度な使用

`ProductFormCardBasic.tsx` では10個以上の `useWatch` が使用されており、各watchで再レンダリングが発生します。

```typescript
// 現状: 個別にwatch
const currentCategoryCode = useWatch({ control, name: `products.${index}.categoryCode` });
const currentSupplier = useWatch({ control, name: `products.${index}.supplier` });
// ... さらに7個以上
```

**改善案:** 監視する値を統合

#### 複雑な useMemo 計算

`StoreAllocationMobile.tsx` の `calculatePreview` は100行以上の複雑な計算を含み、依存配列が6個あります。

---

## バックエンドの課題

### 1. セキュリティ

| 問題 | 優先度 | 説明 |
|------|--------|------|
| CORS設定 | 高 | `allow_methods=["*"]`, `allow_headers=["*"]` が過度に広い |
| ファイルID検証 | 高 | パストラバーサルの可能性 |
| 添付ファイルサイズ | 中 | Base64デコード後のサイズ制限がない |
| Firebase設定エラー | 中 | 本番環境で詳細なエラーメッセージを返している |

**改善案:**

```python
# CORS設定の厳格化
allow_methods=["GET", "POST", "HEAD"],
allow_headers=["Content-Type"],

# ファイルID検証の追加
import uuid
try:
    uuid.UUID(file_id)
except ValueError:
    raise HTTPException(status_code=400, detail="無効なファイルID")
```

### 2. パフォーマンス

| 問題 | 説明 |
|------|------|
| PDF変換の同期処理 | 最大30秒のブロッキング |
| ファイル全体読み込み | 大きなファイルでメモリオーバーフローの可能性 |
| スタイル毎回作成 | Excelスタイルをキャッシュしていない |

### 3. コード重複

- テンプレート生成処理が `/generate` と `/preview` で重複
- ファイル削除ロジックが startup と shutdown で重複
- 環境変数検証が複数箇所に存在

### 4. テスト不足

- セキュリティテスト（パストラバーサル、XSS）
- 境界値テスト（max_products、空のリスト）
- 負荷テスト（同時リクエスト）

---

## 改善優先順位

### フェーズ1（即対応）

1. `useTouchGesture` フック作成（30箇所の重複削減）
2. `useModalState` フック作成
3. CORS設定の厳格化
4. ファイルID検証の追加

### フェーズ2（短期）

1. `AllocationHistoryPage` の責務分離
2. `ProductFormCardBasic` の責務分離
3. テストカバレッジの拡大（主要hooks）

### フェーズ3（継続的）

1. PDF変換の非同期化
2. パフォーマンス測定とボトルネック改善
3. 残りのテスト追加

---

## 関連ドキュメント

- [IMPROVEMENT_ACTION_PLAN.md](IMPROVEMENT_ACTION_PLAN.md) - 詳細な改善アクションプラン
- [アーキテクチャレビュー](../architecture/ARCHITECTURE_REVIEW.md)
