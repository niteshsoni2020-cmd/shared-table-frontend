// js/explore.js

function getImageForExperience(exp) {
  if (exp.imageUrl && exp.imageUrl.startsWith("http")) return exp.imageUrl;
  return "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2070";
}

let currentCategory = "";
let myBookmarkedIds = new Set(); 

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("sort-select").addEventListener("change", searchExperiences);
    document.getElementById("what-input").addEventListener("keyup", (e) => { if(e.key === 'Enter') searchExperiences(); });
    document.getElementById("location-input").addEventListener("keyup", (e) => { if(e.key === 'Enter') searchExperiences(); });

    // Load Bookmarks BEFORE Search
    await loadBookmarks();
    searchExperiences();
    loadExploreRecommendations();
});

async function loadBookmarks() {
    const token = localStorage.getItem("tst_token");
    if (!token) return; 
    try {
        const res = await fetch(`http://localhost:4000/api/my/bookmarks`, { headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) {
            const ids = await res.json();
            myBookmarkedIds = new Set(ids);
        }
    } catch (err) { console.error(err); }
}

async function toggleBookmark(e, expId) {
    e.stopPropagation(); // Stop card click
    const btn = e.currentTarget;
    const token = localStorage.getItem("tst_token");

    if (!token) { alert("Please log in to save."); return; }

    const isActive = myBookmarkedIds.has(expId);
    
    // SVG Icons
    const filledHeart = `<svg class="w-6 h-6 text-red-500 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    const emptyHeart = `<svg class="w-6 h-6 text-gray-400 stroke-2" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;

    if (isActive) {
        myBookmarkedIds.delete(expId);
        btn.innerHTML = emptyHeart;
    } else {
        myBookmarkedIds.add(expId);
        btn.innerHTML = filledHeart;
    }

    try {
        await fetch(`http://localhost:4000/api/bookmarks/${expId}`, {
            method: "POST", headers: { "Authorization": `Bearer ${token}` }
        });
    } catch (err) { console.error("Bookmark error", err); }
}

function renderExperiences(experiences, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (experiences.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-500">No experiences found.</p></div>';
    return;
  }

  experiences.forEach(exp => {
    const imgSrc = getImageForExperience(exp);
    const maxDiscount = (exp.dynamicDiscounts && Object.values(exp.dynamicDiscounts).length > 0) ? Math.max(...Object.values(exp.dynamicDiscounts)) : 0;
    const ratingDisplay = exp.averageRating > 0 ? `★ ${exp.averageRating.toFixed(1)} <span class="text-gray-400 font-normal">(${exp.reviewCount})</span>` : `★ New`;

    const isBookmarked = myBookmarkedIds.has(exp.id);
    const filledHeart = `<svg class="w-6 h-6 text-red-500 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    const emptyHeart = `<svg class="w-6 h-6 text-gray-400 stroke-2" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;

    const card = document.createElement("div");
    card.className = "group cursor-pointer flex flex-col gap-3"; 

    card.innerHTML = `
      <div class="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-200">
        <img src="${imgSrc}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="${exp.title}">
        ${maxDiscount > 0 ? `<div class="absolute top-3 left-3 px-2 py-1 bg-green-600 text-white text-[10px] font-bold uppercase tracking-wide rounded shadow-sm">Save ${maxDiscount}%</div>` : ''}
        
        <button onclick="toggleBookmark(event, ${exp.id})" class="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-md hover:scale-110 transition z-20 focus:outline-none">
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

async function searchExperiences() {
  const list = document.getElementById("experience-list");
  list.innerHTML = '<p class="text-gray-500 col-span-full text-center py-20">Searching...</p>';

  try {
    const what = document.getElementById("what-input")?.value.trim() || "";
    const loc = document.getElementById("location-input")?.value.trim() || "";
    const sort = document.getElementById("sort-select")?.value || "relevance";

    const params = new URLSearchParams();
    if (what) params.append("q", what);
    if (loc) params.append("city", loc);
    if (sort) params.append("sort", sort);
    
    const res = await fetch(`http://localhost:4000/api/experiences?${params.toString()}`);
    let experiences = await res.json();

    if (currentCategory) experiences = experiences.filter(e => e.tags && e.tags.includes(currentCategory));
    renderExperiences(experiences, "experience-list");
  } catch (err) { console.error(err); }
}

async function loadExploreRecommendations() {
    const token = localStorage.getItem("tst_token");
    if (!token) return;
    try {
        const res = await fetch(`http://localhost:4000/api/recommendations`, { headers: { "Authorization": `Bearer ${token}` } });
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
    btn.className = (btn.textContent.trim() === (cat || "All")) 
        ? "chip active px-4 py-2 rounded-full border border-black bg-black text-white text-xs font-bold transition"
        : "chip px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-900 text-xs font-bold transition hover:border-black";
  });
  searchExperiences();
}