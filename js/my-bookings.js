// js/my-bookings.js

// 🔴 THE CORRECT BACKEND URL
const API_BASE = 'https://shared-table-api.onrender.com';

const tripsListEl = document.getElementById("content-area"); // Reusing your content area ID
const tabTrips = document.getElementById("tab-trips");
const tabHost = document.getElementById("tab-hosting"); // Matches your HTML ID

// Modal Elements
const guestModal = document.getElementById('guest-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalList = document.getElementById('modal-guest-list');
const modalTitle = document.getElementById('modal-experience-title');

let currentUser = null;

// Helper: Get Token
function getToken() {
    return localStorage.getItem('token');
}

// Helper: Show Modal (using alert for simple errors, or your custom modal for guests)
function showalert(msg) { alert(msg); } 

function setActiveTab(active, inactive) {
  if (!active || !inactive) return;
  
  active.className = 'px-6 py-3 font-medium text-orange-600 border-b-2 border-orange-600 focus:outline-none';
  inactive.className = 'px-6 py-3 font-medium text-gray-500 hover:text-orange-600 focus:outline-none';
}

async function fetchCurrentUser() {
  const token = getToken();
  if (!token) return null;

  try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return await res.json();
  } catch(e) { return null; }
}

/* ====================== TRIPS (GUEST BOOKINGS) ====================== */

async function loadTrips() {
  const token = getToken();
  if (!token || !tripsListEl) return;

  tripsListEl.innerHTML = `
    <div class="text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-gray-300"></i></div>
  `;

  try {
    const res = await fetch(`${API_BASE}/api/my/bookings`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      tripsListEl.innerHTML = `
        <div class="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div class="text-4xl mb-4">🎒</div>
            <h3 class="text-lg font-bold text-gray-900">No trips yet</h3>
            <p class="text-gray-500 mb-6">You haven't booked any experiences.</p>
            <a href="explore.html" class="bg-orange-600 text-white px-6 py-2 rounded-full font-medium hover:bg-orange-700 transition">
                Find an Adventure
            </a>
        </div>
      `;
      return;
    }

    tripsListEl.innerHTML = data.map(renderTripCard).join("");
  } catch (err) {
    console.error("Error loading trips:", err);
    tripsListEl.innerHTML = `<p class="text-red-500 text-center">Failed to load trips.</p>`;
  }
}

function renderTripCard(booking) {
  const exp = booking.experience || {};
  const img = exp.imageUrl || (exp.images && exp.images[0]) || "https://via.placeholder.com/100";
  const date = booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : "TBA";
  
  return `
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <div class="flex items-center gap-4">
            <img src="${img}" class="w-20 h-20 object-cover rounded-lg bg-gray-100" alt="Experience">
            <div>
                <h3 class="font-bold text-lg text-gray-900">${exp.title || 'Unknown Experience'}</h3>
                <p class="text-sm text-gray-500">
                    <i class="far fa-calendar mr-1"></i> ${date}
                    <span class="mx-2">•</span>
                    <i class="fas fa-user-friends mr-1"></i> ${booking.guests || booking.numGuests} Guests
                </p>
                <span class="inline-block mt-2 px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-700">
                    ${booking.status.toUpperCase()}
                </span>
            </div>
        </div>
        <div class="text-right flex flex-col gap-2">
            <p class="font-bold text-xl text-gray-900">$${booking.totalPrice || booking.pricing?.totalPrice}</p>
            <button onclick="cancelBooking('${booking._id}')" 
                    class="text-sm text-red-500 hover:text-red-700 underline">
                Cancel Booking
            </button>
        </div>
    </div>
  `;
}

