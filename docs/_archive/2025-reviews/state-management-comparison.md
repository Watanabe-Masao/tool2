# 状態管理ライブラリ比較

## 現在の課題
- Prop drillingが深い（最大36個のprops）
- 状態が分散（useState, Context, カスタムフック）
- デバッグが困難

## 推奨オプション

### オプションA: Zustand（推奨 ⭐⭐⭐）

**メリット:**
- 学習コストが低い（Reactの知識だけで使える）
- バンドルサイズが小さい（1.2KB gzipped）
- TypeScript完全対応
- Redux DevTools対応

**実装例:**
```typescript
// stores/orderFormStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface OrderFormState {
  // State
  activeStep: number;
  activeProductIndex: number;
  lockedStores: Map<number, Set<string>>;
  showGeneratedPreview: boolean;

  // Actions
  setActiveStep: (step: number) => void;
  setActiveProductIndex: (index: number) => void;
  toggleStoreLock: (productIndex: number, storeCode: string) => void;
  reset: () => void;
}

export const useOrderFormStore = create<OrderFormState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        activeStep: 0,
        activeProductIndex: 0,
        lockedStores: new Map(),
        showGeneratedPreview: false,

        // Actions
        setActiveStep: (step) => set({ activeStep: step }),
        setActiveProductIndex: (index) => set({ activeProductIndex: index }),
        toggleStoreLock: (productIndex, storeCode) =>
          set((state) => {
            const newMap = new Map(state.lockedStores);
            const locks = new Set(newMap.get(productIndex) || []);
            locks.has(storeCode) ? locks.delete(storeCode) : locks.add(storeCode);
            newMap.set(productIndex, locks);
            return { lockedStores: newMap };
          }),
        reset: () => set({
          activeStep: 0,
          activeProductIndex: 0,
          lockedStores: new Map(),
          showGeneratedPreview: false,
        }),
      }),
      { name: 'order-form-storage' }
    )
  )
);

// 使用例
// NewOrderPage.tsx
export const NewOrderPage = () => {
  const activeStep = useOrderFormStore((state) => state.activeStep);
  const setActiveStep = useOrderFormStore((state) => state.setActiveStep);

  // もしくはselector
  const { activeStep, setActiveStep, toggleStoreLock } = useOrderFormStore();

  return <OrderFormWithTabs />;
};

// 子コンポーネントで直接アクセス
// OrderFormWithTabs.tsx
const OrderFormWithTabs = () => {
  const activeStep = useOrderFormStore((state) => state.activeStep);
  // propsで受け取る必要なし！
};
```

**導入時の削減効果:**
- NewOrderPageのpropsが約60%削減
- 中間コンポーネントのprops通過が不要に
- 351行 → 推定250-280行

---

### オプションB: Jotai（推奨 ⭐⭐）

**メリット:**
- Atom単位の細かい状態管理
- 必要な部分だけ再レンダリング
- React Suspenseとの統合

**実装例:**
```typescript
// stores/orderFormAtoms.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Atoms
export const activeStepAtom = atom(0);
export const activeProductIndexAtom = atom(0);
export const lockedStoresAtom = atom<Map<number, Set<string>>>(new Map());

// Derived atoms
export const isProductModeAtom = atom(
  (get) => {
    const step = get(activeStepAtom);
    return step >= 1 && step <= 3;
  }
);

// Persisted atoms
export const draftDataAtom = atomWithStorage<OrderFormData | null>(
  'order-draft',
  null
);

// 使用例
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

const OrderFormWithTabs = () => {
  const [activeStep, setActiveStep] = useAtom(activeStepAtom);
  const isProductMode = useAtomValue(isProductModeAtom);

  // ...
};
```

**特徴:**
- より細かい粒度の状態管理
- パフォーマンス最適化がしやすい
- 学習コストはZustandよりやや高い

---

### オプションC: Redux Toolkit + RTK Query（推奨 ⭐）

**メリット:**
- エンタープライズ実績が豊富
- データフェッチングとキャッシュが統合
- 強力な開発ツール

**デメリット:**
- 学習コストが高い
- ボイラープレートがやや多い
- バンドルサイズが大きい（13KB gzipped）

**適用シーン:**
- 大規模アプリケーション
- チームに Redux 経験者が多い
- 複雑なデータフローがある

---

## 推奨アプローチ

### Phase 3での実装順序

1. **Zustandの導入**（1-2日）
   - `orderFormStore` の作成
   - UI状態の移行（activeStep, modals, etc）
   - Prop drillingの解消

2. **React Hook Formとの統合維持**（現状維持）
   - フォームデータは引き続きReact Hook Formで管理
   - UI状態のみZustandに移行

3. **IndexedDBへの移行**（1日）
   - sessionStorageからIndexedDBへ
   - Zustand persistミドルウェアで自動永続化
   - 容量制限の解消

### 想定される効果

- **コード削減**: 351行 → 250-280行（約20-30%削減）
- **Props削減**: 36個 → 10-15個（約60%削減）
- **再レンダリング削減**: selector最適化で約30-40%改善
- **開発体験向上**: Redux DevToolsでtime-travel debugging

---

## インストール方法

```bash
# Zustand + middleware
npm install zustand

# Jotai
npm install jotai

# Redux Toolkit (参考)
npm install @reduxjs/toolkit react-redux
```
