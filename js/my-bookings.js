// js/my-bookings.js

function getImageForExperience(exp) {
  if (exp && exp.imageUrl && exp.imageUrl.startsWith("http")) return exp.imageUrl;
  return "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2070";
}

function formatBookingDate(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// --- SWITCH TAB LOGIC ---
function switchTab(tabName) {
  const views = ['trips', 'saved', 'hosting'];
  
  views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      const btn = document.getElementById(`tab-${v}`);
      if (v === tabName) {
          el.classList.remove("hidden");
          btn.className = "pb-4 border-b-2 border-orange-600 text-orange-600 font-bold text-sm transition";
      } else {
          el.classList.add("hidden");
          btn.className = "pb-4 border-b-2 border-transparent text-gray-500 font-medium text-sm hover:text-gray-800 transition";
      }
  });

  if (tabName === 'trips') loadTrips();
  if (tabName === 'saved') loadSaved();
  if (tabName === 'hosting') loadHosting();
}

// --- LOAD SAVED (NEW) ---
async function loadSaved() {
    const grid = document.getElementById("saved-grid");
    const loading = document.getElementById("saved-loading");
    const empty = document.getElementById("saved-empty");
    
    grid.innerHTML = "";
    loading.classList.remove("hidden");
    empty.classList.add("hidden");

    const token = getToken();
    if (!token) return;

    try {
        // Fetch full details of bookmarked items
        const res = await fetch(`${API_BASE}/api/my/bookmarks/details`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const savedExps = await res.json();
        
        loading.classList.add("hidden");

        if (savedExps.length === 0) {
            empty.classList.remove("hidden");
            return;
        }

        savedExps.forEach(exp => {
            const imgSrc = getImageForExperience(exp);
            const card = document.createElement("div");
            card.className = "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer flex flex-col";
            card.onclick = () => window.location.href = `experience.html?id=${exp.id}`;
            
            card.innerHTML = `
                <div class="h-40 bg-gray-200 relative">
                    <img src="${imgSrc}" class="w-full h-full object-cover">
                    <div class="absolute top-2 right-2 bg-white rounded-full p-1 shadow">❤️</div>
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-gray-900 leading-tight">${exp.title}</h3>
                    <p class="text-xs text-gray-500 mt-1">${exp.city}</p>
                    <div class="mt-3 flex justify-between items-center">
                        <span class="font-bold text-sm">$${exp.price}</span>
                        <span class="text-orange-600 text-xs font-bold hover:underline">View ></span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (err) { console.error(err); }
}

// --- EXISTING TRIPS LOGIC ---
async function loadTrips() {
  const upcomingList = document.getElementById("upcoming-list");
  const pastList = document.getElementById("past-list");
  const content = document.getElementById("trips-content");
  
  upcomingList.innerHTML = ""; pastList.innerHTML = "";
  content.classList.remove("hidden");

  const token = getToken();
  if (!token) return;

  try {
    const [bookings, exps] = await Promise.all([
       fetch(`${API_BASE}/api/my/bookings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
       fetch(`${API_BASE}/api/experiences`).then(r => r.json())
    ]);
    const expMap = new Map(exps.map(e => [e.id, e]));
    const now = new Date();

    bookings.forEach(b => {
       const exp = expMap.get(b.experienceId);
       const isUpcoming = new Date(b.bookingDate) >= now;
       const card = createTripCard(b, exp, isUpcoming);
       if (b.status.includes('cancelled')) pastList.insertAdjacentHTML('beforeend', card); 
       else if (isUpcoming) upcomingList.insertAdjacentHTML('beforeend', card);
       else pastList.insertAdjacentHTML('beforeend', card);
    });
    if (pastList.children.length > 0) document.getElementById("past-container").classList.remove("hidden");
  } catch (err) { console.error(err); }
}

function createTripCard(booking, exp, isUpcoming) {
    const imgSrc = getImageForExperience(exp);
    const title = exp ? exp.title : "Unknown";
    const date = formatBookingDate(booking.bookingDate);
    let statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Confirmed</span>`;
    let actionBtn = "";

    if (booking.status === 'cancelled') {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Cancelled</span>`;
        actionBtn = `<div class="mt-2 text-xs text-red-600 font-bold">Refund: $${booking.refundAmount}</div>`;
    } else if (booking.status === 'cancelled_by_host') {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Host Cancelled</span>`;
        actionBtn = `<div class="mt-2 text-xs text-red-600 font-bold">Full Refund Processed</div>`;
    } else if (!isUpcoming) {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">Completed</span>`;
        actionBtn = `<button onclick="openReviewModal(${booking.id}, ${booking.experienceId}); event.stopPropagation();" class="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-sm transition">Write a Review</button>`;
    } else {
        actionBtn = `<button onclick="cancelBooking(${booking.id})" class="mt-4 w-full py-2 border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-lg text-sm transition">Cancel Booking</button>`;
    }

    return `<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition cursor-pointer" onclick="window.location.href='experience.html?id=${booking.experienceId}'"><div class="md:w-48 h-32 md:h-auto bg-gray-200 relative"><img src="${imgSrc}" class="w-full h-full object-cover"></div><div class="p-5 flex-1 flex flex-col justify-center"><div class="flex justify-between items-start mb-2"><h3 class="text-lg font-bold text-gray-900">${title}</h3>${statusBadge}</div><div class="text-sm text-gray-600 flex gap-4"><span>🗓 ${date}</span><span>👥 ${booking.numGuests} Guests</span></div>${actionBtn}</div></div>`;
}

