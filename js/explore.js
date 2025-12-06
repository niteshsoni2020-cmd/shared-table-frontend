// Frontend/js/explore.js

// 🚨 CHECK THIS URL: Ensure it matches your specific Render Backend URL
const API_URL = 'https://the-shared-table.onrender.com/api'; 

const grid = document.getElementById('experiences-grid');
const searchInput = document.getElementById('search-input');
const dateInput = document.getElementById('date-input');
const categoryChips = document.querySelectorAll('.filter-chip');
const noResultsSection = document.getElementById('no-results');

// Filter Elements (The Fix)
const filterBtn = document.getElementById('filter-btn');
const filterPanel = document.getElementById('filter-panel');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const applyFiltersBtn = document.getElementById('apply-filters');

let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Load
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('filter') === 'deals') {
        // Simple client-side hack for deals until backend is smarter
        // or just load all for now
    }
    loadExperiences();

    // 2. Toggle Filter Panel (FIXED)
    filterBtn.addEventListener('click', () => {
        filterPanel.classList.toggle('hidden');
    });

    // 3. Apply Price Filters
    applyFiltersBtn.addEventListener('click', () => {
        loadExperiences();
    });

    // 4. Search Listeners
    let timeout = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(loadExperiences, 500);
    });

    dateInput.addEventListener('change', loadExperiences);

    categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
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
    grid.innerHTML = '<div class="col-span-full text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-gray-300"></i></div>';
    noResultsSection.classList.add('hidden');
    grid.classList.remove('hidden');

    const query = searchInput.value;
    const date = dateInput.value;
    const minPrice = minPriceInput.value;
    const maxPrice = maxPriceInput.value;
    
    // Construct Query
    let url = `${API_URL}/experiences?`;
    if (query) url += `q=${encodeURIComponent(query)}&`;
    if (date) url += `date=${date}&`;
    if (minPrice) url += `minPrice=${minPrice}&`;
    if (maxPrice) url += `maxPrice=${maxPrice}&`;
    if (currentCategory !== 'all') url += `category=${encodeURIComponent(currentCategory)}&`;

    try {
        const res = await fetch(url);
        
        // Error Handling for Backend Crash
        if (!res.ok) {
            throw new Error(`Server responded with ${res.status}`);
        }

        const data = await res.json();

        if (data.length === 0) {
            grid.classList.add('hidden');
            noResultsSection.classList.remove('hidden');
        } else {
            renderGrid(data);
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = `
            <div class="col-span-full text-center text-red-500 py-8">
                <p class="font-bold">Failed to load experiences.</p>
                <p class="text-sm">Please check if the Backend Server is running.</p>
            </div>
        `;
    }
}

function renderGrid(experiences) {
    grid.innerHTML = experiences.map(exp => `
        <a href="experience.html?id=${exp._id}" class="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
            <div class="relative h-48 overflow-hidden bg-gray-200">
                <img src="${exp.imageUrl || exp.images[0] || 'https://via.placeholder.com/400'}" 
                     class="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                     onerror="this.src='https://via.placeholder.com/400?text=No+Image'">
                <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                    $${exp.price}
                </div>
            </div>
            <div class="p-4">
                <div class="flex items-center gap-2 mb-2">
                    <img src="${exp.hostPic || 'https://via.placeholder.com/30'}" class="w-6 h-6 rounded-full border border-gray-100">
                    <span class="text-xs text-gray-500 truncate">${exp.hostName || 'Local Host'}</span>
                </div>
                <h3 class="font-bold text-gray-900 mb-1 truncate">${exp.title}</h3>
                <p class="text-sm text-gray-500 mb-3"><i class="fas fa-map-marker-alt text-orange-500 text-xs"></i> ${exp.city}</p>
            </div>
        </a>
    `).join('');
}