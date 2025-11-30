import { Box, Typography, ToggleButtonGroup, ToggleButton, Chip, Button } from '@mui/material';
import type { AllocationHistoryFilters } from '../hooks';
import type { CompositeKeyField } from '../hooks/useAllocationFilters';
import type { GroupMode } from './GroupModeSelector';

/**
 * SortAndCompositeSection Props
 */
export interface SortAndCompositeSectionProps {
  /** フィルター状態 */
  filters: AllocationHistoryFilters;
}

/**
 * SortAndCompositeSection Component
 *
 * 配分履歴のソート順と複合キー設定セクション。
 * グループモードに応じてソート順選択と複合キー設定を表示します。
 *
 * **機能:**
 * - ソート順選択（商品・複合モード時のみ）
 * - 複合キー設定（複合モード時のみ）
 * - 複合キーフィールドの動的追加/削除
 * - 選択順による階層表示
 *
 * @example
 * ```tsx
 * <SortAndCompositeSection
 *   filters={allocationHistory.filters}
 * />
 * ```
 */
export const SortAndCompositeSection: React.FC<SortAndCompositeSectionProps> = ({ filters }) => {
  const { groupMode, sortOrder, setSortOrder, compositeKeyFields, setCompositeKeyFields } = filters;

  return (
    <>
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
    </>
  );
};
