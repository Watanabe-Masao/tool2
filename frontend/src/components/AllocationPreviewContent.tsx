import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { PictureAsPdf, ArrowBack, Description, Send, Assessment, AutoFixHigh, History, Balance, Save } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams, GridRenderEditCellParams } from '@mui/x-data-grid';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_DATA } from '@/utils/constants';
import { PDFPreviewModal } from '@/components/modals/PDFPreviewModal';
import { StoreStatisticsModal } from '@/components/modals/StoreStatisticsModal';
import { HistoryAllocationModal, type StoreRatio } from '@/components/modals/HistoryAllocationModal';
import { OrderService } from '@/services/order/OrderService';
import type { AllocationMethod } from '@/services/order/OrderService';
import type { StoreSettings } from '@/types/storeSettings';

/**
 * AllocationPreviewContentのProps
 */
interface AllocationPreviewContentProps {
  /** フォームデータ */
  formData: OrderFormData;
  /** PDFファイル名（file_id） */
  pdfFilename?: string;
  /** PDFダウンロードURL */
  pdfDownloadUrl?: string;
  /** Excelダウンロードハンドラ */
  onDownloadExcel?: () => void;
  /** PDFダウンロードハンドラ */
  onDownloadPdf?: () => void;
  /** メール送信ハンドラ */
  onSendEmail?: () => void;
  /** 戻るボタンハンドラ */
  onBack?: () => void;
  /** 生成ボタンハンドラ（生成前のみ） */
  onGenerate?: () => void;
  /** 配分数量変更ハンドラ */
  onAllocationChange?: (productIndex: number, storeIndex: number, newValue: number) => void;
  /** ロックされた店舗のMap（商品別） */
  lockedStores: Map<number, Set<string>>;
  /** ロック状態更新関数 */
  setLockedStores: (
    storesOrUpdater: Map<number, Set<string>> | ((prev: Map<number, Set<string>>) => Map<number, Set<string>>)
  ) => void;
  /** 選択されたカテゴリのMap（商品別） */
  selectedCategories: Map<number, Set<string>>;
  /** カテゴリ選択更新関数 */
  setSelectedCategories: (
    categoriesOrUpdater: Map<number, Set<string>> | ((prev: Map<number, Set<string>>) => Map<number, Set<string>>)
  ) => void;
  /** 現在選択中の商品インデックス（進捗サマリーとの連動用） */
  activeProductIndex?: number;
  /** 商品選択変更ハンドラ（表の行クリック時） */
  onProductChange?: (productIndex: number) => void;
  /** 店舗設定（自動配分用） */
  storeSettings?: Record<string, StoreSettings>;
  /** 過去の配分データ（履歴ベース自動配分用） */
  pastAllocations?: number[][];
  /** 配分履歴保存ハンドラ */
  onSaveHistory?: () => void;
  /** 配分履歴保存中フラグ */
  isSavingHistory?: boolean;
  /** 配分履歴保存済みフラグ */
  isHistorySaved?: boolean;
}

/**
 * グリッド行データの型
 */
interface GridRowData {
  id: string;
  productIndex: number;
  deliveryDate: string;
  origin: string;
  specification: string;
  specificationUnit: string;
  productName: string;
  storeCost: number;
  priceExcludingTax: number;
  priceIncludingTax: number;
  totalPackages: number;
  quantityPerPackage: number;
  packageUnit: string;
  supplier: string;
  total: number;
  totalDelivery: number;
  difference: number;
  [key: string]: string | number;
}

/**
 * 配分表プレビューコンテンツ
 *
 * MUI DataGridを使用してExcel出力と同様の配分表をプレビュー表示します。
 */
