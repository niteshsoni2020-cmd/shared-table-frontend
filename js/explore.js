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
    if (params.get("cat")) {
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
    map = L.map('search-map').setView([-25.2744, 133.7751], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
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
            marker.bindPopup(`
                <div class="text-center">
                    <img src="${getImageForExperience(exp)}" class="w-full h-24 object-cover rounded mb-2">
                    <h3 class="font-bold text-sm">${exp.title}</h3>
                    <p class="text-xs text-gray-500">$${exp.price}</p>
                    <a href="experience.html?id=${exp.id}" class="block mt-2 text-xs font-bold text-orange-600">View Details</a>
                </div>
            `);
            markers.push(marker);
            bounds.extend([exp.lat, exp.lng]);
        }
    });

    if (markers.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
}

// --- 4. SEARCH LOGIC ---
async function searchExperiences() {
  const list = document.getElementById("experience-list");
  if (list) list.innerHTML = '<p class="text-gray-500 col-span-full text-center py-20">Searching...</p>';

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
    
    const res = await fetch(`${API_BASE}/api/experiences?${params.toString()}`);
    let experiences = await res.json();

    if (currentCategory) experiences = experiences.filter(e => e.tags && e.tags.includes(currentCategory));
    
    currentResults = experiences;

    if (experiences.length === 0) {
        const fallbackRes = await fetch(`${API_BASE}/api/experiences?sort=rating_desc`);
        const fallbackExps = await fallbackRes.json();
        renderExperiences(fallbackExps.slice(0, 4), "experience-list", true);
        currentResults = fallbackExps.slice(0, 4);
    } else {
        renderExperiences(experiences, "experience-list");
    }

    if (isMapView) updateMapMarkers();

  } catch (err) { console.error(err); }
}

function renderExperiences(experiences, containerId, isFallback = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (experiences.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-12 bg-gray-50 rounded-xl"><p class="text-gray-500">No experiences found matching your search.</p></div>';
    return;
  }

  if (isFallback) {
      container.insertAdjacentHTML('afterbegin', `<div class="col-span-full mb-4 p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-100 text-sm font-bold text-center">We couldn't find exact matches, but here are some top-rated experiences you might like!</div>`);
  }

  experiences.forEach(exp => {
    const imgSrc = getImageForExperience(exp);
    const maxDiscount = (exp.dynamicDiscounts && Object.values(exp.dynamicDiscounts).length > 0) ? Math.max(...Object.values(exp.dynamicDiscounts)) : 0;
    const ratingDisplay = exp.averageRating > 0 ? `★ ${exp.averageRating.toFixed(1)} <span class="text-gray-400 font-normal">(${exp.reviewCount})</span>` : `★ New`;
    const isBookmarked = myBookmarkedIds.has(exp.id);
    
    const filledHeart = `<svg class="w-6 h-6 text-red-500 fill-current drop-shadow-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    const emptyHeart = `<svg class="w-6 h-6 text-white stroke-2 drop-shadow-md" fill="rgba(0,0,0,0.3)" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;

    const card = document.createElement("div");
    card.className = "group cursor-pointer flex flex-col gap-3"; 
    // ADDED: loading="lazy" to image tag
    card.innerHTML = `
      <div class="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-200">
        <img src="${imgSrc}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
        ${maxDiscount > 0 ? `<div class="absolute top-3 left-3 px-2 py-1 bg-green-600 text-white text-[10px] font-bold uppercase tracking-wide rounded shadow-sm">Save ${maxDiscount}%</div>` : ''}
        <button onclick="toggleBookmark(event, '${exp.id}')" class="absolute top-3 right-3 p-2 hover:scale-110 transition z-10 focus:outline-none">${isBookmarked ? filledHeart : emptyHeart}</button>
      </div>
      <div>
        <div class="flex justify-between items-start">
           <h3 class="font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition">${exp.title}</h3>
           <div class="flex items-center gap-1 text-xs font-semibold text-gray-800">${ratingDisplay}</div>
        </div>
        <p class="text-sm text-gray-500 mt-1">${exp.city}</p>
        <p class="text-sm text-gray-900 mt-1"><span class="font-bold">$${exp.price}</span> <span class="text-gray-500 font-normal">/ person</span></p>
      </div>`;
    card.addEventListener("click", () => window.location.href = `experience.html?id=${exp.id}`);
    container.appendChild(card);
  });
}

// --- BOOKMARK & REC LOGIC ---
async function loadBookmarks() {
    const token = getToken();
    if (!token) return; 
    try {
        const res = await fetch(`${API_BASE}/api/my/bookmarks`, { headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) { const ids = await res.json(); myBookmarkedIds = new Set(ids); }
    } catch (err) {}
}

async function toggleBookmark(e, expId) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const token = getToken();
    if (!token) return showModal("Login Required", "Please log in to save.", "error");

    const isActive = myBookmarkedIds.has(expId);
    const filledHeart = `<svg class="w-6 h-6 text-red-500 fill-current drop-shadow-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    const emptyHeart = `<svg class="w-6 h-6 text-white stroke-2 drop-shadow-md" fill="rgba(0,0,0,0.3)" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;

    if (isActive) { myBookmarkedIds.delete(expId); btn.innerHTML = emptyHeart; } 
    else { myBookmarkedIds.add(expId); btn.innerHTML = filledHeart; }

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