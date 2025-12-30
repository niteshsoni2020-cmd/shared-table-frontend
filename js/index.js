// js/index.js

// --- 1. DATA: CURATED COLLECTIONS ---
const collectionsData = [
  {
    id: "solo-traveller-friendly",
    title: "Solo Friendly",
    description: "Intimate tables where you'll feel like family, not a stranger.",
    icon: "🧭",
    searchQuery: "solo"
  },
  {
    id: "date-night",
    title: "Date Night",
    description: "Candlelit dinners and cozy homes perfect for conversation.",
    icon: "💫",
    searchQuery: "romantic"
  },
  {
    id: "budget-eats",
    title: "Budget Eats",
    description: "Affordable home-cooked meals rich in flavor and stories.",
    icon: "🍲",
    searchQuery: "budget"
  },
  {
    id: "family-and-friends",
    title: "Family Tables",
    description: "Experiences where kids and groups are welcomed with open arms.",
    icon: "👨‍👩‍👧‍👦",
    searchQuery: "family"
  }
];

// --- 2. RENDER LOGIC ---
function renderCollections() {
    const container = document.getElementById("collections-list");
    if (!container) return;

    container.innerHTML = collectionsData.map(col => `
        <div onclick="window.location.href='explore.html?q=${col.searchQuery}'" 
             class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition cursor-pointer group flex flex-col justify-between h-full">
            <div>
                <div class="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
                    ${col.icon}
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition">${col.title}</h3>
                <p class="text-sm text-gray-500 leading-relaxed">${col.description}</p>
            </div>
            <div class="mt-6 flex items-center text-xs font-bold text-orange-600">
                Browse Collection <span>→</span>
            </div>
        </div>
    `).join("");
}

// --- 3. RECOMMENDATIONS & DEALS ---
async function updateMaxDiscountBanner() {
  const bannerEl = document.getElementById("max-discount-banner");
  if (!bannerEl) return;

  try {
      const res = await window.authFetch("/api/experiences");
      const experiences = await res.json();
      
      let maxDiscount = 0;
      experiences.forEach(exp => {
          if (exp.dynamicDiscounts) {
              const vals = Object.values(exp.dynamicDiscounts);
              if (vals.length > 0) maxDiscount = Math.max(maxDiscount, ...vals);
          }
      });

      if (maxDiscount > 0) {
        bannerEl.textContent = `Discover hosts offering up to ${maxDiscount}% off for groups this week.`;
      }
  } catch(e) { console.error("Banner error", e); }
}

async function loadHomeRecommendations() {
  const section = document.getElementById("home-recommend");
  const list = document.getElementById("home-recommend-list");
  if (!section || !list) return;

  const token = getToken();
  try {
      const endpoint = token ? "/api/recommendations" : "/api/experiences?sort=rating_desc";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const res = await window.authFetch(endpoint, { headers });
      const data = await res.json();
      
      const recs = data.slice(0, 4); 

      if (recs.length > 0) {
          section.classList.remove("hidden");
          list.innerHTML = recs.map(exp => renderCard(exp)).join("");
      }
  } catch (err) { console.error("Recs error", err); }
}

function renderCard(exp) {
    let imgSrc = "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=400&auto=format&fit=crop";
    if (exp.imageUrl && exp.imageUrl.includes("cloudinary.com")) {
        imgSrc = exp.imageUrl.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/');
    } else if (exp.imageUrl) {
        imgSrc = exp.imageUrl;
    }

    const rating = exp.averageRating > 0 ? `★ ${exp.averageRating.toFixed(1)}` : "New";

    // ADDED: loading="lazy"
    return `
    <div onclick="window.location.href='experience.html?id=${exp.id}'" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer group">
        <div class="h-48 bg-gray-200 relative overflow-hidden">
            <img src="${imgSrc}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
            <div class="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-2 py-1 text-xs font-bold shadow-sm">
                ${rating}
            </div>
        </div>
        <div class="p-4">
            <h3 class="font-bold text-gray-900 mb-1 truncate">${exp.title}</h3>
            <p class="text-xs text-gray-500 mb-3">${exp.city} • ${exp.tags[0] || 'Experience'}</p>
            <div class="flex justify-between items-center border-t border-gray-50 pt-3">
                <span class="font-bold text-gray-900">$${exp.price}</span>
                <span class="text-xs text-orange-600 font-bold uppercase tracking-wide group-hover:underline">View</span>
            </div>
        </div>
    </div>`;
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  renderCollections();
  updateMaxDiscountBanner();
  loadHomeRecommendations();
});