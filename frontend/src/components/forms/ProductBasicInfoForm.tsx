import React, { useState } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId, UseFieldArrayAppend, UseFieldArrayRemove } from 'react-hook-form';
import { Box, Typography, Alert, Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Add, Inventory2, NoteAdd } from '@mui/icons-material';
// @ts-ignore - Splide types issue
import { Splide, SplideSlide } from '@splidejs/react-splide';
// @ts-ignore - CSS import
import '@splidejs/react-splide/css/core';
import { ProductFormCardBasic } from './ProductFormCardBasic';
import { ProductPresetModal } from '@/components/modals/ProductPresetModal';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';
import { useProductHistory } from '@/hooks/useProductHistory';
import { useAuthContext } from '@/context/AuthContext';
import { FirestoreService } from '@/services/firebase/firestoreService';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';

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
  // 現在表示中の商品インデックス
  const [currentIndex, setCurrentIndex] = useState(0);

  // 全商品の実際のフォームデータを監視
  const products = useWatch({ control, name: 'products' });

  // 店着日を監視
  const deliveryDate = useWatch({ control, name: 'deliveryDate' });

  // 追加メニューのアンカー
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // プリセットモーダルの状態
  const [presetModalOpen, setPresetModalOpen] = useState(false);

  // 認証コンテキスト
  const { user } = useAuthContext();

  // 商品履歴フック
  const { history: presetHistory, loadHistory: reloadPresetHistory } = useProductHistory(suppliers, undefined);

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
   * 追加メニューを開く
   */
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  /**
   * 追加メニューを閉じる
   */
  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  /**
   * 空白の商品カードを追加
   */
  const handleAddBlankProduct = () => {
    handleCloseMenu();
    // 手前で選択している帳合先をデフォルトとして設定
    const defaultSupplier = getLastSelectedSupplier();
    append({
      ...DEFAULT_PRODUCT_FORM_DATA,
      supplier: defaultSupplier,
      totalDelivery: 0,
      storeAllocations: new Array(STORE_COUNT).fill(0),
    });
    // 新しく追加された商品のカードに切り替え
    setCurrentIndex(fields.length);
  };

  /**
   * PLから追加モーダルを開く
   */
  const handleOpenPresetModal = () => {
    handleCloseMenu();
    setPresetModalOpen(true);
  };

  /**
   * 複数プリセットを選択して追加
   */
  const handleSelectMultiplePresets = (presets: ProductHistoryItem[]) => {
    const defaultSupplier = getLastSelectedSupplier();
    // 選択された各プリセットを新しいカードとして追加
    presets.forEach((preset) => {
      append({
        ...DEFAULT_PRODUCT_FORM_DATA,
        categoryCode: preset.categoryCode || '',
        supplier: preset.supplier || defaultSupplier,
        name: preset.name,
        origin: preset.origin,
        specification: preset.specification || '',
        quantityPerPackage: preset.quantityPerPackage || 0,
        unit: preset.unit || '',
        totalDelivery: 0,
        storeAllocations: new Array(STORE_COUNT).fill(0),
      });
    });
    // 最後に追加されたカードに移動
    setCurrentIndex(fields.length + presets.length - 1);
  };

  /**
   * プリセットを削除
   */
  const handleDeletePreset = async (presetId: string) => {
    try {
      await FirestoreService.deleteProductHistoryById(presetId);
      await reloadPresetHistory();
    } catch (error) {
      console.error('[ProductBasicInfoForm] Failed to delete preset:', error);
      throw error;
    }
  };

  /**
   * 商品を削除
   */
  const handleRemoveProduct = (index: number) => {
    remove(index);
    // アクティブなカードが削除された場合は、前のカードに移動
    if (currentIndex >= index && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Box>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium">
          商品情報を入力してください
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
          商品{currentIndex + 1}（{currentIndex + 1}/{fields.length}）　店着日：{deliveryDate ? new Date(deliveryDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : '未設定'}　帳合先：{products?.[currentIndex]?.supplier || '未選択'}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6, fontWeight: 'bold', color: 'primary.main' }}>
          産地：{products?.[currentIndex]?.origin || '－'}　品名：{products?.[currentIndex]?.name || '－'}　規格：{products?.[currentIndex]?.specification || '－'}　入数：{products?.[currentIndex]?.quantityPerPackage || '－'}　単位：{products?.[currentIndex]?.unit || '－'}
        </Typography>
      </Box>

      {/* Splide カルーセル */}
      <Box sx={{ mb: 2 }}>
        <Splide
          options={{
            type: 'slide',
            rewind: false,
            perPage: 1,
            perMove: 1,
            gap: '1rem',
            padding: { left: '1rem', right: '1rem' },
            arrows: true,
            pagination: true,
            drag: true,
            snap: true,
            speed: 400,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          }}
          onMoved={(_splide: any, newIndex: number) => setCurrentIndex(newIndex)}
        >
          {fields.map((field, index) => (
            <SplideSlide key={field.id}>
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
            </SplideSlide>
          ))}
        </Splide>
      </Box>

      {/* 商品を追加ボタン */}
      <Button
        startIcon={<Add />}
        onClick={handleOpenMenu}
        variant="outlined"
        fullWidth
        disabled={fields.length >= 50}
        sx={{ mt: 2 }}
      >
        商品を追加
      </Button>

      {/* 追加メニュー */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <MenuItem onClick={handleAddBlankProduct}>
          <ListItemIcon>
            <NoteAdd fontSize="small" />
          </ListItemIcon>
          <ListItemText>空白のカードを追加</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOpenPresetModal}>
          <ListItemIcon>
            <Inventory2 fontSize="small" />
          </ListItemIcon>
          <ListItemText>PLから追加</ListItemText>
        </MenuItem>
      </Menu>

      {/* プリセット選択モーダル（複数選択モード） */}
      <ProductPresetModal
        open={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        onSelect={() => {}} // 単一選択は使用しない
        onSelectMultiple={handleSelectMultiplePresets}
        onDelete={handleDeletePreset}
        presets={presetHistory}
        onReload={reloadPresetHistory}
        userId={user?.uid}
        supplier={getLastSelectedSupplier()}
        suppliers={suppliers}
        multiSelect={true}
      />
    </Box>
  );
};
