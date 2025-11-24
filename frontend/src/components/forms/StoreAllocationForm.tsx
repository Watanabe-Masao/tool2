import React, { useState, useEffect, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId } from 'react-hook-form';
import { Box, Typography, Alert } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { StoreAllocationTable } from './StoreAllocationTable';
import { StoreAllocationMobile } from './StoreAllocationMobile';
import type { OrderFormData } from '@/schemas/orderSchema';
import { isMobileDevice } from '@/utils/deviceDetection';

/**
 * StoreAllocationFormのProps
 */
interface StoreAllocationFormProps {
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** 商品フィールド配列 */
  fields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
  /** ロックされた店舗のMap（商品別） */
  lockedStores: Map<number, Set<string>>;
  /** ロック状態更新関数 */
  setLockedStores: React.Dispatch<React.SetStateAction<Map<number, Set<string>>>>;
  /** 選択されたカテゴリのMap（商品別） */
  selectedCategories: Map<number, Set<string>>;
  /** カテゴリ選択更新関数 */
  setSelectedCategories: React.Dispatch<React.SetStateAction<Map<number, Set<string>>>>;
  /** 現在の商品インデックス（外部制御用） */
  activeProductIndex?: number;
  /** 商品インデックス変更ハンドラー */
  onProductIndexChange?: (index: number) => void;
}

/**
 * Step 4: 店舗配分フォーム
 *
 * 36店舗への配分数を入力します。
 */
