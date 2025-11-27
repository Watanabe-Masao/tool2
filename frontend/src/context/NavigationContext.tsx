import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * ナビゲーションコンテキストの型定義
 */
interface NavigationContextType {
  /** 新規作成ページでステップナビゲーション表示中かどうか */
  isStepNavigationActive: boolean;
  /** 現在のステップ */
  activeStep: number;
  /** 総ステップ数 */
  totalSteps: number;
  /** フォームデータ */
  formData?: OrderFormData;
  /** 現在の商品インデックス（ステップ2-4で使用） */
  activeProductIndex?: number;
  /** 前のステップへ移動するハンドラー */
  onPrevStep?: () => void;
  /** 次のステップへ移動するハンドラー */
  onNextStep?: () => void;
  /** 商品切り替えハンドラー */
  onProductChange?: (index: number) => void;
  /** FloatingProgressSummaryの表示状態（モバイル用） */
  showProgressSummary: boolean;
  /** FloatingProgressSummaryの表示切り替え */
  toggleProgressSummary: () => void;
  /** ステップナビゲーション状態を設定 */
  setStepNavigation: (
    active: boolean,
    step?: number,
    total?: number,
    formData?: OrderFormData,
    activeProductIndex?: number,
    onPrev?: () => void,
    onNext?: () => void,
    onProductChange?: (index: number) => void
  ) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

/**
 * ナビゲーションコンテキストプロバイダー
 */
export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isStepNavigationActive, setIsStepNavigationActive] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [formData, setFormData] = useState<OrderFormData | undefined>(undefined);
  const [activeProductIndex, setActiveProductIndex] = useState<number | undefined>(undefined);
  const [showProgressSummary, setShowProgressSummary] = useState(false);

  // ハンドラーはrefで保持して状態更新による再レンダリングを防ぐ
  // NOTE: これにより無限ループ(React #185)を防止
  const onPrevStepRef = useRef<(() => void) | undefined>(undefined);
  const onNextStepRef = useRef<(() => void) | undefined>(undefined);
  const onProductChangeRef = useRef<((index: number) => void) | undefined>(undefined);

  const toggleProgressSummary = useCallback(() => {
    setShowProgressSummary((prev) => !prev);
  }, []);

  // setStepNavigationをuseCallbackでメモ化
  // NOTE: 依存配列が空なので、この関数参照は安定している
  const setStepNavigation = useCallback(
    (
      active: boolean,
      step: number = 0,
      total: number = 0,
      data?: OrderFormData,
      productIndex?: number,
      onPrev?: () => void,
      onNext?: () => void,
      onProdChange?: (index: number) => void
    ) => {
      setIsStepNavigationActive(active);
      setActiveStep(step);
      setTotalSteps(total);
      setFormData(data);
      setActiveProductIndex(productIndex);
      // refに保存するだけなので再レンダリングを引き起こさない
      onPrevStepRef.current = onPrev;
      onNextStepRef.current = onNext;
      onProductChangeRef.current = onProdChange;
    },
    []
  );

  // refから関数を呼び出すラッパー関数
  const onPrevStep = useCallback(() => {
    onPrevStepRef.current?.();
  }, []);

  const onNextStep = useCallback(() => {
    onNextStepRef.current?.();
  }, []);

  const onProductChange = useCallback((index: number) => {
    onProductChangeRef.current?.(index);
  }, []);

  // Context valueをメモ化して安定した参照を維持（無限ループ防止）
  const value = useMemo<NavigationContextType>(
    () => ({
      isStepNavigationActive,
      activeStep,
      totalSteps,
      formData,
      activeProductIndex,
      onPrevStep,
      onNextStep,
      onProductChange,
      showProgressSummary,
      toggleProgressSummary,
      setStepNavigation,
    }),
    [
      isStepNavigationActive,
      activeStep,
      totalSteps,
      formData,
      activeProductIndex,
      onPrevStep,
      onNextStep,
      onProductChange,
      showProgressSummary,
      toggleProgressSummary,
      setStepNavigation,
    ]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

/**
 * ナビゲーションコンテキストを使用するフック
 */
export const useNavigationContext = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
};
