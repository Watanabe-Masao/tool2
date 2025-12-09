import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Controller, useWatch, useFormContext } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Card,
  CardContent,
  TextField,
  Grid,
  IconButton,
  Typography,
  Autocomplete,
  Box,
  Chip,
  Button,
  InputAdornment,
  Tooltip,
  Stack,
} from '@mui/material';
import { Category as CategoryIcon, BookmarkBorder, Bookmark, History, Business, Save } from '@mui/icons-material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { useSupplierPresets } from '@/hooks/useSupplierPresets';
import { getSupplierColorByName, getSupplierColorWithOpacity } from '@/constants/supplierColors';
import type { DeleteDialogState } from '@/types/ui';
import { useProductHistory } from '@/hooks/useProductHistory';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';
import { useNotification } from '@/context/NotificationContext';
import { useAuthContext } from '@/context/AuthContext';
import { useFirestoreService } from '@/context/ServiceContext';
import { CategorySelectModal } from '@/components/modals/CategorySelectModal';
import { ProductPresetModal } from '@/components/modals/ProductPresetModal';
import { ProductNameHistoryModal } from '@/components/modals/ProductNameHistoryModal';
import { getCategoryName } from '@/utils/categories';
import { CardContextMenu } from '@/components/forms/progress';
import {
  SupplierSelectDialog,
  PresetConfirmDialog,
  DeleteHistoryDialog,
  SaveProductDialog,
} from '@/features/shared-dialogs';

/**
 * ProductFormCardBasicのProps
 */
interface ProductFormCardBasicProps {
  /** 商品のインデックス */
  index: number;
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** 削除ハンドラ */
  onRemove: () => void;
  /** 削除ボタンの表示 */
  showRemove: boolean;
  /** 品名のオートコンプリート候補 */
  productNameOptions?: string[];
  /** 産地のオートコンプリート候補 */
  originOptions?: string[];
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
  /** 帳合先リスト（ステップ1で選択された帳合先） */
  suppliers?: string[];
  /** ステップ移動ハンドラー */
  onNavigateToStep?: (step: number) => void;
  /** プリセットを新規カードとして追加するハンドラー */
  onAddProductFromPreset?: (preset: ProductHistoryItem) => void;
}


/**
 * 商品基本情報フォームカード
 *
 * 1つの商品の基本情報を入力するフォームです。
 * 品名、産地、規格、入数を入力します。
 *
 * NOTE: React.memoでラップして兄弟要素変更時の不要な再レンダリングを防止
 */
