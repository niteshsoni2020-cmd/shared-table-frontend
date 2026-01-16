// js/my-bookings.js (CLOSED: dashboard + hosting)
// Uses common.js single-truth: window.authFetch, window.getAuthToken

const contentEl = document.getElementById("content-area");
const tabTrips = document.getElementById("tab-trips");
const tabHost = document.getElementById("tab-hosting");

const guestModal = document.getElementById("guest-modal");
const reviewModal = document.getElementById("review-modal");

const closeGuestBtn = document.getElementById("close-modal-btn");
const reviewForm = document.getElementById("review-form");

let hostBookingsCache = []; // for modal lookup by booking id

function token() {
  return (window.getAuthToken && window.getAuthToken()) || "";
}

function requireAuthOrRedirect() {
  if (!token()) {
    location.href = "login.html";
    return false;
  }
  return true;
}

function setLoading() {
  if (!contentEl) return;
  contentEl.innerHTML = `<div class="text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-gray-300"></i></div>`;
}

function setError(msg) {
  if (!contentEl) return;
  contentEl.innerHTML = `<p class="text-red-500 text-center">${msg || "Something went wrong."}</p>`;
}

function safeStr(x) {
  return (typeof x === "string") ? x : (x == null ? "" : String(x));
}

function safeDate(d) {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function fmtTripDate(dt) {
  try {
    if (window.tstsFormatDateShort) return window.tstsFormatDateShort(dt);
  } catch (_) {}
  try {
    return dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  } catch (_) {
    return dt.toDateString();
  }
}

function toggleTab(which) {
  if (!tabTrips || !tabHost) return;

  if (which === "trips") {
    tabTrips.className = "border-orange-600 text-orange-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm";
    tabHost.className = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm";
  } else {
    tabHost.className = "border-orange-600 text-orange-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm";
    tabTrips.className = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm";
  }
}

/* ====================== GUEST TRIPS ====================== */

async function loadTrips() {
  if (!requireAuthOrRedirect()) return;
  setLoading();

  try {
    const res = await window.authFetch("/api/bookings/my-bookings");
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError((data && data.message) || "Failed to load trips.");
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      contentEl.innerHTML = `
        <div class="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div class="text-5xl mb-4">🌏</div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">No trips yet</h3>
          <p class="text-gray-500 mb-6">You haven't booked any experiences yet.</p>
          <a href="explore.html" class="inline-block bg-orange-600 text-white px-8 py-3 rounded-full font-bold shadow hover:bg-orange-700 transition">
            Find an Adventure
          </a>
        </div>`;
      return;
    }

    contentEl.innerHTML = data.map(renderTripCard).join("");
  } catch (_) {
    setError("Failed to load trips.");
  }
}

function renderTripCard(booking) {
  const exp = booking && (booking.experience || booking.experienceDetails) || {};
  const img = exp.imageUrl || (Array.isArray(exp.images) && exp.images[0]) || booking.imageUrl || "https://via.placeholder.com/150";

  const dt = safeDate(booking.bookingDate || booking.experienceDate || booking.date || booking.createdAt);
  const dateStr = dt ? fmtTripDate(dt) : "Date TBA";

  const today = new Date();
  today.setHours(0,0,0,0);

  const isPast = dt ? (dt < today) : false;
  const status = safeStr(booking.status).toLowerCase();
  const isCancelled = status.includes("cancel");

  let statusBadge = `<span class="px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-700">CONFIRMED</span>`;
  let actionButton = "";

  const expId = exp._id || exp.id || booking.experienceId || booking.expId || "";

  if (isCancelled) {
    statusBadge = `<span class="px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-700">CANCELLED</span>`;
    actionButton = `<span class="text-sm text-gray-400 italic">This booking was cancelled.</span>`;
  } else if (isPast) {
    statusBadge = `<span class="px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-600">COMPLETED</span>`;
    actionButton = `
      <button data-action="review" data-booking-id="${booking._id || ""}" data-exp-id="${expId}"
        class="w-full md:w-auto px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg shadow hover:bg-black transition flex items-center justify-center gap-2">
        <i class="fas fa-star"></i> Write a Review
      </button>`;
  } else {
    actionButton = `
      <button data-action="cancel" data-booking-id="${booking._id || ""}"
        class="w-full md:w-auto px-5 py-2 border border-red-200 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition">
        Cancel Booking
      </button>`;
  }

  const title = exp.title || booking.title || "Unknown Experience";
  const guests = booking.guests || booking.numGuests || booking.guestCount || 1;
  const city = exp.city || booking.city || "Location TBA";

  return `
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 mb-4 hover:shadow-md transition">
      <div class="w-full md:w-48 h-32 md:h-auto bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
        <img src="${img}" class="w-full h-full object-cover" alt="Experience">
      </div>
      <div class="flex-grow flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start mb-2 gap-4">
            <h3 class="font-bold text-xl text-gray-900 leading-tight">${title}</h3>
            ${statusBadge}
          </div>
          <div class="text-gray-500 text-sm flex flex-col gap-1">
            <span class="flex items-center gap-2"><i class="far fa-calendar w-4"></i> ${dateStr}</span>
            <span class="flex items-center gap-2"><i class="fas fa-user-friends w-4"></i> ${guests} Guests</span>
            <span class="flex items-center gap-2"><i class="fas fa-map-marker-alt w-4"></i> ${city}</span>
          </div>
        </div>
        <div class="mt-4 md:mt-0 pt-4 md:pt-0 flex justify-end items-end">
          ${actionButton}
        </div>
      </div>
    </div>
  `;
}

