// Frontend/js/public-profile.js

// 🔴 CONFIG
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

// Review Elements
const reviewsContainer = document.getElementById('reviews-container');
const reviewsList = document.getElementById('reviews-list');

document.addEventListener('DOMContentLoaded', async () => {
    if (!userId) {
        showError();
        return;
    }

    try {
        const res = await window.authFetch(`/api/users/${userId}/profile`, { method: "GET" });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error("Host not found");
        renderProfile(data);
    } catch (err) {
        console.error(err);
        showError();
    }
});

function renderProfile(profile) {
    const p = (profile && profile.user) ? profile.user : (profile || {});

    hostNameEl.textContent = p.name || "";
    if (p.profilePic) hostPicEl.src = p.profilePic;
    if (p.bio) hostBioEl.textContent = p.bio;

    hostRatingEl.textContent = "New";
    hostBadgeEl.classList.add('hidden');

    loadingEl.classList.add('hidden');
    contentEl.classList.remove('hidden');

    loadReviews().catch(() => {});
    loadHostExperiences().catch(() => {});
}

async function loadReviews() {
    if (!reviewsContainer || !reviewsList) return;
    const res = await window.authFetch(`/api/reviews?hostId=${encodeURIComponent(userId)}&limit=6&sort=recent`, { method: "GET" });
    const payload = await res.json().catch(() => null);
    const list = (payload && payload.ok === true && Array.isArray(payload.reviews)) ? payload.reviews : [];
    if (!res.ok || list.length === 0) return;

    reviewsContainer.classList.remove('hidden');
    reviewsList.innerHTML = list.map(r => {
        const rating = Math.max(0, Math.min(5, parseInt(r.rating, 10) || 0));
        const dateStr = r.date ? new Date(r.date).toLocaleDateString() : "";
        const comment = (r.comment == null) ? "" : String(r.comment);
        return `
            <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-gray-900 text-sm">${r.authorName || 'Guest'}</span>
                    <span class="text-xs text-gray-500">${dateStr}</span>
                </div>
                <div class="text-yellow-500 text-xs mb-2">
                    ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                </div>
                <p class="text-gray-600 text-sm italic">"${comment}"</p>
            </div>
        `;
    }).join('');

    try {
        const ratings = list.map((r) => Number(r.rating)).filter((n) => isFinite(n) && n > 0);
        if (ratings.length > 0) {
            const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            hostRatingEl.textContent = `${avg.toFixed(1)} (${ratings.length} reviews)`;
        }
    } catch (_) {}
}

async function loadHostExperiences() {
    if (!gridEl || !noExpEl) return;
    const res = await window.authFetch(`/api/experiences`, { method: "GET" });
    const payload = await res.json().catch(() => null);
    const list = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.experiences) ? payload.experiences : []);
    const mine = (list || []).filter((exp) => {
        try {
            const e = exp || {};
            const hid = e.hostId || (e.host && (e.host._id || e.host.id)) || e.hostUserId || "";
            return hid && String(hid) === String(userId);
        } catch (_) {
            return false;
        }
    });

    if (mine.length === 0) {
        noExpEl.classList.remove('hidden');
        return;
    }

    mine.forEach(exp => {
        const card = createExperienceCard(exp);
        gridEl.appendChild(card);
    });
}

function createExperienceCard(exp) {
    const img = exp.imageUrl || (exp.images && exp.images[0]) || "https://via.placeholder.com/400x300";
    const card = document.createElement('a');
    // Mongoose usually returns _id, but we handle both just in case
    const safeId = exp._id || exp.id;
    card.href = `experience.html?id=${safeId}`;
    
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