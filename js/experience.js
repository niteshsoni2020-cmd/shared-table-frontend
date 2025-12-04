// js/experience.js

let currentExperience = null;
let isBookmarked = false;

// --- SHARED HELPERS ---
function getImageForExperience(exp) {
  if (exp.imageUrl && exp.imageUrl.includes("cloudinary.com")) {
      return exp.imageUrl.replace('/upload/', '/upload/w_800,c_fill,q_auto/');
  }
  if (exp.imageUrl && exp.imageUrl.startsWith("http")) return exp.imageUrl;
  return "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800&auto=format&fit=crop";
}

function getThumbnail(url) {
    if (url && url.includes("cloudinary.com")) {
        return url.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/');
    }
    return url;
}

// --- MAP HELPER ---
function initMap(lat, lng) {
    const finalLat = lat || -37.8136;
    const finalLng = lng || 144.9631;
    const container = document.getElementById('exp-map');
    if(container._leaflet_id) return; 
    const map = L.map('exp-map').setView([finalLat, finalLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    L.circle([finalLat, finalLng], { color: '#ea580c', fillColor: '#ea580c', fillOpacity: 0.2, radius: 800 }).addTo(map);
}

// --- LOAD DATA ---
async function loadExperience() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) { window.location.href = "explore.html"; return; }

  try {
    const res = await fetch(`${API_BASE}/api/experiences/${id}`);
    const exp = await res.json();
    if (!res.ok) throw new Error("Not found");
    
    currentExperience = exp;
    
    renderExperience(exp);
    setupBookingForm(exp);
    initMap(exp.lat, exp.lng);
    loadReviews(id);
    loadSimilar(exp); 
    
    checkBookmarkStatus(exp.id);
    const btn = document.getElementById("bookmark-btn-hero");
    if(btn) btn.addEventListener("click", toggleCurrentBookmark);

    // Wire up Buttons
    document.getElementById("contact-host-btn").addEventListener("click", () => showContactModal(exp));
    document.getElementById("report-listing-btn").addEventListener("click", () => showReportModal(exp));
    document.getElementById("share-btn").addEventListener("click", () => shareExperience(exp));

  } catch (err) { console.error(err); }
}

function renderExperience(exp) {
  document.getElementById("experience-title").textContent = exp.title;
  document.getElementById("experience-city-top").textContent = exp.city;
  document.getElementById("experience-city").textContent = exp.city;
  document.getElementById("experience-description").textContent = exp.description;
  document.getElementById("experience-price").textContent = `$${exp.price}`;
  document.getElementById("hero-category-badge").textContent = exp.tags[0] || "Experience";
  
  document.getElementById("host-name").textContent = exp.hostName || "Local Host";
  const avatarContainer = document.getElementById("host-avatar-container");
  if (exp.hostPic) { avatarContainer.innerHTML = `<img src="${exp.hostPic}" class="w-full h-full object-cover rounded-full">`; } 
  else { avatarContainer.innerHTML = `<span class="text-3xl">👤</span>`; }

  let images = (exp.images && exp.images.length > 0) ? exp.images : [exp.imageUrl];
  document.getElementById("img-1").src = getImageForExperience({ imageUrl: images[0] });
  
  const img2 = document.getElementById("img-2");
  const img3 = document.getElementById("img-3");
  if (images[1]) img2.src = getThumbnail(images[1]); else img2.parentElement.style.display = 'none';
  if (images[2]) img3.src = getThumbnail(images[2]); else img3.parentElement.style.display = 'none';
  
  const ratingEl = document.getElementById("experience-rating");
  if (exp.averageRating > 0) ratingEl.innerHTML = `⭐ ${exp.averageRating.toFixed(1)} <span class="text-gray-400 font-normal">(${exp.reviewCount})</span>`;
  else ratingEl.innerHTML = "New Activity";
}

