import {
  Drawer,
  Box,
  Stack,
  Typography,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
  Button,
  FormGroup,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Close, FilterList, Visibility } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { STORE_DATA, MODAL_Z_INDEX, ELEMENT_OFFSET } from '@/utils/constants';
import type {
  AllocationHistoryFilters,
  AllocationHistoryView,
  AllocationHistoryTableData,
} from '../hooks';
import type { CompositeKeyField } from '../hooks/useAllocationFilters';

/**
 * AllocationSettingsDrawer Props
 */
export interface AllocationSettingsDrawerProps {
  /** 開閉状態 */
  open: boolean;
  /** 閉じる */
  onClose: () => void;
  /** フィルター状態 */
  filters: AllocationHistoryFilters;
  /** ビュー状態 */
  view: AllocationHistoryView;
  /** テーブルデータ */
  tableData: AllocationHistoryTableData;
}

/**
 * 店舗カテゴリー型
 */
interface StoreCategory {
  id: string;
  name: string;
  storeIds: string[];
}

/**
 * AllocationSettingsDrawer Component
 *
 * 配分履歴詳細モーダルの設定ドロワー。
 * フィルター、列表示/非表示、ソート、複合キー設定を提供します。
 *
 * **機能:**
 * - フィルター設定（商品名/産地/規格/日付）
 * - 列表示/非表示（基本項目 + 店舗36個）
 * - 店舗カテゴリー一括選択
 * - ソート順設定
 * - 複合キー設定
 * - 非表示行の一括再表示
 *
 * @example
 * ```tsx
 * <AllocationSettingsDrawer
 *   open={settingsOpen}
 *   onClose={() => setSettingsOpen(false)}
 *   filters={allocationHistory.filters}
 *   view={allocationHistory.view}
 *   tableData={allocationHistory.tableData}
 * />
 * ```
 */
