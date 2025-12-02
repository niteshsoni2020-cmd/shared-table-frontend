// js/my-bookings.js

// --- HELPER: Image Optimization ---
function getImageForExperience(exp) {
  if (exp.imageUrl && exp.imageUrl.includes("cloudinary.com")) {
    return exp.imageUrl.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/');
  }
  if (exp.imageUrl && exp.imageUrl.startsWith("http")) return exp.imageUrl;
  return "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=400&auto=format&fit=crop";
}

function formatBookingDate(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// --- SWITCH TAB ---
function switchTab(tabName) {
  const views = ['trips', 'saved', 'hosting'];
  views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      const btn = document.getElementById(`tab-${v}`);
      if (v === tabName) {
          el.classList.remove("hidden");
          btn.className = "pb-4 border-b-2 border-orange-600 text-orange-600 font-bold text-sm whitespace-nowrap transition";
      } else {
          el.classList.add("hidden");
          btn.className = "pb-4 border-b-2 border-transparent text-gray-500 font-medium text-sm whitespace-nowrap hover:text-gray-800 transition";
      }
  });
  if (tabName === 'trips') loadTrips();
  if (tabName === 'saved') loadSaved();
  if (tabName === 'hosting') loadHosting();
}

// --- TRIPS LOGIC ---
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
    if (upcomingList.children.length === 0 && pastList.children.length === 0) {
        document.getElementById("trips-content").classList.add("hidden");
        document.getElementById("trips-empty").classList.remove("hidden");
    }
  } catch (err) { console.error(err); }
}

function createTripCard(booking, exp, isUpcoming) {
    const imgSrc = getImageForExperience(exp || {});
    const title = exp ? exp.title : "Unknown Experience";
    const date = formatBookingDate(booking.bookingDate);
    
    let statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Confirmed</span>`;
    let actionBtn = "";

    // 1. CANCELLED STATE
    if (booking.status.includes('cancelled')) {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Cancelled</span>`;
        actionBtn = `<div class="mt-4 text-xs text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100 text-center">Refund: $${booking.refundAmount}</div>`;
    } 
    // 2. PAST TRIP STATE
    else if (!isUpcoming) {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">Completed</span>`;
        // Add Report Issue Button for past trips
        actionBtn = `
        <div class="mt-4 grid grid-cols-2 gap-2">
            <button onclick="openReviewModal('${booking.id}', '${booking.experienceId}')" class="py-2 bg-gray-900 text-white font-bold rounded-lg text-xs hover:bg-black transition">Write Review</button>
            <button onclick="reportIssue('${booking.id}')" class="py-2 border border-gray-300 text-gray-600 font-bold rounded-lg text-xs hover:bg-gray-50 transition">Report Issue</button>
        </div>`;
    } 
    // 3. UPCOMING TRIP STATE
    else {
        // Add Reschedule Button
        actionBtn = `
        <div class="mt-4 grid grid-cols-2 gap-2">
            <button onclick="rescheduleBooking('${booking.id}', '${booking.experienceId}')" class="py-2 border border-blue-200 text-blue-600 hover:bg-blue-50 font-bold rounded-lg text-xs transition">Change Date</button>
            <button onclick="cancelBooking('${booking.id}')" class="py-2 border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-lg text-xs transition">Cancel</button>
        </div>`;
    }

    return `<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition cursor-pointer group" onclick="window.location.href='experience.html?id=${booking.experienceId}'">
        <div class="md:w-48 h-48 md:h-auto bg-gray-200 relative overflow-hidden">
            <img src="${imgSrc}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
        </div>
        <div class="p-6 flex-1 flex flex-col justify-center">
           <div class="flex justify-between items-start mb-2">
              <h3 class="text-lg font-bold text-gray-900">${title}</h3>
              ${statusBadge}
           </div>
           <div class="text-sm text-gray-600 flex gap-6 mt-2">
               <span class="flex items-center gap-1">📅 ${date}</span>
               <span class="flex items-center gap-1">⏰ ${booking.timeSlot || 'Anytime'}</span>
               <span class="flex items-center gap-1">👥 ${booking.numGuests} Guests</span>
           </div>
           ${actionBtn}
        </div>
    </div>`;
}

// --- NEW FEATURES: RESCHEDULE & REPORT ---