// --- NEW: SHARE LOGIC ---
async function shareExperience(exp) {
    const shareData = {
        title: exp.title,
        text: `Check out this experience on Shared Table: ${exp.title}`,
        url: window.location.href
    };

    // Use native share if available (Mobile/Modern Browsers)
    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            // User cancelled share
        }
    } else {
        // Fallback: Copy to Clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showModal("Link Copied", "Share this link with your friends!", "success");
        }, () => {
            showModal("Error", "Could not copy link.", "error");
        });
    }
}

// --- SIMILAR EXPERIENCES (12 Items) ---
async function loadSimilar(current) {
    try {
        const res = await fetch(`${API_BASE}/api/experiences`);
        const all = await res.json();
        
        const scored = all
            .filter(e => e.id !== current.id)
            .map(e => {
                let score = 0;
                if (e.tags[0] === current.tags[0]) score += 5;
                if (e.city === current.city) score += 3;
                if (e.price >= current.price * 0.8 && e.price <= current.price * 1.2) score += 1;
                return { ...e, score };
            })
            .sort((a, b) => b.score - a.score) 
            .slice(0, 12); 

        if (scored.length > 0) {
            const container = document.createElement("section");
            container.className = "py-12 border-t border-gray-100";
            container.innerHTML = `
                <h2 class="text-2xl font-bold mb-8 text-gray-900">Explore more like this</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
                    ${scored.map(e => `
                        <div onclick="window.location.href='experience.html?id=${e.id}'" class="cursor-pointer group flex flex-col gap-2">
                            <div class="aspect-[4/3] rounded-xl bg-gray-200 overflow-hidden relative">
                                <img src="${getImageForExperience(e)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
                                <div class="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-2 py-1 text-xs font-bold shadow-sm">
                                    ${e.averageRating > 0 ? '★ ' + e.averageRating.toFixed(1) : 'New'}
                                </div>
                            </div>
                            <div>
                                <h3 class="font-bold text-gray-900 group-hover:text-orange-600 truncate transition">${e.title}</h3>
                                <p class="text-xs text-gray-500">${e.city} • ${e.tags[0] || 'Experience'}</p>
                                <p class="text-sm font-bold text-gray-900 mt-1">$${e.price} <span class="text-xs font-normal text-gray-500">/ person</span></p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            document.querySelector("main").appendChild(container);
        }
    } catch(e) {}
}

// --- MODALS ---
function showContactModal(exp) {
    const token = getToken();
    if (!token) { showModal("Login Required", "Please login to contact the host.", "error"); return; }
    let modal = document.getElementById('contact-modal-dynamic');
    if (!modal) {
        const html = `<div id="contact-modal-dynamic" class="fixed inset-0 bg-black/60 z-[100] hidden flex items-center justify-center p-4 backdrop-blur-sm"><div class="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6"><h3 class="text-xl font-bold mb-2">Contact Host</h3><p class="text-sm text-gray-500 mb-4">Send a message to ${exp.hostName}.</p><textarea id="contact-msg-input" rows="4" class="w-full p-3 border border-gray-200 rounded-lg outline-none mb-4" placeholder="Hi, I have a question about..."></textarea><div class="flex gap-3"><button onclick="document.getElementById('contact-modal-dynamic').classList.add('hidden')" class="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-700">Cancel</button><button id="send-contact-btn" class="flex-1 py-3 bg-orange-600 font-bold rounded-xl text-white">Send</button></div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('contact-modal-dynamic');
    }
    document.getElementById('contact-msg-input').value = "";
    modal.classList.remove('hidden');
    const sendBtn = document.getElementById('send-contact-btn');
    const newBtn = sendBtn.cloneNode(true); sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    newBtn.addEventListener('click', async () => {
        const msg = document.getElementById('contact-msg-input').value;
        if(!msg.trim()) return;
        newBtn.textContent = "Sending...";
        try {
            const res = await fetch(`${API_BASE}/api/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Registered User", email: "user@sharedtable.com", subject: `Message for Host (${exp.hostName})`, message: `Regarding: ${exp.title}\n\n${msg}` }) });
            if(res.ok) { showModal("Message Sent", "The host has been notified.", "success"); modal.classList.add('hidden'); }
        } catch(e) { showModal("Error", "Could not send message.", "error"); }
        newBtn.textContent = "Send";
    });
}

