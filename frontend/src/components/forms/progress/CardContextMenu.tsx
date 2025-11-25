import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Grow } from '@mui/material';
import { DeleteOutline, ClearAll } from '@mui/icons-material';
import type { CardContextMenuProps } from './types';

/**
 * カードコンテキストメニュー
 *
 * 商品カードの右クリック/長押しメニュー
 */
export const CardContextMenu: React.FC<CardContextMenuProps> = ({
  anchorEl,
  onClose,
  onClear,
  onDelete,
  canDelete,
}) => {
  const open = Boolean(anchorEl);

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
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
      {onClear && (
        <MenuItem
          onClick={() => {
            onClear();
            onClose();
          }}
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
      )}
      {onDelete && canDelete && (
        <MenuItem
          onClick={() => {
            onDelete();
            onClose();
          }}
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
  );
};
