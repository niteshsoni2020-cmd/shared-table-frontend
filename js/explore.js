// js/explore.js

// --- 1. SHARED HELPERS (With Image Optimization) ---
function getImageForExperience(exp) {
  // Optimizing Cloudinary Images for Speed
  if (exp.imageUrl && exp.imageUrl.includes("cloudinary.com")) {
    return exp.imageUrl.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/');
  }
  
  // Standard Logic if not Cloudinary
  if (exp.imageUrl && exp.imageUrl.startsWith("http")) return exp.imageUrl;

  // Fallback Logic (Unsplash)
  const text = (exp.title + " " + (exp.tags || []).join(" ")).toLowerCase();
  if (text.includes("diwali") || text.includes("indian")) return "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=800&auto=format&fit=crop";
  if (text.includes("bush") || text.includes("nature")) return "https://images.unsplash.com/photo-1504280509243-48477bd40bea?q=80&w=800&auto=format&fit=crop";
  if (text.includes("food") || text.includes("dining")) return "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop";
  return "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800&auto=format&fit=crop";
}

let currentCategory = "";
let myBookmarkedIds = new Set(); 

// --- 2. INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
    // Listeners
    const sortSelect = document.getElementById("sort-select");
    const whatInput = document.getElementById("what-input");
    const locInput = document.getElementById("location-input");
    const dateInput = document.getElementById("date-input");

    if (sortSelect) sortSelect.addEventListener("change", searchExperiences);
    if (whatInput) whatInput.addEventListener("keyup", (e) => { if(e.key === 'Enter') searchExperiences(); });
    if (locInput) locInput.addEventListener("keyup", (e) => { if(e.key === 'Enter') searchExperiences(); });
    if (dateInput) dateInput.addEventListener("change", searchExperiences);

    // Check URL params for Deals link
    const params = new URLSearchParams(window.location.search);
    if (params.get("sort") === "discount_desc") {
        if(sortSelect) sortSelect.value = "discount_desc";
    }
    if (params.get("cat")) {
        setCategory(params.get("cat")); // Will trigger search
    } else {
        await loadBookmarks();
        searchExperiences();
    }
    
    loadExploreRecommendations();
});

// --- 3. BOOKMARK LOGIC ---
async function loadBookmarks() {
    const token = getToken();
    if (!token) return; 
    try {
        const res = await fetch(`${API_BASE}/api/my/bookmarks`, { headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) {
            const ids = await res.json();
            myBookmarkedIds = new Set(ids);
        }
    } catch (err) { console.error(err); }
}

async function toggleBookmark(e, expId) {
    e.stopPropagation(); // Stop card click
    const btn = e.currentTarget;
    const token = getToken();

    if (!token) {
        showModal("Login Required", "Please log in to save experiences.", "error");
        return;
    }

    const isActive = myBookmarkedIds.has(expId);
    
    // SVG Icons
    const filledHeart = `<svg class="w-6 h-6 text-red-500 fill-current drop-shadow-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    const emptyHeart = `<svg class="w-6 h-6 text-white stroke-2 drop-shadow-md" fill="rgba(0,0,0,0.3)" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;

    if (isActive) {
        myBookmarkedIds.delete(expId);
        btn.innerHTML = emptyHeart;
    } else {
        myBookmarkedIds.add(expId);
        btn.innerHTML = filledHeart;
    }

    // Sync
    try {
        await fetch(`${API_BASE}/api/bookmarks/${expId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
    } catch (err) { console.error("Bookmark error", err); }
}

// --- 4. RENDER FUNCTION ---
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
    const maxDiscount = (exp.dynamicDiscounts && Object.values(exp.dynamicDiscounts).length > 0) 
        ? Math.max(...Object.values(exp.dynamicDiscounts)) : 0;
    
    const ratingDisplay = exp.averageRating > 0 
        ? `★ ${exp.averageRating.toFixed(1)} <span class="text-gray-400 font-normal">(${exp.reviewCount})</span>` 
        : `★ New`;

    const isBookmarked = myBookmarkedIds.has(exp.id);
    const filledHeart = `<svg class="w-6 h-6 text-red-500 fill-current drop-shadow-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    const emptyHeart = `<svg class="w-6 h-6 text-white stroke-2 drop-shadow-md" fill="rgba(0,0,0,0.3)" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;

    const card = document.createElement("div");
    card.className = "group cursor-pointer flex flex-col gap-3"; 

    card.innerHTML = `
      <div class="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-200">
        <img src="${imgSrc}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="${exp.title}">
        
        ${maxDiscount > 0 ? `<div class="absolute top-3 left-3 px-2 py-1 bg-green-600 text-white text-[10px] font-bold uppercase tracking-wide rounded shadow-sm">Save ${maxDiscount}%</div>` : ''}
        
        <button onclick="toggleBookmark(event, '${exp.id}')" class="absolute top-3 right-3 p-2 hover:scale-110 transition z-10 focus:outline-none">
           ${isBookmarked ? filledHeart : emptyHeart}
        </button>
      </div>
      <div>
        <div class="flex justify-between items-start">
           <h3 class="font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition">${exp.title}</h3>
           <div class="flex items-center gap-1 text-xs font-semibold text-gray-800">${ratingDisplay}</div>
        </div>
        <p class="text-sm text-gray-500 mt-1">${exp.city}</p>
        <p class="text-sm text-gray-900 mt-1"><span class="font-bold">$${exp.price}</span> <span class="text-gray-500 font-normal">/ person</span></p>
      </div>
    `;
    card.addEventListener("click", () => window.location.href = `experience.html?id=${exp.id}`);
    container.appendChild(card);
  });
}

// --- 5. SEARCH & REC LOGIC ---
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
    if (date) params.append("date", date); // NEW: Send date to backend
    if (sort) params.append("sort", sort);
    
    const res = await fetch(`${API_BASE}/api/experiences?${params.toString()}`);
    let experiences = await res.json();

    if (currentCategory) experiences = experiences.filter(e => e.tags && e.tags.includes(currentCategory));
    
    // SMART FALLBACK LOGIC
    if (experiences.length === 0) {
        // Fetch top rated instead
        const fallbackRes = await fetch(`${API_BASE}/api/experiences?sort=rating_desc`);
        const fallbackExps = await fallbackRes.json();
        renderExperiences(fallbackExps.slice(0, 4), "experience-list", true); // Pass true for fallback flag
    } else {
        renderExperiences(experiences, "experience-list");
    }

  } catch (err) { console.error(err); }
}

async function loadExploreRecommendations() {
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch(`${API_BASE}/api/recommendations`, { headers: { "Authorization": `Bearer ${token}` } });
        const recs = await res.json();
        if (recs && recs.length > 0) {
            renderExperiences(recs, "recommend-list");
            document.getElementById("recommend-section")?.classList.remove("hidden");
        }
    } catch (err) { console.error(err); }
}

function setCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll(".chip").forEach(btn => {
    // Basic text match check (can be improved)
    const isActive = (cat === '' && btn.textContent === 'All') || btn.textContent.includes(cat);
    
    btn.className = isActive
        ? "chip active px-4 py-2 rounded-full border border-black bg-black text-white text-xs font-bold transition"
        : "chip px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-900 text-xs font-bold transition hover:border-black";
  });
  searchExperiences();
}