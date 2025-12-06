// Frontend/js/experience.js

// 🔴 THE CRITICAL FIX
const API_URL = 'https://shared-table-api.onrender.com/api';

const urlParams = new URLSearchParams(window.location.search);
const experienceId = urlParams.get('id');
const container = document.getElementById('experience-content');
const loading = document.getElementById('loading');
const bookingForm = document.getElementById('booking-form');
const bookBtn = document.getElementById('book-btn');
const actionArea = document.getElementById('booking-action-area');
let currentExperience = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!experienceId) { window.location.href = 'explore.html'; return; }
    
    // Set Min Date
    const dateInput = document.getElementById('booking-date');
    if(dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.min = tomorrow.toISOString().split('T')[0];
    }

    await fetchUser();
    await loadExperience();
});

async function fetchUser() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) currentUser = await res.json();
    } catch (e) {}
}

async function loadExperience() {
    try {
        const res = await fetch(`${API_URL}/experiences/${experienceId}`);
        if (!res.ok) throw new Error('Experience not found');
        currentExperience = await res.json();
        renderExperience(currentExperience);
        checkOwnerStatus();
        loading.classList.add('hidden');
        container.classList.remove('hidden');
    } catch (err) {
        loading.innerHTML = '<p class="text-red-500">Experience not found.</p>';
    }
}

function renderExperience(exp) {
    document.title = `${exp.title} - The Shared Table Story`;
    document.getElementById('exp-title').textContent = exp.title;
    document.getElementById('exp-city').innerHTML = `<i class="fas fa-map-marker-alt text-orange-500"></i> ${exp.city}`;
    document.getElementById('exp-description').textContent = exp.description;
    document.getElementById('exp-price-display').textContent = exp.price;
    document.getElementById('sidebar-price').textContent = exp.price;
    document.getElementById('sidebar-max-guests').textContent = exp.maxGuests;
    
    const mainImg = document.getElementById('main-image');
    mainImg.src = exp.imageUrl || (exp.images && exp.images[0]) || 'https://via.placeholder.com/800x600';
    
    document.getElementById('host-name').textContent = exp.hostName || 'Local Host';
    if (exp.hostPic) document.getElementById('host-pic').src = exp.hostPic;
}

function checkOwnerStatus() {
    if (!currentUser || !currentExperience || !actionArea) return;
    if (String(currentUser._id) === String(currentExperience.hostId)) {
        actionArea.innerHTML = `
            <div class="bg-gray-100 border border-gray-200 rounded-lg p-4 text-center">
                <p class="text-gray-600 font-bold mb-2">⚡ You host this experience</p>
                <a href="host.html" class="block w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800">Manage Listing</a>
            </div>`;
        const dateInput = document.getElementById('booking-date');
        if(dateInput) dateInput.disabled = true;
        const guestsInput = document.getElementById('booking-guests');
        if(guestsInput) guestsInput.disabled = true;
        const notesInput = document.getElementById('guest-notes');
        if(notesInput) notesInput.disabled = true;
    }
}

if(bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = `login.html?redirect=experience.html?id=${experienceId}`;
            return;
        }
        const date = document.getElementById('booking-date').value;
        const guests = document.getElementById('booking-guests').value;
        const notes = document.getElementById('guest-notes').value;
        if (!date) { alert("Please select a date."); return; }

        bookBtn.textContent = "Processing...";
        bookBtn.disabled = true;

        try {
            const res = await fetch(`${API_URL}/experiences/${experienceId}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ numGuests: guests, bookingDate: date, timeSlot: "19:00", guestNotes: notes })
            });
            const data = await res.json();
            if (res.ok && data.url) { window.location.href = data.url; } 
            else { throw new Error(data.message || "Booking failed"); }
        } catch (err) {
            alert(err.message);
            bookBtn.textContent = "Reserve my spot";
            bookBtn.disabled = false;
        }
    });
}