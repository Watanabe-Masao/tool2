import React, { createContext, useContext, useState } from 'react';
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
  const [onPrevStep, setOnPrevStep] = useState<(() => void) | undefined>(undefined);
  const [onNextStep, setOnNextStep] = useState<(() => void) | undefined>(undefined);
  const [onProductChange, setOnProductChange] = useState<((index: number) => void) | undefined>(undefined);

  const setStepNavigation = (
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
    setOnPrevStep(() => onPrev);
    setOnNextStep(() => onNext);
    setOnProductChange(() => onProdChange);
  };

  return (
    <NavigationContext.Provider
      value={{
        isStepNavigationActive,
        activeStep,
        totalSteps,
        formData,
        activeProductIndex,
        onPrevStep,
        onNextStep,
        onProductChange,
        setStepNavigation,
      }}
    >
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
