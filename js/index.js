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
function getToken() {
  try { return (window.getAuthToken && window.getAuthToken()) || ""; } catch (_) { return ""; }
}


function renderCollections() {
    const El = window.tstsEl;
    const container = document.getElementById("collections-list");
    if (!container) return;

    container.textContent = "";
    collectionsData.forEach(function(col) {
        var card = El("div", { 
            className: "bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition cursor-pointer group flex flex-col justify-between h-full",
            onclick: function() { window.location.href = "explore.html?q=" + encodeURIComponent(col.searchQuery); }
        }, [
            El("div", {}, [
                El("div", { className: "h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition", textContent: col.icon }),
                El("h3", { className: "text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition", textContent: col.title }),
                El("p", { className: "text-sm text-gray-500 leading-relaxed", textContent: col.description })
            ]),
            El("div", { className: "mt-6 flex items-center text-xs font-bold text-orange-600", textContent: "Browse Collection →" })
        ]);
        container.appendChild(card);
    });
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
  } catch(e) { /* Banner load failed silently */ }
}

async function loadHomeRecommendations() {
  const section = document.getElementById("home-recommend");
  const list = document.getElementById("home-recommend-list");
  if (!section || !list) return;
  const token = getToken();
  try {
    const endpoint = token ? "/api/recommendations" : "/api/experiences?sort=rating_desc";
    const res = await window.authFetch(endpoint, { method: "GET" });
    const payload = await res.json();
    const items = Array.isArray(payload) ? payload : (payload && payload.experiences) ? payload.experiences : (payload && payload.items) ? payload.items : [];
    const recs = items.slice(0, 4);
    if (recs.length > 0) {
      section.classList.remove("hidden");
      list.textContent = "";
      recs.forEach(function(exp) {
        list.appendChild(renderCard(exp));
      });
    }
  } catch(e) {
    /* Recommendations load failed silently */
  }
}

function renderCard(exp) {
    const El = window.tstsEl;
    const fallbackImg = "/assets/experience-default.jpg";
    let imgSrc = fallbackImg;
    if (exp.imageUrl && exp.imageUrl.includes("cloudinary.com")) {
        imgSrc = exp.imageUrl.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/');
    } else if (exp.imageUrl) {
        imgSrc = window.tstsSafeUrl(exp.imageUrl, fallbackImg);
    }

    const avg = (exp && typeof exp.averageRating === 'number') ? exp.averageRating : 0;
    const rating = avg > 0 ? "★ " + avg.toFixed(1) : "New";
    const expId = (exp && (exp._id || exp.id)) || "";
    const title = exp.title || "";
    const city = exp.city || "";
    const tag = (exp && Array.isArray(exp.tags) && exp.tags[0]) ? exp.tags[0] : "Experience";
    const price = (exp && (typeof exp.price === 'number' || typeof exp.price === 'string')) ? String(exp.price) : "";

    var imgEl = El("img", { className: "w-full h-full object-cover group-hover:scale-105 transition duration-500", loading: "lazy" });
    window.tstsSafeImg(imgEl, imgSrc, fallbackImg);

    var card = El("div", {
        className: "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer group",
        onclick: function() { window.location.href = "experience.html?id=" + encodeURIComponent(expId); }
    }, [
        El("div", { className: "h-48 bg-gray-200 relative overflow-hidden" }, [
            imgEl,
            El("div", { className: "absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-2 py-1 text-xs font-bold shadow-sm", textContent: rating })
        ]),
        El("div", { className: "p-4" }, [
            El("h3", { className: "font-bold text-gray-900 mb-1 truncate", textContent: title }),
            El("p", { className: "text-xs text-gray-500 mb-3", textContent: city + " • " + tag }),
            El("div", { className: "flex justify-between items-center border-t border-gray-50 pt-3" }, [
                El("span", { className: "font-bold text-gray-900", textContent: price }),
                El("span", { className: "text-xs text-orange-600 font-bold uppercase tracking-wide group-hover:underline", textContent: "View" })
            ])
        ])
    ]);
    return card;
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  renderCollections();
  updateMaxDiscountBanner();
  loadHomeRecommendations();
});
