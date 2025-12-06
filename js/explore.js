// Frontend/js/explore.js

// 🔴 IMPORTANT: DO NOT redeclare API_BASE here.
// It is already defined in common.js. Redeclaring causes a crash.
// const API_BASE = 'https://shared-table-api.onrender.com';

// Assumes helper functions (showModal, etc.) come from common.js.
const searchInput = document.getElementById("search-input");
const dateInput = document.getElementById("date-input");
const experiencesGrid = document.getElementById("experiences-grid");
// Handles both ID variations just in case
const noResultsMessage = document.getElementById("no-results-message") || document.getElementById("no-results");

// Filter UI elements
const filterBtn = document.getElementById("filter-btn");
const filterPanel = document.getElementById("filter-panel");
const minPriceInput = document.getElementById("min-price");
const maxPriceInput = document.getElementById("max-price");
const applyFiltersBtn = document.getElementById("apply-filters");

// In your HTML, chips have class="filter-chip ..." and data-category="..."
const categoryButtons = document.querySelectorAll(".filter-chip");

let allExperiences = [];
let currentCategory = "";
let isLoading = false;

function setLoading(state) {
  isLoading = state;
  if (!experiencesGrid) return;
  if (state) {
    experiencesGrid.innerHTML = `
      <div class="col-span-full flex items-center justify-center py-10 text-gray-500">
        <span class="fas fa-spinner fa-spin mr-2 text-orange-500 text-xl"></span>
        Loading experiences...
      </div>
    `;
    if (noResultsMessage) noResultsMessage.classList.add("hidden");
  }
}

function buildQueryParams() {
  const params = new URLSearchParams();
  const q = (searchInput?.value || "").trim();
  const date = dateInput?.value || "";
  const category = currentCategory || "";
  const minPrice = minPriceInput?.value || "";
  const maxPrice = maxPriceInput?.value || "";

  if (q) params.set("q", q);
  if (date) params.set("date", date);
  if (category && category !== "all") params.set("category", category);
  if (minPrice) params.set("minPrice", minPrice);
  if (maxPrice) params.set("maxPrice", maxPrice);

  return params.toString();
}

function renderExperiences(list, { isFallback = false } = {}) {
  if (!experiencesGrid) return;

  if (!list || list.length === 0) {
    experiencesGrid.innerHTML = "";
    if (noResultsMessage) {
      noResultsMessage.classList.remove("hidden");
      noResultsMessage.innerHTML = `
        <div class="text-center">
          <p class="text-gray-800 font-medium mb-2">No experiences found.</p>
          <p class="text-gray-500 text-sm mb-4">
            Try adjusting your dates or filters.
            ${isFallback ? "" : " We’ll also show you some recommendations below if available."}
          </p>
        </div>
      `;
    }
    return;
  }

  if (noResultsMessage) noResultsMessage.classList.add("hidden");

  experiencesGrid.innerHTML = list
    .map(exp => {
      const img =
        exp.imageUrl ||
        (exp.images && exp.images[0]) ||
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop";
      const price = exp.price ? `$${exp.price}` : "Price on request";
      const rating = exp.averageRating || 0;
      const reviews = exp.reviewCount || 0;

      return `
      <a href="experience.html?id=${exp._id}" class="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
        <div class="relative h-48 overflow-hidden bg-gray-200">
          <img src="${img}" alt="${exp.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
               onerror="this.src='https://via.placeholder.com/400?text=No+Image'">
          <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">
            ${price}
          </div>
          ${exp.isPaused ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">Currently Paused</div>' : ''}
        </div>
        <div class="p-4">
          <div class="flex items-center gap-2 mb-2">
            <img src="${exp.hostPic || 'https://via.placeholder.com/30'}" class="w-6 h-6 rounded-full border border-gray-100">
            <span class="text-xs text-gray-500 truncate">${exp.hostName || 'Local Host'}</span>
          </div>
          <h3 class="font-bold text-gray-900 mb-1 truncate">${exp.title}</h3>
          <p class="text-sm text-gray-500 mb-3 flex items-center gap-1">
            <i class="fas fa-map-marker-alt text-orange-500 text-xs"></i> ${exp.city || "City"}
          </p>
          <div class="flex items-center justify-between border-t border-gray-50 pt-3">
             <div class="flex items-center gap-1 text-yellow-400 text-sm">
                 <i class="fas fa-star"></i>
                 <span class="text-gray-700 font-bold">${rating > 0 ? rating.toFixed(1) : 'New'}</span>
                 <span class="text-gray-400 text-xs">(${reviews})</span>
             </div>
          </div>
        </div>
      </a>`;
    })
    .join("");
}

async function fetchExperiences({ initial = false } = {}) {
  try {
    setLoading(true);
    const qs = buildQueryParams();
    const url = qs ? `${API_BASE}/api/experiences?${qs}` : `${API_BASE}/api/experiences`;
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Unexpected experiences response:", data);
      renderExperiences([]);
      return;
    }

    if (initial) {
      allExperiences = data; // Keep a copy for fallback
    }

    if (data.length === 0 && !initial && allExperiences.length > 0) {
      // Smart fallback
      const sorted = [...allExperiences].sort(
        (a, b) => (b.averageRating || 0) - (a.averageRating || 0)
      );
      renderExperiences(sorted.slice(0, 6), { isFallback: true });
    } else {
      renderExperiences(data);
    }
  } catch (err) {
    console.error("Error loading experiences:", err);
    if (noResultsMessage) {
      noResultsMessage.classList.remove("hidden");
      noResultsMessage.innerHTML = `
        <div class="text-center text-red-500 text-sm">
          Something went wrong loading experiences. Please try again.
        </div>
      `;
    }
  } finally {
    setLoading(false);
  }
}

function handleCategoryClick(e) {
  const btn = e.currentTarget;
  const category = btn.getAttribute("data-category") || "";
  currentCategory = category;

  // Toggle active style
  categoryButtons.forEach(b => {
    b.classList.remove("bg-gray-900", "text-white");
    b.classList.add("bg-white", "text-gray-600", "border");
  });
  
  btn.classList.remove("bg-white", "text-gray-600", "border");
  btn.classList.add("bg-gray-900", "text-white");
  
  fetchExperiences();
}

// Initialize Filter UI
function initFilterUI() {
  if (filterBtn && filterPanel) {
    filterBtn.addEventListener("click", () => {
      filterPanel.classList.toggle("hidden");
    });
  }

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener("click", () => {
      fetchExperiences();
    });
  }
}

function initExplorePage() {
  if (!experiencesGrid) return;

  // Initial load
  fetchExperiences({ initial: true });

  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        fetchExperiences();
      }, 400);
    });
  }

  if (dateInput) {
    dateInput.addEventListener("change", () => {
      fetchExperiences();
    });
  }

  categoryButtons.forEach(btn => btn.addEventListener("click", handleCategoryClick));
  initFilterUI();
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initExplorePage);
