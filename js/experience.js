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

// Booking Form Elements
const bookingForm = document.getElementById('booking-form');
const dateInput = document.getElementById('booking-date');
const guestsInput = document.getElementById('booking-guests');
const submitBtn = bookingForm ? bookingForm.querySelector('button[type="submit"]') : null;

// Review Element
const reviewContainer = document.getElementById('featured-review-container');

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    if (!experienceId) {
        window.location.href = 'explore.html';
        return;
    }

    // Set Date Input Min to Tomorrow
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.min = tomorrow.toISOString().split('T')[0];
    }

    // Load Data
    await fetchUser();
    await loadExperience();
    await loadFeaturedReview();
});

// 1. GET CURRENT USER (For Host Check)
async function fetchUser() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) currentUser = await res.json();
    } catch (e) {
        console.error("Auth check failed", e);
    }
}

// 2. LOAD EXPERIENCE DETAILS
async function loadExperience() {
    try {
        const res = await fetch(`${API_BASE}/experiences/${experienceId}`);
        if (!res.ok) throw new Error('Experience not found');

        currentExperience = await res.json();
        renderExperience(currentExperience);
        
        // Check if I am the host
        checkOwnerStatus();

    } catch (err) {
        console.error(err);
        if(expTitle) expTitle.textContent = "Experience not found";
    }
}

// 3. RENDER DATA TO SCREEN (Updated for Public Profile Links)
function renderExperience(exp) {
    document.title = `${exp.title} - The Shared Table Story`;
    
    if(expTitle) expTitle.textContent = exp.title;
    if(expCity) expCity.textContent = exp.city;
    if(expDesc) expDesc.textContent = exp.description;
    if(expPrice) expPrice.textContent = `$${exp.price}`;
    
    if(mainImage) {
        mainImage.src = exp.imageUrl || (exp.images && exp.images[0]) || 'https://via.placeholder.com/1200x800';
    }

    // 🔴 LINK HOST NAME TO PUBLIC PROFILE
    if(hostName) {
        hostName.innerHTML = `<a href="public-profile.html?id=${exp.hostId}" class="hover:text-orange-600 transition underline decoration-orange-200">${exp.hostName || 'Local Host'}</a>`;
    }
    
    // 🔴 LINK HOST PIC TO PUBLIC PROFILE
    if(hostPic && exp.hostPic) {
        hostPic.src = exp.hostPic;
        hostPic.style.cursor = "pointer";
        hostPic.onclick = () => window.location.href = `public-profile.html?id=${exp.hostId}`;
    }
}

// 4. CHECK OWNER (Prevent Self-Booking)
function checkOwnerStatus() {
    if (!currentUser || !currentExperience || !submitBtn) return;

    // Strict string comparison
    if (String(currentUser._id) === String(currentExperience.hostId)) {
        
        // Disable Inputs
        if(dateInput) dateInput.disabled = true;
        if(guestsInput) guestsInput.disabled = true;

        // Replace "Reserve" button with "Manage Listing" link
        const manageLink = document.createElement('a');
        manageLink.href = 'host.html';
        manageLink.className = "mt-2 w-full inline-flex items-center justify-center rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200 transition border border-gray-300";
        manageLink.innerHTML = `<i class="fas fa-edit mr-2"></i> Manage My Listing`;
        
        submitBtn.replaceWith(manageLink);
    }
}

// 5. LOAD SOCIAL PROOF (Featured Review)
async function loadFeaturedReview() {
    if (!reviewContainer) return;

    try {
        const res = await fetch(`${API_BASE}/experiences/${experienceId}/reviews`);
        const reviews = await res.json();

        if (reviews && reviews.length > 0) {
            // Sort by rating (highest first) and pick the first one
            const bestReview = reviews.sort((a, b) => b.rating - a.rating)[0];
            
            reviewContainer.innerHTML = `
                <p class="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">
                  Featured Review
                </p>
                <p class="text-sm sm:text-base italic text-slate-800 mb-3">
                  "${bestReview.comment}"
                </p>
                <p class="text-xs sm:text-sm text-slate-600">
                  — ${bestReview.authorName} <span class="text-amber-500 font-semibold">(${bestReview.rating} ★)</span>
                </p>
            `;
            reviewContainer.classList.remove('hidden');
        } else {
            // If no reviews, hide the box so it doesn't show placeholder text
            reviewContainer.classList.add('hidden');
        }
    } catch (err) {
        console.error("Failed to load reviews", err);
        reviewContainer.classList.add('hidden');
    }
}

// 6. HANDLE BOOKING SUBMISSION
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            // Redirect to login, remembering where they came from
            window.location.href = `login.html?redirect=experience.html?id=${experienceId}`;
            return;
        }

        const date = dateInput.value;
        const guests = guestsInput.value;

        if (!date) {
            alert("Please select a date.");
            return;
        }

        // UI Loading State
        submitBtn.textContent = "Processing...";
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-75', 'cursor-wait');

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
                    timeSlot: "19:00", // MVP Default
                    guestNotes: ""     // Optional future field
                })
            });

            const data = await res.json();

            if (res.ok && data.url) {
                // Redirect to Stripe Checkout
                window.location.href = data.url;
            } else {
                throw new Error(data.message || "Booking failed");
            }

        } catch (err) {
            alert(err.message);
            submitBtn.textContent = "Reserve your seat";
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-75', 'cursor-wait');
        }
    });
}