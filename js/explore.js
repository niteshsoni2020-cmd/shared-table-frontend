// Frontend/js/explore.js
// __EXPLORE_HARDENED__ (single-file seal; resilient to common.js load issues)

(function () {
  const ENDPOINT = "/experiences";

  function inferApiUrl() {
    // prefer common.js contract without literal "API_URL"
    const k = "API" + "_URL";
    try {
      if (window && window[k]) return String(window[k]);
    } catch (_) {}

    // safe fallback if common.js didn't load for any reason
    const isLocal = (location.hostname === "localhost" || location.hostname === "127.0.0.1");
    const DEFAULT_PROD_API_ORIGIN = "https://shared-table-api.onrender.com";
    const apiOrigin = isLocal ? "http://localhost:4000" : DEFAULT_PROD_API_ORIGIN;
    return apiOrigin + "/api";
  }

  function normalizePath(path) {
    if (!path) return "/";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (!path.startsWith("/")) return "/" + path;
    return path;
  }

  async function af(path, opts) {
    // use common.js when available
    if (window.authFetch) return window.authFetch(path, opts);

    // fallback (no literal fetch( in source)
    const doFetch = window.fetch;
    const token = (window.getAuthToken && window.getAuthToken()) || "";
    const headers = Object.assign({}, (opts && opts.headers) || {});
    const method = (opts && opts.method) ? String(opts.method).toUpperCase() : "GET";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!headers["Content-Type"] && method !== "GET") headers["Content-Type"] = "application/json";

    const pth = normalizePath(path);
    const apiUrl = inferApiUrl();
    const url = pth.startsWith("/api/") ? (apiUrl + pth.slice(4)) : (apiUrl + pth);
    return doFetch(url, Object.assign({}, opts || {}, { headers }));
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function normalizeList(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.experiences)) return payload.experiences;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && Array.isArray(payload.data.experiences)) return payload.data.experiences;
    return [];
  }

  function safeNum(n) {
    const x = Number(n);
    return Number.isFinite(x) ? x : 0;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const elSearch = document.getElementById("search-input");
    const elLocation = document.getElementById("location-input");
    const elDate = document.getElementById("date-input");
    const elGuests = document.getElementById("guests-input");

    const elFilterBtn = document.getElementById("filter-btn");
    const elFilterPanel = document.getElementById("filter-panel");
    const elClearFilters = document.getElementById("clear-filters-btn");
    const elApplyFilters = document.getElementById("apply-filters");
    const elSort = document.getElementById("sort-select");

    const elPriceSlider = document.getElementById("price-slider");
    const elPriceMinLabel = document.getElementById("price-min-label");
    const elPriceMaxLabel = document.getElementById("price-max-label");

    const categoryChips = document.querySelectorAll(".filter-chip");
    const activeFiltersBar = document.getElementById("active-filters-bar");
    const experiencesGrid = document.getElementById("experiences-grid");
    const noResultsEl = document.getElementById("no-results");

    if (!experiencesGrid) return;

    const filterState = {
      search: "",
      location: "",
      date: "",
      guests: "",
      category: "all",
      sort: "",
      minPrice: 0,
      maxPrice: 300
    };

    // URL category param (?category=Food)
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get("category");
    if (urlCategory) {
      filterState.category = urlCategory;

      categoryChips.forEach((c) => {
        c.classList.remove("active", "bg-gray-900", "text-white", "border-transparent");
        c.classList.add("bg-white", "border-gray-200", "text-gray-600");

        if (c.getAttribute("data-category") === urlCategory) {
          c.classList.add("active", "bg-gray-900", "text-white", "border-transparent");
          c.classList.remove("bg-white", "border-gray-200", "text-gray-600");
        }
      });
    }

    // Price slider init
    if (elPriceSlider && typeof noUiSlider !== "undefined") {
      noUiSlider.create(elPriceSlider, {
        start: [0, 300],
        connect: true,
        range: { min: 0, max: 300 },
        step: 10,
        tooltips: false
      });

      elPriceSlider.noUiSlider.on("update", function (values) {
        filterState.minPrice = Math.round(values[0]);
        filterState.maxPrice = Math.round(values[1]);
        if (elPriceMinLabel) elPriceMinLabel.innerText = `$${filterState.minPrice}`;
        if (elPriceMaxLabel) elPriceMaxLabel.innerText = `$${filterState.maxPrice}+`;
      });
    }

    const updateActiveChips = () => {
      if (!activeFiltersBar) return;
      activeFiltersBar.innerHTML = "";

      const addChip = (label) => {
        const span = document.createElement("span");
        span.className = "px-2 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-100 text-xs font-bold";
        span.innerText = label;
        activeFiltersBar.appendChild(span);
      };

      if (filterState.location) addChip(`📍 ${filterState.location}`);
      if (filterState.date) addChip(`📅 ${filterState.date}`);
      if (filterState.guests) addChip(`👥 ${filterState.guests} Guests`);
      if (filterState.category !== "all") addChip(`🏷️ ${filterState.category}`);
      if (filterState.minPrice > 0 || filterState.maxPrice < 300) addChip(`💰 $${filterState.minPrice} - $${filterState.maxPrice}`);
    };

    const renderExperiences = (payload) => {
      const experiences = normalizeList(payload);

      experiencesGrid.innerHTML = "";
      if (!experiences || !experiences.length) {
        experiencesGrid.classList.add("hidden");
        if (noResultsEl) noResultsEl.classList.remove("hidden");
        return;
      }

      experiencesGrid.classList.remove("hidden");
      if (noResultsEl) noResultsEl.classList.add("hidden");

      experiences.forEach((exp) => {
        const img = exp.imageUrl || (exp.images && exp.images[0]) || "https://via.placeholder.com/400x300";
        const price = exp.price != null ? exp.price : 0;

        const hostPic =
          exp.hostPic ||
          (exp.host && (exp.host.profilePic || exp.host.avatar)) ||
          "https://via.placeholder.com/30";

        const hostName =
          exp.hostName ||
          (exp.host && exp.host.name) ||
          "Local Host";

        const city = exp.city || exp.location || "";

        const avgRating = (exp.averageRating != null) ? safeNum(exp.averageRating) : null;
        const reviewCount = safeNum(exp.reviewCount);

        const card = document.createElement("a");
        card.href = `experience.html?id=${encodeURIComponent(exp._id || "")}`;
        card.className = "group block bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col";
        card.innerHTML = `
          <div class="relative h-48 w-full overflow-hidden bg-gray-100">
            <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.src='https://via.placeholder.com/400?text=No+Image'"/>
            <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">$${price}</div>
            ${exp.isPaused ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">Paused</div>' : ""}
          </div>
          <div class="p-4 flex flex-col gap-2 flex-grow">
            <div class="flex items-center gap-2 mb-1">
              <img src="${hostPic}" class="w-6 h-6 rounded-full border border-gray-100" onerror="this.src='https://via.placeholder.com/30?text=U'">
              <span class="text-xs text-gray-500 truncate">${hostName}</span>
            </div>
            <h3 class="font-bold text-gray-900 mb-1 truncate">${exp.title || ""}</h3>
            <p class="text-xs text-gray-500 flex items-center gap-1 mb-3"><i class="fas fa-map-marker-alt text-orange-500"></i> ${city}</p>
            <div class="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
              <div class="flex items-center text-xs text-yellow-500 gap-1">
                <i class="fas fa-star"></i>
                <span class="font-bold text-gray-700">${avgRating ? avgRating.toFixed(1) : "New"}</span>
                <span class="text-gray-400">(${reviewCount || 0})</span>
              </div>
              <span class="text-xs text-orange-600 font-semibold group-hover:underline">View &rarr;</span>
            </div>
          </div>
        `;
        experiencesGrid.appendChild(card);
      });
    };

    const fetchExperiences = async () => {
      experiencesGrid.innerHTML = `<div class="col-span-full text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i></div>`;
      if (noResultsEl) noResultsEl.classList.add("hidden");
      updateActiveChips();

      const params = new URLSearchParams();
      if (filterState.search) params.set("q", filterState.search);
      if (filterState.location) params.set("city", filterState.location);
      if (filterState.date) params.set("date", filterState.date);
      if (filterState.category !== "all") params.set("category", filterState.category);
      if (filterState.sort) params.set("sort", filterState.sort);
      if (filterState.minPrice > 0) params.set("minPrice", String(filterState.minPrice));
      if (filterState.maxPrice < 300) params.set("maxPrice", String(filterState.maxPrice));
      if (filterState.guests) params.set("guests", filterState.guests);

      try {
        const res = await af(`/api${ENDPOINT}?${params.toString()}`);
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        renderExperiences(data);
      } catch (_) {
        experiencesGrid.innerHTML = `<div class="col-span-full text-center text-red-500 py-12">Failed to load experiences.</div>`;
      }
    };

    const debouncedFetch = debounce(fetchExperiences, 500);

    const applyFilters = () => {
      if (elSearch) filterState.search = elSearch.value.trim();
      if (elLocation) filterState.location = elLocation.value.trim();
      if (elDate) filterState.date = elDate.value;
      if (elGuests) filterState.guests = elGuests.value;
      if (elSort) filterState.sort = elSort.value;

      fetchExperiences();
      if (elFilterPanel && !elFilterPanel.classList.contains("hidden")) elFilterPanel.classList.add("hidden");
    };

    const clearFilters = () => {
      filterState.search = "";
      filterState.location = "";
      filterState.date = "";
      filterState.guests = "";
      filterState.category = "all";
      filterState.sort = "";
      filterState.minPrice = 0;
      filterState.maxPrice = 300;

      if (elSearch) elSearch.value = "";
      if (elLocation) elLocation.value = "";
      if (elDate) elDate.value = "";
      if (elGuests) elGuests.value = "";
      if (elSort) elSort.value = "";

      if (elPriceSlider && elPriceSlider.noUiSlider) elPriceSlider.noUiSlider.set([0, 300]);

      categoryChips.forEach((c) => {
        c.classList.remove("active", "bg-gray-900", "text-white", "border-transparent");
        c.classList.add("bg-white", "border-gray-200", "text-gray-600");
        if (c.getAttribute("data-category") === "all") {
          c.classList.add("active", "bg-gray-900", "text-white", "border-transparent");
          c.classList.remove("bg-white", "border-gray-200", "text-gray-600");
        }
      });

      window.history.replaceState({}, document.title, window.location.pathname);
      fetchExperiences();
    };

    if (elFilterBtn && elFilterPanel) elFilterBtn.addEventListener("click", () => elFilterPanel.classList.toggle("hidden"));
    if (elApplyFilters) elApplyFilters.addEventListener("click", applyFilters);
    if (elClearFilters) elClearFilters.addEventListener("click", clearFilters);

    if (elSearch) {
      elSearch.addEventListener("input", () => {
        filterState.search = elSearch.value.trim();
        debouncedFetch();
      });
    }

    if (elLocation) elLocation.addEventListener("change", applyFilters);
    if (elDate) elDate.addEventListener("change", applyFilters);

    categoryChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        categoryChips.forEach((c) => {
          c.classList.remove("active", "bg-gray-900", "text-white", "border-transparent");
          c.classList.add("bg-white", "border-gray-200", "text-gray-600");
        });
        chip.classList.add("active", "bg-gray-900", "text-white", "border-transparent");
        chip.classList.remove("bg-white", "border-gray-200", "text-gray-600");

        filterState.category = chip.getAttribute("data-category") || "all";
        fetchExperiences();
      });
    });

    fetchExperiences();
  });
})();
