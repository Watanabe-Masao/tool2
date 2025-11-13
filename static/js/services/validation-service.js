/**
 * バリデーションサービス
 *
 * 設計原則:
 * - 責務の明確化: フォームバリデーションのみを担当
 * - 再利用性: 各バリデーションを独立した関数として定義
 */

export class ValidationService {
    /**
     * フォーム全体のバリデーション
     * @returns {boolean} バリデーション結果
     */
    static validateForm() {
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
            if (!this.validateProduct(item)) {
                return false;
            }
        }

        return true;
    }

    /**
     * 商品データのバリデーション
     * @param {HTMLElement} productItem - 商品アイテム要素
     * @returns {boolean} バリデーション結果
     */
    static validateProduct(productItem) {
        const productId = productItem.getAttribute('data-product-id');

        const productName = document.getElementById(`productName-${productId}`)?.value?.trim();
        const origin = document.getElementById(`origin-${productId}`)?.value?.trim();
        const standard = document.getElementById(`standard-${productId}`)?.value?.trim();
        const quantity = document.getElementById(`quantity-${productId}`)?.value;
        const storeCost = document.getElementById(`storeCost-${productId}`)?.value;
        const taxExcludedPrice = document.getElementById(`taxExcludedPrice-${productId}`)?.value;
        const totalDelivery = document.getElementById(`totalDelivery-${productId}`)?.value;

        // 必須フィールドの検証
        if (!productName) {
            alert(`商品名を入力してください（商品${productId}）`);
            return false;
        }

        if (!origin) {
            alert(`産地を入力してください（商品${productId}）`);
            return false;
        }

        if (!standard) {
            alert(`規格を入力してください（商品${productId}）`);
            return false;
        }

        if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) {
            alert(`入数を正しく入力してください（商品${productId}）`);
            return false;
        }

        if (!storeCost || isNaN(storeCost) || parseFloat(storeCost) < 0) {
            alert(`店着原価を正しく入力してください（商品${productId}）`);
            return false;
        }

        if (!taxExcludedPrice || isNaN(taxExcludedPrice) || parseFloat(taxExcludedPrice) < 0) {
            alert(`税抜売価を正しく入力してください（商品${productId}）`);
            return false;
        }

        if (!totalDelivery || isNaN(totalDelivery) || parseInt(totalDelivery) <= 0) {
            alert(`総納品数を正しく入力してください（商品${productId}）`);
            return false;
        }

        return true;
    }

    /**
     * 数値のバリデーション
     * @param {any} value - 検証する値
     * @param {boolean} allowZero - 0を許可するか
     * @returns {boolean} バリデーション結果
     */
    static isValidNumber(value, allowZero = false) {
        if (!value || isNaN(value)) {
            return false;
        }
        const num = parseFloat(value);
        return allowZero ? num >= 0 : num > 0;
    }

    /**
     * 文字列のバリデーション
     * @param {any} value - 検証する値
     * @param {number} maxLength - 最大長（オプション）
     * @returns {boolean} バリデーション結果
     */
    static isValidString(value, maxLength = null) {
        if (!value || typeof value !== 'string') {
            return false;
        }
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return false;
        }
        if (maxLength && trimmed.length > maxLength) {
            return false;
        }
        return true;
    }
}
