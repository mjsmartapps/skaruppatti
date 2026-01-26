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
window.currentDetailId = null; 
window.currentDetailVariantIndex = 0; 
window.currentDetailImageIndex = 0;   
window.currentProductImages = [];     
window.paymentMode = 'online';        
window.courierMode = 'st_french';  // Default courier mode

// --- NEW: Info Modal Content Data ---
const infoModalData = {
    "about-modal": {
        title: "About Us / எங்களை பற்றி",
        content: `
            <div class="space-y-6">
                <div>
                    <h3 class="font-bold text-primary text-lg mb-2 tamil-font">எங்களை பற்றி – எஸ் கருப்பட்டி ஸ்டோர்</h3>
                    <p class="text-gray-700 text-sm leading-relaxed text-justify tamil-font">
                        எஸ் கருப்பட்டி ஸ்டோர் ஒரு கிராம அடிப்படையிலான பாரம்பரிய கருப்பட்டி கடை. எங்களின் அனைத்து பொருட்களும் சொந்த தயாரிப்பு கருப்பட்டி கடையில் இயற்கை முறையில் மற்றும் பாரம்பரிய முறையில் தயாரிக்கப்படுகின்றன. நாங்கள் தூய்மையான கருப்பட்டி, பனை சர்க்கரை மற்றும் பனை சார்ந்த உணவுப் பொருட்களை எந்தவித ரசாயன கலவையும் இல்லாமல் தயாரித்து வழங்குகிறோம். தரமான, ஆரோக்கியமான மற்றும் நம்பகமான இயற்கை உணவுப் பொருட்களை நேரடியாக வாடிக்கையாளர்களிடம் சேர்ப்பதே எங்களின் முக்கிய நோக்கம். எஸ் கருப்பட்டி ஸ்டோர் நல்ல தரம், நம்பிக்கை மற்றும் வாடிக்கையாளர் திருப்தியை அடிப்படையாக கொண்டு செயல்படுகிறது. எங்களை தேர்வு செய்வதன் மூலம் நீங்கள் கிராம உற்பத்தி மற்றும் உள்ளூர் விவசாயிகளை ஆதரிக்கிறீர்கள். உங்கள் ஆதரவுக்கு மனமார்ந்த நன்றி.
                    </p>
                </div>
                <div class="border-t pt-4">
                    <h3 class="font-bold text-primary text-lg mb-2 brand-font">About Us – S KARUPPATTI STORE</h3>
                    <p class="text-gray-700 text-sm leading-relaxed text-justify">
                        S KARUPPATTI STORE is a village-based traditional palm product store. All our products are manufactured at our own unit, Sontha Thayarippu Karuppatti Kadai, using natural and traditional methods. We provide pure Karuppatti, palm sugar, and palm-based food products without any chemicals, artificial colors, or preservatives. Our goal is to deliver healthy and authentic village-made products directly to customers. S KARUPPATTI STORE works with a focus on quality, trust, and customer satisfaction. By choosing us, you are supporting local farmers and traditional village manufacturing. Thank you for your support.
                    </p>
                </div>
            </div>
        `
    },
    "terms-modal": {
        title: "Terms & Conditions / விதிமுறைகள்",
        content: `
            <div class="space-y-6">
                <div>
                    <h3 class="font-bold text-primary text-lg mb-2 tamil-font">விதிமுறைகள் மற்றும் நிபந்தனைகள்</h3>
                    <p class="text-gray-700 text-sm mb-2 tamil-font">எஸ் கருப்பட்டி ஸ்டோரில் ஆர்டர் செய்வதன் மூலம் கீழ்கண்ட விதிமுறைகளை நீங்கள் ஏற்கிறீர்கள்:</p>
                    <ul class="list-disc pl-5 space-y-1 text-sm text-gray-700 text-justify tamil-font">
                        <li>அனைத்து பொருட்களும் சொந்த தயாரிப்பு கருப்பட்டி கடையில் பாரம்பரிய முறையில் தயாரிக்கப்படுகின்றன.</li>
                        <li>இயற்கை தயாரிப்பு என்பதால் பொருளின் நிறம் மற்றும் தோற்றம் சிறிது மாறுபடலாம்.</li>
                        <li>கட்டணம் உறுதி செய்யப்பட்ட பிறகே ஆர்டர் செயல்படுத்தப்படும்.</li>
                        <li>விலைகள் முன் அறிவிப்பு இல்லாமல் மாற்றப்படலாம்.</li>
                        <li>ஆர்டர் அனுப்பப்பட்ட பிறகு ரத்து செய்ய முடியாது.</li>
                        <li>டெலிவரி நேரம் இடம் மற்றும் கூரியர் சேவையைப் பொறுத்தது.</li>
                        <li>வாடிக்கையாளர் சரியான முகவரி மற்றும் தொலைபேசி எண்ணை வழங்க வேண்டும்.</li>
                        <li>கூரியர் தாமதங்களுக்கு நாங்கள் பொறுப்பல்ல.</li>
                        <li>ஏதேனும் பிரச்சினைகள் உள்ளூர் நீதிமன்ற வரம்பிற்குள் தீர்க்கப்படும்.</li>
                    </ul>
                </div>
                <div class="border-t pt-4">
                    <h3 class="font-bold text-primary text-lg mb-2 brand-font">Terms and Conditions</h3>
                    <p class="text-gray-700 text-sm mb-2">By placing an order with S KARUPPATTI STORE, you agree to the following:</p>
                    <ul class="list-disc pl-5 space-y-1 text-sm text-gray-700 text-justify">
                        <li>All products are manufactured traditionally at Sontha Thayarippu Karuppatti Kadai.</li>
                        <li>Product appearance may vary slightly due to natural preparation.</li>
                        <li>Orders are processed only after payment confirmation.</li>
                        <li>Prices may change without prior notice.</li>
                        <li>Orders cannot be cancelled after shipping.</li>
                        <li>Delivery time depends on location and courier service.</li>
                        <li>Customers must provide correct address and contact details.</li>
                        <li>We are not responsible for courier delays.</li>
                        <li>Any disputes will be handled under local jurisdiction.</li>
                    </ul>
                </div>
            </div>
        `
    },
    "privacy-modal": {
        title: "Privacy Policy / தனியுரிமைக் கொள்கை",
        content: `
            <div class="space-y-6">
                <div>
                    <h3 class="font-bold text-primary text-lg mb-2 tamil-font">தனியுரிமைக் கொள்கை</h3>
                    <p class="text-gray-700 text-sm leading-relaxed text-justify tamil-font">
                        எஸ் கருப்பட்டி ஸ்டோர் உங்கள் தனியுரிமையை முழுமையாக மதிக்கிறது. ஆர்டர் செயல்படுத்துவதற்காக மட்டுமே வாடிக்கையாளர் விவரங்களை சேகரிக்கிறோம். உங்கள் தகவல்கள் ஆர்டர் அனுப்புவதற்கும் தகவல் தொடர்பிற்கும் மட்டுமே பயன்படுத்தப்படும். வாடிக்கையாளர் தகவல்கள் எந்த மூன்றாம் நபருக்கும் பகிரப்படமாட்டாது. கட்டண விவரங்கள் ஆர்டர் உறுதிப்படுத்தலுக்காக மட்டுமே பயன்படுத்தப்படும். ஆர்டர் தொடர்பான தகவல்கள் SMS அல்லது WhatsApp மூலம் அனுப்பப்படலாம். தேவையெனில் வாடிக்கையாளர் தங்கள் தகவல்களை நீக்க கோரலாம்.
                    </p>
                </div>
                <div class="border-t pt-4">
                    <h3 class="font-bold text-primary text-lg mb-2 brand-font">Privacy Policy</h3>
                    <p class="text-gray-700 text-sm leading-relaxed text-justify">
                        S KARUPPATTI STORE respects your privacy. We collect only basic details required for order processing. Your information is used only for delivery and communication. We do not share customer data with any third party. Payment details are used only for order verification. Order updates may be sent to your registered contact details. Customers can request removal of their data at any time.
                    </p>
                </div>
            </div>
        `
    },
    "payment-modal": {
        title: "Payment & Order Instructions",
        content: `
            <div class="space-y-6">
                <div>
                    <h3 class="font-bold text-primary text-lg mb-2 tamil-font">கட்டண வழிமுறைகள் – ஆன்லைன் கட்டணம்</h3>
                    <p class="text-gray-700 text-sm mb-2 text-justify tamil-font">உங்கள் ஆர்டரை வெற்றிகரமாக பதிவு செய்த பிறகு, மொத்த ஆர்டர் தொகையை கீழ்கண்ட கட்டண விவரங்களுக்கு அனுப்புமாறு கேட்டுக்கொள்கிறோம்.</p>
                    <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                        <p class="text-sm font-bold text-gray-800 mb-1">கட்டண முறைகள்:</p>
                        <ul class="space-y-1 text-sm text-gray-700">
                            <li>• Google Pay எண்: <span class="font-mono font-bold">6383391928</span> <button onclick="navigator.clipboard.writeText('6383391928'); window.showToast('Copied!')" class="text-secondary ml-2"><i class="fa-regular fa-copy"></i></button></li>
                            <li>• UPI ID: <span class="font-mono font-bold">selvakumar6383391928@okhdfcbank</span> <button onclick="navigator.clipboard.writeText('selvakumar6383391928@okhdfcbank'); window.showToast('Copied!')" class="text-secondary ml-2"><i class="fa-regular fa-copy"></i></button></li>
                            <li>• கணக்கு வைத்திருப்பவர்: <strong>Selvakumar</strong></li>
                            <li>• வணிகத்தின் பெயர்: <strong>Karuppatti Kadai</strong></li>
                        </ul>
                    </div>
                    <p class="text-gray-700 text-sm text-justify tamil-font">
                        பணம் செலுத்திய பிறகு, கட்டண உறுதிப்படுத்தல் ஸ்கிரீன்ஷாட் அல்லது ஆதாரத்தை எங்கள் WhatsApp எண் <span class="font-mono font-bold">6383391928</span>க்கு அனுப்பவும். அதன்பிறகு உங்கள் ஆர்டர் தாமதமின்றி செயல்படுத்தப்படும்.
                    </p>
                    
                    <div class="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <h4 class="font-bold text-orange-800 text-sm mb-1 tamil-font">COD (Cash on Delivery) விதிமுறைகள்</h4>
                        <ul class="list-disc pl-5 space-y-1 text-xs text-gray-700 text-justify tamil-font">
                            <li>COD ஆர்டர்களுக்கு முன்பணம் கட்டாயம்.</li>
                            <li>மொத்த தொகையின் 40% முதல் 50% வரை முன்பணம் ஆன்லைனில் செலுத்த வேண்டும்.</li>
                            <li>மீதமுள்ள தொகை டெலிவரியின் போது செலுத்தலாம்.</li>
                            <li>முன்பணம் இல்லாமல் COD ஆர்டர்கள் ஏற்றுக்கொள்ளப்படாது.</li>
                        </ul>
                    </div>
                </div>

                <div class="border-t pt-4">
                    <h3 class="font-bold text-primary text-lg mb-2 brand-font">Payment Instructions – Online Payment</h3>
                    <p class="text-gray-700 text-sm mb-2 text-justify">After successfully placing your order, kindly send the total order amount to our payment details.</p>
                    <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                        <p class="text-sm font-bold text-gray-800 mb-1">Payment Options:</p>
                        <ul class="space-y-1 text-sm text-gray-700">
                            <li>• Google Pay Number: <span class="font-mono font-bold">6383391928</span> <button onclick="navigator.clipboard.writeText('6383391928'); window.showToast('Copied!')" class="text-secondary ml-2"><i class="fa-regular fa-copy"></i></button></li>
                            <li>• UPI ID: <span class="font-mono font-bold">selvakumar6383391928@okhdfcbank</span> <button onclick="navigator.clipboard.writeText('selvakumar6383391928@okhdfcbank'); window.showToast('Copied!')" class="text-secondary ml-2"><i class="fa-regular fa-copy"></i></button></li>
                            <li>• Account Holder Name: <strong>Selvakumar</strong></li>
                            <li>• Business Name: <strong>Karuppatti Kadai</strong></li>
                        </ul>
                    </div>
                    <p class="text-gray-700 text-sm text-justify">
                        Once payment is completed, please share the payment confirmation screenshot or proof to our WhatsApp Number <span class="font-mono font-bold">6383391928</span> so that we can process your order without delay.
                    </p>

                    <div class="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <h4 class="font-bold text-orange-800 text-sm mb-1">COD (Cash on Delivery) Policy</h4>
                        <ul class="list-disc pl-5 space-y-1 text-xs text-gray-700 text-justify">
                            <li>COD orders require advance payment.</li>
                            <li>Customers must pay 40% to 50% of the order amount in advance through online payment.</li>
                            <li>Remaining balance can be paid at the time of delivery.</li>
                            <li>COD orders will not be accepted without advance payment.</li>
                        </ul>
                    </div>
                    <p class="text-gray-500 text-xs mt-2 italic">Thank you for your cooperation.</p>
                </div>
            </div>
        `
    }
};

