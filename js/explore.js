// Frontend/js/explore.js

const API_URL = 'https://the-shared-table.onrender.com/api'; 

const grid = document.getElementById('experiences-grid');
const searchInput = document.getElementById('search-input');
const dateInput = document.getElementById('date-input'); // NEW
const categoryChips = document.querySelectorAll('.filter-chip');
const noResultsSection = document.getElementById('no-results');
const fallbackGrid = document.getElementById('fallback-grid');

let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // Check URL params for initial filter (e.g. ?filter=deals)
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    
    // Set initial date to today (optional, creates urgency)
    // dateInput.min = new Date().toISOString().split('T')[0];

    loadExperiences();
    
    // Search Listener (Debounced)
    let timeout = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(loadExperiences, 500);
    });

    // Date Listener (NEW)
    dateInput.addEventListener('change', () => {
        loadExperiences();
    });

    // Category Listeners
    categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Visual Toggle
            categoryChips.forEach(c => c.classList.replace('bg-gray-900', 'bg-white'));
            categoryChips.forEach(c => c.classList.replace('text-white', 'text-gray-600'));
            categoryChips.forEach(c => c.classList.add('border'));
            
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
    
    let url = `${API_URL}/experiences?`;
    if (query) url += `q=${encodeURIComponent(query)}&`;
    if (date) url += `date=${date}&`; // Send Date to Backend
    if (currentCategory !== 'all') url += `category=${encodeURIComponent(currentCategory)}&`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.length === 0) {
            handleNoResults();
        } else {
            renderGrid(data, grid);
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p class="text-center col-span-full text-red-500">Failed to load experiences.</p>';
    }
}

// THE "SMART FALLBACK" LOGIC
async function handleNoResults() {
    grid.classList.add('hidden');
    noResultsSection.classList.remove('hidden');
    
    // Fetch Recommendations to show instead of empty page
    try {
        const res = await fetch(`${API_URL}/recommendations`);
        const data = await res.json();
        renderGrid(data, fallbackGrid);
    } catch (err) {
        fallbackGrid.innerHTML = '<p>No recommendations available.</p>';
    }
}

function renderGrid(experiences, container) {
    container.innerHTML = experiences.map(exp => `
        <a href="experience.html?id=${exp._id}" class="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
            <div class="relative h-48 overflow-hidden">
                <img src="${exp.imageUrl || exp.images[0] || 'https://via.placeholder.com/400'}" 
                     class="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="${exp.title}">
                <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                    $${exp.price}
                </div>
                ${exp.isPaused ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">Currently Paused</div>' : ''}
            </div>
            <div class="p-4">
                <div class="flex items-center gap-2 mb-2">
                    <img src="${exp.hostPic || 'https://via.placeholder.com/30'}" class="w-6 h-6 rounded-full border border-gray-100">
                    <span class="text-xs text-gray-500 truncate">Hosted by ${exp.hostName || 'Local'}</span>
                </div>
                <h3 class="font-bold text-gray-900 mb-1 truncate">${exp.title}</h3>
                <p class="text-sm text-gray-500 mb-3 flex items-center gap-1">
                    <i class="fas fa-map-marker-alt text-orange-500 text-xs"></i> ${exp.city}
                </p>
                <div class="flex items-center justify-between border-t border-gray-50 pt-3">
                    <div class="flex items-center gap-1 text-yellow-400 text-sm">
                        <i class="fas fa-star"></i>
                        <span class="text-gray-700 font-bold">${exp.averageRating || 'New'}</span>
                        <span class="text-gray-400 text-xs">(${exp.reviewCount || 0})</span>
                    </div>
                </div>
            </div>
        </a>
    `).join('');
}