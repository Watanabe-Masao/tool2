import React, { useState, useEffect, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId } from 'react-hook-form';
import { Box, Typography, Alert, Chip, Tooltip } from '@mui/material';
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
}) => {
  // アクティブなタブのインデックス
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // 前回のタブインデックスを保持（アニメーション方向判定用）
  const prevTabIndexRef = useRef(0);

  // スライド方向（'left' | 'right'）
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // 初回マウント判定（初回レンダリング時はアニメーションを無効化）
  const isMountedRef = useRef(false);

  // タブコンテナのref（自動センタリング用）
  const tabsRef = useRef<HTMLDivElement>(null);

  // スクロール終了検出用タイマー
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 全商品のデータを監視
  const products = useWatch({ control, name: 'products' }) || [];

  // 店着日を監視
  const deliveryDate = useWatch({ control, name: 'deliveryDate' });

  // デバイス判定
  const isMobile = isMobileDevice();

  /**
   * 初回マウント後にフラグを立てる（アニメーション制御用）
   */
  useEffect(() => {
    isMountedRef.current = true;
  }, []);

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
   * タブスクロール時に中央のタブを検出して選択
   */
  const handleTabScroll = () => {
    if (!tabsRef.current) return;

    // 既存のタイマーをクリア
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }

    // スクロール終了後に中央のタブを検出
    scrollTimerRef.current = setTimeout(() => {
      if (!tabsRef.current) return;

      const container = tabsRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      // 全てのチップ要素を取得
      const chips = container.querySelectorAll('[data-chip-index]');
      let closestIndex = activeTabIndex;
      let minDistance = Infinity;

      chips.forEach((chip) => {
        const chipRect = chip.getBoundingClientRect();
        const chipCenter = chipRect.left + chipRect.width / 2;
        const distance = Math.abs(containerCenter - chipCenter);

        if (distance < minDistance) {
          minDistance = distance;
          const index = parseInt(chip.getAttribute('data-chip-index') || '0', 10);
          closestIndex = index;
        }
      });

      // 中央に最も近いタブをアクティブに
      if (closestIndex !== activeTabIndex) {
        setActiveTabIndex(closestIndex);
      }
    }, 100);
  };

  /**
   * アクティブタブの自動センタリング
   */
  useEffect(() => {
    if (tabsRef.current) {
      const chips = tabsRef.current.querySelectorAll('[data-chip-index]');
      const targetChip = chips[activeTabIndex];
      if (targetChip) {
        targetChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTabIndex]);

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
   * クリーンアップ：タイマーをクリア
   */
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  /**
   * 配分の完了状況を確認
   */
  const getAllocationStatus = (index: number): { isComplete: boolean; remaining: number } => {
    const product = products?.[index];
    if (!product) return { isComplete: false, remaining: 0 };

    const totalDelivery = product.totalDelivery || 0;
    const allocations = product.storeAllocations || [];
    const totalAllocated = allocations.reduce((sum: number, val: number) => sum + (val || 0), 0);
    const remaining = totalDelivery - totalAllocated;

    return {
      isComplete: remaining === 0 && totalDelivery > 0,
      remaining,
    };
  };

  /**
   * タブのラベルを作成（#番号 + 品名8文字まで）
   */
  const getTabLabel = (index: number): string => {
    const product = products?.[index];
    const name = product?.name || '';
    const truncated = name.length > 8 ? name.slice(0, 8) + '...' : name;
    return `#${index + 1}${truncated ? ' ' + truncated : ''}`;
  };

  /**
   * タブのツールチップコンテンツを作成
   */
  const getTabTooltip = (index: number): string => {
    const product = products?.[index];
    const name = product?.name || `商品${index + 1}`;
    const status = getAllocationStatus(index);

    if (status.isComplete) {
      return `${name}\n✓ 配分完了`;
    } else if (status.remaining > 0) {
      return `${name}\n未配分: ${status.remaining}個`;
    } else if (status.remaining < 0) {
      return `${name}\n配分超過: ${Math.abs(status.remaining)}個`;
    } else {
      return `${name}\n未配分`;
    }
  };

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

      {/* 商品ナビゲーション情報 */}
      <Box sx={{ mb: 2, px: 1 }}>
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6, fontWeight: 'bold' }}>
          商品{activeTabIndex + 1}（{activeTabIndex + 1}/{fields.length}）　店着日：{deliveryDate ? new Date(deliveryDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : '未設定'}　帳合先：{products?.[activeTabIndex]?.supplier || '未選択'}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6, fontWeight: 'bold', color: 'primary.main' }}>
          品名：{products?.[activeTabIndex]?.name || '－'}　規格：{products?.[activeTabIndex]?.specification || '－'}　総納品数：{products?.[activeTabIndex]?.totalDelivery || '－'}
        </Typography>
      </Box>

      {/* チップ型タブナビゲーション */}
      <Box
        ref={tabsRef}
        onScroll={handleTabScroll}
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          pb: 1,
          mb: 2,
          scrollBehavior: 'smooth',
          px: 'calc(50vw - 60px)', // 左右に画面幅の半分のパディングを追加（チップ幅の半分を引く）
          '&::-webkit-scrollbar': {
            height: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 3,
          },
        }}
      >
        {fields.map((field, index) => {
          const status = getAllocationStatus(index);
          const isActive = activeTabIndex === index;
          const isComplete = status.isComplete;
          const hasError = status.remaining !== 0;

          return (
            <Tooltip key={field.id} title={getTabTooltip(index)} arrow placement="top">
              <Chip
                data-chip-index={index}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isActive ? 'bold' : 'normal',
                        fontSize: isActive ? '0.8rem' : '0.7rem',
                      }}
                    >
                      {getTabLabel(index)}
                    </Typography>
                    {hasError && (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: status.remaining > 0 ? 'warning.main' : 'error.main',
                          color: 'white',
                          fontSize: '0.55rem',
                          fontWeight: 'bold',
                          px: 0.3,
                        }}
                      >
                        {status.remaining > 0 ? `+${status.remaining}` : status.remaining}
                      </Box>
                    )}
                  </Box>
                }
                onClick={() => setActiveTabIndex(index)}
                sx={{
                  height: isActive ? 36 : 28,
                  cursor: 'pointer',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: 2,
                  bgcolor: isComplete
                    ? isActive
                      ? 'success.main'
                      : 'success.light'
                    : hasError
                    ? isActive
                      ? status.remaining > 0 ? 'warning.main' : 'error.main'
                      : status.remaining > 0 ? 'warning.light' : 'error.light'
                    : isActive
                    ? 'grey.400'
                    : 'grey.200',
                  color: isActive ? 'white' : 'text.primary',
                  boxShadow: isActive ? 3 : 1,
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'scale(1.05)',
                  },
                  '&:active': {
                    transform: 'scale(0.98)',
                  },
                  '& .MuiChip-label': {
                    px: 1.5,
                  },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

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
              left: 0,
              top: 0,
              bottom: 0,
              width: 60,
              zIndex: 10,
              cursor: 'pointer',
              background: 'linear-gradient(to right, rgba(25, 118, 210, 0.1), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              pointerEvents: 'none', // タッチイベントを透過
              '&:hover': {
                background: 'linear-gradient(to right, rgba(25, 118, 210, 0.2), transparent)',
              },
            }}
          >
            <ChevronLeft sx={{ color: 'primary.main', fontSize: 40, opacity: 0.7, pointerEvents: 'auto' }} />
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
              right: 0,
              top: 0,
              bottom: 0,
              width: 60,
              zIndex: 10,
              cursor: 'pointer',
              background: 'linear-gradient(to left, rgba(25, 118, 210, 0.1), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              pointerEvents: 'none', // タッチイベントを透過
              '&:hover': {
                background: 'linear-gradient(to left, rgba(25, 118, 210, 0.2), transparent)',
              },
            }}
          >
            <ChevronRight sx={{ color: 'primary.main', fontSize: 40, opacity: 0.7, pointerEvents: 'auto' }} />
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
                  setLockedStores={(updater) => {
                    setLockedStores((prev) => {
                      const newMap = new Map(prev);
                      const currentSet = prev.get(index) || new Set();
                      const newSet = typeof updater === 'function' ? updater(currentSet) : updater;
                      newMap.set(index, newSet);
                      return newMap;
                    });
                  }}
                  selectedCategories={selectedCategories.get(index) || new Set()}
                  setSelectedCategories={(updater) => {
                    setSelectedCategories((prev) => {
                      const newMap = new Map(prev);
                      const currentSet = prev.get(index) || new Set();
                      const newSet = typeof updater === 'function' ? updater(currentSet) : updater;
                      newMap.set(index, newSet);
                      return newMap;
                    });
                  }}
                />
              ) : (
                <StoreAllocationTable
                  productIndex={index}
                  control={control}
                  errors={errors}
                  totalDelivery={product?.totalDelivery || 0}
                  lockedStores={lockedStores.get(index) || new Set()}
                  setLockedStores={(updater) => {
                    setLockedStores((prev) => {
                      const newMap = new Map(prev);
                      const currentSet = prev.get(index) || new Set();
                      const newSet = typeof updater === 'function' ? updater(currentSet) : updater;
                      newMap.set(index, newSet);
                      return newMap;
                    });
                  }}
                  selectedCategories={selectedCategories.get(index) || new Set()}
                  setSelectedCategories={(updater) => {
                    setSelectedCategories((prev) => {
                      const newMap = new Map(prev);
                      const currentSet = prev.get(index) || new Set();
                      const newSet = typeof updater === 'function' ? updater(currentSet) : updater;
                      newMap.set(index, newSet);
                      return newMap;
                    });
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
