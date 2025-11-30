import { Box, Typography, FormGroup, FormControlLabel, Checkbox, Chip, Button, Divider } from '@mui/material';
import { STORE_DATA } from '@/utils/constants';
import type { AllocationHistoryView } from '../hooks';

/**
 * StoreCategory type
 */
interface StoreCategory {
  id: string;
  name: string;
  storeIds: string[];
}

/**
 * ColumnVisibilitySection Props
 */
export interface ColumnVisibilitySectionProps {
  /** ビュー状態 */
  view: AllocationHistoryView;
}

/**
 * ColumnVisibilitySection Component
 *
 * 配分履歴の列表示/非表示設定セクション。
 * 基本項目、店舗カテゴリー、個別店舗の表示/非表示を制御します。
 *
 * **機能:**
 * - 基本項目の列表示/非表示（6項目）
 * - 店舗カテゴリー一括選択
 * - 個別店舗選択（36店舗）
 * - すべて表示ボタン
 *
 * @example
 * ```tsx
 * <ColumnVisibilitySection
 *   view={allocationHistory.view}
 * />
 * ```
 */
export const ColumnVisibilitySection: React.FC<ColumnVisibilitySectionProps> = ({ view }) => {
  const { hiddenColumns, setHiddenColumns, showAllColumns } = view;

  // 店舗カテゴリー（実際のプロジェクトではマスタから取得）
  const storeCategories: StoreCategory[] = [];

  return (
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
  );
};
