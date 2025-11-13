// =====================================
// グローバル変数
// =====================================
let downloadUrl = null;
let downloadFilename = null;

// 店舗データ (36店舗)
const STORES = [
    {code: '01', name: '朝倉'}, {code: '02', name: '伊野'}, {code: '03', name: '高須'}, {code: '05', name: '愛宕'},
    {code: '06', name: '神田'}, {code: '07', name: '毎日屋土佐道路'}, {code: '08', name: '山手'}, {code: '23', name: '桟橋'},
    {code: '24', name: '大橋通'}, {code: '26', name: 'アクシス南国'}, {code: '28', name: '瀬戸'}, {code: '30', name: '清水'},
    {code: '32', name: '四万十'}, {code: '34', name: 'アクシスいの'}, {code: '36', name: '土佐道路東'}, {code: '37', name: 'とさのさと御座'},
    {code: '39', name: '六泉寺'}, {code: '40', name: '薊野'}, {code: '41', name: '中万々'}, {code: '43', name: '高岡'},
    {code: '45', name: '久米'}, {code: '47', name: '森松'}, {code: '48', name: '束本'}, {code: '305', name: '仁井田'},
    {code: '307', name: '窪川'}, {code: '308', name: 'さが'}, {code: '311', name: '丸味'}, {code: '313', name: 'サングリーン'},
    {code: '314', name: '大月'}, {code: '317', name: '西土佐'}, {code: '318', name: '十和'}, {code: '341', name: '吾川'},
    {code: '342', name: '池川'}, {code: '343', name: '上八川'}, {code: '344', name: '下八川'}, {code: '911', name: '惣菜'}
];

// =====================================
// DOM要素の取得
// =====================================
const templateForm = document.getElementById('templateForm');
const generateBtn = document.getElementById('generateBtn');
const previewBtn = document.getElementById('previewBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const messageText = document.getElementById('messageText');
const errorText = document.getElementById('errorText');

// =====================================
// イベントリスナー設定
// =====================================
document.addEventListener('DOMContentLoaded', () => {
    // フォーム送信イベント
    if (templateForm) {
        templateForm.addEventListener('submit', handleFormSubmit);
    }

    // プレビューボタンクリックイベント
    if (previewBtn) {
        previewBtn.addEventListener('click', handlePreview);
    }

    // ダウンロードボタンクリックイベント
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }
});

// =====================================
// フォーム送信ハンドラ
// =====================================
async function handleFormSubmit(event) {
    event.preventDefault();

    // 入力値の検証
    if (!validateForm()) {
        return;
    }

    // ローディング表示
    showLoading();

    // 結果・エラーセクションを非表示
    hideResults();

    try {
        // フォームデータの取得
        const formData = getFormData();

        // API呼び出し
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        // レスポンスの処理
        const data = await response.json();

        if (response.ok && data.success) {
            // 成功
            handleSuccess(data);
        } else {
            // エラー
            const errorMessage = data.detail || data.message || '不明なエラーが発生しました';
            handleError(errorMessage);
        }
    } catch (error) {
        // ネットワークエラーなど
        handleError(`通信エラーが発生しました: ${error.message}`);
    } finally {
        // ローディング非表示
        hideLoading();
    }
}

