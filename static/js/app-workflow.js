// App Workflow Logic
// 5-step workflow for product distribution management

import dataSyncService from './data-sync-service.js';

// Global state
let productCounter = 0;
let products = [];
let currentUser = null;

// Store names (36 stores)
const STORE_NAMES = [
    '本店', '1号店', '2号店', '3号店', '4号店', '5号店',
    '6号店', '7号店', '8号店', '9号店', '10号店', '11号店',
    '12号店', '13号店', '14号店', '15号店', '16号店', '17号店',
    '18号店', '19号店', '20号店', '21号店', '22号店', '23号店',
    '24号店', '25号店', '26号店', '27号店', '28号店', '29号店',
    '30号店', '31号店', '32号店', '33号店', '34号店', '35号店'
];

// Initialize
export function init(user) {
    currentUser = user;

    // Add first product by default
    addProduct();

    // Setup event listeners
    setupEventListeners();

    console.log('App workflow initialized');
}

// Setup event listeners
function setupEventListeners() {
    // Add product button
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', addProduct);
    }

    // Supplier autocomplete
    const supplierInput = document.getElementById('supplier');
    if (supplierInput) {
        supplierInput.addEventListener('input', handleSupplierInput);
        supplierInput.addEventListener('blur', () => {
            setTimeout(() => hideDropdown('supplierDropdown'), 200);
        });
    }
}