export const AllocationPreviewContent: React.FC<AllocationPreviewContentProps> = ({
  formData,
  pdfFilename,
  pdfDownloadUrl,
  onDownloadExcel,
  onDownloadPdf,
  onSendEmail,
  onBack,
  onGenerate,
  onAllocationChange,
  lockedStores,
  setLockedStores: _setLockedStores,
  selectedCategories: _selectedCategories,
  setSelectedCategories: _setSelectedCategories,
  activeProductIndex,
  onProductChange,
  storeSettings,
  pastAllocations,
  onSaveHistory,
  isSavingHistory = false,
  isHistorySaved = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [autoAllocateMenuAnchor, setAutoAllocateMenuAnchor] = useState<null | HTMLElement>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const isGenerationComplete = Boolean(pdfFilename);

  // React#185対策: lockedStoresをuseRefで参照して、columnsの不要な再計算を防止
  const lockedStoresRef = useRef(lockedStores);
  useEffect(() => {
    lockedStoresRef.current = lockedStores;
  }, [lockedStores]);

  /**
   * 自動配分を実行
   */
  const handleAutoAllocate = useCallback((method: AllocationMethod) => {
    setAutoAllocateMenuAnchor(null);

    if (!onAllocationChange) return;

    formData.products.forEach((product, productIndex) => {
      // 総納品数が未設定の場合はスキップ
      if (product.totalDelivery === null || product.totalDelivery === 0) {
        return;
      }

      // ロック済み店舗の現在値を取得
      const productLockedStores = lockedStores.get(productIndex) || new Set();
      const lockedAllocations = new Map<string, number>();

      productLockedStores.forEach((storeCode) => {
        const storeIndex = STORE_DATA.findIndex((s) => s.code === storeCode);
        if (storeIndex >= 0) {
          lockedAllocations.set(storeCode, product.storeAllocations[storeIndex] || 0);
        }
      });

      let newAllocations: number[];

      switch (method) {
        case 'salesRatio':
          if (storeSettings) {
            const result = OrderService.calculateSalesRatioAllocation(
              product.totalDelivery,
              storeSettings,
              lockedAllocations
            );
            newAllocations = result.allocations;
          } else {
            // 店舗設定がない場合は均等配分にフォールバック
            newAllocations = OrderService.calculateEvenAllocation(
              product.totalDelivery,
              STORE_DATA.length
            );
          }
          break;

        case 'history':
          if (pastAllocations && pastAllocations.length > 0) {
            const result = OrderService.calculateHistoryBasedAllocation(
              product.totalDelivery,
              pastAllocations,
              lockedAllocations
            );
            newAllocations = result.allocations;
          } else {
            // 過去データがない場合は均等配分にフォールバック
            newAllocations = OrderService.calculateEvenAllocation(
              product.totalDelivery,
              STORE_DATA.length
            );
          }
          break;

        case 'even':
        default:
          newAllocations = OrderService.calculateEvenAllocation(
            product.totalDelivery,
            STORE_DATA.length
          );
          // ロック済み店舗の値を上書き
          lockedAllocations.forEach((qty, storeCode) => {
            const storeIndex = STORE_DATA.findIndex((s) => s.code === storeCode);
            if (storeIndex >= 0) {
              newAllocations[storeIndex] = qty;
            }
          });
          break;
      }

      // 各店舗の配分を更新
      newAllocations.forEach((qty, storeIndex) => {
        onAllocationChange(productIndex, storeIndex, qty);
      });
    });
  }, [formData.products, lockedStores, onAllocationChange, storeSettings, pastAllocations]);

  /**
   * 履歴ベース自動配分を実行（パターン方式）
   */
  const handleHistoryAllocate = useCallback((storeRatios: StoreRatio[]) => {
    if (!onAllocationChange) return;

    formData.products.forEach((product, productIndex) => {
      // 総納品数が未設定の場合はスキップ
      if (product.totalDelivery === null || product.totalDelivery === 0) {
        return;
      }

      // ロック済み店舗の現在値を取得
      const productLockedStores = lockedStores.get(productIndex) || new Set();
      const lockedAllocations = new Map<string, number>();

      productLockedStores.forEach((storeCode) => {
        const storeIndex = STORE_DATA.findIndex((s) => s.code === storeCode);
        if (storeIndex >= 0) {
          lockedAllocations.set(storeCode, product.storeAllocations[storeIndex] || 0);
        }
      });

      // パターン方式で配分
      const result = OrderService.calculatePatternBasedAllocation(
        product.totalDelivery,
        storeRatios.map((sr) => ({ storeCode: sr.storeCode, ratio: sr.ratio })),
        lockedAllocations
      );

      // 各店舗の配分を更新
      result.allocations.forEach((qty, storeIndex) => {
        onAllocationChange(productIndex, storeIndex, qty);
      });
    });
  }, [formData.products, lockedStores, onAllocationChange]);

  /**
   * 行データを生成
   */
  const rows = useMemo<GridRowData[]>(() => {
    return formData.products.map((product, productIndex) => {
      const storeAllocations = product.storeAllocations || new Array(36).fill(0);
      const total = storeAllocations.reduce((sum: number, val: number) => sum + val, 0);
      const difference = total - (product.totalDelivery || 0);

      const row: GridRowData = {
        id: `product-${productIndex}`,
        productIndex,
        deliveryDate: format(formData.deliveryDate, 'M/d(E)', { locale: ja }),
        origin: product.origin || '',
        specification: product.specification || '',
        specificationUnit: product.specificationUnit || '',
        productName: product.name || '',
        storeCost: product.storeCost || 0,
        priceExcludingTax: product.priceExcludingTax || 0,
        priceIncludingTax: product.priceExcludingTax ? Math.floor((product.priceExcludingTax || 0) * 1.1) : 0,
        totalPackages: product.totalDelivery || 0,
        quantityPerPackage: product.quantityPerPackage || 0,
        packageUnit: product.packageUnit || '',
        supplier: product.supplier || '',
        total,
        totalDelivery: product.totalDelivery || 0,
        difference,
      };

      // 各店舗の配分数を追加
      STORE_DATA.forEach((store, index) => {
        row[`store_${store.code}`] = storeAllocations[index] || 0;
      });

      return row;
    });
  }, [formData]);

  /**
   * カラム定義
   */
  const columns = useMemo<GridColDef<GridRowData>[]>(() => {
    const cols: GridColDef<GridRowData>[] = [
      {
        field: 'deliveryDate',
        headerName: '店着日',
        width: 80,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
      {
        field: 'origin',
        headerName: '産地',
        width: 100,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
      {
        field: 'specification',
        headerName: '規格_単位',
        width: 100,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        valueGetter: (_value, row) => {
          const spec = row.specification;
          const unit = row.specificationUnit;
          if (spec && unit) {
            return `${spec} ${unit}`;
          }
          return spec || unit || '';
        },
      },
      {
        field: 'productName',
        headerName: '品名',
        width: 150,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
      {
        field: 'storeCost',
        headerName: '店原',
        width: 80,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
      },
      {
        field: 'priceExcludingTax',
        headerName: '店売税抜',
        width: 90,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
      },
      {
        field: 'priceIncludingTax',
        headerName: '店売税込',
        width: 90,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
      },
      {
        field: 'totalPackages',
        headerName: '総件数',
        width: 80,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
      },
      {
        field: 'quantityPerPackage',
        headerName: '入数_単位',
        width: 70,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
        valueGetter: (_value, row) => {
          const qty = row.quantityPerPackage;
          const unit = row.packageUnit;
          if (qty && unit) {
            return `${qty}${unit}`;
          }
          return qty ? String(qty) : (unit || '');
        },
      },
    ];

    // 36店舗のカラムを追加
    STORE_DATA.forEach((store) => {
      cols.push({
        field: `store_${store.code}`,
        headerName: `${store.code}\n${store.name}`,
        width: isMobile ? 80 : 55, // モバイル時は幅を広げてタップしやすく
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        editable: true, // 編集可否はisCellEditableで制御
        type: 'number',
        renderCell: (params: GridRenderCellParams<GridRowData>) => {
          if (!params.row) return null;
          const value = params.value as number;
          const productIndex = params.row.productIndex;
          const productLockedStores = lockedStoresRef.current.get(productIndex) || new Set();
          const isLocked = productLockedStores.has(store.code);

          return (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: value > 0 ? '600' : 'normal',
                color: isLocked ? '#f57c00' : value > 0 ? '#1565c0' : '#bdbdbd',
                backgroundColor: isLocked ? '#fff3e0' : value > 0 ? '#e3f2fd' : 'transparent',
              }}
            >
              {value > 0 ? value : '-'}
            </Box>
          );
        },
        renderEditCell: (params: GridRenderEditCellParams<GridRowData>) => {
          const { id, value, field, api } = params;
          const productIndex = params.row.productIndex;
          const productLockedStores = lockedStoresRef.current.get(productIndex) || new Set();
          const isLocked = productLockedStores.has(store.code);

          return (
            <TextField
              value={value || ''}
              type="number"
              disabled={isLocked}
              onChange={(e) => {
                const newValue = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                api.setEditCellValue({ id, field, value: Math.max(0, newValue) });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  api.stopCellEditMode({ id, field });
                }
              }}
              variant="standard"
              fullWidth
              autoFocus
              InputProps={{
                sx: {
                  fontSize: isMobile ? '1.1rem' : '0.9rem', // モバイル時は大きめに
                  height: isMobile ? '48px' : '36px',
                },
              }}
              sx={{
                '& input': {
                  textAlign: 'center',
                  padding: isMobile ? '12px 8px' : '6px 4px',
                },
              }}
            />
          );
        },
      });
    });

    // 集計カラム
    cols.push(
      {
        field: 'total',
        headerName: '合計',
        width: 60,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
        renderCell: (params: GridRenderCellParams<GridRowData>) => (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              color: '#f57f17',
              backgroundColor: '#fff8e1',
            }}
          >
            {params.value}
          </Box>
        ),
      },
      {
        field: 'totalDelivery',
        headerName: '納品数',
        width: 65,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
        renderCell: (params: GridRenderCellParams<GridRowData>) => (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
            }}
          >
            {params.value}
          </Box>
        ),
      },
      {
        field: 'difference',
        headerName: '差異',
        width: 60,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
        renderCell: (params: GridRenderCellParams<GridRowData>) => {
          const diff = params.value as number;
          return (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                color: diff !== 0 ? '#d32f2f' : '#388e3c',
                backgroundColor: diff !== 0 ? '#ffebee' : '#e8f5e9',
              }}
            >
              {diff}
            </Box>
          );
        },
      },
      {
        field: 'supplier',
        headerName: '帳合先',
        width: 120,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      }
    );

    return cols;
    // React#185対策: lockedStoresは依存配列から除外（useRefで参照）
  }, [onGenerate, isMobile]);

  /**
   * セル更新処理（React#185対策: 非同期更新）
   */
  const processRowUpdate = useCallback((newRow: GridRowData, oldRow: GridRowData) => {
    if (!onAllocationChange) return oldRow;

    // 変更された店舗カラムを検出
    const changedField = Object.keys(newRow).find(
      key => key.startsWith('store_') && newRow[key] !== oldRow[key]
    );

    if (!changedField) return oldRow;

    // 店舗コードとインデックスを取得
    const storeCode = changedField.replace('store_', '');
    const storeIndex = STORE_DATA.findIndex(store => store.code === storeCode);
    if (storeIndex === -1) return oldRow;

    // ロックチェック（useRef経由で最新値を参照）
    const productIndex = newRow.productIndex;
    const productLockedStores = lockedStoresRef.current.get(productIndex) || new Set();
    if (productLockedStores.has(storeCode)) {
      return oldRow; // ロックされている場合は更新しない
    }

    // 値を検証
    const value = Math.max(0, Math.floor((newRow[changedField] as number) || 0));

    // React#185対策: DataGridの更新サイクル完了後にフォーム更新
    queueMicrotask(() => {
      onAllocationChange(productIndex, storeIndex, value);
    });

    return { ...newRow, [changedField]: value };
  }, [onAllocationChange]);

  /**
   * セルが編集可能かどうか
   */
  const isCellEditable = useCallback((params: any) => {
    if (!params.field.startsWith('store_')) return false;
    if (!onGenerate) return false; // 生成後は編集不可

    const storeCode = params.field.replace('store_', '');
    const productIndex = params.row.productIndex;
    const productLockedStores = lockedStoresRef.current.get(productIndex) || new Set();

    return !productLockedStores.has(storeCode);
  }, [onGenerate]);

  /**
   * PDFプレビューを開く
   */
  const handlePDFPreview = () => {
    setShowPDFPreview(true);
  };


  return (
    <Box sx={{ py: 2 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {isGenerationComplete ? '配分表（生成完了）' : '配分表プレビュー'}
        </Typography>

        {/* 統計モーダルボタン */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Assessment />}
          onClick={() => setShowStatistics(true)}
          sx={{ mr: 1 }}
        >
          店舗別統計
        </Button>
      </Box>

      {/* アクションボタン */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* 生成前 */}
          {!isGenerationComplete && (
            <>
              {/* 自動配分ボタン */}
              {onAllocationChange && (
                <>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="large"
                    startIcon={<AutoFixHigh />}
                    onClick={(e) => setAutoAllocateMenuAnchor(e.currentTarget)}
                    sx={{ minWidth: isMobile ? 'auto' : '160px' }}
                  >
                    {isMobile ? '自動配分' : '自動配分'}
                  </Button>
                  <Menu
                    anchorEl={autoAllocateMenuAnchor}
                    open={Boolean(autoAllocateMenuAnchor)}
                    onClose={() => setAutoAllocateMenuAnchor(null)}
                  >
                    <MenuItem onClick={() => handleAutoAllocate('even')}>
                      <ListItemIcon>
                        <Balance fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="均等配分" secondary="全店舗に均等に配分" />
                    </MenuItem>
                    <MenuItem
                      onClick={() => handleAutoAllocate('salesRatio')}
                      disabled={!storeSettings || Object.keys(storeSettings).length === 0}
                    >
                      <ListItemIcon>
                        <AutoFixHigh fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="販売構成比で配分"
                        secondary={
                          storeSettings && Object.keys(storeSettings).length > 0
                            ? '店舗の販売構成比に基づいて配分'
                            : '販売構成比が未設定です'
                        }
                      />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setAutoAllocateMenuAnchor(null);
                        setShowHistoryModal(true);
                      }}
                    >
                      <ListItemIcon>
                        <History fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="履歴から配分..."
                        secondary="期間と条件を指定して配分"
                      />
                    </MenuItem>
                  </Menu>
                </>
              )}

              {/* 配分表を生成ボタン */}
              {onGenerate && (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<Description />}
                  onClick={onGenerate}
                  sx={{ flex: 1, minWidth: '200px' }}
                >
                  配分表を生成
                </Button>
              )}
            </>
          )}

          {/* 生成後 */}
          {isGenerationComplete && (
            <>
              {/* 配分履歴保存ボタン */}
              {onSaveHistory && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Save />}
                  onClick={onSaveHistory}
                  disabled={isSavingHistory || isHistorySaved}
                  sx={{
                    flex: 1,
                    fontSize: isMobile ? '0.7rem' : '0.875rem',
                    minWidth: isMobile ? 'auto' : '120px',
                    px: isMobile ? 1 : 2,
                  }}
                >
                  {isSavingHistory ? '保存中...' : isHistorySaved ? '保存済み' : '履歴を保存'}
                </Button>
              )}

              {onDownloadExcel && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Description />}
                  onClick={onDownloadExcel}
                  sx={{
                    flex: 1,
                    fontSize: isMobile ? '0.7rem' : '0.875rem',
                    minWidth: isMobile ? 'auto' : '120px',
                    px: isMobile ? 1 : 2,
                  }}
                >
                  Excel
                </Button>
              )}

              {pdfDownloadUrl && onDownloadPdf && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<PictureAsPdf />}
                  onClick={onDownloadPdf}
                  sx={{
                    flex: 1,
                    fontSize: isMobile ? '0.7rem' : '0.875rem',
                    minWidth: isMobile ? 'auto' : '120px',
                    px: isMobile ? 1 : 2,
                  }}
                >
                  PDF
                </Button>
              )}

              {pdfFilename && (
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdf />}
                  onClick={handlePDFPreview}
                  sx={{
                    flex: 1,
                    fontSize: isMobile ? '0.7rem' : '0.875rem',
                    minWidth: isMobile ? 'auto' : '100px',
                    px: isMobile ? 0.8 : 2,
                  }}
                >
                  {isMobile ? 'プレビュー' : 'PDFプレビュー'}
                </Button>
              )}

              {onSendEmail && (
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<Send />}
                  onClick={onSendEmail}
                  sx={{
                    flex: 1,
                    fontSize: isMobile ? '0.7rem' : '0.875rem',
                    minWidth: isMobile ? 'auto' : '100px',
                    px: isMobile ? 1 : 2,
                  }}
                >
                  送信
                </Button>
              )}

              {onBack && (
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={onBack}
                  sx={{
                    flex: 1,
                    fontSize: isMobile ? '0.7rem' : '0.875rem',
                    minWidth: isMobile ? 'auto' : '100px',
                    px: isMobile ? 0.8 : 2,
                  }}
                >
                  {isMobile ? '編集' : '編集に戻る'}
                </Button>
              )}
            </>
          )}
        </Box>
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* データグリッド */}
      <Paper elevation={1} sx={{ overflow: 'hidden' }}>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            processRowUpdate={processRowUpdate}
            isCellEditable={isCellEditable}
            editMode="cell"
            disableRowSelectionOnClick
            hideFooter
            onCellClick={(params) => {
              // 編集可能なセル（店舗セル）以外をクリックした時のみ商品選択を変更
              // これにより、店舗セルは編集可能で、他のセルをクリックすると商品が切り替わる
              if (onProductChange && !params.field.startsWith('store_')) {
                onProductChange(params.row.productIndex);
              }
            }}
            getRowClassName={(params) => {
              // activeProductIndexと一致する行をハイライト
              return params.row.productIndex === activeProductIndex ? 'highlighted-row' : '';
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderRight: '1px solid #e0e0e0',
                fontSize: isMobile ? '0.75rem' : '0.85rem',
              },
              '& .MuiDataGrid-cell:last-child': {
                borderRight: 'none',
              },
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: 'primary.main',
                color: 'white',
                fontWeight: '700',
                fontSize: isMobile ? '0.7rem' : '0.75rem',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.2',
              },
              '& .MuiDataGrid-columnHeader:last-child': {
                borderRight: 'none',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: '#f5f5f5',
              },
              // ハイライトされた行のスタイル
              '& .highlighted-row': {
                backgroundColor: '#e3f2fd !important',
                borderLeft: '4px solid #1976d2',
              },
              '& .highlighted-row:hover': {
                backgroundColor: '#bbdefb !important',
              },
              // 編集可能なセルのカーソル
              '& .MuiDataGrid-cell[data-field^="store_"]': {
                cursor: 'cell',
              },
            }}
          />
        </Box>
      </Paper>

      {/* PDFプレビューモーダル */}
      {pdfDownloadUrl && onDownloadExcel && onSendEmail && (
        <PDFPreviewModal
          open={showPDFPreview}
          onClose={() => setShowPDFPreview(false)}
          pdfUrl={pdfDownloadUrl}
          onDownloadExcel={onDownloadExcel}
          onSendEmail={onSendEmail}
        />
      )}

      {/* 店舗別統計モーダル */}
      <StoreStatisticsModal
        open={showStatistics}
        onClose={() => setShowStatistics(false)}
        formData={formData}
      />

      {/* 履歴ベース自動配分モーダル */}
      <HistoryAllocationModal
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onApply={handleHistoryAllocate}
        currentProduct={
          formData.products.length > 0
            ? {
                name: formData.products[0].name,
                origin: formData.products[0].origin,
                categoryCode: formData.products[0].categoryCode,
              }
            : undefined
        }
      />
    </Box>
  );
};
