// js/admin.js
// Single-truth networking: window.authFetch + window.getAuthToken from common.js

function getToken() {
  return (window.getAuthToken && window.getAuthToken()) || "";
}

function mustBeAdmin() {
  const u = (window.getAuthUser && window.getAuthUser()) || {};
  const isAdminEmail = (u.email || "") === "admin@sharedtable.com";
  if (!getToken() || !isAdminEmail) {
    location.href = "login.html?redirect=" + encodeURIComponent("admin.html");
    return false;
  }
  return true;
}

async function loadStats() {
  const res = await window.authFetch("/api/admin/stats", { method: "GET" });
  if (!res.ok) throw new Error("stats");
  return res.json();
}

async function loadBookings() {
  const res = await window.authFetch("/api/admin/bookings", { method: "GET" });
  if (!res.ok) throw new Error("bookings");
  return res.json();
}

async function loadExperiences() {
  const res = await window.authFetch("/api/admin/experiences", { method: "GET" });
  if (!res.ok) throw new Error("experiences");
  return res.json();
}

async function loadUsers() {
  const res = await window.authFetch("/api/admin/users", { method: "GET" });
  if (!res.ok) throw new Error("users");
  return res.json();
}

async function toggleExperience(id) {
  const res = await window.authFetch("/api/admin/experiences/" + encodeURIComponent(id) + "/toggle", {
    method: "PATCH"
  });
  if (!res.ok) {
    let msg = "Failed to toggle experience";
    try { msg = (await res.json()).message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json().catch(() => ({}));
}

async function deleteExperience(id) {
  const res = await window.authFetch("/api/experiences/" + encodeURIComponent(id), { method: "DELETE" });
  if (!res.ok) {
    let msg = "Failed to delete experience";
    try { msg = (await res.json()).message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json().catch(() => ({}));
}

async function deleteUser(id) {
  const res = await window.authFetch("/api/admin/users/" + encodeURIComponent(id), { method: "DELETE" });
  if (!res.ok) {
    let msg = "Failed to delete user";
    try { msg = (await res.json()).message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json().catch(() => ({}));
}

async function cancelBooking(id) {
  const res = await window.authFetch("/api/bookings/" + encodeURIComponent(id) + "/cancel", { method: "POST" });
  if (!res.ok) {
    let msg = "Failed to cancel booking";
    try { msg = (await res.json()).message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json().catch(() => ({}));
}

// ---- Existing render helpers (minimal assumptions) ----
function $(id) { return document.getElementById(id); }

function safe(v, fallback="") { return (v === null || v === undefined) ? fallback : v; }

function renderStats(stats) {
  const el = $("stats");
  if (!el) return;
  const s = stats || {};
  el.innerHTML = `
    <div class="grid md:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl border border-gray-100 p-4"><div class="text-xs text-gray-500">Users</div><div class="text-2xl font-bold">${safe(s.users, 0)}</div></div>
      <div class="bg-white rounded-xl border border-gray-100 p-4"><div class="text-xs text-gray-500">Experiences</div><div class="text-2xl font-bold">${safe(s.experiences, 0)}</div></div>
      <div class="bg-white rounded-xl border border-gray-100 p-4"><div class="text-xs text-gray-500">Bookings</div><div class="text-2xl font-bold">${safe(s.bookings, 0)}</div></div>
      <div class="bg-white rounded-xl border border-gray-100 p-4"><div class="text-xs text-gray-500">Revenue</div><div class="text-2xl font-bold">$${safe(s.revenue, 0)}</div></div>
    </div>
  `;
}

function renderBookings(bookings) {
  const el = $("bookings");
  if (!el) return;
  const rows = (Array.isArray(bookings) ? bookings : []).map(b => {
    const id = b._id || b.id || "";
    const title = b.experience?.title || b.experienceTitle || "Experience";
    const guest = b.guestId?.name || b.guestName || "Guest";
    const date = b.bookingDate ? new Date(b.bookingDate).toLocaleDateString("en-AU") : "—";
    const status = b.status || "—";
    return `
      <tr class="border-t">
        <td class="p-3 text-sm">${title}</td>
        <td class="p-3 text-sm">${guest}</td>
        <td class="p-3 text-sm">${date}</td>
        <td class="p-3 text-sm">${status}</td>
        <td class="p-3 text-sm text-right">
          <button class="px-3 py-1 text-xs font-bold rounded border border-red-200 text-red-600 hover:bg-red-50"
            onclick="adminCancelBooking('${id}')">Cancel</button>
        </td>
      </tr>
    `;
  }).join("");

  el.innerHTML = `
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th class="p-3 text-left">Experience</th>
            <th class="p-3 text-left">Guest</th>
            <th class="p-3 text-left">Date</th>
            <th class="p-3 text-left">Status</th>
            <th class="p-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td class="p-6 text-center text-sm text-gray-500" colspan="5">No bookings.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function renderExperiences(exps) {
  const el = $("experiences");
  if (!el) return;
  const cards = (Array.isArray(exps) ? exps : []).map(e => {
    const id = e._id || e.id || "";
    const title = e.title || "Untitled";
    const city = e.city || "—";
    const active = (e.isActive !== undefined) ? !!e.isActive : true;
    return `
      <div class="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4">
        <div>
          <div class="font-bold">${title}</div>
          <div class="text-xs text-gray-500">${city}</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1 text-xs font-bold rounded border ${active ? "border-gray-200 text-gray-700 hover:bg-gray-50" : "border-green-200 text-green-700 hover:bg-green-50"}"
            onclick="adminToggleExperience('${id}')">${active ? "Disable" : "Enable"}</button>
          <button class="px-3 py-1 text-xs font-bold rounded border border-red-200 text-red-600 hover:bg-red-50"
            onclick="adminDeleteExperience('${id}')">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  el.innerHTML = `<div class="space-y-3">${cards || `<div class="text-sm text-gray-500 text-center py-8">No experiences.</div>`}</div>`;
}

function renderUsers(users) {
  const el = $("users");
  if (!el) return;
  const rows = (Array.isArray(users) ? users : []).map(u => {
    const id = u._id || u.id || "";
    const name = u.name || "—";
    const email = u.email || "—";
    return `
      <tr class="border-t">
        <td class="p-3 text-sm">${name}</td>
        <td class="p-3 text-sm">${email}</td>
        <td class="p-3 text-sm text-right">
          <button class="px-3 py-1 text-xs font-bold rounded border border-red-200 text-red-600 hover:bg-red-50"
            onclick="adminDeleteUser('${id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  el.innerHTML = `
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th class="p-3 text-left">Name</th>
            <th class="p-3 text-left">Email</th>
            <th class="p-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td class="p-6 text-center text-sm text-gray-500" colspan="3">No users.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

// expose handlers used by onclick
window.adminToggleExperience = async function(id) {
  try { await toggleExperience(id); await boot(); } catch (e) { alert(e.message || "Failed"); }
};
window.adminDeleteExperience = async function(id) {
  if (!confirm("Delete this experience?")) return;
  try { await deleteExperience(id); await boot(); } catch (e) { alert(e.message || "Failed"); }
};
window.adminDeleteUser = async function(id) {
  if (!confirm("Delete this user?")) return;
  try { await deleteUser(id); await boot(); } catch (e) { alert(e.message || "Failed"); }
};
window.adminCancelBooking = async function(id) {
  if (!confirm("Cancel this booking?")) return;
  try { await cancelBooking(id); await boot(); } catch (e) { alert(e.message || "Failed"); }
};

async function boot() {
  if (!mustBeAdmin()) return;

  // basic skeleton if containers exist
  try {
    const [stats, bookings, exps, users] = await Promise.all([
      loadStats().catch(() => ({})),
      loadBookings().catch(() => ([])),
      loadExperiences().catch(() => ([])),
      loadUsers().catch(() => ([]))
    ]);

    renderStats(stats);
    renderBookings(bookings);
    renderExperiences(exps);
    renderUsers(users);
  } catch (e) {
    alert("Admin load failed.");
  }
}

document.addEventListener("DOMContentLoaded", boot);
