# 📊 Phase 1-2 クイックリファレンス

## Before / After 比較

### コード行数の推移

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 0   ████████████████████████████████████  856行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1   ████████████████████████████████████  856行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 2   ██████████████                        351行 ⬇️ 59%削減
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 3   ███████████                           280行 ⬇️ 67%削減（予測）
(推奨)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 4   █████████                             220行 ⬇️ 74%削減（予測）
(推奨)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 主要メトリクス比較

### NewOrderPage.tsx

| メトリクス | Phase 0 | Phase 2 | Phase 5(予測) | 改善率 |
|-----------|---------|---------|---------------|--------|
| 行数 | 856 | 351 | 220 | **-74%** |
| Props数/コンポーネント | 40+ | 36 | 8-10 | **-75%** |
| カスタムフック数 | 0 | 8 | 12 | +100% |
| 状態管理箇所 | 1巨大 | 5分散 | 1統合 | ✅ |
| テストカバレッジ | 0% | 未整備 | 80%+ | ✅ |

---

## アーキテクチャの進化

### Phase 0-1: モノリシック構造
```
┌─────────────────────────────────────┐
│     NewOrderPage.tsx (856行)        │
│  ┌─────────────────────────────┐   │
│  │ State (20個)                │   │
│  │ Handlers (15個)             │   │
│  │ useEffect (10個)            │   │
│  │ JSX (700行)                 │   │
│  └─────────────────────────────┘   │
│  すべてが密結合                     │
└─────────────────────────────────────┘
```

### Phase 2: フック分離構造
```
┌─────────────────────────────────────┐
│   NewOrderPage.tsx (351行)          │
│  ┌───────┐ ┌───────┐ ┌───────┐    │
│  │ Hook1 │ │ Hook2 │ │ Hook3 │    │
│  └───┬───┘ └───┬───┘ └───┬───┘    │
│      │         │         │         │
│      └─────────┴─────────┘         │
│              ↓                      │
│      ┌──────────────┐              │
│      │  Components  │              │
│      └──────────────┘              │
│  関心の分離が進んだ                │
│  但しProp drillingが残る            │
└─────────────────────────────────────┘
```

### Phase 3-4: 状態管理統合（推奨）
```
┌──────────────────── Zustand Store ────────────────────┐
│  Global State (activeStep, modals, UI state, etc.)     │
└───────────────────────┬───────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
   │Feature 1│    │Feature 2│    │Feature 3│
   │ (order) │    │(supplier)│   │(product)│
   └────┬────┘    └────┬────┘    └────┬────┘
        │               │               │
        └───────────────┴───────────────┘
                        │
              ┌─────────▼─────────┐
              │  NewOrderPage.tsx │
              │      (220行)      │
              └───────────────────┘
  Prop drillingが解消
  コンポーネントが独立
```

---

## 課題と解決策マトリクス

| 課題 | 深刻度 | 影響範囲 | 推奨解決策 | 工数 | ROI |
|------|--------|----------|-----------|------|-----|
| Prop Drilling | 🔴 高 | 全体 | Zustand導入 | 5日 | ⭐⭐⭐⭐⭐ |
| 状態分散 | 🟡 中 | 中規模 | Zustand統合 | 3日 | ⭐⭐⭐⭐ |
| useEffect肥大化 | 🟡 中 | 局所 | 依存最適化 | 2日 | ⭐⭐⭐ |
| フック粒度不統一 | 🟢 低 | 局所 | リファクタ | 3日 | ⭐⭐⭐ |
| テスト未整備 | 🔴 高 | 全体 | テスト実装 | 7日 | ⭐⭐⭐⭐⭐ |
| sessionStorage | 🟢 低 | 局所 | IndexedDB | 1日 | ⭐⭐ |

---

## 技術スタック比較

### 状態管理ライブラリ

