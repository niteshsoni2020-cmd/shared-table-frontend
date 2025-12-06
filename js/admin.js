// js/admin.js

const API_BASE = "https://shared-table-api.onrender.com/api";

// DOM Elements
const totalUsersEl = document.getElementById("stats-total-users");
const totalHostsEl = document.getElementById("stats-total-hosts");
const totalBookingsEl = document.getElementById("stats-total-bookings");
const totalRevenueEl = document.getElementById("stats-total-revenue");

const bookingsTableBodyEl = document.getElementById("bookings-table-body");
const bookingsLoadingEl = document.getElementById("bookings-loading");
const bookingsEmptyEl = document.getElementById("bookings-empty");
const bookingsErrorEl = document.getElementById("bookings-error");

// --------------------
// Auth Guard
// --------------------
function getCurrentUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse user from localStorage", err);
    return null;
  }
}

function requireAdmin() {
  const token = localStorage.getItem("token");
  const user = getCurrentUser();

  if (!token || !user || user.role !== "Admin") {
    // Hard redirect to login
    window.location.href = "login.html";
  }
}

// --------------------
// Helpers
// --------------------
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "—";
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "AUD"
    }).format(Number(amount));
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "—";
  try {
    const d = new Date(dateValue);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return String(dateValue);
  }
}

// --------------------
// Fetch Admin Stats
// --------------------
async function fetchAdminStats() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing auth token");

  const res = await fetch(`${API_BASE}/admin/stats`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error("Failed to load admin stats");
  }

  const data = await res.json();
  // Backend currently returns: { userCount, expCount, bookingCount, totalRevenue }
  // Be tolerant to both schemas (future-proof).
  const totalUsers = data.totalUsers ?? data.userCount ?? 0;
  const totalBookings = data.totalBookings ?? data.bookingCount ?? 0;
  const totalRevenue = data.totalRevenue ?? 0;

  totalUsersEl.textContent = totalUsers;
  // totalHosts not provided by API yet – leave as "—" or use a future field if added
  totalHostsEl.textContent = data.totalHosts ?? "—";
  totalBookingsEl.textContent = totalBookings;
  totalRevenueEl.textContent = formatCurrency(totalRevenue);
}

