// =====================================
// グローバル変数
// =====================================
let downloadUrl = null;
let downloadFilename = null;

// 店舗データ
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
const previewSection = document.getElementById('previewSection');
const messageText = document.getElementById('messageText');
const errorText = document.getElementById('errorText');
const productsContainer = document.getElementById('productsContainer');

// =====================================
// イベントリスナー設定
// =====================================
document.addEventListener('DOMContentLoaded', () => {
    // フォーム送信イベント
    templateForm.addEventListener('submit', handleFormSubmit);

    // プレビューボタンクリックイベント
    previewBtn.addEventListener('click', handlePreview);

    // ダウンロードボタンクリックイベント
    downloadBtn.addEventListener('click', handleDownload);

    // 入力値の検証
    const numBlocksInput = document.getElementById('numBlocks');
    numBlocksInput.addEventListener('input', validateNumBlocks);

    // 商品ブロック数の変更に応じてフォームを生成
    numBlocksInput.addEventListener('change', generateProductForms);

    // 初期表示（1商品分）
    generateProductForms();
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
// 商品フォーム動的生成
// =====================================
function generateProductForms() {
    const numBlocks = parseInt(document.getElementById('numBlocks').value) || 1;
    productsContainer.innerHTML = '';

    for (let i = 0; i < numBlocks; i++) {
        const productBlock = createProductBlock(i);
        productsContainer.appendChild(productBlock);
    }
}

function createProductBlock(index) {
    const div = document.createElement('div');
    div.className = 'product-block';
    div.innerHTML = `
        <div class="product-block-header">
            <h4>商品 ${index + 1}</h4>
        </div>
        <div class="product-grid">
            <div class="form-group">
                <label for="delivery_date_${index}">納品日</label>
                <input type="date" id="delivery_date_${index}" name="product_${index}_delivery_date">
            </div>
            <div class="form-group">
                <label for="origin_${index}">産地</label>
                <input type="text" id="origin_${index}" name="product_${index}_origin" placeholder="例: 高知県" maxlength="30">
            </div>
            <div class="form-group">
                <label for="standard_${index}">規格</label>
                <input type="text" id="standard_${index}" name="product_${index}_standard" placeholder="例: L" maxlength="20">
            </div>
            <div class="form-group">
                <label for="product_name_${index}">品名</label>
                <input type="text" id="product_name_${index}" name="product_${index}_name" placeholder="例: トマト" maxlength="50">
            </div>
            <div class="form-group">
                <label for="store_cost_${index}">店着原価</label>
                <input type="number" id="store_cost_${index}" name="product_${index}_store_cost" placeholder="例: 120" step="0.01">
            </div>
            <div class="form-group">
                <label for="price_${index}">税抜売価</label>
                <input type="number" id="price_${index}" name="product_${index}_price" placeholder="例: 198" step="0.01">
            </div>
            <div class="form-group">
                <label for="quantity_${index}">入数</label>
                <input type="number" id="quantity_${index}" name="product_${index}_quantity" placeholder="例: 10" min="1">
            </div>
            <div class="form-group">
                <label for="total_delivery_${index}">総納品数</label>
                <input type="number" id="total_delivery_${index}" name="product_${index}_total_delivery" placeholder="例: 100" min="0">
            </div>
            <div class="form-group">
                <label for="delivery_dest_${index}">納品先</label>
                <input type="text" id="delivery_dest_${index}" name="product_${index}_delivery_dest" placeholder="例: 本社" maxlength="30">
            </div>
        </div>
        <details open>
            <summary>店舗配分数</summary>
            <div class="stores-grid" id="stores_${index}">
                ${createStoresInputs(index)}
            </div>
        </details>
    `;
    return div;
}

function createStoresInputs(productIndex) {
    return STORES.map(store => `
        <div class="form-group">
            <label for="store_${store.code}_${productIndex}">${store.name}</label>
            <input type="number"
                   id="store_${store.code}_${productIndex}"
                   name="product_${productIndex}_store_${store.code}"
                   placeholder="0"
                   min="0"
                   step="1">
        </div>
    `).join('');
}

// =====================================
// フォームデータ取得
// =====================================
function getFormData() {
    const numBlocks = parseInt(document.getElementById('numBlocks').value);
    const outputFilename = document.getElementById('outputFilename').value.trim();
    const buyerName = document.getElementById('buyerName').value.trim();
    const pixel100 = parseFloat(document.getElementById('pixel100').value);
    const pixel50 = parseFloat(document.getElementById('pixel50').value);

    const data = {
        num_blocks: numBlocks,
        pixel_100: pixel100,
        pixel_50: pixel50,
    };

    // オプショナルフィールド
    if (outputFilename) {
        data.output_filename = outputFilename;
    }

    if (buyerName) {
        data.buyer_name = buyerName;
    }

    // 商品データを収集
    data.products = [];
    for (let i = 0; i < numBlocks; i++) {
        const product = {
            delivery_date: document.getElementById(`delivery_date_${i}`)?.value || null,
            origin: document.getElementById(`origin_${i}`)?.value?.trim() || null,
            standard: document.getElementById(`standard_${i}`)?.value?.trim() || null,
            product_name: document.getElementById(`product_name_${i}`)?.value?.trim() || null,
            store_cost: parseFloat(document.getElementById(`store_cost_${i}`)?.value) || null,
            price: parseFloat(document.getElementById(`price_${i}`)?.value) || null,
            quantity: parseInt(document.getElementById(`quantity_${i}`)?.value) || null,
            total_delivery: parseInt(document.getElementById(`total_delivery_${i}`)?.value) || null,
            delivery_dest: document.getElementById(`delivery_dest_${i}`)?.value?.trim() || null,
            store_quantities: {}
        };

        // 店舗配分数を収集
        STORES.forEach(store => {
            const value = parseInt(document.getElementById(`store_${store.code}_${i}`)?.value);
            if (value && value > 0) {
                product.store_quantities[store.code] = value;
            }
        });

        data.products.push(product);
    }

    return data;
}

// =====================================
// フォーム検証
// =====================================
function validateForm() {
    const numBlocksInput = document.getElementById('numBlocks');
    const numBlocks = parseInt(numBlocksInput.value);

    if (isNaN(numBlocks) || numBlocks < 1 || numBlocks > 100) {
        alert('商品ブロック数は1〜100の範囲で入力してください');
        numBlocksInput.focus();
        return false;
    }

    return true;
}

function validateNumBlocks(event) {
    const value = parseInt(event.target.value);
    if (isNaN(value) || value < 1 || value > 100) {
        event.target.setCustomValidity('1〜100の範囲で入力してください');
    } else {
        event.target.setCustomValidity('');
    }
}

// =====================================
// 成功ハンドラ
// =====================================
function handleSuccess(data) {
    // ダウンロードURLとファイル名を保存
    downloadUrl = data.download_url;
    downloadFilename = data.filename;

    // 成功メッセージ表示
    messageText.textContent = data.message || 'テンプレートの生成に成功しました';
    resultSection.style.display = 'block';
    downloadBtn.style.display = 'block';

    // スムーズスクロール
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =====================================
// エラーハンドラ
// =====================================
function handleError(errorMessage) {
    errorText.textContent = errorMessage;
    errorSection.style.display = 'block';

    // スムーズスクロール
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =====================================
// ダウンロードハンドラ
// =====================================
async function handleDownload() {
    if (!downloadUrl) {
        alert('ダウンロードURLが見つかりません');
        return;
    }

    try {
        // ダウンロードボタンを無効化
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'ダウンロード中...';

        // モバイル判定
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            // モバイルの場合は直接URLに遷移
            window.location.href = downloadUrl;

            // ボタンのテキストを更新
            setTimeout(() => {
                downloadBtn.innerHTML = '<span class="btn-icon">✅</span> ダウンロード完了';
                downloadBtn.style.background = '#059669';

                // 3秒後に元に戻す
                setTimeout(() => {
                    downloadBtn.innerHTML = '<span class="btn-icon">📥</span> Excelファイルをダウンロード';
                    downloadBtn.style.background = '';
                    downloadBtn.disabled = false;
                }, 3000);
            }, 1000);
        } else {
            // デスクトップの場合はBlob方式
            const response = await fetch(downloadUrl);

            if (!response.ok) {
                throw new Error('ダウンロードに失敗しました');
            }

            // Blobとして取得
            const blob = await response.blob();

            // ダウンロードリンクを作成
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = downloadFilename || '配分表_テンプレート.xlsx';
            document.body.appendChild(a);
            a.click();

            // クリーンアップ
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

            // ボタンのテキストを更新
            downloadBtn.innerHTML = '<span class="btn-icon">✅</span> ダウンロード完了';
            downloadBtn.style.background = '#059669';

            // 3秒後に元に戻す
            setTimeout(() => {
                downloadBtn.innerHTML = '<span class="btn-icon">📥</span> Excelファイルをダウンロード';
                downloadBtn.style.background = '';
                downloadBtn.disabled = false;
            }, 3000);
        }

    } catch (error) {
        alert(`ダウンロード中にエラーが発生しました: ${error.message}`);
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<span class="btn-icon">📥</span> Excelファイルをダウンロード';
    }
}

// =====================================
// UI制御関数
// =====================================
function showLoading() {
    loadingOverlay.style.display = 'flex';
    generateBtn.disabled = true;
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
    generateBtn.disabled = false;
}

function hideResults() {
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    previewSection.style.display = 'none';
}

// =====================================
// プレビューハンドラ
// =====================================
function handlePreview() {
    // フォームデータを取得
    const formData = getFormData();

    // プレビューを生成
    generatePreview(formData);

    // プレビューセクションを表示
    previewSection.style.display = 'block';

    // スムーズスクロール
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function generatePreview(data) {
    // 基本情報のプレビュー
    const basicInfoHtml = `
        <tr>
            <th>商品ブロック数</th>
            <td>${data.num_blocks}</td>
        </tr>
        ${data.buyer_name ? `<tr><th>担当バイヤー</th><td>${escapeHtml(data.buyer_name)}</td></tr>` : ''}
        ${data.output_filename ? `<tr><th>ファイル名</th><td>${escapeHtml(data.output_filename)}</td></tr>` : ''}
    `;
    document.getElementById('previewBasicInfo').innerHTML = basicInfoHtml;

    // 商品情報のプレビュー
    const previewProducts = document.getElementById('previewProducts');
    previewProducts.innerHTML = '';

    data.products.forEach((product, index) => {
        const productDiv = document.createElement('div');
        productDiv.className = 'preview-product';

        const hasData = product.delivery_date || product.origin || product.standard ||
                       product.product_name || product.store_cost || product.price ||
                       product.quantity || product.total_delivery || product.delivery_dest ||
                       Object.keys(product.store_quantities).length > 0;

        if (!hasData) {
            productDiv.innerHTML = `
                <h3>商品 ${index + 1}</h3>
                <p class="no-data">入力データなし</p>
            `;
        } else {
            // 商品情報テーブル
            let productInfoHtml = `<h3>商品 ${index + 1}</h3><table class="preview-table"><tbody>`;

            if (product.delivery_date) {
                productInfoHtml += `<tr><th>納品日</th><td>${escapeHtml(product.delivery_date)}</td></tr>`;
            }
            if (product.origin) {
                productInfoHtml += `<tr><th>産地</th><td>${escapeHtml(product.origin)}</td></tr>`;
            }
            if (product.standard) {
                productInfoHtml += `<tr><th>規格</th><td>${escapeHtml(product.standard)}</td></tr>`;
            }
            if (product.product_name) {
                productInfoHtml += `<tr><th>品名</th><td>${escapeHtml(product.product_name)}</td></tr>`;
            }
            if (product.store_cost) {
                productInfoHtml += `<tr><th>店着原価</th><td>¥${product.store_cost.toLocaleString()}</td></tr>`;
            }
            if (product.price) {
                const taxIncluded = product.price * 1.08;
                productInfoHtml += `<tr><th>税抜売価</th><td>¥${product.price.toLocaleString()}</td></tr>`;
                productInfoHtml += `<tr><th>税込売価</th><td>¥${taxIncluded.toLocaleString()}</td></tr>`;
            }
            if (product.quantity) {
                productInfoHtml += `<tr><th>入数</th><td>${product.quantity}</td></tr>`;
            }
            if (product.total_delivery) {
                productInfoHtml += `<tr><th>総納品数</th><td>${product.total_delivery}</td></tr>`;
            }
            if (product.delivery_dest) {
                productInfoHtml += `<tr><th>納品先</th><td>${escapeHtml(product.delivery_dest)}</td></tr>`;
            }

            productInfoHtml += '</tbody></table>';

            // 店舗配分数
            const storeCount = Object.keys(product.store_quantities).length;
            if (storeCount > 0) {
                const totalQuantity = Object.values(product.store_quantities).reduce((sum, qty) => sum + qty, 0);
                productInfoHtml += `
                    <h4>店舗配分数（${storeCount}店舗）合計: ${totalQuantity}</h4>
                    <table class="preview-table stores-table">
                        <thead>
                            <tr>
                                <th>店舗名</th>
                                <th>配分数</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                Object.entries(product.store_quantities).forEach(([code, quantity]) => {
                    const store = STORES.find(s => s.code === code);
                    const storeName = store ? store.name : `店舗${code}`;
                    productInfoHtml += `
                        <tr>
                            <td>${escapeHtml(storeName)}</td>
                            <td>${quantity}</td>
                        </tr>
                    `;
                });

                productInfoHtml += '</tbody></table>';
            }

            productDiv.innerHTML = productInfoHtml;
        }

        previewProducts.appendChild(productDiv);
    });
}

// HTMLエスケープ関数
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// =====================================
// ヘルスチェック（オプション）
// =====================================
async function checkApiHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('API Health:', data);
    } catch (error) {
        console.error('API Health Check Failed:', error);
    }
}

// 初回ロード時にヘルスチェック
checkApiHealth();
