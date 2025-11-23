import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  IconButton,
  Box,
  Typography,
  Chip,
  Button,
  DialogActions,
  DialogContentText,
  Checkbox,
  Alert,
} from '@mui/material';
import {
  Close,
  History,
  Delete,
  TrendingUp,
  SelectAll,
  Deselect,
  Download,
} from '@mui/icons-material';
import type { PricingHistoryItem } from '@/hooks/usePricingHistory';
import { format } from 'date-fns';

/**
 * PricingHistoryModalのProps
 */
interface PricingHistoryModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 閉じる時のハンドラー */
  onClose: () => void;
  /** 履歴選択時のハンドラー */
  onSelect: (history: PricingHistoryItem) => void;
  /** 履歴削除時のハンドラー */
  onDelete: (historyId: string) => Promise<void>;
  /** 履歴一覧 */
  histories: PricingHistoryItem[];
  /** 現在の商品名（フィルタリング用） */
  productName?: string;
  /** 現在の規格（フィルタリング用） */
  specification?: string;
  /** 現在の入数（フィルタリング用） */
  quantityPerPackage?: number;
}

/**
 * 価格履歴選択モーダル
 *
 * 保存された価格履歴を選択して、原価と売価を呼び出すためのモーダルです。
 */
export const PricingHistoryModal: React.FC<PricingHistoryModalProps> = ({
  open,
  onClose,
  onSelect,
  onDelete,
  histories,
  productName,
  specification,
  quantityPerPackage,
}) => {
  // 削除確認ダイアログの状態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyToDelete, setHistoryToDelete] = useState<PricingHistoryItem | null>(null);

  // 複数選択モードの状態
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedHistories, setSelectedHistories] = useState<Set<string>>(new Set());

  /**
   * 現在の商品にマッチする履歴のみをフィルタリング
   */
  const matchingHistories = histories.filter((history) => {
    if (!productName || !specification || !quantityPerPackage) {
      return true; // フィルター条件が不完全な場合は全て表示
    }
    return (
      history.productName === productName &&
      history.specification === specification &&
      history.quantityPerPackage === quantityPerPackage
    );
  });

  /**
   * 履歴を選択（単一選択）
   */
  const handleSelectHistory = (history: PricingHistoryItem) => {
    if (bulkSelectMode) {
      // 複数選択モード: チェックボックスをトグル
      handleToggleSelection(history.id);
    } else {
      // 通常モード: 即座に適用して閉じる
      onSelect(history);
      onClose();
    }
  };

  /**
   * チェックボックスのトグル
   */
  const handleToggleSelection = (historyId: string) => {
    const newSelection = new Set(selectedHistories);
    if (newSelection.has(historyId)) {
      newSelection.delete(historyId);
    } else {
      newSelection.add(historyId);
    }
    setSelectedHistories(newSelection);
  };

  /**
   * 全選択
   */
  const handleSelectAll = () => {
    const allIds = new Set(matchingHistories.map((h) => h.id));
    setSelectedHistories(allIds);
  };

  /**
   * 全選択解除
   */
  const handleDeselectAll = () => {
    setSelectedHistories(new Set());
  };

  /**
   * 複数選択した履歴をまとめて適用
   */
  const handleBulkApply = () => {
    if (selectedHistories.size === 0) return;

    // 最初に選択された履歴を適用（複数ある場合は最新のものを優先）
    const selectedItems = matchingHistories.filter((h) => selectedHistories.has(h.id));
    if (selectedItems.length > 0) {
      // 最新のもの（最終使用日が最も新しいもの）を適用
      const latestItem = selectedItems.sort(
        (a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime()
      )[0];
      onSelect(latestItem);
      onClose();
    }
  };

  /**
   * 複数選択モードの切り替え
   */
  const handleToggleBulkMode = () => {
    setBulkSelectMode(!bulkSelectMode);
    setSelectedHistories(new Set());
  };

  /**
   * 削除を実行
   */
  const handleConfirmDelete = async () => {
    if (!historyToDelete) return;

    try {
      await onDelete(historyToDelete.id);
      setDeleteDialogOpen(false);
      setHistoryToDelete(null);
    } catch (error) {
      console.error('[PricingHistoryModal] Failed to delete history:', error);
    }
  };

  /**
   * 値入率を計算
   */
  const calculateProfitMargin = (history: PricingHistoryItem): string => {
    if (!history.priceExcludingTax || !history.storeCost) return '0.0';
    const margin =
      ((history.priceExcludingTax - history.storeCost) / history.priceExcludingTax) * 100;
    return margin.toFixed(1);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            height: '80vh',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History />
              <Typography variant="h6">価格履歴から選択</Typography>
            </Box>
            <IconButton size="small" onClick={onClose} edge="end">
              <Close />
            </IconButton>
          </Box>

          {/* 複数選択モード切り替えボタン */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              variant={bulkSelectMode ? 'contained' : 'outlined'}
              onClick={handleToggleBulkMode}
              startIcon={bulkSelectMode ? <Deselect /> : <SelectAll />}
            >
              {bulkSelectMode ? '選択モード解除' : '複数選択モード'}
            </Button>

            {bulkSelectMode && (
              <>
                <Button size="small" onClick={handleSelectAll} startIcon={<SelectAll />}>
                  全選択
                </Button>
                <Button size="small" onClick={handleDeselectAll} startIcon={<Deselect />}>
                  解除
                </Button>
                <Chip
                  label={`${selectedHistories.size}件選択中`}
                  color="primary"
                  size="small"
                />
              </>
            )}
          </Box>
        </DialogTitle>

        {/* フィルター情報表示 */}
        {productName && specification && quantityPerPackage && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                絞り込み中:
              </Typography>
              <Chip label={productName} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
              <Chip
                label={specification}
                size="small"
                color="primary"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
              <Chip
                label={`${quantityPerPackage}入`}
                size="small"
                color="secondary"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Box>
          </Box>
        )}

        <DialogContent dividers sx={{ p: 0 }}>
          {matchingHistories.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {productName && specification && quantityPerPackage
                  ? 'この商品の価格履歴がありません'
                  : '保存された価格履歴がありません'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                プレビュー作成時に自動保存されます
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {matchingHistories.map((history) => {
                const centerCostWithFee = Math.round(
                  history.centerCost * (1 + (history.centerFeeRate ?? 13) / 100)
                );
                const profitPerUnit = history.storeCost - centerCostWithFee;
                const profitMargin = calculateProfitMargin(history);
                const isSelected = selectedHistories.has(history.id);

                return (
                  <ListItemButton
                    key={history.id}
                    onClick={() => handleSelectHistory(history)}
                    selected={isSelected}
                    sx={{
                      py: 2,
                      px: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: isSelected ? 'primary.50' : 'transparent',
                      '&:hover': {
                        bgcolor: isSelected ? 'primary.100' : 'action.hover',
                      },
                    }}
                  >
                    {/* チェックボックス（複数選択モード時のみ表示） */}
                    {bulkSelectMode && (
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleToggleSelection(history.id)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ mr: 1 }}
                      />
                    )}
                    <Box sx={{ flex: 1 }}>
                      {/* 1行目: 商品情報 */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {history.productName}
                        </Typography>
                        <Chip
                          label={history.specification}
                          size="small"
                          color="primary"
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                        <Chip
                          label={`${history.quantityPerPackage}${history.unit}`}
                          size="small"
                          color="secondary"
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                      </Box>

                      {/* 2行目: 価格情報 */}
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          センター着: ¥{history.centerCost.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          店着: ¥{history.storeCost.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          売価: ¥{history.priceExcludingTax.toLocaleString()}
                        </Typography>
                      </Box>

                      {/* 3行目: 差益と値入率 */}
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 0.5 }}>
                        <Chip
                          icon={<TrendingUp sx={{ fontSize: '0.9rem' }} />}
                          label={`差益: ¥${profitPerUnit.toLocaleString()}`}
                          size="small"
                          color={profitPerUnit > 0 ? 'success' : 'error'}
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                        <Chip
                          label={`値入率: ${profitMargin}%`}
                          size="small"
                          color="info"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </Box>

                      {/* 4行目: 使用回数・最終使用日 */}
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          使用回数: {history.usageCount}回
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          最終使用: {format(history.lastUsedAt, 'yyyy/MM/dd')}
                        </Typography>
                      </Box>
                    </Box>

                    {/* 削除ボタン */}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryToDelete(history);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{ ml: 1 }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </DialogContent>

        {/* 複数選択モード時のアクションボタン */}
        {bulkSelectMode && selectedHistories.size > 0 && (
          <DialogActions sx={{ px: 3, py: 2, bgcolor: 'primary.50' }}>
            <Alert severity="info" sx={{ flex: 1, py: 0 }}>
              選択した{selectedHistories.size}件の履歴から最新のものを適用します
            </Alert>
            <Button
              variant="contained"
              onClick={handleBulkApply}
              startIcon={<Download />}
              disabled={selectedHistories.size === 0}
            >
              適用
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>価格履歴を削除</DialogTitle>
        <DialogContent>
          <DialogContentText>この価格履歴を削除してもよろしいですか？</DialogContentText>
          {historyToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {historyToDelete.productName} ({historyToDelete.specification})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                入数: {historyToDelete.quantityPerPackage}
                {historyToDelete.unit}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                センター着: ¥{historyToDelete.centerCost.toLocaleString()} / 店着: ¥
                {historyToDelete.storeCost.toLocaleString()} / 売価: ¥
                {historyToDelete.priceExcludingTax.toLocaleString()}
              </Typography>
            </Box>
          )}
          <DialogContentText sx={{ mt: 2, fontSize: '0.875rem', color: 'error.main' }}>
            この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
