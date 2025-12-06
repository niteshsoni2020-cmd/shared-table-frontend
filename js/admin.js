// js/admin.js

const API_BASE = "https://shared-table-api.onrender.com/api";

// Elements
const bookingsTableBodyEl = document.getElementById("bookings-table-body");
const listingsTableBodyEl = document.getElementById("listings-table-body");
const usersTableBodyEl = document.getElementById("users-table-body");
const bookingsLoadingEl = document.getElementById("bookings-loading");

// Stats Elements
const totalUsersEl = document.getElementById("stats-total-users");
const totalHostsEl = document.getElementById("stats-total-hosts");
const totalBookingsEl = document.getElementById("stats-total-bookings");
const totalRevenueEl = document.getElementById("stats-total-revenue");

// --- 1. INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    requireAdmin();
    loadDashboard();
});

function requireAdmin() {
    const raw = localStorage.getItem("user");
    if (!raw) return window.location.href = "login.html";
    const user = JSON.parse(raw);
    const token = localStorage.getItem("token");
    if (!token || !user || user.role !== "Admin") {
        window.location.href = "login.html";
    }
}

function getToken() { return localStorage.getItem('token'); }

// --- 2. TAB LOGIC ---
window.switchTab = function(tabName) {
    ['dashboard', 'listings', 'users'].forEach(t => {
        const el = document.getElementById(`view-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if(t === tabName) {
            el.classList.remove('hidden');
            btn.className = "border-tsts-clay text-tsts-clay border-b-2 py-4 px-1 font-bold text-sm transition";
        } else {
            el.classList.add('hidden');
            btn.className = "border-transparent text-gray-500 hover:text-gray-700 border-b-2 py-4 px-1 font-medium text-sm transition";
        }
    });

    if(tabName === 'listings') loadListings();
    if(tabName === 'users') loadUsers();
}

// --- 3. DASHBOARD LOGIC (Stats + Bookings) ---
async function loadDashboard() {
    try {
        // Fetch Stats
        const statsRes = await fetch(`${API_BASE}/admin/stats`, { headers: { "Authorization": `Bearer ${getToken()}` } });
        const stats = await statsRes.json();
        
        totalUsersEl.textContent = stats.userCount || 0;
        totalHostsEl.textContent = stats.expCount || 0; // Approx logic
        totalBookingsEl.textContent = stats.bookingCount || 0;
        totalRevenueEl.textContent = `$${stats.totalRevenue || 0}`;

        // Fetch Bookings
        const bookRes = await fetch(`${API_BASE}/admin/bookings`, { headers: { "Authorization": `Bearer ${getToken()}` } });
        const bookings = await bookRes.json();
        
        renderBookings(bookings);
        bookingsLoadingEl.classList.add('hidden');

    } catch (err) {
        console.error(err);
    }
}

function renderBookings(bookings) {
    bookingsTableBodyEl.innerHTML = bookings.map(b => `
        <tr class="hover:bg-slate-50 transition">
            <td class="px-6 py-4 whitespace-nowrap text-slate-600">${new Date(b.bookingDate || b.createdAt).toLocaleDateString()}</td>
            <td class="px-6 py-4 font-bold text-slate-900">${b.user?.name || b.guestName || 'Unknown'}</td>
            <td class="px-6 py-4 text-slate-800">${b.experience?.title || 'Unknown Experience'}</td>
            <td class="px-6 py-4 font-mono text-slate-600">$${b.pricing?.totalPrice || b.amountTotal || 0}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs font-bold ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}">${b.status}</span></td>
            <td class="px-6 py-4">
                <button onclick="cancelBooking('${b.id || b._id}')" class="text-red-600 hover:underline text-xs font-bold">Cancel</button>
            </td>
        </tr>
    `).join('');
}

// --- 4. LISTINGS MANAGER ---
window.loadListings = async function() {
    try {
        const res = await fetch(`${API_BASE}/admin/experiences`, { headers: { "Authorization": `Bearer ${getToken()}` } });
        const exps = await res.json();
        
        listingsTableBodyEl.innerHTML = exps.map(e => `
            <tr class="hover:bg-slate-50 border-b border-gray-50">
                <td class="px-6 py-4"><img src="${e.imageUrl || e.images?.[0]}" class="w-12 h-12 rounded object-cover bg-gray-200"></td>
                <td class="px-6 py-4 font-bold text-slate-900 max-w-xs truncate" title="${e.title}">${e.title}</td>
                <td class="px-6 py-4 text-slate-500 text-xs">${e.hostName}</td>
                <td class="px-6 py-4 font-mono">$${e.price}</td>
                <td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs font-bold ${e.isPaused ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">${e.isPaused ? 'PAUSED' : 'ACTIVE'}</span></td>
                <td class="px-6 py-4 flex gap-2">
                    <button onclick="togglePause('${e._id || e.id}')" class="text-xs bg-slate-100 px-3 py-1 rounded hover:bg-slate-200 font-bold">${e.isPaused ? 'Resume' : 'Pause'}</button>
                    <button onclick="deleteListing('${e._id || e.id}')" class="text-xs bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100 font-bold">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

window.togglePause = async function(id) {
    if(!confirm("Change status of this listing?")) return;
    await fetch(`${API_BASE}/admin/experiences/${id}/toggle`, { method: "PATCH", headers: { "Authorization": `Bearer ${getToken()}` } });
    loadListings();
}

window.deleteListing = async function(id) {
    if(!confirm("PERMANENTLY DELETE this listing?")) return;
    await fetch(`${API_BASE}/experiences/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${getToken()}` } });
    loadListings();
}

// --- 5. USERS MANAGER ---
window.loadUsers = async function() {
    try {
        const res = await fetch(`${API_BASE}/admin/users`, { headers: { "Authorization": `Bearer ${getToken()}` } });
        const users = await res.json();
        
        usersTableBodyEl.innerHTML = users.map(u => `
            <tr class="hover:bg-slate-50 border-b border-gray-50">
                <td class="px-6 py-4 flex items-center gap-3">
                    <img src="${u.profilePic || 'https://via.placeholder.com/30'}" class="w-8 h-8 rounded-full bg-gray-200">
                    <span class="font-bold text-slate-900">${u.name}</span>
                </td>
                <td class="px-6 py-4 text-slate-500">${u.email}</td>
                <td class="px-6 py-4"><span class="text-xs font-bold px-2 py-1 rounded ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}">${u.role}</span></td>
                <td class="px-6 py-4 text-xs text-slate-400">${new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
                <td class="px-6 py-4">
                    ${u.role !== 'Admin' ? `<button onclick="banUser('${u._id || u.id}')" class="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 font-bold">BAN USER</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

window.banUser = async function(id) {
    if(!confirm("BAN and DELETE this user? This cannot be undone.")) return;
    await fetch(`${API_BASE}/admin/users/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${getToken()}` } });
    loadUsers();
}

// Re-use Cancel Logic
window.cancelBooking = async function(id) {
    if(!confirm("Cancel this booking?")) return;
    await fetch(`${API_BASE}/bookings/${id}/cancel`, { method: "POST", headers: { "Authorization": `Bearer ${getToken()}` } });
    loadDashboard();
}