import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

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
  /** 前のステップへ移動するハンドラー */
  onPrevStep?: () => void;
  /** 次のステップへ移動するハンドラー */
  onNextStep?: () => void;
  /** ステップナビゲーション状態を設定 */
  setStepNavigation: (
    active: boolean,
    step?: number,
    total?: number,
    onPrev?: () => void,
    onNext?: () => void
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
  const [onPrevStep, setOnPrevStep] = useState<(() => void) | undefined>(undefined);
  const [onNextStep, setOnNextStep] = useState<(() => void) | undefined>(undefined);

  const setStepNavigation = (
    active: boolean,
    step: number = 0,
    total: number = 0,
    onPrev?: () => void,
    onNext?: () => void
  ) => {
    setIsStepNavigationActive(active);
    setActiveStep(step);
    setTotalSteps(total);
    setOnPrevStep(() => onPrev);
    setOnNextStep(() => onNext);
  };

  return (
    <NavigationContext.Provider
      value={{
        isStepNavigationActive,
        activeStep,
        totalSteps,
        onPrevStep,
        onNextStep,
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
