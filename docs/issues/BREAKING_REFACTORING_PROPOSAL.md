# 破壊的リファクタリング提案書

## 概要

本提案書は、配分表テンプレート作成ツールの根本的な構造改善を目的とした「破壊的リファクタリング」の計画です。

**破壊的リファクタリングとは:**
- 既存のAPIやインターフェースの互換性を維持しない大規模な変更
- アーキテクチャレベルの再設計
- 技術スタックの刷新

---

## 提案の背景

### 現状の限界

```
┌─────────────────────────────────────────────────────────────────┐
│                     現在のアーキテクチャの問題                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. モノリシックなページコンポーネント                           │
│     └→ 2000行超のファイルが複数存在                              │
│     └→ 部分的な修正が困難                                        │
│                                                                  │
│  2. 状態管理の分散                                               │
│     └→ Zustand + React Hook Form + Context が混在               │
│     └→ データフローが複雑                                        │
│                                                                  │
│  3. オフライン/オンライン同期の複雑さ                            │
│     └→ IndexedDB ↔ Firestore 同期ロジックが散在                 │
│     └→ 無限ループ防止のための ref 多用                           │
│                                                                  │
│  4. テスト容易性の欠如                                           │
│     └→ UIとロジックの密結合                                      │
│     └→ モックが困難                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### なぜ破壊的リファクタリングが必要か

段階的なリファクタリングでは解決できない問題:

1. **状態管理の統一** - 部分的な変更では一貫性が保てない
2. **データ同期の抜本的改善** - 現在の設計では限界がある
3. **テスト基盤の確立** - 現在の構造ではテストが書きにくい

---

## 提案1: Feature-Sliced Design への移行

### 概要

機能単位でコードを分割する「Feature-Sliced Design」アーキテクチャへの移行

### 現在の構造

```
src/
├── components/     # 全コンポーネント
├── hooks/          # 全フック
├── services/       # 全サービス
├── pages/          # 全ページ
└── stores/         # 全ストア
```

### 提案する構造

```
src/
├── app/                          # アプリケーション設定
│   ├── providers/                # コンテキストプロバイダー
│   ├── routes/                   # ルーティング
│   └── styles/                   # グローバルスタイル
│
├── features/                     # 機能単位モジュール
│   ├── order/                    # 注文機能
│   │   ├── components/           # 注文固有のコンポーネント
│   │   ├── hooks/                # 注文固有のフック
│   │   ├── services/             # 注文固有のサービス
│   │   ├── stores/               # 注文固有のストア
│   │   ├── types/                # 注文固有の型
│   │   └── index.ts              # パブリックAPI
│   │
│   ├── allocation/               # 配分機能
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.ts
│   │
│   ├── history/                  # 履歴機能
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   └── auth/                     # 認証機能
│       ├── components/
│       ├── hooks/
│       └── index.ts
│
├── shared/                       # 共有モジュール
│   ├── ui/                       # 共通UIコンポーネント
│   ├── lib/                      # ユーティリティ
│   ├── api/                      # APIクライアント
│   └── hooks/                    # 共通フック
│
├── entities/                     # ビジネスエンティティ
│   ├── product/                  # 商品エンティティ
│   ├── store/                    # 店舗エンティティ
│   └── supplier/                 # 帳合先エンティティ
│
└── pages/                        # ページ（features の組み合わせ）
    ├── NewOrderPage.tsx
    ├── AllocationHistoryPage.tsx
    └── LoginPage.tsx
```

### メリット

- 機能単位での開発・テスト・デプロイが可能
- 依存関係が明確
- チーム開発での衝突が減少
- 機能の追加・削除が容易

### 移行工数

| 項目 | 工数 |
|------|------|
| ディレクトリ構造の再編成 | 中 |
| import パスの全面書き換え | 大 |
| 循環依存の解消 | 中 |
| テストの修正 | 中 |

---

## 提案2: 状態管理の統一

### 現状の問題

```
現在の状態管理:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Zustand   │  │ React Hook  │  │  Context    │
│   Store     │  │    Form     │  │   API       │
└─────────────┘  └─────────────┘  └─────────────┘
      ↓               ↓               ↓
   グローバル       フォーム        認証・テーマ
   状態           バリデーション    設定

