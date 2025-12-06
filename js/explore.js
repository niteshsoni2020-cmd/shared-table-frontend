// Frontend/js/explore.js

// 🔴 THE CORRECT BACKEND URL
const API_URL = 'https://shared-table-api.onrender.com/api'; 

// DOM Elements
const grid = document.getElementById('experiences-grid');
const searchInput = document.getElementById('search-input');
const dateInput = document.getElementById('date-input');
const categoryChips = document.querySelectorAll('.filter-chip');
const noResultsSection = document.getElementById('no-results');

// Filter Elements
const filterBtn = document.getElementById('filter-btn');
const filterPanel = document.getElementById('filter-panel');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const applyFiltersBtn = document.getElementById('apply-filters');

let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // Check URL params for initial filter (e.g. ?filter=deals)
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('filter') === 'deals') {
        // Just a placeholder for now, ideally backend handles this
        console.log("Deals filter active");
    }

    loadExperiences();

    // 1. Toggle Filter Panel
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            filterPanel.classList.toggle('hidden');
        });
    }

    // 2. Apply Price Filters
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            loadExperiences();
        });
    }

    // 3. Search Listener (Debounced)
    let timeout = null;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(loadExperiences, 500);
        });
    }

    // 4. Date Listener
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            loadExperiences();
        });
    }

    // 5. Category Listeners
    categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Visual Toggle
            categoryChips.forEach(c => {
                c.classList.remove('bg-gray-900', 'text-white');
                c.classList.add('bg-white', 'text-gray-600', 'border');
            });
            
            chip.classList.remove('bg-white', 'text-gray-600', 'border');
            chip.classList.add('bg-gray-900', 'text-white');
            
            currentCategory = chip.getAttribute('data-category');
            loadExperiences();
        });
    });
});

async function loadExperiences() {
    // Show Loading State
    grid.innerHTML = '<div class="col-span-full text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-gray-300"></i></div>';
    if(noResultsSection) noResultsSection.classList.add('hidden');
    grid.classList.remove('hidden');

    // Gather Inputs
    const query = searchInput ? searchInput.value : '';
    const date = dateInput ? dateInput.value : '';
    const minPrice = minPriceInput ? minPriceInput.value : '';
    const maxPrice = maxPriceInput ? maxPriceInput.value : '';
    
    // Construct Query URL
    let url = `${API_URL}/experiences?`;
    if (query) url += `q=${encodeURIComponent(query)}&`;
    if (date) url += `date=${date}&`;
    if (minPrice) url += `minPrice=${minPrice}&`;
    if (maxPrice) url += `maxPrice=${maxPrice}&`;
    if (currentCategory !== 'all') url += `category=${encodeURIComponent(currentCategory)}&`;

    try {
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`Server responded with ${res.status}`);
        }

        const data = await res.json();

        if (data.length === 0) {
            grid.classList.add('hidden');
            if(noResultsSection) noResultsSection.classList.remove('hidden');
        } else {
            renderGrid(data);
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = `
            <div class="col-span-full text-center text-red-500 py-8">
                <p class="font-bold">Failed to load experiences.</p>
                <p class="text-sm">Please check if the Backend is running.</p>
            </div>
        `;
    }
}

function renderGrid(experiences) {
    grid.innerHTML = experiences.map(exp => `
        <a href="experience.html?id=${exp._id}" class="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
            <div class="relative h-48 overflow-hidden bg-gray-200">
                <img src="${exp.imageUrl || (exp.images && exp.images[0]) || 'https://via.placeholder.com/400'}" 
                     class="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                     onerror="this.src='https://via.placeholder.com/400?text=No+Image'"
                     alt="${exp.title}">
                <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                    $${exp.price}
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
                    <i class="fas fa-map-marker-alt text-orange-500 text-xs"></i> ${exp.city}
                </p>
                <div class="flex items-center justify-between border-t border-gray-50 pt-3">
                    <div class="flex items-center gap-1 text-yellow-400 text-sm">
                        <i class="fas fa-star"></i>
                        <span class="text-gray-700 font-bold">${exp.averageRating ? exp.averageRating.toFixed(1) : 'New'}</span>
                        <span class="text-gray-400 text-xs">(${exp.reviewCount || 0})</span>
                    </div>
                </div>
            </div>
        </a>
    `).join('');
}