/* ====================== REVIEW ====================== */

function openReviewModal(bookingId, expId) {
  const bid = document.getElementById("review-booking-id");
  const eid = document.getElementById("review-exp-id");
  if (bid) bid.value = bookingId || "";
  if (eid) eid.value = expId || "";
  if (reviewModal) reviewModal.classList.remove("hidden");
}

async function submitReview(e) {
  e.preventDefault();
  if (!requireAuthOrRedirect()) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.innerText : "";

  if (submitBtn) { submitBtn.innerText = "Posting..."; submitBtn.disabled = true; }

  const bookingId = (document.getElementById("review-booking-id") || {}).value || "";
  const expId = (document.getElementById("review-exp-id") || {}).value || "";
  const ratingRaw = (document.getElementById("review-rating") || {}).value || "5";
  const comment = (document.getElementById("review-comment") || {}).value || "";

  try {
    const payload = {
      bookingId,
      experienceId: expId,
      rating: parseInt(ratingRaw, 10) || 5,
      comment
    };

    const res = await window.authFetch("/api/reviews", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      alert("Review posted successfully! Thank you.");
      if (reviewModal) reviewModal.classList.add("hidden");
      e.target.reset();
    } else {
      alert(data.message || "Failed to post review.");
    }
  } catch (_) {
    alert("Network error.");
  } finally {
    if (submitBtn) { submitBtn.innerText = originalText; submitBtn.disabled = false; }
  }
}

/* ====================== CANCEL ====================== */

async function cancelBooking(id) {
  if (!id) return;
  if (!confirm("Are you sure? Refund policies apply.")) return;

  try {
    const res = await window.authFetch(`/api/bookings/${id}/cancel`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      const amount = (data && data.refund && data.refund.amount) ? data.refund.amount : "";
      alert(amount !== "" ? `Cancelled. Refund: $${amount}` : "Cancelled.");
      loadTrips();
    } else {
      alert("Error: " + (data.message || "Unable to cancel."));
    }
  } catch (_) {
    alert("Network error.");
  }
}

/* ====================== HOSTING DASHBOARD ====================== */