async function cancelBooking(id) {
  if (!confirm("Are you sure you want to cancel? Refund policies apply.")) return;
  const token = getToken();
  
  try {
    const res = await fetch(`${API_BASE}/api/bookings/${id}/cancel`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (res.ok) {
      alert(`Booking Cancelled. Refund: $${data.refund.amount}`);
      loadTrips();
    } else {
      alert("Error: " + data.message);
    }
  } catch (err) {
    alert("Network error.");
  }
}

/* ====================== HOSTING ====================== */

async function loadHost() {
  const token = getToken();
  if (!token) return;

  tripsListEl.innerHTML = `<div class="text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-gray-300"></i></div>`;

  try {
    const res = await fetch(`${API_BASE}/api/bookings/host-bookings`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    
    // Fallback if that route fails, try getting experiences first
    if(!res.ok) throw new Error("Failed to fetch bookings");
    
    const bookings = await res.json();

    if (bookings.length === 0) {
       tripsListEl.innerHTML = `
        <div class="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div class="text-4xl mb-4">🍳</div>
            <h3 class="text-lg font-bold text-gray-900">No bookings yet</h3>
            <p class="text-gray-500 mb-6">You haven't received any guests yet.</p>
            <a href="host.html" class="bg-gray-900 text-white px-6 py-2 rounded-full font-medium hover:bg-gray-800 transition">
                Manage Listings
            </a>
        </div>`;
       return;
    }

    tripsListEl.innerHTML = bookings.map(b => `
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <div class="flex items-center gap-4">
                 <div class="bg-orange-100 text-orange-600 w-16 h-16 rounded-lg flex items-center justify-center font-bold text-xl">
                    ${new Date(b.bookingDate).getDate()}
                 </div>
                <div>
                    <h3 class="font-bold text-lg text-gray-900">${b.experience?.title || 'Listing'}</h3>
                    <p class="text-sm text-gray-500">
                        <i class="far fa-calendar mr-1"></i> ${new Date(b.bookingDate).toLocaleDateString()}
                        <span class="mx-2">•</span>
                        Earned: <span class="text-green-600 font-bold">$${b.totalPrice}</span>
                    </p>
                </div>
            </div>
            <button onclick='openGuestModal(${JSON.stringify(b).replace(/'/g, "&#39;")})' 
                    class="bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-100 transition flex items-center gap-2">
                <i class="fas fa-list-ul"></i> View Guest
            </button>
        </div>
    `).join('');

  } catch (err) {
    console.error(err);
    tripsListEl.innerHTML = '<p class="text-red-500 text-center">Failed to load host dashboard.</p>';
  }
}

// Modal Logic
window.openGuestModal = function(booking) {
    if(!guestModal) return;
    
    // Safety check if booking is string (sometimes happens with onclick)
    if(typeof booking === 'string') booking = JSON.parse(booking);

    modalTitle.textContent = booking.experience?.title || "Booking Details";
    
    // Try to find the guest info from various populated fields
    const guest = booking.guestId || booking.user || {};
    const name = guest.name || booking.guestName || "Unknown Guest";
    const email = guest.email || booking.guestEmail || "No Email";
    const guestsCount = booking.guests || booking.numGuests || 1;

    modalList.innerHTML = `
        <div class="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
                <p class="font-bold text-gray-900 text-lg">${name}</p>
                <p class="text-sm text-gray-500">${email}</p>
                <a href="mailto:${email}" class="text-xs text-orange-600 hover:underline mt-1 block">Send Email</a>
            </div>
            <div class="text-right">
                <span class="block text-2xl font-bold text-orange-600">${guestsCount}</span>
                <span class="text-xs text-gray-500 uppercase tracking-wide">Guests</span>
            </div>
        </div>
        <div class="mt-4 border-t border-gray-100 pt-4">
             <p class="text-xs font-bold text-gray-500 uppercase mb-2">Guest Notes</p>
             <p class="text-sm text-gray-700 italic bg-white p-3 rounded border border-gray-100">
                ${booking.guestNotes || "No notes provided."}
             </p>
        </div>
    `;
    
    guestModal.classList.remove('hidden');
}

document.addEventListener("DOMContentLoaded", () => {
    // Auth Check
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Tab Listeners
    if(tabTrips) {
        tabTrips.addEventListener("click", () => {
            setActiveTab(tabTrips, tabHost);
            loadTrips();
        });
    }
    
    if(tabHost) {
        tabHost.addEventListener("click", () => {
            setActiveTab(tabHost, tabTrips);
            loadHost();
        });
    }
    
    // Modal Close
    if(closeModalBtn) {
        closeModalBtn.addEventListener('click', () => guestModal.classList.add('hidden'));
    }
    if(guestModal) {
        guestModal.addEventListener('click', (e) => {
            if(e.target === guestModal) guestModal.classList.add('hidden');
        });
    }

    // Default Load
    loadTrips();
});