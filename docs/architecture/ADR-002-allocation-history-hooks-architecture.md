# ADR-002: Allocation History Hooks Architecture

**Status:** ✅ Accepted
**Date:** 2025-01-30
**Authors:** Claude AI
**Related:** [REFACTORING_PLAN_2025.md](./REFACTORING_PLAN_2025.md), [ALLOCATION_HISTORY_PAGE_ANALYSIS.md](./ALLOCATION_HISTORY_PAGE_ANALYSIS.md)

## コンテキスト

AllocationHistoryPage.tsx（2,486行）の複雑性を解消するため、Phase 1 Week 1として5つのカスタムフックを抽出しました。しかし、これらのhooksを手動で接続するとページコンポーネントが複雑になる問題が発生しました。

### 問題点

```tsx
// Before: 9個のパラメータを手動で接続
const batches = useAllocationBatches(userId);
const filters = useAllocationFilters();
const modals = useAllocationModals();
const view = useAllocationView();
const tableData = useAllocationTableData({
  details: batches.details,                    // ❌ 手動接続
  selectedDateRange: batches.selectedDateRange, // ❌ 手動接続
  groupMode: filters.groupMode,                 // ❌ 手動接続
  sortOrder: filters.sortOrder,                 // ❌ 手動接続
  compositeKeyFields: filters.compositeKeyFields, // ❌ 手動接続
  filters: filters.filters,                     // ❌ 手動接続
  hiddenColumns: view.hiddenColumns,            // ❌ 手動接続
  hiddenRowIds: view.hiddenRowIds,              // ❌ 手動接続
  onHideRow: view.hideRow,                      // ❌ 手動接続
});
```

## 決定

**Custom Hook Composition パターン**を採用し、統合フック `useAllocationHistory` を作成しました。

### アーキテクチャ

```
features/allocation-history/
├── hooks/
│   ├── useAllocationHistory.ts      ⭐ 統合フック（新規）
│   ├── useAllocationBatches.ts      - データ取得・バッチ管理
│   ├── useAllocationFilters.ts      - フィルタリング・ソート
│   ├── useAllocationModals.ts       - モーダル状態管理
│   ├── useAllocationView.ts         - ビュー・UI状態
│   ├── useAllocationTableData.ts    - テーブルデータ生成
│   └── index.ts                     - Public API
├── utils/
│   ├── rowGenerators.ts             - 純粋関数（行生成）
│   ├── groupingStrategies.ts        - Strategy Pattern（グループ化）
│   ├── columnHelpers.tsx            - カラム定義ヘルパー
│   └── index.ts
├── types/
│   └── index.ts                     - 型定義
└── index.ts                          ⭐ Feature Public API（新規）
```

### 使用方法

```tsx
// After: 1行で統合されたhooksを取得
const allocationHistory = useAllocationHistory({ userId });

// 個別のhooksにアクセス
allocationHistory.batches.fetchHistory();
allocationHistory.filters.setGroupMode('product');
allocationHistory.modals.deleteDialog.openDialog(batch);
allocationHistory.view.toggleFullScreen();
const rows = allocationHistory.tableData.rows;
```

## 検討した代替案

### 案A: Custom Hook Composition パターン ✅ 採用

**概要:** 統合フック `useAllocationHistory` を作成し、内部で5つのhooksを呼び出して自動接続。

**メリット:**
- ✅ ページコンポーネントがシンプルになる
- ✅ hooks間の接続が自動化される
- ✅ 既存hooksを変更せずに活用できる
- ✅ 段階的な移行が可能
- ✅ 個別hooksへのアクセスも可能（柔軟性）

**デメリット:**
- ❌ すべてのhooksが常に実行される（軽微なパフォーマンス影響）
- ❌ 統合フックの保守が必要

**実装コスト:** 低（1ファイル追加）

### 案B: Zustand Store統合

**概要:** グローバル状態管理として Zustand を導入。

**メリット:**
- ✅ グローバル状態（ページ間共有可能）
- ✅ devtools対応（デバッグ容易）
- ✅ persist middleware（ブラウザバック対応）
- ✅ ミドルウェア活用可能

**デメリット:**
- ❌ 既存hooksの大幅な書き換えが必要
- ❌ グローバルstateの肥大化リスク
- ❌ 実装コストが高い

**実装コスト:** 高（既存hooks全面書き換え）

**評価:** 長期的には検討価値あり。Phase 2-3で再評価。

### 案C: React Context + useReducer

**概要:** React標準の Context API を使用。

**メリット:**
- ✅ Reactネイティブな方法
- ✅ 依存ライブラリ不要

**デメリット:**
- ❌ パフォーマンス問題（全体が再レンダリング）
- ❌ devtools なし
- ❌ 複雑な状態管理に不向き

