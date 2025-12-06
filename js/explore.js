// js/explore.js

// TODO: adjust to your actual backend route if different
const API_URL = "/api/search";

document.addEventListener("DOMContentLoaded", () => {
    // --- ELEMENTS ---
    const searchInput   = document.getElementById("search-input");
    const dateInput     = document.getElementById("date-input");
    const filterBtn     = document.getElementById("filter-btn");
    const filterPanel   = document.getElementById("filter-panel");
    const applyFilters  = document.getElementById("apply-filters");

    const priceSliderEl     = document.getElementById("price-slider");
    const priceMinLabelEl   = document.getElementById("price-min-label");
    const priceMaxLabelEl   = document.getElementById("price-max-label");
    const priceSummaryEl    = document.getElementById("price-summary");
    const priceHintEl       = document.getElementById("price-hint");
    const minPriceHiddenEl  = document.getElementById("min-price");
    const maxPriceHiddenEl  = document.getElementById("max-price");

    const categoryChips = document.querySelectorAll(".filter-chip");

    const experiencesGrid = document.getElementById("experiences-grid");
    const noResultsEl     = document.getElementById("no-results");

    // --- STATE ---
    let activeCategory = "all";

    const PRICE_MIN = 0;
    const PRICE_MAX = 250; // adjust if you want a higher ceiling

    // null = no bound (full range)
    let sliderMin = null;
    let sliderMax = null;

    // --- UTILS ---
    const sanitizeInt = (raw) => {
        if (raw === null || raw === undefined || raw === "") return null;
        const num = Number(raw);
        if (Number.isNaN(num)) return null;
        if (num < 0) return 0;
        return Math.floor(num);
    };

    const formatPrice = (value) => "$" + Number(value).toFixed(0);

    const debounce = (fn, delay = 400) => {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), delay);
        };
    };

    // --- PRICE SLIDER INIT ---
    const initPriceSlider = () => {
        if (!priceSliderEl || typeof noUiSlider === "undefined") return;

        noUiSlider.create(priceSliderEl, {
            start: [PRICE_MIN, 120],
            connect: true,
            range: { min: PRICE_MIN, max: PRICE_MAX },
            step: 5,
            // Slider **prevents handles from crossing**, so min>max bug is impossible
            format: {
                to: (value) => Math.round(value),
                from: (value) => Number(value)
            }
        });

        const updateFromSlider = (values) => {
            const [min, max] = values.map((v) => Math.round(v));

            // Smart: treat full extent as "no bound"
            sliderMin = min <= PRICE_MIN ? null : min;
            sliderMax = max >= PRICE_MAX ? null : max;

            if (minPriceHiddenEl) {
                minPriceHiddenEl.value = sliderMin === null ? "" : sliderMin;
            }
            if (maxPriceHiddenEl) {
                maxPriceHiddenEl.value = sliderMax === null ? "" : sliderMax;
            }

            if (priceMinLabelEl) {
                priceMinLabelEl.textContent =
                    sliderMin === null ? "$0" : formatPrice(sliderMin);
            }

            if (priceMaxLabelEl) {
                priceMaxLabelEl.textContent =
                    sliderMax === null ? formatPrice(PRICE_MAX) + "+" : formatPrice(sliderMax);
            }

            if (priceSummaryEl) {
                if (sliderMin === null && sliderMax === null) {
                    priceSummaryEl.textContent = "Any price";
                } else if (sliderMin !== null && sliderMax !== null) {
                    priceSummaryEl.textContent =
                        `Showing ${formatPrice(sliderMin)} – ${formatPrice(sliderMax)} per guest`;
                } else if (sliderMin !== null) {
                    priceSummaryEl.textContent =
                        `Showing ${formatPrice(sliderMin)}+ per guest`;
                } else {
                    priceSummaryEl.textContent =
                        `Showing up to ${formatPrice(sliderMax)} per guest`;
                }
            }
        };

        priceSliderEl.noUiSlider.on("update", updateFromSlider);

        priceSliderEl.noUiSlider.on("change", () => {
            debouncedFetch();
        });

        // initialise labels
        updateFromSlider(priceSliderEl.noUiSlider.get());
    };

    // --- CATEGORY CHIPS ---
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
                debouncedFetch();
            });
        });
    };

    // --- FILTER PANEL TOGGLE ---
    const initFilterPanel = () => {
        if (!filterBtn || !filterPanel) return;
        filterBtn.addEventListener("click", () => {
            filterPanel.classList.toggle("hidden");
        });
    };

    // --- SMART PRICE HINT ---
    const updatePriceHintFromResults = (experiences) => {
        if (!priceHintEl) return;

        const prices = (experiences || [])
            .map((exp) => exp.pricePerGuest || exp.price || exp.price_per_guest)
            .map(Number)
            .filter((n) => !Number.isNaN(n) && n >= 0);

        if (!prices.length) {
            priceHintEl.textContent =
                "Smart filter will auto-tune as more tables are added.";
            return;
        }

        prices.sort((a, b) => a - b);

        const p25 = prices[Math.floor(prices.length * 0.25)];
        const p50 = prices[Math.floor(prices.length * 0.5)];
        const p75 = prices[Math.floor(prices.length * 0.75)];

        priceHintEl.textContent =
            `Most tables sit around ${formatPrice(p25)} – ${formatPrice(p75)} (median ${formatPrice(p50)} per guest).`;
    };

    // --- RENDER EXPERIENCES ---
    const renderExperiences = (experiences) => {
        experiencesGrid.innerHTML = "";

        if (!experiences || !experiences.length) {
            experiencesGrid.classList.add("hidden");
            noResultsEl.classList.remove("hidden");
            return;
        }

        experiencesGrid.classList.remove("hidden");
        noResultsEl.classList.add("hidden");

        experiences.forEach((exp) => {
            const {
                _id,
                id,
                title,
                city,
                suburb,
                country,
                cuisine,
                hostName,
                date,
                time,
                tags,
                pricePerGuest,
                price,
                maxGuests,
                rating,
                numReviews,
                mainImageUrl,
                imageUrl
            } = exp;

            const cardId   = _id || id || "";
            const img      = mainImageUrl || imageUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop";
            const displayPrice = pricePerGuest || price;
            const locationText = [suburb, city, country].filter(Boolean).join(", ");
            const hostText     = hostName ? `Hosted by ${hostName}` : "";
            const dateText     = [date, time].filter(Boolean).join(" • ");

            const chipTags = (tags || []).slice(0, 3);

            const card = document.createElement("div");
            card.className =
                "bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col";

            card.innerHTML = `
                <div class="relative h-44 w-full overflow-hidden">
                    <img 
                        src="${img}" 
                        alt="${title || "Shared table"}" 
                        class="w-full h-full object-cover transform group-hover:scale-105 transition duration-300">
                    ${
                        displayPrice
                            ? `<div class="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold text-gray-900 shadow-sm">
                                  ${formatPrice(displayPrice)} <span class="text-xs font-normal text-gray-500">/ guest</span>
                               </div>`
                            : ""
                    }
                </div>

                <div class="p-4 flex flex-col gap-2 flex-grow">
                    <div class="flex items-start justify-between gap-2">
                        <h3 class="text-sm font-semibold text-gray-900 line-clamp-2">
                            ${title || "Shared table experience"}
                        </h3>
                        ${
                            rating
                                ? `<div class="flex items-center text-xs text-gray-700 gap-1">
                                        <i class="fas fa-star text-amber-400"></i>
                                        <span>${Number(rating).toFixed(1)}</span>
                                        ${
                                            numReviews
                                                ? `<span class="text-gray-400">(${numReviews})</span>`
                                                : ""
                                        }
                                   </div>`
                                : ""
                        }
                    </div>

                    ${
                        locationText
                            ? `<p class="text-xs text-gray-500 flex items-center gap-1">
                                    <i class="fas fa-map-marker-alt text-gray-400"></i>
                                    <span class="line-clamp-1">${locationText}</span>
                               </p>`
                            : ""
                    }

                    ${
                        hostText
                            ? `<p class="text-xs text-gray-500 flex items-center gap-1">
                                    <i class="fas fa-user text-gray-400"></i>
                                    <span class="line-clamp-1">${hostText}</span>
                               </p>`
                            : ""
                    }

                    ${
                        dateText
                            ? `<p class="text-xs text-gray-500 flex items-center gap-1">
                                    <i class="far fa-clock text-gray-400"></i>
                                    <span>${dateText}</span>
                               </p>`
                            : ""
                    }

                    ${
                        cuisine
                            ? `<p class="text-xs text-gray-500 flex items-center gap-1">
                                    <i class="fas fa-utensils text-gray-400"></i>
                                    <span>${cuisine}</span>
                               </p>`
                            : ""
                    }

                    ${
                        chipTags.length
                            ? `<div class="flex flex-wrap gap-1 mt-1">
                                    ${chipTags
                                        .map(
                                            (tag) =>
                                                `<span class="px-2 py-0.5 text-[11px] bg-gray-100 text-gray-700 rounded-full">
                                                    ${tag}
                                                 </span>`
                                        )
                                        .join("")}
                               </div>`
                            : ""
                    }

                    <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>
                            ${
                                maxGuests
                                    ? `Up to ${maxGuests} guests`
                                    : `Shared table experience`
                            }
                        </span>
                        ${
                            cardId
                                ? `<a 
                                      href="experience.html?id=${cardId}" 
                                      class="inline-flex items-center gap-1 text-orange-600 font-semibold hover:text-orange-700">
                                      View
                                      <i class="fas fa-arrow-right text-[10px]"></i>
                                   </a>`
                                : ""
                        }
                    </div>
                </div>
            `;

            experiencesGrid.appendChild(card);
        });
    };

    // --- FETCH LOGIC ---
    const fetchExperiences = async () => {
        // Show loading spinner
        experiencesGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i>
            </div>
        `;
        noResultsEl.classList.add("hidden");

        const params = new URLSearchParams();

        const searchTerm = (searchInput?.value || "").trim();
        if (searchTerm) params.set("q", searchTerm);

        if (dateInput?.value) params.set("date", dateInput.value);

        if (activeCategory && activeCategory !== "all") {
            params.set("category", activeCategory);
        }

        if (sliderMin !== null) params.set("minPrice", String(sliderMin));
        if (sliderMax !== null) params.set("maxPrice", String(sliderMax));

        try {
            const res = await fetch(`${API_URL}?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch experiences");

            const data = await res.json();
            renderExperiences(data);
            updatePriceHintFromResults(data);
        } catch (err) {
            console.error(err);
            experiencesGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <p class="text-gray-500 mb-2">We hit a small snag.</p>
                    <p class="text-gray-400 text-sm">Please refresh or try again in a moment.</p>
                </div>
            `;
        }
    };

    const debouncedFetch = debounce(fetchExperiences, 400);

    // --- EVENT WIRING ---
    if (searchInput) {
        searchInput.addEventListener("input", () => debouncedFetch());
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                fetchExperiences();
            }
        });
    }

    if (dateInput) {
        dateInput.addEventListener("change", () => debouncedFetch());
    }

    if (applyFilters) {
        applyFilters.addEventListener("click", () => {
            fetchExperiences();
        });
    }

    initFilterPanel();
    initCategoryChips();
    initPriceSlider();

    // Initial load
    fetchExperiences();
});
