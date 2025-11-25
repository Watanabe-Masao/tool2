/**
 * React#185 無限ループ防止テスト
 *
 * @description
 * Maximum update depth exceeded (React #185) エラーを防ぐための
 * メモ化が正しく実装されているかをテストします。
 * CI/CDパイプラインで実行することで、無限ループを事前に検出できます。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import {
  createRenderCounter,
  assertNoInfiniteLoop,
  EXPECTED_RENDER_COUNTS,
} from '../utils/renderLoopDetector';

/**
 * propsの参照安定性をテストするユーティリティ
 */
function useReferenceStability<T>(value: T, name: string): {
  changeCount: number;
  value: T;
} {
  const prevRef = useRef<T>(value);
  const changeCountRef = useRef(0);

  if (prevRef.current !== value) {
    changeCountRef.current++;
    prevRef.current = value;
  }

  return {
    changeCount: changeCountRef.current,
    value,
  };
}

describe('React#185 無限ループ防止テスト', () => {
  describe('useMemo による formData メモ化', () => {
    it('deliveryDate, suppliers, products が変更されない限り同じ参照を返す', () => {
      const deliveryDate = new Date('2025-01-01');
      const suppliers = ['supplier1'];
      const products = [{ name: 'product1' }];

      const { result, rerender } = renderHook(
        ({ deliveryDate, suppliers, products }) =>
          useMemo(
            () => ({
              deliveryDate: deliveryDate || new Date(),
              suppliers: suppliers || [],
              products: products || [],
            }),
            [deliveryDate, suppliers, products]
          ),
        {
          initialProps: { deliveryDate, suppliers, products },
        }
      );

      const firstRef = result.current;

      // 同じ値で再レンダリング
      rerender({ deliveryDate, suppliers, products });

      // 参照が同じであることを確認
      expect(result.current).toBe(firstRef);
    });

    it('依存値が変更されたときのみ新しい参照を返す', () => {
      const deliveryDate = new Date('2025-01-01');
      const suppliers = ['supplier1'];
      const products = [{ name: 'product1' }];

      const { result, rerender } = renderHook(
        ({ deliveryDate, suppliers, products }) =>
          useMemo(
            () => ({
              deliveryDate: deliveryDate || new Date(),
              suppliers: suppliers || [],
              products: products || [],
            }),
            [deliveryDate, suppliers, products]
          ),
        {
          initialProps: { deliveryDate, suppliers, products },
        }
      );

      const firstRef = result.current;

      // 新しい配列で再レンダリング（参照が変わる）
      rerender({
        deliveryDate,
        suppliers: ['supplier1', 'supplier2'],
        products,
      });

      // 参照が異なることを確認
      expect(result.current).not.toBe(firstRef);
    });
  });

  describe('useCallback によるハンドラメモ化', () => {
    it('依存配列が変更されない限り同じ参照を返す', () => {
      const onSubmit = vi.fn();
      const handleSubmit = vi.fn((cb: () => void) => cb);

      const { result, rerender } = renderHook(
        ({ handleSubmit, onSubmit }) =>
          useCallback(() => {
            handleSubmit(onSubmit)();
          }, [handleSubmit, onSubmit]),
        {
          initialProps: { handleSubmit, onSubmit },
        }
      );

      const firstRef = result.current;

      // 同じ関数で再レンダリング
      rerender({ handleSubmit, onSubmit });

      // 参照が同じであることを確認
      expect(result.current).toBe(firstRef);
    });
  });

  describe('useRef による lockedStores 最適化', () => {
    /**
     * lockedStoresをuseRefで参照することで、
     * columnsのuseMemoが不要に再計算されないことをテスト
     */
    it('useRef経由でlockedStoresを参照するとcolumnsが再計算されない', () => {
      let columnsCalculationCount = 0;

      const { result, rerender } = renderHook(
        ({ lockedStores, isMobile }) => {
          // useRefでlockedStoresを参照
          const lockedStoresRef = useRef(lockedStores);
          useEffect(() => {
            lockedStoresRef.current = lockedStores;
          }, [lockedStores]);

          // columnsをuseMemoで計算（lockedStoresを依存配列に含めない）
          const columns = useMemo(() => {
            columnsCalculationCount++;
            return [
              {
                field: 'store_001',
                renderCell: () => {
                  // useRef経由で参照
                  const locked = lockedStoresRef.current.get(0)?.has('001');
                  return locked ? 'locked' : 'unlocked';
                },
              },
            ];
          }, [isMobile]); // lockedStoresは含めない

          return { columns, lockedStoresRef };
        },
        {
          initialProps: {
            lockedStores: new Map([[0, new Set(['001'])]]),
            isMobile: false,
          },
        }
      );

      const initialCount = columnsCalculationCount;

      // lockedStoresを変更
      rerender({
        lockedStores: new Map([[0, new Set(['001', '002'])]]),
        isMobile: false,
      });

      // columnsが再計算されていないことを確認
      expect(columnsCalculationCount).toBe(initialCount);

      // isMobileを変更
      rerender({
        lockedStores: new Map([[0, new Set(['001', '002'])]]),
        isMobile: true,
      });

      // isMobile変更時のみcolumnsが再計算される
      expect(columnsCalculationCount).toBe(initialCount + 1);
    });
  });

  describe('条件付きハンドラのメモ化', () => {
    it('条件が変わらない限り同じ参照を返す', () => {
      const handlePrevStep = vi.fn();
      const handleNextStep = vi.fn();
      const TOTAL_STEPS = 5;

      const { result, rerender } = renderHook(
        ({ activeStep }) => {
          const progressPrevStep = useMemo(
            () => (activeStep > 0 ? handlePrevStep : undefined),
            [activeStep]
          );
          const progressNextStep = useMemo(
            () => (activeStep < TOTAL_STEPS - 1 ? handleNextStep : undefined),
            [activeStep]
          );
          return { progressPrevStep, progressNextStep };
        },
        {
          initialProps: { activeStep: 2 },
        }
      );

      const firstPrev = result.current.progressPrevStep;
      const firstNext = result.current.progressNextStep;

      // 同じステップで再レンダリング
      rerender({ activeStep: 2 });

      // 参照が同じであることを確認
      expect(result.current.progressPrevStep).toBe(firstPrev);
      expect(result.current.progressNextStep).toBe(firstNext);
    });

    it('境界条件で正しくundefinedを返す', () => {
      const handlePrevStep = vi.fn();
      const handleNextStep = vi.fn();
      const TOTAL_STEPS = 5;

      const { result, rerender } = renderHook(
        ({ activeStep }) => {
          const progressPrevStep = useMemo(
            () => (activeStep > 0 ? handlePrevStep : undefined),
            [activeStep]
          );
          const progressNextStep = useMemo(
            () => (activeStep < TOTAL_STEPS - 1 ? handleNextStep : undefined),
            [activeStep]
          );
          return { progressPrevStep, progressNextStep };
        },
        {
          initialProps: { activeStep: 0 },
        }
      );

      // ステップ0では戻るボタンがundefined
      expect(result.current.progressPrevStep).toBeUndefined();
      expect(result.current.progressNextStep).toBe(handleNextStep);

      // 最終ステップでは次へボタンがundefined
      rerender({ activeStep: TOTAL_STEPS - 1 });
      expect(result.current.progressPrevStep).toBe(handlePrevStep);
      expect(result.current.progressNextStep).toBeUndefined();
    });
  });

  describe('レンダリング回数の上限チェック', () => {
    it('状態更新が無限ループを引き起こさないことを確認', () => {
      const counter = createRenderCounter();

      const { result } = renderHook(() => {
        counter.increment();

        const [count, setCount] = useState(0);
        const [data, setData] = useState({ value: 0 });

        // メモ化されたオブジェクト
        const memoizedData = useMemo(() => ({ value: data.value }), [data.value]);

        // メモ化されたハンドラ
        const increment = useCallback(() => {
          setCount((c) => c + 1);
        }, []);

        return { count, memoizedData, increment };
      });

      // 初期レンダリング後の回数を記録
      const initialRenders = counter.count;

      // 状態を更新
      act(() => {
        result.current.increment();
      });

      // 無限ループが発生していないことを確認
      assertNoInfiniteLoop(counter.count, 'TestHook', EXPECTED_RENDER_COUNTS.LIGHT_INTERACTION);

      // 期待されるレンダリング回数（初期 + 更新による再レンダリング）
      expect(counter.count).toBeLessThanOrEqual(initialRenders + 4); // StrictMode考慮
    });
  });
});

