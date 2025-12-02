// js/experience.js

let currentExperience = null;
let isBookmarked = false;

// --- MAP HELPER ---
function initMap(lat, lng) {
    const finalLat = lat || -37.8136;
    const finalLng = lng || 144.9631;
    const map = L.map('exp-map').setView([finalLat, finalLng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    L.marker([finalLat, finalLng]).addTo(map).bindPopup("<b>Meeting Point</b>").openPopup();
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
    
    checkBookmarkStatus(exp.id);
    const btn = document.getElementById("bookmark-btn-hero");
    if(btn) btn.addEventListener("click", toggleCurrentBookmark);

  } catch (err) { console.error(err); }
}

function renderExperience(exp) {
  document.getElementById("experience-title").textContent = exp.title;
  document.getElementById("experience-city").textContent = exp.city;
  document.getElementById("experience-description").textContent = exp.description;
  document.getElementById("experience-price").textContent = `$${exp.price}`;
  document.getElementById("hero-category-badge").textContent = exp.tags[0];
  document.getElementById("host-name").textContent = "Local Host"; 

  // IMAGES
  let images = exp.images && exp.images.length > 0 ? exp.images : [exp.imageUrl];
  const img1 = document.getElementById("img-1");
  const img2 = document.getElementById("img-2");
  const img3 = document.getElementById("img-3");
  if(img1) img1.src = images[0];
  if(img2) img2.src = images[1] || images[0];
  if(img3) img3.src = images[2] || images[0];
  
  // RATING
  const ratingEl = document.getElementById("experience-rating");
  if (exp.averageRating > 0) ratingEl.innerHTML = `⭐ ${exp.averageRating.toFixed(1)} <span class="text-gray-400 font-normal">(${exp.reviewCount} reviews)</span>`;
  else ratingEl.innerHTML = "New";
}

// --- REVIEWS ---
async function loadReviews(expId) {
    try {
        const res = await fetch(`${API_BASE}/api/experiences/${expId}/reviews`);
        const reviews = await res.json();
        const mainCol = document.querySelector("section.md\\:col-span-2");
        const reviewSection = document.createElement("div");
        reviewSection.className = "py-8 border-t border-gray-100 mt-8";
        
        if (reviews.length === 0) {
            reviewSection.innerHTML = `<h2 class="text-xl font-bold mb-4">Reviews</h2><p class="text-gray-500">No reviews yet.</p>`;
        } else {
            const list = reviews.map(r => `
                <div class="mb-6 border-b border-gray-50 pb-6 last:border-0">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 text-sm">${r.guestName.charAt(0)}</div>
                        <div><div class="font-bold text-sm text-gray-900">${r.guestName}</div><div class="text-xs text-gray-500">${new Date(r.date).toLocaleDateString()}</div></div>
                    </div>
                    <div class="flex items-center text-orange-500 text-sm mb-2">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                    <p class="text-gray-700 text-sm leading-relaxed">${r.comment}</p>
                </div>`).join("");
            reviewSection.innerHTML = `<h2 class="text-xl font-bold mb-6">Reviews (${reviews.length})</h2>${list}`;
        }
        mainCol.appendChild(reviewSection);
    } catch (err) { console.error("Error loading reviews", err); }
}

// --- BOOKMARKS ---
async function checkBookmarkStatus(expId) {
    const token = getToken();
    if(!token) return;
    const res = await fetch(`${API_BASE}/api/my/bookmarks`, { headers: {"Authorization":`Bearer ${token}`} });
    const ids = await res.json();
    if(ids.includes(expId)) { isBookmarked=true; updateBookmarkIcon(); }
}
function updateBookmarkIcon() {
    const btn = document.getElementById("bookmark-btn-hero");
    btn.innerHTML = isBookmarked ? "❤️ Saved" : "🤍 Save";
    btn.className = isBookmarked ? "p-2 bg-red-100 text-red-600 rounded-full" : "p-2 bg-gray-100 rounded-full";
}
async function toggleCurrentBookmark() {
    const token = getToken();
    if(!token) return alert("Login required");
    isBookmarked = !isBookmarked; updateBookmarkIcon();
    await fetch(`${API_BASE}/api/bookmarks/${currentExperience.id}`, { method: "POST", headers: {"Authorization":`Bearer ${token}`} });
}

// --- BOOKING ---
function setupBookingForm(exp) {
  const dateInput = document.getElementById("booking-date");
  const slotSelect = document.getElementById("booking-timeslot");
  if (!dateInput) return;
  dateInput.min = exp.startDate; dateInput.max = exp.endDate; dateInput.value = exp.startDate;
  slotSelect.innerHTML = "";
  if (exp.timeSlots) exp.timeSlots.forEach(s => slotSelect.appendChild(new Option(s, s)));
  
  ['booking-date','booking-timeslot','guest-count'].forEach(id => document.getElementById(id).addEventListener('change', updatePricePreview));
  updatePricePreview();
}

function updatePricePreview() {
    const guests = document.getElementById("guest-count").value;
    const total = currentExperience.price * guests;
    document.getElementById("price-preview").textContent = `Total: $${total}`;
}

// Replace the existing form submit listener in js/experience.js

document.getElementById("booking-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = getToken();
  if (!token) { window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`; return; }
  
  const btn = document.getElementById("booking-submit");
  btn.textContent = "Redirecting to Payment..."; 
  btn.disabled = true;

  try {
     const body = {
         bookingDate: document.getElementById("booking-date").value,
         timeSlot: document.getElementById("booking-timeslot").value,
         numGuests: document.getElementById("guest-count").value,
         isPrivate: document.getElementById("private-toggle").checked
     };

     const res = await fetch(`${API_BASE}/api/experiences/${currentExperience.id}/book`, {
        method: "POST", 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
     });

     const data = await res.json();

     if (res.ok && data.url) {
         // REDIRECT TO STRIPE CHECKOUT
         window.location.href = data.url;
     } else {
         const statusEl = document.getElementById("booking-status");
         statusEl.textContent = data.message || "Booking failed.";
         btn.textContent = "Reserve"; 
         btn.disabled = false;
     }
  } catch (err) { 
      alert("Network error");
      btn.textContent = "Reserve"; 
      btn.disabled = false;
  }
});
document.getElementById("booking-success-modal").addEventListener("click", () => window.location.href = "explore.html");
document.addEventListener("DOMContentLoaded", loadExperience);