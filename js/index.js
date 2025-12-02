// js/index.js

let experiencesCachePromise = null;

// Reuse API base + getToken from common.js
// API_BASE and getToken() are defined globally in common.js

// ---- Helpers ----

// Fetch all experiences once and cache the promise
function getAllExperiences() {
  if (!experiencesCachePromise) {
    experiencesCachePromise = fetch(`${API_BASE}/api/experiences`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load experiences");
        return res.json();
      })
      .catch(err => {
        console.error("Error fetching experiences for homepage:", err);
        return [];
      });
  }
  return experiencesCachePromise;
}

// Compute max discount for a single experience
function getMaxDiscountFromExp(exp) {
  if (!exp) return null;

  if (typeof exp.maxDiscountPercent === "number") {
    return exp.maxDiscountPercent;
  }

  const dd = exp.dynamicDiscounts;
  if (!dd || typeof dd !== "object") return null;

  let max = 0;
  for (let g = 1; g <= 12; g++) {
    const key1 = g;
    const key2 = String(g);
    const v = dd[key1] ?? dd[key2];
    if (typeof v === "number" && v > max) {
      max = v;
    }
  }
  return max || null;
}

// Find the experience with the overall highest discount
function findBestDiscountExperience(experiences) {
  let best = null;
  let bestDiscount = 0;

  experiences.forEach(exp => {
    const d = getMaxDiscountFromExp(exp);
    if (typeof d === "number" && d > bestDiscount) {
      bestDiscount = d;
      best = exp;
    }
  });

  if (!best || bestDiscount <= 0) return null;

  return { exp: best, discount: bestDiscount };
}

// Pick top-N recommendations from a list (prefer higher rating)
function pickTopRecommendations(experiences, n = 3) {
  if (!Array.isArray(experiences) || experiences.length === 0) {
    return [];
  }

  const expsCopy = [...experiences];

  expsCopy.sort((a, b) => {
    const ar = typeof a.averageRating === "number" ? a.averageRating : 0;
    const br = typeof b.averageRating === "number" ? b.averageRating : 0;
    // Descending rating
    if (br !== ar) return br - ar;

    // Tie-breaker: more reviews first
    const ac = typeof a.reviewCount === "number" ? a.reviewCount : 0;
    const bc = typeof b.reviewCount === "number" ? b.reviewCount : 0;
    return bc - ac;
  });

  return expsCopy.slice(0, n);
}

// Render a single recommendation card
function renderRecommendationCard(container, exp) {
  const card = document.createElement("article");
  card.className =
    "bg-white rounded-2xl shadow p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md transition border border-gray-100";

  const title = exp.title || "Shared table experience";
  const city = (exp.city || "").trim();
  const tags = Array.isArray(exp.tags) ? exp.tags : [];
  const price = typeof exp.price === "number" ? exp.price : null;
  const rating = typeof exp.averageRating === "number" ? exp.averageRating : null;
  const reviewCount = typeof exp.reviewCount === "number" ? exp.reviewCount : null;
  const maxDiscount = getMaxDiscountFromExp(exp);

  card.innerHTML = `
    <div class="flex flex-col gap-1">
      <h3 class="text-base font-semibold text-gray-900">${title}</h3>
      <p class="text-xs text-gray-500">
        ${city || "Hosted nearby"}
        ${
          tags && tags.length
            ? " · " + tags.slice(0, 2).join(", ")
            : ""
        }
      </p>
      ${
        rating !== null
          ? `<p class="text-xs text-gray-500">
               ⭐ ${rating.toFixed(1)}${
                 reviewCount
                   ? ` · ${reviewCount} review${reviewCount === 1 ? "" : "s"}`
                   : ""
               }
             </p>`
          : ""
      }
    </div>

    <div class="mt-2 flex items-baseline justify-between">
      <div>
        ${
          price !== null
            ? `<p class="text-sm font-semibold text-gray-900">
                 From $${price.toFixed(2)} per person
               </p>`
            : ""
        }
        ${
          maxDiscount
            ? `<p class="text-xs text-green-700 mt-1">
                 Up to ${maxDiscount}% off on group bookings
               </p>`
            : ""
        }
      </div>
    </div>
  `;

  card.addEventListener("click", () => {
    if (typeof exp.id !== "undefined") {
      window.location.href = `experience.html?id=${exp.id}`;
    }
  });

  container.appendChild(card);
}

// ---- Banner: max discount text ----

async function updateMaxDiscountBanner() {
  const bannerEl = document.getElementById("max-discount-banner");
  const discountCard = document.getElementById("discount-card");
  if (!bannerEl) return;

  const experiences = await getAllExperiences();
  if (!Array.isArray(experiences) || experiences.length === 0) {
    bannerEl.textContent = "Discover hosts offering group discounts.";
    return;
  }

  const best = findBestDiscountExperience(experiences);
  if (!best) {
    bannerEl.textContent = "Discover hosts offering group discounts.";
    return;
  }

  const { exp, discount } = best;
  const city = (exp.city || "").trim();

  if (discount > 0 && city) {
    bannerEl.textContent = `Save up to ${discount}% on shared experiences in ${city}.`;
  } else if (discount > 0) {
    bannerEl.textContent = `Save up to ${discount}% on shared experiences with group bookings.`;
  } else {
    bannerEl.textContent = "Discover hosts offering group discounts.";
  }

  // Make the discount banner lead user into Explore with a focus on deals
  if (discountCard) {
    discountCard.addEventListener("click", () => {
      // You can make this more specific later, e.g. ?sort=best_deals
      window.location.href = "explore.html";
    });
  }
}

// ---- Recommendations section ----

async function loadHomeRecommendations() {
  const section = document.getElementById("home-recommend");
  const list = document.getElementById("home-recommend-list");
  if (!section || !list) return;

  const token = typeof getToken === "function" ? getToken() : null;
  let recs = [];

  // 1) Try personalized recommendations if logged in
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/api/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          recs = data;
        }
      }
    } catch (err) {
      console.error("Error loading personalized recommendations:", err);
    }
  }

  // 2) Fallback: use top-rated experiences
  if (recs.length === 0) {
    const experiences = await getAllExperiences();
    recs = pickTopRecommendations(experiences, 3);
  }

  if (!recs || recs.length === 0) {
    // Nothing to show -> keep section hidden
    section.classList.add("hidden");
    return;
  }

  // Render
  list.innerHTML = "";
  recs.slice(0, 3).forEach(exp => renderRecommendationCard(list, exp));
  section.classList.remove("hidden");
}

// ---- Init ----

document.addEventListener("DOMContentLoaded", () => {
  // Update banner + hook discount card
  updateMaxDiscountBanner().catch(err =>
    console.error("Error updating max discount banner:", err)
  );

  // Load recommendations
  loadHomeRecommendations().catch(err =>
    console.error("Error loading home recommendations:", err)
  );
});