問題:
- どこに状態を置くべきか判断が難しい
- 状態の同期が複雑
- デバッグが困難
```

### 提案A: TanStack Query + Zustand 統一パターン

```typescript
// サーバー状態: TanStack Query
const { data: orders } = useQuery({
  queryKey: ['orders'],
  queryFn: () => orderService.getAll(),
});

// クライアント状態: Zustand (UIのみ)
const useUIStore = create((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

// フォーム状態: React Hook Form (フォームのみ)
const { register, handleSubmit } = useForm<OrderForm>();
```

### 提案B: 統合ストアパターン

```typescript
// 単一のZustandストアで全状態を管理
interface AppState {
  // UI状態
  ui: {
    sidebarOpen: boolean;
    currentStep: number;
  };

  // データ状態
  orders: Order[];
  products: Product[];

  // フォーム状態
  orderForm: OrderFormData;

  // アクション
  actions: {
    setStep: (step: number) => void;
    addProduct: (product: Product) => void;
    submitOrder: () => Promise<void>;
  };
}

// ミドルウェアでFirestoreと自動同期
const useStore = create<AppState>()(
  persist(
    subscribeWithSelector(
      immer((set, get) => ({
        // 実装
      }))
    ),
    { name: 'app-storage' }
  )
);
```

---

## 提案3: オフライン/オンライン同期の再設計

### 現状の問題

```typescript
// 現在のuseDataSync.ts
// 問題: 無限ループ防止のためのref多用
const showSuccessRef = useRef(showSuccess);
useEffect(() => {
  showSuccessRef.current = showSuccess;
}, [showSuccess]);

// 問題: 同期ロジックが複雑
const syncIndexedDBToFirestore = async () => {
  // 200行以上の同期ロジック
};
```

### 提案: Service Worker + Background Sync

```typescript
// 新しいアーキテクチャ
┌─────────────────────────────────────────────────────────────────┐
│                         App (React)                              │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │  SyncManager    │                          │
│                    │  (フロントエンド) │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
├─────────────────────────────┼────────────────────────────────────┤
│                             ▼                                    │
│                    ┌─────────────────┐                          │
│                    │ Service Worker  │                          │
│                    │ (バックグラウンド) │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│              ┌──────────────┴──────────────┐                    │
│              ▼                             ▼                    │
│     ┌─────────────────┐           ┌─────────────────┐          │
│     │   IndexedDB     │           │   Firestore     │          │
│     │   (ローカル)     │ ←─同期─→  │   (クラウド)     │          │
│     └─────────────────┘           └─────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 実装案

```typescript
// services/sync/SyncManager.ts
export class SyncManager {
  private syncQueue: SyncQueue;
  private conflictResolver: ConflictResolver;

  async enqueue(operation: SyncOperation): Promise<void> {
    await this.syncQueue.add(operation);

    if (navigator.onLine) {
      await this.processQueue();
    } else {
      // Service Worker に登録
      await navigator.serviceWorker.ready;
      await registration.sync.register('sync-data');
    }
  }

  private async processQueue(): Promise<void> {
    const operations = await this.syncQueue.getAll();

    for (const op of operations) {
      try {
        await this.executeOperation(op);
        await this.syncQueue.remove(op.id);
      } catch (error) {
        if (error instanceof ConflictError) {
          await this.conflictResolver.resolve(op, error.serverData);
        }
      }
    }
  }
}

// sw.ts (Service Worker)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncManager.processQueue());
  }
});
```

---

## 提案4: マイクロフロントエンド化

### 概要

機能を独立したモジュールとして分離し、独立したデプロイを可能にする

### 構成

```
┌─────────────────────────────────────────────────────────────────┐
│                         Host App (shell)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      Header / Navigation                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Order MFE  │  │ History MFE │  │ Settings MFE│             │
│  │  (独立)      │  │  (独立)      │  │  (独立)      │             │
│  │             │  │             │  │             │             │
│  │  /new-order │  │  /history   │  │  /settings  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

各MFEは:
- 独立してビルド・デプロイ可能
- 独自の技術スタックを選択可能
- 独立したテスト
```

### Module Federation 設定

```javascript
// vite.config.ts (Host)
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'host',
      remotes: {
        order: 'http://localhost:3001/assets/remoteEntry.js',
        history: 'http://localhost:3002/assets/remoteEntry.js',
      },
    }),
  ],
});

// vite.config.ts (Order MFE)
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'order',
      filename: 'remoteEntry.js',
      exposes: {
        './NewOrderPage': './src/pages/NewOrderPage.tsx',
      },
    }),
  ],
});
```

### メリット

- 機能単位での独立デプロイ
- チームごとに独立した開発サイクル
- 部分的な技術スタック更新が可能

### デメリット

- 初期設定が複雑
- 共有状態の管理が難しい
- バンドルサイズの増加リスク

---

## 提案5: バックエンドのモダナイゼーション

### 現状

```
FastAPI + 同期処理
├── 単一プロセス
├── ファイル生成は同期的
└── 全ファイルメモリ読み込み
```

### 提案: 非同期 + ジョブキュー

```
┌─────────────────────────────────────────────────────────────────┐
│                      新アーキテクチャ                            │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  FastAPI    │───▶│   Redis     │───▶│   Worker    │         │
│  │  (API)      │    │   Queue     │    │  (Celery)   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│        │                                      │                 │
│        │                                      │                 │
│        ▼                                      ▼                 │
│  ┌─────────────┐                      ┌─────────────┐          │
│  │  PostgreSQL │                      │    S3/GCS   │          │
│  │  (メタデータ) │                      │  (ファイル)  │          │
│  └─────────────┘                      └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 実装案

```python
# api/routes.py
@router.post("/generate-template")
async def generate_template(request: TemplateRequest):
    # ジョブをキューに追加
    job_id = await task_queue.enqueue(
        "generate_excel",
        request.dict()
    )

    return {"job_id": job_id, "status": "pending"}

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = await task_queue.get_job(job_id)

    if job.status == "completed":
        return {
            "status": "completed",
            "download_url": job.result["url"]
        }

    return {"status": job.status, "progress": job.progress}

# worker/tasks.py
@celery.task
def generate_excel(data: dict):
    request = TemplateRequest(**data)

    # Excel生成（時間がかかる処理）
    excel_path = ExcelService.create_template(request)

    # S3にアップロード
    url = storage.upload(excel_path)

    return {"url": url}
```

---

## 移行戦略

### ストラングラーパターン

既存システムを徐々に新システムに置き換える

```
Phase 1: 新旧並行運用
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │   旧システム       │ ←────→  │   新システム       │            │
│  │   (メイン)        │         │   (一部機能)      │            │
│  └──────────────────┘         └──────────────────┘            │
└─────────────────────────────────────────────────────────────────┘

Phase 2: 新システムへ移行
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │   旧システム       │         │   新システム       │            │
│  │   (縮小)         │ ────→   │   (メイン)        │            │
│  └──────────────────┘         └──────────────────┘            │
└─────────────────────────────────────────────────────────────────┘

Phase 3: 完全移行
┌─────────────────────────────────────────────────────────────────┐
│                      ┌──────────────────┐                      │
│                      │   新システム       │                      │
│                      │   (完全移行)      │                      │
│                      └──────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 長期間の開発停止 | 高 | ストラングラーパターンで段階的移行 |
| 学習コスト | 中 | ドキュメント整備、ペアプログラミング |
| 既存機能のデグレ | 高 | E2Eテストの先行整備 |
| 工数超過 | 高 | フェーズごとのマイルストーン設定 |

---

## 推奨アプローチ

### 短期（即対応可能）

| 提案 | 採用 | 理由 |
|------|------|------|
| 提案2A: TanStack Query統一 | ○ | 段階的に導入可能 |
| 提案3: 同期再設計 | △ | 部分的に採用可能 |

### 中期

| 提案 | 採用 | 理由 |
|------|------|------|
| 提案1: Feature-Sliced Design | ○ | 構造改善に効果的 |
| 提案5: バックエンド非同期化 | ○ | パフォーマンス改善 |

### 長期検討

| 提案 | 採用 | 理由 |
|------|------|------|
| 提案4: マイクロフロントエンド | △ | チーム拡大時に検討 |

---

## 結論

現時点では以下の順序での破壊的リファクタリングを推奨:

1. **Feature-Sliced Design への移行** - コード構造の根本改善
2. **状態管理の統一** - データフローの簡素化
3. **同期機構の再設計** - 信頼性の向上
4. **バックエンド非同期化** - パフォーマンス改善

これらを段階的に実施することで、システムの保守性と拡張性を大幅に向上させることができます。
