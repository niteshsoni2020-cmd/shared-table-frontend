// Frontend/js/experience.js

const API_URL = 'https://the-shared-table.onrender.com/api'; 
const urlParams = new URLSearchParams(window.location.search);
const experienceId = urlParams.get('id');

// DOM Elements
const container = document.getElementById('experience-content');
const loading = document.getElementById('loading');
const bookingForm = document.getElementById('booking-form');
const bookBtn = document.getElementById('book-btn');
const actionArea = document.getElementById('booking-action-area');

let currentExperience = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!experienceId) {
        window.location.href = 'explore.html';
        return;
    }
    
    // Set Min Date to Tomorrow
    const dateInput = document.getElementById('booking-date');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];

    await fetchUser(); // Get current user ID first
    await loadExperience();
});

// 1. Fetch Current User (To check if they are the host)
async function fetchUser() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            currentUser = await res.json();
        }
    } catch (e) {
        console.error("Auth check failed", e);
    }
}

// 2. Load Experience Details
async function loadExperience() {
    try {
        const res = await fetch(`${API_URL}/experiences/${experienceId}`);
        if (!res.ok) throw new Error('Experience not found');

        currentExperience = await res.json();
        renderExperience(currentExperience);
        
        // CHECK: Is the viewer the Host?
        checkOwnerStatus();

        loading.classList.add('hidden');
        container.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        loading.innerHTML = '<p class="text-red-500">Experience not found.</p>';
    }
}

// 3. Render Data to DOM
function renderExperience(exp) {
    document.title = `${exp.title} - The Shared Table Story`;
    
    // Text Fields
    document.getElementById('exp-title').textContent = exp.title;
    document.getElementById('exp-city').innerHTML = `<i class="fas fa-map-marker-alt text-orange-500"></i> ${exp.city}`;
    document.getElementById('exp-description').textContent = exp.description;
    
    // Prices
    document.getElementById('exp-price-display').textContent = exp.price;
    document.getElementById('sidebar-price').textContent = exp.price;
    document.getElementById('sidebar-max-guests').textContent = exp.maxGuests;

    // Images
    const mainImg = document.getElementById('main-image');
    mainImg.src = exp.imageUrl || (exp.images && exp.images[0]) || 'https://via.placeholder.com/800x600';

    // Host Info
    document.getElementById('host-name').textContent = exp.hostName || 'Local Host';
    if (exp.hostPic) {
        document.getElementById('host-pic').src = exp.hostPic;
    }
}

// 4. PREVENT SELF-BOOKING (The Fix)
function checkOwnerStatus() {
    if (!currentUser || !currentExperience) return;

    // Compare IDs (String comparison to be safe)
    if (String(currentUser._id) === String(currentExperience.hostId)) {
        
        // Swap the Booking Button for a Management Message
        actionArea.innerHTML = `
            <div class="bg-gray-100 border border-gray-200 rounded-lg p-4 text-center">
                <p class="text-gray-600 font-bold mb-2">⚡ You host this experience</p>
                <a href="host.html" class="block w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
                    Manage Listing
                </a>
            </div>
        `;
        
        // Disable form inputs so they don't think they can book
        document.getElementById('booking-date').disabled = true;
        document.getElementById('booking-guests').disabled = true;
        document.getElementById('guest-notes').disabled = true;
    }
}

// 5. Handle Booking Logic
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    if (!token) {
        // Redirect to login with return URL
        window.location.href = `login.html?redirect=experience.html?id=${experienceId}`;
        return;
    }

    const date = document.getElementById('booking-date').value;
    const guests = document.getElementById('booking-guests').value;
    const notes = document.getElementById('guest-notes').value;

    if (!date) {
        alert("Please select a date.");
        return;
    }

    // Show Loading
    bookBtn.textContent = "Processing...";
    bookBtn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/experiences/${experienceId}/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                numGuests: guests,
                bookingDate: date,
                timeSlot: "19:00", // Default for MVP
                guestNotes: notes // Sending notes to backend
            })
        });

        const data = await res.json();

        if (res.ok && data.url) {
            window.location.href = data.url; // Redirect to Stripe
        } else {
            throw new Error(data.message || "Booking failed");
        }

    } catch (err) {
        alert(err.message);
        bookBtn.textContent = "Reserve my spot";
        bookBtn.disabled = false;
    }
});