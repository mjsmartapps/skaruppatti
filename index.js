import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, set, get, push, update } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB5jaPVkCwxXiMYhSn0uuW9QSMc-B5C9YY",
    authDomain: "mjsmartapps.firebaseapp.com",
    databaseURL: "https://mjsmartapps-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mjsmartapps",
    storageBucket: "mjsmartapps.firebasestorage.app",
    messagingSenderId: "1033240518010",
    appId: "1:1033240518010:web:930921011dda1bd56e0ac3",
    measurementId: "G-959VLQSHH2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const rtdb = getDatabase(app);

window.cart = {}; 
window.productsMap = {};
window.currentUserData = null; 
window.currentDetailId = null; // Track currently open product detail

window.showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check text-green-600"></i>' : '<i class="fa-solid fa-circle-exclamation text-red-600"></i>';
    toast.innerHTML = `${icon} <span class="font-medium text-sm text-gray-700">${message}</span>`;
    container.appendChild(toast);
    
    // Performance: Use requestAnimationFrame for smoother animation handling
    requestAnimationFrame(() => {
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)'; // Updated exit animation to slide up
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    });
};

window.toggleDrawer = (isOpen) => {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (isOpen) {
        drawer.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        drawer.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
};

window.toggleModal = (modalId, isOpen) => {
    const modal = document.getElementById(modalId);
    if(isOpen) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
        if (modalId === 'product-detail-modal') {
            window.currentDetailId = null;
        }
    }
};

window.toggleUserMenu = () => {
    const menu = document.getElementById('user-menu-dropdown');
    menu.classList.toggle('hidden');
}

// --- NEW: PINCODE LOGIC ---
window.handlePincodeInput = async (el, targetId) => {
    el.value = el.value.replace(/[^0-9]/g, '').slice(0, 6);
    const stateInputId = targetId || 'checkout-state';
    const stateInput = document.getElementById(stateInputId);
    
    if(el.value.length === 6) {
        stateInput.placeholder = "Fetching...";
        try {
            const res = await fetch(`https://api.postalpincode.in/pincode/${el.value}`);
            const data = await res.json();
            
            if(data[0].Status === "Success") {
                stateInput.value = data[0].PostOffice[0].State;
                window.showToast("State Found: " + data[0].PostOffice[0].State);
            } else {
                stateInput.value = "";
                window.showToast("Invalid Pincode", "error");
            }
        } catch(e) {
            console.error(e);
            stateInput.value = "";
            window.showToast("Could not fetch state", "error");
        }
    } else {
        stateInput.value = "";
        stateInput.placeholder = "Auto-filled";
    }
}

// --- PRODUCTS & CART ---

// Helper to generate button HTML for Cards
window.renderActionButton = (id, index) => {
    const product = window.productsMap[id];
    if(!product) return '';

    let variantData = product;
    if (product.variants && product.variants.length > 0) {
        variantData = product.variants[index];
    }

    if(!variantData || variantData.stock <= 0) {
        return `<button disabled class="bg-gray-200 text-gray-500 px-3 py-1.5 rounded-full text-xs font-bold w-full cursor-not-allowed">Out of Stock</button>`;
    }

    const cartKey = (product.variants && product.variants.length > 0) ? `${id}___${index}` : id;
    const cartItem = window.cart[cartKey];

    if (cartItem) {
        // Updated with stopPropagation to prevent opening product detail when clicking buttons
        return `
            <div class="flex items-center justify-between bg-primary text-white rounded-lg p-1 w-full shadow-md z-20 relative h-[32px]">
                <button onclick="changeQty('${cartKey}', -1); event.stopPropagation();" class="qty-btn hover:bg-emerald-900 font-bold text-sm">-</button>
                <span class="text-xs font-bold">${cartItem.qty}</span>
                <button onclick="changeQty('${cartKey}', 1); event.stopPropagation();" class="qty-btn hover:bg-emerald-900 font-bold text-sm">+</button>
            </div>
        `;
    } else {
        return `<button onclick="addToCart('${id}'); event.stopPropagation();" class="bg-primary text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-900 transition shadow-md w-full z-20 relative h-[32px]">Add to Cart</button>`;
    }
};

// Helper to update only button areas in Grid
window.updateCardButtons = () => {
    Object.keys(window.productsMap).forEach(id => {
        const container = document.getElementById(`btn-container-${id}`);
        const input = document.getElementById(`selected-variant-${id}`);
        if(container && input) {
            const index = parseInt(input.value) || 0;
            container.innerHTML = window.renderActionButton(id, index);
        }
    });
};

