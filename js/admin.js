// js/admin.js

let allListings = []; 

document.addEventListener("DOMContentLoaded", async () => {
    const token = getToken();
    if (!token) { window.location.href = "login.html"; return; }
    loadAdminData();
});

async function loadAdminData() {
    const token = getToken();
    const statsEl = { rev: document.getElementById("stat-revenue"), users: document.getElementById("stat-users"), exps: document.getElementById("stat-exps"), bk: document.getElementById("stat-bookings") };
    const tableBody = document.getElementById("users-table-body");

    try {
        // 1. STATS
        const resStats = await fetch(`${API_BASE}/api/admin/stats`, { headers: { "Authorization": `Bearer ${token}` } });
        if (resStats.status === 403) { alert("Access Denied."); window.location.href = "index.html"; return; }
        const stats = await resStats.json();
        
        statsEl.rev.textContent = `$${stats.totalRevenue.toLocaleString()}`;
        statsEl.users.textContent = stats.userCount;
        statsEl.exps.textContent = stats.expCount;
        statsEl.bk.textContent = stats.bookingCount;

        // 2. USERS (5 Columns)
        const resUsers = await fetch(`${API_BASE}/api/admin/users`, { headers: { "Authorization": `Bearer ${token}` } });
        const users = await resUsers.json();
        tableBody.innerHTML = users.map(u => `
            <tr class="hover:bg-gray-800 transition">
                <td class="px-6 py-4 font-mono text-xs text-gray-500">#${String(u.id).slice(-4)}</td>
                <td class="px-6 py-4 font-bold text-gray-200">${u.name}</td>
                <td class="px-6 py-4 text-gray-400">${u.email}</td>
                <td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs font-bold uppercase border ${u.role === 'Admin' ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 'bg-gray-700/30 text-gray-400 border-gray-600'}">${u.role}</span></td>
                <td class="px-6 py-4 text-right">${u.role !== 'Admin' ? `<button onclick="banUser('${u.id}')" class="text-red-400 hover:bg-red-900/40 px-3 py-1.5 rounded border border-red-900/50 text-xs">Ban</button>` : '<span class="text-xs italic">Protected</span>'}</td>
            </tr>`).join("");

        // 3. LISTINGS (Fetch & Store)
        const resExps = await fetch(`${API_BASE}/api/experiences`);
        allListings = await resExps.json();
        renderListingsTable(allListings);

    } catch (err) { console.error("Admin Load Error", err); }
}

// --- RENDER TABLE (6 Columns) ---
function renderListingsTable(data) {
    const tbody = document.getElementById("listings-table-body");
    const noResults = document.getElementById("no-results");
    
    if (data.length === 0) {
        tbody.innerHTML = "";
        noResults.classList.remove("hidden");
        return;
    }
    
    noResults.classList.add("hidden");
    tbody.innerHTML = data.map(exp => `
        <tr class="hover:bg-gray-800 transition group border-b border-gray-800 last:border-0">
            <td class="px-6 py-4">
                <input type="checkbox" value="${exp.id}" onclick="updateBulkState()" class="listing-checkbox rounded border-gray-600 bg-gray-700 text-orange-600 cursor-pointer">
            </td>
            <td class="px-6 py-4 font-mono text-xs text-gray-500">#${String(exp.id).slice(-4)}</td>
            <td class="px-6 py-4 font-bold text-gray-200">
                <a href="experience.html?id=${exp.id}" target="_blank" class="hover:underline hover:text-orange-400">${exp.title}</a>
            </td>
            <td class="px-6 py-4">
                <span class="bg-gray-700/50 px-2 py-1 rounded text-xs text-gray-300 font-mono">Host #${String(exp.hostId).slice(-4)}</span>
            </td>
            <td class="px-6 py-4 text-green-400 font-bold">$${exp.price}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="forceDeleteListing('${exp.id}')" class="text-red-400 hover:text-white hover:bg-red-600 px-3 py-1.5 rounded transition text-xs font-bold">Delete</button>
            </td>
        </tr>`).join("");
        
    document.getElementById("select-all").checked = false;
    updateBulkState();
}

// --- FILTER LOGIC ---
function filterListings() {
    const query = document.getElementById("search-listings").value.toLowerCase();
    const filtered = allListings.filter(exp => exp.title.toLowerCase().includes(query));
    renderListingsTable(filtered);
}

// --- BULK ACTION LOGIC ---
function toggleSelectAll() {
    const master = document.getElementById("select-all");
    const boxes = document.querySelectorAll(".listing-checkbox");
    boxes.forEach(box => box.checked = master.checked);
    updateBulkState();
}

function updateBulkState() {
    const boxes = document.querySelectorAll(".listing-checkbox:checked");
    const btn = document.getElementById("bulk-delete-btn");
    const countSpan = document.getElementById("selected-count");
    
    if (boxes.length > 0) {
        btn.classList.remove("hidden");
        btn.classList.add("flex");
        countSpan.textContent = boxes.length;
    } else {
        btn.classList.add("hidden");
        btn.classList.remove("flex");
    }
}

async function bulkDelete() {
    const boxes = document.querySelectorAll(".listing-checkbox:checked");
    const ids = Array.from(boxes).map(box => box.value);
    
    if (!confirm(`⚠️ DELETE ${ids.length} listing(s)?`)) return;
    
    const token = getToken();
    for (const id of ids) {
        try {
            await fetch(`${API_BASE}/api/admin/experiences/${id}`, { 
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` } 
            });
        } catch(err) { console.error("Failed", id); }
    }
    loadAdminData();
}

async function banUser(id) {
    if(!confirm(`⚠️ BAN User?`)) return;
    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/api/admin/users/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
        if(res.ok) { alert("User banned."); loadAdminData(); }
    } catch(err) { alert("Error."); }
}

async function forceDeleteListing(id) {
    if(!confirm(`⚠️ DELETE Listing?`)) return;
    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/api/admin/experiences/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
        if(res.ok) { alert("Listing deleted."); loadAdminData(); }
    } catch(err) { alert("Error."); }
}