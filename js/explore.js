// js/explore.js

// 1. CONFIG
// We rely on API_BASE from common.js
let currentCategory = "";
let myBookmarkedIds = new Set(); 
let map = null;
let markers = [];
let isMapView = false;
let currentResults = [];

// 2. SHARED HELPERS
function getImageForExperience(exp) {
  if (exp.imageUrl && exp.imageUrl.includes("cloudinary.com")) {
    return exp.imageUrl.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/');
  }
  if (exp.imageUrl && exp.imageUrl.startsWith("http")) return exp.imageUrl;
  return "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800&auto=format&fit=crop";
}

// 3. INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {
    // FORCE SCROLL UNLOCK
    document.body.style.overflow = 'auto'; 
    document.documentElement.style.overflow = 'auto';

    // Safety Check
    if (typeof API_BASE === 'undefined') {
        console.error("CRITICAL: API_BASE missing. Check common.js");
        const list = document.getElementById("experience-list");
        if (list) list.innerHTML = '<div class="text-center py-10 text-red-500">System Error: Configuration missing.</div>';
        return;
    }

    console.log("🚀 Explore JS running. API:", API_BASE);

    const sortSelect = document.getElementById("sort-select");
    const priceSelect = document.getElementById("price-select");
    const whatInput = document.getElementById("what-input");
    const locInput = document.getElementById("location-input");
    const dateInput = document.getElementById("date-input");

    // Listeners
    if (sortSelect) sortSelect.addEventListener("change", searchExperiences);
    if (priceSelect) priceSelect.addEventListener("change", searchExperiences);
    if (whatInput) whatInput.addEventListener("keyup", (e) => { if(e.key === 'Enter') searchExperiences(); });
    if (locInput) locInput.addEventListener("keyup", (e) => { if(e.key === 'Enter') searchExperiences(); });
    if (dateInput) dateInput.addEventListener("change", searchExperiences);

    // URL Params
    const params = new URLSearchParams(window.location.search);
    if (params.get("sort") === "discount_desc") { if(sortSelect) sortSelect.value = "discount_desc"; }
    
    if (params.get("q")) {
        if(whatInput) whatInput.value = params.get("q");
        searchExperiences();
    } else if (params.get("cat")) {
        setCategory(params.get("cat"));
    } else {
        // Load Bookmarks first (async but don't block hard)
        loadBookmarks().then(() => searchExperiences()).catch(() => searchExperiences());
    }
    
    loadExploreRecommendations();
});

// 4. MAP LOGIC
function toggleMapView() {
    isMapView = !isMapView;
    const list = document.getElementById("experience-list");
    const mapDiv = document.getElementById("search-map");
    const btnText = document.getElementById("map-toggle-text");

    if (isMapView) {
        list.classList.add("hidden");
        mapDiv.classList.remove("hidden");
        btnText.textContent = "Show List";
        if (!map) initSearchMap();
        updateMapMarkers();
    } else {
        list.classList.remove("hidden");
        mapDiv.classList.add("hidden");
        btnText.textContent = "Show Map";
    }
}

