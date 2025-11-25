// Main component
export { FloatingProgressSummary } from './FloatingProgressSummary';

// Sub-components
export { ProductCard } from './ProductCard';
export { ProductCardSwiper } from './ProductCardSwiper';
export { ProgressHeader } from './ProgressHeader';
export { ProgressStepList } from './ProgressStepList';
export { StepHint } from './StepHint';
export { CardContextMenu } from './CardContextMenu';

// Hooks
export { useLongPress } from './hooks/useLongPress';
export { useProductStatus, getProductStatus } from './hooks/useProductStatus';

// Types
export type {
  FloatingProgressSummaryProps,
  ProductStatus,
  StepInfo,
  CardMenuState,
  AllocationModalState,
  ProductCardProps,
  ProductCardSwiperProps,
  ProgressHeaderProps,
  ProgressStepListProps,
  StepHintProps,
  CardContextMenuProps,
} from './types';
