import React, { useState, useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId, UseFieldArrayAppend, UseFieldArrayRemove } from 'react-hook-form';
import { Box, Typography, Alert, Button, IconButton } from '@mui/material';
import { Add, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { ProductFormCardBasic } from './ProductFormCardBasic';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';

/**
 * ProductBasicInfoFormのProps
 */
interface ProductBasicInfoFormProps {
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** 品名のオートコンプリート候補 */
  productNameOptions?: string[];
  /** 産地のオートコンプリート候補 */
  originOptions?: string[];
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
  /** 帳合先リスト（履歴フィルタ用） */
  suppliers?: string[];
  /** 商品フィールド配列 */
  fields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
  /** 商品追加関数 */
  append: UseFieldArrayAppend<OrderFormData, 'products'>;
  /** 商品削除関数 */
  remove: UseFieldArrayRemove;
  /** ステップ移動ハンドラー */
  onNavigateToStep?: (step: number) => void;
  /** 現在の商品インデックス（外部制御用） */
  activeProductIndex?: number;
  /** 商品インデックス変更ハンドラー */
  onProductIndexChange?: (index: number) => void;
}

/**
 * Step 2: 商品基本情報フォーム
 *
 * 商品の基本情報（品名、産地、規格、入数）を入力します。
 * 商品の追加・削除が可能です。
 */
export const ProductBasicInfoForm: React.FC<ProductBasicInfoFormProps> = ({
  control,
  errors,
  productNameOptions,
  originOptions,
  onEnterPress,
  suppliers,
  fields,
  append,
  remove,
  onNavigateToStep,
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

  // 全商品の実際のフォームデータを監視
  const products = useWatch({ control, name: 'products' });

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
   * 最後に選択された帳合先を取得
   */
  const getLastSelectedSupplier = (): string => {
    if (!suppliers?.length) return '';
    if (!products || products.length === 0) return suppliers[0];
    // 最後の商品の帳合先を取得（実際のフォームデータから）
    const lastProduct = products[products.length - 1];
    return lastProduct?.supplier || suppliers[0];
  };

  /**
   * 商品を追加
   */
  const handleAddProduct = () => {
    // 手前で選択している帳合先をデフォルトとして設定
    const defaultSupplier = getLastSelectedSupplier();
    append({
      ...DEFAULT_PRODUCT_FORM_DATA,
      supplier: defaultSupplier,
      totalDelivery: 0,
      storeAllocations: new Array(STORE_COUNT).fill(0),
    });
    // 新しく追加された商品のタブに切り替え
    setActiveTabIndex(fields.length);
  };

  /**
   * 商品を削除
   */
  const handleRemoveProduct = (index: number) => {
    remove(index);
    // アクティブなタブが削除された場合は、前のタブに移動
    if (activeTabIndex >= index && activeTabIndex > 0) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  return (
    <Box>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight="medium">
          商品情報1
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Add />}
          onClick={handleAddProduct}
          disabled={fields.length >= 50}
          sx={{ fontSize: '0.8rem' }}
        >
          商品を追加
        </Button>
      </Box>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* 商品カード表示エリア（1枚ずつ表示） */}
      <Box sx={{ position: 'relative' }}>
        {/* 左端のナビゲーションボタン */}
        {fields.length > 1 && activeTabIndex > 0 && (
          <IconButton
            size="medium"
            onClick={() => setActiveTabIndex(Math.max(0, activeTabIndex - 1))}
            sx={{
              position: 'absolute',
              left: -16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              boxShadow: 2,
            }}
          >
            <ChevronLeft />
          </IconButton>
        )}

        {/* 右端のナビゲーションボタン */}
        {fields.length > 1 && activeTabIndex < fields.length - 1 && (
          <IconButton
            size="medium"
            onClick={() => setActiveTabIndex(Math.min(fields.length - 1, activeTabIndex + 1))}
            sx={{
              position: 'absolute',
              right: -16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              boxShadow: 2,
            }}
          >
            <ChevronRight />
          </IconButton>
        )}

        {/* 商品番号表示（上部中央） */}
        {fields.length > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'medium' }}>
              商品 {activeTabIndex + 1} / {fields.length}
            </Typography>
          </Box>
        )}

        {/* アクティブな商品カードのみ表示 */}
        {fields.map((field, index) => {
          const isActive = activeTabIndex === index;
          return (
            <Box
              key={field.id}
              sx={{
                display: isActive ? 'block' : 'none',
              }}
            >
              <ProductFormCardBasic
                index={index}
                control={control}
                errors={errors}
                onRemove={() => handleRemoveProduct(index)}
                showRemove={fields.length > 1}
                productNameOptions={productNameOptions}
                originOptions={originOptions}
                onEnterPress={onEnterPress}
                suppliers={suppliers}
                onNavigateToStep={onNavigateToStep}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