// Helper to update buttons in Detail Modal
window.updateDetailButton = () => {
    const container = document.getElementById('detail-btn-container');
    if (!container || !window.currentDetailId) return;

    const id = window.currentDetailId;
    const product = window.productsMap[id];
    if (!product) return;

    // Use index 0 as detail view default (since no selector inside detail view currently)
    const variantIndex = 0;
    const variantData = (product.variants && product.variants.length > 0) ? product.variants[0] : product;

    if(variantData.stock <= 0) {
         container.innerHTML = `<button disabled class="w-full bg-gray-200 text-gray-500 py-3 rounded-full font-bold cursor-not-allowed">Out of Stock</button>`;
         return;
    }

    const cartKey = (product.variants && product.variants.length > 0) ? `${id}___${variantIndex}` : id;
    const cartItem = window.cart[cartKey];

    if(cartItem) {
        // Show Big Quantity Controls in Popup
        container.innerHTML = `
            <div class="flex items-center justify-between bg-primary text-white rounded-full p-2 w-full shadow-lg">
                <button onclick="changeQty('${cartKey}', -1)" class="w-12 h-10 rounded-full hover:bg-emerald-900 flex items-center justify-center font-bold text-xl transition">-</button>
                <span class="text-xl font-bold">${cartItem.qty}</span>
                <button onclick="changeQty('${cartKey}', 1)" class="w-12 h-10 rounded-full hover:bg-emerald-900 flex items-center justify-center font-bold text-xl transition">+</button>
            </div>
        `;
    } else {
        // Show Add to Cart & Buy Now in Popup
        container.innerHTML = `
            <div class="flex gap-3 w-full">
                <button onclick="addToCart('${id}', 0)" class="flex-1 border-2 border-primary text-primary py-3 rounded-full font-bold hover:bg-primary hover:text-white transition">
                    <i class="fa-solid fa-cart-plus mr-2"></i> Add to Cart
                </button>
                <button onclick="buyNow('${id}')" class="flex-1 bg-secondary text-white py-3 rounded-full font-bold hover:bg-yellow-600 transition shadow-lg">
                    Buy Now
                </button>
            </div>
        `;
    }
};

window.selectVariant = (id, index, event) => {
    if(event) event.stopPropagation();
    
    const input = document.getElementById(`selected-variant-${id}`);
    if(input) input.value = index;

    const buttons = document.querySelectorAll(`.variant-btn-${id}`);
    buttons.forEach(btn => {
        const btnIndex = parseInt(btn.getAttribute('data-index'));
        if(btnIndex === index) {
            btn.className = `variant-btn-${id} flex-1 px-2 py-1.5 text-[10px] font-bold border rounded-lg transition bg-primary text-white border-primary shadow-sm`;
        } else {
            btn.className = `variant-btn-${id} flex-1 px-2 py-1.5 text-[10px] font-bold border rounded-lg transition bg-white text-gray-600 border-gray-200 hover:border-secondary hover:text-secondary`;
        }
    });

    const product = window.productsMap[id];
    if (!product || !product.variants) return;
    const variant = product.variants[index];

    const priceEl = document.getElementById(`price-new-${id}`);
    const oldPriceEl = document.getElementById(`price-old-${id}`);
    
    if(priceEl) priceEl.innerText = `₹${variant.priceNew}`;
    
    if(oldPriceEl) {
        if(variant.priceOld) {
            oldPriceEl.innerText = `₹${variant.priceOld}`;
            oldPriceEl.classList.remove('hidden');
        } else {
            oldPriceEl.classList.add('hidden');
        }
    }

    const btnContainer = document.getElementById(`btn-container-${id}`);
    if(btnContainer) {
        btnContainer.innerHTML = window.renderActionButton(id, index);
    }
};

