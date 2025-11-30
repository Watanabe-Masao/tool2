# リファクタリング計画書

## 概要

本ドキュメントは、配分表テンプレート作成ツールの技術的負債を解消し、コードの品質・保守性・拡張性を向上させるための網羅的なリファクタリング計画です。

## 目次

1. [現状分析](#現状分析)
2. [リファクタリング項目一覧](#リファクタリング項目一覧)
3. [フェーズ別実施計画](#フェーズ別実施計画)
4. [各項目の詳細](#各項目の詳細)
5. [リスクと対策](#リスクと対策)

---

## 現状分析

### コード統計

| 項目 | 数値 |
|------|------|
| フロントエンド TypeScript/TSX | ~200 ファイル |
| バックエンド Python | ~30 ファイル |
| 1000行超のコンポーネント | 5 ファイル |
| カスタムフック | 40+ 個 |
| テストカバレッジ（推定） | ~40% |

### 主要な問題

```
┌─────────────────────────────────────────────────────────────────┐
│                      技術的負債マップ                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [高優先度]                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 大規模       │  │ コード重複    │  │ テスト不足   │          │
│  │ コンポーネント │  │ (ジェスチャー) │  │ (40%未満)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  [中優先度]                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ セキュリティ  │  │ パフォーマンス │  │ 型安全性     │          │
│  │ (CORS/検証)  │  │ (同期処理)    │  │ (any使用)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  [低優先度]                                                      │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ ドキュメント  │  │ コード整理    │                            │
│  │ (コメント)    │  │ (命名規則)    │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## リファクタリング項目一覧

### フロントエンド

| ID | 項目 | 優先度 | 工数 | 影響範囲 |
|----|------|--------|------|----------|
| F-01 | useTouchGesture フック作成 | 高 | 小 | 8+ ファイル |
| F-02 | useModalState フック作成 | 高 | 小 | 10+ ファイル |
| F-03 | useAllocationCalculation フック作成 | 高 | 中 | 3 ファイル |
| F-04 | AllocationHistoryPage 分割 | 高 | 大 | 1 ファイル |
| F-05 | StoreAllocationMobile 分割 | 高 | 大 | 1 ファイル |
| F-06 | ProductFormCardBasic 分割 | 高 | 大 | 1 ファイル |
| F-07 | ProductPresetModal 分割 | 中 | 大 | 1 ファイル |
| F-08 | useWatch の最適化 | 中 | 中 | 5 ファイル |
| F-09 | エラーハンドリング統一 | 中 | 中 | 全体 |
| F-10 | 型定義の厳格化 (any 削除) | 中 | 大 | 全体 |
| F-11 | テスト追加（hooks） | 高 | 大 | 20+ ファイル |
| F-12 | テスト追加（components） | 中 | 大 | 30+ ファイル |

### バックエンド

| ID | 項目 | 優先度 | 工数 | 影響範囲 |
|----|------|--------|------|----------|
| B-01 | CORS設定の厳格化 | 高 | 小 | app.py |
| B-02 | ファイルID検証の追加 | 高 | 小 | routes.py |
| B-03 | テンプレート生成の共通化 | 中 | 小 | routes.py |
| B-04 | PDF変換の非同期化 | 中 | 中 | pdf_service.py |
| B-05 | 添付ファイルサイズ制限 | 中 | 小 | email_service.py |
| B-06 | メッセージ定数の一元化 | 低 | 小 | 全体 |
| B-07 | セキュリティテスト追加 | 高 | 中 | tests/ |
| B-08 | 境界値テスト追加 | 中 | 中 | tests/ |

---

## フェーズ別実施計画

### フェーズ1: 基盤整備

**目標:** 共通フックの作成とセキュリティ強化

```
期間: フェーズ1
対象: F-01, F-02, F-03, B-01, B-02, B-05

┌─────────────────────────────────────────────────────────────┐
│  Week 1                                                      │
│  ├── F-01: useTouchGesture 作成・導入                        │
│  └── B-01: CORS設定の厳格化                                  │
│                                                              │
│  Week 2                                                      │
│  ├── F-02: useModalState 作成・導入                          │
│  └── B-02: ファイルID検証の追加                              │
│                                                              │
│  Week 3                                                      │
│  ├── F-03: useAllocationCalculation 作成・導入               │
│  └── B-05: 添付ファイルサイズ制限                            │
└─────────────────────────────────────────────────────────────┘
```

**成果物:**
- 3つの共通フック（削減行数: 推定 500行）
- セキュリティ強化（3項目）

### フェーズ2: コンポーネント分割

**目標:** 大規模コンポーネントの責務分離

```
期間: フェーズ2
対象: F-04, F-05, F-06, F-07

┌─────────────────────────────────────────────────────────────┐
│  Week 1-2                                                    │
│  └── F-04: AllocationHistoryPage 分割                        │
│      ├── AllocationCalendarView.tsx                          │
│      ├── AllocationTableView.tsx                             │
│      ├── AllocationFilterPanel.tsx                           │
│      └── useAllocationHistory.ts (リファクタ)                │
│                                                              │
│  Week 3-4                                                    │
│  └── F-05: StoreAllocationMobile 分割                        │
│      ├── StoreAllocationForm.tsx                             │
│      ├── StoreAllocationPreview.tsx                          │
│      ├── CategoryFilter.tsx                                  │
│      └── useStoreAllocation.ts                               │
│                                                              │
│  Week 5-6                                                    │
│  └── F-06: ProductFormCardBasic 分割                         │
│      ├── ProductFormCard.tsx (本体)                          │
│      ├── ProductCardMenu.tsx (長押しメニュー)                 │
│      ├── DeleteConfirmDialog.tsx                             │
│      └── useProductFormCard.ts                               │
│                                                              │
│  Week 7-8                                                    │
│  └── F-07: ProductPresetModal 分割                           │
│      ├── PresetList.tsx                                      │
│      ├── PresetFilter.tsx                                    │
│      ├── PresetDragDrop.tsx                                  │
│      └── usePresetFilter.ts                                  │
└─────────────────────────────────────────────────────────────┘
```

**成果物:**
- 4つの大規模コンポーネントを計16ファイルに分割
- 各コンポーネント300行以下に

### フェーズ3: テスト拡充

**目標:** テストカバレッジ 80% 達成

```
期間: フェーズ3
対象: F-11, F-12, B-07, B-08

テスト追加対象:
├── hooks/
│   ├── useTemplateGeneration.test.ts
│   ├── useDataSync.test.ts
│   ├── useProductHistory.test.ts
│   ├── useOrderSubmit.test.ts
│   ├── useTouchGesture.test.ts
│   ├── useModalState.test.ts
│   └── useAllocationCalculation.test.ts
│
├── components/
│   ├── AllocationCalendarView.test.tsx
│   ├── StoreAllocationForm.test.tsx
│   └── ProductFormCard.test.tsx
│
└── backend/
    ├── test_security.py
    └── test_boundary_values.py
```

### フェーズ4: パフォーマンス最適化

**目標:** レスポンス改善とメモリ効率化

```
期間: フェーズ4
対象: F-08, B-04

├── F-08: useWatch の最適化
│   └── 10個の個別watchを統合
│
└── B-04: PDF変換の非同期化
    └── バックグラウンドジョブ化
```

---

## 各項目の詳細

### F-01: useTouchGesture フック作成

**現状:**
```typescript
// 8+ファイルで重複
const longPressTimer = useRef<number | null>(null);
const touchStartY = useRef<number | null>(null);
const touchStartX = useRef<number | null>(null);

const handleTouchStart = (e: React.TouchEvent) => {
  const touch = e.touches[0];
  touchStartY.current = touch.clientY;
  touchStartX.current = touch.clientX;
  longPressTimer.current = window.setTimeout(() => {
    // 長押し処理
  }, 600);
};
// ... 30行以上のコード
```

**改善後:**
```typescript
// hooks/useTouchGesture.ts
interface TouchGestureOptions {
  onLongPress?: (position: { x: number; y: number }) => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  longPressDuration?: number; // default: 600ms
  swipeThreshold?: number;    // default: 70px
}

export function useTouchGesture(options: TouchGestureOptions) {
  // 実装
  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    state: {
      isLongPressActive,
      swipeDirection,
    },
  };
}

// 使用例
const { handlers } = useTouchGesture({
  onLongPress: (pos) => openMenu(pos),
  onSwipeDown: () => closeMenu(),
});

return <div {...handlers}>...</div>;
```

**影響ファイル:**
- StoreAllocationMobile.tsx
- ProductFormCardBasic.tsx
- ProductPresetModal.tsx
- その他5ファイル

---

### F-04: AllocationHistoryPage 分割

**現状: 2486行のモノリシックコンポーネント**

```
AllocationHistoryPage.tsx (2486行)
├── カレンダー表示ロジック (~400行)
├── テーブル表示ロジック (~500行)
├── フィルタリングロジック (~300行)
├── グループ化ロジック (~200行)
├── 状態管理 (~200行)
└── UI描画 (~800行)
```

**改善後:**

```
pages/AllocationHistoryPage/
├── index.tsx                      # メインページ (~200行)
├── AllocationCalendarView.tsx     # カレンダー表示 (~300行)
├── AllocationTableView.tsx        # テーブル表示 (~300行)
├── AllocationFilterPanel.tsx      # フィルタパネル (~150行)
├── AllocationGroupSelector.tsx    # グループ選択 (~100行)
├── hooks/
│   ├── useAllocationFiltering.ts  # フィルタリング (~150行)
│   ├── useAllocationGrouping.ts   # グループ化 (~100行)
│   └── useAllocationViewMode.ts   # 表示モード (~50行)
└── types.ts                       # 型定義 (~50行)
```

---

### B-01: CORS設定の厳格化

**現状:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[...],
    allow_credentials=True,
    allow_methods=["*"],  # 問題: 全メソッド許可
    allow_headers=["*"],  # 問題: 全ヘッダー許可
)
```

**改善後:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://haibun-distribution.web.app",
        "https://haibun-distribution.firebaseapp.com",
    ] + (["http://localhost:5173"] if settings.debug else []),
    allow_credentials=True,
    allow_methods=["GET", "POST", "HEAD"],
    allow_headers=["Content-Type", "Authorization"],
)
```

---

## リスクと対策

### リスク1: 回帰バグ

| リスク | 対策 |
|--------|------|
| コンポーネント分割で既存機能が壊れる | テストを先に追加してから分割 |
| フック導入で動作が変わる | 小さな単位で段階的に導入 |

### リスク2: 工数超過

| リスク | 対策 |
|--------|------|
| 想定以上に依存関係が複雑 | 影響範囲を事前に調査 |
| テスト作成に時間がかかる | 重要度の高いものから優先 |

### リスク3: パフォーマンス悪化

| リスク | 対策 |
|--------|------|
| コンポーネント分割で再レンダリング増加 | React.memo、useMemo で最適化 |
| フック呼び出しのオーバーヘッド | パフォーマンス計測を実施 |

---

## 成功指標

| 指標 | 現状 | 目標 |
|------|------|------|
| 最大コンポーネント行数 | 2486行 | 300行以下 |
| 重複コード箇所 | 30+ | 0 |
| テストカバレッジ | ~40% | 80% |
| TypeScript any 使用 | 多数 | 0 |
| セキュリティ警告 | 6件 | 0件 |

---

## 付録: ファイル別リファクタリング一覧

### 行数削減目標

| ファイル | 現在 | 目標 | 削減率 |
|---------|------|------|--------|
| AllocationHistoryPage.tsx | 2486 | 200 | -92% |
| StoreAllocationMobile.tsx | 1498 | 300 | -80% |
| ProductFormCardBasic.tsx | 1412 | 250 | -82% |
| ProductPresetModal.tsx | 1338 | 300 | -78% |
| GlassCalendar.tsx | 856 | 300 | -65% |
