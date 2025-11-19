import React, { useState, useRef, useEffect } from 'react';
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
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText,
  ButtonBase,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Fade,
  Grow,
} from '@mui/material';
import { Delete, Category as CategoryIcon, Inventory2, BookmarkBorder, Clear, History, Business, DeleteOutline, ClearAll } from '@mui/icons-material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { useProductHistory } from '@/hooks/useProductHistory';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';
import { useNotification } from '@/context/NotificationContext';
import { useAuthContext } from '@/context/AuthContext';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { CategorySelectModal } from '@/components/modals/CategorySelectModal';
import { ProductPresetModal } from '@/components/modals/ProductPresetModal';
import { ProductNameHistoryModal } from '@/components/modals/ProductNameHistoryModal';
import { getCategoryName } from '@/utils/categories';

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
}

/**
 * 削除確認ダイアログの状態
 */
interface DeleteDialogState {
  open: boolean;
  type: 'name' | 'origin' | 'specification' | 'quantity' | 'unit';
  value: string | number;
  conditions: {
    name?: string;
    origin?: string;
    specification?: string;
    quantityPerPackage?: number;
    unit?: string;
  };
}

/**
 * 商品基本情報フォームカード
 *
 * 1つの商品の基本情報を入力するフォームです。
 * 品名、産地、規格、入数を入力します。
 */
