// js/my-bookings.js (CLOSED: dashboard + hosting)
// Uses common.js single-truth: window.authFetch, window.getAuthToken

const contentEl = document.getElementById("content-area");
const tabTrips = document.getElementById("tab-trips");
const tabHost = document.getElementById("tab-hosting");

const guestModal = document.getElementById("guest-modal");
const reviewModal = document.getElementById("review-modal");

const closeGuestBtn = document.getElementById("close-modal-btn");
const reviewCancelBtn = document.getElementById("review-cancel-btn");
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
  contentEl.textContent = "";
  var spinnerWrap = window.tstsEl("div", { className: "text-center py-12" }, [
    window.tstsEl("i", { className: "fas fa-spinner fa-spin text-3xl text-gray-300" })
  ]);
  contentEl.appendChild(spinnerWrap);
}

function setError(msg) {
  if (!contentEl) return;
  const El = window.tstsEl;
  contentEl.textContent = "";
  contentEl.appendChild(El("p", { className: "text-red-500 text-center", textContent: msg || "Something went wrong." }));
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
      const El = window.tstsEl;
      contentEl.textContent = "";
      contentEl.appendChild(
        El("div", { className: "text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm" }, [
          El("div", { className: "text-5xl mb-4", textContent: "🌏" }),
          El("h3", { className: "text-xl font-bold text-gray-900 mb-2", textContent: "No trips yet" }),
          El("p", { className: "text-gray-500 mb-6", textContent: "You haven't booked any experiences yet." }),
          El("a", { href: "explore.html", className: "inline-block bg-orange-600 text-white px-8 py-3 rounded-full font-bold shadow hover:bg-orange-700 transition", textContent: "Find an Adventure" })
        ])
      );
      return;
    }

    contentEl.textContent = "";
    data.forEach(function(b) { contentEl.appendChild(renderTripCard(b)); });
  } catch (_) {
    setError("Failed to load trips.");
  }
}

function renderTripCard(booking) {
  const El = window.tstsEl;
  const exp = booking && (booking.experience || booking.experienceDetails) || {};
  const fallbackImg = "/assets/experience-default.jpg";
  const imgUrl = window.tstsSafeUrl(exp.imageUrl || (Array.isArray(exp.images) && exp.images[0]) || booking.imageUrl, fallbackImg);

  const dt = safeDate(booking.bookingDate || booking.experienceDate || booking.date || booking.createdAt);
  const dateStr = dt ? fmtTripDate(dt) : "Date TBA";

  const today = new Date();
  today.setHours(0,0,0,0);

  const isPast = dt ? (dt < today) : false;
  const status = safeStr(booking.status).toLowerCase();
  const isCancelled = status.includes("cancel");

  const expId = exp._id || exp.id || booking.experienceId || booking.expId || "";
  const bookingId = booking._id || "";
  const title = exp.title || booking.title || "Unknown Experience";
  const guests = booking.guests || booking.numGuests || booking.guestCount || 1;
  const city = exp.city || booking.city || "Location TBA";

  var statusBadge, actionButton;

  if (isCancelled) {
    statusBadge = El("span", { className: "px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-700", textContent: "CANCELLED" });
    actionButton = El("span", { className: "text-sm text-gray-400 italic", textContent: "This booking was cancelled." });
  } else if (isPast) {
    statusBadge = El("span", { className: "px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-600", textContent: "COMPLETED" });
    actionButton = El("button", { 
      className: "w-full md:w-auto px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg shadow hover:bg-black transition flex items-center justify-center gap-2",
      "data-action": "review", "data-booking-id": bookingId, "data-exp-id": expId
    }, [El("i", { className: "fas fa-star" }), " Write a Review"]);
  } else {
    statusBadge = El("span", { className: "px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-700", textContent: "CONFIRMED" });
    actionButton = El("button", {
      className: "w-full md:w-auto px-5 py-2 border border-red-200 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition",
      "data-action": "cancel", "data-booking-id": bookingId, textContent: "Cancel Booking"
    });
  }

  var imgEl = El("img", { className: "w-full h-full object-cover", alt: "Experience" });
  window.tstsSafeImg(imgEl, imgUrl, fallbackImg);

  var card = El("div", { className: "bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 mb-4 hover:shadow-md transition" }, [
    El("div", { className: "w-full md:w-48 h-32 md:h-auto bg-gray-100 rounded-xl overflow-hidden flex-shrink-0" }, [imgEl]),
    El("div", { className: "flex-grow flex flex-col justify-between" }, [
      El("div", {}, [
        El("div", { className: "flex justify-between items-start mb-2 gap-4" }, [
          El("h3", { className: "font-bold text-xl text-gray-900 leading-tight", textContent: title }),
          statusBadge
        ]),
        El("div", { className: "text-gray-500 text-sm flex flex-col gap-1" }, [
          El("span", { className: "flex items-center gap-2" }, [El("i", { className: "far fa-calendar w-4" }), " " + dateStr]),
          El("span", { className: "flex items-center gap-2" }, [El("i", { className: "fas fa-user-friends w-4" }), " " + guests + " Guests"]),
          El("span", { className: "flex items-center gap-2" }, [El("i", { className: "fas fa-map-marker-alt w-4" }), " " + city])
        ])
      ]),
      El("div", { className: "mt-4 md:mt-0 pt-4 md:pt-0 flex justify-end items-end" }, [actionButton])
    ])
  ]);

  return card;
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
  const originalText = submitBtn ? submitBtn.textContent : "";

  if (submitBtn) { submitBtn.textContent = "Posting..."; submitBtn.disabled = true; }

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
      window.tstsNotify("Review posted successfully! Thank you.", "success");
      if (reviewModal) reviewModal.classList.add("hidden");
      e.target.reset();
    } else {
      window.tstsNotify(data.message || "Failed to post review.", "error");
    }
  } catch (_) {
    window.tstsNotify("Network error.", "error");
  } finally {
    if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false; }
  }
}

