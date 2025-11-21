import React, { useState, useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId, UseFieldArrayAppend, UseFieldArrayRemove } from 'react-hook-form';
import { Box, Typography, Alert, Tabs, Tab, IconButton, Chip } from '@mui/material';
import { Add, Close, ChevronLeft, ChevronRight } from '@mui/icons-material';
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
}) => {
  // アクティブなタブのインデックス
  const [activeTabIndex, setActiveTabIndex] = useState(0);

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
   * 商品の未入力項目数を計算
   */
  const getIncompleteCount = (index: number): number => {
    const product = products?.[index];
    if (!product) return 0;

    let count = 0;
    if (!product.name) count++;
    if (!product.origin) count++;
    if (!product.supplier) count++;
    if (!product.specification) count++;
    if (!product.quantityPerPackage) count++;
    if (!product.unit) count++;

    return count;
  };

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

  /**
   * タブ変更ハンドラー
   */
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTabIndex(newValue);
  };

  return (
    <Box>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium">
          商品情報を入力してください
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          商品は最大50個まで追加できます。（現在: {fields.length}個）
        </Typography>
      </Box>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* 前後ナビゲーションボタン */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, justifyContent: 'center' }}>
        <IconButton
          size="small"
          disabled={activeTabIndex === 0}
          onClick={() => setActiveTabIndex(activeTabIndex - 1)}
          title="前の商品 (Ctrl+←)"
        >
          <ChevronLeft />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 200, textAlign: 'center' }}>
          {products?.[activeTabIndex]?.name || `商品${activeTabIndex + 1}`}
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            ({activeTabIndex + 1} / {fields.length})
          </Typography>
        </Typography>
        <IconButton
          size="small"
          disabled={activeTabIndex === fields.length - 1}
          onClick={() => setActiveTabIndex(activeTabIndex + 1)}
          title="次の商品 (Ctrl+→)"
        >
          <ChevronRight />
        </IconButton>
      </Box>

      {/* タブナビゲーション */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTabIndex}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {fields.map((field, index) => {
            const product = products?.[index];
            const label = product?.name || `商品${index + 1}`;
            const incompleteCount = getIncompleteCount(index);
            return (
              <Tab
                key={field.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2">{label}</Typography>
                    {incompleteCount > 0 && (
                      <Chip
                        label={incompleteCount}
                        size="small"
                        color="warning"
                        sx={{ height: 18, fontSize: '0.7rem', minWidth: 18, '& .MuiChip-label': { px: 0.5 } }}
                      />
                    )}
                    {fields.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveProduct(index);
                        }}
                        sx={{ ml: 0.5, p: 0.25 }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                }
                sx={{ minHeight: 48 }}
              />
            );
          })}
          {/* 追加タブ */}
          <Tab
            icon={<Add />}
            iconPosition="start"
            label="商品を追加"
            onClick={handleAddProduct}
            disabled={fields.length >= 50}
            sx={{ minHeight: 48 }}
          />
        </Tabs>
      </Box>

      {/* アクティブな商品カードのみ表示 */}
      {fields.map((field, index) => (
        <Box
          key={field.id}
          sx={{ display: activeTabIndex === index ? 'block' : 'none' }}
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
      ))}

      {/* 最大数エラー */}
      {fields.length >= 50 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          商品は最大50個まで追加できます
        </Alert>
      )}
    </Box>
  );
};
