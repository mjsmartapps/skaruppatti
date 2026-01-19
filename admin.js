import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, set, push, update, remove, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

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
const db = getDatabase(app);
const storage = getStorage(app);

// --- AUTH & INIT LOGIC ---
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

window.handleEmailLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('email-login-btn');
    const originalText = btn.innerText;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
    btn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error(error);
        window.showToast("Login Failed: " + error.message, "error");
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    const authOverlay = document.getElementById('auth-overlay');
    if (user) {
        try {
            const userRef = ref(db, `skaruppatti-users/${user.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists() && snapshot.val().role === 'admin') {
                authOverlay.classList.add('hidden');
                document.getElementById('admin-name').innerText = user.displayName || user.email.split('@')[0];
                initDashboard();
            } else {
                await signOut(auth);
                window.showToast("Access Denied: Not an admin.", "error");
                authOverlay.classList.remove('hidden');
            }
        } catch (error) {
            await signOut(auth);
            authOverlay.classList.remove('hidden');
        }
    } else {
        authOverlay.classList.remove('hidden');
        const btn = document.getElementById('email-login-btn');
        if(btn) { btn.innerText = 'Login as Admin'; btn.disabled = false; }
    }
});

window.switchTab = (tabId) => {
    ['dashboard', 'products', 'orders'].forEach(t => {
        const btn = document.getElementById(`nav-${t}`);
        if(t === tabId) btn.className = "w-full flex items-center gap-3 px-6 py-3 text-primary bg-accent border-r-4 border-primary transition font-medium";
        else btn.className = "w-full flex items-center gap-3 px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-primary transition font-medium";
        const view = document.getElementById(`view-${t}`);
        if(t === tabId) view.classList.remove('hidden'); else view.classList.add('hidden');
    });
    // Auto-close mobile menu on selection
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu.classList.contains('mobile-open')) {
        window.toggleMobileMenu();
    }
};

window.toggleMobileMenu = () => { 
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-overlay');
    menu.classList.toggle('mobile-open'); 
    overlay.classList.toggle('hidden');
};

// --- DATA HANDLING ---
let allOrders = [];
let allProducts = {};

function initDashboard() {
    onValue(ref(db, 'skaruppatti-products'), (snapshot) => {
        allProducts = snapshot.val() || {};
        renderProducts();
        updateStats();
    });
    onValue(ref(db, 'skaruppatti-orders'), (snapshot) => {
        const data = snapshot.val();
        if(data) {
            // Sort by orderDate descending (recent first)
            allOrders = Object.entries(data).map(([key, val]) => ({...val, id: key})).sort((a,b) => b.orderDate - a.orderDate);
            renderOrders();
            updateStats();
        } else {
            allOrders = []; // Clear orders if none exist
            renderOrders();
            updateStats();
        }
    });
    generateImageInputs();
}

function updateStats() {
    let revenue = 0; let pending = 0;
    allOrders.forEach(o => {
        const amt = parseFloat(o.totalAmount.toString().replace(/[^0-9.]/g, '')) || 0;
        if(o.status !== 'Cancelled') revenue += amt;
        if(o.status === 'Pending' || !o.status) pending++;
    });
    document.getElementById('stat-revenue').innerText = "₹" + revenue.toLocaleString();
    document.getElementById('stat-orders').innerText = allOrders.length;
    document.getElementById('stat-products').innerText = Object.keys(allProducts).length;
    document.getElementById('stat-pending').innerText = pending;
}

// --- PRODUCT LOGIC ---

function renderProducts() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    
    Object.entries(allProducts).forEach(([id, prod]) => {
        // Calculate total stock from variants if available, else use root stock
        let totalStock = prod.stock || 0;
        if (Array.isArray(prod.variants)) {
            totalStock = prod.variants.reduce((acc, v) => acc + Number(v.stock || 0), 0);
        }

        const stockColor = totalStock > 10 ? 'bg-green-100 text-green-700' : (totalStock > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700');
        
        const nameEng = prod.nameEnglish || prod.name || 'Unknown';
        const nameTam = prod.nameTamil || '';
        const priceNew = prod.priceNew || prod.price || 0;
        const priceOld = prod.priceOld ? `<span class="line-through text-gray-400 text-xs mr-1">₹${prod.priceOld}</span>` : '';
        
        let mainImage = 'https://placehold.co/400x300?text=No+Image';
        if(Array.isArray(prod.images) && prod.images.length > 0) mainImage = prod.images[0];
        else if(prod.image) mainImage = prod.image;

        grid.innerHTML += `
            <div class="bg-white rounded-xl shadow border border-gray-100 overflow-hidden flex flex-col group hover:shadow-lg transition">
                <div class="h-48 relative overflow-hidden bg-gray-100">
                    <img src="${mainImage}" onerror="this.src='https://placehold.co/400x300?text=No+Image'" class="w-full h-full object-cover transition duration-500 group-hover:scale-110">
                    <div class="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${stockColor}">Stock: ${totalStock}</div>
                </div>
                <div class="p-4 flex flex-col flex-1">
                    <h3 class="font-bold text-gray-800 line-clamp-1">${nameEng}</h3>
                    <p class="text-xs text-primary tamil-font mb-1">${nameTam}</p>
                    <p class="text-xs text-gray-500 mb-2">${prod.category} • ${prod.unit}</p>
                    
                    <div class="mt-auto flex justify-between items-end">
                        <div>
                            ${priceOld}
                            <span class="font-bold text-secondary text-lg">₹${priceNew}</span>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="editProduct('${id}')" class="w-8 h-8 rounded bg-gray-100 hover:bg-secondary hover:text-white transition flex items-center justify-center text-gray-600"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="deleteProduct('${id}')" class="w-8 h-8 rounded bg-red-50 hover:bg-red-500 hover:text-white transition flex items-center justify-center text-red-500"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

// --- NEW: DYNAMIC VARIANTS LOGIC ---

window.addVariantRow = (data = null) => {
    const container = document.getElementById('variants-container');
    const div = document.createElement('div');
    div.className = "variant-row grid grid-cols-4 gap-2 bg-white p-2 rounded border border-gray-200 relative";
    
    div.innerHTML = `
        <button type="button" onclick="this.parentElement.remove()" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600 transition shadow">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase">Unit</label>
            <input type="text" class="var-unit w-full p-1 border rounded text-xs focus:outline-none focus:border-secondary" placeholder="e.g. 1kg" value="${data ? data.unit : ''}" required>
        </div>
        <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase">MRP</label>
            <input type="number" class="var-old w-full p-1 border rounded text-xs focus:outline-none focus:border-secondary" placeholder="MRP" value="${data ? (data.priceOld || '') : ''}">
        </div>
        <div>
            <label class="block text-[10px] font-bold text-secondary uppercase">Selling</label>
            <input type="number" class="var-new w-full p-1 border border-secondary rounded text-xs font-bold focus:outline-none" placeholder="Price" value="${data ? data.priceNew : ''}" required>
        </div>
        <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase">Stock</label>
            <input type="number" class="var-stock w-full p-1 border rounded text-xs focus:outline-none focus:border-secondary" placeholder="Qty" value="${data ? (data.stock || 0) : ''}" required>
        </div>
    `;
    container.appendChild(div);
};

function generateImageInputs() {
    const container = document.getElementById('image-inputs-container');
    let html = '';
    for(let i=0; i<5; i++) {
        html += `
            <div class="flex items-center gap-2 image-slot p-1 border rounded bg-white">
                <span class="text-gray-400 text-xs font-bold w-4 text-center">${i+1}</span>
                <input type="file" id="img-file-${i}" accept="image/*" class="text-xs w-1/3 text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-white hover:file:bg-amber-600">
                <span class="text-xs text-gray-400">OR</span>
                <input type="text" id="img-url-${i}" class="flex-1 text-xs border-b border-gray-300 focus:border-secondary outline-none px-1 py-1" placeholder="Paste Image URL">
            </div>
        `;
    }
    container.innerHTML = html;
}

window.openProductModal = (isEdit = false) => {
    const modal = document.getElementById('product-modal');
    modal.classList.remove('hidden');
    if(!isEdit) {
        document.getElementById('modal-title').innerText = "Add New Product";
        document.getElementById('prod-id').value = "";
        document.querySelector('form').reset();
        document.getElementById('variants-container').innerHTML = '';
        addVariantRow(); // Add one default row
        
        for(let i=0; i<5; i++) {
            document.getElementById(`img-file-${i}`).value = "";
            document.getElementById(`img-url-${i}`).value = "";
        }
    }
};

window.closeProductModal = () => document.getElementById('product-modal').classList.add('hidden');

window.editProduct = (id) => {
    const prod = allProducts[id];
    if(!prod) return;
    
    document.getElementById('modal-title').innerText = "Edit Product";
    document.getElementById('prod-id').value = id;
    
    document.getElementById('prod-name-english').value = prod.nameEnglish || prod.name || '';
    document.getElementById('prod-name-tamil').value = prod.nameTamil || '';
    document.getElementById('prod-category').value = prod.category || 'Karuppatti / Jaggery';
    document.getElementById('prod-desc').value = prod.description || '';

    // Handle Variants
    const container = document.getElementById('variants-container');
    container.innerHTML = '';
    if (prod.variants && prod.variants.length > 0) {
        prod.variants.forEach(v => addVariantRow(v));
    } else {
        // Fallback for old single products
        addVariantRow({
            unit: prod.unit || prod.weight || '',
            priceOld: prod.priceOld,
            priceNew: prod.priceNew || prod.price,
            stock: prod.stock
        });
    }

    // Populate Images
    for(let i=0; i<5; i++) {
        document.getElementById(`img-file-${i}`).value = ""; 
        let url = "";
        if(Array.isArray(prod.images) && prod.images[i]) url = prod.images[i];
        else if(i===0 && typeof prod.image === 'string') url = prod.image; 
        document.getElementById(`img-url-${i}`).value = url;
    }
    
    window.openProductModal(true);
};

window.handleProductSubmit = async (e) => {
    e.preventDefault();
    
    const loader = document.getElementById('upload-loader');
    const btn = document.getElementById('save-product-btn');
    loader.classList.remove('hidden');
    btn.classList.add('hidden');

    try {
        const id = document.getElementById('prod-id').value;
        const finalImages = [];

        // Images Logic
        for (let i = 0; i < 5; i++) {
            const fileInput = document.getElementById(`img-file-${i}`);
            const urlInput = document.getElementById(`img-url-${i}`);
            
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const sRef = storageRef(storage, `skaruppatti-products/${Date.now()}_${file.name}`);
                await uploadBytes(sRef, file);
                const downloadURL = await getDownloadURL(sRef);
                finalImages.push(downloadURL);
            } else if (urlInput.value.trim() !== "") {
                finalImages.push(urlInput.value.trim());
            }
        }

        // Variants Logic
        const variants = [];
        let totalStock = 0;
        document.querySelectorAll('.variant-row').forEach(row => {
            const unit = row.querySelector('.var-unit').value;
            const priceOld = row.querySelector('.var-old').value;
            const priceNew = row.querySelector('.var-new').value;
            const stock = row.querySelector('.var-stock').value || 0;
            
            if(unit && priceNew) {
                variants.push({
                    unit,
                    priceOld: priceOld ? Number(priceOld) : null,
                    priceNew: Number(priceNew),
                    stock: Number(stock)
                });
                totalStock += Number(stock);
            }
        });

        if(variants.length === 0) throw new Error("At least one variant is required");

        // Construct Data Object (Root fields updated for backward compatibility)
        const mainVariant = variants[0];
        const data = {
            nameEnglish: document.getElementById('prod-name-english').value,
            nameTamil: document.getElementById('prod-name-tamil').value,
            category: document.getElementById('prod-category').value,
            description: document.getElementById('prod-desc').value,
            images: finalImages,
            
            // Root fields for compatibility
            priceNew: mainVariant.priceNew,
            priceOld: mainVariant.priceOld,
            unit: mainVariant.unit,
            stock: totalStock, // Sum of all variants
            
            // New Array
            variants: variants,
            
            // Old fields fallback
            name: document.getElementById('prod-name-english').value, 
            price: mainVariant.priceNew,
            image: finalImages.length > 0 ? finalImages[0] : ''
        };

        if(id) {
            await update(ref(db, `skaruppatti-products/${id}`), data);
            window.showToast("Product Updated Successfully!");
        } else {
            await push(ref(db, 'skaruppatti-products'), data);
            window.showToast("Product Added Successfully!");
        }
        window.closeProductModal();

    } catch (err) {
        console.error(err);
        window.showToast("Error saving product: " + err.message, "error");
    } finally {
        loader.classList.add('hidden');
        btn.classList.remove('hidden');
    }
};

// --- CONFIRMATION MODAL LOGIC ---
let pendingConfirmationAction = null;

window.showConfirmation = (message, action) => {
    document.getElementById('confirmation-text').innerText = message;
    pendingConfirmationAction = action;
    document.getElementById('confirmation-modal').classList.remove('hidden');
};

window.closeConfirmationModal = () => {
    document.getElementById('confirmation-modal').classList.add('hidden');
    pendingConfirmationAction = null;
};

window.executeConfirmAction = () => {
    if (pendingConfirmationAction) pendingConfirmationAction();
    window.closeConfirmationModal();
};

window.deleteProduct = (id) => {
    window.showConfirmation("Are you sure you want to delete this product? This cannot be undone.", async () => {
        try {
            await remove(ref(db, `skaruppatti-products/${id}`));
            window.showToast("Product Deleted");
        } catch (e) {
            console.error(e);
            window.showToast("Failed to delete product", "error");
        }
    });
};

// --- UPDATED: ORDERS LOGIC WITH SEARCH & FILTER ---
window.renderOrders = () => {
    const dashboardTable = document.getElementById('dashboard-orders-table');
    const ordersContainer = document.getElementById('orders-list-container');
    
    // Get filter values
    const searchVal = document.getElementById('order-search')?.value.toLowerCase().trim() || '';
    const dateVal = document.getElementById('order-date-filter')?.value || '';

    // Filter Logic
    const filteredOrders = allOrders.filter(order => {
        const matchesSearch = (order.customerName || '').toLowerCase().includes(searchVal) ||
                              (order.email || '').toLowerCase().includes(searchVal) ||
                              (order.customerPhone || '').includes(searchVal);
        
        let matchesDate = true;
        if(dateVal) {
            // Convert order date timestamp to YYYY-MM-DD
            const orderDate = new Date(order.orderDate).toISOString().split('T')[0];
            matchesDate = orderDate === dateVal;
        }
        
        return matchesSearch && matchesDate;
    });

    if(dashboardTable) dashboardTable.innerHTML = ''; 
    if(ordersContainer) ordersContainer.innerHTML = '';

    // Dashboard Table (Always shows top 5 recent orders regardless of filter for overview, or filtered if preferred. Standard admin usually filters main view only. Let's keep dashboard static or filtered. I will keep dashboard static top 5 for consistency, filters apply to "Customer Orders" view.)
    allOrders.slice(0, 5).forEach(order => {
        if(dashboardTable) dashboardTable.innerHTML += `<tr><td class="px-6 py-3 font-medium">#${order.id.slice(-6)}</td><td class="px-6 py-3">${order.customerName}</td><td class="px-6 py-3 font-bold text-primary">${order.totalAmount}</td><td class="px-6 py-3"><span class="text-xs px-2 py-1 rounded ${getStatusColor(order.status)}">${order.status || 'Pending'}</span></td></tr>`;
    });

    // Full Orders List -> FILTERED CARD VIEW
    if(ordersContainer) {
        if(filteredOrders.length === 0) {
            ordersContainer.innerHTML = '<div class="col-span-full flex flex-col items-center justify-center text-gray-400 py-10"><i class="fa-solid fa-box-open text-4xl mb-2"></i><p>No orders found matching filters.</p></div>';
            return;
        }

        filteredOrders.forEach(order => {
            const date = new Date(order.orderDate).toLocaleDateString() + ' ' + new Date(order.orderDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Items formatting for Display
            const itemsList = (order.items || []).map(i => `
                <div class="flex justify-between items-start text-xs text-gray-600 border-b border-gray-100 last:border-0 pb-1 mb-1">
                    <span class="break-words w-2/3">${i.name} <span class="text-gray-400">(${i.unit || ''})</span> x ${i.qty}</span>
                    <span class="font-bold text-gray-800">₹${i.subtotal}</span>
                </div>
            `).join('');

            // Items formatting for WhatsApp Message
            let itemsMsg = "";
            (order.items || []).forEach(i => {
                itemsMsg += `- ${i.name} (${i.unit || ''}) x ${i.qty}: ₹${i.subtotal}\n`;
            });
            
            let courierName = 'Standard';
            if(order.courierMode === 'st_french') courierName = 'ST & French';
            else if(order.courierMode === 'indianpost') courierName = 'Indian Post';
            else if(order.courierMode === 'professional') courierName = 'Professional';

            let paymentTag = '';
            let paymentText = '';
            if(order.paymentMode === 'cod') {
                paymentTag = '<span class="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded ml-2">COD</span>';
                paymentText = 'Cash on Delivery';
            } else {
                paymentTag = '<span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-2">Online</span>';
                paymentText = 'Online Payment';
            }

            // Construct WhatsApp Message
            let whatsappText = `*Order Details - S Karuppatti Store*\n\n` +
                               `*Date:* ${date}\n` +
                               `*Order ID:* ${order.id}\n` +
                               `*Name:* ${order.customerName}\n` +
                               `*Address:* ${order.address}, ${order.state || ''} - ${order.pincode || ''}\n` +
                               `*Email:* ${order.email}\n` +
                               `*Courier:* ${courierName}\n` +
                               `*Payment Mode:* ${paymentText}\n\n` +
                               `*Items:*\n${itemsMsg}\n` +
                               `*Total Amount:* ${order.totalAmount}\n\n` +
                               `Please send your payment screenshot or proof.`;
            
            let encodedMsg = encodeURIComponent(whatsappText);
            let waLink = `https://wa.me/91${order.customerPhone}?text=${encodedMsg}`;

            ordersContainer.innerHTML += `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col hover:shadow-md transition duration-200">
                    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                        <div class="flex flex-col">
                            <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Order ID (Firebase)</span>
                            <span class="text-xs font-mono font-bold text-primary select-all cursor-pointer" title="Click to select" onclick="navigator.clipboard.writeText('${order.id}'); window.showToast('ID Copied')">${order.id}</span>
                        </div>
                        <div class="text-right">
                            <span class="block text-[10px] text-gray-400 font-bold uppercase">Date</span>
                            <span class="text-[10px] font-medium text-gray-600">${date}</span>
                        </div>
                    </div>
                    
                    <div class="p-4 flex-1 space-y-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm flex items-center">${order.customerName} ${paymentTag}</h4>
                                <a href="tel:${order.customerPhone}" class="text-xs text-secondary hover:text-primary transition flex items-center gap-1 font-medium mt-0.5">
                                    <i class="fa-solid fa-phone"></i> ${order.customerPhone}
                                </a>
                                <div class="text-[10px] text-gray-500 mt-1 truncate max-w-[150px]" title="${order.email}">${order.email || ''}</div>
                            </div>
                            <div class="text-right">
                                <span class="text-[10px] font-bold text-gray-400 uppercase block">Courier Mode</span>
                                <span class="text-xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">${courierName}</span>
                            </div>
                        </div>

                        <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <p class="text-[10px] font-bold text-gray-400 uppercase mb-2">Items</p>
                            <div class="max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                ${itemsList}
                            </div>
                            <div class="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
                                <span class="text-xs font-bold text-gray-700">Total Amount</span>
                                <span class="text-sm font-bold text-primary">${order.totalAmount}</span>
                            </div>
                        </div>

                        <div>
                            <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Shipping Address</p>
                            <p class="text-xs text-gray-600 bg-white border border-gray-100 rounded p-2 leading-relaxed h-16 overflow-y-auto" title="${order.address}">${order.address}</p>
                            <div class="flex gap-2 mt-2">
                                <span class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Pincode: ${order.pincode || '-'}</span>
                                <span class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">State: ${order.state || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="p-3 bg-gray-50 border-t border-gray-200 flex gap-2 items-center">
                        <div class="flex-1">
                            <label class="sr-only">Status</label>
                            <select onchange="updateStatus('${order.id}', this.value)" class="w-full text-xs font-bold border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:border-secondary ${getStatusColor(order.status)}">
                                <option value="Pending" ${order.status==='Pending'?'selected':''}>Pending</option>
                                <option value="Processing" ${order.status==='Processing'?'selected':''}>Processing</option>
                                <option value="Shipped" ${order.status==='Shipped'?'selected':''}>Shipped</option>
                                <option value="Delivered" ${order.status==='Delivered'?'selected':''}>Delivered</option>
                                <option value="Cancelled" ${order.status==='Cancelled'?'selected':''}>Cancelled</option>
                            </select>
                        </div>
                        <a href="${waLink}" target="_blank" class="w-9 h-9 rounded-lg bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition shadow-sm" title="WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i>
                        </a>
                        <a href="tel:${order.customerPhone}" class="w-9 h-9 rounded-lg bg-secondary text-white flex items-center justify-center hover:bg-yellow-600 transition shadow-sm" title="Call">
                            <i class="fa-solid fa-phone"></i>
                        </a>
                        <button onclick="deleteOrder('${order.id}')" class="w-9 h-9 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow-sm" title="Delete Order">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    }
};

window.deleteOrder = (orderId) => {
    window.showConfirmation("Permanently delete this order? This cannot be undone.", async () => {
        try {
            await remove(ref(db, `skaruppatti-orders/${orderId}`));
            window.showToast("Order Deleted Successfully");
        } catch (e) {
            console.error(e);
            window.showToast("Failed to delete order", "error");
        }
    });
};

window.clearOrderFilters = () => {
    document.getElementById('order-search').value = '';
    document.getElementById('order-date-filter').value = '';
    window.renderOrders();
};

function getStatusColor(status) {
    switch(status) {
        case 'Pending': return 'text-orange-600 bg-orange-50';
        case 'Processing': return 'text-blue-600 bg-blue-50';
        case 'Shipped': return 'text-purple-600 bg-purple-50';
        case 'Delivered': return 'text-green-600 bg-green-50';
        case 'Cancelled': return 'text-red-600 bg-red-50';
        default: return 'text-gray-600 bg-gray-50';
    }
}

window.updateStatus = async (orderId, newStatus) => {
    try { await update(ref(db, `skaruppatti-orders/${orderId}`), { status: newStatus }); window.showToast(`Order marked as ${newStatus}`); }
    catch (e) { window.showToast("Failed", "error"); }
};

window.editProduct = editProduct;