/* ====================== CANCEL ====================== */

async function cancelBooking(id) {
  if (!id) return;
  var confirmed = await window.tstsConfirm("Are you sure? Refund policies apply.", { destructive: true, confirmText: "Cancel Booking" });
  if (!confirmed) return;

  try {
    const res = await window.authFetch(`/api/bookings/${id}/cancel`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      const amount = (data && data.refund && data.refund.amount) ? data.refund.amount : "";
      window.tstsNotify(amount !== "" ? "Cancelled. Refund: $" + amount : "Cancelled.", "success");
      loadTrips();
    } else {
      window.tstsNotify("Error: " + (data.message || "Unable to cancel."), "error");
    }
  } catch (_) {
    window.tstsNotify("Network error.", "error");
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
      const El = window.tstsEl;
      contentEl.textContent = "";
      contentEl.appendChild(
        El("div", { className: "text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm" }, [
          El("div", { className: "text-5xl mb-4", textContent: "🍳" }),
          El("h3", { className: "text-xl font-bold text-gray-900 mb-2", textContent: "No bookings received" }),
          El("p", { className: "text-gray-500 mb-6", textContent: "Your listings are quiet for now." }),
          El("a", { href: "host.html", className: "inline-block bg-gray-900 text-white px-8 py-3 rounded-full font-bold shadow hover:bg-black transition", textContent: "Manage Listings" })
        ])
      );
      return;
    }

    hostBookingsCache = bookings;

    const El = window.tstsEl;
    contentEl.textContent = "";
    bookings.forEach(function(b) {
      const dt = safeDate(b.bookingDate || b.experienceDate || b.createdAt);
      const month = dt ? dt.toLocaleString("default", { month: "short" }) : "--";
      const day = dt ? dt.getDate() : "--";

      const exp = b.experience || {};
      const title = exp.title || b.title || "Listing";

      const guest = b.guestId || b.user || {};
      const guestName = guest.name || b.guestName || "Unknown Guest";
      const pax = b.guests || b.numGuests || b.guestCount || "-";
      const paid = b.amountTotal || (b.pricing && b.pricing.totalPrice) || "";

      var viewBtn = El("button", {
        className: "w-full md:w-auto bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition whitespace-nowrap",
        "data-action": "guest", "data-booking-id": b._id || "", textContent: "View Details"
      });

      var card = El("div", { className: "bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-4" }, [
        El("div", { className: "flex items-center gap-4 w-full" }, [
          El("div", { className: "bg-orange-50 text-orange-600 w-16 h-16 rounded-xl flex flex-col items-center justify-center border border-orange-100 flex-shrink-0" }, [
            El("span", { className: "text-xs font-bold uppercase", textContent: month }),
            El("span", { className: "text-xl font-bold", textContent: String(day) })
          ]),
          El("div", {}, [
            El("h3", { className: "font-bold text-lg text-gray-900", textContent: title }),
            El("p", { className: "text-sm text-gray-500" }, ["Guest: ", El("span", { className: "font-bold text-gray-700", textContent: guestName })]),
            El("div", { className: "flex gap-4 text-xs text-gray-400 mt-1" }, [
              El("span", { textContent: "Paid: " + (paid !== "" ? "$" + paid : "—") }),
              El("span", { textContent: "•" }),
              El("span", { textContent: pax + " Pax" })
            ])
          ])
        ]),
        viewBtn
      ]);
      contentEl.appendChild(card);
    });
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
    const El = window.tstsEl;
    listEl.textContent = "";
    // WS-FE-06: Use safe mailto helper - if invalid, show email as text (no link)
    var safeMailto = window.tstsSafeMailto ? window.tstsSafeMailto(email) : "";
    var emailEl = safeMailto
      ? El("a", { href: safeMailto, className: "text-orange-600 hover:underline text-sm", textContent: email })
      : El("span", { className: "text-gray-600 text-sm", textContent: email });
    listEl.appendChild(
      El("div", { className: "flex items-start gap-4" }, [
        El("div", { className: "bg-gray-200 rounded-full w-12 h-12 flex items-center justify-center text-xl", textContent: "👤" }),
        El("div", {}, [
          El("p", { className: "font-bold text-lg text-gray-900", textContent: name }),
          emailEl
        ])
      ])
    );
    listEl.appendChild(
      El("div", { className: "bg-gray-50 p-4 rounded-lg border border-gray-100 mt-4 text-sm" }, [
        El("p", { className: "font-bold text-gray-500 text-xs uppercase mb-1", textContent: "Guest Note" }),
        El("p", { className: "italic text-gray-700", textContent: b.guestNotes || "No notes provided." })
      ])
    );
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

  // Close review modal (cancel button)
  if (reviewCancelBtn) reviewCancelBtn.addEventListener("click", closeReviewModal);

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
