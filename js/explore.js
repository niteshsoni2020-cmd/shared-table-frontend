// Frontend/js/explore.js

// 🔴 1. CORRECT BACKEND URL
const API_BASE = 'https://shared-table-api.onrender.com/api';
const ENDPOINT = '/experiences'; 

document.addEventListener("DOMContentLoaded", () => {
  // ===== ELEMENTS =====
  const searchInput     = document.getElementById("search-input");
  const dateInput       = document.getElementById("date-input");
  const filterBtn       = document.getElementById("filter-btn");
  const filterPanel     = document.getElementById("filter-panel");
  const applyFiltersBtn = document.getElementById("apply-filters");

  // Inputs controlled by slider
  const minPriceInput   = document.getElementById("min-price");
  const maxPriceInput   = document.getElementById("max-price");
  
  // Slider UI
  const priceSlider     = document.getElementById('price-slider');
  const priceMinLabel   = document.getElementById('price-min-label');
  const priceMaxLabel   = document.getElementById('price-max-label');

  const categoryChips   = document.querySelectorAll(".filter-chip");
  const experiencesGrid = document.getElementById("experiences-grid");
  const noResultsEl     = document.getElementById("no-results");

  if (!experiencesGrid) return;

  let activeCategory = "all";

  // ===== 2. INITIALIZE SLIDER =====
  if (priceSlider && typeof noUiSlider !== 'undefined') {
      noUiSlider.create(priceSlider, {
          start: [0, 300], 
          connect: true,
          range: { 'min': 0, 'max': 300 },
          step: 10,
          tooltips: false
      });

      priceSlider.noUiSlider.on('update', function (values) {
          const min = Math.round(values[0]);
          const max = Math.round(values[1]);
          
          if (priceMinLabel) priceMinLabel.innerText = `$${min}`;
          if (priceMaxLabel) priceMaxLabel.innerText = `$${max}+`;

          if (minPriceInput) minPriceInput.value = min;
          if (maxPriceInput) maxPriceInput.value = max;
      });
  }

  const formatPrice = (value) => "$" + Number(value).toFixed(0);

  const debounce = (fn, delay = 400) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  // ===== TOGGLE FILTER PANEL =====
  if (filterBtn && filterPanel) {
    filterBtn.addEventListener("click", () => {
      filterPanel.classList.toggle("hidden");
    });
  }

  // ===== CATEGORY LOGIC =====
  const initCategoryChips = () => {
    categoryChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        categoryChips.forEach((c) => {
          c.classList.remove("active");
          c.classList.remove("bg-gray-900", "text-white", "border-transparent");
          c.classList.add("bg-white", "border-gray-200", "text-gray-600");
        });

        chip.classList.add("active");
        chip.classList.add("bg-gray-900", "text-white");
        chip.classList.remove("bg-white", "border-gray-200", "text-gray-600");

        activeCategory = chip.getAttribute("data-category") || "all";
        fetchExperiences(); 
      });
    });
  };

  // ===== RENDER LOGIC =====
  const renderExperiences = (experiences) => {
    experiencesGrid.innerHTML = "";

    if (!experiences || !experiences.length) {
      experiencesGrid.classList.add("hidden");
      if(noResultsEl) noResultsEl.classList.remove("hidden");
      return;
    }

    experiencesGrid.classList.remove("hidden");
    if(noResultsEl) noResultsEl.classList.add("hidden");

    experiences.forEach((exp) => {
      const cardId   = exp._id || exp.id || "";
      const title    = exp.title || "Untitled Experience";
      const img      = exp.imageUrl || (exp.images && exp.images[0]) || "https://via.placeholder.com/400x300";
      const price    = exp.price || 0;
      const city     = exp.city || "Australia";
      const hostName = exp.hostName || "Local Host";
      const hostPic  = exp.hostPic || "https://via.placeholder.com/50";
      const rating   = exp.averageRating || 0;
      const reviews  = exp.reviewCount || 0;
      const isPaused = exp.isPaused || false;

      const card = document.createElement("a");
      card.href = `experience.html?id=${cardId}`;
      card.className = "group block bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col";

      card.innerHTML = `
        <div class="relative h-48 w-full overflow-hidden bg-gray-100">
          <img src="${img}" alt="${title}" class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500" onerror="this.src='https://via.placeholder.com/400?text=No+Image'"/>
          <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">${formatPrice(price)}</div>
          ${isPaused ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">Currently Paused</div>' : ''}
        </div>
        <div class="p-4 flex flex-col gap-2 flex-grow">
          <div class="flex items-center gap-2 mb-1">
             <img src="${hostPic}" class="w-6 h-6 rounded-full border border-gray-100" alt="${hostName}">
             <span class="text-xs text-gray-500 truncate">Hosted by ${hostName}</span>
          </div>
          <h3 class="font-bold text-gray-900 mb-1 truncate">${title}</h3>
          <p class="text-xs text-gray-500 flex items-center gap-1 mb-3"><i class="fas fa-map-marker-alt text-orange-500"></i> <span class="line-clamp-1">${city}</span></p>
          <div class="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
             <div class="flex items-center text-xs text-yellow-500 gap-1"><i class="fas fa-star"></i> <span class="font-bold text-gray-700">${rating > 0 ? rating.toFixed(1) : 'New'}</span> <span class="text-gray-400">(${reviews})</span></div>
             <span class="text-xs text-orange-600 font-semibold group-hover:underline">View Details &rarr;</span>
          </div>
        </div>
      `;
      experiencesGrid.appendChild(card);
    });
  };

  // ===== FETCH LOGIC =====
  const fetchExperiences = async () => {
    experiencesGrid.innerHTML = `<div class="col-span-full text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i></div>`;
    if(noResultsEl) noResultsEl.classList.add("hidden");

    const params = new URLSearchParams();
    
    const searchTerm = (searchInput?.value || "").trim();
    if (searchTerm) params.set("q", searchTerm);

    if (dateInput?.value) params.set("date", dateInput.value);

    if (activeCategory && activeCategory !== "all") {
      params.set("category", activeCategory);
    }

    const minVal = minPriceInput ? minPriceInput.value : null;
    const maxVal = maxPriceInput ? maxPriceInput.value : null;
    
    if (minVal) params.set("minPrice", minVal);
    if (maxVal) params.set("maxPrice", maxVal);

    try {
      const res = await fetch(`${API_BASE}${ENDPOINT}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch experiences");
      const data = await res.json();
      renderExperiences(data);
    } catch (err) {
      console.error(err);
      experiencesGrid.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-red-500 mb-2 font-bold">Failed to load experiences.</p><p class="text-gray-400 text-sm">Please check if the Backend is running.</p></div>`;
    }
  };

  const debouncedFetch = debounce(fetchExperiences, 500);

  // ===== EVENTS =====
  if (searchInput) searchInput.addEventListener("input", debouncedFetch);
  if (dateInput) dateInput.addEventListener("change", fetchExperiences);
  if (applyFiltersBtn) applyFiltersBtn.addEventListener("click", fetchExperiences);

  initCategoryChips();
  fetchExperiences(); // Initial Load
});