```
┌──────────────────────────────────────────────────────┐
│ 特徴          │ Zustand │ Jotai │ Redux Toolkit      │
├──────────────────────────────────────────────────────┤
│ 学習コスト    │ ⭐       │ ⭐⭐   │ ⭐⭐⭐              │
│ バンドルサイズ│ 1.2KB   │ 3KB   │ 13KB               │
│ DevTools      │ ✅      │ ✅    │ ✅                 │
│ TypeScript    │ ✅      │ ✅    │ ✅                 │
│ React統合     │ ✅      │ ✅    │ ✅                 │
│ Persist       │ ✅      │ ✅    │ ✅                 │
│ 推奨度        │ ⭐⭐⭐⭐⭐│ ⭐⭐⭐⭐│ ⭐⭐⭐             │
└──────────────────────────────────────────────────────┘

推奨: Zustand（学習コストとパフォーマンスのバランス最良）
```

---

## Phase 3-5 実装チェックリスト

### Phase 3: 状態管理最適化（1-2週間）

- [ ] Zustandのインストール
  ```bash
  npm install zustand
  ```

- [ ] orderFormStoreの作成
  ```typescript
  // stores/orderFormStore.ts
  export const useOrderFormStore = create(...)
  ```

- [ ] UI状態の移行
  - [ ] activeStep
  - [ ] activeProductIndex
  - [ ] lockedStores
  - [ ] selectedCategories
  - [ ] modal states

- [ ] Prop drillingの削減
  - [ ] OrderFormWithTabs propsを36個→15個に
  - [ ] 子コンポーネントでの直接アクセス

- [ ] IndexedDB移行
  - [ ] persist middlewareの設定
  - [ ] sessionStorageからの移行

- [ ] テスト実装
  - [ ] Storeのunit test
  - [ ] Integration test

**完了条件:** Props数が50%削減、コードが280行以下

---

### Phase 4: アーキテクチャ改善（2-3週間）

- [ ] Feature-based構造への移行
  ```
  src/features/
  ├── order/
  ├── supplier/
  └── product/
  ```

- [ ] Compound Component Pattern
  ```typescript
  <OrderForm>
    <OrderForm.Tabs />
    <OrderForm.Content />
  </OrderForm>
  ```

- [ ] カスタムフックの分解
  - [ ] useOrderHandlers → 3つに分割
  - [ ] useSupplierManagement → 2つに分割

- [ ] Form Wizard実装
  - [ ] ステップ定義の宣言化
  - [ ] バリデーションの分離

**完了条件:** モジュール独立性向上、コードが220行以下

---

### Phase 5: 機能拡張とパフォーマンス（2週間）

- [ ] React Queryの導入
  ```bash
  npm install @tanstack/react-query
  ```

- [ ] テンプレート機能
  - [ ] UI実装
  - [ ] Firestore保存

- [ ] バッチ操作機能
  - [ ] 複数選択UI
  - [ ] 一括更新ロジック

- [ ] CSV機能
  ```bash
  npm install papaparse
  ```
  - [ ] エクスポート
  - [ ] インポート

- [ ] Error Boundary
  ```bash
  npm install react-error-boundary
  ```

- [ ] パフォーマンス計測
  ```bash
  npm install web-vitals
  ```

**完了条件:** テストカバレッジ80%以上、UX大幅改善

---

## コマンド早見表

### 開発
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

### テスト
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# カバレッジ
npm run test:coverage
```

### 状態管理（Phase 3以降）
```bash
# Zustandインストール
npm install zustand

# Redux DevToolsで確認
# Chromeブラウザでdevtoolsを開く
```

---

## 参考リンク集

### 公式ドキュメント
- [Zustand](https://github.com/pmndrs/zustand)
- [React Hook Form](https://react-hook-form.com/)
- [TanStack Query](https://tanstack.com/query)
- [Testing Library](https://testing-library.com/)

### 設計パターン
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [Feature-Sliced Design](https://feature-sliced.design/)

### パフォーマンス
- [Web.dev Performance](https://web.dev/performance/)
- [React Performance](https://react.dev/learn/render-and-commit)

---

## 緊急時のトラブルシューティング

### ビルドエラー
```bash
# node_modules削除して再インストール
rm -rf node_modules
npm install

# キャッシュクリア
npm cache clean --force
```

### 型エラー
```bash
# TypeScriptの再コンパイル
npx tsc --noEmit
```

### Gitコンフリクト
```bash
# 現在のブランチ確認
git branch

# 最新を取得
git fetch origin

# マージ
git merge origin/main
```

---

**最終更新:** 2025-11-24
**ドキュメントバージョン:** 1.0
