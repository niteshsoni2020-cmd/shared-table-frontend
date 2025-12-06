// Frontend/js/public-profile.js

const API_BASE = 'https://shared-table-api.onrender.com/api';

// Get Host ID from URL
const params = new URLSearchParams(window.location.search);
const userId = params.get('id');

const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const contentEl = document.getElementById('profile-content');

// Elements
const hostNameEl = document.getElementById('host-name');
const hostPicEl = document.getElementById('host-pic');
const hostLocationEl = document.getElementById('host-location');
const hostRatingEl = document.getElementById('host-rating');
const hostBioEl = document.getElementById('host-bio');
const hostBadgeEl = document.getElementById('host-badge');
const gridEl = document.getElementById('experiences-grid');
const noExpEl = document.getElementById('no-experiences');

document.addEventListener('DOMContentLoaded', async () => {
    if (!userId) {
        showError();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/users/${userId}/profile`);
        if (!res.ok) throw new Error("Host not found");

        const data = await res.json();
        renderProfile(data);
    } catch (err) {
        console.error(err);
        showError();
    }
});

function renderProfile(data) {
    const { user, isHost, experiences } = data;

    // 1. Render Host Info
    hostNameEl.textContent = user.name;
    if (user.profilePic) hostPicEl.src = user.profilePic;
    if (user.location) hostLocationEl.innerHTML = `<i class="fas fa-map-marker-alt mr-1"></i> ${user.location}`;
    if (user.bio) hostBioEl.textContent = user.bio;
    
    // Rating Logic
    if (user.guestRating > 0) {
        hostRatingEl.textContent = `${user.guestRating.toFixed(1)} (${user.guestReviewCount} reviews)`;
    }

    // Verified Badge
    if (user.isHost) {
        hostBadgeEl.classList.remove('hidden');
    }

    // 2. Render Experiences
    if (!experiences || experiences.length === 0) {
        noExpEl.classList.remove('hidden');
    } else {
        experiences.forEach(exp => {
            const card = createExperienceCard(exp);
            gridEl.appendChild(card);
        });
    }

    loadingEl.classList.add('hidden');
    contentEl.classList.remove('hidden');
}

function createExperienceCard(exp) {
    const img = exp.imageUrl || (exp.images && exp.images[0]) || "https://via.placeholder.com/400x300";
    const card = document.createElement('a');
    card.href = `experience.html?id=${exp._id}`;
    card.className = "group block bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col";
    
    card.innerHTML = `
        <div class="relative h-48 w-full overflow-hidden bg-gray-100">
            <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">$${exp.price}</div>
            <div class="absolute bottom-3 left-3 flex gap-1">
                ${(exp.tags || []).slice(0, 2).map(tag => `<span class="px-2 py-1 bg-black/60 text-white text-[10px] uppercase font-bold rounded">${tag}</span>`).join('')}
            </div>
        </div>
        <div class="p-4 flex flex-col gap-2 flex-grow">
            <h3 class="font-bold text-gray-900 mb-1 truncate">${exp.title}</h3>
            <p class="text-xs text-gray-500 flex items-center gap-1"><i class="fas fa-map-marker-alt text-orange-500"></i> ${exp.city}</p>
            <div class="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
                <div class="flex items-center text-xs text-yellow-500 gap-1">
                    <i class="fas fa-star"></i> 
                    <span class="font-bold text-gray-700">${exp.averageRating ? exp.averageRating.toFixed(1) : 'New'}</span>
                </div>
                <span class="text-xs text-orange-600 font-semibold group-hover:underline">View &rarr;</span>
            </div>
        </div>
    `;
    return card;
}

function showError() {
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
}