export const ProductFormCardBasic: React.FC<ProductFormCardBasicProps> = ({
  index,
  control,
  errors,
  onRemove,
  showRemove,
  productNameOptions = [],
  originOptions = [],
  onEnterPress,
  suppliers,
}) => {
  const productErrors = errors.products?.[index];
  const { showSuccess, showError } = useNotification();
  const { setValue } = useFormContext<OrderFormData>();
  const { user } = useAuthContext();

  // 現在の値を監視
  const currentCategoryCode = useWatch({ control, name: `products.${index}.categoryCode` });
  const currentSupplier = useWatch({ control, name: `products.${index}.supplier` });
  const currentName = useWatch({ control, name: `products.${index}.name` });
  const currentOrigin = useWatch({ control, name: `products.${index}.origin` });
  const currentSpecification = useWatch({ control, name: `products.${index}.specification` });
  const currentQuantityPerPackage = useWatch({ control, name: `products.${index}.quantityPerPackage` });
  const currentUnit = useWatch({ control, name: `products.${index}.unit` });

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

  // カード長押しメニューの状態
  const [cardMenuAnchor, setCardMenuAnchor] = useState<null | HTMLElement>(null);
  const cardMenuOpen = Boolean(cardMenuAnchor);

  // カード長押しタイマー
  const cardLongPressTimer = useRef<number | null>(null);

  // プリセットモーダル用の商品履歴フック（ステップ1で選択された全帳合先の履歴）
  // PL呼び出し時は必ずステップ1の選択リスト全体を読み込む
  const {
    history: presetHistory,
    loadHistory: reloadPresetHistory,
  } = useProductHistory(suppliers, undefined);

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
  // 商品ヘッダー長押し検出用のタイマー（商品保存用）
  const productHeaderLongPressTimer = useRef<number | null>(null);

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
   * 商品ヘッダー長押し開始（商品保存）
   */
  const handleProductHeaderLongPressStart = () => {
    productHeaderLongPressTimer.current = window.setTimeout(() => {
      // 品名と産地が入力されているか確認
      if (currentName && currentOrigin) {
        setSaveDialogOpen(true);
      } else {
        showError('品名と産地を入力してください');
      }
    }, 500);
  };

  /**
   * 商品ヘッダー長押し終了
   */
  const handleProductHeaderLongPressEnd = () => {
    if (productHeaderLongPressTimer.current) {
      window.clearTimeout(productHeaderLongPressTimer.current);
      productHeaderLongPressTimer.current = null;
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
      await FirestoreService.saveProductHistory(
        user.uid,
        currentSupplier,
        currentName,
        currentOrigin,
        currentSpecification || '',
        currentQuantityPerPackage ?? null,
        currentUnit || '',
        currentCategoryCode
      );

      setSaveDialogOpen(false);
      showSuccess('商品情報を履歴に保存しました');

      // 履歴を再読み込み（次回のレンダリングで反映される）
      // useProductHistoryフックが自動的に履歴を再取得します
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
    setSupplierSelectOpen(false);
  };

  /**
   * 長押し開始（帳合先選択用）
   */
  const handleSupplierLongPressStart = () => {
    if (!suppliers || suppliers.length === 0) {
      showError('ステップ1で帳合先を選択してください');
      return;
    }
    longPressTimer.current = window.setTimeout(() => {
      setSupplierSelectOpen(true);
    }, 500);
  };

  /**
   * プリセット選択ボタンをクリック
   */
  const handlePresetButtonClick = () => {
    // ステップ1で帳合先が選択されていればモーダルを開く
    if (!suppliers || suppliers.length === 0) {
      showError('ステップ1で帳合先を選択してください');
      return;
    }
    setPresetModalOpen(true);
  };

  /**
   * プリセットを一括設定
   */
  const handleSelectPreset = (preset: ProductHistoryItem) => {
    setValue(`products.${index}.categoryCode`, preset.categoryCode || '');
    setValue(`products.${index}.supplier`, preset.supplier);
    setValue(`products.${index}.name`, preset.name);
    setValue(`products.${index}.origin`, preset.origin);
    setValue(`products.${index}.specification`, preset.specification);
    setValue(`products.${index}.quantityPerPackage`, preset.quantityPerPackage);
    setValue(`products.${index}.unit`, preset.unit);
    showSuccess('プリセットを読み込みました');
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
      await FirestoreService.deleteProductHistoryById(presetId);
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
    type: 'name' | 'origin' | 'specification' | 'quantity' | 'unit',
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
    setValue(`products.${index}.unit`, '');
    setCardMenuAnchor(null);
    showSuccess('商品情報をクリアしました');
  };

  /**
   * カード長押し開始
   */
  const handleCardLongPressStart = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    cardLongPressTimer.current = window.setTimeout(() => {
      setCardMenuAnchor(target);
    }, 500); // 500ms長押しでメニュー表示
  };

  /**
   * カード長押し終了
   */
  const handleCardLongPressEnd = () => {
    if (cardLongPressTimer.current) {
      window.clearTimeout(cardLongPressTimer.current);
      cardLongPressTimer.current = null;
    }
  };

  /**
   * カードメニューを閉じる
   */
  const handleCardMenuClose = () => {
    setCardMenuAnchor(null);
  };

  /**
   * カードメニューから削除
   */
  const handleCardMenuDelete = () => {
    setCardMenuAnchor(null);
    onRemove();
  };

  /**
   * カードメニューからクリア
   */
  const handleCardMenuClear = () => {
    handleClearProduct();
  };

  /**
   * 削除メッセージの生成
   */
  const getDeleteMessage = () => {
    const { type, value } = deleteDialog;
    switch (type) {
      case 'name':
        return `品名「${value}」の履歴を削除しますか？`;
      case 'origin':
        return `産地「${value}」の履歴を削除しますか？`;
      case 'specification':
        return `規格「${value}」の履歴を削除しますか？`;
      case 'quantity':
        return `入数「${value}」の履歴を削除しますか？`;
      case 'unit':
        return `単位「${value}」の履歴を削除しますか？`;
    }
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
        onTouchEnd={handleCardLongPressEnd}
        onMouseDown={handleCardLongPressStart}
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
              <ButtonBase
                onTouchStart={handleProductHeaderLongPressStart}
                onTouchEnd={handleProductHeaderLongPressEnd}
                onMouseDown={handleProductHeaderLongPressStart}
                onMouseUp={handleProductHeaderLongPressEnd}
                onMouseLeave={handleProductHeaderLongPressEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (currentName && currentOrigin) {
                    setSaveDialogOpen(true);
                  } else {
                    showError('品名と産地を入力してください');
                  }
                }}
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Typography variant="subtitle1" fontWeight="medium">
                  商品 {index + 1}
                </Typography>
                <BookmarkBorder sx={{ fontSize: '0.9rem', color: 'text.secondary', opacity: 0.5 }} />
              </ButtonBase>
              <Chip
                icon={<Inventory2 />}
                label="PL"
                onClick={handlePresetButtonClick}
                variant="outlined"
                size="small"
                color="secondary"
                sx={{ fontSize: '0.75rem' }}
              />
              <Chip
                icon={<Business />}
                label={currentSupplier || '帳合先'}
                onTouchStart={handleSupplierLongPressStart}
                onTouchEnd={handleLongPressEnd}
                onMouseDown={handleSupplierLongPressStart}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (suppliers && suppliers.length > 0) {
                    setSupplierSelectOpen(true);
                  } else {
                    showError('ステップ1で帳合先を選択してください');
                  }
                }}
                variant="outlined"
                size="small"
                color={currentSupplier ? 'primary' : 'default'}
                sx={{ fontSize: '0.75rem' }}
              />
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
            <Grid item xs={12}>
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

            {/* 単位 */}
            <Grid item xs={6}>
              <Controller
                name={`products.${index}.unit`}
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
                        label="単位"
                        placeholder="例: 玉、g、個"
                        size="small"
                        error={!!productErrors?.unit}
                        helperText={productErrors?.unit?.message}
                        value={field.value || ''}
                        fullWidth
                      />
                      {/* 単位履歴チップ */}
                      {units.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          {units.slice(0, 10).map((unit) => (
                            <Chip
                              key={unit}
                              label={unit}
                              size="small"
                              onClick={() => field.onChange(unit)}
                              onTouchStart={() =>
                                handleLongPressStart('unit', unit, {
                                  name: currentName,
                                  origin: currentOrigin,
                                  specification: currentSpecification,
                                  unit,
                                })
                              }
                              onTouchEnd={handleLongPressEnd}
                              onMouseDown={() =>
                                handleLongPressStart('unit', unit, {
                                  name: currentName,
                                  origin: currentOrigin,
                                  specification: currentSpecification,
                                  unit,
                                })
                              }
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setDeleteDialog({
                                  open: true,
                                  type: 'unit',
                                  value: unit,
                                  conditions: {
                                    name: currentName,
                                    origin: currentOrigin,
                                    specification: currentSpecification,
                                    unit,
                                  },
                                });
                              }}
                              color={field.value === unit ? 'primary' : 'default'}
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
          </Grid>
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialog.open} onClose={handleCloseDialog}>
        <DialogTitle>履歴の削除</DialogTitle>
        <DialogContent>
          <DialogContentText>{getDeleteMessage()}</DialogContentText>
          <DialogContentText sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
            この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleDeleteHistory} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 商品保存確認ダイアログ */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>商品情報を保存</DialogTitle>
        <DialogContent>
          <DialogContentText>
            現在入力中の商品情報を履歴として保存しますか？
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            {currentCategoryCode && (
              <Typography variant="body2" color="text.secondary">
                カテゴリー: {getCategoryName(currentCategoryCode)}
              </Typography>
            )}
            <Typography variant="body2" fontWeight="medium">
              品名: {currentName}
            </Typography>
            <Typography variant="body2">
              産地: {currentOrigin}
            </Typography>
            {currentSpecification && (
              <Typography variant="body2">
                規格: {currentSpecification}
              </Typography>
            )}
            {currentQuantityPerPackage && (
              <Typography variant="body2">
                入数: {currentQuantityPerPackage}{currentUnit && ` ${currentUnit}`}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleSaveProductToHistory} color="primary" variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

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
      <Dialog open={supplierSelectOpen} onClose={() => setSupplierSelectOpen(false)}>
        <DialogTitle>帳合先を選択</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            この商品の帳合先を選択してください
          </DialogContentText>
          <Stack spacing={1}>
            {suppliers?.map((supplier) => (
              <Button
                key={supplier}
                variant={currentSupplier === supplier ? 'contained' : 'outlined'}
                onClick={() => handleSelectSupplier(supplier)}
                fullWidth
              >
                {supplier}
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierSelectOpen(false)} color="inherit">
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* カード長押しメニュー */}
      <Menu
        anchorEl={cardMenuAnchor}
        open={cardMenuOpen}
        onClose={handleCardMenuClose}
        TransitionComponent={Grow}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 200,
            borderRadius: 2,
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiMenuItem-root': {
              borderRadius: 1,
              mx: 1,
              my: 0.5,
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateX(4px)',
              },
            },
          },
        }}
      >
        <MenuItem
          onClick={handleCardMenuClear}
          sx={{
            color: 'warning.main',
            '&:hover': {
              bgcolor: 'warning.lighter',
            },
          }}
        >
          <ListItemIcon>
            <ClearAll sx={{ color: 'warning.main' }} />
          </ListItemIcon>
          <ListItemText
            primary="フィールドをクリア"
            secondary="入力内容を消去"
            primaryTypographyProps={{ fontWeight: 'medium' }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
        {showRemove && (
          <MenuItem
            onClick={handleCardMenuDelete}
            sx={{
              color: 'error.main',
              '&:hover': {
                bgcolor: 'error.lighter',
              },
            }}
          >
            <ListItemIcon>
              <DeleteOutline sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="商品を削除"
              secondary="この商品カードを削除"
              primaryTypographyProps={{ fontWeight: 'medium' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
