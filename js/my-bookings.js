// js/my-bookings.js

// --- HELPER: Image Optimization ---
function getImageForExperience(exp) {
  // Cloudinary optimization (w_400 for thumbnails)
  if (exp.imageUrl && exp.imageUrl.includes("cloudinary.com")) {
    return exp.imageUrl.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/');
  }
  if (exp.imageUrl && exp.imageUrl.startsWith("http")) return exp.imageUrl;
  
  // Fallback
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

// --- SAVED LOGIC ---
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
        const res = await fetch(`${API_BASE}/api/my/bookmarks/details`, { headers: { "Authorization": `Bearer ${token}` } });
        const savedExps = await res.json();
        loading.classList.add("hidden");

        if (savedExps.length === 0) { empty.classList.remove("hidden"); return; }

        savedExps.forEach(exp => {
            const imgSrc = getImageForExperience(exp);
            const card = document.createElement("div");
            card.className = "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer flex flex-col group";
            card.onclick = () => window.location.href = `experience.html?id=${exp.id}`;
            
            card.innerHTML = `
                <div class="h-48 bg-gray-200 relative overflow-hidden">
                    <img src="${imgSrc}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                    <div class="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow-md text-red-500">❤️</div>
                </div>
                <div class="p-5">
                    <h3 class="font-bold text-gray-900 leading-tight text-lg mb-1">${exp.title}</h3>
                    <p class="text-sm text-gray-500 mb-3">${exp.city}</p>
                    <div class="flex justify-between items-center pt-3 border-t border-gray-50">
                        <span class="font-bold text-gray-900">$${exp.price} <span class="text-xs font-normal text-gray-500">/ person</span></span>
                        <span class="text-orange-600 text-sm font-bold hover:underline">View</span>
                    </div>
                </div>`;
            grid.appendChild(card);
        });
    } catch (err) { console.error(err); }
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
    const imgSrc = getImageForExperience(exp);
    const title = exp ? exp.title : "Unknown Experience";
    const date = formatBookingDate(booking.bookingDate);
    let statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Confirmed</span>`;
    let actionBtn = "";

    if (booking.status === 'cancelled') {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Cancelled</span>`;
        actionBtn = `<div class="mt-4 text-xs text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100 text-center">Refund: $${booking.refundAmount}</div>`;
    } else if (booking.status === 'cancelled_by_host') {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Host Cancelled</span>`;
        actionBtn = `<div class="mt-4 text-xs text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100 text-center">Full Refund Processed</div>`;
    } else if (!isUpcoming) {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">Completed</span>`;
        actionBtn = `<button onclick="openReviewModal(${booking.id}, ${booking.experienceId}); event.stopPropagation();" class="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-sm transition">Write a Review</button>`;
    } else {
        actionBtn = `<button onclick="cancelBooking(${booking.id})" class="mt-4 w-full py-2 border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-lg text-sm transition">Cancel Booking</button>`;
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
               <span class="flex items-center gap-1">👥 ${booking.numGuests} Guests</span>
           </div>
           ${actionBtn}
        </div>
    </div>`;
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
      card.innerHTML = `
         <div class="w-full md:w-48 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"><img src="${imgSrc}" class="w-full h-full object-cover"></div>
         <div class="flex-grow">
            <h3 class="text-xl font-bold text-gray-900">${exp.title}</h3>
            <p class="text-gray-500 text-sm mt-1 mb-4">${exp.city}</p>
            <div class="flex gap-4 border-t border-gray-100 pt-4">
               <button onclick="window.location.href='experience.html?id=${exp.id}'" class="text-sm font-bold text-orange-600 hover:underline">View Public Page</button>
               <button onclick="window.location.href='host.html?edit=${exp.id}'" class="text-sm font-bold text-blue-600 hover:underline">Edit</button>
               <button onclick="deleteListing('${exp.id}')" class="text-sm font-bold text-red-500 hover:underline">Delete</button>
            </div>
         </div>`;
      grid.appendChild(card);
  });
}

async function deleteListing(id) {
  if (!confirm("Delete this listing?")) return;
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/api/experiences/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) loadHosting();
  } catch (err) { alert("Network error"); }
}

// --- HOST ONBOARDING SUBMIT ---
document.getElementById("host-onboard-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = getToken();
    const body = {
        accountName: document.getElementById("bank-name").value,
        bsb: document.getElementById("bank-bsb").value,
        accountNumber: document.getElementById("bank-acc").value,
        declarationAgreed: document.getElementById("host-declare").checked
    };

    try {
        const res = await fetch(`${API_BASE}/api/host/onboard`, {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            showModal("Success!", "You are now a Verified Host.", "success");
            document.getElementById("host-modal").classList.add("hidden");
            loadHosting(); 
        } else {
            const data = await res.json();
            showModal("Error", data.message, "error");
        }
    } catch (err) { showModal("Error", "Network error", "error"); }
});

document.addEventListener("DOMContentLoaded", () => {
    if (!getToken()) { window.location.href = "login.html?redirect=my-bookings.html"; return; }
    updateNavAuth();
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    switchTab(view === 'saved' ? 'saved' : view === 'hosting' ? 'hosting' : 'trips');
});

function openReviewModal(bId, eId) {
  document.getElementById("review-booking-id").value = bId;
  document.getElementById("review-exp-id").value = eId;
  document.getElementById("review-modal").classList.remove("hidden");
}
document.getElementById("review-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/api/reviews`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
          bookingId: document.getElementById("review-booking-id").value,
          experienceId: document.getElementById("review-exp-id").value,
          rating: document.getElementById("review-rating").value,
          comment: document.getElementById("review-comment").value
      })
    });
    if (res.ok) { showModal("Thank you", "Review posted!", "success"); document.getElementById("review-modal").classList.add("hidden"); }
  } catch (err) { showModal("Error", "Network error", "error"); }
});