async function cancelBooking(id) {
    if (!confirm("Are you sure? Cancellation fees may apply.")) return;
    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/api/bookings/${id}/cancel`, { method: "POST", headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) { alert("Booking Cancelled."); loadTrips(); }
        else alert("Error cancelling.");
    } catch (err) { alert("Network error"); }
}

// --- HOSTING LOGIC ---
async function loadHosting() {
  const grid = document.getElementById("hosting-grid");
  const header = document.getElementById("hosting-header");
  grid.innerHTML = ""; header.innerHTML = "";
  const token = getToken();
  if (!token) return;
  
  const userRes = await fetch(`${API_BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
  const user = await userRes.json();

  if (!user.isHost) {
      header.innerHTML = `<div class="bg-orange-50 p-6 rounded-xl border border-orange-100"><h2 class="font-bold text-orange-900">Become a Host</h2><button onclick="document.getElementById('host-modal').classList.remove('hidden')" class="mt-2 px-4 py-2 bg-orange-600 text-white rounded font-bold">Start Hosting</button></div>`;
      return;
  }
  header.innerHTML = `<div class="flex justify-between items-center bg-gray-50 p-6 rounded-xl border border-gray-200"><div><h2 class="text-lg font-bold">Your Listings</h2></div><a href="host.html" class="px-5 py-2 bg-black text-white rounded-lg font-bold text-sm">+ Create New</a></div>`;

  const res = await fetch(`${API_BASE}/api/experiences`);
  const allExps = await res.json();
  allExps.filter(e => e.hostId === user.id).forEach(exp => {
      const imgSrc = getImageForExperience(exp);
      grid.innerHTML += `<div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6"><div class="w-full md:w-48 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"><img src="${imgSrc}" class="w-full h-full object-cover"></div><div class="flex-grow"><h3 class="text-xl font-bold text-gray-900">${exp.title}</h3><p class="text-gray-500 text-sm mt-1">${exp.city}</p><div class="mt-6 pt-4 border-t border-gray-100 flex gap-4"><button onclick="window.location.href='host.html?edit=${exp.id}'" class="text-sm font-bold text-blue-600 hover:underline">Edit</button></div></div></div>`;
  });
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
    if (!getToken()) { window.location.href = "login.html?redirect=my-bookings.html"; return; }
    updateNavAuth();
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    switchTab(view === 'saved' ? 'saved' : view === 'hosting' ? 'hosting' : 'trips');
});

// Mock modal functions for review/host
function openReviewModal(b, e) { document.getElementById("review-modal").classList.remove("hidden"); }
function closeReviewModal() { document.getElementById("review-modal").classList.add("hidden"); }