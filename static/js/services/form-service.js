/**
 * フォームサービス
 *
 * 設計原則:
 * - 責務の明確化: フォームデータ取得と操作のみを担当
 * - 抽象化: DOM操作の詳細を隠蔽
 */

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

export class FormService {
    /**
     * フォームデータを取得
     * @returns {Object} フォームデータ
     */
    static getFormData() {
        // 基本情報
        const deliveryDate = document.getElementById('deliveryDate')?.value || null;
        const supplier = document.getElementById('supplier')?.value?.trim() || null;
        const outputFilename = document.getElementById('outputFilename')?.value?.trim() || null;
        const buyerName = document.getElementById('buyerName')?.value?.trim() || null;
        const pixel100 = parseFloat(document.getElementById('pixel100')?.value) || 13.5714285714;
        const pixel50 = parseFloat(document.getElementById('pixel50')?.value) || 6.4285714286;

        // 動的商品データを収集
        const products = this.collectProductsData();

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

        console.log('[FormService] Form data collected:', data);

        return data;
    }

    /**
     * 商品データを収集
     * @returns {Array<Object>} 商品データ配列
     */
    static collectProductsData() {
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
                store_quantities: this.collectStoreQuantities(productId)
            };

            products.push(product);
        });

        return products;
    }

    /**
     * 店舗配分数を収集
     * @param {string} productId - 商品ID
     * @returns {Object} 店舗配分数オブジェクト
     */
    static collectStoreQuantities(productId) {
        const storeQuantities = {};

        // 36店舗分の配分数を収集
        for (let storeIndex = 0; storeIndex < 36; storeIndex++) {
            const storeInput = document.getElementById(`store-${productId}-${storeIndex}`);
            const value = parseInt(storeInput?.value);
            if (value && value > 0) {
                // Store code from STORES array
                const storeCode = STORES[storeIndex]?.code || `${storeIndex + 1}`.padStart(2, '0');
                storeQuantities[storeCode] = value;
            }
        }

        return storeQuantities;
    }

    /**
     * フォームをリセット
     */
    static resetForm() {
        const form = document.getElementById('templateForm');
        if (form) {
            form.reset();
        }

        // 商品ブロックをクリア（app-workflow.jsのresetProductsが存在する場合）
        if (window.resetProducts && typeof window.resetProducts === 'function') {
            window.resetProducts();
        }

        console.log('[FormService] Form reset');
    }

    /**
     * 店舗データを取得
     * @returns {Array<Object>} 店舗データ配列
     */
    static getStores() {
        return STORES;
    }
}

// グローバル変数としてSTORESをエクスポート（後方互換性のため）
export { STORES };
