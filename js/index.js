// js/index.js

function getToken() {
  try { return (window.getAuthToken && window.getAuthToken()) || ""; } catch (_) { return ""; }
}

async function loadHomeCurations() {
  const section = document.getElementById("home-curations");
  const list = document.getElementById("home-curations-list");
  if (!section || !list) return;

  const token = getToken();
  if (!token) return;

  try {
    const res = await window.authFetch("/api/curations", { method: "GET" });
    if (!res || res.ok !== true) return;

    const payload = await res.json();
    const collections = payload && Array.isArray(payload.collections) ? payload.collections : [];
    if (collections.length <= 0) return;

    section.classList.remove("hidden");

    const top3 = collections.slice(0, 3);
    list.textContent = "";

    top3.forEach((c) => list.appendChild(renderCurationTile(c)));

    list.appendChild(renderExploreMoreTile());
  } catch (_) {
    return;
  }
}

function renderCurationTile(c) {
  const El = window.tstsEl;
  const filters = (c && c.filters && typeof c.filters === "object") ? c.filters : {};
  const href = buildExploreHref(filters);

  const title = String((c && c.title) || "").trim();
  const subtitle = String((c && c.subtitle) || "").trim();

  return El("a", {
    href,
    className: "bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition cursor-pointer group flex flex-col justify-between h-full"
  }, [
    El("div", {}, [
      El("h3", { className: "text-xl font-bold font-serif text-gray-900", textContent: title || "Explore" }),
      subtitle ? El("p", { className: "text-gray-600 text-sm mt-2", textContent: subtitle }) : El("div", {})
    ]),
    El("div", { className: "mt-6 flex items-center text-sm font-bold text-orange-600", textContent: "Browse →" })
  ]);
}

function renderExploreMoreTile() {
  const El = window.tstsEl;
  return El("a", {
    href: "explore.html",
    className: "bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition cursor-pointer group flex flex-col justify-between h-full"
  }, [
    El("div", {}, [
      El("h3", { className: "text-xl font-bold font-serif text-gray-900", textContent: "Explore more experiences →" }),
      El("p", { className: "text-gray-600 text-sm mt-2", textContent: "See everything available right now." })
    ]),
    El("div", { className: "mt-6 flex items-center text-sm font-bold text-orange-600", textContent: "Explore →" })
  ]);
}

function buildExploreHref(filters) {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", String(filters.q));
  if (filters.city) p.set("city", String(filters.city));
  if (filters.category) p.set("category", String(filters.category));
  if (filters.minPrice != null) p.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) p.set("maxPrice", String(filters.maxPrice));
  if (filters.date) p.set("date", String(filters.date));
  return "explore.html?" + p.toString();
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
  updateMaxDiscountBanner();
  loadHomeRecommendations();
  loadHomeCurations();
});
