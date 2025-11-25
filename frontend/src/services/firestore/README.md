# Firestore Repository Layer

新しいRepository層の実装とFirestoreServiceFacadeによる段階的移行戦略。

## 📁 ディレクトリ構造

```
firestore/
├── base/
│   └── FirestoreBaseService.ts       # 抽象基底クラス
├── repositories/
│   ├── OrderRepository.ts            # 注文データ管理
│   ├── ProductHistoryRepository.ts   # 商品履歴管理
│   ├── PricingHistoryRepository.ts   # 価格履歴管理
│   ├── AutocompleteRepository.ts     # オートコンプリート履歴
│   ├── PresetRepository.ts           # 帳合先プリセット
│   ├── EmailAddressRepository.ts     # メールアドレス帳
│   └── __tests__/                    # ユニットテスト
├── FirestoreServiceFacade.ts         # 互換性レイヤー
└── README.md                          # このファイル
```

## 🎯 アーキテクチャ

### Repository パターン

各ドメインごとに専用のRepositoryクラスを実装し、関心の分離を実現:

- **OrderRepository**: 注文データの管理、ページネーション対応
- **ProductHistoryRepository**: 商品履歴、ピン留め機能
- **PricingHistoryRepository**: 価格履歴、スマート更新ロジック
- **AutocompleteRepository**: 入力履歴の管理（最大50件）
- **PresetRepository**: 帳合先プリセット、リアルタイム購読
- **EmailAddressRepository**: メールアドレス帳、並び順管理

### Facade パターン

既存のコードとの互換性を保ちながら、内部的には新しいRepositoryを使用:

```typescript
// 既存のコード（変更不要）
import { FirestoreService } from '@/services/firebase/firestoreService';

const orderId = await FirestoreService.saveOrder(orderData, userId);
const orders = await FirestoreService.getUserOrders(userId);

// 新しいコード（推奨）
import { getFirebaseFirestore } from '@/services/firebase/config';
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';

const db = getFirebaseFirestore();
const facade = new FirestoreServiceFacade(db);

const orderId = await facade.saveOrder(orderData, userId);
const orders = await facade.getUserOrders(userId);
```

## 🚀 使い方

### 基本的な使用例

```typescript
import { getFirebaseFirestore } from '@/services/firebase/config';
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';

// Facadeのインスタンスを作成
const db = getFirebaseFirestore();
const facade = new FirestoreServiceFacade(db);

// 注文を保存
const orderId = await facade.saveOrder(orderData, userId);

// 注文一覧を取得
const orders = await facade.getUserOrders(userId, 20);

// 特定の日付の注文を取得
const dateOrders = await facade.getOrdersByDate(userId, '2025-01-25');
```

### リアルタイム購読

```typescript
// 帳合先プリセットの変更を監視
const unsubscribe = facade.subscribeToSupplierPresets(
  userId,
  (presets) => {
    console.log('プリセットが更新されました:', presets);
  },
  (error) => {
    console.error('エラーが発生しました:', error);
  }
);

// クリーンアップ
unsubscribe();
```

### 直接Repositoryを使用

より細かい制御が必要な場合は、Repositoryを直接使用できます:

```typescript
import { getFirebaseFirestore } from '@/services/firebase/config';
import { OrderRepository } from '@/services/firestore/repositories/OrderRepository';

const db = getFirebaseFirestore();
const orderRepo = new OrderRepository(db);

// ページネーション付きで注文を取得
const result = await orderRepo.findByUserIdPaginated(userId, {
  limit: 20,
  orderBy: 'timestamp',
  direction: 'desc',
});

console.log('注文:', result.items);
console.log('次のページがある:', result.hasMore);

// 次のページを取得
if (result.hasMore) {
  const nextPage = await orderRepo.findByUserIdPaginated(userId, {
    limit: 20,
    startAfter: result.lastDoc,
  });
}
```

## ⚠️ 旧FirestoreServiceの非推奨化

`services/firebase/firestoreService.ts` は **非推奨** です。

### 推奨される移行方法

**ServiceContextを使用（最も推奨）:**

```typescript
import { useFirestoreService } from '@/context/ServiceContext';

const MyComponent: React.FC = () => {
  const firestoreService = useFirestoreService();

  const loadOrders = async () => {
    const orders = await firestoreService.getUserOrders(userId);
    // ...
  };
};
```

**Facadeを直接インスタンス化:**

```typescript
import { getFirebaseFirestore } from '@/services/firebase/config';
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';

const db = getFirebaseFirestore();
const facade = new FirestoreServiceFacade(db);
const orders = await facade.getUserOrders(userId);
```

## 🔄 段階的移行戦略

### Phase 1: Facade経由で使用（現在）

既存のコードを変更せずに、内部的には新しいRepositoryを使用:

```typescript
// 既存のFirestoreService.tsはそのまま（非推奨だが動作する）
// 新しいコードではFirestoreServiceFacadeを使用
const facade = new FirestoreServiceFacade(db);
```

### Phase 2: 既存コードの移行（次のステップ）

1. カスタムフックを更新
2. コンポーネントを更新
3. 古いFirestoreService.tsを段階的に削除

### Phase 3: 直接Repository使用（最終形態）

Facade層を削除し、Repositoryを直接使用:

```typescript
// カスタムフックで使用
const useOrders = (userId: string) => {
  const db = getFirebaseFirestore();
  const orderRepo = useMemo(() => new OrderRepository(db), [db]);

  const loadOrders = useCallback(async () => {
    return orderRepo.findByUserId(userId);
  }, [orderRepo, userId]);

  // ...
};
```

## 🧪 テスト

各Repositoryには包括的なユニットテストが含まれています:

```bash
# 全てのテストを実行
npm test

# 特定のRepositoryのテストのみ
npm test -- OrderRepository
npm test -- FirestoreServiceFacade

# カバレッジ付き
npm run test:coverage
```

## 📊 利点

### 関心の分離
- 各Repositoryは単一の責務のみを持つ
- 1つのドメインの変更が他に影響しない

### テスト容易性
- 各Repositoryを個別にテスト可能
- モックを使った単体テストが簡単

### 保守性
- コードが小さく、理解しやすい
- バグの特定が容易

### 拡張性
- 新しい機能の追加が容易
- 既存コードへの影響が最小限

## 🔗 関連ドキュメント

- [プロジェクト概要](../../../docs/00-PROJECT-OVERVIEW.md)
- [テスト戦略ガイド](../../../docs/05-TESTING-GUIDE.md)
- [リファクタリング計画](../../../docs/rfcs/001-comprehensive-refactoring-plan.md)
- [進捗状況](../../../REFACTORING_PROGRESS.md)
