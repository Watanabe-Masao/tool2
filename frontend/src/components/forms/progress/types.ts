import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * FloatingProgressSummaryのProps
 */
export interface FloatingProgressSummaryProps {
  /** フォームデータ */
  formData: OrderFormData;
  /** 総ステップ数 */
  totalSteps: number;
  /** 高さ変更コールバック */
  onHeightChange?: (height: number) => void;
  /** 商品削除ハンドラー */
  onRemoveProduct?: (index: number) => void;
  /** 商品フィールドクリアハンドラー */
  onClearProduct?: (index: number) => void;
  /** 前のステップへ移動するハンドラー */
  onPrevStep?: () => void;
  /** 次のステップへ移動するハンドラー */
  onNextStep?: () => void;
  /** 配分数変更ハンドラ（モーダル用） */
  onAllocationChange?: (productIndex: number, storeIndex: number, value: number) => void;
}

/**
 * 商品ステータス
 */
export interface ProductStatus {
  hasBasicInfo: boolean;
  hasPricing: boolean;
  hasAllocation: boolean;
  hasOverAllocation: boolean;
  totalAllocated: number;
  remaining: number;
}

/**
 * ステップ情報
 */
export interface StepInfo {
  label: string;
  completed: boolean;
  value: string | null;
  warning?: boolean;
}

/**
 * カードメニュー状態
 */
export interface CardMenuState {
  anchorEl: HTMLElement | null;
  productIndex: number | null;
}

/**
 * 配分編集モーダル状態
 */
export interface AllocationModalState {
  open: boolean;
  productIndex: number | null;
}

/**
 * ProductCardのProps
 */
export interface ProductCardProps {
  product: OrderFormData['products'][0];
  index: number;
  isActive: boolean;
  isPressing: boolean;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
}

/**
 * ProductCardSwiperのProps
 */
export interface ProductCardSwiperProps {
  products: OrderFormData['products'];
  activeProductIndex: number;
  isPressing: boolean;
  onProductSelect: (index: number) => void;
  onContextMenu: (event: React.MouseEvent<HTMLElement>, productIndex: number) => void;
  onTouchStart: (productIndex: number) => void;
  onTouchEnd: () => void;
}

/**
 * ProgressHeaderのProps
 */
export interface ProgressHeaderProps {
  activeStep: number;
  totalSteps: number;
  progress: number;
  showProgressSummary: boolean;
  isCollapsed: boolean;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  onToggleCollapse: () => void;
}

/**
 * ProgressStepListのProps
 */
export interface ProgressStepListProps {
  steps: StepInfo[];
  activeStep: number;
}

/**
 * StepHintのProps
 */
export interface StepHintProps {
  activeStep: number;
  totalAllocated: number;
  remaining: number;
}

/**
 * CardContextMenuのProps
 */
export interface CardContextMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onClear?: () => void;
  onDelete?: () => void;
  canDelete: boolean;
}
