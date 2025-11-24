import {
  Firestore,

  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { FirestoreBaseService } from '../base/FirestoreBaseService';

/**
 * メールアドレス帳エンティティ
 */
export interface EmailAddress {
  id?: string;
  userId: string;
  name: string;
  email: string;
  displayOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Firestore保存形式
 */
interface FirestoreEmailAddress {
  userId: string;
  name: string;
  email: string;
  displayOrder?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * メールアドレス帳Repository
 *
 * メールアドレス帳の管理を担当
 * ユーザーごとに複数のアドレスを保存し、表示順序を管理
 *
 * @example
 * ```typescript
 * const emailRepo = new EmailAddressRepository(firestore);
 *
 * // アドレスを保存
 * const addressId = await emailRepo.save({
 *   userId: 'user-123',
 *   name: '田中太郎',
 *   email: 'tanaka@example.com',
 * });
 *
 * // アドレス帳一覧を取得（displayOrderでソート）
 * const addresses = await emailRepo.findByUserId('user-123');
 *
 * // リアルタイム購読
 * const unsubscribe = emailRepo.subscribeToAddresses(
 *   'user-123',
 *   (addresses) => console.log('Updated:', addresses),
 *   (error) => console.error(error)
 * );
 *
 * // 並び順を更新
 * await emailRepo.reorder([
 *   { id: 'address-1', displayOrder: 0 },
 *   { id: 'address-2', displayOrder: 1 },
 * ]);
 *
 * // アドレスを更新
 * await emailRepo.updateAddress('address-1', '田中花子', 'hanako@example.com');
 *
 * // 購読解除
 * unsubscribe();
 * ```
 */
export class EmailAddressRepository extends FirestoreBaseService<
  EmailAddress,
  FirestoreEmailAddress
> {
  constructor(db: Firestore) {
    super('email_addresses', db);
  }

  /**
   * EmailAddress → Firestore形式に変換
   */
  toFirestoreFormat(address: EmailAddress): FirestoreEmailAddress {
    return {
      userId: address.userId,
      name: address.name,
      email: address.email,
      displayOrder: address.displayOrder,
      createdAt: address.createdAt ? Timestamp.fromDate(address.createdAt) : Timestamp.now(),
      updatedAt: address.updatedAt ? Timestamp.fromDate(address.updatedAt) : Timestamp.now(),
    };
  }

  /**
   * Firestore形式 → EmailAddress に変換
   */
  fromFirestoreFormat(data: FirestoreEmailAddress, id: string): EmailAddress {
    return {
      id,
      userId: data.userId,
      name: data.name,
      email: data.email,
      displayOrder: data.displayOrder,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }

  /**
   * ユーザーのアドレス帳一覧を取得
   *
   * displayOrderでソート（設定されていない場合は作成日時順）
   *
   * @param userId - ユーザーID
   * @returns アドレス配列
   */
  async findByUserId(userId: string): Promise<EmailAddress[]> {
    const ref = this.getCollectionRef();
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));

    const addresses = await this.executeQuery(q);

    // displayOrderでソート（設定されていない場合は最後に）
    addresses.sort((a, b) => {
      if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
        return a.displayOrder - b.displayOrder;
      }
      if (a.displayOrder !== undefined) return -1;
      if (b.displayOrder !== undefined) return 1;
      return 0;
    });

    console.log(
      `[${this.collectionName}] Retrieved ${addresses.length} addresses for user ${userId}`
    );
    return addresses;
  }

  /**
   * アドレス帳一覧をリアルタイムで監視
   *
   * @param userId - ユーザーID
   * @param onSuccess - データ更新時のコールバック
   * @param onError - エラー発生時のコールバック
   * @returns アンサブスクライブ関数
   *
   * @example
   * ```typescript
   * const unsubscribe = emailRepo.subscribeToAddresses(
   *   'user-123',
   *   (addresses) => {
   *     console.log('Addresses updated:', addresses);
   *   },
   *   (error) => {
   *     console.error('Subscription error:', error);
   *   }
   * );
   *
   * // コンポーネントのクリーンアップ時
   * useEffect(() => {
   *   return () => unsubscribe();
   * }, []);
   * ```
   */
  subscribeToAddresses(
    userId: string,
    onSuccess: (addresses: EmailAddress[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const ref = this.getCollectionRef();
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const addresses: EmailAddress[] = [];

        snapshot.forEach((doc) => {
          try {
            const address = this.fromFirestoreFormat(
              doc.data() as FirestoreEmailAddress,
              doc.id
            );
            addresses.push(address);
          } catch (error) {
            console.error(`[${this.collectionName}] Error converting document ${doc.id}:`, error);
          }
        });

        // displayOrderでソート
        addresses.sort((a, b) => {
          if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
            return a.displayOrder - b.displayOrder;
          }
          if (a.displayOrder !== undefined) return -1;
          if (b.displayOrder !== undefined) return 1;
          return 0;
        });

        onSuccess(addresses);
      },
      (error) => {
        onError(error as Error);
      }
    );

    return unsubscribe;
  }

  /**
   * アドレス帳の並び順を更新
   *
   * @param reorderedItems - 並び替え後のアイテム配列（IDとdisplayOrderのペア）
   *
   * @example
   * ```typescript
   * // ドラッグ&ドロップ後の並び順を反映
   * await emailRepo.reorder([
   *   { id: 'address-3', displayOrder: 0 },
   *   { id: 'address-1', displayOrder: 1 },
   *   { id: 'address-2', displayOrder: 2 },
   * ]);
   * ```
   */
  async reorder(reorderedItems: Array<{ id: string; displayOrder: number }>): Promise<void> {
    const updates = reorderedItems.map(async (item) => {
      const docRef = this.getDocRef(item.id);
      await updateDoc(docRef, {
        displayOrder: item.displayOrder,
        updatedAt: Timestamp.now(),
      });
    });

    await Promise.all(updates);

    console.log(`[${this.collectionName}] Reordered ${reorderedItems.length} addresses`);
  }

  /**
   * アドレスを更新
   *
   * @param addressId - アドレスID
   * @param name - 表示名
   * @param email - メールアドレス
   */
  async updateAddress(addressId: string, name: string, email: string): Promise<void> {
    const docRef = this.getDocRef(addressId);

    await updateDoc(docRef, {
      name,
      email,
      updatedAt: Timestamp.now(),
    });

    console.log(`[${this.collectionName}] Updated address ${addressId}: ${name} (${email})`);
  }
}
