(function () {
  const loadingEl = document.getElementById("state-loading");
  const errorEl = document.getElementById("state-error");
  const emptyEl = document.getElementById("state-empty");
  const gridEl = document.getElementById("grid");
  const retryBtn = document.getElementById("retry-btn");

  function token() {
    return (window.getAuthToken && window.getAuthToken()) || "";
  }

  function showOnly(which) {
    const all = [loadingEl, errorEl, emptyEl, gridEl];
    all.forEach((el) => { if (el) el.classList.add("hidden"); });
    if (which && which.classList) which.classList.remove("hidden");
  }

  function card(exp) {
    const e = exp || {};
    const img = e.imageUrl || (Array.isArray(e.images) ? e.images[0] : "") || "https://via.placeholder.com/400x300";
    const price = (e.price == null) ? "" : String(e.price);
    const id = e._id || e.id || "";

    const a = document.createElement("a");
    a.href = `experience.html?id=${encodeURIComponent(id)}`;
    a.className = "group block bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col";
    a.innerHTML = `
      <div class="relative h-48 w-full overflow-hidden bg-gray-100">
        <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.src='https://via.placeholder.com/400?text=No+Image'"/>
        <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">$${price}</div>
      </div>
      <div class="p-4 flex flex-col gap-2 flex-grow">
        <h3 class="font-bold text-gray-900 mb-1 truncate">${e.title || "Untitled"}</h3>
        <p class="text-xs text-gray-500 flex items-center gap-1"><i class="fas fa-map-marker-alt text-orange-500"></i> ${e.city || ""}</p>
        <div class="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
          <span class="text-xs text-gray-500">Saved</span>
          <span class="text-xs text-orange-600 font-semibold group-hover:underline">View →</span>
        </div>
      </div>
    `;
    return a;
  }

  async function load() {
    if (!token()) {
      const returnTo = encodeURIComponent("bookmarks.html");
      location.href = "login.html?returnTo=" + returnTo;
      return;
    }

    showOnly(loadingEl);

    try {
      const res = await window.authFetch("/api/my/bookmarks/details", { method: "GET" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error("load_failed");

      const list = Array.isArray(data) ? data : (data && Array.isArray(data.experiences) ? data.experiences : []);

      if (!gridEl) return;
      gridEl.innerHTML = "";

      if (!list || list.length === 0) {
        showOnly(emptyEl);
        return;
      }

      list.forEach((e) => gridEl.appendChild(card(e)));
      showOnly(gridEl);
    } catch (_) {
      showOnly(errorEl);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (retryBtn) retryBtn.addEventListener("click", load);
    load();
  });
})();
