// Frontend/js/explore.js

// 🔴 THE CRITICAL FIX
const API_URL = 'https://shared-table-api.onrender.com/api'; 

const grid = document.getElementById('experiences-grid');
const searchInput = document.getElementById('search-input');
const dateInput = document.getElementById('date-input');
const categoryChips = document.querySelectorAll('.filter-chip');
const noResultsSection = document.getElementById('no-results');

const filterBtn = document.getElementById('filter-btn');
const filterPanel = document.getElementById('filter-panel');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const applyFiltersBtn = document.getElementById('apply-filters');

let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadExperiences();

    // Event Listeners
    if(filterBtn) filterBtn.addEventListener('click', () => filterPanel.classList.toggle('hidden'));
    if(applyFiltersBtn) applyFiltersBtn.addEventListener('click', loadExperiences);

    let timeout = null;
    if(searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(loadExperiences, 500);
        });
    }

    if(dateInput) dateInput.addEventListener('change', loadExperiences);

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
    if(noResultsSection) noResultsSection.classList.add('hidden');
    grid.classList.remove('hidden');

    const query = searchInput ? searchInput.value : '';
    const date = dateInput ? dateInput.value : '';
    const minPrice = minPriceInput ? minPriceInput.value : '';
    const maxPrice = maxPriceInput ? maxPriceInput.value : '';
    
    let url = `${API_URL}/experiences?`;
    if (query) url += `q=${encodeURIComponent(query)}&`;
    if (date) url += `date=${date}&`;
    if (minPrice) url += `minPrice=${minPrice}&`;
    if (maxPrice) url += `maxPrice=${maxPrice}&`;
    if (currentCategory !== 'all') url += `category=${encodeURIComponent(currentCategory)}&`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        const data = await res.json();

        if (data.length === 0) {
            grid.classList.add('hidden');
            if(noResultsSection) noResultsSection.classList.remove('hidden');
        } else {
            renderGrid(data);
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<div class="col-span-full text-center text-red-500 py-8"><p class="font-bold">Failed to load experiences.</p></div>`;
    }
}

function renderGrid(experiences) {
    grid.innerHTML = experiences.map(exp => `
        <a href="experience.html?id=${exp._id}" class="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
            <div class="relative h-48 overflow-hidden bg-gray-200">
                <img src="${exp.imageUrl || (exp.images && exp.images[0]) || 'https://via.placeholder.com/400'}" 
                     class="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                     onerror="this.src='https://via.placeholder.com/400?text=No+Image'">
                <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">$${exp.price}</div>
            </div>
            <div class="p-4">
                <div class="flex items-center gap-2 mb-2">
                    <img src="${exp.hostPic || 'https://via.placeholder.com/30'}" class="w-6 h-6 rounded-full border border-gray-100">
                    <span class="text-xs text-gray-500 truncate">${exp.hostName || 'Local Host'}</span>
                </div>
                <h3 class="font-bold text-gray-900 mb-1 truncate">${exp.title}</h3>
                <p class="text-sm text-gray-500"><i class="fas fa-map-marker-alt text-orange-500 text-xs"></i> ${exp.city}</p>
            </div>
        </a>
    `).join('');
}