export const ProductFormCardBasic: React.FC<ProductFormCardBasicProps> = memo(({
  index,
  control,
  errors,
  onRemove,
  showRemove,
  productNameOptions = [],
  originOptions = [],
  onEnterPress,
  suppliers,
  onNavigateToStep: _onNavigateToStep,
  onAddProductFromPreset,
}) => {
  const productErrors = errors.products?.[index];
  const { showSuccess, showError } = useNotification();
  const { setValue } = useFormContext<OrderFormData>();
  const { user } = useAuthContext();
  const firestoreService = useFirestoreService();
  const { presets: supplierPresets } = useSupplierPresets();

  // 現在の値を監視 (統合されたuseWatch - 再レンダリング最適化)
  // NOTE: 9個の個別useWatchを2個に統合してパフォーマンス向上
  const currentProduct = useWatch({ control, name: `products.${index}` });
  const allProducts = useWatch({ control, name: 'products' }) || [];

  // 分割代入で個別のフィールドを取得
  const {
    categoryCode: currentCategoryCode,
    supplier: currentSupplier,
    name: currentName,
    origin: currentOrigin,
    specification: currentSpecification,
    quantityPerPackage: currentQuantityPerPackage,
    specificationUnit: currentSpecificationUnit,
    packageUnit: currentPackageUnit,
  } = currentProduct || {};

  // カテゴリー選択モーダルの状態
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // プリセット選択モーダルの状態
  const [presetModalOpen, setPresetModalOpen] = useState(false);

  // 品名履歴モーダルの状態
  const [nameHistoryModalOpen, setNameHistoryModalOpen] = useState(false);

  // 商品保存確認ダイアログの状態
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // 帳合先選択モーダルの状態
  const [supplierSelectOpen, setSupplierSelectOpen] = useState(false);

  // プリセット上書き確認ダイアログの状態
  const [presetConfirmDialog, setPresetConfirmDialog] = useState<{
    open: boolean;
    preset: ProductHistoryItem | null;
  }>({
    open: false,
    preset: null,
  });

  // カード長押しメニューの状態
  const [cardMenuAnchor, setCardMenuAnchor] = useState<null | HTMLElement>(null);

  // カード長押しタイマー
  const cardLongPressTimer = useRef<number | null>(null);
  const cardLongPressStartPos = useRef<{ x: number; y: number } | null>(null);

  // プリセットモーダル用の商品履歴フック（ステップ1で選択された全帳合先の履歴）
  // PL呼び出し時は必ずステップ1の選択リスト全体を読み込む
  const {
    history: presetHistory,
    loadHistory: reloadPresetHistory,
  } = useProductHistory(suppliers, undefined);

  // 現在の商品情報がプリセットと一致しているかをチェック
  const isMatchingPreset = useMemo(() => {
    if (!currentName || !currentOrigin) return false;

    return presetHistory.some(preset =>
      preset.name === currentName &&
      preset.origin === currentOrigin &&
      preset.specification === (currentSpecification || '') &&
      preset.quantityPerPackage === currentQuantityPerPackage &&
      preset.specificationUnit === (currentSpecificationUnit || '') &&
      preset.packageUnit === (currentPackageUnit || '')
    );
  }, [
    presetHistory,
    currentName,
    currentOrigin,
    currentSpecification,
    currentQuantityPerPackage,
    currentSpecificationUnit,
    currentPackageUnit,
  ]);

  // オートコンプリート用の商品履歴フック（現在の商品の帳合先とカテゴリーでフィルタ）
  const {
    getUniqueNames,
    getUniqueOrigins,
    getUniqueSpecifications,
    getUniqueQuantities,
    getUniqueUnits,
    deleteHistory,
    getCategoryCodeByName,
  } = useProductHistory(
    currentSupplier || undefined,
    currentCategoryCode || undefined
  );

  // 削除確認ダイアログの状態
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    type: 'name',
    value: '',
    conditions: {},
  });

  // 長押し検出用のタイマー（履歴削除用）
  const longPressTimer = useRef<number | null>(null);

  /**
   * Enterキー押下時のハンドラー
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnterPress && e.target instanceof HTMLInputElement) {
      // テキストエリア以外でEnterが押された場合
      if (e.target.type !== 'textarea') {
        e.preventDefault();
        onEnterPress();
      }
    }
  };

  /**
   * 商品情報を履歴として保存
   */
  const handleSaveProductToHistory = async () => {
    if (!user || !currentSupplier) {
      showError('ユーザーまたは帳合先が設定されていません');
      return;
    }

    if (!currentName || !currentOrigin) {
      showError('品名と産地は必須です');
      return;
    }

    try {
      await firestoreService.saveProductHistory(
        user.uid,
        currentSupplier,
        currentName,
        currentOrigin,
        currentSpecification || '',
        currentQuantityPerPackage ?? null,
        currentSpecificationUnit || '',
        currentPackageUnit || '',
        currentCategoryCode
      );

      setSaveDialogOpen(false);
      showSuccess('商品情報を履歴に保存しました');

      // 履歴を再読み込み
      await reloadPresetHistory();
    } catch (error) {
      console.error('[ProductFormCardBasic] Failed to save product history:', error);
      showError('商品情報の保存に失敗しました');
    }
  };

  /**
   * カテゴリーChipをクリック（モーダルを開く）
   */
  const handleCategoryChipClick = () => {
    setCategoryModalOpen(true);
  };

  /**
   * カテゴリー選択
   */
  const handleSelectCategory = (categoryCode: string) => {
    setValue(`products.${index}.categoryCode`, categoryCode);
  };

  /**
   * カテゴリークリア（×ボタン）
   */
  const handleClearCategory = (e: React.MouseEvent) => {
    e.stopPropagation(); // Chipのクリックイベントを止める
    setValue(`products.${index}.categoryCode`, '');
  };

  /**
   * 帳合先を選択
   */
  const handleSelectSupplier = (supplier: string) => {
    setValue(`products.${index}.supplier`, supplier);
  };

  /**
   * 帳合先チップをクリック
   */
  const handleSupplierClick = () => {
    // suppliersがない場合はプリセット全体を使用
    const availableSuppliers = suppliers && suppliers.length > 0
      ? suppliers
      : supplierPresets.map(p => p.supplier);

    if (availableSuppliers.length === 0) {
      showError('帳合先が登録されていません。設定から追加してください。');
      return;
    }
    setSupplierSelectOpen(true);
  };

  /**
   * プリセットを一括設定
   */
  const handleSelectPreset = (preset: ProductHistoryItem) => {
    // 現在のフィールドに値があるかチェック
    const hasValues = Boolean(
      currentName ||
      currentOrigin ||
      currentSpecification ||
      currentQuantityPerPackage ||
      currentSpecificationUnit
    );

    if (hasValues) {
      // 値がある場合は確認ダイアログを表示
      setPresetConfirmDialog({ open: true, preset });
      setPresetModalOpen(false);
    } else {
      // 値がない場合は直接上書き
      applyPreset(preset);
      setPresetModalOpen(false);
    }
  };

  /**
   * プリセットを現在のカードに適用
   */
  const applyPreset = (preset: ProductHistoryItem) => {
    setValue(`products.${index}.categoryCode`, preset.categoryCode || '');
    setValue(`products.${index}.supplier`, preset.supplier);
    setValue(`products.${index}.name`, preset.name);
    setValue(`products.${index}.origin`, preset.origin);
    setValue(`products.${index}.specification`, preset.specification);
    setValue(`products.${index}.quantityPerPackage`, preset.quantityPerPackage);
    setValue(`products.${index}.specificationUnit`, preset.specificationUnit);
    setValue(`products.${index}.packageUnit`, preset.packageUnit);
    showSuccess('プリセットを読み込みました');
  };

  /**
   * プリセットを上書き（確認後）
   */
  const handleOverwritePreset = () => {
    if (presetConfirmDialog.preset) {
      applyPreset(presetConfirmDialog.preset);
      setPresetConfirmDialog({ open: false, preset: null });
    }
  };

  /**
   * プリセットを新規カードとして追加（確認後）
   */
  const handleAddAsNewCard = () => {
    if (presetConfirmDialog.preset && onAddProductFromPreset) {
      onAddProductFromPreset(presetConfirmDialog.preset);
      setPresetConfirmDialog({ open: false, preset: null });
      showSuccess('新規カードとして追加しました');
    }
  };

  /**
   * 品名履歴から削除
   */
  const handleDeleteNameHistory = async (name: string) => {
    try {
      const count = await deleteHistory({ name }, currentSupplier);
      showSuccess(`${count}件の履歴を削除しました`);
    } catch (error) {
      showError('履歴の削除に失敗しました');
      throw error;
    }
  };

  /**
   * プリセットを削除
   */
  const handleDeletePreset = async (presetId: string) => {
    try {
      await firestoreService.deleteProductHistoryById(presetId);
      showSuccess('プリセットを削除しました');
      // 履歴を再読み込み
      await reloadPresetHistory();
    } catch (error) {
      console.error('[ProductFormCardBasic] Failed to delete preset:', error);
      showError('プリセットの削除に失敗しました');
      throw error; // モーダルにエラーを伝播
    }
  };

  /**
   * 品名選択時にカテゴリーを自動設定
   */
  useEffect(() => {
    if (currentName && !currentCategoryCode) {
      const categoryCode = getCategoryCodeByName(currentName);
      if (categoryCode) {
        setValue(`products.${index}.categoryCode`, categoryCode);
      }
    }
  }, [currentName, currentCategoryCode, getCategoryCodeByName, setValue, index]);

  /**
   * 長押し開始
   */
  const handleLongPressStart = (
    type: 'name' | 'origin' | 'specification' | 'quantity' | 'specificationUnit',
    value: string | number,
    conditions: DeleteDialogState['conditions']
  ) => {
    longPressTimer.current = window.setTimeout(() => {
      setDeleteDialog({
        open: true,
        type,
        value,
        conditions,
      });
    }, 500); // 500ms長押しで削除確認ダイアログ表示
  };

  /**
   * 長押し終了
   */
  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /**
   * 履歴削除を実行
   */
  const handleDeleteHistory = async () => {
    try {
      const count = await deleteHistory(deleteDialog.conditions, currentSupplier);
      setDeleteDialog({ ...deleteDialog, open: false });
      showSuccess(`${count}件の履歴を削除しました`);
    } catch (error) {
      showError('履歴の削除に失敗しました');
    }
  };

  /**
   * 削除確認ダイアログを閉じる
   */
  const handleCloseDialog = () => {
    setDeleteDialog({ ...deleteDialog, open: false });
  };

  /**
   * 商品カードの値をクリア
   */
  const handleClearProduct = () => {
    setValue(`products.${index}.categoryCode`, '');
    setValue(`products.${index}.name`, '');
    setValue(`products.${index}.origin`, '');
    setValue(`products.${index}.specification`, '');
    setValue(`products.${index}.quantityPerPackage`, null);
    setValue(`products.${index}.specificationUnit`, '');
    setCardMenuAnchor(null);
    showSuccess('商品情報をクリアしました');
  };

  /**
   * カード長押し開始
   */
  const handleCardLongPressStart = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // タッチ開始位置を保存
    cardLongPressStartPos.current = { x: clientX, y: clientY };

    cardLongPressTimer.current = window.setTimeout(() => {
      setCardMenuAnchor(target);
    }, 500); // 500ms長押しでメニュー表示
  };

  /**
   * カード長押し中の移動（スクロール検出）
   */
  const handleCardLongPressMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!cardLongPressStartPos.current || !cardLongPressTimer.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = Math.abs(clientX - cardLongPressStartPos.current.x);
    const deltaY = Math.abs(clientY - cardLongPressStartPos.current.y);

    // 横方向のスワイプ（ステップ移動）の場合は長押しをキャンセルしてイベントを伝播
    if (deltaX > 10 && deltaX > deltaY) {
      if (cardLongPressTimer.current) {
        window.clearTimeout(cardLongPressTimer.current);
        cardLongPressTimer.current = null;
      }
      cardLongPressStartPos.current = null;
      return; // 早期リターンでイベントを伝播
    }

    // 5px以上移動したらスクロールとみなして長押しをキャンセル
    if (deltaX > 5 || deltaY > 5) {
      if (cardLongPressTimer.current) {
        window.clearTimeout(cardLongPressTimer.current);
        cardLongPressTimer.current = null;
      }
      cardLongPressStartPos.current = null;
    }
  };

  /**
   * カード長押し終了
   */
  const handleCardLongPressEnd = () => {
    if (cardLongPressTimer.current) {
      window.clearTimeout(cardLongPressTimer.current);
      cardLongPressTimer.current = null;
    }
    cardLongPressStartPos.current = null;
  };

  /**
   * カードメニューを閉じる
   */
  const handleCardMenuClose = () => {
    setCardMenuAnchor(null);
  };

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          mb: 1.5,
          transition: 'all 0.2s ease-in-out',
          '&:active': {
            transform: 'scale(0.98)',
            boxShadow: 2,
          },
        }}
        onKeyDown={handleKeyDown}
        onTouchStart={handleCardLongPressStart}
        onTouchMove={handleCardLongPressMove}
        onTouchEnd={handleCardLongPressEnd}
        onMouseDown={handleCardLongPressStart}
        onMouseMove={handleCardLongPressMove}
        onMouseUp={handleCardLongPressEnd}
        onMouseLeave={handleCardLongPressEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          setCardMenuAnchor(e.currentTarget);
        }}
      >
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          {/* ヘッダー: 商品番号 + プリセットボタン + 帳合先ツールチップ + クリアボタン + 削除ボタン */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Typography variant="subtitle1" fontWeight="medium">
                  商品 {index + 1}
                </Typography>
                {isMatchingPreset ? (
                  <Bookmark sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                ) : (
                  <BookmarkBorder sx={{ fontSize: '0.9rem', color: 'text.secondary', opacity: 0.5 }} />
                )}
              </Box>
              {(() => {
                const supplierColor = currentSupplier ? getSupplierColorByName(currentSupplier, supplierPresets) : undefined;
                return (
                  <Chip
                    icon={<Business sx={{ color: supplierColor ? `${supplierColor} !important` : undefined }} />}
                    label={currentSupplier || '帳合先'}
                    onClick={handleSupplierClick}
                    variant={currentSupplier ? 'filled' : 'outlined'}
                    size="small"
                    sx={{
                      fontSize: '0.75rem',
                      ...(supplierColor && {
                        bgcolor: getSupplierColorWithOpacity(supplierColor, 0.15),
                        color: supplierColor,
                        borderColor: supplierColor,
                        '& .MuiChip-icon': {
                          color: supplierColor,
                        },
                        '&:hover': {
                          bgcolor: getSupplierColorWithOpacity(supplierColor, 0.25),
                        },
                      }),
                    }}
                  />
                );
              })()}
            </Box>
          </Box>

          {/* カテゴリーChip */}
          <Box sx={{ mb: 1.5 }}>
            {currentCategoryCode ? (
              <Chip
                icon={<CategoryIcon />}
                label={getCategoryName(currentCategoryCode)}
                onClick={handleCategoryChipClick}
                onDelete={handleClearCategory}
                color="primary"
                size="small"
                sx={{ fontSize: '0.8rem' }}
              />
            ) : (
              <Chip
                icon={<CategoryIcon />}
                label="+ カテゴリーを追加"
                onClick={handleCategoryChipClick}
                variant="outlined"
                size="small"
                sx={{ fontSize: '0.8rem', color: 'text.secondary' }}
              />
            )}
          </Box>

          {/* 履歴保存ボタン */}
          <Box sx={{ mb: 1.5, display: 'flex', gap: 1 }}>
            <Tooltip title="現在の商品情報を履歴として保存">
              <Button
                size="small"
                variant="outlined"
                startIcon={isMatchingPreset ? <Bookmark /> : <Save />}
                onClick={() => {
                  if (currentName && currentOrigin) {
                    setSaveDialogOpen(true);
                  } else {
                    showError('品名と産地を入力してください');
                  }
                }}
                disabled={!currentName || !currentOrigin || isMatchingPreset}
                sx={{ fontSize: '0.75rem' }}
              >
                {isMatchingPreset ? '保存済み' : '履歴に保存'}
              </Button>
            </Tooltip>
          </Box>

          <Grid container spacing={1.5}>
            {/* 品名 */}
            <Grid item xs={12}>
              <Controller
                name={`products.${index}.name`}
                control={control}
                render={({ field }) => (
                  <Box>
                    <Autocomplete
                      {...field}
                      options={productNameOptions}
                      freeSolo
                      size="small"
                      value={field.value || ''}
                      onChange={(_, newValue) => field.onChange(newValue || '')}
                      onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="品名"
                          placeholder="例: りんご"
                          error={!!productErrors?.name}
                          helperText={productErrors?.name?.message}
                          required
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <InputAdornment position="start">
                                  <IconButton
                                    size="small"
                                    onClick={() => setNameHistoryModalOpen(true)}
                                    edge="start"
                                    title="品名履歴を表示"
                                  >
                                    <History fontSize="small" />
                                  </IconButton>
                                </InputAdornment>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Box>
                )}
              />
            </Grid>

            {/* 産地 */}
            <Grid item xs={12}>
              <Controller
                name={`products.${index}.origin`}
                control={control}
                render={({ field }) => {
                  const origins = currentName ? getUniqueOrigins(currentName) : [];
                  return (
                    <Box>
                      <Autocomplete
                        {...field}
                        options={originOptions}
                        freeSolo
                        size="small"
                        value={field.value || ''}
                        onChange={(_, newValue) => field.onChange(newValue || '')}
                        onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="産地"
                            placeholder="例: 青森県"
                            error={!!productErrors?.origin}
                            helperText={productErrors?.origin?.message}
                            required
                          />
                        )}
                      />
                      {/* 産地履歴チップ */}
                      {origins.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          {origins.slice(0, 10).map((origin) => (
                            <Chip
                              key={origin}
                              label={origin}
                              size="small"
                              onClick={() => field.onChange(origin)}
                              onTouchStart={() =>
                                handleLongPressStart('origin', origin, { name: currentName, origin })
                              }
                              onTouchEnd={handleLongPressEnd}
                              onMouseDown={() =>
                                handleLongPressStart('origin', origin, { name: currentName, origin })
                              }
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setDeleteDialog({
                                  open: true,
                                  type: 'origin',
                                  value: origin,
                                  conditions: { name: currentName, origin },
                                });
                              }}
                              color={field.value === origin ? 'primary' : 'default'}
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  );
                }}
              />
            </Grid>

            {/* 規格 */}
            <Grid item xs={6}>
              <Controller
                name={`products.${index}.specification`}
                control={control}
                render={({ field }) => {
                  const specs =
                    currentName && currentOrigin
                      ? getUniqueSpecifications(currentName, currentOrigin)
                      : [];
                  return (
                    <Box>
                      <TextField
                        {...field}
                        label="規格"
                        placeholder="例: L、2L"
                        size="small"
                        error={!!productErrors?.specification}
                        helperText={productErrors?.specification?.message}
                        value={field.value || ''}
                        fullWidth
                        required
                      />
                      {/* 規格履歴チップ */}
                      {specs.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          {specs.slice(0, 10).map((spec) => (
                            <Chip
                              key={spec}
                              label={spec}
                              size="small"
                              onClick={() => field.onChange(spec)}
                              onTouchStart={() =>
                                handleLongPressStart('specification', spec, {
                                  name: currentName,
                                  origin: currentOrigin,
                                  specification: spec,
                                })
                              }
                              onTouchEnd={handleLongPressEnd}
                              onMouseDown={() =>
                                handleLongPressStart('specification', spec, {
                                  name: currentName,
                                  origin: currentOrigin,
                                  specification: spec,
                                })
                              }
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setDeleteDialog({
                                  open: true,
                                  type: 'specification',
                                  value: spec,
                                  conditions: {
                                    name: currentName,
                                    origin: currentOrigin,
                                    specification: spec,
                                  },
                                });
                              }}
                              color={field.value === spec ? 'primary' : 'default'}
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  );
                }}
              />
            </Grid>

            {/* 単位 */}
            <Grid item xs={6}>
              <Controller
                name={`products.${index}.specificationUnit`}
                control={control}
                render={({ field }) => {
                  const units =
                    currentName && currentOrigin && currentSpecification
                      ? getUniqueUnits(currentName, currentOrigin, currentSpecification)
                      : [];
                  return (
                    <Box>
                      <TextField
                        {...field}
                        label="規格の単位"
                        placeholder="例: 玉、g、個"
                        size="small"
                        error={!!productErrors?.specificationUnit}
                        helperText={productErrors?.specificationUnit?.message}
                        value={field.value || ''}
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Box
                                onClick={() => {
                                  field.onChange('gあたり');
                                  // 規格が未入力の場合は「100」を自動設定
                                  if (!currentSpecification) {
                                    setValue(`products.${index}.specification`, '100');
                                  }
                                }}
                                sx={{
                                  px: 0.75,
                                  py: 0.25,
                                  bgcolor: field.value === 'gあたり' ? 'primary.main' : 'grey.100',
                                  color: field.value === 'gあたり' ? 'white' : 'text.secondary',
                                  borderRadius: 1,
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    bgcolor: field.value === 'gあたり' ? 'primary.dark' : 'grey.200',
                                  },
                                }}
                              >
                                gあたり
                              </Box>
                            </InputAdornment>
                          ),
                        }}
                      />
                      {/* 単位履歴チップ */}
                      {units.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          {units.slice(0, 10).map((specificationUnit) => (
                            <Chip
                              key={specificationUnit}
                              label={specificationUnit}
                              size="small"
                              onClick={() => field.onChange(specificationUnit)}
                              onTouchStart={() =>
                                handleLongPressStart('specificationUnit', specificationUnit, {
                                  name: currentName,
                                  origin: currentOrigin,
                                  specification: currentSpecification,
                                  specificationUnit,
                                })
                              }
                              onTouchEnd={handleLongPressEnd}
                              onMouseDown={() =>
                                handleLongPressStart('specificationUnit', specificationUnit, {
                                  name: currentName,
                                  origin: currentOrigin,
                                  specification: currentSpecification,
                                  specificationUnit,
                                })
                              }
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setDeleteDialog({
                                  open: true,
                                  type: 'specificationUnit',
                                  value: specificationUnit,
                                  conditions: {
                                    name: currentName,
                                    origin: currentOrigin,
                                    specification: currentSpecification,
                                    specificationUnit,
                                  },
                                });
                              }}
                              color={field.value === specificationUnit ? 'primary' : 'default'}
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  );
                }}
              />
            </Grid>

            {/* 入数 */}
            <Grid item xs={6}>
              <Controller
                name={`products.${index}.quantityPerPackage`}
                control={control}
                render={({ field }) => {
                  const quantities =
                    currentName && currentOrigin && currentSpecification
                      ? getUniqueQuantities(currentName, currentOrigin, currentSpecification)
                      : [];
                  return (
                    <Box>
                      <TextField
                        {...field}
                        type="number"
                        label="入数"
                        placeholder="例: 40"
                        size="small"
                        error={!!productErrors?.quantityPerPackage}
                        helperText={productErrors?.quantityPerPackage?.message}
                        inputProps={{ min: 1, step: 1 }}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseInt(value, 10) : null);
                        }}
                        fullWidth
                        required
                      />
                      {/* 入数履歴チップ */}
                      {quantities.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          {quantities.slice(0, 10).map((qty) => (
                            <Chip
                              key={qty}
                              label={String(qty)}
                              size="small"
                              onClick={() => field.onChange(qty)}
                              onTouchStart={() =>
                                handleLongPressStart('quantity', qty, {
                                  name: currentName,
                                  origin: currentOrigin,
                                  specification: currentSpecification,
                                  quantityPerPackage: qty,
                                })
                              }
                              onTouchEnd={handleLongPressEnd}
                              onMouseDown={() =>
                                handleLongPressStart('quantity', qty, {
                                  name: currentName,
                                  origin: currentOrigin,
                                  specification: currentSpecification,
                                  quantityPerPackage: qty,
                                })
                              }
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setDeleteDialog({
                                  open: true,
                                  type: 'quantity',
                                  value: qty,
                                  conditions: {
                                    name: currentName,
                                    origin: currentOrigin,
                                    specification: currentSpecification,
                                    quantityPerPackage: qty,
                                    specificationUnit: currentSpecificationUnit,
                                    packageUnit: currentPackageUnit,
                                  },
                                });
                              }}
                              color={field.value === qty ? 'primary' : 'default'}
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  );
                }}
              />
            </Grid>

            {/* 入数の単位 */}
            <Grid item xs={6}>
              <Controller
                name={`products.${index}.packageUnit`}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="入数の単位"
                    placeholder="例: 個、袋、パック"
                    size="small"
                    error={!!productErrors?.packageUnit}
                    helperText={productErrors?.packageUnit?.message}
                    value={field.value || ''}
                    fullWidth
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Stack direction="row" spacing={0.5}>
                            {['kg', 'g'].map((unitOption) => (
                              <Box
                                key={unitOption}
                                onClick={() => field.onChange(unitOption)}
                                sx={{
                                  px: 0.75,
                                  py: 0.25,
                                  bgcolor: field.value === unitOption ? 'primary.main' : 'grey.100',
                                  color: field.value === unitOption ? 'white' : 'text.secondary',
                                  borderRadius: 1,
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    bgcolor: field.value === unitOption ? 'primary.dark' : 'grey.200',
                                  },
                                }}
                              >
                                {unitOption}
                              </Box>
                            ))}
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <DeleteHistoryDialog
        state={deleteDialog}
        onClose={handleCloseDialog}
        onDelete={handleDeleteHistory}
      />

      {/* 商品保存確認ダイアログ */}
      <SaveProductDialog
        open={saveDialogOpen}
        product={{
          categoryCode: currentCategoryCode,
          name: currentName || '',
          origin: currentOrigin || '',
          specification: currentSpecification,
          specificationUnit: currentSpecificationUnit,
          quantityPerPackage: currentQuantityPerPackage,
          packageUnit: currentPackageUnit,
        }}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveProductToHistory}
        title="商品情報を保存"
        description="現在入力中の商品情報を履歴として保存しますか？"
      />

      {/* カテゴリー選択モーダル */}
      <CategorySelectModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSelect={handleSelectCategory}
        selectedCategoryCode={currentCategoryCode}
      />

      {/* プリセット選択モーダル */}
      <ProductPresetModal
        open={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        onSelect={handleSelectPreset}
        onDelete={handleDeletePreset}
        presets={presetHistory}
        onReload={reloadPresetHistory}
        userId={user?.uid}
        supplier={currentSupplier}
        suppliers={suppliers}
        currentProducts={allProducts.map((product) => ({
          name: product.name,
          origin: product.origin,
          specification: product.specification,
          supplier: product.supplier,
        }))}
      />

      {/* 品名履歴モーダル */}
      <ProductNameHistoryModal
        open={nameHistoryModalOpen}
        onClose={() => setNameHistoryModalOpen(false)}
        onSelect={(name) => {
          setValue(`products.${index}.name`, name);
        }}
        names={getUniqueNames}
        onDelete={handleDeleteNameHistory}
      />

      {/* 帳合先選択ダイアログ */}
      <SupplierSelectDialog
        open={supplierSelectOpen}
        onClose={() => setSupplierSelectOpen(false)}
        onSelect={handleSelectSupplier}
        suppliers={
          suppliers && suppliers.length > 0
            ? suppliers
            : supplierPresets.map((p) => p.supplier)
        }
        currentSupplier={currentSupplier}
        supplierPresets={supplierPresets}
      />

      {/* プリセット上書き確認ダイアログ */}
      <PresetConfirmDialog
        open={presetConfirmDialog.open}
        preset={presetConfirmDialog.preset}
        onClose={() => setPresetConfirmDialog({ open: false, preset: null })}
        onOverwrite={handleOverwritePreset}
        onAddNew={onAddProductFromPreset ? handleAddAsNewCard : undefined}
      />

      {/* カード長押しメニュー */}
      <CardContextMenu
        anchorEl={cardMenuAnchor}
        onClose={handleCardMenuClose}
        onClear={handleClearProduct}
        onDelete={onRemove}
        canDelete={showRemove}
      />
    </>
  );
});

// displayNameを設定（React DevToolsでの表示用）
ProductFormCardBasic.displayName = 'ProductFormCardBasic';
