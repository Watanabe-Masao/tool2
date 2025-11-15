import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { Close, ArrowBack } from '@mui/icons-material';
import { MAIN_CATEGORIES, type Category, type MainCategory } from '@/utils/categories';

/**
 * CategorySelectModalのProps
 */
interface CategorySelectModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 閉じる時のハンドラー */
  onClose: () => void;
  /** カテゴリー選択時のハンドラー */
  onSelect: (categoryCode: string) => void;
  /** 現在選択されているカテゴリーコード */
  selectedCategoryCode?: string;
}

/**
 * カテゴリー選択モーダル
 *
 * 大カテゴリー（果実/野菜）→小カテゴリーの2段階で選択できるモーダルです。
 */
export const CategorySelectModal: React.FC<CategorySelectModalProps> = ({
  open,
  onClose,
  onSelect,
  selectedCategoryCode,
}) => {
  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory | null>(null);

  /**
   * モーダルを閉じる際のハンドラー
   */
  const handleClose = () => {
    setSelectedMainCategory(null);
    onClose();
  };

  /**
   * 大カテゴリーを選択
   */
  const handleSelectMainCategory = (mainCategory: MainCategory) => {
    setSelectedMainCategory(mainCategory);
  };

  /**
   * 小カテゴリーを選択
   */
  const handleSelectSubCategory = (categoryCode: string) => {
    onSelect(categoryCode);
    handleClose();
  };

  /**
   * 大カテゴリー一覧に戻る
   */
  const handleBack = () => {
    setSelectedMainCategory(null);
  };

  /**
   * カテゴリー未選択にする
   */
  const handleClearCategory = () => {
    onSelect('');
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedMainCategory && (
            <IconButton size="small" onClick={handleBack} edge="start">
              <ArrowBack />
            </IconButton>
          )}
          <Typography variant="h6">カテゴリー選択</Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} edge="end">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* パンくずリスト */}
        {selectedMainCategory && (
          <Box sx={{ px: 2, py: 1, bgcolor: 'background.default' }}>
            <Breadcrumbs>
              <Link
                component="button"
                variant="body2"
                onClick={handleBack}
                sx={{ cursor: 'pointer' }}
                underline="hover"
              >
                カテゴリー
              </Link>
              <Typography variant="body2" color="text.primary">
                {selectedMainCategory.name}
              </Typography>
            </Breadcrumbs>
          </Box>
        )}

        <List sx={{ py: 0 }}>
          {!selectedMainCategory ? (
            // 大カテゴリー一覧
            <>
              {/* カテゴリー未選択オプション */}
              <ListItemButton onClick={handleClearCategory} sx={{ py: 1.5 }}>
                <ListItemText
                  primary="カテゴリーなし"
                  secondary="全ての履歴を表示"
                  primaryTypographyProps={{ fontWeight: selectedCategoryCode === '' ? 'bold' : 'normal' }}
                />
              </ListItemButton>

              {MAIN_CATEGORIES.map((mainCategory) => (
                <ListItemButton
                  key={mainCategory.code}
                  onClick={() => handleSelectMainCategory(mainCategory)}
                  sx={{ py: 1.5 }}
                >
                  <ListItemText
                    primary={`${mainCategory.code} ${mainCategory.name}`}
                    secondary={`${mainCategory.subCategories.length}個のサブカテゴリー`}
                  />
                </ListItemButton>
              ))}
            </>
          ) : (
            // 小カテゴリー一覧
            selectedMainCategory.subCategories.map((subCategory: Category) => (
              <ListItemButton
                key={subCategory.code}
                onClick={() => handleSelectSubCategory(subCategory.code)}
                selected={selectedCategoryCode === subCategory.code}
                sx={{ py: 1.5 }}
              >
                <ListItemText
                  primary={subCategory.name}
                  secondary={subCategory.code}
                  primaryTypographyProps={{
                    fontWeight: selectedCategoryCode === subCategory.code ? 'bold' : 'normal',
                  }}
                />
              </ListItemButton>
            ))
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};
