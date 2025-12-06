// Frontend/js/experience.js

// 🔴 CONFIGURATION
const API_BASE = 'https://shared-table-api.onrender.com/api'; 

// URL Params
const urlParams = new URLSearchParams(window.location.search);
const experienceId = urlParams.get('id');

// Global State
let currentExperience = null;
let currentUser = null;

// DOM Elements
const expTitle = document.getElementById('exp-title');
const expCity = document.getElementById('exp-city');
const expDesc = document.getElementById('exp-description');
const mainImage = document.getElementById('main-image');
const expPrice = document.getElementById('exp-price');
const hostName = document.getElementById('host-name');
const hostPic = document.getElementById('host-pic');
const expMenu = document.getElementById('exp-menu');
const menuSection = document.getElementById('menu-section');

// Booking Form Elements
const bookingForm = document.getElementById('booking-form');
const dateInput = document.getElementById('booking-date');
const guestsInput = document.getElementById('guest-count');
const submitBtn = document.getElementById('book-btn');

// Review & Similar Elements
const reviewContainer = document.getElementById('featured-review-container');
const similarSection = document.getElementById('similar-section');
const similarGrid = document.getElementById('similar-grid');

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    if (!experienceId) return;

    // Set Date Input Min to Tomorrow
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.min = tomorrow.toISOString().split('T')[0];
    }

    // Load Data Sequence
    await fetchUser();
    await loadExperience();
    await loadFeaturedReview();
    await loadSimilarExperiences(); // <--- NEW (Item #55)
});

// 1. GET CURRENT USER
async function fetchUser() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) currentUser = await res.json();
    } catch (e) { console.error("Auth check failed", e); }
}

// 2. LOAD EXPERIENCE DETAILS
async function loadExperience() {
    try {
        const res = await fetch(`${API_BASE}/experiences/${experienceId}`);
        if (!res.ok) throw new Error('Experience not found');

        currentExperience = await res.json();
        renderExperience(currentExperience);
        
        // Initialize Pricing Logic
        setupPricingLogic(currentExperience.price);

        // Check if I am the host
        checkOwnerStatus();

    } catch (err) {
        console.error(err);
        if(expTitle) expTitle.textContent = "Experience not found";
    }
}

// 3. RENDER DATA
function renderExperience(exp) {
    document.title = `${exp.title} - The Shared Table Story`;
    
    if(expTitle) expTitle.textContent = exp.title;
    if(expCity) expCity.textContent = exp.city;
    if(expDesc) expDesc.textContent = exp.description;
    if(expPrice) expPrice.textContent = `${exp.price}`;
    
    if(mainImage) {
        mainImage.src = exp.imageUrl || (exp.images && exp.images[0]) || 'https://via.placeholder.com/1200x800';
    }

    if(exp.menu && menuSection && expMenu) {
        menuSection.classList.remove('hidden');
        expMenu.textContent = exp.menu;
    }

    if(hostName) {
        hostName.innerHTML = `<a href="public-profile.html?id=${exp.hostId}" class="hover:text-orange-600 transition underline decoration-orange-200">${exp.hostName || 'Local Host'}</a>`;
    }
    
    if(hostPic) {
        hostPic.src = exp.hostPic || 'https://via.placeholder.com/150';
        hostPic.style.cursor = "pointer";
        hostPic.onclick = () => window.location.href = `public-profile.html?id=${exp.hostId}`;
    }
}

// 4. PRICING LOGIC
function setupPricingLogic(basePrice) {
    if(!guestsInput) return;

    const breakdownBox = document.getElementById('price-breakdown');
    const elMathBase = document.getElementById('math-base');
    const elMathSubtotal = document.getElementById('math-subtotal');
    const elDiscountRow = document.getElementById('math-discount-row');
    const elMathDiscount = document.getElementById('math-discount');
    const elMathTotal = document.getElementById('math-total');
    const elBadge = document.getElementById('discount-badge');

    function calculate() {
        const guests = parseInt(guestsInput.value) || 1;
        const subtotal = basePrice * guests;
        let discount = 0;

        if (guests >= 3) {
            discount = subtotal * 0.10;
            if(elDiscountRow) elDiscountRow.classList.remove('hidden');
            if(elBadge) elBadge.classList.remove('hidden');
        } else {
            if(elDiscountRow) elDiscountRow.classList.add('hidden');
            if(elBadge) elBadge.classList.add('hidden');
        }

        const total = subtotal - discount;

        if(breakdownBox) breakdownBox.classList.remove('hidden');
        if(elMathBase) elMathBase.textContent = `$${basePrice} x ${guests}`;
        if(elMathSubtotal) elMathSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        if(elMathDiscount) elMathDiscount.textContent = `-$${discount.toFixed(2)}`;
        if(elMathTotal) elMathTotal.textContent = `$${total.toFixed(2)}`;
    }

    guestsInput.addEventListener('change', calculate);
    calculate();
}

