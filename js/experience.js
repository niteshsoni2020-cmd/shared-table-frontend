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
      window.tstsNotify("App bootstrap error: common.js not loaded.", "error");
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
    const fallback = "/assets/experience-default.jpg";
    window.tstsSafeImg(el, url, fallback);
  }

  function show(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function money(n) {
    const num = Number(n || 0);
    return "$" + (Number.isFinite(num) ? num.toFixed(2) : "0.00");
  }

  function showNotFound(msg) {
    const content = document.getElementById("experience-content");
    const empty = document.getElementById("experience-not-found");
    const text = document.getElementById("experience-not-found-text");
    if (content) content.classList.add("hidden");
    if (text) text.textContent = String(msg || "This experience is unavailable or may have been removed.");
    if (empty) empty.classList.remove("hidden");
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
      showNotFound("This experience link is invalid. Please open a valid experience from Explore.");
      return;
    }

    const res = await af(`/api/experiences/${experienceId}`, { method: "GET" });

    if (res.status === 401 || res.status === 403) {
      try { localStorage.removeItem("token"); localStorage.removeItem("user"); } catch (_) {}
      return redirectToLogin();
    }
    if (!res.ok) {
      showNotFound("This experience is unavailable or no longer exists.");
      return;
    }

    const raw = await res.json();
    exp = normalizeExperience(raw);
    if (!exp) {
      showNotFound("This experience could not be loaded.");
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

    timeSlotInput.textContent = "";
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
        window.tstsNotify((e && e.message) ? e.message : "Bookmark failed", "error");
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
        window.tstsNotify((e && e.message) ? e.message : "Like failed", "error");
      }
    });
  }

  function buildReviewCard(r) {
    const El = window.tstsEl;
    const rating = Math.max(0, Math.min(5, parseInt(r.rating, 10) || 0));
    const when = r.date ? fmtDate(r.date) : "";
    const name = r.authorName || "Guest";
    const comment = (r.comment == null) ? "" : String(r.comment);

    return El("div", { className: "bg-slate-50/70 border border-slate-200 rounded-2xl p-4" }, [
      El("div", { className: "flex justify-between items-start gap-4" }, [
        El("div", {}, [
          El("div", { className: "font-bold text-slate-900", textContent: name }),
          El("div", { className: "text-xs text-slate-500", textContent: when })
        ]),
        El("div", { className: "text-xs text-yellow-500", textContent: "★".repeat(rating) + "☆".repeat(5 - rating) })
      ]),
      El("p", { className: "text-sm text-slate-700 mt-3 italic", textContent: '"' + comment + '"' })
    ]);
  }

  async function loadReviews() {
    if (!reviewsSection || !reviewsList) return;
    try {
      const res = await af("/api/experiences/" + encodeURIComponent(experienceId) + "/reviews", { method: "GET" });
      const data = await res.json().catch(() => null);
      const list = Array.isArray(data) ? data : [];
      if (!res.ok || list.length === 0) return;

      reviewsList.textContent = "";
      list.slice(0, 8).forEach(function(r) {
        reviewsList.appendChild(buildReviewCard(r));
      });

      reviewsSection.classList.remove("hidden");

      if (featuredReviewContainer) {
        const top = list[0];
        if (top) {
          const El = window.tstsEl;
          const rating = Math.max(0, Math.min(5, parseInt(top.rating, 10) || 0));
          featuredReviewContainer.textContent = "";
          featuredReviewContainer.appendChild(
            El("div", {}, [
              El("p", { className: "text-xs uppercase tracking-[0.18em] text-slate-500 mb-1", textContent: "Featured review" }),
              El("div", { className: "flex items-center justify-between gap-3" }, [
                El("p", { className: "font-semibold text-tsts-ink", textContent: top.authorName || "Guest" }),
                El("p", { className: "text-xs text-yellow-500", textContent: "★".repeat(rating) + "☆".repeat(5 - rating) })
              ]),
              El("p", { className: "text-sm text-slate-700 mt-3 italic", textContent: '"' + String(top.comment || "") + '"' })
            ])
          );
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

      const El = window.tstsEl;
      const safeUrl = window.tstsSafeUrl;
      const fallbackImg = "/assets/experience-default.jpg";

      similarGrid.textContent = "";
      list.slice(0, 3).forEach(function(e) {
        const id = e._id || e.id || "";
        const imgUrl = safeUrl(e.imageUrl || (Array.isArray(e.images) ? e.images[0] : ""), fallbackImg);
        const price = (e.price == null) ? "" : String(e.price);

        var imgEl = El("img", { className: "w-full h-full object-cover group-hover:scale-105 transition duration-500" });
        window.tstsSafeImg(imgEl, imgUrl, fallbackImg);

        var a = El("a", { href: "experience.html?id=" + encodeURIComponent(id), className: "group block bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col" }, [
          El("div", { className: "relative h-40 w-full overflow-hidden bg-gray-100" }, [
            imgEl,
            El("div", { className: "absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm", textContent: "$" + price })
          ]),
          El("div", { className: "p-4" }, [
            El("div", { className: "font-bold text-slate-900 truncate", textContent: e.title || "Experience" }),
            El("div", { className: "text-xs text-slate-500 mt-1", textContent: e.city || "" })
          ])
        ]);
        similarGrid.appendChild(a);
      });

      similarSection.classList.remove("hidden");
    } catch (_) {}
  }

  function buildCommentCard(c) {
    const El = window.tstsEl;
    const a = c.author || {};
    const name = a ? (a.name || "User") : "User";
    const when = c.createdAt ? fmtDate(c.createdAt) : "";
    const text = String(c.text || "");

    return El("div", { className: "bg-slate-50/70 border border-slate-200 rounded-2xl p-4" }, [
      El("div", { className: "flex justify-between items-start gap-4" }, [
        El("div", { className: "font-bold text-slate-900", textContent: name }),
        El("div", { className: "text-xs text-slate-500", textContent: when })
      ]),
      El("p", { className: "text-sm text-slate-700 mt-2", textContent: text })
    ]);
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
      commentsList.textContent = "";
      list.forEach(function(c) {
        commentsList.appendChild(buildCommentCard(c));
      });

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
            window.tstsNotify((err && err.message) ? err.message : "Comment failed", "error");
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
        window.tstsNotify("Please accept the cancellation policy.", "warning");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      try {
        const policyVer = activePolicyVersion || (await loadPolicyVersion());
        if (!policyVer) {
          window.tstsNotify("Unable to load policy. Please try again.", "error");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        const numGuests = Number((guestInput && guestInput.value) || 1);
        const timeSlot = String((timeSlotInput && timeSlotInput.value) || "").trim();
        const bookingDate = String((dateInput && dateInput.value) || "").trim();

        if (!bookingDate) {
          window.tstsNotify("Please select a date.", "warning");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
        if (!timeSlot) {
          window.tstsNotify("Please select a time slot.", "warning");
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
          window.tstsNotify(msg, "error");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        if (data && data.url) {
          location.href = data.url;
        } else {
          location.href = "success.html";
        }
      } catch (_) {
        window.tstsNotify("Booking failed", "error");
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }


  loadExperience().catch(() => {
    showNotFound("We could not load this experience right now. Please try again.");
  });
})();
