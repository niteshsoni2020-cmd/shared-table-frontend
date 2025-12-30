
// __EXPERIENCE_HARDENED__
// Single-source, defensive experience page logic

(function () {
  function qs(name) {
    try { return new URLSearchParams(window.location.search).get(name); }
    catch (_) { return null; }
  }

  function getToken() {
    try { return localStorage.getItem("token") || ""; }
    catch (_) { return ""; }
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? "";
  }

  function setImg(id, url) {
    const el = document.getElementById(id);
    if (!el) return;
    el.src = url || "https://via.placeholder.com/1200x700?text=No+Image";
    el.onerror = () => {
      el.src = "https://via.placeholder.com/1200x700?text=No+Image";
    };
  }

  function show(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function hide(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  }

  function money(n) {
    return "$" + Number(n || 0).toFixed(2);
  }

  const experienceId = qs("id");
  const content = document.getElementById("experience-content");

  const bookingForm = document.getElementById("booking-form");
  const dateInput = document.getElementById("booking-date");
  const guestInput = document.getElementById("guest-count");
  const submitBtn = document.getElementById("book-btn");
  const termsBox = document.getElementById("booking-terms");

  let exp = null;

  async function loadExperience() {
    if (!experienceId) {
      alert("Missing experience id.");
      location.href = "explore.html";
      return;
    }

    const res = await window.authFetch(`/api/experiences/${experienceId}`, { method: "GET" });
    if (!res.ok) {
      alert("Experience not found.");
      location.href = "explore.html";
      return;
    }

    exp = await res.json();

    setText("exp-title", exp.title);
    setText("exp-city", exp.city || exp.location || "");
    setText("exp-description", exp.description || "");
    setText("exp-price", exp.price);

    setImg("main-image",
      exp.imageUrl ||
      (Array.isArray(exp.images) ? exp.images[0] : null)
    );

    if (exp.menu) {
      setText("exp-menu", exp.menu);
      show("menu-section");
    }

    setText("host-name", exp.host?.name || "Host");
    setImg("host-pic", exp.host?.avatar);

    if (dateInput) {
      const today = new Date().toISOString().slice(0,10);
      dateInput.min = today;
      dateInput.value = today;
    }

    show("experience-content");
  }

  if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!getToken()) {
        location.href = "login.html?returnTo=" + encodeURIComponent(location.pathname + location.search);
        return;
      }

      if (!termsBox.checked) {
        alert("Please accept the cancellation policy.");
        return;
      }

      submitBtn.disabled = true;

      const res = await window.authFetch(`/api/experiences/${experienceId}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingDate: dateInput.value,
          guests: Number(guestInput.value || 1)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data?.message || "Booking failed");
        submitBtn.disabled = false;
        return;
      }

      location.href = data.url || "success.html";
    });
  }

  loadExperience().catch(() => {
    alert("Unable to load experience.");
    location.href = "explore.html";
  });
})();