// Add a new product
export function addProduct() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    const productId = ++productCounter;

    const productHTML = `
        <div class="product-item" id="product-${productId}" data-product-id="${productId}">
            <div class="product-item-header">
                <span class="product-item-title">商品 ${productId}</span>
                <button type="button" class="remove-product-btn" onclick="removeProduct(${productId})">
                    削除
                </button>
            </div>

            <!-- Product Name -->
            <div class="form-group">
                <label for="productName-${productId}">
                    品名 <span style="color: red;">*</span>
                </label>
                <div class="autocomplete-wrapper">
                    <input
                        type="text"
                        id="productName-${productId}"
                        name="products[${productId}][name]"
                        placeholder="例: りんご"
                        required
                        autocomplete="off"
                        data-product-id="${productId}"
                        class="product-name-input"
                    >
                    <div class="autocomplete-dropdown" id="productNameDropdown-${productId}"></div>
                </div>
            </div>

            <!-- Origin -->
            <div class="form-group">
                <label for="origin-${productId}">
                    産地 <span style="color: red;">*</span>
                </label>
                <div class="autocomplete-wrapper">
                    <input
                        type="text"
                        id="origin-${productId}"
                        name="products[${productId}][origin]"
                        placeholder="例: 青森県"
                        required
                        autocomplete="off"
                        data-product-id="${productId}"
                        class="origin-input"
                    >
                    <div class="autocomplete-dropdown" id="originDropdown-${productId}"></div>
                </div>
            </div>

            <!-- Standard -->
            <div class="form-group">
                <label for="standard-${productId}">
                    規格 <span style="color: red;">*</span>
                </label>
                <div class="autocomplete-wrapper">
                    <input
                        type="text"
                        id="standard-${productId}"
                        name="products[${productId}][standard]"
                        placeholder="例: 5kg箱"
                        required
                        autocomplete="off"
                        data-product-id="${productId}"
                        class="standard-input"
                    >
                    <div class="autocomplete-dropdown" id="standardDropdown-${productId}"></div>
                </div>
            </div>

            <!-- Quantity per package -->
            <div class="form-group">
                <label for="quantity-${productId}">
                    入数 <span style="color: red;">*</span>
                </label>
                <input
                    type="number"
                    id="quantity-${productId}"
                    name="products[${productId}][quantity]"
                    placeholder="例: 20"
                    min="1"
                    required
                >
            </div>

            <!-- Store Cost -->
            <div class="form-group">
                <label for="storeCost-${productId}">
                    店着原価 <span style="color: red;">*</span>
                </label>
                <input
                    type="number"
                    id="storeCost-${productId}"
                    name="products[${productId}][store_cost]"
                    placeholder="例: 1500"
                    min="0"
                    step="0.01"
                    required
                >
            </div>

            <!-- Tax-excluded Price -->
            <div class="form-group">
                <label for="taxExcludedPrice-${productId}">
                    税抜売価 <span style="color: red;">*</span>
                </label>
                <input
                    type="number"
                    id="taxExcludedPrice-${productId}"
                    name="products[${productId}][tax_excluded_price]"
                    placeholder="例: 2000"
                    min="0"
                    step="0.01"
                    required
                >
            </div>

            <!-- Total Delivery -->
            <div class="form-group">
                <label for="totalDelivery-${productId}">
                    ステップ4: 総納品数 <span style="color: red;">*</span>
                    <span class="help-text">全店舗への総納品数</span>
                </label>
                <input
                    type="number"
                    id="totalDelivery-${productId}"
                    name="products[${productId}][total_delivery]"
                    placeholder="例: 100"
                    min="1"
                    required
                    onchange="validateAllocation(${productId})"
                >
            </div>

            <!-- Store Allocation -->
            <div class="form-group">
                <label>
                    ステップ5: 店舗別配分 <span style="color: red;">*</span>
                    <span class="help-text">各店舗への配分数（合計が総納品数と一致する必要があります）</span>
                </label>
                <div class="store-grid" id="storeGrid-${productId}">
                    ${generateStoreInputs(productId)}
                </div>
                <div id="validationMessage-${productId}"></div>
            </div>

            <!-- Summary Box -->
            <div class="summary-box" id="summaryBox-${productId}">
                <div class="summary-item">
                    <span class="summary-label">総納品数:</span>
                    <span class="summary-value" id="summaryTotal-${productId}">0</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">配分済み:</span>
                    <span class="summary-value" id="summaryAllocated-${productId}">0</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">残り:</span>
                    <span class="summary-value" id="summaryRemaining-${productId}">0</span>
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', productHTML);

    // Setup autocomplete for this product
    setupProductAutocomplete(productId);

    // Setup store allocation listeners
    setupStoreAllocationListeners(productId);

    products.push(productId);
}

// Generate store input fields
function generateStoreInputs(productId) {
    return STORE_NAMES.map((storeName, index) => `
        <div class="store-input-group">
            <label for="store-${productId}-${index}">${storeName}</label>
            <input
                type="number"
                id="store-${productId}-${index}"
                name="products[${productId}][stores][${index}]"
                value="0"
                min="0"
                data-product-id="${productId}"
                data-store-index="${index}"
                class="store-allocation-input"
            >
        </div>
    `).join('');
}

// Remove a product
window.removeProduct = function(productId) {
    if (products.length <= 1) {
        alert('最低1つの商品が必要です');
        return;
    }

    const productElement = document.getElementById(`product-${productId}`);
    if (productElement) {
        productElement.remove();
        products = products.filter(id => id !== productId);
    }
};

// Setup autocomplete for product
function setupProductAutocomplete(productId) {
    // Product name
    const productNameInput = document.getElementById(`productName-${productId}`);
    if (productNameInput) {
        productNameInput.addEventListener('input', () => handleProductNameInput(productId));
        productNameInput.addEventListener('blur', () => {
            setTimeout(() => hideDropdown(`productNameDropdown-${productId}`), 200);
        });
        productNameInput.addEventListener('change', () => handleProductNameChange(productId));
    }

    // Origin
    const originInput = document.getElementById(`origin-${productId}`);
    if (originInput) {
        originInput.addEventListener('input', () => handleOriginInput(productId));
        originInput.addEventListener('blur', () => {
            setTimeout(() => hideDropdown(`originDropdown-${productId}`), 200);
        });
    }

    // Standard
    const standardInput = document.getElementById(`standard-${productId}`);
    if (standardInput) {
        standardInput.addEventListener('input', () => handleStandardInput(productId));
        standardInput.addEventListener('blur', () => {
            setTimeout(() => hideDropdown(`standardDropdown-${productId}`), 200);
        });
    }
}

// Setup store allocation listeners
function setupStoreAllocationListeners(productId) {
    const storeInputs = document.querySelectorAll(`input[data-product-id="${productId}"].store-allocation-input`);
    storeInputs.forEach(input => {
        input.addEventListener('input', () => validateAllocation(productId));
    });
}

// Handle supplier input (autocomplete)
async function handleSupplierInput(event) {
    const value = event.target.value.trim();

    if (value.length < 1) {
        hideDropdown('supplierDropdown');
        return;
    }

    try {
        // Get supplier history from Firestore
        const suppliers = await dataSyncService.getSuppliers();
        const filtered = suppliers.filter(s =>
            s.name && s.name.toLowerCase().includes(value.toLowerCase())
        );

        showDropdown('supplierDropdown', filtered.map(s => s.name), (selected) => {
            document.getElementById('supplier').value = selected;
            hideDropdown('supplierDropdown');
        });
    } catch (error) {
        console.error('Error fetching suppliers:', error);
    }
}

// Handle product name input (autocomplete)
async function handleProductNameInput(productId) {
    const input = document.getElementById(`productName-${productId}`);
    const value = input.value.trim();

    if (value.length < 1) {
        hideDropdown(`productNameDropdown-${productId}`);
        return;
    }

    try {
        const supplierName = document.getElementById('supplier').value;
        const products = await dataSyncService.searchProducts(value, supplierName);

        const productNames = products.map(p => p.name);

        showDropdown(`productNameDropdown-${productId}`, productNames, (selected) => {
            input.value = selected;
            hideDropdown(`productNameDropdown-${productId}`);

            // Auto-fill product details if available
            const selectedProduct = products.find(p => p.name === selected);
            if (selectedProduct) {
                autoFillProductDetails(productId, selectedProduct);
            }
        });
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

// Handle product name change (when selected or manually entered)
async function handleProductNameChange(productId) {
    const input = document.getElementById(`productName-${productId}`);
    const value = input.value.trim();

    if (!value) return;

    try {
        const supplierName = document.getElementById('supplier').value;
        const products = await dataSyncService.searchProducts(value, supplierName);

        const exactMatch = products.find(p => p.name === value);
        if (exactMatch) {
            autoFillProductDetails(productId, exactMatch);
        }
    } catch (error) {
        console.error('Error fetching product details:', error);
    }
}

// Auto-fill product details
function autoFillProductDetails(productId, product) {
    if (product.origin) {
        const originInput = document.getElementById(`origin-${productId}`);
        if (originInput && !originInput.value) {
            originInput.value = product.origin;
        }
    }

    if (product.standard) {
        const standardInput = document.getElementById(`standard-${productId}`);
        if (standardInput && !standardInput.value) {
            standardInput.value = product.standard;
        }
    }

    if (product.quantity) {
        const quantityInput = document.getElementById(`quantity-${productId}`);
        if (quantityInput && !quantityInput.value) {
            quantityInput.value = product.quantity;
        }
    }

    if (product.storeCost) {
        const costInput = document.getElementById(`storeCost-${productId}`);
        if (costInput && !costInput.value) {
            costInput.value = product.storeCost;
        }
    }

    if (product.taxExcludedPrice) {
        const priceInput = document.getElementById(`taxExcludedPrice-${productId}`);
        if (priceInput && !priceInput.value) {
            priceInput.value = product.taxExcludedPrice;
        }
    }
}

// Handle origin input (autocomplete)
async function handleOriginInput(productId) {
    const input = document.getElementById(`origin-${productId}`);
    const value = input.value.trim();

    if (value.length < 1) {
        hideDropdown(`originDropdown-${productId}`);
        return;
    }

    try {
        const history = await dataSyncService.getHistory('origin');
        const filtered = history.filter(h =>
            h.value && h.value.toLowerCase().includes(value.toLowerCase())
        );

        const origins = filtered.map(h => h.value);

        showDropdown(`originDropdown-${productId}`, origins, (selected) => {
            input.value = selected;
            hideDropdown(`originDropdown-${productId}`);
        });
    } catch (error) {
        console.error('Error fetching origins:', error);
    }
}

// Handle standard input (autocomplete)
async function handleStandardInput(productId) {
    const input = document.getElementById(`standard-${productId}`);
    const value = input.value.trim();

    if (value.length < 1) {
        hideDropdown(`standardDropdown-${productId}`);
        return;
    }

    try {
        const history = await dataSyncService.getHistory('standard');
        const filtered = history.filter(h =>
            h.value && h.value.toLowerCase().includes(value.toLowerCase())
        );

        const standards = filtered.map(h => h.value);

        showDropdown(`standardDropdown-${productId}`, standards, (selected) => {
            input.value = selected;
            hideDropdown(`standardDropdown-${productId}`);
        });
    } catch (error) {
        console.error('Error fetching standards:', error);
    }
}

// Show autocomplete dropdown
function showDropdown(dropdownId, items, onSelect) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    dropdown.innerHTML = '';

    if (items.length === 0) {
        dropdown.classList.remove('show');
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.textContent = item;
        div.addEventListener('click', () => onSelect(item));
        dropdown.appendChild(div);
    });

    dropdown.classList.add('show');
}

// Hide autocomplete dropdown
function hideDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Validate store allocation
window.validateAllocation = function(productId) {
    const totalInput = document.getElementById(`totalDelivery-${productId}`);
    const totalDelivery = parseInt(totalInput.value) || 0;

    const storeInputs = document.querySelectorAll(`input[data-product-id="${productId}"].store-allocation-input`);
    let allocated = 0;

    storeInputs.forEach(input => {
        allocated += parseInt(input.value) || 0;
    });

    const remaining = totalDelivery - allocated;

    // Update summary
    document.getElementById(`summaryTotal-${productId}`).textContent = totalDelivery;
    document.getElementById(`summaryAllocated-${productId}`).textContent = allocated;
    document.getElementById(`summaryRemaining-${productId}`).textContent = remaining;

    // Show validation message
    const messageDiv = document.getElementById(`validationMessage-${productId}`);

    if (remaining === 0 && totalDelivery > 0) {
        messageDiv.innerHTML = '<div class="validation-success">✅ 配分が完了しました</div>';
    } else if (remaining < 0) {
        messageDiv.innerHTML = `<div class="validation-error">⚠️ 配分が総納品数を ${Math.abs(remaining)} 超過しています</div>`;
    } else if (remaining > 0 && totalDelivery > 0) {
        messageDiv.innerHTML = `<div class="validation-error">⚠️ あと ${remaining} の配分が必要です</div>`;
    } else {
        messageDiv.innerHTML = '';
    }
};
