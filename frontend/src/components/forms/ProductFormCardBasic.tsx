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
} from '@mui/material';
import { Delete, Category as CategoryIcon } from '@mui/icons-material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { useProductHistory } from '@/hooks/useProductHistory';
import { useNotification } from '@/context/NotificationContext';
import { CategorySelectModal } from '@/components/modals/CategorySelectModal';
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
  /** 帳合先（履歴フィルタ用） */
  supplier?: string;
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
  supplier,
}) => {
  const productErrors = errors.products?.[index];
  const { showSuccess, showError } = useNotification();
  const { setValue } = useFormContext<OrderFormData>();

  // 現在の値を監視
  const currentCategoryCode = useWatch({ control, name: `products.${index}.categoryCode` });
  const currentName = useWatch({ control, name: `products.${index}.name` });
  const currentOrigin = useWatch({ control, name: `products.${index}.origin` });
  const currentSpecification = useWatch({ control, name: `products.${index}.specification` });

  // カテゴリー選択モーダルの状態
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // 商品履歴フック（帳合先とカテゴリーでフィルタ）
  const {
    getUniqueNames,
    getUniqueOrigins,
    getUniqueSpecifications,
    getUniqueQuantities,
    getUniqueUnits,
    deleteHistory,
    getCategoryCodeByName,
  } = useProductHistory(supplier, currentCategoryCode || undefined);

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
      const count = await deleteHistory(deleteDialog.conditions);
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
      <Card variant="outlined" sx={{ mb: 1.5 }} onKeyDown={handleKeyDown}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          {/* ヘッダー: 商品番号 + 削除ボタン */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              商品 {index + 1}
            </Typography>
            {showRemove && (
              <IconButton onClick={onRemove} color="error" size="small" aria-label="商品を削除">
                <Delete fontSize="small" />
              </IconButton>
            )}
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
                        />
                      )}
                    />
                    {/* 品名履歴チップ */}
                    {supplier && getUniqueNames.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                        {getUniqueNames.slice(0, 10).map((name) => (
                          <Chip
                            key={name}
                            label={name}
                            size="small"
                            onClick={() => field.onChange(name)}
                            onTouchStart={() => handleLongPressStart('name', name, { name })}
                            onTouchEnd={handleLongPressEnd}
                            onMouseDown={() => handleLongPressStart('name', name, { name })}
                            onMouseUp={handleLongPressEnd}
                            onMouseLeave={handleLongPressEnd}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setDeleteDialog({
                                open: true,
                                type: 'name',
                                value: name,
                                conditions: { name },
                              });
                            }}
                            color={field.value === name ? 'primary' : 'default'}
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Stack>
                    )}
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

      {/* カテゴリー選択モーダル */}
      <CategorySelectModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSelect={handleSelectCategory}
        selectedCategoryCode={currentCategoryCode}
      />
    </>
  );
};
