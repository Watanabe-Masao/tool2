import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Stack,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
import { useSupplierPresets, type SupplierPreset } from '@/hooks/useSupplierPresets';

// Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface SupplierPresetManagerModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 帳合先プリセット管理モーダル（スワイプ・カード形式）
 *
 * プリセットの追加・編集・削除ができます。
 * カードをスワイプして切り替えます。
 */
export const SupplierPresetManagerModal: React.FC<SupplierPresetManagerModalProps> = ({
  open,
  onClose,
}) => {
  const { presets, addPreset, deletePreset, updatePreset } = useSupplierPresets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [presetValue, setPresetValue] = useState('');
  const [error, setError] = useState('');
  const swiperRef = useRef<SwiperType | null>(null);

  /**
   * 新規プリセットを追加
   */
  const handleAdd = async () => {
    if (!presetValue.trim()) {
      setError('帳合先を入力してください');
      return;
    }

    const success = await addPreset(presetValue.trim());
    if (success) {
      setPresetValue('');
      setIsAdding(false);
      setError('');
      // 最後のスライドに移動
      setTimeout(() => {
        if (swiperRef.current) {
          swiperRef.current.slideTo(swiperRef.current.slides.length - 1);
        }
      }, 100);
    } else {
      setError('プリセットの追加に失敗しました');
    }
  };

  /**
   * プリセットを削除
   */
  const handleDelete = async (id: string) => {
    if (confirm('このプリセットを削除しますか？')) {
      const success = await deletePreset(id);
      if (!success) {
        setError('プリセットの削除に失敗しました');
      }
    }
  };

  /**
   * プリセット編集開始
   */
  const handleStartEdit = (preset: SupplierPreset) => {
    setEditingId(preset.id);
    setPresetValue(preset.supplier);
    setIsAdding(false);
  };

  /**
   * プリセット編集を保存
   */
  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!presetValue.trim()) {
      setError('帳合先を入力してください');
      return;
    }

    const success = await updatePreset(editingId, presetValue.trim());
    if (success) {
      setEditingId(null);
      setPresetValue('');
      setError('');
    } else {
      setError('プリセットの更新に失敗しました');
    }
  };

  /**
   * 編集をキャンセル
   */
  const handleCancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setPresetValue('');
    setError('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">帳合先プリセット管理</Typography>
          {!isAdding && !editingId && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setIsAdding(true)}
            >
              追加
            </Button>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* 新規追加フォーム */}
        {isAdding && (
          <Card sx={{ mb: 2, bgcolor: 'primary.light' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                新規プリセット
              </Typography>
              <TextField
                label="帳合先"
                placeholder="例: ○○商事"
                value={presetValue}
                onChange={(e) => setPresetValue(e.target.value)}
                fullWidth
                size="small"
                autoFocus
              />
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
              <Button size="small" onClick={handleCancelEdit}>
                キャンセル
              </Button>
              <Button size="small" variant="contained" onClick={handleAdd}>
                追加
              </Button>
            </CardActions>
          </Card>
        )}

        {/* プリセット一覧（カード + スワイプ） */}
        {presets.length === 0 && !isAdding ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              プリセットがまだ登録されていません。
              <br />
              「追加」ボタンから新しいプリセットを作成してください。
            </Typography>
          </Box>
        ) : (
          presets.length > 0 && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
                {presets.length}件のプリセット（スワイプで切り替え）
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <Swiper
                  modules={[Navigation, Pagination]}
                  spaceBetween={16}
                  slidesPerView={1}
                  navigation
                  pagination={{ clickable: true }}
                  onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                  }}
                  style={{
                    paddingBottom: '40px',
                  }}
                >
                  {presets.map((preset) => (
                    <SwiperSlide key={preset.id}>
                      {editingId === preset.id ? (
                        // 編集モード
                        <Card sx={{ minHeight: 200, bgcolor: 'warning.light' }}>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                              プリセット編集
                            </Typography>
                            <TextField
                              label="帳合先"
                              value={presetValue}
                              onChange={(e) => setPresetValue(e.target.value)}
                              fullWidth
                              size="small"
                              placeholder="例: ○○商事"
                            />
                          </CardContent>
                          <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                            <Button size="small" onClick={handleCancelEdit}>
                              キャンセル
                            </Button>
                            <Button size="small" variant="contained" onClick={handleSaveEdit}>
                              保存
                            </Button>
                          </CardActions>
                        </Card>
                      ) : (
                        // 表示モード
                        <Card sx={{ minHeight: 200, display: 'flex', flexDirection: 'column' }}>
                          <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
                              帳合先
                            </Typography>
                            <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
                              {preset.supplier}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              作成日: {preset.createdAt.toLocaleDateString('ja-JP')}
                            </Typography>
                          </CardContent>
                          <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                            <Stack direction="row" spacing={1}>
                              <IconButton
                                color="primary"
                                onClick={() => handleStartEdit(preset)}
                                aria-label="編集"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                color="error"
                                onClick={() => handleDelete(preset.id)}
                                aria-label="削除"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Stack>
                          </CardActions>
                        </Card>
                      )}
                    </SwiperSlide>
                  ))}
                </Swiper>
              </Box>
            </>
          )
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};
