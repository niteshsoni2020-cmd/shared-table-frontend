(function () {
  const loadingEl = document.getElementById("state-loading");
  const emptyEl = document.getElementById("state-empty");
  const errorEl = document.getElementById("state-error");
  const listEl = document.getElementById("list");
  const retryBtn = document.getElementById("retry-btn");

  function token() {
    return (window.getAuthToken && window.getAuthToken()) || "";
  }

  function requireAuth() {
    if (token()) return true;
    const returnTo = encodeURIComponent("feed.html");
    location.href = "login.html?returnTo=" + returnTo;
    return false;
  }

  function showOnly(which) {
    [loadingEl, emptyEl, errorEl, listEl].forEach((el) => el && el.classList.add("hidden"));
    if (which) which.classList.remove("hidden");
  }

  function renderItem(item) {
    const it = item || {};
    const guest = it.guest || {};
    const exp = it.experience || {};

    const when = window.tstsFormatDateShort ? window.tstsFormatDateShort(it.when) : String(it.when || "");
    const title = exp.title || "Experience";
    const expId = exp._id || exp.id || it.experienceId || "";
    const img = exp.imageUrl || "https://via.placeholder.com/400x250";

    const guestName = guest.name || "Friend";
    const guestId = guest._id || guest.id || "";
    const guestPic = guest.profilePic || "https://via.placeholder.com/40?text=U";
    const handle = guest.handle ? ("@" + guest.handle) : "";

    const row = document.createElement("div");
    row.className = "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden";

    row.innerHTML = `
      <div class="flex flex-col sm:flex-row">
        <a href="experience.html?id=${encodeURIComponent(expId)}" class="sm:w-56 h-40 sm:h-auto bg-gray-100 overflow-hidden">
          <img src="${img}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/400x250?text=No+Image'" />
        </a>
        <div class="flex-1 p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <a href="experience.html?id=${encodeURIComponent(expId)}" class="font-bold text-gray-900 hover:text-orange-600 transition">${title}</a>
              <div class="text-xs text-gray-500 mt-1">${when ? ("Booked: " + when) : ""}</div>
            </div>
            <div class="text-xs text-gray-500">${exp.city || ""}</div>
          </div>

          <div class="mt-4 flex items-center justify-between gap-4">
            <a href="public-profile.html?id=${encodeURIComponent(guestId)}" class="flex items-center gap-3 min-w-0">
              <img src="${guestPic}" class="h-10 w-10 rounded-full border border-gray-100 object-cover" />
              <div class="min-w-0">
                <div class="text-sm font-bold text-gray-900 truncate">${guestName}</div>
                <div class="text-xs text-gray-500 truncate">${handle}</div>
              </div>
            </a>
            <a href="public-profile.html?id=${encodeURIComponent(guestId)}" class="text-sm font-bold text-orange-600 hover:underline">View profile</a>
          </div>
        </div>
      </div>
    `;

    return row;
  }

  async function load() {
    if (!requireAuth()) return;
    showOnly(loadingEl);

    try {
      const res = await window.authFetch("/api/social/feed", { method: "GET" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error("feed");
      const list = Array.isArray(data) ? data : [];

      if (!listEl) return;
      listEl.innerHTML = "";

      if (list.length === 0) {
        showOnly(emptyEl);
        return;
      }

      list.forEach((it) => listEl.appendChild(renderItem(it)));
      showOnly(listEl);
    } catch (_) {
      showOnly(errorEl);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (retryBtn) retryBtn.addEventListener("click", load);
    load();
  });
})();
