// js/success.js
const loadingStateEl = document.getElementById("loading-state");
const successStateEl = document.getElementById("success-state");
const errorStateEl = document.getElementById("error-state");
const errorMessageEl = document.getElementById("error-message");

// Booking summary elements
const successExpImageEl = document.getElementById("success-exp-image");
const successExpTitleEl = document.getElementById("success-exp-title");
const successExpDateEl = document.getElementById("success-exp-date");
const successExpGuestsEl = document.getElementById("success-exp-guests");

// Viral loop elements
const inviteLinkInputEl = document.getElementById("invite-link-input");
const copyInviteBtnEl = document.getElementById("copy-invite-btn");
const copyFeedbackEl = document.getElementById("copy-feedback");

// Parse URL params: bookingId, sessionId, (optionally) experienceId
const urlParams = new URLSearchParams(window.location.search);
const bookingId = urlParams.get("bookingId");
const sessionId = urlParams.get("sessionId");
const experienceIdFromUrl = urlParams.get("experienceId"); // optional

// Token for "my-bookings"
const token = (window.getAuthToken && window.getAuthToken()) || "";

// Utility: show/hide states
function showLoading() {
  loadingStateEl.classList.remove("hidden");
  successStateEl.classList.add("hidden");
  errorStateEl.classList.add("hidden");
}

function showSuccess() {
  loadingStateEl.classList.add("hidden");
  successStateEl.classList.remove("hidden");
  errorStateEl.classList.add("hidden");
}

function showError(message) {
  if (message && errorMessageEl) {
    errorMessageEl.textContent = message;
  }
  loadingStateEl.classList.add("hidden");
  successStateEl.classList.add("hidden");
  errorStateEl.classList.remove("hidden");
}

// Verify payment with backend
async function verifyBooking(bookingId, sessionId) {
  const url = `/api/bookings/verify`;

  const res = await window.authFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      bookingId,
      sessionId
    })
  });

  if (!res.ok) {
    throw new Error("Payment verification failed");
  }

  const data = await res.json();
  // Expecting { status: "confirmed" } or "paid"
  if (data.status !== "confirmed" && data.status !== "paid") {
    throw new Error("Booking not confirmed yet. Status: " + data.status);
  }

  return data;
}

// Get bookings for current user and find matching one
async function fetchBookingDetails(bookingId) {
  if (!token) {
    throw new Error("You need to be logged in to view your booking.");
  }

  const url = `/api/bookings/my-bookings`;

  const res = await window.authFetch(url, {
    method: "GET"
  });

  if (!res.ok) {
    throw new Error("Unable to load your bookings. Please try again.");
  }

  const bookings = await res.json();

  // Find booking by id (schema-safe: booking._id OR booking.bookingId)
  const booking = bookings.find(b => {
    return b._id === bookingId || b.bookingId === bookingId;
  });

  if (!booking) {
    throw new Error("We couldn't find this booking in your account.");
  }

  return booking;
}

// Populate booking card UI
function populateBookingSummary(booking) {
  // Try multiple possible shapes defensively
  const experience = booking.experience || booking.experienceDetails || {};
  const title =
    experience.title ||
    booking.title ||
    "Your shared table experience";

  const dateRaw =
    booking.date ||
    booking.bookingDate ||
    booking.experienceDate ||
    experience.date ||
    null;

  const guestsRaw =
    booking.guests ||
    booking.numGuests ||
    booking.guestCount ||
    null;

  const imageUrl =
    experience.imageUrl ||
    (experience.images && experience.images[0]) ||
    booking.imageUrl ||
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80";

  successExpTitleEl.textContent = title;

  if (dateRaw) {
    try {
      const d = new Date(dateRaw);
      const formatted = d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
      successExpDateEl.textContent = `Date: ${formatted}`;
    } catch (e) {
      successExpDateEl.textContent = `Date: ${dateRaw}`;
    }
  } else {
    successExpDateEl.textContent = "Date: —";
  }

  if (guestsRaw) {
    const guestsNum = Number(guestsRaw);
    if (!Number.isNaN(guestsNum) && guestsNum > 0) {
      successExpGuestsEl.textContent =
        `Guests: ${guestsNum} guest${guestsNum > 1 ? "s" : ""}`;
    } else {
      successExpGuestsEl.textContent = "Guests: —";
    }
  } else {
    successExpGuestsEl.textContent = "Guests: —";
  }

  successExpImageEl.src = imageUrl;
  successExpImageEl.alt = title || "Experience image";

  // Generate viral invite link
  const experienceId =
    experienceIdFromUrl ||
    experience._id ||
    experience.id ||
    booking.experienceId ||
    booking.expId ||
    "";

  generateInviteLink(experienceId, booking);
}

// Generate invite link and update UI
function generateInviteLink(expId, booking) {
  const baseUrl = "https://www.thesharedtablestory.com/experience.html";
  if (!inviteLinkInputEl) return;

  // Try to guess user name from localStorage or booking
  let userName =
    localStorage.getItem("userName") ||
    (booking && booking.userName) ||
    (booking && booking.user && booking.user.name) ||
    "a friend";

  // Normalize for URL param, but keep full text for param (encoded)
  const inviteUrl = expId
    ? `${baseUrl}?id=${encodeURIComponent(expId)}&invitedBy=${encodeURIComponent(userName)}`
    : `${baseUrl}?invitedBy=${encodeURIComponent(userName)}`;

  inviteLinkInputEl.value = inviteUrl;
}

// Copy invite URL to clipboard
async function handleCopyInvite() {
  if (!inviteLinkInputEl) return;
  const link = inviteLinkInputEl.value;
  if (!link) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(link);
    } else {
      // Fallback
      const tempArea = document.createElement("textarea");
      tempArea.value = link;
      document.body.appendChild(tempArea);
      tempArea.select();
      document.execCommand("copy");
      document.body.removeChild(tempArea);
    }

    if (copyFeedbackEl) {
      copyFeedbackEl.classList.remove("hidden");
      setTimeout(() => {
        copyFeedbackEl.classList.add("hidden");
      }, 2500);
    }
  } catch (err) {
    console.error("Failed to copy invite link:", err);
  }
}

// Main init
async function initSuccessPage() {
  // Basic guards
  if (!bookingId || !sessionId) {
    showError("Missing booking information in the link. Please check your email or try again.");
    return;
  }

  showLoading();

  try {
    // 1) Verify with backend
    await verifyBooking(bookingId, sessionId);

    // 2) Get booking details for logged in user
    const booking = await fetchBookingDetails(bookingId);

    // 3) Populate UI
    populateBookingSummary(booking);

    // 4) Show success state
    showSuccess();
  } catch (err) {
    console.error(err);
    showError(err.message || "We couldn’t confirm this booking. Please try again.");
  }
}

// Wire copy button
if (copyInviteBtnEl) {
  copyInviteBtnEl.addEventListener("click", handleCopyInvite);
}

// Run on load
document.addEventListener("DOMContentLoaded", initSuccessPage);