// =====================================
// フォームデータ取得（新構造対応）
// =====================================
function getFormData() {
    // 基本情報
    const deliveryDate = document.getElementById('deliveryDate')?.value || null;
    const supplier = document.getElementById('supplier')?.value?.trim() || null;
    const outputFilename = document.getElementById('outputFilename')?.value?.trim() || null;
    const buyerName = document.getElementById('buyerName')?.value?.trim() || null;
    const pixel100 = parseFloat(document.getElementById('pixel100')?.value) || 13.5714285714;
    const pixel50 = parseFloat(document.getElementById('pixel50')?.value) || 6.4285714286;

    // 動的商品データを収集
    const productsContainer = document.getElementById('productsContainer');
    const productItems = productsContainer?.querySelectorAll('.product-item') || [];

    const products = [];

    productItems.forEach((item) => {
        const productId = item.getAttribute('data-product-id');
        if (!productId) return;

        const product = {
            name: document.getElementById(`productName-${productId}`)?.value?.trim() || null,
            origin: document.getElementById(`origin-${productId}`)?.value?.trim() || null,
            standard: document.getElementById(`standard-${productId}`)?.value?.trim() || null,
            quantity: parseInt(document.getElementById(`quantity-${productId}`)?.value) || null,
            store_cost: parseFloat(document.getElementById(`storeCost-${productId}`)?.value) || null,
            price: parseFloat(document.getElementById(`taxExcludedPrice-${productId}`)?.value) || null,
            total_delivery: parseInt(document.getElementById(`totalDelivery-${productId}`)?.value) || null,
            store_quantities: {}
        };

        // 店舗配分数を収集 (36店舗分)
        for (let storeIndex = 0; storeIndex < 36; storeIndex++) {
            const storeInput = document.getElementById(`store-${productId}-${storeIndex}`);
            const value = parseInt(storeInput?.value);
            if (value && value > 0) {
                // Store code from STORES array
                const storeCode = STORES[storeIndex]?.code || `${storeIndex + 1}`.padStart(2, '0');
                product.store_quantities[storeCode] = value;
            }
        }

        products.push(product);
    });

    const data = {
        delivery_date: deliveryDate,
        supplier: supplier,
        buyer_name: buyerName,
        pixel_100: pixel100,
        pixel_50: pixel50,
        num_blocks: products.length, // 商品数を自動的に設定
        products: products
    };

    // オプショナルフィールド
    if (outputFilename) {
        data.output_filename = outputFilename;
    }

    console.log('Form data collected:', data);

    return data;
}

// =====================================
// フォーム検証
// =====================================
function validateForm() {
    const deliveryDate = document.getElementById('deliveryDate')?.value;
    const supplier = document.getElementById('supplier')?.value?.trim();
    const productsContainer = document.getElementById('productsContainer');
    const productItems = productsContainer?.querySelectorAll('.product-item') || [];

    // 基本情報の検証
    if (!deliveryDate) {
        alert('店着日を入力してください');
        return false;
    }

    if (!supplier) {
        alert('帳合先を入力してください');
        return false;
    }

    if (productItems.length === 0) {
        alert('最低1つの商品が必要です');
        return false;
    }

    // 各商品の検証
    for (let item of productItems) {
        const productId = item.getAttribute('data-product-id');

        const productName = document.getElementById(`productName-${productId}`)?.value?.trim();
        const origin = document.getElementById(`origin-${productId}`)?.value?.trim();
        const standard = document.getElementById(`standard-${productId}`)?.value?.trim();
        const quantity = document.getElementById(`quantity-${productId}`)?.value;
        const storeCost = document.getElementById(`storeCost-${productId}`)?.value;
        const taxExcludedPrice = document.getElementById(`taxExcludedPrice-${productId}`)?.value;
        const totalDelivery = document.getElementById(`totalDelivery-${productId}`)?.value;

        if (!productName) {
            alert(`商品 ${productId}: 品名を入力してください`);
            return false;
        }

        if (!origin) {
            alert(`商品 ${productId}: 産地を入力してください`);
            return false;
        }

        if (!standard) {
            alert(`商品 ${productId}: 規格を入力してください`);
            return false;
        }

        if (!quantity || quantity <= 0) {
            alert(`商品 ${productId}: 入数を入力してください`);
            return false;
        }

        if (!storeCost || storeCost < 0) {
            alert(`商品 ${productId}: 店着原価を入力してください`);
            return false;
        }

        if (!taxExcludedPrice || taxExcludedPrice < 0) {
            alert(`商品 ${productId}: 税抜売価を入力してください`);
            return false;
        }

        if (!totalDelivery || totalDelivery <= 0) {
            alert(`商品 ${productId}: 総納品数を入力してください`);
            return false;
        }

        // 配分数の検証
        let allocatedTotal = 0;
        for (let storeIndex = 0; storeIndex < 36; storeIndex++) {
            const storeInput = document.getElementById(`store-${productId}-${storeIndex}`);
            const value = parseInt(storeInput?.value) || 0;
            allocatedTotal += value;
        }

        const totalDeliveryNum = parseInt(totalDelivery);
        if (allocatedTotal !== totalDeliveryNum) {
            alert(`商品 ${productId}: 配分合計（${allocatedTotal}）が総納品数（${totalDeliveryNum}）と一致しません`);
            return false;
        }
    }

    return true;
}

