import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Query,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';

/**
 * Firestore Repository の抽象基底クラス
 *
 * 共通のCRUD操作を提供し、各Repository実装で継承して使用する。
 *
 * @template T - エンティティの型
 * @template F - Firestore保存形式の型（デフォルトはany）
 *
 * @example
 * ```typescript
 * export class OrderRepository extends FirestoreBaseService<Order, FirestoreOrder> {
 *   constructor(db: Firestore) {
 *     super('orders', db);
 *   }
 *
 *   toFirestoreFormat(order: Order): FirestoreOrder {
 *     return {
 *       userId: order.userId,
 *       delivery_date: format(order.deliveryDate, 'yyyy-MM-dd'),
 *       // ...
 *     };
 *   }
 *
 *   fromFirestoreFormat(data: FirestoreOrder, id: string): Order {
 *     return {
 *       id,
 *       userId: data.userId,
 *       deliveryDate: new Date(data.delivery_date),
 *       // ...
 *     };
 *   }
 * }
 * ```
 */
export abstract class FirestoreBaseService<T, F = any> {
  protected collectionName: string;
  protected db: Firestore;

  /**
   * @param collectionName - Firestoreコレクション名
   * @param db - Firestoreインスタンス
   */
  constructor(collectionName: string, db: Firestore) {
    this.collectionName = collectionName;
    this.db = db;
  }

  /**
   * エンティティをFirestore保存形式に変換
   *
   * 各Repositoryで実装必須
   */
  abstract toFirestoreFormat(entity: T): F;

  /**
   * Firestore保存形式からエンティティに変換
   *
   * 各Repositoryで実装必須
   */
  abstract fromFirestoreFormat(data: F, id: string): T;

  /**
   * エンティティを保存
   *
   * @param entity - 保存するエンティティ
   * @returns 生成されたドキュメントID
   */
  async save(entity: T): Promise<string> {
    const ref = collection(this.db, this.collectionName);
    const data = this.toFirestoreFormat(entity);

    const docRef = await addDoc(ref, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log(`[${this.collectionName}] Document created: ${docRef.id}`);
    return docRef.id;
  }

  /**
   * IDでエンティティを検索
   *
   * @param id - ドキュメントID
   * @returns エンティティ、存在しない場合はnull
   */
  async findById(id: string): Promise<T | null> {
    const docRef = doc(this.db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log(`[${this.collectionName}] Document not found: ${id}`);
      return null;
    }

    return this.fromFirestoreFormat(docSnap.data() as F, docSnap.id);
  }

  /**
   * エンティティを更新
   *
   * @param id - ドキュメントID
   * @param entity - 更新するエンティティ
   */
  async update(id: string, entity: T): Promise<void> {
    const docRef = doc(this.db, this.collectionName, id);
    const data = this.toFirestoreFormat(entity);

    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });

    console.log(`[${this.collectionName}] Document updated: ${id}`);
  }

  /**
   * エンティティを削除
   *
   * @param id - ドキュメントID
   */
  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, this.collectionName, id);
    await deleteDoc(docRef);

    console.log(`[${this.collectionName}] Document deleted: ${id}`);
  }

  /**
   * クエリを実行してエンティティリストを取得
   *
   * @param q - Firestoreクエリ
   * @returns エンティティの配列
   */
  protected async executeQuery(q: Query): Promise<T[]> {
    const snapshot = await getDocs(q);
    const results: T[] = [];

    snapshot.forEach((doc) => {
      try {
        const entity = this.fromFirestoreFormat(doc.data() as F, doc.id);
        results.push(entity);
      } catch (error) {
        console.error(
          `[${this.collectionName}] Error converting document ${doc.id}:`,
          error
        );
      }
    });

    console.log(
      `[${this.collectionName}] Query executed: ${results.length} results`
    );
    return results;
  }

  /**
   * コレクション参照を取得
   */
  protected getCollectionRef() {
    return collection(this.db, this.collectionName);
  }

  /**
   * ドキュメント参照を取得
   *
   * @param id - ドキュメントID
   */
  protected getDocRef(id: string) {
    return doc(this.db, this.collectionName, id);
  }
}

/**
 * ページネーション結果
 */
export interface PaginatedResult<T> {
  /** アイテムリスト */
  items: T[];
  /** 次のページがあるか */
  hasMore: boolean;
  /** 最後のドキュメント（次ページ取得用） */
  lastDoc?: DocumentSnapshot;
}

/**
 * クエリオプション
 */
export interface QueryOptions {
  /** 取得件数制限 */
  limit?: number;
  /** 開始位置（前回の最後のドキュメント） */
  startAfter?: DocumentSnapshot;
  /** ソートフィールド */
  orderBy?: string;
  /** ソート方向 */
  direction?: 'asc' | 'desc';
}
