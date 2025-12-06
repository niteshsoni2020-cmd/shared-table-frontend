// explore.js

const SEARCH_API = "/api/search"; // change if your backend uses a different path

document.addEventListener("DOMContentLoaded", () => {
  // --- BASIC FILTER ELEMENTS ---
  const searchInput = document.getElementById("searchInput");
  const dateFilter = document.getElementById("dateFilter");
  const guestsFilter = document.getElementById("guestsFilter");
  const locationFilter = document.getElementById("locationFilter");

  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");
  const clearPriceFilterBtn = document.getElementById("clearPriceFilter");
  const priceSummary = document.getElementById("priceSummary");
  const smartPriceHint = document.getElementById("smartPriceHint");
  const pricePresetChips = document.querySelectorAll("[data-price-preset]");

  const clearAllFiltersBtn = document.getElementById("clearAllFiltersBtn");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");

  const activeFiltersBar = document.getElementById("activeFiltersBar");
  const experienceGrid = document.getElementById("experienceGrid");
  const emptyState = document.getElementById("emptyState");
  const resultMetaText = document.getElementById("resultMetaText");

  // --- UTILITIES ---

  const sanitizeInt = (raw) => {
    if (raw === null || raw === undefined || raw === "") return null;
    const num = Number(raw);
    if (Number.isNaN(num)) return null;
    if (num < 0) return 0; // clamp negative to 0
    return Math.floor(num);
  };

  const formatPrice = (value) => `$${Number(value).toFixed(0)}`;

  const debounce = (fn, delay = 400) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  // --- PRICE RANGE NORMALISATION + SUMMARY ---

  const updatePriceSummary = () => {
    const min = sanitizeInt(minPriceInput.value);
    const max = sanitizeInt(maxPriceInput.value);

    if (min === null && max === null) {
      priceSummary.textContent = "Any price";
      return;
    }

    if (min !== null && max !== null) {
      priceSummary.textContent = `Showing ${formatPrice(min)} – ${formatPrice(max)} per guest`;
    } else if (min !== null) {
      priceSummary.textContent = `Showing ${formatPrice(min)}+ per guest`;
    } else if (max !== null) {
      priceSummary.textContent = `Showing up to ${formatPrice(max)} per guest`;
    }
  };

  const normalizePriceRange = () => {
    let min = sanitizeInt(minPriceInput.value);
    let max = sanitizeInt(maxPriceInput.value);

    // Keep DOM in sync with sanitised values
    minPriceInput.value = min === null ? "" : min;
    maxPriceInput.value = max === null ? "" : max;

    // Enforce max >= min when both exist
    if (min !== null && max !== null && max < min) {
      max = min;
      maxPriceInput.value = max;
    }

    // HTML constraint
    if (min !== null) {
      maxPriceInput.min = String(min);
    } else {
      maxPriceInput.min = "0";
    }

    updatePriceSummary();
  };

  // --- SMART PRICE HINT (from result set) ---
  const updateSmartPriceHintFromResults = (experiences) => {
    const prices = experiences
      .map((exp) => exp.pricePerGuest || exp.price || exp.price_per_guest)
      .map(Number)
      .filter((n) => !Number.isNaN(n) && n >= 0);

    if (!prices.length) {
      smartPriceHint.textContent = "Smart filter will auto-tune once we see more tables.";
      return;
    }

    prices.sort((a, b) => a - b);

    const p25 = prices[Math.floor(prices.length * 0.25)];
    const p50 = prices[Math.floor(prices.length * 0.5)];
    const p75 = prices[Math.floor(prices.length * 0.75)];

    smartPriceHint.textContent =
      `Smart hint: most shared tables sit around ${formatPrice(p25)} – ${formatPrice(p75)} per guest (median ${formatPrice(p50)}).`;
  };

  // --- ACTIVE FILTER CHIPS ---

  const rebuildActiveFilterChips = () => {
    activeFiltersBar.innerHTML = "";

    const chips = [];

    const q = (searchInput.value || "").trim();
    if (q) {
      chips.push({
        type: "q",
        label: `Search: “${q}”`,
        clear: () => (searchInput.value = "")
      });
    }

    if (dateFilter.value) {
      chips.push({
        type: "date",
        label: `On ${dateFilter.value}`,
        clear: () => (dateFilter.value = "")
      });
    }

    const guests = sanitizeInt(guestsFilter.value);
    if (guests !== null) {
      chips.push({
        type: "guests",
        label: `${guests} guest${guests > 1 ? "s" : ""}`,
        clear: () => (guestsFilter.value = "")
      });
    }

    const loc = (locationFilter.value || "").trim();
    if (loc) {
      chips.push({
        type: "location",
        label: loc,
        clear: () => (locationFilter.value = "")
      });
    }

    const min = sanitizeInt(minPriceInput.value);
    const max = sanitizeInt(maxPriceInput.value);
    if (min !== null || max !== null) {
      let label;
      if (min !== null && max !== null) {
        label = `${formatPrice(min)} – ${formatPrice(max)} per guest`;
      } else if (min !== null) {
        label = `${formatPrice(min)}+ per guest`;
      } else {
        label = `Up to ${formatPrice(max)} per guest`;
      }
      chips.push({
        type: "price",
        label,
        clear: () => {
          minPriceInput.value = "";
          maxPriceInput.value = "";
          maxPriceInput.min = "0";
          updatePriceSummary();
        }
      });
    }

    if (!chips.length) {
      return;
    }

    chips.forEach((chip) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-800 border border-gray-200";
      btn.innerHTML = `
        <span>${chip.label}</span>
        <span class="text-gray-400 text-[10px]">✕</span>
      `;
      btn.addEventListener("click", () => {
        chip.clear();
        normalizePriceRange();
        triggerFetch();
      });
      activeFiltersBar.appendChild(btn);
    });
  };

  // --- RENDER CARDS ---

  const renderExperiences = (experiences) => {
    experienceGrid.innerHTML = "";

    if (!experiences || !experiences.length) {
      emptyState.classList.remove("hidden");
      resultMetaText.textContent = "No tables found. Try adjusting your filters.";
      return;
    }

    emptyState.classList.add("hidden");

    experiences.forEach((exp) => {
      const {
        _id,
        title,
        city,
        suburb,
        country,
        date,
        time,
        cuisine,
        tags,
        pricePerGuest,
        price,
        maxGuests,
        rating,
        numReviews,
        primaryImageUrl,
        imageUrl
      } = exp;

      const displayPrice = pricePerGuest || price;
      const locationBits = [suburb, city, country].filter(Boolean).join(", ");
      const img = primaryImageUrl || imageUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop";

      const card = document.createElement("article");
      card.className =
        "group flex flex-col overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow";

      card.innerHTML = `
        <div class="relative h-44 w-full overflow-hidden">
          <img
            src="${img}"
            alt="${title || "Shared table"}"
            class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0"></div>
          ${
            displayPrice
              ? `<div class="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-900 shadow">
                    ${formatPrice(displayPrice)} <span class="text-[10px] font-normal ml-1">/ guest</span>
                 </div>`
              : ""
          }
        </div>

        <div class="flex flex-1 flex-col p-3.5 gap-2.5">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-sm font-semibold text-gray-900 line-clamp-2">
              ${title || "Shared table experience"}
            </h3>
            ${
              rating
                ? `<div class="flex items-center gap-1 text-[11px] text-gray-700">
                    <span>★</span>
                    <span>${Number(rating).toFixed(1)}</span>
                    ${numReviews ? `<span class="text-gray-400">(${numReviews})</span>` : ""}
                  </div>`
                : ""
            }
          </div>

          <p class="text-xs text-gray-500 line-clamp-1">
            ${locationBits || "Exact location shared after booking"}
          </p>

          <p class="text-xs text-gray-500 line-clamp-1">
            ${(cuisine ? cuisine + " • " : "") + (time || "")}
          </p>

          <div class="flex flex-wrap gap-1.5 mt-1">
            ${
              (tags || [])
                .slice(0, 3)
                .map(
                  (tag) =>
                    `<span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">${tag}</span>`
                )
                .join("") || ""
            }
          </div>

          <div class="mt-2 flex items-center justify-between">
            <span class="text-[11px] text-gray-500">
              ${maxGuests ? `Up to ${maxGuests} guests` : "Shared table"}
            </span>
            <a
              href="experience.html?id=${_id}"
              class="inline-flex items-center rounded-full bg-gray-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-black"
            >
              View table
            </a>
          </div>
        </div>
      `;

      experienceGrid.appendChild(card);
    });
  };

  // --- FETCH LOGIC ---

  const fetchAndRenderExperiences = async () => {
    resultMetaText.textContent = "Finding tables that match your vibe…";

    // Build query params
    const params = new URLSearchParams();

    const q = (searchInput.value || "").trim();
    if (q) params.set("q", q);

    if (dateFilter.value) params.set("date", dateFilter.value);

    const guests = sanitizeInt(guestsFilter.value);
    if (guests !== null) params.set("guests", String(guests));

    const loc = (locationFilter.value || "").trim();
    if (loc) params.set("location", loc);

    const min = sanitizeInt(minPriceInput.value);
    const max = sanitizeInt(maxPriceInput.value);
    if (min !== null) params.set("minPrice", String(min));
    if (max !== null) params.set("maxPrice", String(max));

    try {
      const res = await fetch(`${SEARCH_API}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch experiences");
      const data = await res.json();

      renderExperiences(data);
      rebuildActiveFilterChips();
      updateSmartPriceHintFromResults(data);

      const count = data.length || 0;
      resultMetaText.textContent =
        count === 1 ? "1 table found." : `${count} tables found.`;
    } catch (err) {
      console.error(err);
      resultMetaText.textContent = "We hit a small snag loading tables.";
      emptyState.classList.remove("hidden");
      emptyState.textContent =
        "We couldn't load tables right now. Please try again in a moment.";
    }
  };

  const triggerFetch = debounce(fetchAndRenderExperiences, 300);

  // --- EVENT WIRING ---

  // Price typing
  minPriceInput.addEventListener("input", () => {
    normalizePriceRange();
    // don't auto fetch on every keystroke; wait for Apply or preset
  });

  maxPriceInput.addEventListener("input", () => {
    normalizePriceRange();
  });

  // Clear price
  clearPriceFilterBtn.addEventListener("click", () => {
    minPriceInput.value = "";
    maxPriceInput.value = "";
    maxPriceInput.min = "0";
    updatePriceSummary();
    // reset preset visual to "Any"
    pricePresetChips.forEach((c) => {
      c.classList.remove("bg-gray-100", "border-gray-900", "text-gray-900");
      c.classList.add("border-gray-300", "text-gray-700");
      if (c.getAttribute("data-min") === "" && c.getAttribute("data-max") === "") {
        c.classList.add("bg-gray-100", "border-gray-900", "text-gray-900");
        c.classList.remove("border-gray-300", "text-gray-700");
      }
    });
    triggerFetch();
  });

  // Price presets (smart chips)
  pricePresetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const min = chip.getAttribute("data-min");
      const max = chip.getAttribute("data-max");

      // reset styles
      pricePresetChips.forEach((c) => {
        c.classList.remove("bg-gray-100", "border-gray-900", "text-gray-900");
        c.classList.add("border-gray-300", "text-gray-700");
      });

      chip.classList.add("bg-gray-100", "border-gray-900", "text-gray-900");
      chip.classList.remove("border-gray-300", "text-gray-700");

      minPriceInput.value = min !== "" ? min : "";
      maxPriceInput.value = max !== "" ? max : "";

      normalizePriceRange();
      triggerFetch(); // auto-apply smart preset
    });
  });

  // Search typing – debounce for smart feel
  searchInput.addEventListener("input", () => {
    triggerFetch();
  });

  // Enter key on text filters triggers immediate fetch
  [searchInput, locationFilter].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        fetchAndRenderExperiences();
      }
    });
  });

  // Date & guests changes
  dateFilter.addEventListener("change", () => triggerFetch());
  guestsFilter.addEventListener("input", () => triggerFetch());
  locationFilter.addEventListener("input", () => triggerFetch());

  // Clear all filters
  clearAllFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    dateFilter.value = "";
    guestsFilter.value = "";
    locationFilter.value = "";
    minPriceInput.value = "";
    maxPriceInput.value = "";
    maxPriceInput.min = "0";
    updatePriceSummary();

    // reset preset chips
    pricePresetChips.forEach((c) => {
      c.classList.remove("bg-gray-100", "border-gray-900", "text-gray-900");
      c.classList.add("border-gray-300", "text-gray-700");
      if (c.getAttribute("data-min") === "" && c.getAttribute("data-max") === "") {
        c.classList.add("bg-gray-100", "border-gray-900", "text-gray-900");
        c.classList.remove("border-gray-300", "text-gray-700");
      }
    });

    rebuildActiveFilterChips();
    fetchAndRenderExperiences();
  });

  // Apply button (explicit)
  applyFiltersBtn.addEventListener("click", () => {
    normalizePriceRange();
    fetchAndRenderExperiences();
  });

  // --- INITIAL LOAD ---
  normalizePriceRange();
  fetchAndRenderExperiences();
});