window.injectDynamicModals = () => {
    // 1. Inject the Modals if they don't exist
    Object.keys(infoModalData).forEach(modalId => {
        if (!document.getElementById(modalId)) {
            const data = infoModalData[modalId];
            const modalHTML = `
                <div id="${modalId}" class="fixed inset-0 z-50 hidden">
                    <div class="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" onclick="toggleModal('${modalId}', false)"></div>
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl p-4">
                        <div class="glass rounded-2xl shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto hide-scrollbar">
                            <button onclick="toggleModal('${modalId}', false)" class="absolute top-4 right-4 text-gray-400 hover:text-red-500"><i class="fa-solid fa-xmark text-xl"></i></button>
                            <h2 class="text-2xl font-bold text-primary mb-6 brand-font border-b pb-2 text-center md:text-left">${data.title}</h2>
                            <div class="text-gray-700">
                                ${data.content}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    });

    // 2. Inject Payment Link in Footer (Quick Links section)
    const footerLists = document.querySelectorAll('footer ul');
    if(footerLists.length >= 2) {
        // Usually the second list (index 1) is Quick Links
        const quickLinks = footerLists[1]; 
        
        // Check if link already exists to avoid duplicates
        if(!quickLinks.innerHTML.includes('toggleModal(\'payment-modal\'')) {
             const li = document.createElement('li');
             li.innerHTML = `<a href="#" onclick="toggleModal('payment-modal', true)" class="hover:text-secondary transition"></a>`;
             quickLinks.appendChild(li);
        }
    }
};

window.getWeightInKg = (unitStr) => {
    if (!unitStr) return 0;
    const lower = unitStr.toLowerCase().trim();
    const match = lower.match(/(\d+(\.\d+)?)/);
    if (!match) return 0;
    
    let val = parseFloat(match[1]);
    
    if (lower.includes('kg') || lower.includes('l')) {
        return val;
    } else if (lower.includes('g') || lower.includes('gm') || lower.includes('ml')) {
        return val / 1000;
    }
    return 0; 
};

window.calculateDeliveryCharge = (totalWeight, state, paymentMode, courierMode) => {
    if (!state) return 0;
    
    const weight = Math.ceil(totalWeight);
    if (weight <= 0) return 0;

    // --- INDIAN POST LOGIC (Updated Table) ---
    if (courierMode === 'indianpost') {
        if (weight <= 1) return 60;
        if (weight <= 2) return 95;
        if (weight <= 3) return 120;
        if (weight <= 4) return 150;
        if (weight <= 5) return 195;
        if (weight <= 6) return 240;
        if (weight <= 7) return 275;
        if (weight <= 8) return 305;
        if (weight <= 9) return 335;
        if (weight <= 10) return 370;
        return 370 + ((weight - 10) * 40); // Estimation for > 10KG
    }

    // --- PROFESSIONAL COURIER LOGIC (Fixed ₹50 per KG) ---
    if (courierMode === 'professional') {
        return weight * 50;
    }

    // --- ST & FRENCH COURIER LOGIC (Original Table) ---
    if (paymentMode === 'cod') {
        if (weight <= 1) return 100;
        if (weight <= 2) return 183;
        if (weight <= 3) return 265;
        if (weight <= 4) return 348;
        if (weight <= 5) return 430;
        if (weight <= 6) return 494;
        if (weight <= 7) return 558;
        if (weight <= 8) return 622;
        if (weight <= 9) return 686;
        if (weight <= 10) return 750;
        return 750 + ((weight - 10) * 100); 
    } else {
        // Online Payment
        if (weight <= 1) return 50;
        if (weight <= 2) return 83;
        if (weight <= 3) return 115;
        if (weight <= 4) return 148;
        if (weight <= 5) return 180;
        if (weight <= 6) return 194;
        if (weight <= 7) return 208;
        if (weight <= 8) return 222;
        if (weight <= 9) return 236;
        if (weight <= 10) return 250;
        return 250 + ((weight - 10) * 50); 
    }
};

window.showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check text-green-600"></i>' : '<i class="fa-solid fa-circle-exclamation text-red-600"></i>';
    toast.innerHTML = `${icon} <span class="font-medium text-sm text-gray-700">${message}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)'; 
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
                if (targetId === 'checkout-state') {
                    window.updateCartTotals(); 
                }
            } else {
                stateInput.value = "";
                window.showToast("Invalid Pincode", "error");
                if (targetId === 'checkout-state') window.updateCartTotals();
            }
        } catch(e) {
            console.error(e);
            stateInput.value = "";
            window.showToast("Could not fetch state", "error");
            if (targetId === 'checkout-state') window.updateCartTotals();
        }
    } else {
        stateInput.value = "";
        stateInput.placeholder = "Auto-filled";
        if (targetId === 'checkout-state') window.updateCartTotals();
    }
}