export const AllocationSettingsDrawer: React.FC<AllocationSettingsDrawerProps> = ({
  open,
  onClose,
  filters,
  view,
  tableData,
}) => {
  const {
    filters: filterState,
    setFilters,
    groupMode,
    sortOrder,
    setSortOrder,
    compositeKeyFields,
    setCompositeKeyFields,
    resetFilters,
    hasActiveFilters,
  } = filters;

  const { hiddenColumns, setHiddenColumns, hiddenRowIds, showAllRows, showAllColumns } = view;

  const { availableFilterValues } = tableData;

  // 店舗カテゴリー（実際のプロジェクトではマスタから取得）
  const storeCategories: StoreCategory[] = [];

  const filterCount =
    filterState.productNames.length +
    filterState.origins.length +
    filterState.specifications.length +
    filterState.dates.length;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}
      PaperProps={{
        sx: {
          borderRadius: '16px 16px 0 0',
          maxHeight: '90vh',
          overflow: 'auto',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* ヘッダー */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            詳細設定
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <Close />
          </IconButton>
        </Stack>

        <Stack spacing={3}>
          {/* フィルター */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterList fontSize="small" />
              フィルター
            </Typography>
            <Stack spacing={2}>
              {/* 商品名フィルター */}
              <FormControl fullWidth size="small">
                <InputLabel>商品名</InputLabel>
                <Select
                  multiple
                  value={filterState.productNames}
                  onChange={(e) => setFilters({ ...filterState, productNames: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={{
                    sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
                  }}
                >
                  {availableFilterValues.productNames.map((name) => (
                    <MenuItem key={name} value={name}>
                      <Checkbox checked={filterState.productNames.includes(name)} />
                      <ListItemText primary={name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* 産地フィルター */}
              <FormControl fullWidth size="small">
                <InputLabel>産地</InputLabel>
                <Select
                  multiple
                  value={filterState.origins}
                  onChange={(e) => setFilters({ ...filterState, origins: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={{
                    sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
                  }}
                >
                  {availableFilterValues.origins.map((origin) => (
                    <MenuItem key={origin} value={origin}>
                      <Checkbox checked={filterState.origins.includes(origin)} />
                      <ListItemText primary={origin} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* 規格フィルター */}
              <FormControl fullWidth size="small">
                <InputLabel>規格</InputLabel>
                <Select
                  multiple
                  value={filterState.specifications}
                  onChange={(e) => setFilters({ ...filterState, specifications: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={{
                    sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
                  }}
                >
                  {availableFilterValues.specifications.map((spec) => (
                    <MenuItem key={spec} value={spec}>
                      <Checkbox checked={filterState.specifications.includes(spec)} />
                      <ListItemText primary={spec} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* 日付フィルター */}
              <FormControl fullWidth size="small">
                <InputLabel>日付</InputLabel>
                <Select
                  multiple
                  value={filterState.dates}
                  onChange={(e) => setFilters({ ...filterState, dates: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={format(parseISO(value), 'M/d(E)', { locale: ja })} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={{
                    sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
                  }}
                >
                  {availableFilterValues.dates.map((date) => (
                    <MenuItem key={date} value={date}>
                      <Checkbox checked={filterState.dates.includes(date)} />
                      <ListItemText primary={format(parseISO(date), 'M月d日(E)', { locale: ja })} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* フィルタークリアボタン */}
              {hasActiveFilters() && (
                <Button size="small" variant="outlined" onClick={resetFilters}>
                  フィルターをクリア
                </Button>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* 列の表示/非表示 */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              列の表示/非表示
            </Typography>

            {/* 基本項目 */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 0.5 }}>
              基本項目
            </Typography>
            <FormGroup>
              {[
                { field: 'deliveryDate', label: '日付' },
                { field: 'productName', label: '品名' },
                { field: 'origin', label: '産地' },
                { field: 'specification', label: '規格' },
                { field: 'quantityPerPackage', label: '入数' },
                { field: 'totalDelivery', label: '合計' },
              ].map(({ field, label }) => (
                <FormControlLabel
                  key={field}
                  control={
                    <Checkbox
                      checked={!hiddenColumns.has(field)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newHidden = new Set(hiddenColumns);
                          newHidden.delete(field);
                          setHiddenColumns(newHidden);
                        } else {
                          const newHidden = new Set(hiddenColumns);
                          newHidden.add(field);
                          setHiddenColumns(newHidden);
                        }
                      }}
                    />
                  }
                  label={label}
                />
              ))}
            </FormGroup>

            {/* 店舗カテゴリー選択 */}
            {storeCategories.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 1 }}>
                  店舗カテゴリー（一括選択）
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {storeCategories.map((category) => {
                    const categoryStoreFields = category.storeIds.map((id) => `store_${id}`);
                    const allVisible = categoryStoreFields.every((field) => !hiddenColumns.has(field));
                    const someVisible = categoryStoreFields.some((field) => !hiddenColumns.has(field));

                    return (
                      <Chip
                        key={category.id}
                        label={`${category.name} (${category.storeIds.length}店舗)`}
                        size="small"
                        color={allVisible ? 'secondary' : someVisible ? 'default' : 'default'}
                        variant={allVisible ? 'filled' : someVisible ? 'outlined' : 'outlined'}
                        onClick={() => {
                          const newHidden = new Set(hiddenColumns);
                          if (allVisible) {
                            categoryStoreFields.forEach((field) => newHidden.add(field));
                          } else {
                            categoryStoreFields.forEach((field) => newHidden.delete(field));
                          }
                          setHiddenColumns(newHidden);
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.8 },
                          opacity: someVisible && !allVisible ? 0.7 : 1,
                        }}
                      />
                    );
                  })}
                </Box>
                <Divider sx={{ my: 1 }} />
              </>
            )}

            {/* 店舗選択（チップスタイル） */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              個別店舗選択
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {STORE_DATA.map((store) => {
                const fieldName = `store_${store.code}`;
                const isVisible = !hiddenColumns.has(fieldName);
                return (
                  <Chip
                    key={store.code}
                    label={`${store.code} ${store.name}`}
                    size="small"
                    color={isVisible ? 'primary' : 'default'}
                    variant={isVisible ? 'filled' : 'outlined'}
                    onClick={() => {
                      const newHidden = new Set(hiddenColumns);
                      if (isVisible) {
                        newHidden.add(fieldName);
                      } else {
                        newHidden.delete(fieldName);
                      }
                      setHiddenColumns(newHidden);
                    }}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.8 },
                    }}
                  />
                );
              })}
            </Box>

            {hiddenColumns.size > 0 && (
              <Button size="small" variant="outlined" sx={{ mt: 2 }} onClick={showAllColumns}>
                すべて表示
              </Button>
            )}
          </Box>

          <Divider />

          {/* 非表示行の管理 */}
          {hiddenRowIds.size > 0 && (
            <Box>
              <Button variant="outlined" fullWidth startIcon={<Visibility />} onClick={showAllRows}>
                非表示の行を再表示 ({hiddenRowIds.size}件)
              </Button>
            </Box>
          )}

          {/* ソート順（商品・複合グループの場合） */}
          {(groupMode === 'product' || groupMode === 'composite') && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                並び順
              </Typography>
              <ToggleButtonGroup
                value={sortOrder}
                exclusive
                onChange={(_, newOrder) => newOrder && setSortOrder(newOrder)}
                size="small"
                fullWidth
              >
                <ToggleButton value="totalDesc">配分量の多い順</ToggleButton>
                <ToggleButton value="totalAsc">配分量の少ない順</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          {/* 複合キーのカスタマイズ */}
          {groupMode === 'composite' && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                複合キー設定
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                グループ化に使用するフィールドを選択してください（複数選択可）
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  { field: 'productName' as CompositeKeyField, label: '品名' },
                  { field: 'origin' as CompositeKeyField, label: '産地' },
                  { field: 'specification' as CompositeKeyField, label: '規格' },
                  { field: 'deliveryDate' as CompositeKeyField, label: '日付' },
                ].map(({ field, label }) => {
                  const isSelected = compositeKeyFields.includes(field);
                  const position = compositeKeyFields.indexOf(field) + 1;
                  return (
                    <Chip
                      key={field}
                      label={isSelected ? `${position}. ${label}` : label}
                      size="small"
                      color={isSelected ? 'primary' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      onClick={() => {
                        if (isSelected) {
                          if (compositeKeyFields.length > 1) {
                            setCompositeKeyFields(compositeKeyFields.filter((f) => f !== field));
                          }
                        } else {
                          setCompositeKeyFields([...compositeKeyFields, field]);
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 },
                      }}
                    />
                  );
                })}
              </Box>

              <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 1 }}>
                選択順がグループ化の階層になります（番号順）
              </Typography>

              {compositeKeyFields.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1 }}
                  onClick={() => setCompositeKeyFields(['productName', 'deliveryDate'])}
                >
                  デフォルトに戻す
                </Button>
              )}
            </Box>
          )}
        </Stack>

        {/* 閉じるボタン */}
        <Button fullWidth variant="contained" color="primary" sx={{ mt: 3 }} onClick={onClose}>
          閉じる
        </Button>
      </Box>
    </Drawer>
  );
};