const renderProductCard = (product) => {
    const subtitle = product.category || product.description || 'Premium Quality';
    
    const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
    
    let currentPrice = product.priceNew || product.price;
    let currentOldPrice = product.priceOld;
    let currentUnit = product.unit || product.weight || '';
    
    if (hasVariants) {
        currentPrice = product.variants[0].priceNew;
        currentOldPrice = product.variants[0].priceOld;
        currentUnit = product.variants[0].unit;
    }

    let variantHtml = '';
    if (hasVariants) {
        const buttons = product.variants.map((v, idx) => {
            const isSelected = idx === 0 ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-secondary hover:text-secondary';
            return `<button type="button" onclick="selectVariant('${product.id}', ${idx}, event)" class="variant-btn-${product.id} flex-1 px-2 py-1.5 text-[10px] font-bold border rounded-lg transition ${isSelected}" data-index="${idx}">${v.unit}</button>`;
        }).join('');
        
        variantHtml = `
            <div class="flex flex-wrap gap-1.5 mb-2" onclick="event.stopPropagation()">
                ${buttons}
            </div>
            <input type="hidden" id="selected-variant-${product.id}" value="0">
        `;
    } else {
        variantHtml = `<p class="text-xs text-gray-500 mb-2 font-medium h-[26px] flex items-center">${currentUnit ? '/ ' + currentUnit : ''}</p>`;
        variantHtml += `<input type="hidden" id="selected-variant-${product.id}" value="0">`;
    }
    
    // Initial Render of Button
    const buttonHtml = window.renderActionButton(product.id, 0);
    
    const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image || 'https://placehold.co/400x300?text=No+Image'];
    
    // Performance: Added loading="lazy" and decoding="async" to images
    const imagesHtml = images.map((img, idx) => `
        <img src="${img}" class="w-full h-full object-cover flex-shrink-0 snap-center" loading="lazy" decoding="async" draggable="false" alt="${product.nameEnglish || 'Product'}">
    `).join('');

    // Performance: Added 'product-card-opt' class for content-visibility
    return `
        <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition flex flex-col h-full border border-gray-100 group relative product-card-opt">
            
            <div class="h-40 bg-gray-100 relative overflow-hidden cursor-pointer" onclick="openProductDetail('${product.id}')">
                <div class="flex overflow-x-auto snap-x snap-mandatory h-full hide-scrollbar scroll-smooth">
                    ${imagesHtml}
                </div>
                ${images.length > 1 ? '<div class="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 rounded-full"><i class="fa-solid fa-layer-group"></i> ' + images.length + '</div>' : ''}
            </div>

            <div class="p-3 flex flex-col flex-grow">
                <div class="cursor-pointer" onclick="openProductDetail('${product.id}')">
                    <h4 class="font-bold text-gray-800 text-sm line-clamp-1">${product.nameEnglish || product.name}</h4>
                    <p class="text-xs text-primary tamil-font mb-1 line-clamp-1">${product.nameTamil || ''}</p>
                    <p class="text-xs text-gray-500 mb-1 truncate">${subtitle}</p>
                </div>

                <div class="mt-auto">
                    ${variantHtml}
                    
                    <div class="flex justify-between items-center gap-2 mt-1">
                        <div>
                            <span id="price-old-${product.id}" class="${currentOldPrice ? '' : 'hidden'} line-through text-gray-400 text-[10px] mr-1">₹${currentOldPrice}</span>
                            <span id="price-new-${product.id}" class="text-primary font-bold text-sm">₹${currentPrice}</span>
                        </div>
                        <div class="flex-1 max-w-[100px]" id="btn-container-${product.id}">
                            ${buttonHtml}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const updateGrid = () => {
    const grid = document.getElementById('products-grid');
    if(!grid) return;
    const products = Object.values(window.productsMap);
    
    // Performance: Using requestAnimationFrame to unblock the main thread during render
    requestAnimationFrame(() => {
        if(products.length > 0) {
            grid.innerHTML = products.map(renderProductCard).join('');
        } else {
            grid.innerHTML = '<p class="col-span-full text-center text-gray-500">No products found.</p>';
        }
    });
};

const fetchProducts = () => {
    const grid = document.getElementById('products-grid');
    const productsRef = ref(rtdb, 'skaruppatti-products');
    onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            window.productsMap = {};
            Object.entries(data).forEach(([key, value]) => {
                window.productsMap[key] = { id: key, ...value };
            });
            updateGrid();
        } else {
            grid.innerHTML = '<p class="col-span-full text-center text-gray-500">No products found.</p>';
        }
    });
};

// --- PRODUCT DETAIL FUNCTIONS ---
window.openProductDetail = (id) => {
    const product = window.productsMap[id];
    if(!product) return;
    
    window.currentDetailId = id; // Set current product for modal logic

    const hasVariants = product.variants && product.variants.length > 0;
    const variant = hasVariants ? product.variants[0] : product;

    const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image || 'https://placehold.co/400x300?text=No+Image'];

    document.getElementById('detail-name-eng').innerText = product.nameEnglish || product.name;
    document.getElementById('detail-name-tam').innerText = product.nameTamil || '';
    document.getElementById('detail-category').innerText = product.category || 'Product';
    document.getElementById('detail-price-new').innerText = '₹' + (variant.priceNew || variant.price);
    document.getElementById('detail-unit').innerText = '/ ' + (variant.unit || variant.weight || 'unit');
    document.getElementById('detail-desc').innerText = product.description || 'No description available.';
    
    if(variant.priceOld) {
        document.getElementById('detail-price-old').innerText = '₹' + variant.priceOld;
        document.getElementById('detail-price-old').classList.remove('hidden');
    } else {
        document.getElementById('detail-price-old').classList.add('hidden');
    }

    const stockEl = document.getElementById('detail-stock');
    
    const currentStock = variant.stock || 0;
    
    if(currentStock > 0) {
        stockEl.innerText = `In Stock`;
        stockEl.className = "text-sm font-bold text-green-600 ml-2";
    } else {
        stockEl.innerText = "Out of Stock";
        stockEl.className = "text-sm font-bold text-red-600 ml-2";
    }

    const mainImg = document.getElementById('detail-main-img');
    mainImg.src = images[0];

    const thumbContainer = document.getElementById('detail-thumbnails');
    thumbContainer.innerHTML = images.map((img, index) => `
        <img src="${img}" onclick="document.getElementById('detail-main-img').src='${img}'" 
        class="h-full w-auto object-cover border rounded cursor-pointer hover:border-secondary transition ${index === 0 ? 'border-secondary' : 'border-transparent'}" loading="lazy">
    `).join('');

    // Update the buttons area (Add vs Qty)
    window.updateDetailButton();

    window.toggleModal('product-detail-modal', true);
};

window.buyNow = (id) => {
    window.addToCart(id, 0); 
    window.toggleModal('product-detail-modal', false);
    window.openCartModal();
};

window.addToCart = (id, forcedVariantIndex = null) => {
    const product = window.productsMap[id];
    if(!product) return;

    let variantIndex = 0;
    let variantData = product;
    
    // Check for Hidden Input value from Option Bar (Card)
    const hiddenInput = document.getElementById(`selected-variant-${id}`);
    
    if (forcedVariantIndex !== null) {
        variantIndex = forcedVariantIndex;
    } else if (hiddenInput) {
        variantIndex = parseInt(hiddenInput.value);
    }

    if (product.variants && product.variants.length > 0) {
        variantData = product.variants[variantIndex];
    } else {
        variantIndex = -1; // No variants
    }

    if(variantData.stock <= 0) { 
        window.showToast("This item is currently out of stock", "error"); 
        return; 
    }

    const cartKey = variantIndex === -1 ? id : `${id}___${variantIndex}`;

    if(!window.cart[cartKey]) { 
        window.cart[cartKey] = { qty: 1, variantIndex: variantIndex, productId: id }; 
    } else {
        if(window.cart[cartKey].qty + 1 > variantData.stock) {
             window.showToast(`Only ${variantData.stock} items available`, "error");
             return;
        }
        window.cart[cartKey].qty += 1;
    }
    
    updateCartUI();
    window.showToast("Added to Cart");
};

window.changeQty = (cartKey, change) => {
    if(!window.cart[cartKey]) return;
    
    const item = window.cart[cartKey];
    const product = window.productsMap[item.productId];
    
    let stock = product.stock;
    if(item.variantIndex !== -1 && product.variants) {
        stock = product.variants[item.variantIndex].stock;
    }

    const newQty = item.qty + change;
    
    if (change > 0 && newQty > stock) { 
        window.showToast(`Only ${stock} items available`, "error"); 
        return; 
    }
    
    window.cart[cartKey].qty = newQty;
    
    if(window.cart[cartKey].qty <= 0) { 
        delete window.cart[cartKey]; 
    }
    updateCartUI();
};

const updateCartUI = () => {
    const totalQty = Object.values(window.cart).reduce((acc, item) => acc + item.qty, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) { badge.innerText = totalQty; if(totalQty > 0) badge.classList.remove('hidden'); else badge.classList.add('hidden'); }
    
    // NEW: Calculate Total Price for Footer
    let totalPrice = 0;
    Object.values(window.cart).forEach(item => {
        const product = window.productsMap[item.productId];
        if(product) {
            let price = product.priceNew || product.price;
            if(item.variantIndex !== -1 && product.variants) {
                price = product.variants[item.variantIndex].priceNew;
            }
            totalPrice += price * item.qty;
        }
    });

    // Handle Sticky Footer Visibility
    const stickyFooter = document.getElementById('sticky-cart-footer');
    if(stickyFooter) {
        if(totalQty > 0) {
            stickyFooter.classList.remove('hidden');
            requestAnimationFrame(() => {
                stickyFooter.classList.remove('translate-y-full');
            });
            const totalEl = document.getElementById('sticky-cart-total');
            const countEl = document.getElementById('sticky-cart-count');
            if(totalEl) totalEl.innerText = "₹" + totalPrice;
            if(countEl) countEl.innerText = totalQty + (totalQty === 1 ? " Item" : " Items");
        } else {
            stickyFooter.classList.add('translate-y-full');
            setTimeout(() => {
                stickyFooter.classList.add('hidden');
            }, 300);
        }
    }

    renderCartModalItems();
    window.updateCardButtons();
    window.updateDetailButton();
};

// --- CART MODAL ---

window.openCartModal = () => {
    window.toggleModal('cart-modal', true);
    renderCartModalItems();
    
    const user = auth.currentUser;
    const nameInput = document.getElementById('checkout-name');
    const phoneInput = document.getElementById('checkout-phone');
    const emailInput = document.getElementById('checkout-email');
    const addrInput = document.getElementById('checkout-address');
    const locInput = document.getElementById('checkout-location');
    const pincodeInput = document.getElementById('checkout-pincode');
    const stateInput = document.getElementById('checkout-state');

    if (user) {
        emailInput.value = user.email || '';
        emailInput.readOnly = false; 
        nameInput.value = user.displayName || '';
        if(window.currentUserData) {
            phoneInput.value = window.currentUserData.phone || '';
            addrInput.value = window.currentUserData.address || '';
            locInput.value = window.currentUserData.location || '';
            pincodeInput.value = window.currentUserData.pincode || '';
            stateInput.value = window.currentUserData.state || '';
        }
    }
};

const renderCartModalItems = () => {
    const container = document.getElementById('cart-items-container');
    const totalDisplay = document.getElementById('cart-total-price');
    if(Object.keys(window.cart).length === 0) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center py-10 opacity-50"><i class="fa-solid fa-basket-shopping text-4xl mb-2"></i><p>Your cart is empty</p></div>';
        totalDisplay.innerText = "₹0";
        return;
    }
    
    let total = 0; 
    let html = '';
    
    Object.entries(window.cart).forEach(([key, item]) => {
        const product = window.productsMap[item.productId];
        if(product) {
            let price = product.priceNew || product.price;
            let unit = product.unit || product.weight || '';
            
            if (item.variantIndex !== -1 && product.variants) {
                const v = product.variants[item.variantIndex];
                price = v.priceNew;
                unit = v.unit;
            }

            const lineTotal = price * item.qty;
            total += lineTotal;
            const unitText = unit ? ` / ${unit}` : '';
            
            let img = 'https://placehold.co/50';
            if(Array.isArray(product.images) && product.images[0]) img = product.images[0];
            else if(product.image) img = product.image;

            html += `
                <div class="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
                    <img src="${img}" class="w-12 h-12 object-cover rounded bg-white" loading="lazy">
                    <div class="flex-1">
                        <h5 class="font-bold text-sm text-gray-800 line-clamp-1">${product.nameEnglish || product.name}</h5>
                        <p class="text-xs text-gray-500">₹${price}${unitText} x ${item.qty}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="changeQty('${key}', -1)" class="w-6 h-6 rounded bg-white border text-primary font-bold shadow hover:bg-gray-100">-</button>
                        <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                        <button onclick="changeQty('${key}', 1)" class="w-6 h-6 rounded bg-white border text-primary font-bold shadow hover:bg-gray-100">+</button>
                    </div>
                </div>
            `;
        }
    });
    container.innerHTML = html;
    totalDisplay.innerText = "₹" + total;
};

window.handlePlaceOrder = async (e) => {
    e.preventDefault();
    if(Object.keys(window.cart).length === 0) { window.showToast("Cart is empty", "error"); return; }

    const phone = document.getElementById('checkout-phone').value;
    const pincode = document.getElementById('checkout-pincode').value;
    
    if(!/^\d{10}$/.test(phone)) { window.showToast("Phone number must be exactly 10 digits", "error"); return; }
    if(!/^\d{6}$/.test(pincode)) { window.showToast("Pincode must be exactly 6 digits", "error"); return; }

    const loader = document.getElementById('order-loader');
    const btn = document.getElementById('place-order-btn');
    loader.classList.remove('hidden'); btn.classList.add('hidden');

    try {
        const updates = {};
        const cartItems = Object.entries(window.cart);
        let stockError = false;
        let errorMsg = "";

        for (const [key, item] of cartItems) {
            const product = window.productsMap[item.productId];
            const productRef = ref(rtdb, `skaruppatti-products/${item.productId}`);
            const snapshot = await get(productRef);
            
            if (!snapshot.exists()) {
                stockError = true; errorMsg = `Product not found: ${item.productId}`; break;
            }

            const productData = snapshot.val();
            let currentStock = productData.stock || 0;
            let dbPath = `skaruppatti-products/${item.productId}/stock`;
            
            if (item.variantIndex !== -1 && productData.variants) {
                currentStock = productData.variants[item.variantIndex].stock;
                dbPath = `skaruppatti-products/${item.productId}/variants/${item.variantIndex}/stock`;
            }

            const productName = productData.nameEnglish || productData.name;

            if (item.qty > currentStock) {
                stockError = true;
                errorMsg = `Insufficient stock for ${productName}. Available: ${currentStock}`;
                break;
            }

            updates[dbPath] = currentStock - item.qty;
            
            if(item.variantIndex !== -1 && productData.stock) {
                 updates[`skaruppatti-products/${item.productId}/stock`] = (productData.stock || 0) - item.qty;
            }
        }

        if (stockError) {
            window.showToast(errorMsg, "error");
            loader.classList.add('hidden'); 
            btn.classList.remove('hidden');
            return; 
        }

        const name = document.getElementById('checkout-name').value;
        const email = document.getElementById('checkout-email').value;
        const manualAddr = document.getElementById('checkout-address').value;
        const state = document.getElementById('checkout-state').value;
        const gpsLoc = document.getElementById('checkout-location').value;
        const total = document.getElementById('cart-total-price').innerText;

        // CHANGED: Only include manual address and GPS in address field
        let finalAddress = manualAddr;
        if(gpsLoc) finalAddress += `\n[GPS: ${gpsLoc}]`;

        const items = cartItems.map(([key, item]) => {
            const prod = window.productsMap[item.productId];
            let price = prod.priceNew || prod.price;
            let unit = prod.unit || prod.weight || '';
            let nameStr = prod.nameEnglish || prod.name;
            
            if(item.variantIndex !== -1 && prod.variants) {
                const v = prod.variants[item.variantIndex];
                price = v.priceNew;
                unit = v.unit;
            }

            return { 
                id: item.productId, 
                name: nameStr, 
                price: price, 
                unit: unit, 
                qty: item.qty, 
                subtotal: price * item.qty 
            };
        });

        const orderData = {
            customerName: name,
            customerPhone: phone,
            email: email, 
            address: finalAddress, // Modified to exclude pincode/state text
            pincode: pincode,      // NEW: Stored separately
            state: state,          // NEW: Stored separately
            items: items,
            totalAmount: total,
            orderDate: Date.now(),
            status: 'Pending'
        };

        const newOrderRef = push(ref(rtdb, 'skaruppatti-orders'));
        await set(newOrderRef, orderData);
        await update(ref(rtdb), updates);

        window.showToast(`Order Placed Successfully! Total: ${total}`);
        await checkOrderHistory(email);
        window.cart = {}; updateCartUI(); window.toggleModal('cart-modal', false);

    } catch (error) {
        console.error("Order Error: ", error); window.showToast("Failed to place order.", "error");
    } finally {
        loader.classList.add('hidden'); btn.classList.remove('hidden');
    }
};

// --- LOCATION HANDLERS ---
window.getCheckoutLocation = () => {
    if (!navigator.geolocation) { window.showToast("Geolocation not supported.", "error"); return; }
    const btn = document.querySelector('button[onclick="getCheckoutLocation()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    navigator.geolocation.getCurrentPosition((pos) => {
        document.getElementById('checkout-location').value = `${pos.coords.latitude}, ${pos.coords.longitude}`;
        window.showToast("Location fetched!");
        btn.innerHTML = originalText;
    }, () => { window.showToast("Location access denied", "error"); btn.innerHTML = originalText; });
};

window.getProfileLocation = () => {
    if (!navigator.geolocation) { window.showToast("Geolocation not supported.", "error"); return; }
    const btn = document.querySelector('button[onclick="getProfileLocation()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    navigator.geolocation.getCurrentPosition((pos) => {
        document.getElementById('edit-profile-location').value = `${pos.coords.latitude}, ${pos.coords.longitude}`;
        window.showToast("Location fetched!");
        btn.innerHTML = originalText;
    }, () => { window.showToast("Location access denied", "error"); btn.innerHTML = originalText; });
};

// --- PROFILE LOGIC ---
window.openProfileModal = () => {
    if(!auth.currentUser) { window.showToast("Please login", "error"); return; }
    
    document.getElementById('profile-display-name').innerText = window.currentUserData?.name || auth.currentUser.displayName || 'User';
    document.getElementById('profile-display-email').innerText = auth.currentUser.email;
    document.getElementById('profile-display-phone').innerText = window.currentUserData?.phone || 'Not Set';
    document.getElementById('profile-display-address').innerText = window.currentUserData?.address || 'Not Set';
    document.getElementById('profile-display-location').innerText = window.currentUserData?.location || 'Not Set';
    document.getElementById('profile-display-pincode').innerText = window.currentUserData?.pincode || 'Not Set';
    document.getElementById('profile-display-state').innerText = window.currentUserData?.state || 'Not Set';

    document.getElementById('edit-profile-name').value = window.currentUserData?.name || auth.currentUser.displayName || '';
    document.getElementById('edit-profile-phone').value = window.currentUserData?.phone || '';
    document.getElementById('edit-profile-address').value = window.currentUserData?.address || '';
    document.getElementById('edit-profile-location').value = window.currentUserData?.location || '';
    document.getElementById('edit-profile-pincode').value = window.currentUserData?.pincode || '';
    document.getElementById('edit-profile-state').value = window.currentUserData?.state || '';

    const imgEl = document.getElementById('profile-modal-img');
    const iconEl = document.getElementById('profile-modal-icon');
    if(auth.currentUser.photoURL) { imgEl.src = auth.currentUser.photoURL; imgEl.classList.remove('hidden'); iconEl.style.display = 'none'; } 
    else { imgEl.style.display = 'none'; iconEl.style.display = 'block'; }

    window.toggleProfileEdit(false);
    window.toggleModal('profile-modal', true);
}

window.toggleProfileEdit = (isEdit) => {
    const viewMode = document.getElementById('profile-view-mode');
    const editMode = document.getElementById('profile-edit-mode');
    if(isEdit) {
        viewMode.classList.add('hidden');
        editMode.classList.remove('hidden');
    } else {
        viewMode.classList.remove('hidden');
        editMode.classList.add('hidden');
    }
}

window.saveUserProfile = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if(!user) return;

    const name = document.getElementById('edit-profile-name').value;
    const phone = document.getElementById('edit-profile-phone').value;
    const address = document.getElementById('edit-profile-address').value;
    const location = document.getElementById('edit-profile-location').value;
    const pincode = document.getElementById('edit-profile-pincode').value;
    const state = document.getElementById('edit-profile-state').value;

    if(!/^\d{10}$/.test(phone)) { window.showToast("Phone number must be exactly 10 digits", "error"); return; }

    try {
        await updateProfile(user, { displayName: name });
        const userData = { name, phone, address, location, pincode, state, email: user.email };
        await update(ref(rtdb, 'skaruppatti-users/' + user.uid), userData);
        window.currentUserData = userData;
        window.showToast("Profile Updated Successfully!");
        window.openProfileModal();
    } catch (error) {
        console.error(error);
        window.showToast("Failed to update profile", "error");
    }
};

window.checkOrderHistory = async (email) => {
    if(!email) return;
    const navEls = [document.getElementById('nav-profile-link'), document.getElementById('nav-orders-link'), document.getElementById('drawer-profile-link'), document.getElementById('drawer-orders-link')];
    const containers = [document.getElementById('drawer-user-links')];
    
    try {
        const userSnapshot = await get(ref(rtdb, 'skaruppatti-users/' + auth.currentUser.uid));
        if(userSnapshot.exists()) {
            window.currentUserData = userSnapshot.val();
            navEls.forEach(el => { el.classList.remove('hidden'); el.classList.add(el.id.includes('drawer') ? 'flex' : 'block'); });
            containers.forEach(el => el.classList.remove('hidden'));
            document.getElementById('nav-divider').classList.remove('hidden');
            return;
        }

        const ordersRef = ref(rtdb, 'skaruppatti-orders');
        const snapshot = await get(ordersRef);
        let hasOrders = false;
        if(snapshot.exists()) {
            const myOrders = Object.values(snapshot.val()).filter(order => order.email === email);
            if(myOrders.length > 0) {
                hasOrders = true;
                const latest = myOrders.sort((a,b) => b.orderDate - a.orderDate)[0];
                let addr = latest.address;
                let loc = "";
                if(addr.includes('[GPS:')) {
                    const parts = addr.split('[GPS:');
                    addr = parts[0].trim();
                    loc = parts[1].replace(']', '').trim();
                }
                
                // CHANGED: Now reads pincode and state from separate fields for auto-fill
                window.currentUserData = { 
                    name: latest.customerName, 
                    phone: latest.customerPhone, 
                    address: addr, 
                    location: loc, 
                    email: latest.email,
                    pincode: latest.pincode || '', // New
                    state: latest.state || ''      // New
                };
                await update(ref(rtdb, 'skaruppatti-users/' + auth.currentUser.uid), window.currentUserData);
            }
        }

        if(hasOrders) {
            navEls.forEach(el => { el.classList.remove('hidden'); el.classList.add(el.id.includes('drawer') ? 'flex' : 'block'); });
            containers.forEach(el => el.classList.remove('hidden'));
            document.getElementById('nav-divider').classList.remove('hidden');
        } else {
            navEls.forEach(el => el.classList.add('hidden'));
            containers.forEach(el => el.classList.add('hidden'));
            document.getElementById('nav-divider').classList.add('hidden');
        }
    } catch (e) { console.error(e); }
};

// --- AUTH & INIT ---
onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('login-btn-header');
    const profileArea = document.getElementById('user-profile-header');
    
    if (user) {
        loginBtn.classList.add('hidden'); 
        profileArea.classList.remove('hidden'); 
        profileArea.classList.add('flex');
        
        document.getElementById('user-name-display').innerText = user.displayName || 'User';
        
        const avatarImg = document.getElementById('user-avatar');
        const defaultIcon = document.getElementById('user-icon-default');

        if(user.photoURL) { 
            avatarImg.src = user.photoURL; 
            avatarImg.classList.remove('hidden'); 
            avatarImg.style.display = 'block'; 
            defaultIcon.classList.add('hidden'); 
        } else {
            avatarImg.classList.add('hidden');
            defaultIcon.classList.remove('hidden');
        }

        await checkOrderHistory(user.email);
        window.toggleModal('login-modal', false);
    } else {
        loginBtn.classList.remove('hidden');
        profileArea.classList.add('hidden');
        profileArea.classList.remove('flex');
        document.getElementById('nav-profile-link').classList.add('hidden');
        document.getElementById('nav-orders-link').classList.add('hidden');
        document.getElementById('drawer-user-links').classList.add('hidden');
        window.currentUserData = null;
    }
});

window.handleGoogleSignIn = async () => {
    const loader = document.getElementById('login-process-loader');
    loader.classList.remove('hidden'); 
    try { await signInWithPopup(auth, new GoogleAuthProvider()); window.showToast("Signed In!"); } 
    catch (error) { window.showToast("Sign In Failed", "error"); } 
    finally { loader.classList.add('hidden'); }
};

window.logoutUser = async () => {
    try { await signOut(auth); window.cart = {}; updateCartUI(); window.showToast("Logged Out"); window.toggleModal('profile-modal', false); } catch (e) { console.error(e); }
};

window.openOrdersModal = async () => {
    if(!auth.currentUser) return;
    window.toggleModal('orders-modal', true);
    const container = document.getElementById('orders-list-container');
    container.innerHTML = '<div class="flex justify-center py-8"><div class="spinner border-primary"></div></div>';
    try {
        const snapshot = await get(ref(rtdb, 'skaruppatti-orders'));
        if(!snapshot.exists()) { container.innerHTML = '<p class="text-center text-gray-500">No orders found.</p>'; return; }

        const myOrders = Object.entries(snapshot.val())
            .map(([key, val]) => ({ id: key, ...val }))
            .filter(order => order.email === auth.currentUser.email)
            .sort((a, b) => b.orderDate - a.orderDate);

        if(myOrders.length === 0) { container.innerHTML = '<p class="text-center text-gray-500">No orders found.</p>'; return; }

        let html = '';
        myOrders.forEach((data) => {
            const date = new Date(data.orderDate).toLocaleDateString() + ' ' + new Date(data.orderDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const shortId = data.id ? '#' + data.id.slice(-6) : 'Order';
            const statusSteps = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];
            
            // STATUS TRACKER LOGIC
            const currentStatus = data.status || 'Pending';
            const isCancelled = currentStatus === 'Cancelled';
            const currentIndex = statusSteps.indexOf(currentStatus);

            const progressHTML = `
                <div class="relative flex items-center justify-between w-full mt-3">
                    <div class="absolute left-0 top-1.5 w-full h-0.5 bg-gray-200 -z-10"></div>
                    ${statusSteps.map((step, idx) => {
                        let color = "bg-gray-200 border-gray-200 text-gray-400";
                        if (isCancelled) {
                            if (step === 'Cancelled') {
                                color = "bg-red-500 border-red-500 text-red-600 scale-110";
                            }
                        } else {
                            if (step === 'Cancelled') {
                                // Gray
                            } else if (idx <= currentIndex) {
                                color = "bg-secondary border-secondary text-primary scale-110";
                            }
                        }
                        
                        return `
                            <div class="flex flex-col items-center bg-white px-1">
                                <div class="w-3 h-3 rounded-full border-2 ${color} mb-1 transition-all"></div>
                                <span class="text-[8px] font-bold uppercase ${isCancelled && step === 'Cancelled' ? 'text-red-500' : (idx <= currentIndex && !isCancelled && step !== 'Cancelled' ? 'text-primary' : 'text-gray-400')}">${step}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            let itemsHtml = data.items.map(i => {
                const unitLabel = i.unit ? `<span class="text-[10px] text-gray-400">(${i.unit})</span>` : '';
                return `<div class="flex justify-between text-xs text-gray-600">
                            <span>${i.name} ${unitLabel} x ${i.qty}</span>
                            <span>₹${i.subtotal}</span>
                        </div>`;
            }).join('');

            html += `
                <div class="bg-gray-50 rounded-lg p-4 border hover:shadow-md transition">
                    <div class="flex justify-between items-center mb-2 border-b border-gray-200 pb-2">
                        <div>
                            <span class="block text-xs font-bold text-primary">${shortId}</span>
                            <span class="text-[10px] text-gray-400">${date}</span>
                        </div>
                        <span class="text-sm font-bold text-primary">${data.totalAmount}</span>
                    </div>
                    <div class="space-y-1 mb-3 pt-1">
                        ${itemsHtml}
                    </div>
                    <div class="text-xs border-t border-gray-200 pt-2">
                        ${progressHTML}
                    </div>
                </div>`;
        });
        container.innerHTML = html;
    } catch (e) { console.error(e); container.innerHTML = '<p class="text-center text-red-500">Failed to load.</p>'; }
}

window.addEventListener('load', () => {
    fetchProducts();
    // Performance: Use requestAnimationFrame to hide loader after layout is confirmed
    requestAnimationFrame(() => {
        setTimeout(() => { document.getElementById('loader-overlay').style.display = 'none'; }, 1000);
    });
});