function showReportModal(exp) {
    let modal = document.getElementById('report-modal-dynamic');
    if (!modal) {
        const html = `<div id="report-modal-dynamic" class="fixed inset-0 bg-black/60 z-[100] hidden flex items-center justify-center p-4 backdrop-blur-sm"><div class="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6"><h3 class="text-xl font-bold mb-2 text-red-600">Report Listing</h3><p class="text-sm text-gray-500 mb-4">Why are you reporting this experience?</p><select id="report-reason" class="w-full p-3 border border-gray-200 rounded-lg outline-none mb-4 bg-white"><option>This is a scam / fake listing</option><option>Inappropriate content</option><option>Host is abusive</option><option>Other issue</option></select><div class="flex gap-3"><button onclick="document.getElementById('report-modal-dynamic').classList.add('hidden')" class="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-700">Cancel</button><button id="submit-report-btn" class="flex-1 py-3 bg-red-600 font-bold rounded-xl text-white">Report</button></div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('report-modal-dynamic');
    }
    modal.classList.remove('hidden');
    const submitBtn = document.getElementById('submit-report-btn');
    const newBtn = submitBtn.cloneNode(true); submitBtn.parentNode.replaceChild(newBtn, submitBtn);
    newBtn.addEventListener('click', async () => {
        const reason = document.getElementById('report-reason').value;
        newBtn.textContent = "Reporting...";
        try { await fetch(`${API_BASE}/api/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "System Reporter", email: "admin@sharedtable.com", subject: `REPORT LISTING: ${exp.title}`, message: `Reason: ${reason}\nListing ID: ${exp.id}` }) }); showModal("Report Received", "Thank you for keeping our community safe.", "info"); modal.classList.add('hidden'); } catch(e) { showModal("Error", "Network error.", "error"); }
        newBtn.textContent = "Report";
    });
}