window.renderActionButton = (id, index) => {
    const product = window.productsMap[id];
    if(!product) return '';

    let variantData = product;
    if (product.variants && product.variants.length > 0) {
        variantData = product.variants[index];
    }

    if(!variantData || variantData.stock <= 0) {
        return `<button disabled class="bg-gray-200 text-gray-500 px-3 py-2 rounded-lg text-xs font-bold w-full cursor-not-allowed uppercase tracking-wide">Out of Stock</button>`;
    }

    const cartKey = (product.variants && product.variants.length > 0) ? `${id}___${index}` : id;
    const cartItem = window.cart[cartKey];

    if (cartItem) {
        return `
            <div class="flex items-center justify-between bg-primary text-white rounded-lg p-1 w-full shadow-md z-20 relative h-[36px]">
                <button onclick="changeQty('${cartKey}', -1); event.stopPropagation();" class="qty-btn hover:bg-emerald-900 font-bold text-sm">-</button>
                <span class="text-sm font-bold">${cartItem.qty}</span>
                <button onclick="changeQty('${cartKey}', 1); event.stopPropagation();" class="qty-btn hover:bg-emerald-900 font-bold text-sm">+</button>
            </div>
        `;
    } else {
        return `<button onclick="addToCart('${id}'); event.stopPropagation();" class="bg-primary text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-emerald-900 transition shadow-md w-full z-20 relative h-[36px] uppercase tracking-wide">Add to Cart</button>`;
    }
};

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