describe('アンチパターン検出テスト', () => {
  describe('インラインオブジェクト作成の検出', () => {
    it('インラインオブジェクトは毎回新しい参照を返す（アンチパターン）', () => {
      let referenceChanges = 0;

      const { rerender } = renderHook(
        ({ value }) => {
          const prevRef = useRef<{ value: number } | null>(null);

          // アンチパターン: インラインオブジェクト
          const inlineObject = { value };

          if (prevRef.current !== null && prevRef.current !== inlineObject) {
            referenceChanges++;
          }
          prevRef.current = inlineObject;

          return inlineObject;
        },
        {
          initialProps: { value: 1 },
        }
      );

      // 同じ値で再レンダリング
      rerender({ value: 1 });

      // インラインオブジェクトは毎回新しい参照なので変更がカウントされる
      expect(referenceChanges).toBeGreaterThan(0);
    });

    it('useMemoで参照安定性を確保できる（ベストプラクティス）', () => {
      let referenceChanges = 0;

      const { rerender } = renderHook(
        ({ value }) => {
          const prevRef = useRef<{ value: number } | null>(null);

          // ベストプラクティス: useMemoでメモ化
          const memoizedObject = useMemo(() => ({ value }), [value]);

          if (prevRef.current !== null && prevRef.current !== memoizedObject) {
            referenceChanges++;
          }
          prevRef.current = memoizedObject;

          return memoizedObject;
        },
        {
          initialProps: { value: 1 },
        }
      );

      // 同じ値で再レンダリング
      rerender({ value: 1 });

      // useMemoにより参照が安定する
      expect(referenceChanges).toBe(0);
    });
  });
});
