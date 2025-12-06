// js/my-bookings.js

// 🔴 CONFIG
const API_BASE = 'https://shared-table-api.onrender.com';

const tripsListEl = document.getElementById("content-area");
const tabTrips = document.getElementById("tab-trips");
const tabHost = document.getElementById("tab-hosting");

// Modal Elements
const guestModal = document.getElementById('guest-modal');
const reviewModal = document.getElementById('review-modal');

// Global User State
let currentUser = null;

function getToken() {
    return localStorage.getItem('token');
}

document.addEventListener("DOMContentLoaded", () => {
    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    // Tab Logic
    if(tabTrips) tabTrips.addEventListener("click", () => { toggleTab('trips'); loadTrips(); });
    if(tabHost) tabHost.addEventListener("click", () => { toggleTab('hosting'); loadHost(); });

    // Review Form Submit Logic (Item #56)
    const reviewForm = document.getElementById('review-form');
    if(reviewForm) {
        reviewForm.addEventListener('submit', submitReview);
    }

    // Default Load
    toggleTab('trips');
    loadTrips();
});

function toggleTab(tab) {
    if(tab === 'trips') {
        tabTrips.className = "border-orange-600 text-orange-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm";
        tabHost.className = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm";
    } else {
        tabHost.className = "border-orange-600 text-orange-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm";
        tabTrips.className = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm";
    }
}

/* ====================== GUEST TRIPS ====================== */

async function loadTrips() {
  const token = getToken();
  tripsListEl.innerHTML = `<div class="text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-gray-300"></i></div>`;

  try {
    const res = await fetch(`${API_BASE}/api/my/bookings`, { headers: { "Authorization": `Bearer ${token}` } });
    const data = await res.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      tripsListEl.innerHTML = `
        <div class="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div class="text-5xl mb-4">🌏</div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">No trips yet</h3>
            <p class="text-gray-500 mb-6">You haven't booked any experiences yet.</p>
            <a href="explore.html" class="inline-block bg-orange-600 text-white px-8 py-3 rounded-full font-bold shadow hover:bg-orange-700 transition">
                Find an Adventure
            </a>
        </div>`;
      return;
    }

    tripsListEl.innerHTML = data.map(renderTripCard).join("");
  } catch (err) {
    console.error(err);
    tripsListEl.innerHTML = `<p class="text-red-500 text-center">Failed to load trips.</p>`;
  }
}

function renderTripCard(booking) {
  const exp = booking.experience || {};
  const img = exp.imageUrl || (exp.images && exp.images[0]) || "https://via.placeholder.com/150";
  const dateObj = new Date(booking.bookingDate);
  const dateStr = dateObj.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  
  // LOGIC: Is the trip in the past?
  // We compare the booking date to "Yesterday" to handle timezones safely
  const today = new Date();
  today.setHours(0,0,0,0);
  const isPast = dateObj < today;
  const isCancelled = booking.status.includes('cancelled');

  let actionButton = '';
  let statusBadge = `<span class="px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-700">CONFIRMED</span>`;

  if (isCancelled) {
      statusBadge = `<span class="px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-700">CANCELLED</span>`;
      actionButton = `<span class="text-sm text-gray-400 italic">This booking was cancelled.</span>`;
  } else if (isPast) {
      statusBadge = `<span class="px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-600">COMPLETED</span>`;
      // ITEM #56: WRITE REVIEW BUTTON
      // Passing JSON string safely to onclick
      const safeExpId = exp.id || exp._id;
      actionButton = `
        <button onclick="openReviewModal('${booking._id}', '${safeExpId}')" 
                class="w-full md:w-auto px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg shadow hover:bg-black transition flex items-center justify-center gap-2">
            <i class="fas fa-star"></i> Write a Review
        </button>`;
  } else {
      // Future Trip
      actionButton = `
        <button onclick="cancelBooking('${booking._id}')" 
                class="w-full md:w-auto px-5 py-2 border border-red-200 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition">
            Cancel Booking
        </button>`;
  }

  return `
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 mb-4 hover:shadow-md transition">
        <div class="w-full md:w-48 h-32 md:h-auto bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
            <img src="${img}" class="w-full h-full object-cover" alt="Experience">
        </div>
        <div class="flex-grow flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-xl text-gray-900 leading-tight">${exp.title || 'Unknown Experience'}</h3>
                    ${statusBadge}
                </div>
                <div class="text-gray-500 text-sm flex flex-col gap-1">
                    <span class="flex items-center gap-2"><i class="far fa-calendar w-4"></i> ${dateStr}</span>
                    <span class="flex items-center gap-2"><i class="fas fa-user-friends w-4"></i> ${booking.guests || booking.numGuests || 1} Guests</span>
                    <span class="flex items-center gap-2"><i class="fas fa-map-marker-alt w-4"></i> ${exp.city || 'Location TBA'}</span>
                </div>
            </div>
            <div class="mt-4 md:mt-0 pt-4 md:pt-0 flex justify-end items-end">
                ${actionButton}
            </div>
        </div>
    </div>
  `;
}

