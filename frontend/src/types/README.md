# 型定義ガイド - Single Source of Truth

## 📋 概要

このディレクトリは、アプリケーション全体で使用される**型定義の単一情報源**です。
ドメインごとにファイルを分割し、型の重複を防ぎ、保守性を向上させます。

## 📁 ファイル構成

```
types/
├── README.md               # このファイル
├── index.ts               # 統合 re-export（後方互換性）
│
├── product.ts             # 商品ドメイン
├── order.ts               # 注文ドメイン
├── store.ts               # 店舗ドメイン
├── api.ts                 # API 通信
├── firebase.ts            # Firebase データ構造
├── repository.ts          # Repository 層
├── ui.ts                  # UI utility
│
├── userSettings.ts        # ユーザー設定
├── storeSettings.ts       # 店舗設定
└── storeCategory.ts       # 店舗カテゴリ
```

## 🎯 設計原則

### 1. ドメイン駆動設計（DDD）

型をビジネスドメインごとにグループ化：

```typescript
// ❌ 悪い例: すべてが types/index.ts に混在
export interface ProductData { /* ... */ }
export interface OrderData { /* ... */ }
export interface StoreData { /* ... */ }
// ... 300行以上が1ファイル

// ✅ 良い例: ドメインごとに分割
// types/product.ts - 商品関連のみ
// types/order.ts - 注文関連のみ
// types/store.ts - 店舗関連のみ
```

### 2. 単一責任の原則（SRP）

各ファイルは1つのドメインの責任のみを持つ：

- `product.ts` → 商品データ、商品フォーム
- `order.ts` → 注文データ、カレンダーイベント
- `store.ts` → 店舗データ、店舗リスト

### 3. 依存関係の明確化

型間の依存関係を明示的にインポート：

```typescript
// types/order.ts
import type { ProductData } from './product';

export interface OrderData {
  products: ProductData[];  // 依存関係が明確
}
```

## 📖 使用方法

### 推奨: ドメイン別インポート（新規コード）

```typescript
// ✅ 推奨: 必要なドメインから直接インポート
import type { ProductData, ProductFormData } from '@/types/product';
import type { OrderData } from '@/types/order';
import type { StoreData } from '@/types/store';
```

**メリット**:
- 依存関係が明確
- Tree-shaking が効きやすい
- バンドルサイズの最適化
- 型の所在がわかりやすい

### 後方互換性: 統合インポート（既存コード）

```typescript
// ✅ OK: 既存コードの互換性維持
import type { ProductData, OrderData, StoreData } from '@/types';
```

**用途**:
- 既存コードの段階的な移行
- 複数ドメインの型を一度にインポート

## 🔄 移行ガイド

### ステップ 1: 既存コードは変更不要

`types/index.ts` がすべての型を re-export しているため、
既存のインポートは**そのまま動作**します：

```typescript
// 既存コード（そのまま動作）
import type { ProductData } from '@/types';
```

### ステップ 2: 新規コードでドメイン別インポートを採用

```typescript
// 新規コード（推奨）
import type { ProductData } from '@/types/product';
```

### ステップ 3: 段階的に既存コードを移行

```diff
- import type { ProductData, OrderData } from '@/types';
+ import type { ProductData } from '@/types/product';
+ import type { OrderData } from '@/types/order';
```

## 📝 型定義の追加方法

### 1. 適切なドメインファイルを選択

```
商品に関する型 → types/product.ts
注文に関する型 → types/order.ts
店舗に関する型 → types/store.ts
API 通信の型 → types/api.ts
Repository の型 → types/repository.ts
```

### 2. ファイルに型を追加

```typescript
// types/product.ts
export interface NewProductType {
  // ...
}
```

### 3. index.ts に re-export を追加

```typescript
// types/index.ts
export type { ProductData, NewProductType } from './product';
```

## ⚠️ 注意事項

### 型の重複を避ける

```typescript
// ❌ 悪い例: 複数の場所で同じ型を定義
// components/Product.tsx
interface ProductData { /* ... */ }

// services/ProductService.ts
interface ProductData { /* ... */ }

// ✅ 良い例: types/ から import
import type { ProductData } from '@/types/product';
```

### Repository 固有の型

Repository で使用する型は `types/repository.ts` に定義：

```typescript
// ✅ 良い例
// types/repository.ts
export interface ProductHistory {
  // Firestore に保存される形式
}

// repositories/ProductHistoryRepository.ts
import type { ProductHistory } from '@/types/repository';
```

### deprecated 型の管理

将来削除予定の型には `@deprecated` を明記：

```typescript
/**
 * @deprecated
 * この型は orderSchema.ts から自動生成される型と重複しています。
 * 将来的には Zod schema から生成される型を使用してください。
 */
export interface ProductFormData {
  // ...
}
```

## 🎯 ベストプラクティス

### 1. 型定義には JSDoc を付ける

```typescript
/**
 * 商品データ
 *
 * @description
 * 商品の基本情報と店舗配分を含むデータ構造
 */
export interface ProductData {
  /** 品名 */
  name: string;
  /** 店舗配分数 (length = 36) */
  storeAllocations: number[];
}
```

### 2. Branded Types の活用

ID の混同を防ぐため、Branded Types を使用：

```typescript
import type { UserId, OrderId } from '@/utils/brandedTypes';

// ❌ エラー: 異なる ID を混同できない
const userId: UserId = orderId;
```

### 3. Zod Schema との連携

可能な限り Zod Schema から型を生成：

```typescript
import { z } from 'zod';

const ProductSchema = z.object({
  name: z.string(),
  price: z.number(),
});

// 型を自動生成
export type Product = z.infer<typeof ProductSchema>;
```

## 🔍 トラブルシューティング

### Q: 型が見つからないエラー

```
Cannot find module '@/types/product' or its corresponding type declarations
```

**解決方法**:
1. ファイルが存在するか確認: `frontend/src/types/product.ts`
2. tsconfig.json の paths 設定を確認
3. IDE を再起動

### Q: 循環参照エラー

```
Circular dependency detected
```

**解決方法**:
1. 型定義ファイル間の依存関係を見直す
2. 共通の型を別ファイルに分離
3. `import type` を使用（値は循環参照しない）

## 📚 参考資料

- [TypeScript Handbook - Modules](https://www.typescriptlang.org/docs/handbook/modules.html)
- [Branded Types in TypeScript](https://egghead.io/blog/using-branded-types-in-typescript)
- [Zod - TypeScript-first schema validation](https://zod.dev/)

---

**更新日**: 2025-11-25
**バージョン**: 1.0.0
