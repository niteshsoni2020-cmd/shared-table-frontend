// __EXPERIENCE_HARDENED__
// Single-source, defensive experience page logic (no backend dependency reopen)

(function () {
  function qs(name) {
    try { return new URLSearchParams(window.location.search).get(name); }
    catch (_) { return null; }
  }

  function getToken() {
    try { return (window.getAuthToken && window.getAuthToken())  || ""; }
    catch (_) { return ""; }
  }

  function redirectToLogin() {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    location.href = "login.html?returnTo=" + returnTo;
  }

  async function af(path, opts) {
    // STRICT: single truth must come from common.js
    if (window.authFetch == null) {
      alert("App bootstrap error: common.js not loaded.");
      throw new Error("authFetch missing");
    }
    return window.authFetch(path, opts);
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = (val ?? "");
  }

  function setImg(id, url) {
    const el = document.getElementById(id);
    if (!el) return;
    const fallback = "https://via.placeholder.com/1200x700?text=No+Image";
    el.src = url || fallback;
    el.onerror = () => { el.src = fallback; };
  }

  function show(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function money(n) {
    const num = Number(n || 0);
    return "$" + (Number.isFinite(num) ? num.toFixed(2) : "0.00");
  }

  const experienceId = qs("id");
  const bookingForm = document.getElementById("booking-form");
  const dateInput = document.getElementById("booking-date");
  const guestInput = document.getElementById("guest-count");
  const submitBtn = document.getElementById("book-btn");
  const termsBox = document.getElementById("booking-terms");

  let exp = null;

  function normalizeExperience(payload) {
    if (!payload) return null;
    if (payload.experience) return payload.experience;
    if (payload.data && payload.data.experience) return payload.data.experience;
    return payload;
  }

  async function loadExperience() {
    if (!experienceId) {
      alert("Missing experience id.");
      location.href = "explore.html";
      return;
    }

    const res = await af(`/api/experiences/${experienceId}`, { method: "GET" });

    if (res.status === 401 || res.status === 403) {
      try { localStorage.removeItem("token"); localStorage.removeItem("user"); } catch (_) {}
      return redirectToLogin();
    }
    if (!res.ok) {
      alert("Experience not found.");
      location.href = "explore.html";
      return;
    }

    const raw = await res.json();
    exp = normalizeExperience(raw);
    if (!exp) {
      alert("Experience not found.");
      location.href = "explore.html";
      return;
    }

    setText("exp-title", exp.title || "");
    setText("exp-city", exp.city || exp.location || "");
    setText("exp-description", exp.description || "");
    // keep as-is if backend sends string like "120", otherwise format
    const priceVal = (exp.price != null) ? exp.price : 0;
    setText("exp-price", (typeof priceVal === "number") ? money(priceVal).replace("$","") : String(priceVal));

    setImg(
      "main-image",
      exp.imageUrl || (Array.isArray(exp.images) ? exp.images[0] : null)
    );

    if (exp.menu) {
      setText("exp-menu", exp.menu);
      show("menu-section");
    }

    setText("host-name", (exp.host && exp.host.name) ? exp.host.name : "Host");
    setImg("host-pic", (exp.host && (exp.host.avatar || exp.host.profilePic)) ? (exp.host.avatar || exp.host.profilePic) : "");

    if (dateInput) {
      const today = new Date().toISOString().slice(0, 10);
      dateInput.min = today;
      if (!dateInput.value) dateInput.value = today;
    }

    show("experience-content");
  }

  if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!getToken()) return redirectToLogin();

      if (termsBox && !termsBox.checked) {
        alert("Please accept the cancellation policy.");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await af(`/api/experiences/${experienceId}/book`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingDate: (dateInput && dateInput.value) || "",
            guests: Number((guestInput && guestInput.value) || 1)
          })
        });

        if (res.status === 401 || res.status === 403) {
          try { localStorage.removeItem("token"); localStorage.removeItem("user"); } catch (_) {}
          return redirectToLogin();
        }

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert((data && data.message) || "Booking failed");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        // normalize redirect keys
        const nextUrl =
          (data && (data.url || data.sessionUrl || data.checkoutUrl)) ||
          "success.html";

        location.href = nextUrl;
      } catch (_) {
        alert("Booking failed");
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  loadExperience().catch(() => {
    alert("Unable to load experience.");
    location.href = "explore.html";
  });
})();