// --------------------
// Fetch Admin Bookings
// --------------------
async function fetchAdminBookings() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing auth token");

  bookingsLoadingEl.classList.remove("hidden");
  bookingsEmptyEl.classList.add("hidden");
  bookingsErrorEl.classList.add("hidden");
  bookingsTableBodyEl.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/admin/bookings`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error("Failed to load bookings");
    }

    const bookings = await res.json();

    if (!bookings || bookings.length === 0) {
      bookingsEmptyEl.classList.remove("hidden");
      return;
    }

    bookings.forEach(booking => {
      const tr = createBookingRow(booking);
      bookingsTableBodyEl.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    bookingsErrorEl.classList.remove("hidden");
  } finally {
    bookingsLoadingEl.classList.add("hidden");
  }
}

// --------------------
// Create Table Row
// --------------------
function createBookingRow(booking) {
  const tr = document.createElement("tr");
  tr.className = "hover:bg-slate-50/60";

  const experience = booking.experience || booking.experienceDetails || {};
  const user = booking.user || booking.guest || {};

  const bookingDate =
    booking.date ||
    booking.experienceDate ||
    booking.bookingDate ||
    booking.createdAt;

  const guestName =
    user.name ||
    user.fullName ||
    user.email ||
    "Unknown guest";

  const experienceTitle =
    experience.title ||
    booking.title ||
    "Untitled experience";

  const amount =
    booking.amount ||
    booking.totalPrice ||
    (booking.pricing && booking.pricing.totalPrice) ||
    booking.price ||
    0;

  const statusRaw = booking.status || booking.paymentStatus || "unknown";
  const status = String(statusRaw).toLowerCase();

  // --- Date ---
  const tdDate = document.createElement("td");
  tdDate.className = "px-4 sm:px-5 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-700";
  tdDate.textContent = formatDate(bookingDate);

  // --- Guest Name ---
  const tdGuest = document.createElement("td");
  tdGuest.className = "px-4 sm:px-5 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-800";
  tdGuest.textContent = guestName;

  // --- Experience Title ---
  const tdExperience = document.createElement("td");
  tdExperience.className = "px-4 sm:px-5 py-3 text-xs sm:text-sm text-slate-800";
  tdExperience.textContent = experienceTitle;

  // --- Amount ---
  const tdAmount = document.createElement("td");
  tdAmount.className = "px-4 sm:px-5 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-800";
  tdAmount.textContent = formatCurrency(amount);

  // --- Status ---
  const tdStatus = document.createElement("td");
  tdStatus.className = "px-4 sm:px-5 py-3 whitespace-nowrap text-xs sm:text-sm";
  const statusBadge = document.createElement("span");
  statusBadge.className =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium";
  if (status === "confirmed" || status === "paid") {
    statusBadge.classList.add("bg-emerald-50", "text-emerald-700", "border", "border-emerald-100");
    statusBadge.textContent = "Confirmed";
  } else if (status === "cancelled" || status === "canceled" || status === "refunded") {
    statusBadge.classList.add("bg-red-50", "text-red-700", "border", "border-red-100");
    statusBadge.textContent = "Cancelled";
  } else if (status === "pending") {
    statusBadge.classList.add("bg-amber-50", "text-amber-700", "border", "border-amber-100");
    statusBadge.textContent = "Pending";
  } else {
    statusBadge.classList.add("bg-slate-100", "text-slate-700", "border", "border-slate-200");
    statusBadge.textContent = statusRaw;
  }
  tdStatus.appendChild(statusBadge);

  // --- Actions ---
  const tdActions = document.createElement("td");
  tdActions.className = "px-4 sm:px-5 py-3 whitespace-nowrap text-xs sm:text-sm";

  const canCancel = !(status === "cancelled" || status === "canceled" || status === "refunded");
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = canCancel ? "Cancel / Refund" : "Cancelled";
  cancelBtn.disabled = !canCancel;
  cancelBtn.className =
    "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold border transition " +
    (canCancel
      ? "border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400"
      : "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed");

  if (canCancel) {
    cancelBtn.addEventListener("click", async () => {
      const confirmed = window.confirm("Are you sure you want to cancel / refund this booking?");
      if (!confirmed) return;

      cancelBtn.disabled = true;
      cancelBtn.textContent = "Processing…";

      try {
        await cancelBooking(booking._id || booking.id || booking.bookingId);
        // Update UI
        statusBadge.className =
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium bg-red-50 text-red-700 border border-red-100";
        statusBadge.textContent = "Cancelled";
        cancelBtn.textContent = "Cancelled";
      } catch (err) {
        console.error(err);
        alert("Failed to cancel booking. Please try again.");
        cancelBtn.disabled = false;
        cancelBtn.textContent = "Cancel / Refund";
      }
    });
  }

  tdActions.appendChild(cancelBtn);

  tr.appendChild(tdDate);
  tr.appendChild(tdGuest);
  tr.appendChild(tdExperience);
  tr.appendChild(tdAmount);
  tr.appendChild(tdStatus);
  tr.appendChild(tdActions);

  return tr;
}

// --------------------
// Cancel / Refund
// --------------------
async function cancelBooking(bookingId) {
  if (!bookingId) throw new Error("Missing booking id");

  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing auth token");

  const url = `${API_BASE}/bookings/${bookingId}/cancel`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    throw new Error("Cancel / refund request failed");
  }

  return res.json();
}

// --------------------
// Init
// --------------------
async function initAdminDashboard() {
  requireAdmin();

  try {
    await fetchAdminStats();
  } catch (err) {
    console.error("Stats error:", err);
  }

  try {
    await fetchAdminBookings();
  } catch (err) {
    console.error("Bookings error:", err);
  }
}

document.addEventListener("DOMContentLoaded", initAdminDashboard);