// =====================================
// プレビューハンドラ
// =====================================
async function handlePreview(event) {
    event.preventDefault();

    // 入力値の検証
    if (!validateForm()) {
        return;
    }

    // ローディング表示
    showLoading();

    // 結果・エラーセクションを非表示
    hideResults();

    try {
        // フォームデータの取得
        const formData = getFormData();

        // API呼び出し (PDF preview endpoint)
        const response = await fetch('/api/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (response.ok) {
            // PDFをモーダルで表示（モバイル対応）
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            // モーダル要素の取得
            const pdfModal = document.getElementById('pdfModal');
            const pdfIframe = document.getElementById('pdfIframe');
            const pdfFallback = document.getElementById('pdfFallback');
            const pdfDownloadLink = document.getElementById('pdfDownloadLink');
            const pdfModalClose = document.getElementById('pdfModalClose');

            // iframeにPDFを読み込む
            pdfIframe.style.display = 'block';
            pdfFallback.style.display = 'none';
            pdfIframe.src = url;

            // フォールバック用ダウンロードリンク設定
            pdfDownloadLink.href = url;
            pdfDownloadLink.download = 'preview.pdf';

            // モーダル表示
            pdfModal.style.display = 'flex';

            // iframe読み込みエラー時のフォールバック処理
            pdfIframe.onerror = () => {
                pdfIframe.style.display = 'none';
                pdfFallback.style.display = 'block';
            };

            // 閉じるボタンのイベントハンドラ
            const closeModal = () => {
                pdfModal.style.display = 'none';
                pdfIframe.src = '';
                URL.revokeObjectURL(url);
                pdfModalClose.removeEventListener('click', closeModal);
                pdfModal.removeEventListener('click', outsideClickClose);
            };

            // モーダル外クリックで閉じる
            const outsideClickClose = (e) => {
                if (e.target === pdfModal) {
                    closeModal();
                }
            };

            pdfModalClose.addEventListener('click', closeModal);
            pdfModal.addEventListener('click', outsideClickClose);
        } else {
            const data = await response.json();
            const errorMessage = data.detail || data.message || 'プレビュー生成に失敗しました';
            handleError(errorMessage);
        }
    } catch (error) {
        handleError(`プレビュー生成中にエラーが発生しました: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// =====================================
// 成功ハンドラ
// =====================================
function handleSuccess(data) {
    // ダウンロードURLとファイル名を保存
    downloadUrl = data.download_url;
    downloadFilename = data.filename;

    // 成功メッセージを表示
    messageText.textContent = data.message || 'テンプレートの生成が完了しました！';
    resultSection.style.display = 'block';
    downloadBtn.style.display = 'inline-block';

    // 自動ダウンロード
    if (data.auto_download !== false) {
        setTimeout(() => {
            handleDownload();
        }, 500);
    }

    console.log('Generation successful:', data);
}

// =====================================
// エラーハンドラ
// =====================================
function handleError(message) {
    errorText.textContent = message;
    errorSection.style.display = 'block';
    console.error('Error:', message);
}

// =====================================
// ダウンロードハンドラ
// =====================================
function handleDownload() {
    if (!downloadUrl) {
        alert('ダウンロードするファイルがありません');
        return;
    }

    // iOS（iPhone/iPad）またはモバイルデバイス検出
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile || isIOS) {
        // モバイルデバイスの場合：モーダルを表示
        showDownloadModal();
    } else {
        // デスクトップの場合：自動ダウンロード
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = downloadFilename || 'template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('Download initiated:', downloadFilename);
    }
}

// ダウンロードモーダル表示
function showDownloadModal() {
    const modal = document.getElementById('downloadModal');
    const downloadLink = document.getElementById('downloadModalLink');
    const closeBtn = document.getElementById('downloadModalClose');

    if (!modal || !downloadLink) {
        // フォールバック：モーダルが存在しない場合は直接ダウンロード
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = downloadFilename || 'template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    // ダウンロードリンクを設定
    downloadLink.href = downloadUrl;
    downloadLink.download = downloadFilename || 'template.xlsx';

    // モーダルを表示
    modal.style.display = 'flex';

    // 閉じるボタンのイベントリスナー
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    // モーダル背景クリックで閉じる
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };

    console.log('Download modal shown for mobile device');
}

// =====================================
// ユーティリティ関数
// =====================================
function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function hideResults() {
    if (resultSection) {
        resultSection.style.display = 'none';
    }
    if (errorSection) {
        errorSection.style.display = 'none';
    }
    if (downloadBtn) {
        downloadBtn.style.display = 'none';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getFormData,
        validateForm
    };
}
