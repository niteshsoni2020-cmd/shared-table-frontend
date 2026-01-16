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
  const timeSlotInput = document.getElementById("time-slot");
  const submitBtn = document.getElementById("book-btn");
  const termsBox = document.getElementById("booking-terms");

  const bookmarkBtn = document.getElementById("bookmark-btn");
  const bookmarkIcon = document.getElementById("bookmark-icon");
  const bookmarkLabel = document.getElementById("bookmark-label");

  const likeBtn = document.getElementById("like-btn");
  const likeIcon = document.getElementById("like-icon");
  const likeCountEl = document.getElementById("like-count");

  const similarSection = document.getElementById("similar-section");
  const similarGrid = document.getElementById("similar-grid");

  const featuredReviewContainer = document.getElementById("featured-review-container");

  const reviewsSection = document.getElementById("reviews-section");
  const reviewsList = document.getElementById("reviews-list");

  const commentsSection = document.getElementById("comments-section");
  const commentsList = document.getElementById("comments-list");
  const commentForm = document.getElementById("comment-form");
  const commentText = document.getElementById("comment-text");
  const commentHint = document.getElementById("comment-hint");

  let exp = null;
  let activePolicyVersion = "";
  const TERMS_VERSION = "tsts_terms_v1";

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

    hydrateTimeSlots(exp);

    if (dateInput) {
      const today = new Date().toISOString().slice(0, 10);
      dateInput.min = today;
      if (!dateInput.value) dateInput.value = today;
    }

    show("experience-content");

    // fire-and-forget secondary panels
    loadPolicyVersion().catch(() => {});
    initBookmarkState().catch(() => {});
    initLikeState().catch(() => {});
    loadReviews().catch(() => {});
    loadSimilar().catch(() => {});
    loadComments().catch(() => {});
  }

  function hydrateTimeSlots(e) {
    if (!timeSlotInput) return;

    const slots = (e && Array.isArray(e.timeSlots) && e.timeSlots.length > 0)
      ? e.timeSlots
      : ["18:00-20:00"];

    timeSlotInput.innerHTML = "";
    for (const s of slots) {
      const opt = document.createElement("option");
      opt.value = String(s);
      opt.textContent = String(s);
      timeSlotInput.appendChild(opt);
    }
  }

  async function loadPolicyVersion() {
    try {
      const res = await af("/api/policy/active", { method: "GET" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.ok !== true) return "";
      const v = String((data.policy && data.policy.version) || "");
      activePolicyVersion = v;
      return v;
    } catch (_) {
      return "";
    }
  }

  function fmtDate(x) {
    try {
      if (window.tstsFormatDateShort) return window.tstsFormatDateShort(x);
    } catch (_) {}
    try {
      const d = new Date(String(x || ""));
      if (isNaN(d.getTime())) return String(x || "");
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return String(x || "");
    }
  }

  function setBookmarkUI(on) {
    if (bookmarkIcon) {
      bookmarkIcon.className = on ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark";
    }
    if (bookmarkLabel) {
      bookmarkLabel.textContent = on ? "Saved" : "Save";
    }
  }

  function setLikeUI(liked, count) {
    if (likeIcon) likeIcon.className = liked ? "fa-solid fa-heart" : "fa-regular fa-heart";
    if (likeCountEl) likeCountEl.textContent = String(Number.isFinite(Number(count)) ? Number(count) : 0);
  }

  async function initBookmarkState() {
    if (!bookmarkBtn) return;
    const t = getToken();
    if (!t) {
      bookmarkBtn.classList.add("hidden");
      return;
    }

    try {
      const res = await af("/api/my/bookmarks/details", { method: "GET" });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      const list = Array.isArray(data) ? data : [];
      const isOn = list.some((x) => String((x && (x._id || x.id)) || "") === String(experienceId));
      setBookmarkUI(isOn);
    } catch (_) {}

    bookmarkBtn.addEventListener("click", async () => {
      try {
        const res = await af("/api/bookmarks/" + encodeURIComponent(experienceId), { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data && data.message) ? data.message : "Failed");
        const msg = String((data && data.message) || "").toLowerCase();
        if (msg.includes("removed")) setBookmarkUI(false);
        else if (msg.includes("added")) setBookmarkUI(true);
      } catch (e) {
        alert((e && e.message) ? e.message : "Bookmark failed");
      }
    });
  }

  async function initLikeState() {
    if (!likeBtn) return;
    const t = getToken();
    if (!t) {
      setLikeUI(false, 0);
      likeBtn.addEventListener("click", () => redirectToLogin());
      return;
    }

    try {
      const res = await af("/api/experiences/" + encodeURIComponent(experienceId) + "/like", { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setLikeUI(!!data.liked, data.count);
    } catch (_) {}

    likeBtn.addEventListener("click", async () => {
      try {
        const res = await af("/api/experiences/" + encodeURIComponent(experienceId) + "/like", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data && data.message) ? data.message : "Like failed");
        setLikeUI(!!data.liked, data.count);
      } catch (e) {
        alert((e && e.message) ? e.message : "Like failed");
      }
    });
  }

  async function loadReviews() {
    if (!reviewsSection || !reviewsList) return;
    try {
      const res = await af("/api/experiences/" + encodeURIComponent(experienceId) + "/reviews", { method: "GET" });
      const data = await res.json().catch(() => null);
      const list = Array.isArray(data) ? data : [];
      if (!res.ok || list.length === 0) return;

      reviewsList.innerHTML = list.slice(0, 8).map((r) => {
        const rating = Math.max(0, Math.min(5, parseInt(r.rating, 10) || 0));
        const when = r.date ? fmtDate(r.date) : "";
        const name = r.authorName || "Guest";
        const comment = (r.comment == null) ? "" : String(r.comment);
        return `
          <div class="bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
            <div class="flex justify-between items-start gap-4">
              <div>
                <div class="font-bold text-slate-900">${name}</div>
                <div class="text-xs text-slate-500">${when}</div>
              </div>
              <div class="text-xs text-yellow-500">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</div>
            </div>
            <p class="text-sm text-slate-700 mt-3 italic">"${comment}"</p>
          </div>
        `;
      }).join("");

      reviewsSection.classList.remove("hidden");

      if (featuredReviewContainer) {
        const top = list[0];
        if (top) {
          const rating = Math.max(0, Math.min(5, parseInt(top.rating, 10) || 0));
          featuredReviewContainer.innerHTML = `
            <p class="text-xs uppercase tracking-[0.18em] text-slate-500 mb-1">Featured review</p>
            <div class="flex items-center justify-between gap-3">
              <p class="font-semibold text-tsts-ink">${top.authorName || "Guest"}</p>
              <p class="text-xs text-yellow-500">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</p>
            </div>
            <p class="text-sm text-slate-700 mt-3 italic">"${String(top.comment || "")}"</p>
          `;
          featuredReviewContainer.classList.remove("hidden");
        }
      }
    } catch (_) {}
  }

  async function loadSimilar() {
    if (!similarGrid || !similarSection) return;
    try {
      const res = await af("/api/experiences/" + encodeURIComponent(experienceId) + "/similar", { method: "GET" });
      const data = await res.json().catch(() => null);
      const list = Array.isArray(data) ? data : [];
      if (!res.ok || list.length === 0) return;

      similarGrid.innerHTML = "";
      list.slice(0, 3).forEach((e) => {
        const id = e._id || e.id || "";
        const img = e.imageUrl || (Array.isArray(e.images) ? e.images[0] : "") || "https://via.placeholder.com/400x300";
        const price = (e.price == null) ? "" : String(e.price);
        const a = document.createElement("a");
        a.href = "experience.html?id=" + encodeURIComponent(id);
        a.className = "group block bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col";
        a.innerHTML = `
          <div class="relative h-40 w-full overflow-hidden bg-gray-100">
            <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.src='https://via.placeholder.com/400?text=No+Image'"/>
            <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">$${price}</div>
          </div>
          <div class="p-4">
            <div class="font-bold text-slate-900 truncate">${e.title || "Experience"}</div>
            <div class="text-xs text-slate-500 mt-1">${e.city || ""}</div>
          </div>
        `;
        similarGrid.appendChild(a);
      });

      similarSection.classList.remove("hidden");
    } catch (_) {}
  }

  async function loadComments() {
    if (!commentsSection || !commentsList) return;
    const t = getToken();
    if (!t) {
      commentsSection.classList.remove("hidden");
      if (commentHint) commentHint.textContent = "Login required to view/post comments.";
      if (commentForm) commentForm.classList.add("hidden");
      return;
    }

    try {
      const res = await af("/api/experiences/" + encodeURIComponent(experienceId) + "/comments", { method: "GET" });
      const data = await res.json().catch(() => null);

      if (res.status === 403) {
        commentsSection.classList.remove("hidden");
        if (commentHint) commentHint.textContent = "Comments are available only to the host and confirmed attendees.";
        if (commentForm) commentForm.classList.add("hidden");
        return;
      }

      const list = Array.isArray(data) ? data : [];
      commentsList.innerHTML = list.map((c) => {
        const a = c.author || {};
        const name = a ? (a.name || "User") : "User";
        const when = c.createdAt ? fmtDate(c.createdAt) : "";
        const text = String(c.text || "");
        return `
          <div class="bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
            <div class="flex justify-between items-start gap-4">
              <div class="font-bold text-slate-900">${name}</div>
              <div class="text-xs text-slate-500">${when}</div>
            </div>
            <p class="text-sm text-slate-700 mt-2">${text}</p>
          </div>
        `;
      }).join("");

      commentsSection.classList.remove("hidden");
      if (commentHint) commentHint.textContent = "";

      if (commentForm) {
        commentForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const txt = String((commentText && commentText.value) ? commentText.value : "").trim();
          if (!txt) return;
          try {
            const res2 = await af("/api/experiences/" + encodeURIComponent(experienceId) + "/comments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: txt })
            });
            const out = await res2.json().catch(() => ({}));
            if (!res2.ok) throw new Error((out && out.message) ? out.message : "Comment failed");
            if (commentText) commentText.value = "";
            loadComments().catch(() => {});
          } catch (err) {
            alert((err && err.message) ? err.message : "Comment failed");
          }
        }, { once: true });
      }
    } catch (_) {
      commentsSection.classList.remove("hidden");
      if (commentHint) commentHint.textContent = "Unable to load comments.";
    }
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
        const policyVer = activePolicyVersion || (await loadPolicyVersion());
        if (!policyVer) {
          alert("Unable to load policy. Please try again.");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        const numGuests = Number((guestInput && guestInput.value) || 1);
        const timeSlot = String((timeSlotInput && timeSlotInput.value) || "").trim();
        const bookingDate = String((dateInput && dateInput.value) || "").trim();

        if (!bookingDate) {
          alert("Please select a date.");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
        if (!timeSlot) {
          alert("Please select a time slot.");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        const res = await af(`/api/experiences/${experienceId}/book`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingDate: bookingDate,
            timeSlot: timeSlot,
            numGuests: numGuests,
            policyVersionAccepted: policyVer,
            termsVersionAccepted: TERMS_VERSION
          })
        });

        if (res.status === 401 || res.status === 403) {
          try { localStorage.removeItem("token"); localStorage.removeItem("user"); } catch (_) {}
          return redirectToLogin();
        }

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = (data && data.message) ? String(data.message) : "Booking failed";
          alert(msg);
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
