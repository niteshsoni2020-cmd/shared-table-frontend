// Frontend/js/my-bookings.js

// 🔴 THE CRITICAL FIX
const API_URL = 'https://shared-table-api.onrender.com/api';

const token = localStorage.getItem('token');
const contentArea = document.getElementById('content-area');
const tabTrips = document.getElementById('tab-trips');
const tabHosting = document.getElementById('tab-hosting');
const guestModal = document.getElementById('guest-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalList = document.getElementById('modal-guest-list');
const modalTitle = document.getElementById('modal-experience-title');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) window.location.href = 'login.html';
    loadTrips();
});

if(tabTrips) {
    tabTrips.addEventListener('click', () => {
        setActiveTab(tabTrips, tabHosting);
        loadTrips();
    });
}
if(tabHosting) {
    tabHosting.addEventListener('click', () => {
        setActiveTab(tabHosting, tabTrips);
        loadHosting();
    });
}

function setActiveTab(active, inactive) {
    active.className = 'px-6 py-3 font-medium text-orange-600 border-b-2 border-orange-600 focus:outline-none';
    inactive.className = 'px-6 py-3 font-medium text-gray-500 hover:text-orange-600 focus:outline-none';
}

async function loadTrips() {
    contentArea.innerHTML = '<div class="text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-gray-300"></i></div>';
    try {
        const res = await fetch(`${API_URL}/bookings/my-bookings`, { headers: { 'Authorization': `Bearer ${token}` } });
        const bookings = await res.json();
        if (bookings.length === 0) {
            contentArea.innerHTML = `<div class="text-center py-12"><h3 class="font-bold">No trips yet</h3><a href="explore.html" class="text-orange-600 underline">Find an Adventure</a></div>`;
            return;
        }
        contentArea.innerHTML = bookings.map(b => `
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <div class="flex items-center gap-4">
                    <img src="${(b.experience && b.experience.images && b.experience.images[0]) || 'https://via.placeholder.com/100'}" class="w-20 h-20 object-cover rounded-lg">
                    <div>
                        <h3 class="font-bold text-lg">${b.experience?.title || 'Unknown Experience'}</h3>
                        <p class="text-sm text-gray-500">${new Date(b.bookingDate).toLocaleDateString()} • ${b.guests} Guests</p>
                        <span class="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">${b.status}</span>
                    </div>
                </div>
            </div>`).join('');
    } catch (err) { contentArea.innerHTML = '<p class="text-red-500 text-center">Failed to load trips.</p>'; }
}

async function loadHosting() {
    contentArea.innerHTML = '<div class="text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-gray-300"></i></div>';
    try {
        const res = await fetch(`${API_URL}/bookings/host-bookings`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed");
        const bookings = await res.json();
        if (bookings.length === 0) {
            contentArea.innerHTML = `<div class="text-center py-12"><h3 class="font-bold">No bookings yet</h3><p>Wait for your first guest!</p></div>`;
            return;
        }
        contentArea.innerHTML = bookings.map(b => `
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <div class="flex items-center gap-4">
                     <div class="bg-orange-100 text-orange-600 w-16 h-16 rounded-lg flex items-center justify-center font-bold text-xl">${new Date(b.bookingDate).getDate()}</div>
                    <div>
                        <h3 class="font-bold text-lg">${b.experience?.title || 'Listing'}</h3>
                        <p class="text-sm text-gray-500">${new Date(b.bookingDate).toLocaleDateString()} • Earned $${b.totalPrice}</p>
                    </div>
                </div>
                <button onclick='openGuestModal(${JSON.stringify(b)})' class="bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-100 transition">
                    View Guest
                </button>
            </div>`).join('');
    } catch (err) { contentArea.innerHTML = '<p class="text-red-500 text-center">Failed to load bookings.</p>'; }
}

window.openGuestModal = function(booking) {
    if(!guestModal) return;
    modalTitle.textContent = booking.experience?.title || "Booking Details";
    const guestName = booking.user ? booking.user.name : (booking.guestName || "Unknown Guest");
    const guestEmail = booking.user ? booking.user.email : (booking.guestEmail || "No Email");
    
    modalList.innerHTML = `
        <div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <p class="font-bold text-gray-900">${guestName}</p>
            <p class="text-xs text-gray-500">${guestEmail}</p>
            <p class="text-sm mt-2">Party Size: ${booking.guests || booking.numGuests}</p>
        </div>`;
    guestModal.classList.remove('hidden');
}

if(closeModalBtn) closeModalBtn.addEventListener('click', () => guestModal.classList.add('hidden'));
if(guestModal) guestModal.addEventListener('click', (e) => { if (e.target === guestModal) guestModal.classList.add('hidden'); });