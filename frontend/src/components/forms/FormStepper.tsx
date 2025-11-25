import React from 'react';
import { Stepper, Step, StepLabel, Box, Button, MobileStepper } from '@mui/material';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import type { FormStep } from '@/types/ui';

/**
 * FormStepperのProps
 */
interface FormStepperProps {
  /** 現在のステップ（0-indexed） */
  activeStep: number;
  /** ステップの配列 */
  steps: FormStep[];
  /** 次へボタンのクリックハンドラ */
  onNext: () => void;
  /** 戻るボタンのクリックハンドラ */
  onBack: () => void;
  /** 次へボタンの無効化 */
  disableNext?: boolean;
  /** 戻るボタンの無効化 */
  disableBack?: boolean;
  /** 次へボタンのテキスト */
  nextButtonText?: string;
  /** 完了ボタンかどうか */
  isLastStep?: boolean;
}

/**
 * フォームステッパーコンポーネント
 *
 * 5ステップのフォームナビゲーションを提供します。
 * デスクトップ: 水平ステッパー
 * モバイル: モバイルステッパー
 */
export const FormStepper: React.FC<FormStepperProps> = ({
  activeStep,
  steps,
  onNext,
  onBack,
  disableNext = false,
  disableBack = false,
  nextButtonText,
  isLastStep = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const maxSteps = steps.length;

  // デフォルトのボタンテキスト
  const defaultNextText = isLastStep ? '完了' : '次へ';
  const buttonText = nextButtonText || defaultNextText;

  if (isMobile) {
    // モバイル: MobileStepper
    return (
      <Box>
        {/* ステップ表示 */}
        <MobileStepper
          variant="dots"
          steps={maxSteps}
          position="static"
          activeStep={activeStep}
          sx={{ flexGrow: 1, p: 2 }}
          nextButton={
            <Button size="small" onClick={onNext} disabled={disableNext}>
              {buttonText}
              {!isLastStep && <KeyboardArrowRight />}
            </Button>
          }
          backButton={
            <Button size="small" onClick={onBack} disabled={disableBack || activeStep === 0}>
              <KeyboardArrowLeft />
              戻る
            </Button>
          }
        />

        {/* 現在のステップ名 */}
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <strong>
            ステップ {activeStep + 1} / {maxSteps}
          </strong>
          : {steps[activeStep].label}
        </Box>
      </Box>
    );
  }

  // デスクトップ: 水平Stepper + ボタン
  return (
    <Box>
      {/* ステッパー */}
      <Stepper activeStep={activeStep} sx={{ py: 3 }}>
        {steps.map((step, index) => (
          <Step key={index}>
            <StepLabel optional={step.optional ? <span>（任意）</span> : undefined}>
              {step.label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* ナビゲーションボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 3 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          disabled={disableBack || activeStep === 0}
          startIcon={<KeyboardArrowLeft />}
        >
          戻る
        </Button>

        <Button
          variant="contained"
          onClick={onNext}
          disabled={disableNext}
          endIcon={!isLastStep ? <KeyboardArrowRight /> : undefined}
        >
          {buttonText}
        </Button>
      </Box>
    </Box>
  );
};