// Review Logic
function openReviewModal(bookingId, expId) {
    document.getElementById('review-booking-id').value = bookingId;
    document.getElementById('review-exp-id').value = expId;
    reviewModal.classList.remove('hidden');
}

async function submitReview(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = "Posting...";
    btn.disabled = true;

    const bookingId = document.getElementById('review-booking-id').value;
    const expId = document.getElementById('review-exp-id').value;
    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-comment').value;

    try {
        const res = await fetch(`${API_BASE}/api/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                bookingId,
                experienceId: expId,
                rating: parseInt(rating),
                comment
            })
        });

        if (res.ok) {
            alert("Review posted successfully! Thank you.");
            reviewModal.classList.add('hidden');
            e.target.reset(); // Clear form
        } else {
            const data = await res.json();
            alert(data.message || "Failed to post review. You might have already reviewed this trip.");
        }
    } catch (err) {
        alert("Network error.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function cancelBooking(id) {
  if (!confirm("Are you sure? Refund policies apply.")) return;
  const token = getToken();
  
  try {
    const res = await fetch(`${API_BASE}/api/bookings/${id}/cancel`, {
      method: "POST", headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Cancelled. Refund: $${data.refund.amount}`);
      loadTrips();
    } else {
      alert("Error: " + data.message);
    }
  } catch (err) { alert("Network error."); }
}

/* ====================== HOSTING DASHBOARD ====================== */

async function loadHost() {
  const token = getToken();
  tripsListEl.innerHTML = `<div class="text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-gray-300"></i></div>`;

  try {
    const res = await fetch(`${API_BASE}/api/bookings/host-bookings`, { headers: { "Authorization": `Bearer ${token}` } });
    if(!res.ok) throw new Error("Failed");
    const bookings = await res.json();

    if (bookings.length === 0) {
       tripsListEl.innerHTML = `
        <div class="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div class="text-5xl mb-4">🍳</div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">No bookings received</h3>
            <p class="text-gray-500 mb-6">Your listings are quiet for now.</p>
            <a href="host.html" class="inline-block bg-gray-900 text-white px-8 py-3 rounded-full font-bold shadow hover:bg-black transition">Manage Listings</a>
        </div>`;
       return;
    }

    tripsListEl.innerHTML = bookings.map(b => {
        const guestName = b.guestId?.name || b.guestName || "Unknown Guest";
        return `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <div class="flex items-center gap-4 w-full">
                 <div class="bg-orange-50 text-orange-600 w-16 h-16 rounded-xl flex flex-col items-center justify-center border border-orange-100 flex-shrink-0">
                    <span class="text-xs font-bold uppercase">${new Date(b.bookingDate).toLocaleString('default', { month: 'short' })}</span>
                    <span class="text-xl font-bold">${new Date(b.bookingDate).getDate()}</span>
                 </div>
                <div>
                    <h3 class="font-bold text-lg text-gray-900">${b.experience?.title || 'Listing'}</h3>
                    <p class="text-sm text-gray-500">Guest: <span class="font-bold text-gray-700">${guestName}</span></p>
                    <div class="flex gap-4 text-xs text-gray-400 mt-1">
                        <span>Paid: $${b.amountTotal || b.pricing?.totalPrice}</span>
                        <span>•</span>
                        <span>${b.guests || b.numGuests} Pax</span>
                    </div>
                </div>
            </div>
            <button onclick='openGuestModal(${JSON.stringify(b).replace(/'/g, "&#39;")})' 
                    class="w-full md:w-auto bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition whitespace-nowrap">
                View Details
            </button>
        </div>`;
    }).join('');

  } catch (err) {
    tripsListEl.innerHTML = '<p class="text-red-500 text-center">Failed to load hosting data.</p>';
  }
}

// Guest Modal (Host View)
window.openGuestModal = function(booking) {
    if(typeof booking === 'string') booking = JSON.parse(booking);
    const titleEl = document.getElementById('modal-experience-title');
    const listEl = document.getElementById('modal-guest-list');
    
    if(titleEl) titleEl.textContent = "Booking Details";
    
    const guest = booking.guestId || booking.user || {};
    const name = guest.name || booking.guestName || "Unknown";
    const email = guest.email || booking.guestEmail || "No Email";

    if(listEl) listEl.innerHTML = `
        <div class="flex items-start gap-4">
            <div class="bg-gray-200 rounded-full w-12 h-12 flex items-center justify-center text-xl">👤</div>
            <div>
                <p class="font-bold text-lg text-gray-900">${name}</p>
                <a href="mailto:${email}" class="text-orange-600 hover:underline text-sm">${email}</a>
            </div>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg border border-gray-100 mt-4 text-sm">
             <p class="font-bold text-gray-500 text-xs uppercase mb-1">Guest Note</p>
             <p class="italic text-gray-700">${booking.guestNotes || "No notes provided."}</p>
        </div>
    `;
    
    document.getElementById('guest-modal').classList.remove('hidden');
}

document.getElementById('close-modal-btn')?.addEventListener('click', () => {
    document.getElementById('guest-modal').classList.add('hidden');
});