// --- BOOKING LOGIC ---
async function loadReviews(expId) { try { const res = await fetch(`${API_BASE}/api/experiences/${expId}/reviews`); const reviews = await res.json(); const listDiv = document.getElementById("reviews-list"); if (reviews.length > 0) { const bestReview = reviews.find(r => r.rating === 5 && r.comment.length > 20); if (bestReview) { const featBox = document.getElementById("featured-review"); const featUser = document.getElementById("feat-user"); if(featBox && featUser) { const text = bestReview.comment.length > 60 ? bestReview.comment.substring(0,60) + "..." : bestReview.comment; featBox.innerHTML = `<span class="font-bold text-orange-600">"${text}"</span> - <span class="text-gray-500">${bestReview.guestName || 'Guest'}</span>`; featBox.classList.remove("hidden"); } } listDiv.innerHTML = reviews.map(r => `<div class="mb-6 border-b border-gray-50 pb-6 last:border-0"><div class="flex items-center gap-3 mb-2"><div class="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 text-sm">${r.guestName ? r.guestName.charAt(0) : 'G'}</div><div><div class="font-bold text-sm text-gray-900">${r.guestName || 'Guest'}</div><div class="text-xs text-gray-500">${new Date(r.date).toLocaleDateString()}</div></div></div><div class="flex items-center text-orange-500 text-xs mb-2">${'★'.repeat(r.rating)}</div><p class="text-gray-700 text-sm leading-relaxed">${r.comment}</p></div>`).join(""); } } catch (err) {} }
async function checkBookmarkStatus(expId) { const token = getToken(); if(!token) return; try { const res = await fetch(`${API_BASE}/api/my/bookmarks`, { headers: {"Authorization":`Bearer ${token}`} }); const ids = await res.json(); if(ids.includes(expId)) { isBookmarked=true; updateBookmarkIcon(); } } catch(e){} }
function updateBookmarkIcon() { const btn = document.getElementById("bookmark-btn-hero"); if(isBookmarked) { btn.innerHTML = `<span class="text-red-500 text-lg">❤️</span> Saved`; btn.className = "p-2 bg-red-50 border border-red-100 rounded-full hover:bg-red-100 transition flex items-center gap-2 px-4 font-bold text-sm text-red-600"; } else { btn.innerHTML = `<span class="text-gray-400 text-lg">♡</span> Save`; btn.className = "p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition flex items-center gap-2 px-4 font-bold text-sm text-gray-600"; } }
async function toggleCurrentBookmark() { const token = getToken(); if(!token) { showModal("Login Required", "Please login to save.", "error"); return; } isBookmarked = !isBookmarked; updateBookmarkIcon(); try { await fetch(`${API_BASE}/api/bookmarks/${currentExperience.id}`, { method: "POST", headers: {"Authorization":`Bearer ${token}`} }); } catch(e) { isBookmarked = !isBookmarked; updateBookmarkIcon(); } }
function setupBookingForm(exp) { const dateInput = document.getElementById("booking-date"); const slotSelect = document.getElementById("booking-timeslot"); if (!dateInput) return; dateInput.min = exp.startDate; dateInput.max = exp.endDate; dateInput.addEventListener("change", (e) => { const selected = new Date(e.target.value); const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][selected.getUTCDay()]; if (exp.isPaused) { showModal("Unavailable", "The host is currently not accepting bookings.", "error"); e.target.value = ""; return; } if (exp.availableDays && !exp.availableDays.includes(dayName)) { showModal("Closed", `The host is not available on ${dayName}s.`, "info"); e.target.value = ""; return; } }); slotSelect.innerHTML = ""; if (exp.timeSlots && exp.timeSlots.length > 0) { exp.timeSlots.forEach(s => slotSelect.appendChild(new Option(s, s))); } else { slotSelect.appendChild(new Option("All Day", "All Day")); } ['booking-date','booking-timeslot','guest-count', 'private-toggle'].forEach(id => { const el = document.getElementById(id); if(el) el.addEventListener('change', updatePricePreview); }); updatePricePreview(); }
function updatePricePreview() { const guests = document.getElementById("guest-count").value; const isPrivate = document.getElementById("private-toggle").checked; let total = 0; if (isPrivate && currentExperience.privatePrice) { total = currentExperience.privatePrice; } else { total = currentExperience.price * guests; } document.getElementById("price-preview").textContent = `$${total.toFixed(2)}`; }
document.getElementById("booking-form").addEventListener("submit", async (e) => { e.preventDefault(); const token = getToken(); if (!token) { showModal("Login Required", "You must be logged in to book.", "error"); setTimeout(() => window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`, 1500); return; } const btn = document.getElementById("booking-submit"); btn.textContent = "Redirecting to Payment..."; btn.disabled = true; try { const body = { bookingDate: document.getElementById("booking-date").value, timeSlot: document.getElementById("booking-timeslot").value, numGuests: document.getElementById("guest-count").value, isPrivate: document.getElementById("private-toggle").checked }; const res = await fetch(`${API_BASE}/api/experiences/${currentExperience.id}/book`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify(body) }); const data = await res.json(); if (res.ok && data.url) { window.location.href = data.url; } else { showModal("Booking Failed", data.message || "Could not init payment.", "error"); btn.textContent = "Reserve"; btn.disabled = false; } } catch (err) { showModal("Error", "Network error", "error"); btn.textContent = "Reserve"; btn.disabled = false; } });
document.addEventListener("DOMContentLoaded", loadExperience);