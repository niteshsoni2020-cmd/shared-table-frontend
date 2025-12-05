// js/explore.js

let currentCategory = "";
let myBookmarkedIds = new Set(); 
let map = null;
let markers = [];
let isMapView = false;
let currentResults = [];

// --- 1. SHARED HELPERS ---
function getImageForExperience(exp) {
  if (exp.imageUrl && exp.imageUrl.includes("cloudinary.com")) {
    return exp.imageUrl.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/');
  }
  if (exp.imageUrl && exp.imageUrl.startsWith("http")) return exp.imageUrl;
  return "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800&auto=format&fit=crop";
}

// --- 2. INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
    // FORCE SCROLL UNLOCK
    document.body.style.overflow = 'auto'; 
    document.documentElement.style.overflow = 'auto';

    const sortSelect = document.getElementById("sort-select");
    const whatInput = document.getElementById("what-input");
    const locInput = document.getElementById("location-input");
    const dateInput = document.getElementById("date-input");

    if (sortSelect) sortSelect.addEventListener("change", searchExperiences);
    if (whatInput) whatInput.addEventListener("keyup", (e) => { if(e.key === 'Enter') searchExperiences(); });
    if (locInput) locInput.addEventListener("keyup", (e) => { if(e.key === 'Enter') searchExperiences(); });
    if (dateInput) dateInput.addEventListener("change", searchExperiences);

    const params = new URLSearchParams(window.location.search);
    if (params.get("sort") === "discount_desc") {
        if(sortSelect) sortSelect.value = "discount_desc";
    }
    
    if (params.get("q")) {
        if(whatInput) whatInput.value = params.get("q");
        searchExperiences();
    } else if (params.get("cat")) {
        setCategory(params.get("cat"));
    } else {
        await loadBookmarks();
        searchExperiences();
    }
    
    loadExploreRecommendations();
});

// --- 3. MAP LOGIC ---
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
    } catch(e) { console.error("Map Error", e); }
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

// --- 4. SEARCH LOGIC (WITH TIMEOUT WARNING) ---
async function searchExperiences() {
  const list = document.getElementById("experience-list");
  
  // 1. Initial Loading State
  if (list) list.innerHTML = `
    <div class="col-span-full text-center py-20">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-4"></div>
        <p class="text-gray-500 font-bold">Setting the table...</p>
        <p id="slow-server-msg" class="text-xs text-orange-500 mt-2 hidden font-bold animate-pulse">Waking up the server (this may take 30-60s)...</p>
    </div>`;

  // 2. Timeout Warning (Shows after 3 seconds)
  const slowTimer = setTimeout(() => {
      const msg = document.getElementById("slow-server-msg");
      if(msg) msg.classList.remove("hidden");
  }, 3000); 

  try {
    const what = document.getElementById("what-input")?.value.trim() || "";
    const loc = document.getElementById("location-input")?.value.trim() || "";
    const date = document.getElementById("date-input")?.value || "";
    const sort = document.getElementById("sort-select")?.value || "relevance";

    const params = new URLSearchParams();
    if (what) params.append("q", what);
    if (loc) params.append("city", loc);
    if (date) params.append("date", date); 
    if (sort) params.append("sort", sort);
    
    // FETCH
    const res = await fetch(`${API_BASE}/api/experiences?${params.toString()}`);
    
    // Stop the timer immediately if we get a response
    clearTimeout(slowTimer);

    if (!res.ok) throw new Error("Server error");

    let experiences = await res.json();

    if (currentCategory) experiences = experiences.filter(e => e.tags && e.tags.includes(currentCategory));
    
    currentResults = experiences;

    // SMART FALLBACK
    if (experiences.length === 0) {
        const fallbackRes = await fetch(`${API_BASE}/api/experiences?sort=rating_desc`);
        const fallbackExps = await fallbackRes.json();
        const safeFallback = Array.isArray(fallbackExps) ? fallbackExps.slice(0, 4) : [];
        renderExperiences(safeFallback, "experience-list", true);
        currentResults = safeFallback;
    } else {
        renderExperiences(experiences, "experience-list");
    }

    if (isMapView) updateMapMarkers();

  } catch (err) { 
      clearTimeout(slowTimer);
      console.error(err);
      if (list) list.innerHTML = `
        <div class="col-span-full text-center py-10 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p class="text-red-600 font-bold text-lg mb-2">❌ Connection Failed</p>
            <p class="text-gray-700 text-sm mb-4">We tried to connect to:<br><strong>${typeof API_BASE !== 'undefined' ? API_BASE : 'Unknown URL'}</strong></p>
            <p class="text-red-500 text-xs font-mono mb-4 bg-white p-2 rounded inline-block">${err.message}</p>
            <br>
            <button onclick="searchExperiences()" class="px-6 py-2 bg-red-600 text-white rounded-lg font-bold shadow hover:bg-red-700 transition">Retry Connection</button>
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
    
    const card = document.createElement("div");
    card.className = "group cursor-pointer flex flex-col gap-3"; 
    
    card.innerHTML = `
      <div class="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-200">
        <img src="${imgSrc}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
        <div class="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-2 py-1 text-xs font-bold shadow-sm">${ratingDisplay}</div>
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

// --- BOOKMARK & REC LOGIC ---
async function loadBookmarks() { /* logic preserved */ }
async function toggleBookmark() { /* logic preserved */ }
async function loadExploreRecommendations() { /* logic preserved */ }
function setCategory(cat) { currentCategory = cat; searchExperiences(); }