**実装コスト:** 中

**評価:** デメリットが大きく不採用。

## 決定の理由

**案A (Custom Hook Composition)** を採用した理由：

1. **実装コストが低い**
   - 既存hooksを変更せずに活用
   - 1ファイル追加のみで実現

2. **段階的な移行が可能**
   - 既存コードとの互換性を維持
   - 個別hooksも引き続き使用可能

3. **シンプルさを維持**
   - グローバル状態を導入しない
   - 複雑性の増加を最小限に

4. **柔軟性**
   - 必要に応じて個別hooksにアクセス可能
   - 将来的にZustandへの移行も容易

5. **短期目標との整合性**
   - Phase 1 Week 2-3: コンポーネント抽出に集中
   - グローバル状態管理はPhase 2-3で再評価

## 影響

### ポジティブ

- ✅ **ページコンポーネントの簡素化**: 9個のパラメータ接続 → 1行
- ✅ **保守性向上**: hooks間の依存関係が明示的
- ✅ **再利用性**: 他のページでも同じパターンを適用可能
- ✅ **テスタビリティ**: 統合フックも個別にテスト可能

### ネガティブ

- ❌ **軽微なパフォーマンス影響**: 使わないhooksも実行される
  - **対策**: 将来的に lazy loading や条件付き実行を検討
- ❌ **統合フックの保守**: hooks追加時に統合フックも更新必要
  - **対策**: 型定義による自動検証、ドキュメント整備

## 実装詳細

### useAllocationHistory.ts

```typescript
export const useAllocationHistory = (
  params: UseAllocationHistoryParams
): UseAllocationHistoryReturn => {
  const { userId } = params;

  // 1. データ取得・バッチ管理
  const batches = useAllocationBatches(userId);

  // 2. フィルタリング・ソート管理
  const filters = useAllocationFilters();

  // 3. モーダル・ドロワー管理
  const modals = useAllocationModals();

  // 4. ビュー・UI状態管理
  const view = useAllocationView();

  // 5. テーブルデータ生成（自動接続）
  const tableData = useAllocationTableData(
    useMemo(
      () => ({
        details: batches.details,
        selectedDateRange: batches.selectedDateRange,
        groupMode: filters.groupMode,
        sortOrder: filters.sortOrder,
        compositeKeyFields: filters.compositeKeyFields,
        filters: filters.filters,
        hiddenColumns: view.hiddenColumns,
        hiddenRowIds: view.hiddenRowIds,
        onHideRow: view.hideRow,
      }),
      [
        batches.details,
        batches.selectedDateRange,
        filters.groupMode,
        filters.sortOrder,
        filters.compositeKeyFields,
        filters.filters,
        view.hiddenColumns,
        view.hiddenRowIds,
        view.hideRow,
      ]
    )
  );

  return { batches, filters, modals, view, tableData };
};
```

### Public API (features/allocation-history/index.ts)

```typescript
// 統合フック（推奨）
export { useAllocationHistory, ... } from './hooks/useAllocationHistory';

// 個別フック（詳細制御が必要な場合のみ）
export { useAllocationBatches, ... } from './hooks/useAllocationBatches';
// ...

// 型定義
export type { DetailGridRow, ... } from './types';

// Utils（テスト・高度な用途向け）
export { aggregateStoreAllocations, ... } from './utils';
```

## 成功の指標

- ✅ AllocationHistoryPage.tsx の複雑性削減: 2,486行 → 目標250行以下
- ✅ hooks間の接続コード削減: 9個のパラメータ → 0個（自動接続）
- ✅ テスト可能性: 統合フックの単体テスト作成
- ✅ ドキュメント整備: ADR、README、型定義のJSDoc

## 今後の検討事項

### 短期（Phase 1）

- [ ] 統合フックの単体テスト作成
- [ ] AllocationHistoryPageでの実装確認
- [ ] パフォーマンス測定（React DevTools Profiler）

### 長期（Phase 2-3）

- [ ] Zustand Store統合の再評価
  - グローバル状態管理の必要性が明確になったら
  - 複数ページでの状態共有が必要になったら
  - ブラウザバック対応が必須になったら

- [ ] パフォーマンス最適化
  - 条件付きhook実行（lazy loading）
  - React.memo の活用
  - useMemo/useCallback の最適化

## 参考資料

- [Custom Hook Composition Pattern](https://react.dev/learn/reusing-logic-with-custom-hooks#custom-hooks-sharing-logic-between-components)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React Performance Optimization](https://react.dev/learn/render-and-commit#optimizing-performance)

## 変更履歴

- **2025-01-30**: 初版作成（Phase 1完了時）
- **2025-01-30**: Custom Hook Composition パターン採用決定
