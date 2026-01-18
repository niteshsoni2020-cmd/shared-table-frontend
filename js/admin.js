// js/admin.js
// Single-truth networking: window.authFetch + window.getAuthToken from common.js

function getToken() {
  return (window.getAuthToken && window.getAuthToken()) || "";
}

function getAdminReason() {
  let r = "";
  try { r = String(sessionStorage.getItem("admin_reason") || ""); } catch (_) { r = ""; }
  r = r.trim();
  if (r.length >= 5) return r;
  try { r = String(prompt("Admin reason (required)", "") || ""); } catch (_) { r = ""; }
  r = r.trim();
  if (r.length < 5) return "";
  try { sessionStorage.setItem("admin_reason", r); } catch (_) {}
  return r;
}

function withOptionalAdminReasonHeaders(opts) {
  let r = "";
  try { r = String(sessionStorage.getItem("admin_reason") || ""); } catch (_) { r = ""; }
  r = r.trim();
  if (r.length < 5) return opts || {};
  const headers = Object.assign({}, (opts && opts.headers) || {}, { "X-Admin-Reason": r });
  return Object.assign({}, opts || {}, { headers });
}

async function adminFetch(path, opts) {
  if (!path.startsWith("/api/admin/")) {
    return window.authFetch(path, withOptionalAdminReasonHeaders(opts));
  }
  const reason = getAdminReason();
  if (!reason) throw new Error("Admin reason required");
  const headers = Object.assign({}, (opts && opts.headers) || {}, { "X-Admin-Reason": reason });
  return window.authFetch(path, Object.assign({}, opts || {}, { headers }));
}

function mustBeAdmin() {
  const u = (window.getAuthUser && window.getAuthUser()) || {};
  const isAdminEmail = (u.email || "") === "admin@sharedtable.com";
  const isAdmin = (u && (u.isAdmin === true || String(u.role || "").toLowerCase() === "admin" || isAdminEmail));
  if (!getToken() || !isAdmin) {
    location.href = "login.html?redirect=" + encodeURIComponent("admin.html");
    return false;
  }
  return true;
}

async function loadStats() {
  const res = await adminFetch("/api/admin/stats", { method: "GET" });
  if (!res.ok) throw new Error("stats");
  return res.json();
}

async function loadBookings() {
  const res = await adminFetch("/api/admin/bookings", { method: "GET" });
  if (!res.ok) throw new Error("bookings");
  return res.json();
}

async function loadExperiences() {
  const res = await adminFetch("/api/admin/experiences", { method: "GET" });
  if (!res.ok) throw new Error("experiences");
  return res.json();
}

async function loadUsers() {
  const res = await adminFetch("/api/admin/users", { method: "GET" });
  if (!res.ok) throw new Error("users");
  return res.json();
}

