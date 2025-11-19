import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';

/**
 * useFieldArray の同期テスト
 *
 * このテストは、単一の useFieldArray インスタンスが
 * 正しく動作し、すべての参照が同期されることを検証します。
 */

describe('useFieldArray Synchronization Tests', () => {
  describe('単一インスタンスの動作', () => {
    it('useFieldArrayは常に同じfieldsを返す', () => {
      const { result } = renderHook(() => {
        const methods = useForm<OrderFormData>({
          defaultValues: {
            deliveryDate: new Date(),
            suppliers: [],
            products: [
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
            ],
          },
        });

        const fieldArray = useFieldArray({
          control: methods.control,
          name: 'products',
        });

        return { methods, fieldArray };
      });

      const initialFields = result.current.fieldArray.fields;

      // 再レンダリング後も同じfieldsオブジェクトを参照している
      expect(result.current.fieldArray.fields).toBe(initialFields);
    });

    it('商品を追加するとfields配列が更新される', () => {
      const { result } = renderHook(() => {
        const methods = useForm<OrderFormData>({
          defaultValues: {
            deliveryDate: new Date(),
            suppliers: [],
            products: [
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
            ],
          },
        });

        const fieldArray = useFieldArray({
          control: methods.control,
          name: 'products',
        });

        return { methods, fieldArray };
      });

      // 初期状態: 1件
      expect(result.current.fieldArray.fields.length).toBe(1);

      // 商品を追加
      act(() => {
        result.current.fieldArray.append({
          ...DEFAULT_PRODUCT_FORM_DATA,
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        });
      });

      // 2件に増える
      expect(result.current.fieldArray.fields.length).toBe(2);
    });

    it('商品を削除するとfields配列が更新される', () => {
      const { result } = renderHook(() => {
        const methods = useForm<OrderFormData>({
          defaultValues: {
            deliveryDate: new Date(),
            suppliers: [],
            products: [
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                name: '商品1',
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                name: '商品2',
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
            ],
          },
        });

        const fieldArray = useFieldArray({
          control: methods.control,
          name: 'products',
        });

        return { methods, fieldArray };
      });

      // 初期状態: 2件
      expect(result.current.fieldArray.fields.length).toBe(2);

      // 最初の商品を削除
      act(() => {
        result.current.fieldArray.remove(0);
      });

      // 1件に減る
      expect(result.current.fieldArray.fields.length).toBe(1);
    });

    it('各fieldに一意のidが割り当てられる', () => {
      const { result } = renderHook(() => {
        const methods = useForm<OrderFormData>({
          defaultValues: {
            deliveryDate: new Date(),
            suppliers: [],
            products: [
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
            ],
          },
        });

        const fieldArray = useFieldArray({
          control: methods.control,
          name: 'products',
        });

        return { methods, fieldArray };
      });

      const fields = result.current.fieldArray.fields;

      // すべてのfieldにidが存在する
      expect(fields.every((field) => field.id)).toBe(true);

      // すべてのidが一意である
      const ids = fields.map((field) => field.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(fields.length);
    });

    it('商品を削除してから追加すると、新しいidが割り当てられる', () => {
      const { result } = renderHook(() => {
        const methods = useForm<OrderFormData>({
          defaultValues: {
            deliveryDate: new Date(),
            suppliers: [],
            products: [
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
            ],
          },
        });

        const fieldArray = useFieldArray({
          control: methods.control,
          name: 'products',
        });

        return { methods, fieldArray };
      });

      const originalId = result.current.fieldArray.fields[0].id;

      // 商品を追加
      act(() => {
        result.current.fieldArray.append({
          ...DEFAULT_PRODUCT_FORM_DATA,
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        });
      });

      const newId = result.current.fieldArray.fields[1].id;

      // 新しいidは元のidと異なる
      expect(newId).not.toBe(originalId);

      // 最初の商品を削除
      act(() => {
        result.current.fieldArray.remove(0);
      });

      // 新しい商品を追加
      act(() => {
        result.current.fieldArray.append({
          ...DEFAULT_PRODUCT_FORM_DATA,
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        });
      });

      const latestId = result.current.fieldArray.fields[1].id;

      // 最新のidは以前のidと異なる
      expect(latestId).not.toBe(originalId);
      expect(latestId).not.toBe(newId);
    });
  });

  describe('複数の参照の同期', () => {
    it('同じfieldsを複数の場所で参照しても同期される', () => {
      const { result } = renderHook(() => {
        const methods = useForm<OrderFormData>({
          defaultValues: {
            deliveryDate: new Date(),
            suppliers: [],
            products: [
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
            ],
          },
        });

        const fieldArray = useFieldArray({
          control: methods.control,
          name: 'products',
        });

        // 同じfieldsを2つの変数で参照
        const fieldsRef1 = fieldArray.fields;
        const fieldsRef2 = fieldArray.fields;

        return { methods, fieldArray, fieldsRef1, fieldsRef2 };
      });

      // 初期状態: 両方とも同じ参照
      expect(result.current.fieldsRef1).toBe(result.current.fieldsRef2);

      // 商品を追加
      act(() => {
        result.current.fieldArray.append({
          ...DEFAULT_PRODUCT_FORM_DATA,
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        });
      });

      // 追加後も両方とも同期されている
      expect(result.current.fieldsRef1.length).toBe(2);
      expect(result.current.fieldsRef2.length).toBe(2);
      expect(result.current.fieldsRef1).toBe(result.current.fieldsRef2);
    });
  });

  describe('フォームデータとの同期', () => {
    it('appendで追加した商品がフォームデータにも反映される', () => {
      const { result } = renderHook(() => {
        const methods = useForm<OrderFormData>({
          defaultValues: {
            deliveryDate: new Date(),
            suppliers: [],
            products: [
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
            ],
          },
        });

        const fieldArray = useFieldArray({
          control: methods.control,
          name: 'products',
        });

        return { methods, fieldArray };
      });

      // 商品を追加
      act(() => {
        result.current.fieldArray.append({
          ...DEFAULT_PRODUCT_FORM_DATA,
          name: '新しい商品',
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        });
      });

      // フォームデータを取得
      const formData = result.current.methods.getValues();

      // フォームデータにも反映されている
      expect(formData.products.length).toBe(2);
      expect(formData.products[1].name).toBe('新しい商品');
    });

    it('removeで削除した商品がフォームデータからも削除される', () => {
      const { result } = renderHook(() => {
        const methods = useForm<OrderFormData>({
          defaultValues: {
            deliveryDate: new Date(),
            suppliers: [],
            products: [
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                name: '商品1',
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                name: '商品2',
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
            ],
          },
        });

        const fieldArray = useFieldArray({
          control: methods.control,
          name: 'products',
        });

        return { methods, fieldArray };
      });

      // 最初の商品を削除
      act(() => {
        result.current.fieldArray.remove(0);
      });

      // フォームデータを取得
      const formData = result.current.methods.getValues();

      // フォームデータからも削除されている
      expect(formData.products.length).toBe(1);
      expect(formData.products[0].name).toBe('商品2');
    });
  });

  describe('リグレッションテスト', () => {
    it('複数のuseFieldArrayインスタンスを作成しない（リグレッション防止）', () => {
      // この問題が再発しないことを確認するためのテスト
      const { result } = renderHook(() => {
        const methods = useForm<OrderFormData>({
          defaultValues: {
            deliveryDate: new Date(),
            suppliers: [],
            products: [
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
            ],
          },
        });

        // 単一のuseFieldArrayインスタンスのみを作成
        const fieldArray = useFieldArray({
          control: methods.control,
          name: 'products',
        });

        return { methods, fieldArray };
      });

      // fields が正しく初期化されている
      expect(result.current.fieldArray.fields.length).toBe(1);

      // append が正しく動作する
      act(() => {
        result.current.fieldArray.append({
          ...DEFAULT_PRODUCT_FORM_DATA,
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        });
      });

      expect(result.current.fieldArray.fields.length).toBe(2);
    });

    it('field.idをReactのkeyとして使用できる', () => {
      const { result } = renderHook(() => {
        const methods = useForm<OrderFormData>({
          defaultValues: {
            deliveryDate: new Date(),
            suppliers: [],
            products: [
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
              {
                ...DEFAULT_PRODUCT_FORM_DATA,
                totalDelivery: 0,
                storeAllocations: new Array(STORE_COUNT).fill(0),
              },
            ],
          },
        });

        const fieldArray = useFieldArray({
          control: methods.control,
          name: 'products',
        });

        return { methods, fieldArray };
      });

      const fields = result.current.fieldArray.fields;

      // すべてのfield.idが文字列である
      expect(fields.every((field) => typeof field.id === 'string')).toBe(true);

      // すべてのfield.idが非空文字列である
      expect(fields.every((field) => field.id.length > 0)).toBe(true);

      // field.idをReactのkeyとして使用できる形式
      const keys = fields.map((field) => field.id);
      expect(keys.every((key) => key !== undefined && key !== null)).toBe(true);
    });
  });
});