export const StoreAllocationForm: React.FC<StoreAllocationFormProps> = ({
  control,
  errors,
  fields,
  lockedStores,
  setLockedStores,
  selectedCategories,
  setSelectedCategories,
  activeProductIndex,
  onProductIndexChange,
}) => {
  // アクティブなタブのインデックス（外部制御または内部状態）
  const [internalTabIndex, setInternalTabIndex] = useState(0);
  const activeTabIndex = activeProductIndex !== undefined ? activeProductIndex : internalTabIndex;
  const setActiveTabIndex = (index: number | ((prev: number) => number)) => {
    const newIndex = typeof index === 'function' ? index(activeTabIndex) : index;
    if (onProductIndexChange) {
      onProductIndexChange(newIndex);
    } else {
      setInternalTabIndex(newIndex);
    }
  };

  // 前回のタブインデックスを保持（アニメーション方向判定用）
  const prevTabIndexRef = useRef(0);

  // スライド方向（'left' | 'right'）
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // 初回マウント判定（初回レンダリング時はアニメーションを無効化）
  const isMountedRef = useRef(false);

  // 全商品のデータを監視
  const products = useWatch({ control, name: 'products' }) || [];

  // デバイス判定
  const isMobile = isMobileDevice();

  /**
   * 初回マウント後にフラグを立てる（アニメーション制御用）
   */
  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  /**
   * 商品別のsetLockedStores関数を生成（React#185対策: メモ化＋startTransition）
   */
  const createSetLockedStoresForProduct = React.useCallback((productIndex: number) => {
    return (updater: React.SetStateAction<Set<string>>) => {
      // React#185対策: startTransitionで低優先度の更新として実行
      React.startTransition(() => {
        setLockedStores((prev) => {
          const newMap = new Map(prev);
          const currentSet = prev.get(productIndex) || new Set();
          const newSet = typeof updater === 'function' ? updater(currentSet) : updater;
          newMap.set(productIndex, newSet);
          return newMap;
        });
      });
    };
  }, [setLockedStores]);

  /**
   * 商品別のsetSelectedCategories関数を生成（React#185対策: メモ化＋startTransition）
   */
  const createSetSelectedCategoriesForProduct = React.useCallback((productIndex: number) => {
    return (updater: React.SetStateAction<Set<string>>) => {
      // React#185対策: startTransitionで低優先度の更新として実行
      React.startTransition(() => {
        setSelectedCategories((prev) => {
          const newMap = new Map(prev);
          const currentSet = prev.get(productIndex) || new Set();
          const newSet = typeof updater === 'function' ? updater(currentSet) : updater;
          newMap.set(productIndex, newSet);
          return newMap;
        });
      });
    };
  }, [setSelectedCategories]);

  /**
   * キーボードショートカット（Ctrl+← / Ctrl+→）でタブ移動
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowLeft' && activeTabIndex > 0) {
          e.preventDefault();
          setActiveTabIndex(activeTabIndex - 1);
        } else if (e.key === 'ArrowRight' && activeTabIndex < fields.length - 1) {
          e.preventDefault();
          setActiveTabIndex(activeTabIndex + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabIndex, fields.length]);


  /**
   * タブ切り替え時のスライド方向を設定
   */
  useEffect(() => {
    if (activeTabIndex > prevTabIndexRef.current) {
      setSlideDirection('left'); // 右から左へスライド（次へ）
    } else if (activeTabIndex < prevTabIndexRef.current) {
      setSlideDirection('right'); // 左から右へスライド（前へ）
    }
    prevTabIndexRef.current = activeTabIndex;
  }, [activeTabIndex]);

  /**
   * 各商品用のsetLockedStores関数をメモ化（React#185対策）
   */
  const productSetLockedStores = React.useMemo(() => {
    return fields.map((_, index) => createSetLockedStoresForProduct(index));
  }, [fields.length, createSetLockedStoresForProduct]);

  /**
   * 各商品用のsetSelectedCategories関数をメモ化（React#185対策）
   */
  const productSetSelectedCategories = React.useMemo(() => {
    return fields.map((_, index) => createSetSelectedCategoriesForProduct(index));
  }, [fields.length, createSetSelectedCategoriesForProduct]);

  return (
    <Box>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium">
          店舗配分を入力してください
        </Typography>
      </Box>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* スワイプ可能な商品カード表示エリア */}
      <Box
        sx={{
          position: 'relative',
        }}
      >
        {/* 左端のクリックエリア */}
        {activeTabIndex > 0 && (
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setActiveTabIndex(activeTabIndex - 1);
            }}
            sx={{
              position: 'absolute',
              left: -10,
              top: 0,
              bottom: 0,
              width: 60,
              zIndex: 10,
              cursor: 'pointer',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              transition: 'opacity 0.2s',
              pointerEvents: 'none', // タッチイベントを透過
            }}
          >
            <ChevronLeft sx={{ color: 'text.primary', fontSize: 40, opacity: 0.4, pointerEvents: 'auto', '&:hover': { opacity: 0.7 } }} />
          </Box>
        )}

        {/* 右端のクリックエリア */}
        {activeTabIndex < fields.length - 1 && (
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setActiveTabIndex(activeTabIndex + 1);
            }}
            sx={{
              position: 'absolute',
              right: -10,
              top: 0,
              bottom: 0,
              width: 60,
              zIndex: 10,
              cursor: 'pointer',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              transition: 'opacity 0.2s',
              pointerEvents: 'none', // タッチイベントを透過
            }}
          >
            <ChevronRight sx={{ color: 'text.primary', fontSize: 40, opacity: 0.4, pointerEvents: 'auto', '&:hover': { opacity: 0.7 } }} />
          </Box>
        )}

        {/* アクティブな商品カードのみ表示（アニメーション付き） */}
        {fields.map((field, index) => {
          const isActive = activeTabIndex === index;
          const product = products?.[index];
          return (
            <Box
              key={field.id}
              sx={{
                display: isActive ? 'block' : 'none',
                animation: isActive && isMountedRef.current ? `slideIn${slideDirection === 'left' ? 'Left' : 'Right'} 0.25s cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
                '@keyframes slideInLeft': {
                  '0%': {
                    transform: 'translateX(50%)',
                    opacity: 0,
                  },
                  '100%': {
                    transform: 'translateX(0)',
                    opacity: 1,
                  },
                },
                '@keyframes slideInRight': {
                  '0%': {
                    transform: 'translateX(-50%)',
                    opacity: 0,
                  },
                  '100%': {
                    transform: 'translateX(0)',
                    opacity: 1,
                  },
                },
              }}
            >
              {isMobile ? (
                <StoreAllocationMobile
                  productIndex={index}
                  control={control}
                  errors={errors}
                  totalDelivery={product?.totalDelivery || 0}
                  lockedStores={lockedStores.get(index) || new Set()}
                  setLockedStores={productSetLockedStores[index]}
                  selectedCategories={selectedCategories.get(index) || new Set()}
                  setSelectedCategories={productSetSelectedCategories[index]}
                />
              ) : (
                <StoreAllocationTable
                  productIndex={index}
                  control={control}
                  errors={errors}
                  totalDelivery={product?.totalDelivery || 0}
                  lockedStores={lockedStores.get(index) || new Set()}
                  setLockedStores={productSetLockedStores[index]}
                  selectedCategories={selectedCategories.get(index) || new Set()}
                  setSelectedCategories={productSetSelectedCategories[index]}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