async function toggleExperience(id) {
  const res = await adminFetch("/api/admin/experiences/" + encodeURIComponent(id) + "/toggle", {
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
  const res = await window.authFetch("/api/experiences/" + encodeURIComponent(id), withOptionalAdminReasonHeaders({ method: "DELETE" }));
  if (!res.ok) {
    let msg = "Failed to delete experience";
    try { msg = (await res.json()).message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json().catch(() => ({}));
}

async function deleteUser(id) {
  const res = await adminFetch("/api/admin/users/" + encodeURIComponent(id), { method: "DELETE" });
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
  const El = window.tstsEl;
  const el = $("stats");
  if (!el) return;
  const s = stats || {};
  el.textContent = "";
  
  var grid = El("div", { className: "grid md:grid-cols-4 gap-4" }, [
    El("div", { className: "bg-white rounded-xl border border-gray-100 p-4" }, [
      El("div", { className: "text-xs text-gray-500", textContent: "Users" }),
      El("div", { className: "text-2xl font-bold", textContent: String(safe(s.users, 0)) })
    ]),
    El("div", { className: "bg-white rounded-xl border border-gray-100 p-4" }, [
      El("div", { className: "text-xs text-gray-500", textContent: "Experiences" }),
      El("div", { className: "text-2xl font-bold", textContent: String(safe(s.experiences, 0)) })
    ]),
    El("div", { className: "bg-white rounded-xl border border-gray-100 p-4" }, [
      El("div", { className: "text-xs text-gray-500", textContent: "Bookings" }),
      El("div", { className: "text-2xl font-bold", textContent: String(safe(s.bookings, 0)) })
    ]),
    El("div", { className: "bg-white rounded-xl border border-gray-100 p-4" }, [
      El("div", { className: "text-xs text-gray-500", textContent: "Revenue" }),
      El("div", { className: "text-2xl font-bold", textContent: "$" + String(safe(s.revenue, 0)) })
    ])
  ]);
  el.appendChild(grid);
}

function renderBookings(bookings) {
  const El = window.tstsEl;
  const el = $("bookings");
  if (!el) return;
  el.textContent = "";

  var tbody = El("tbody", {});
  var list = Array.isArray(bookings) ? bookings : [];
  
  if (list.length === 0) {
    tbody.appendChild(El("tr", {}, [
      El("td", { className: "p-6 text-center text-sm text-gray-500", colSpan: "5", textContent: "No bookings." })
    ]));
  } else {
    list.forEach(function(b) {
      var id = b._id || b.id || "";
      var title = (b.experience && b.experience.title) || b.experienceTitle || "Experience";
      var guest = (b.guestId && b.guestId.name) || b.guestName || "Guest";
      var date = b.bookingDate ? new Date(b.bookingDate).toLocaleDateString("en-AU") : "—";
      var status = b.status || "—";

      var cancelBtn = El("button", { className: "px-3 py-1 text-xs font-bold rounded border border-red-200 text-red-600 hover:bg-red-50", textContent: "Cancel" });
      cancelBtn.addEventListener("click", function() { window.adminCancelBooking(id); });

      tbody.appendChild(El("tr", { className: "border-t" }, [
        El("td", { className: "p-3 text-sm", textContent: title }),
        El("td", { className: "p-3 text-sm", textContent: guest }),
        El("td", { className: "p-3 text-sm", textContent: date }),
        El("td", { className: "p-3 text-sm", textContent: status }),
        El("td", { className: "p-3 text-sm text-right" }, [cancelBtn])
      ]));
    });
  }

  var table = El("table", { className: "w-full" }, [
    El("thead", { className: "bg-gray-50 text-xs text-gray-500" }, [
      El("tr", {}, [
        El("th", { className: "p-3 text-left", textContent: "Experience" }),
        El("th", { className: "p-3 text-left", textContent: "Guest" }),
        El("th", { className: "p-3 text-left", textContent: "Date" }),
        El("th", { className: "p-3 text-left", textContent: "Status" }),
        El("th", { className: "p-3 text-right", textContent: "Action" })
      ])
    ]),
    tbody
  ]);

  el.appendChild(El("div", { className: "bg-white rounded-xl border border-gray-100 overflow-hidden" }, [table]));
}

function renderExperiences(exps) {
  const El = window.tstsEl;
  const el = $("experiences");
  if (!el) return;
  el.textContent = "";

  var list = Array.isArray(exps) ? exps : [];
  var container = El("div", { className: "space-y-3" });

  if (list.length === 0) {
    container.appendChild(El("div", { className: "text-sm text-gray-500 text-center py-8", textContent: "No experiences." }));
  } else {
    list.forEach(function(e) {
      var id = e._id || e.id || "";
      var title = e.title || "Untitled";
      var city = e.city || "—";
      var active = (e.isActive !== undefined) ? !!e.isActive : true;

      var toggleBtn = El("button", { 
        className: "px-3 py-1 text-xs font-bold rounded border " + (active ? "border-gray-200 text-gray-700 hover:bg-gray-50" : "border-green-200 text-green-700 hover:bg-green-50"),
        textContent: active ? "Disable" : "Enable"
      });
      toggleBtn.addEventListener("click", function() { window.adminToggleExperience(id); });

      var deleteBtn = El("button", { className: "px-3 py-1 text-xs font-bold rounded border border-red-200 text-red-600 hover:bg-red-50", textContent: "Delete" });
      deleteBtn.addEventListener("click", function() { window.adminDeleteExperience(id); });

      container.appendChild(El("div", { className: "bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4" }, [
        El("div", {}, [
          El("div", { className: "font-bold", textContent: title }),
          El("div", { className: "text-xs text-gray-500", textContent: city })
        ]),
        El("div", { className: "flex items-center gap-2" }, [toggleBtn, deleteBtn])
      ]));
    });
  }

  el.appendChild(container);
}

function renderUsers(users) {
  const El = window.tstsEl;
  const el = $("users");
  if (!el) return;
  el.textContent = "";

  var tbody = El("tbody", {});
  var list = Array.isArray(users) ? users : [];

  if (list.length === 0) {
    tbody.appendChild(El("tr", {}, [
      El("td", { className: "p-6 text-center text-sm text-gray-500", colSpan: "3", textContent: "No users." })
    ]));
  } else {
    list.forEach(function(u) {
      var id = u._id || u.id || "";
      var name = u.name || "—";
      var email = u.email || "—";

      var deleteBtn = El("button", { className: "px-3 py-1 text-xs font-bold rounded border border-red-200 text-red-600 hover:bg-red-50", textContent: "Delete" });
      deleteBtn.addEventListener("click", function() { window.adminDeleteUser(id); });

      tbody.appendChild(El("tr", { className: "border-t" }, [
        El("td", { className: "p-3 text-sm", textContent: name }),
        El("td", { className: "p-3 text-sm", textContent: email }),
        El("td", { className: "p-3 text-sm text-right" }, [deleteBtn])
      ]));
    });
  }

  var table = El("table", { className: "w-full" }, [
    El("thead", { className: "bg-gray-50 text-xs text-gray-500" }, [
      El("tr", {}, [
        El("th", { className: "p-3 text-left", textContent: "Name" }),
        El("th", { className: "p-3 text-left", textContent: "Email" }),
        El("th", { className: "p-3 text-right", textContent: "Action" })
      ])
    ]),
    tbody
  ]);

  el.appendChild(El("div", { className: "bg-white rounded-xl border border-gray-100 overflow-hidden" }, [table]));
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

// Tab switching functionality
window.switchTab = function(tabName) {
  const views = ['dashboard', 'listings', 'users'];
  views.forEach(view => {
    const viewEl = document.getElementById('view-' + view);
    if (viewEl) viewEl.classList.add('hidden');
  });

  views.forEach(view => {
    const tabEl = document.getElementById('tab-' + view);
    if (tabEl) {
      tabEl.classList.remove('border-tsts-clay', 'text-tsts-clay', 'border-b-2');
      tabEl.classList.add('border-transparent', 'text-gray-500');
    }
  });

  const selectedView = document.getElementById('view-' + tabName);
  if (selectedView) selectedView.classList.remove('hidden');

  const selectedTab = document.getElementById('tab-' + tabName);
  if (selectedTab) {
    selectedTab.classList.remove('border-transparent', 'text-gray-500');
    selectedTab.classList.add('border-tsts-clay', 'text-tsts-clay', 'border-b-2');
  }

  if (tabName === 'users') loadUsers();
};

async function boot() {
  if (!mustBeAdmin()) return;

  try { getAdminReason(); } catch (_) {}

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