function initSearchMap() {
    try {
        map = L.map('search-map').setView([-25.2744, 133.7751], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    } catch(e) { console.error("Map Init Error", e); }
}

function updateMapMarkers() {
    if (!map) return;
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    if (currentResults.length === 0) return;
    const bounds = L.latLngBounds();
    currentResults.forEach(exp => {
        if (exp.lat && exp.lng) {
            const marker = L.marker([exp.lat, exp.lng]).addTo(map);
            marker.bindPopup(`<b>${exp.title}</b><br>$${exp.price}`);
            markers.push(marker);
            bounds.extend([exp.lat, exp.lng]);
        }
    });
    if (markers.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
}

// 5. SEARCH LOGIC
async function searchExperiences() {
  const list = document.getElementById("experience-list");
  
  // Reset Content
  if (list) list.innerHTML = `
    <div class="col-span-full text-center py-20">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-4"></div>
        <p class="text-gray-500 font-bold">Loading...</p>
        <p id="slow-msg" class="text-xs text-orange-500 mt-2 hidden animate-pulse">Waking up server...</p>
    </div>`;

  // Timeout Warning
  const slowTimer = setTimeout(() => {
      const msg = document.getElementById("slow-msg");
      if(msg) msg.classList.remove("hidden");
  }, 3000); 

  try {
    const what = document.getElementById("what-input")?.value.trim() || "";
    const loc = document.getElementById("location-input")?.value.trim() || "";
    const date = document.getElementById("date-input")?.value || "";
    const sort = document.getElementById("sort-select")?.value || "relevance";
    const priceRange = document.getElementById("price-select")?.value || "";

    const params = new URLSearchParams();
    if (what) params.append("q", what);
    if (loc) params.append("city", loc);
    if (date) params.append("date", date); 
    if (sort) params.append("sort", sort);
    
    if (priceRange) {
        const [min, max] = priceRange.split("-");
        if(min) params.append("minPrice", min);
        if(max) params.append("maxPrice", max);
    }
    
    const res = await fetch(`${API_BASE}/api/experiences?${params.toString()}`);
    clearTimeout(slowTimer);

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

    let experiences = await res.json();

    if (currentCategory) experiences = experiences.filter(e => e.tags && e.tags.includes(currentCategory));
    
    currentResults = experiences;

    if (experiences.length === 0) {
        try {
            const fallbackRes = await fetch(`${API_BASE}/api/experiences?sort=rating_desc`);
            const fallbackExps = await fallbackRes.json();
            const safeFallback = Array.isArray(fallbackExps) ? fallbackExps.slice(0, 4) : [];
            renderExperiences(safeFallback, "experience-list", true);
        } catch(e) {
            if (list) list.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-500">No experiences found.</p></div>';
        }
    } else {
        renderExperiences(experiences, "experience-list");
    }

    if (isMapView) updateMapMarkers();

  } catch (err) { 
      clearTimeout(slowTimer);
      console.error("SEARCH FAILED:", err);
      if (list) list.innerHTML = `
        <div class="col-span-full text-center py-10 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p class="text-red-600 font-bold">Connection Error</p>
            <p class="text-sm text-gray-500">${err.message}</p>
            <button onclick="searchExperiences()" class="mt-4 px-4 py-2 bg-gray-200 rounded">Retry</button>
        </div>`;
  }
}

function renderExperiences(experiences, containerId, isFallback = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (!experiences || experiences.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-500">No experiences found.</p></div>';
    return;
  }

  if (isFallback) {
      container.insertAdjacentHTML('afterbegin', `<div class="col-span-full mb-4 p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-100 text-sm font-bold text-center">We couldn't find exact matches, but here are some top-rated experiences!</div>`);
  }

  experiences.forEach(exp => {
    const imgSrc = getImageForExperience(exp);
    const ratingDisplay = exp.averageRating > 0 ? `★ ${exp.averageRating.toFixed(1)}` : `★ New`;
    const isBookmarked = myBookmarkedIds.has(exp.id);
    
    const filledHeart = `<svg class="w-6 h-6 text-red-500 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    const emptyHeart = `<svg class="w-6 h-6 text-white stroke-2" fill="rgba(0,0,0,0.3)" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;

    const card = document.createElement("div");
    card.className = "group cursor-pointer flex flex-col gap-3"; 
    
    card.innerHTML = `
      <div class="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-200">
        <img src="${imgSrc}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
        <div class="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-2 py-1 text-xs font-bold shadow-sm">${ratingDisplay}</div>
        <button onclick="toggleBookmark(event, '${exp.id}')" class="absolute top-3 right-3 p-2 hover:scale-110 transition z-10 focus:outline-none hidden">${isBookmarked ? filledHeart : emptyHeart}</button>
      </div>
      <div>
        <h3 class="font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition">${exp.title}</h3>
        <p class="text-sm text-gray-500 mt-1">${exp.city}</p>
        <p class="text-sm text-gray-900 mt-1"><span class="font-bold">$${exp.price}</span> <span class="text-gray-500 font-normal">/ person</span></p>
      </div>`;
    
    card.addEventListener("click", () => window.location.href = `experience.html?id=${exp.id}`);
    container.appendChild(card);
  });
}

// --- HELPERS (FULLY IMPLEMENTED) ---
function getToken() { return localStorage.getItem("tst_token") || null; }

async function loadBookmarks() {
    const token = getToken();
    if (!token) return; 
    const res = await fetch(`${API_BASE}/api/my/bookmarks`, { headers: { "Authorization": `Bearer ${token}` } });
    if (res.ok) { const ids = await res.json(); myBookmarkedIds = new Set(ids); }
}

async function toggleBookmark(e, expId) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const token = getToken();
    if (!token) return alert("Please log in to save.");

    const isActive = myBookmarkedIds.has(expId);
    if (isActive) { myBookmarkedIds.delete(expId); } 
    else { myBookmarkedIds.add(expId); }
    
    // Update UI
    searchExperiences(); // Re-render to update icons

    try { await fetch(`${API_BASE}/api/bookmarks/${expId}`, { method: "POST", headers: { "Authorization": `Bearer ${token}` } }); } catch (err) {}
}

async function loadExploreRecommendations() {
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch(`${API_BASE}/api/recommendations`, { headers: { "Authorization": `Bearer ${token}` } });
        const recs = await res.json();
        if (recs && recs.length > 0) { renderExperiences(recs, "recommend-list"); document.getElementById("recommend-section")?.classList.remove("hidden"); }
    } catch (err) {}
}

function setCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll(".chip").forEach(btn => {
    const isActive = (cat === '' && btn.textContent === 'All') || btn.textContent.includes(cat);
    btn.className = isActive ? "chip active px-4 py-2 rounded-full border border-black bg-black text-white text-xs font-bold transition" : "chip px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-900 text-xs font-bold transition hover:border-black";
  });
  searchExperiences();
}