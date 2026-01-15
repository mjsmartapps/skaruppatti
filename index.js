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

window.showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check text-green-600"></i>' : '<i class="fa-solid fa-circle-exclamation text-red-600"></i>';
    toast.innerHTML = `${icon} <span class="font-medium text-sm text-gray-700">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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
    }
};

window.toggleUserMenu = () => {
    const menu = document.getElementById('user-menu-dropdown');
    menu.classList.toggle('hidden');
}

// --- NEW: PINCODE LOGIC (Updated to support target field) ---
window.handlePincodeInput = async (el, targetId) => {
    // Force number only
    el.value = el.value.replace(/[^0-9]/g, '').slice(0, 6);
    
    // Use targetId if provided, else fallback to checkout-state (backward compatibility)
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

const renderProductCard = (product) => {
    const subtitle = product.category || product.description || 'Premium Quality';
    const cartItem = window.cart[product.id];
    const qty = cartItem ? cartItem.qty : 0;
    
    const unit = product.unit || product.weight || ''; 
    const unitDisplay = unit ? `<span class="text-xs text-gray-500 font-normal ml-1">/ ${unit}</span>` : '';

    let buttonHtml = '';
    if (qty === 0) {
        buttonHtml = `<button onclick="addToCart('${product.id}')" class="bg-primary text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-900 transition shadow-md w-full z-20 relative">Add to Cart</button>`;
    } else {
        buttonHtml = `<div class="flex items-center justify-between bg-secondary rounded-full w-full px-1 py-0.5 shadow-md z-20 relative"><button onclick="changeQty('${product.id}', -1)" class="w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center text-xs font-bold hover:bg-gray-100">-</button><span class="text-white font-bold text-xs mx-2">${qty}</span><button onclick="changeQty('${product.id}', 1)" class="w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center text-xs font-bold hover:bg-gray-100">+</button></div>`;
    }
    
    // Handle images array or single image string
    const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image || 'https://placehold.co/400x300?text=No+Image'];
    
    // Generate Horizontal Scrollable Images
    const imagesHtml = images.map(img => `
        <img src="${img}" class="w-full h-full object-cover flex-shrink-0 snap-center" draggable="false">
    `).join('');

    return `
        <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition flex flex-col h-full border border-gray-100 group relative">
            
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
                    <p class="text-xs text-gray-500 mb-2 truncate">${subtitle}</p>
                </div>

                <div class="mt-auto flex justify-between items-center gap-2">
                    <div>
                        ${product.priceOld ? `<span class="line-through text-gray-400 text-[10px] mr-1">₹${product.priceOld}</span>` : ''}
                        <span class="text-primary font-bold text-sm">₹${product.priceNew || product.price}${unitDisplay}</span>
                    </div>
                    <div class="flex-1 max-w-[100px]">
                        ${product.stock > 0 ? buttonHtml : '<span class="text-xs text-red-500 font-bold">Out of Stock</span>'}
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
    if(products.length > 0) {
        grid.innerHTML = products.map(renderProductCard).join('');
    } else {
        grid.innerHTML = '<p class="col-span-full text-center text-gray-500">No products found.</p>';
    }
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

    const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image || 'https://placehold.co/400x300?text=No+Image'];

    document.getElementById('detail-name-eng').innerText = product.nameEnglish || product.name;
    document.getElementById('detail-name-tam').innerText = product.nameTamil || '';
    document.getElementById('detail-category').innerText = product.category || 'Product';
    document.getElementById('detail-price-new').innerText = '₹' + (product.priceNew || product.price);
    document.getElementById('detail-unit').innerText = '/ ' + (product.unit || product.weight || 'unit');
    document.getElementById('detail-desc').innerText = product.description || 'No description available.';
    
    if(product.priceOld) {
        document.getElementById('detail-price-old').innerText = '₹' + product.priceOld;
        document.getElementById('detail-price-old').classList.remove('hidden');
    } else {
        document.getElementById('detail-price-old').classList.add('hidden');
    }

    const stockEl = document.getElementById('detail-stock');
    const addBtn = document.getElementById('detail-add-btn');
    const buyBtn = document.getElementById('detail-buy-btn');
    
    if(product.stock > 0) {
        stockEl.innerText = `In Stock (${product.stock} available)`;
        stockEl.className = "text-sm font-bold text-green-600 ml-2";
        addBtn.disabled = false;
        buyBtn.disabled = false;
        addBtn.onclick = () => { window.addToCart(id); window.showToast('Added to Cart'); };
        buyBtn.onclick = () => { window.buyNow(id); };
    } else {
        stockEl.innerText = "Out of Stock";
        stockEl.className = "text-sm font-bold text-red-600 ml-2";
        addBtn.disabled = true;
        buyBtn.disabled = true;
    }

    const mainImg = document.getElementById('detail-main-img');
    mainImg.src = images[0];

    const thumbContainer = document.getElementById('detail-thumbnails');
    thumbContainer.innerHTML = images.map((img, index) => `
        <img src="${img}" onclick="document.getElementById('detail-main-img').src='${img}'" 
        class="h-full w-auto object-cover border rounded cursor-pointer hover:border-secondary transition ${index === 0 ? 'border-secondary' : 'border-transparent'}">
    `).join('');

    window.toggleModal('product-detail-modal', true);
};