async function rescheduleBooking(bookingId, expId) {
    const newDate = prompt("Enter new date (YYYY-MM-DD):");
    if (!newDate) return;
    
    // In a real app, we would fetch available slots for that date first.
    // For MVP, we ask the user to type the time.
    const newSlot = prompt("Enter new time (e.g., 18:00-20:00):");
    if (!newSlot) return;

    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/reschedule`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ newDate, newSlot })
        });
        const data = await res.json();
        if (res.ok) {
            showModal("Success", "Booking rescheduled!", "success");
            loadTrips();
        } else {
            showModal("Failed", data.message, "error");
        }
    } catch(e) { showModal("Error", "Network error.", "error"); }
}

async function reportIssue(bookingId) {
    const reason = prompt("Please describe the issue with this experience:");
    if (!reason) return;

    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ reason })
        });
        if (res.ok) showModal("Report Sent", "Our team will review your case.", "info");
    } catch(e) { showModal("Error", "Could not send report.", "error"); }
}

async function cancelBooking(id) {
    if (!confirm("Are you sure? Cancellation fees may apply based on timing.")) return;
    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/api/bookings/${id}/cancel`, { method: "POST", headers: { "Authorization": `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) { 
            showModal("Booking Cancelled", `Refund Amount: $${data.refund.amount} (${data.refund.reason})`, "info");
            loadTrips(); 
        } else showModal("Error", data.message, "error");
    } catch (err) { showModal("Error", "Network error", "error"); }
}

// --- HOSTING & SAVED LOGIC (Unchanged but included for file completeness) ---
async function loadSaved() {
    const grid = document.getElementById("saved-grid");
    const loading = document.getElementById("saved-loading");
    const empty = document.getElementById("saved-empty");
    grid.innerHTML = ""; loading.classList.remove("hidden"); empty.classList.add("hidden");
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch(`${API_BASE}/api/my/bookmarks/details`, { headers: { "Authorization": `Bearer ${token}` } });
        const savedExps = await res.json();
        loading.classList.add("hidden");
        if (savedExps.length === 0) { empty.classList.remove("hidden"); return; }
        savedExps.forEach(exp => {
            const imgSrc = getImageForExperience(exp);
            const card = document.createElement("div");
            card.className = "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer flex flex-col group";
            card.onclick = () => window.location.href = `experience.html?id=${exp.id}`;
            card.innerHTML = `<div class="h-48 bg-gray-200 relative overflow-hidden"><img src="${imgSrc}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500"><div class="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow-md text-red-500">❤️</div></div><div class="p-5"><h3 class="font-bold text-gray-900 leading-tight text-lg mb-1">${exp.title}</h3><p class="text-sm text-gray-500 mb-3">${exp.city}</p><div class="flex justify-between items-center pt-3 border-t border-gray-50"><span class="font-bold text-gray-900">$${exp.price} <span class="text-xs font-normal text-gray-500">/ person</span></span><span class="text-orange-600 text-sm font-bold hover:underline">View</span></div></div>`;
            grid.appendChild(card);
        });
    } catch (err) { console.error(err); }
}

async function loadHosting() {
  const grid = document.getElementById("hosting-grid");
  const header = document.getElementById("hosting-header");
  grid.innerHTML = ""; header.innerHTML = "";
  const token = getToken();
  if (!token) return;
  const userRes = await fetch(`${API_BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
  const user = await userRes.json();
  if (!user.isHost) {
      header.innerHTML = `<div class="bg-gradient-to-r from-orange-50 to-white p-8 rounded-2xl border border-orange-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"><div><h2 class="text-2xl font-bold text-orange-900 mb-2">Become a Host</h2><p class="text-orange-800">Share your passion and earn money. We just need your Australian payout details.</p></div><button onclick="document.getElementById('host-modal').classList.remove('hidden')" class="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700 transition transform hover:scale-105">Start Hosting</button></div>`;
      return;
  }
  header.innerHTML = `<div class="flex justify-between items-center bg-gray-50 p-6 rounded-xl border border-gray-200"><div><h2 class="text-lg font-bold text-gray-900">Your Listings</h2><p class="text-sm text-gray-500">Manage your experiences</p></div><a href="host.html" class="px-5 py-2.5 bg-black text-white rounded-lg font-bold text-sm shadow hover:bg-gray-800 transition">+ Create New</a></div>`;
  const res = await fetch(`${API_BASE}/api/experiences`);
  const allExps = await res.json();
  const myListings = allExps.filter(e => e.hostId === user.id);
  if(myListings.length === 0) { document.getElementById("hosting-empty").classList.remove("hidden"); return; }
  myListings.forEach(exp => {
      const imgSrc = getImageForExperience(exp);
      const card = document.createElement("div");
      card.className = "bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition";
      card.innerHTML = `<div class="w-full md:w-48 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"><img src="${imgSrc}" class="w-full h-full object-cover"></div><div class="flex-grow flex flex-col justify-between"><div><div class="flex justify-between items-start"><h3 class="text-xl font-bold text-gray-900">${exp.title}</h3><div class="flex items-center text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">Active</div></div><p class="text-gray-500 text-sm mt-1">${exp.city}</p></div><div class="flex flex-wrap gap-3 border-t border-gray-100 pt-4 mt-4"><button onclick="viewGuestList('${exp.id}', '${exp.title}')" class="flex-1 py-2 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-lg shadow transition">👥 Guest List</button><button onclick="window.location.href='host.html?edit=${exp.id}'" class="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-lg transition">Edit</button><button onclick="window.location.href='experience.html?id=${exp.id}'" class="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-lg transition">View</button><button onclick="deleteListing('${exp.id}')" class="px-4 py-2 text-red-500 hover:bg-red-50 text-sm font-bold rounded-lg transition">Delete</button></div></div>`;
      grid.appendChild(card);
  });
}

// --- GUEST LIST MODAL ---
async function viewGuestList(expId, title) {
    const token = getToken();
    let modal = document.getElementById('guest-list-modal');
    if (!modal) {
        const html = `<div id="guest-list-modal" class="fixed inset-0 bg-black/60 z-[100] hidden flex items-center justify-center p-4 backdrop-blur-sm"><div class="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"><div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50"><div><h2 class="text-xl font-bold text-gray-900" id="guest-modal-title"></h2><p class="text-xs text-gray-500">Upcoming guests for this experience</p></div><button onclick="document.getElementById('guest-list-modal').classList.add('hidden')" class="text-gray-400 hover:text-gray-900 text-2xl">&times;</button></div><div class="p-0 overflow-y-auto flex-1"><table class="w-full text-left text-sm"><thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs"><tr><th class="px-6 py-3">Guest</th><th class="px-6 py-3">Date</th><th class="px-6 py-3">Pax</th><th class="px-6 py-3">Contact</th></tr></thead><tbody id="guest-list-body" class="divide-y divide-gray-100"></tbody></table><div id="guest-list-empty" class="hidden p-8 text-center text-gray-400">No bookings yet.</div></div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('guest-list-modal');
    }
    document.getElementById('guest-modal-title').textContent = title;
    const tbody = document.getElementById('guest-list-body');
    const empty = document.getElementById('guest-list-empty');
    tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Loading...</td></tr>';
    modal.classList.remove('hidden');
    try {
        const res = await fetch(`${API_BASE}/api/host/bookings/${expId}`, { headers: { Authorization: `Bearer ${token}` } });
        const bookings = await res.json();
        tbody.innerHTML = "";
        if(bookings.length === 0) { empty.classList.remove('hidden'); } else {
            empty.classList.add('hidden');
            tbody.innerHTML = bookings.map(b => {
                const guestName = b.guestId ? b.guestId.name : (b.guestName || "Unknown");
                const guestEmail = b.guestId ? b.guestId.email : (b.guestEmail || "-");
                return `<tr class="hover:bg-gray-50 transition"><td class="px-6 py-4 font-bold text-gray-900">${guestName}</td><td class="px-6 py-4 text-gray-600">${formatBookingDate(b.bookingDate)}<br><span class="text-xs text-gray-400">${b.timeSlot}</span></td><td class="px-6 py-4 font-mono text-gray-600">${b.numGuests}</td><td class="px-6 py-4 text-blue-600 hover:underline"><a href="mailto:${guestEmail}">${guestEmail}</a></td></tr>`;
            }).join('');
        }
    } catch(e) { tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Error loading guests.</td></tr>'; }
}

async function deleteListing(id) {
  if (!confirm("Delete this listing?")) return;
  const token = getToken();
  try { const res = await fetch(`${API_BASE}/api/experiences/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); if (res.ok) loadHosting(); } catch (err) { alert("Network error"); }
}

document.getElementById("host-onboard-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const token = getToken();
    const body = { accountName: document.getElementById("bank-name").value, bsb: document.getElementById("bank-bsb").value, accountNumber: document.getElementById("bank-acc").value, declarationAgreed: document.getElementById("host-declare").checked };
    try { const res = await fetch(`${API_BASE}/api/host/onboard`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }); if (res.ok) { showModal("Success!", "You are now a Verified Host.", "success"); document.getElementById("host-modal").classList.add("hidden"); loadHosting(); } else { const data = await res.json(); showModal("Error", data.message, "error"); } } catch (err) { showModal("Error", "Network error", "error"); }
});

document.addEventListener("DOMContentLoaded", () => {
    if (!getToken()) { window.location.href = "login.html?redirect=my-bookings.html"; return; }
    updateNavAuth();
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    switchTab(view === 'saved' ? 'saved' : view === 'hosting' ? 'hosting' : 'trips');
});

function openReviewModal(bId, eId) { document.getElementById("review-booking-id").value = bId; document.getElementById("review-exp-id").value = eId; document.getElementById("review-modal").classList.remove("hidden"); }
document.getElementById("review-form").addEventListener("submit", async (e) => {
  e.preventDefault(); const token = getToken();
  try { const res = await fetch(`${API_BASE}/api/reviews`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ bookingId: document.getElementById("review-booking-id").value, experienceId: document.getElementById("review-exp-id").value, rating: document.getElementById("review-rating").value, comment: document.getElementById("review-comment").value }) }); if (res.ok) { showModal("Thank you", "Review posted!", "success"); document.getElementById("review-modal").classList.add("hidden"); } } catch (err) { showModal("Error", "Network error", "error"); }
});