// 5. CHECK OWNER
function checkOwnerStatus() {
    if (!currentUser || !currentExperience || !submitBtn) return;
    if (String(currentUser._id) === String(currentExperience.hostId)) {
        if(dateInput) dateInput.disabled = true;
        if(guestsInput) guestsInput.disabled = true;
        submitBtn.outerHTML = `
            <a href="host.html" class="mt-2 w-full inline-flex items-center justify-center rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200 transition border border-gray-300">
                <i class="fas fa-edit mr-2"></i> Manage My Listing
            </a>
        `;
    }
}

// 6. LOAD SOCIAL PROOF
async function loadFeaturedReview() {
    if (!reviewContainer) return;
    try {
        const res = await fetch(`${API_BASE}/experiences/${experienceId}/reviews`);
        const reviews = await res.json();

        if (reviews && reviews.length > 0) {
            const bestReview = reviews.sort((a, b) => b.rating - a.rating)[0];
            reviewContainer.innerHTML = `
                <p class="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Featured Review</p>
                <p class="text-sm sm:text-base italic text-slate-800 mb-3">"${bestReview.comment}"</p>
                <p class="text-xs sm:text-sm text-slate-600">— ${bestReview.authorName} <span class="text-amber-500 font-semibold">(${bestReview.rating} ★)</span></p>
            `;
            reviewContainer.classList.remove('hidden');
        } else {
            reviewContainer.classList.add('hidden');
        }
    } catch (err) {
        console.error("Failed to load reviews", err);
        reviewContainer.classList.add('hidden');
    }
}

// 7. LOAD RECOMMENDATIONS (Item #55)
async function loadSimilarExperiences() {
    if (!similarSection || !similarGrid) return;

    try {
        const res = await fetch(`${API_BASE}/experiences/${experienceId}/similar`);
        if (!res.ok) return;

        const similarExps = await res.json();

        if (similarExps && similarExps.length > 0) {
            similarSection.classList.remove('hidden');
            similarGrid.innerHTML = similarExps.map(exp => {
                const img = exp.imageUrl || (exp.images && exp.images[0]) || "https://via.placeholder.com/400x300";
                return `
                <a href="experience.html?id=${exp._id}" class="group block bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100">
                    <div class="h-40 bg-gray-200 relative overflow-hidden">
                        <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                        <div class="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold">$${exp.price}</div>
                    </div>
                    <div class="p-4">
                        <h4 class="font-bold text-gray-900 truncate mb-1 group-hover:text-orange-600 transition">${exp.title}</h4>
                        <p class="text-xs text-gray-500 flex items-center gap-1">
                            <i class="fas fa-map-marker-alt"></i> ${exp.city}
                        </p>
                    </div>
                </a>`;
            }).join('');
        }
    } catch (err) {
        console.error("Failed to load similar items", err);
    }
}

// 8. HANDLE BOOKING
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const termsBox = document.getElementById('booking-terms');
        if (termsBox && !termsBox.checked) {
            alert("Please agree to the Cancellation Policy to continue.");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            const returnUrl = encodeURIComponent(window.location.href);
            window.location.href = `login.html?redirect=${returnUrl}`;
            return;
        }

        const date = dateInput.value;
        const guests = guestsInput.value;

        if (!date) {
            alert("Please select a date.");
            return;
        }

        const btn = document.getElementById('book-btn');
        const originalText = btn.innerText;
        btn.innerText = "Processing...";
        btn.disabled = true;
        btn.classList.add('opacity-75', 'cursor-wait');

        try {
            const res = await fetch(`${API_BASE}/experiences/${experienceId}/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    numGuests: guests,
                    bookingDate: date,
                    timeSlot: "19:00", 
                    guestNotes: ""     
                })
            });

            const data = await res.json();

            if (res.ok && data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.message || "Booking failed");
            }

        } catch (err) {
            alert(err.message);
            btn.innerText = originalText;
            btn.disabled = false;
            btn.classList.remove('opacity-75', 'cursor-wait');
        }
    });
}