window.updateDetailButton = () => {
    const container = document.getElementById('detail-btn-container');
    if (!container || !window.currentDetailId) return;

    const id = window.currentDetailId;
    const product = window.productsMap[id];
    if (!product) return;

    const variantIndex = window.currentDetailVariantIndex || 0;
    const variantData = (product.variants && product.variants.length > 0) ? product.variants[variantIndex] : product;

    if(variantData.stock <= 0) {
         container.innerHTML = `<button disabled class="w-full bg-gray-200 text-gray-500 py-3 rounded-full font-bold cursor-not-allowed">Out of Stock</button>`;
         return;
    }

    const cartKey = (product.variants && product.variants.length > 0) ? `${id}___${variantIndex}` : id;
    const cartItem = window.cart[cartKey];

    if(cartItem) {
        container.innerHTML = `
            <div class="flex items-center justify-between bg-primary text-white rounded-full p-2 w-full shadow-lg">
                <button onclick="changeQty('${cartKey}', -1)" class="w-12 h-10 rounded-full hover:bg-emerald-900 flex items-center justify-center font-bold text-xl transition">-</button>
                <span class="text-xl font-bold">${cartItem.qty}</span>
                <button onclick="changeQty('${cartKey}', 1)" class="w-12 h-10 rounded-full hover:bg-emerald-900 flex items-center justify-center font-bold text-xl transition">+</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="flex gap-3 w-full">
                <button onclick="addToCart('${id}', ${variantIndex})" class="flex-1 border-2 border-primary text-primary py-3 rounded-full font-bold hover:bg-primary hover:text-white transition">
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
            <div class="flex flex-wrap gap-1.5 mb-3" onclick="event.stopPropagation()">
                ${buttons}
            </div>
            <input type="hidden" id="selected-variant-${product.id}" value="0">
        `;
    } else {
        variantHtml = `<p class="text-xs text-gray-500 mb-3 font-medium h-[26px] flex items-center">${currentUnit ? '/ ' + currentUnit : ''}</p>`;
        variantHtml += `<input type="hidden" id="selected-variant-${product.id}" value="0">`;
    }
    
    const buttonHtml = window.renderActionButton(product.id, 0);
    const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image || 'https://placehold.co/400x300?text=No+Image'];
    const imagesHtml = images.map((img, idx) => `
        <img src="${img}" class="w-full h-full object-cover flex-shrink-0 snap-center transform hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" draggable="false" alt="${product.nameEnglish || 'Product'}">
    `).join('');

    return `
        <div class="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-gray-100 group relative product-card-opt overflow-hidden hover:-translate-y-1">
            <div class="h-52 md:h-64 bg-gray-50 relative overflow-hidden cursor-pointer" onclick="openProductDetail('${product.id}')">
                <div class="flex overflow-x-auto snap-x snap-mandatory h-full hide-scrollbar scroll-smooth">
                    ${imagesHtml}
                </div>
                ${images.length > 1 ? '<div class="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm"><i class="fa-solid fa-layer-group"></i> ' + images.length + '</div>' : ''}
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
            </div>
            <div class="p-5 flex flex-col flex-grow">
                <div class="cursor-pointer mb-2" onclick="openProductDetail('${product.id}')">
                    <h4 class="font-bold text-gray-900 text-base md:text-lg line-clamp-1 group-hover:text-primary transition-colors">${product.nameEnglish || product.name}</h4>
                    <p class="text-xs text-secondary tamil-font mb-1 line-clamp-1">${product.nameTamil || ''}</p>
                    <p class="text-xs text-gray-400 truncate">${subtitle}</p>
                </div>
                <div class="mt-auto">
                    ${variantHtml}
                    <div class="flex justify-between items-end gap-3 mt-1 pt-3 border-t border-gray-50">
                        <div class="flex flex-col">
                            <span id="price-old-${product.id}" class="${currentOldPrice ? '' : 'hidden'} line-through text-gray-400 text-[10px]">₹${currentOldPrice}</span>
                            <span id="price-new-${product.id}" class="text-primary font-bold text-lg leading-none">₹${currentPrice}</span>
                        </div>
                        <div class="flex-1 max-w-[120px]" id="btn-container-${product.id}">
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

window.openProductDetail = (id) => {
    const product = window.productsMap[id];
    if(!product) return;
    
    window.currentDetailId = id; 
    window.currentDetailVariantIndex = 0; 
    window.currentDetailImageIndex = 0;   

    const hasVariants = product.variants && product.variants.length > 0;
    const variant = hasVariants ? product.variants[0] : product;

    window.currentProductImages = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image || 'https://placehold.co/400x300?text=No+Image'];

    const prevBtn = document.getElementById('img-prev-btn');
    const nextBtn = document.getElementById('img-next-btn');
    if (window.currentProductImages.length > 1) {
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    } else {
        prevBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
    }

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

    const variantContainer = document.getElementById('detail-variants');
    if (hasVariants) {
        variantContainer.innerHTML = product.variants.map((v, i) => `
            <button onclick="selectDetailVariant(${i})" id="detail-var-btn-${i}"
            class="px-4 py-2 rounded-lg border text-sm font-bold transition transform hover:scale-105 ${i===0 ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-secondary'}">
                ${v.unit}
            </button>
        `).join('');
        variantContainer.classList.remove('hidden');
    } else {
        variantContainer.innerHTML = '';
        variantContainer.classList.add('hidden');
    }

    const stockEl = document.getElementById('detail-stock');
    const currentStock = variant.stock || 0;
    
    if(currentStock > 0) {
        stockEl.innerText = `In Stock`;
        stockEl.className = "text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700";
    } else {
        stockEl.innerText = "Out of Stock";
        stockEl.className = "text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700";
    }

    const mainImg = document.getElementById('detail-main-img');
    mainImg.src = window.currentProductImages[0];

    const thumbContainer = document.getElementById('detail-thumbnails');
    thumbContainer.innerHTML = window.currentProductImages.map((img, index) => `
        <img src="${img}" onclick="window.currentDetailImageIndex = ${index}; document.getElementById('detail-main-img').src='${img}'" 
        class="h-full w-auto object-cover border rounded cursor-pointer hover:border-secondary transition ${index === 0 ? 'border-secondary' : 'border-transparent'}" loading="lazy">
    `).join('');

    window.updateDetailButton();
    window.toggleModal('product-detail-modal', true);
};

window.changeDetailImage = (direction) => {
    if (!window.currentProductImages || window.currentProductImages.length <= 1) return;

    let newIndex = window.currentDetailImageIndex + direction;

    if (newIndex < 0) {
        newIndex = window.currentProductImages.length - 1;
    } else if (newIndex >= window.currentProductImages.length) {
        newIndex = 0;
    }

    window.currentDetailImageIndex = newIndex;
    const newSrc = window.currentProductImages[newIndex];
    document.getElementById('detail-main-img').src = newSrc;

    const thumbs = document.getElementById('detail-thumbnails').getElementsByTagName('img');
    for (let i = 0; i < thumbs.length; i++) {
        if (i === newIndex) {
            thumbs[i].classList.add('border-secondary');
            thumbs[i].classList.remove('border-transparent');
            thumbs[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
            thumbs[i].classList.remove('border-secondary');
            thumbs[i].classList.add('border-transparent');
        }
    }
};

window.selectDetailVariant = (index) => {
    window.currentDetailVariantIndex = index;
    const product = window.productsMap[window.currentDetailId];
    if(!product || !product.variants) return;
    const variant = product.variants[index];

    document.getElementById('detail-price-new').innerText = '₹' + variant.priceNew;
    const oldPriceEl = document.getElementById('detail-price-old');
    if(variant.priceOld) {
        oldPriceEl.innerText = '₹' + variant.priceOld;
        oldPriceEl.classList.remove('hidden');
    } else {
        oldPriceEl.classList.add('hidden');
    }
    document.getElementById('detail-unit').innerText = '/ ' + variant.unit;

    const stockEl = document.getElementById('detail-stock');
    if(variant.stock > 0) {
        stockEl.innerText = "In Stock";
        stockEl.className = "text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700";
    } else {
        stockEl.innerText = "Out of Stock";
        stockEl.className = "text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700";
    }

    product.variants.forEach((_, i) => {
        const btn = document.getElementById(`detail-var-btn-${i}`);
        if(btn) {
            if(i === index) {
                btn.className = "px-4 py-2 rounded-lg border text-sm font-bold transition transform hover:scale-105 bg-primary text-white border-primary shadow-md";
            } else {
                btn.className = "px-4 py-2 rounded-lg border text-sm font-bold transition transform hover:scale-105 bg-white text-gray-600 border-gray-200 hover:border-secondary";
            }
        }
    });
    window.updateDetailButton();
};

window.buyNow = (id) => {
    window.addToCart(id, window.currentDetailVariantIndex || 0); 
    window.toggleModal('product-detail-modal', false);
    window.openCartModal();
};

window.addToCart = (id, forcedVariantIndex = null) => {
    const product = window.productsMap[id];
    if(!product) return;

    let variantIndex = 0;
    let variantData = product;
    
    const hiddenInput = document.getElementById(`selected-variant-${id}`);
    
    if (forcedVariantIndex !== null) {
        variantIndex = forcedVariantIndex;
    } else if (hiddenInput) {
        variantIndex = parseInt(hiddenInput.value);
    }

    if (product.variants && product.variants.length > 0) {
        variantData = product.variants[variantIndex];
    } else {
        variantIndex = -1; 
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

window.openCartModal = () => {
    window.toggleModal('cart-modal', true);
    renderCartModalItems();
    
    // NOTE: HTML is now hardcoded in index.html, not injected here.
    
    const paymentRadios = document.getElementsByName('paymentMode');
    paymentRadios.forEach(r => {
        if(r.value === window.paymentMode) r.checked = true;
    });

    const courierRadios = document.getElementsByName('courierMode');
    courierRadios.forEach(r => {
        if(r.value === window.courierMode) r.checked = true;
    });

    // NEW: Apply initial state for COD based on current courier mode
    window.updatePaymentAvailability();

    const user = auth.currentUser;
    const nameInput = document.getElementById('checkout-name');
    const phoneInput = document.getElementById('checkout-phone');
    const emailInput = document.getElementById('checkout-email');
    const addrInput = document.getElementById('checkout-address');
    const locInput = document.getElementById('checkout-location');
    const pincodeInput = document.getElementById('checkout-pincode');
    const stateInput = document.getElementById('checkout-state');

    const itemsSection = document.getElementById('cart-items-section');
    const formSection = document.getElementById('shipping-form-section');

    if (user) {
        // User is logged in - Standard Order (Items first, then form)
        // Mobile: Items Top (Order 1), Form Bottom (Order 2)
        // Desktop: Left (Items), Right (Form) - Default HTML structure
        if(itemsSection) {
            itemsSection.classList.remove('order-2');
            itemsSection.classList.add('order-1');
        }
        if(formSection) {
            formSection.classList.remove('order-1');
            formSection.classList.add('order-2');
        }

        emailInput.value = user.email || '';
        emailInput.readOnly = false; 
        nameInput.value = user.displayName || '';
        if(window.currentUserData) {
            phoneInput.value = window.currentUserData.phone || '';
            addrInput.value = window.currentUserData.address || '';
            locInput.value = window.currentUserData.location || '';
            pincodeInput.value = window.currentUserData.pincode || '';
            stateInput.value = window.currentUserData.state || '';
            
            if(window.currentUserData.state) {
                setTimeout(window.updateCartTotals, 100);
            }
        }
    } else {
        // User NOT logged in - "1st time" view
        // Mobile: Form Top (Order 1), Items Bottom (Order 2)
        // Desktop: Keep standard (Left/Right) via md:order classes if needed, but flex-col handles mobile
        if(itemsSection) {
            itemsSection.classList.remove('order-1');
            itemsSection.classList.add('order-2');
        }
        if(formSection) {
            formSection.classList.remove('order-2');
            formSection.classList.add('order-1');
        }
    }
};

// NEW: Helper function to manage payment mode availability
window.updatePaymentAvailability = () => {
    const codInput = document.getElementById('pay-mode-cod');
    const onlineInput = document.getElementById('pay-mode-online');
    
    // Find the parent label of the COD input to apply styles
    // Since input is inside label in HTML: <label><input ...> Text</label>
    const codLabel = codInput ? codInput.parentElement : null;

    if (window.courierMode === 'indianpost' || window.courierMode === 'professional') {
        // If user is currently on COD, force switch to Online
        if(window.paymentMode === 'cod') {
            window.paymentMode = 'online';
            if(onlineInput) onlineInput.checked = true;
            window.showToast("COD not available for this courier. Switched to Online.", "error");
        }
        
        // Disable COD Input
        if(codInput) codInput.disabled = true;
        
        // Add visual cues for disabled state
        if(codLabel) {
            codLabel.classList.add('opacity-50', 'cursor-not-allowed');
            codLabel.title = "Not available for this courier";
        }
    } else {
        // Enable COD Input
        if(codInput) codInput.disabled = false;
        
        // Remove visual cues
        if(codLabel) {
            codLabel.classList.remove('opacity-50', 'cursor-not-allowed');
            codLabel.title = "";
        }
    }

    // Toggle info box visibility based on payment mode
    const infoBox = document.getElementById('online-payment-info');
    if(infoBox) {
        if(window.paymentMode === 'online') infoBox.classList.remove('hidden');
        else infoBox.classList.add('hidden');
    }
};

window.togglePaymentMode = (mode) => {
    // Prevent selecting COD if restricted couriers are active
    if(mode === 'cod' && (window.courierMode === 'indianpost' || window.courierMode === 'professional')) {
        window.showToast("COD is not available for this courier", "error");
        // Revert UI to online
        document.getElementById('pay-mode-online').checked = true;
        window.paymentMode = 'online';
        return;
    }
    window.paymentMode = mode;
    
    // Update UI visibility
    const infoBox = document.getElementById('online-payment-info');
    if(infoBox) {
        if(mode === 'online') infoBox.classList.remove('hidden');
        else infoBox.classList.add('hidden');
    }

    window.updateCartTotals();
};

window.toggleCourierMode = (mode) => {
    window.courierMode = mode;
    
    // NEW: Check and update payment availability whenever courier changes
    window.updatePaymentAvailability();
    
    window.updateCartTotals();
};

window.removeCartItem = (cartKey) => {
    if(window.cart[cartKey]) {
        delete window.cart[cartKey];
        updateCartUI();
        window.showToast("Item removed from cart");
    }
};

window.updateCartTotals = () => {
    const subtotalEl = document.getElementById('cart-subtotal-price');
    const deliveryEl = document.getElementById('cart-delivery-price');
    const totalEl = document.getElementById('cart-total-price');
    const stateInput = document.getElementById('checkout-state');
    
    if(!subtotalEl) return;

    let subtotal = 0;
    let totalWeight = 0;

    Object.values(window.cart).forEach(item => {
        const product = window.productsMap[item.productId];
        if(product) {
            let price = product.priceNew || product.price;
            let unitStr = product.unit || product.weight || '';

            if(item.variantIndex !== -1 && product.variants) {
                const v = product.variants[item.variantIndex];
                price = v.priceNew;
                unitStr = v.unit;
            }
            
            subtotal += price * item.qty;
            totalWeight += window.getWeightInKg(unitStr) * item.qty;
        }
    });

    const deliveryCharge = window.calculateDeliveryCharge(totalWeight, stateInput ? stateInput.value : '', window.paymentMode, window.courierMode);
    const grandTotal = subtotal + deliveryCharge;

    subtotalEl.innerText = "₹" + subtotal;
    if (deliveryCharge > 0) {
        deliveryEl.innerText = "+ ₹" + deliveryCharge;
        deliveryEl.classList.remove('text-gray-400');
        deliveryEl.classList.add('text-secondary');
    } else {
        deliveryEl.innerText = "₹0";
        deliveryEl.classList.add('text-gray-400');
        deliveryEl.classList.remove('text-secondary');
    }
    
    totalEl.innerText = "₹" + grandTotal;
};

const renderCartModalItems = () => {
    const container = document.getElementById('cart-items-container');
    const totalDisplay = document.getElementById('cart-total-price');
    
    if(Object.keys(window.cart).length === 0) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center py-10 opacity-50"><i class="fa-solid fa-basket-shopping text-4xl mb-2"></i><p>Your cart is empty</p></div>';
        if(totalDisplay) totalDisplay.innerText = "₹0";
        if(document.getElementById('cart-subtotal-price')) document.getElementById('cart-subtotal-price').innerText = "₹0";
        if(document.getElementById('cart-delivery-price')) document.getElementById('cart-delivery-price').innerText = "₹0";
        return;
    }
    
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

            const unitText = unit ? ` / ${unit}` : '';
            
            let img = 'https://placehold.co/50';
            if(Array.isArray(product.images) && product.images[0]) img = product.images[0];
            else if(product.image) img = product.image;

            html += `
                <div class="flex items-center gap-3 bg-gray-50 p-2 rounded-lg relative group">
                    <img src="${img}" class="w-12 h-12 object-cover rounded bg-white" loading="lazy">
                    <div class="flex-1">
                        <h5 class="font-bold text-sm text-gray-800 line-clamp-1">${product.nameEnglish || product.name}</h5>
                        <p class="text-xs text-gray-500">₹${price}${unitText} x ${item.qty}</p>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <button onclick="removeCartItem('${key}')" class="text-gray-400 hover:text-red-500 transition" title="Remove Item">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                        
                        <div class="flex items-center gap-2">
                            <button onclick="changeQty('${key}', -1)" class="w-6 h-6 rounded bg-white border text-primary font-bold shadow hover:bg-gray-100 flex items-center justify-center">-</button>
                            <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                            <button onclick="changeQty('${key}', 1)" class="w-6 h-6 rounded bg-white border text-primary font-bold shadow hover:bg-gray-100 flex items-center justify-center">+</button>
                        </div>
                    </div>
                </div>
            `;
        }
    });
    container.innerHTML = html;
    window.updateCartTotals();
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
            address: finalAddress, 
            pincode: pincode,      
            state: state,          
            items: items,
            totalAmount: total,    
            paymentMode: window.paymentMode, 
            courierMode: window.courierMode, 
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

window.getCheckoutLocation = () => {
    if (!navigator.geolocation) { window.showToast("Geolocation not supported.", "error"); return; }
    const btn = document.querySelector('button[onclick="getCheckoutLocation()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            if (data && data.display_name) {
                 document.getElementById('checkout-location').value = data.display_name;
                 window.showToast("Address Fetched!");
            } else {
                 document.getElementById('checkout-location').value = `${latitude}, ${longitude}`;
                 window.showToast("Address not found, using coordinates.");
            }
        } catch (e) {
            document.getElementById('checkout-location').value = `${latitude}, ${longitude}`;
            window.showToast("Fetch failed, using coordinates.");
        }
        btn.innerHTML = originalText;
    }, () => { window.showToast("Location access denied", "error"); btn.innerHTML = originalText; });
};

window.getProfileLocation = () => {
    if (!navigator.geolocation) { window.showToast("Geolocation not supported.", "error"); return; }
    const btn = document.querySelector('button[onclick="getProfileLocation()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            if (data && data.display_name) {
                 document.getElementById('edit-profile-location').value = data.display_name;
                 window.showToast("Address Fetched!");
            } else {
                 document.getElementById('edit-profile-location').value = `${latitude}, ${longitude}`;
                 window.showToast("Address not found, using coordinates.");
            }
        } catch (e) {
            document.getElementById('edit-profile-location').value = `${latitude}, ${longitude}`;
            window.showToast("Fetch failed, using coordinates.");
        }
        btn.innerHTML = originalText;
    }, () => { window.showToast("Location access denied", "error"); btn.innerHTML = originalText; });
};

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
                
                window.currentUserData = { 
                    name: latest.customerName, 
                    phone: latest.customerPhone, 
                    address: addr, 
                    location: loc, 
                    email: latest.email,
                    pincode: latest.pincode || '', 
                    state: latest.state || ''      
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

window.injectDynamicModals = () => {
    // 1. Inject the Modals if they don't exist
    Object.keys(infoModalData).forEach(modalId => {
        if (!document.getElementById(modalId)) {
            const data = infoModalData[modalId];
            const modalHTML = `
                <div id="${modalId}" class="fixed inset-0 z-50 hidden">
                    <div class="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" onclick="toggleModal('${modalId}', false)"></div>
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl p-4">
                        <div class="glass rounded-2xl shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto hide-scrollbar">
                            <button onclick="toggleModal('${modalId}', false)" class="absolute top-4 right-4 text-gray-400 hover:text-red-500"><i class="fa-solid fa-xmark text-xl"></i></button>
                            <h2 class="text-2xl font-bold text-primary mb-6 brand-font border-b pb-2 text-center md:text-left">${data.title}</h2>
                            <div class="text-gray-700">
                                ${data.content}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    });

    // 2. Inject Payment Link in Footer (Quick Links section)
    const footerLists = document.querySelectorAll('footer ul');
    if(footerLists.length >= 2) {
        // Usually the second list (index 1) is Quick Links
        const quickLinks = footerLists[1]; 
        
        // Check if link already exists to avoid duplicates
        if(!quickLinks.innerHTML.includes('toggleModal(\'payment-modal\'')) {
             const li = document.createElement('li');
             li.innerHTML = `<a href="#" onclick="toggleModal('payment-modal', true)" class="hover:text-secondary transition"></a>`;
             quickLinks.appendChild(li);
        }
    }
};

window.addEventListener('load', () => {
    fetchProducts();
    requestAnimationFrame(() => {
        setTimeout(() => { document.getElementById('loader-overlay').style.display = 'none'; }, 1000);
        window.injectDynamicModals(); // NEW CALL
    });
});


