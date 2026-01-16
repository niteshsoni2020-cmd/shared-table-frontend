// Frontend/js/explore.js

// 🔴 CONFIG
const ENDPOINT = '/experiences'; 

document.addEventListener("DOMContentLoaded", () => {
    // === DOM ELEMENTS ===
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

    // === UNIFIED STATE ===
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

    function tstsIsDeal(exp) {
        try {
            const e = exp || {};
            if (e.isDeal === true) return true;
            const direct = Number(e.discountPercent || e.discount || 0);
            if (isFinite(direct) && direct > 0) return true;
            const dyn = e.dynamicDiscounts && typeof e.dynamicDiscounts === "object" ? e.dynamicDiscounts : null;
            if (dyn) {
                const vals = Object.values(dyn).map((v) => Number(v)).filter((v) => isFinite(v));
                if (vals.some((v) => v > 0)) return true;
            }
        } catch (_) {}
        return false;
    }

    function tstsSetDealsBanner(_) {
        return;
    }

    // === URL PARAM HANDLER ===
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get("category");
    const urlQuery = urlParams.get("q");
    const urlFilter = urlParams.get("filter");

    if (urlQuery && elSearch) {
        filterState.search = String(urlQuery).trim();
        elSearch.value = filterState.search;
    }

    if (urlCategory) {
        filterState.category = urlCategory;
        categoryChips.forEach(c => {
            c.classList.remove("active", "bg-gray-900", "text-white", "border-transparent");
            c.classList.add("bg-white", "border-gray-200", "text-gray-600");
            if (c.getAttribute("data-category") === urlCategory) {
                c.classList.add("active", "bg-gray-900", "text-white", "border-transparent");
                c.classList.remove("bg-white", "border-gray-200", "text-gray-600");
            }
        });
    }

    window.TSTS_DEALS_UI_MODE = (String(urlFilter || "").trim().toLowerCase() === "deals");

    // === INITIALIZE SLIDER ===
    if (elPriceSlider && typeof noUiSlider !== 'undefined') {
        noUiSlider.create(elPriceSlider, {
            start: [0, 300],
            connect: true,
            range: { 'min': 0, 'max': 300 },
            step: 10,
            tooltips: false
        });

        elPriceSlider.noUiSlider.on('update', function (values) {
            filterState.minPrice = Math.round(values[0]);
            filterState.maxPrice = Math.round(values[1]);
            if (elPriceMinLabel) elPriceMinLabel.innerText = `$${filterState.minPrice}`;
            if (elPriceMaxLabel) elPriceMaxLabel.innerText = `$${filterState.maxPrice}+`;
        });
    }

    // === FILTER ACTIONS ===
    
    // 1. Build Query & Fetch
    const fetchExperiences = async () => {
        // UI Loading
        experiencesGrid.innerHTML = `<div class="col-span-full text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i></div>`;
        noResultsEl.classList.add("hidden");
        updateActiveChips(); 

        const params = new URLSearchParams();
        if (filterState.search) params.set("q", filterState.search);
        if (filterState.location) params.set("city", filterState.location);
        if (filterState.date) params.set("date", filterState.date);
        if (filterState.category !== "all") params.set("category", filterState.category);
        if (filterState.sort) params.set("sort", filterState.sort);
        if (filterState.minPrice > 0) params.set("minPrice", filterState.minPrice);
        if (filterState.maxPrice < 300) params.set("maxPrice", filterState.maxPrice);
        if (filterState.guests) params.set("guests", filterState.guests);

        try {
            const res = await window.authFetch(`/api${ENDPOINT}?${params.toString()}`, { method: "GET" });
            if (!res.ok) throw new Error("API Error");
            const data = await res.json().catch(() => null);

            const list = Array.isArray(data) ? data : (data && Array.isArray(data.experiences) ? data.experiences : []);
            const out = window.TSTS_DEALS_UI_MODE ? list.filter(tstsIsDeal) : list;
            if (window.TSTS_DEALS_UI_MODE) tstsSetDealsBanner("");
            renderExperiences(out);
        } catch (err) {
            console.error(err);
            experiencesGrid.classList.remove("hidden");
            noResultsEl.classList.add("hidden");
            experiencesGrid.innerHTML = `<div class="col-span-full text-center text-red-500 py-12">Failed to load experiences.</div>`;
        }
    };

    const debouncedFetch = debounce(fetchExperiences, 500);

    // 2. Apply Filters
    const applyFilters = () => {
        if (elSearch) filterState.search = elSearch.value.trim();
        if (elLocation) filterState.location = elLocation.value.trim();
        if (elDate) filterState.date = elDate.value;
        if (elGuests) filterState.guests = elGuests.value;
        if (elSort) filterState.sort = elSort.value;
        
        fetchExperiences();
        if (!elFilterPanel.classList.contains("hidden")) elFilterPanel.classList.add("hidden");
    };

    // 3. Clear Filters
    const clearFilters = () => {
        // Reset State
        filterState.search = "";
        filterState.location = "";
        filterState.date = "";
        filterState.guests = "";
        filterState.category = "all";
        filterState.sort = "";
        filterState.minPrice = 0;
        filterState.maxPrice = 300;

        // Reset DOM
        if (elSearch) elSearch.value = "";
        if (elLocation) elLocation.value = "";
        if (elDate) elDate.value = "";
        if (elGuests) elGuests.value = "";
        if (elSort) elSort.value = "";
        
        if (elPriceSlider && elPriceSlider.noUiSlider) elPriceSlider.noUiSlider.set([0, 300]);

        // Reset Category Chips
        categoryChips.forEach(c => {
            c.classList.remove("active", "bg-gray-900", "text-white", "border-transparent");
            c.classList.add("bg-white", "border-gray-200", "text-gray-600");
            if (c.getAttribute("data-category") === "all") {
                c.classList.add("active", "bg-gray-900", "text-white", "border-transparent");
                c.classList.remove("bg-white", "border-gray-200", "text-gray-600");
            }
        });
        
        // Remove URL params cleanly
        window.history.replaceState({}, document.title, window.location.pathname);

        fetchExperiences();
    };

    // === RENDER LOGIC ===
    const renderExperiences = (experiences) => {
        experiencesGrid.innerHTML = "";
        if (!experiences || !experiences.length) {
            experiencesGrid.classList.add("hidden");
            noResultsEl.classList.remove("hidden");
            return;
        }
        experiencesGrid.classList.remove("hidden");
        noResultsEl.classList.add("hidden");

        experiences.forEach(exp => {
            const img = exp.imageUrl || (exp.images && exp.images[0]) || "https://via.placeholder.com/400x300";
            const price = exp.price || 0;
            
            const card = document.createElement("a");
            card.href = `experience.html?id=${exp._id}`;
            card.className = "group block bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col";
            card.innerHTML = `
                <div class="relative h-48 w-full overflow-hidden bg-gray-100">
                    <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.src='https://via.placeholder.com/400?text=No+Image'"/>
                    <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">$${price}</div>
                    ${exp.isPaused ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">Paused</div>' : ''}
                </div>
                <div class="p-4 flex flex-col gap-2 flex-grow">
                    <div class="flex items-center gap-2 mb-1">
                        <img src="${exp.hostPic || 'https://via.placeholder.com/30'}" class="w-6 h-6 rounded-full border border-gray-100">
                        <span class="text-xs text-gray-500 truncate">${exp.hostName || 'Local Host'}</span>
                    </div>
                    <h3 class="font-bold text-gray-900 mb-1 truncate">${exp.title}</h3>
                    <p class="text-xs text-gray-500 flex items-center gap-1 mb-3"><i class="fas fa-map-marker-alt text-orange-500"></i> ${exp.city}</p>
                    <div class="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
                        <div class="flex items-center text-xs text-yellow-500 gap-1"><i class="fas fa-star"></i> <span class="font-bold text-gray-700">${exp.averageRating ? exp.averageRating.toFixed(1) : 'New'}</span> <span class="text-gray-400">(${exp.reviewCount || 0})</span></div>
                        <span class="text-xs text-orange-600 font-semibold group-hover:underline">View &rarr;</span>
                    </div>
                </div>
            `;
            experiencesGrid.appendChild(card);
        });
    };

    // === HELPER: ACTIVE CHIPS ===
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
        if (filterState.category !== 'all') addChip(`🏷️ ${filterState.category}`);
        if (filterState.minPrice > 0 || filterState.maxPrice < 300) addChip(`💰 $${filterState.minPrice} - $${filterState.maxPrice}`);
    };

    // === EVENT LISTENERS ===
    if (elFilterBtn) elFilterBtn.addEventListener("click", () => elFilterPanel.classList.toggle("hidden"));
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

    // Category Chips
    categoryChips.forEach(chip => {
        chip.addEventListener("click", () => {
            categoryChips.forEach(c => {
                c.classList.remove("active", "bg-gray-900", "text-white", "border-transparent");
                c.classList.add("bg-white", "border-gray-200", "text-gray-600");
            });
            chip.classList.add("active", "bg-gray-900", "text-white", "border-transparent");
            chip.classList.remove("bg-white", "border-gray-200", "text-gray-600");
            
            filterState.category = chip.getAttribute("data-category");
            fetchExperiences();
        });
    });

    function debounce(fn, delay) {
        let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
    }

    // INITIAL LOAD
    fetchExperiences();
});