window.buyNow = (id) => {
    const product = window.productsMap[id];
    if(product.stock <= 0) return;
    
    if(!window.cart[id]) {
        window.cart[id] = { qty: 1 };
    }
    updateCartUI();
    window.toggleModal('product-detail-modal', false);
    window.openCartModal();
};

window.addToCart = (id) => {
    const product = window.productsMap[id];
    if(!product || product.stock <= 0) { window.showToast("This item is currently out of stock", "error"); return; }
    if(!window.cart[id]) { window.cart[id] = { qty: 1 }; }
    updateCartUI();
};

window.changeQty = (id, change) => {
    const product = window.productsMap[id];
    if(!window.cart[id] || !product) return;
    const currentQty = window.cart[id].qty;
    const newQty = currentQty + change;
    if (change > 0 && newQty > product.stock) { window.showToast(`Only ${product.stock} items available in stock`, "error"); return; }
    window.cart[id].qty = newQty;
    if(window.cart[id].qty <= 0) { delete window.cart[id]; }
    updateCartUI();
};

const updateCartUI = () => {
    const totalQty = Object.values(window.cart).reduce((acc, item) => acc + item.qty, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) { badge.innerText = totalQty; if(totalQty > 0) badge.classList.remove('hidden'); else badge.classList.add('hidden'); }
    updateGrid();
    renderCartModalItems();
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
    } else {
        nameInput.value = ''; phoneInput.value = ''; emailInput.value = ''; addrInput.value = ''; locInput.value = ''; pincodeInput.value = ''; stateInput.value = '';
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
    let total = 0; let html = '';
    Object.entries(window.cart).forEach(([id, item]) => {
        const product = window.productsMap[id];
        if(product) {
            const price = product.priceNew || product.price;
            const lineTotal = price * item.qty;
            total += lineTotal;
            
            const unit = product.unit || product.weight || '';
            const unitText = unit ? ` / ${unit}` : '';
            
            let img = 'https://placehold.co/50';
            if(Array.isArray(product.images) && product.images[0]) img = product.images[0];
            else if(product.image) img = product.image;

            html += `
                <div class="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
                    <img src="${img}" class="w-12 h-12 object-cover rounded bg-white">
                    <div class="flex-1">
                        <h5 class="font-bold text-sm text-gray-800 line-clamp-1">${product.nameEnglish || product.name}</h5>
                        <p class="text-xs text-gray-500">₹${price}${unitText} x ${item.qty}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="changeQty('${id}', -1)" class="w-6 h-6 rounded bg-white border text-primary font-bold shadow hover:bg-gray-100">-</button>
                        <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                        <button onclick="changeQty('${id}', 1)" class="w-6 h-6 rounded bg-white border text-primary font-bold shadow hover:bg-gray-100">+</button>
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
    
    if(!/^\d{10}$/.test(phone)) {
            window.showToast("Phone number must be exactly 10 digits", "error");
            return;
    }
    
    if(!/^\d{6}$/.test(pincode)) {
            window.showToast("Pincode must be exactly 6 digits", "error");
            return;
    }

    const loader = document.getElementById('order-loader');
    const btn = document.getElementById('place-order-btn');
    loader.classList.remove('hidden'); btn.classList.add('hidden');

    try {
        const updates = {};
        const cartItems = Object.entries(window.cart);
        let stockError = false;
        let errorMsg = "";

        // Check stock
        for (const [id, item] of cartItems) {
            const productRef = ref(rtdb, `skaruppatti-products/${id}`);
            const snapshot = await get(productRef);
            
            if (!snapshot.exists()) {
                stockError = true;
                errorMsg = `Product not found: ${id}`;
                break;
            }

            const productData = snapshot.val();
            const currentStock = productData.stock || 0;
            const productName = productData.nameEnglish || productData.name;

            if (item.qty > currentStock) {
                stockError = true;
                errorMsg = `Insufficient stock for ${productName}. Available: ${currentStock}`;
                break;
            }

            updates[`skaruppatti-products/${id}/stock`] = currentStock - item.qty;
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

        // Combine details into address
        let fullAddress = `${manualAddr}, Pincode: ${pincode}, State: ${state}`;
        if(gpsLoc) fullAddress += `\n[GPS: ${gpsLoc}]`;

        const items = cartItems.map(([id, item]) => {
            const prod = window.productsMap[id];
            return { 
                id: id, 
                name: prod.nameEnglish || prod.name, 
                price: prod.priceNew || prod.price, 
                unit: prod.unit || prod.weight || '', 
                qty: item.qty, 
                subtotal: (prod.priceNew || prod.price) * item.qty 
            };
        });

        const orderData = {
            customerName: name,
            customerPhone: phone,
            email: email, 
            address: fullAddress,
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
    
    // Populate View Mode
    document.getElementById('profile-display-name').innerText = window.currentUserData?.name || auth.currentUser.displayName || 'User';
    document.getElementById('profile-display-email').innerText = auth.currentUser.email;
    document.getElementById('profile-display-phone').innerText = window.currentUserData?.phone || 'Not Set';
    document.getElementById('profile-display-address').innerText = window.currentUserData?.address || 'Not Set';
    document.getElementById('profile-display-location').innerText = window.currentUserData?.location || 'Not Set';
    document.getElementById('profile-display-pincode').innerText = window.currentUserData?.pincode || 'Not Set';
    document.getElementById('profile-display-state').innerText = window.currentUserData?.state || 'Not Set';

    // Populate Edit Mode Inputs
    document.getElementById('edit-profile-name').value = window.currentUserData?.name || auth.currentUser.displayName || '';
    document.getElementById('edit-profile-phone').value = window.currentUserData?.phone || '';
    document.getElementById('edit-profile-address').value = window.currentUserData?.address || '';
    document.getElementById('edit-profile-location').value = window.currentUserData?.location || '';
    document.getElementById('edit-profile-pincode').value = window.currentUserData?.pincode || '';
    document.getElementById('edit-profile-state').value = window.currentUserData?.state || '';

    // Handle Avatar
    const imgEl = document.getElementById('profile-modal-img');
    const iconEl = document.getElementById('profile-modal-icon');
    if(auth.currentUser.photoURL) { imgEl.src = auth.currentUser.photoURL; imgEl.classList.remove('hidden'); iconEl.style.display = 'none'; } 
    else { imgEl.style.display = 'none'; iconEl.style.display = 'block'; }

    // Ensure View Mode is active initially
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

        if(!/^\d{10}$/.test(phone)) {
            window.showToast("Phone number must be exactly 10 digits", "error");
            return;
    }

    try {
        // Update Display Name in Auth
        await updateProfile(user, { displayName: name });
        
        // Update Database (UPDATED PATH)
        const userData = {
            name, phone, address, location, pincode, state, email: user.email
        };
        
        await update(ref(rtdb, 'skaruppatti-users/' + user.uid), userData);
        
        // Update Local Data
        window.currentUserData = userData;
        
        window.showToast("Profile Updated Successfully!");
        window.openProfileModal(); // Refresh view
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
        // Check User Profile First (UPDATED PATH)
        const userSnapshot = await get(ref(rtdb, 'skaruppatti-users/' + auth.currentUser.uid));
        if(userSnapshot.exists()) {
            window.currentUserData = userSnapshot.val();
            navEls.forEach(el => { el.classList.remove('hidden'); el.classList.add(el.id.includes('drawer') ? 'flex' : 'block'); });
            containers.forEach(el => el.classList.remove('hidden'));
            document.getElementById('nav-divider').classList.remove('hidden');
            return;
        }

        // Fallback to Orders if no profile exists (UPDATED PATH)
        const ordersRef = ref(rtdb, 'skaruppatti-orders');
        const snapshot = await get(ordersRef);
        let hasOrders = false;
        if(snapshot.exists()) {
            const myOrders = Object.values(snapshot.val()).filter(order => order.email === email);
            if(myOrders.length > 0) {
                hasOrders = true;
                const latest = myOrders.sort((a,b) => b.orderDate - a.orderDate)[0];
                // Extract GPS if exists in address string
                let addr = latest.address;
                let loc = "";
                if(addr.includes('[GPS:')) {
                    const parts = addr.split('[GPS:');
                    addr = parts[0].trim();
                    loc = parts[1].replace(']', '').trim();
                }
                
                window.currentUserData = { name: latest.customerName, phone: latest.customerPhone, address: addr, location: loc, email: latest.email };
                
                // Save this inferred data to users node so edit works later (UPDATED PATH)
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
        // Reset UI
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

// --- ORDER HISTORY UPDATE ---
window.openOrdersModal = async () => {
    if(!auth.currentUser) return;
    window.toggleModal('orders-modal', true);
    const container = document.getElementById('orders-list-container');
    container.innerHTML = '<div class="flex justify-center py-8"><div class="spinner border-primary"></div></div>';
    try {
        // UPDATED PATH: skaruppatti-orders
        const snapshot = await get(ref(rtdb, 'skaruppatti-orders'));
        if(!snapshot.exists()) { container.innerHTML = '<p class="text-center text-gray-500">No orders found.</p>'; return; }

        // Using Object.entries to preserve the Order ID (Key)
        const myOrders = Object.entries(snapshot.val())
            .map(([key, val]) => ({ id: key, ...val }))
            .filter(order => order.email === auth.currentUser.email)
            .sort((a, b) => b.orderDate - a.orderDate);

        if(myOrders.length === 0) { container.innerHTML = '<p class="text-center text-gray-500">No orders found.</p>'; return; }

        let html = '';
        myOrders.forEach((data) => {
            const date = new Date(data.orderDate).toLocaleDateString() + ' ' + new Date(data.orderDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const shortId = data.id ? '#' + data.id.slice(-6) : 'Order';

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
                    <div class="text-xs text-right border-t border-gray-200 pt-2">
                        <span class="text-gray-500 mr-2">Status:</span>
                        <span class="px-2 py-1 rounded bg-secondary text-white font-bold text-[10px] uppercase tracking-wide">${data.status || 'Received'}</span>
                    </div>
                </div>`;
        });
        container.innerHTML = html;
    } catch (e) { console.error(e); container.innerHTML = '<p class="text-center text-red-500">Failed to load.</p>'; }
}

window.addEventListener('load', () => {
    fetchProducts();
    setTimeout(() => { document.getElementById('loader-overlay').style.display = 'none'; }, 1000);
});