async function loadHost() {
  if (!requireAuthOrRedirect()) return;
  setLoading();

  try {
    const res = await window.authFetch("/api/bookings/host-bookings");
    const bookings = await res.json().catch(() => null);

    if (!res.ok) {
      setError((bookings && bookings.message) || "Failed to load hosting data.");
      return;
    }

    if (!Array.isArray(bookings) || bookings.length === 0) {
      contentEl.innerHTML = `
        <div class="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div class="text-5xl mb-4">🍳</div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">No bookings received</h3>
          <p class="text-gray-500 mb-6">Your listings are quiet for now.</p>
          <a href="host.html" class="inline-block bg-gray-900 text-white px-8 py-3 rounded-full font-bold shadow hover:bg-black transition">Manage Listings</a>
        </div>`;
      return;
    }

    hostBookingsCache = bookings;

    contentEl.innerHTML = bookings.map(b => {
      const dt = safeDate(b.bookingDate || b.experienceDate || b.createdAt);
      const month = dt ? dt.toLocaleString("default", { month: "short" }) : "--";
      const day = dt ? dt.getDate() : "--";

      const exp = b.experience || {};
      const title = exp.title || b.title || "Listing";

      const guest = b.guestId || b.user || {};
      const guestName = guest.name || b.guestName || "Unknown Guest";
      const pax = b.guests || b.numGuests || b.guestCount || "-";
      const paid = b.amountTotal || (b.pricing && b.pricing.totalPrice) || "";

      return `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div class="flex items-center gap-4 w-full">
            <div class="bg-orange-50 text-orange-600 w-16 h-16 rounded-xl flex flex-col items-center justify-center border border-orange-100 flex-shrink-0">
              <span class="text-xs font-bold uppercase">${month}</span>
              <span class="text-xl font-bold">${day}</span>
            </div>
            <div>
              <h3 class="font-bold text-lg text-gray-900">${title}</h3>
              <p class="text-sm text-gray-500">Guest: <span class="font-bold text-gray-700">${guestName}</span></p>
              <div class="flex gap-4 text-xs text-gray-400 mt-1">
                <span>Paid: ${paid !== "" ? "$" + paid : "—"}</span>
                <span>•</span>
                <span>${pax} Pax</span>
              </div>
            </div>
          </div>

          <button data-action="guest" data-booking-id="${b._id || ""}"
            class="w-full md:w-auto bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition whitespace-nowrap">
            View Details
          </button>
        </div>
      `;
    }).join("");
  } catch (_) {
    setError("Failed to load hosting data.");
  }
}

/* ====================== GUEST MODAL ====================== */

function openGuestModalById(bookingId) {
  const b = hostBookingsCache.find(x => (x._id || "") === bookingId);
  if (!b) return;

  const titleEl = document.getElementById("modal-experience-title");
  const listEl = document.getElementById("modal-guest-list");

  if (titleEl) titleEl.textContent = "Booking Details";

  const guest = b.guestId || b.user || {};
  const name = guest.name || b.guestName || "Unknown";
  const email = guest.email || b.guestEmail || "No Email";

  if (listEl) {
    listEl.innerHTML = `
      <div class="flex items-start gap-4">
        <div class="bg-gray-200 rounded-full w-12 h-12 flex items-center justify-center text-xl">👤</div>
        <div>
          <p class="font-bold text-lg text-gray-900">${name}</p>
          <a href="mailto:${email}" class="text-orange-600 hover:underline text-sm">${email}</a>
        </div>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg border border-gray-100 mt-4 text-sm">
        <p class="font-bold text-gray-500 text-xs uppercase mb-1">Guest Note</p>
        <p class="italic text-gray-700">${b.guestNotes || "No notes provided."}</p>
      </div>
    `;
  }

  if (guestModal) guestModal.classList.remove("hidden");
}

function closeGuestModal() {
  if (guestModal) guestModal.classList.add("hidden");
}

function closeReviewModal() {
  if (reviewModal) reviewModal.classList.add("hidden");
}

/* ====================== EVENT WIRING ====================== */

document.addEventListener("DOMContentLoaded", () => {
  if (!requireAuthOrRedirect()) return;

  if (tabTrips) tabTrips.addEventListener("click", () => { toggleTab("trips"); loadTrips(); });
  if (tabHost) tabHost.addEventListener("click", () => { toggleTab("hosting"); loadHost(); });

  if (reviewForm) reviewForm.addEventListener("submit", submitReview);

  // Delegate clicks for dynamic buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const bid = btn.getAttribute("data-booking-id") || "";
    const expId = btn.getAttribute("data-exp-id") || "";

    if (action === "cancel") cancelBooking(bid);
    if (action === "review") openReviewModal(bid, expId);
    if (action === "guest") openGuestModalById(bid);
  });

  // Close guest modal
  if (closeGuestBtn) closeGuestBtn.addEventListener("click", closeGuestModal);

  // Click outside to close
  document.addEventListener("click", (e) => {
    if (guestModal && !guestModal.classList.contains("hidden") && e.target === guestModal) closeGuestModal();
    if (reviewModal && !reviewModal.classList.contains("hidden") && e.target === reviewModal) closeReviewModal();
  });

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeGuestModal();
    closeReviewModal();
  });

  // Default load
  toggleTab("trips");
  loadTrips();
});
