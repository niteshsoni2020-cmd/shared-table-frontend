(function () {
  const handleEl = document.getElementById("handle");
  const targetUserIdEl = document.getElementById("targetUserId");
  const connectBtn = document.getElementById("connect-btn");
  const connectStatusEl = document.getElementById("connect-status");

  const reqLoading = document.getElementById("requests-loading");
  const reqEmpty = document.getElementById("requests-empty");
  const reqList = document.getElementById("requests-list");
  const reqRefresh = document.getElementById("refresh-requests");

  const connLoading = document.getElementById("connections-loading");
  const connEmpty = document.getElementById("connections-empty");
  const connList = document.getElementById("connections-list");
  const connRefresh = document.getElementById("refresh-connections");

  function token() {
    return (window.getAuthToken && window.getAuthToken()) || "";
  }

  function requireAuth() {
    if (token()) return true;
    const returnTo = encodeURIComponent("connections.html");
    location.href = "login.html?returnTo=" + returnTo;
    return false;
  }

  function setText(el, msg) {
    if (!el) return;
    el.textContent = String(msg || "");
  }

  function showReq(which) {
    [reqLoading, reqEmpty, reqList].forEach((el) => el && el.classList.add("hidden"));
    if (which) which.classList.remove("hidden");
  }

  function showConn(which) {
    [connLoading, connEmpty, connList].forEach((el) => el && el.classList.add("hidden"));
    if (which) which.classList.remove("hidden");
  }

  function userRow(u) {
    const user = u || {};
    const pic = user.profilePic || "https://via.placeholder.com/40?text=U";
    const name = user.name || "User";
    const handle = user.handle ? ("@" + user.handle) : "";
    const id = user._id || user.id || "";

    return `
      <div class="flex items-center gap-3">
        <img src="${pic}" class="h-10 w-10 rounded-full border border-gray-100 object-cover" />
        <div class="min-w-0">
          <div class="font-bold text-gray-900 truncate">${name}</div>
          <div class="text-xs text-gray-500 truncate">${handle} ${id ? ("• " + id) : ""}</div>
        </div>
      </div>
    `;
  }

  async function post(path) {
    const res = await window.authFetch(path, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.message) ? data.message : "Request failed");
    return data;
  }

  async function loadRequests() {
    if (!requireAuth()) return;
    showReq(reqLoading);

    try {
      const res = await window.authFetch("/api/social/requests", { method: "GET" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error("requests");
      const list = Array.isArray(data) ? data : [];

      if (!reqList) return;
      reqList.innerHTML = "";

      if (list.length === 0) {
        showReq(reqEmpty);
        return;
      }

      list.forEach((r) => {
        const wrap = document.createElement("div");
        wrap.className = "p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between gap-3";
        wrap.innerHTML = `
          ${userRow(r.from)}
          <div class="flex items-center gap-2">
            <button class="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-black" data-action="accept" data-id="${r._id}">Accept</button>
            <button class="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-bold hover:bg-gray-50" data-action="reject" data-id="${r._id}">Reject</button>
            <button class="px-3 py-2 rounded-lg border border-red-200 bg-white text-xs font-bold text-red-600 hover:bg-red-50" data-action="block" data-id="${r._id}">Block</button>
          </div>
        `;
        reqList.appendChild(wrap);
      });

      showReq(reqList);
    } catch (_) {
      if (reqEmpty) {
        reqEmpty.textContent = "Unable to load requests.";
        showReq(reqEmpty);
      }
    }
  }

  async function loadConnections() {
    if (!requireAuth()) return;
    showConn(connLoading);

    try {
      const res = await window.authFetch("/api/social/connections", { method: "GET" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error("connections");
      const list = Array.isArray(data) ? data : [];

      if (!connList) return;
      connList.innerHTML = "";

      if (list.length === 0) {
        showConn(connEmpty);
        return;
      }

      list.forEach((c) => {
        const wrap = document.createElement("div");
        wrap.className = "p-4 rounded-xl border border-gray-100 bg-white flex items-center justify-between gap-3";
        wrap.innerHTML = `
          ${userRow(c.user)}
          <div class="flex items-center gap-2">
            <a class="text-sm font-bold text-orange-600 hover:underline" href="public-profile.html?id=${encodeURIComponent((c.user && (c.user._id || c.user.id)) || "")}">View profile</a>
            <button class="px-3 py-2 rounded-lg border border-red-200 bg-white text-xs font-bold text-red-600 hover:bg-red-50" data-action="remove" data-userid="${(c.user && (c.user._id || c.user.id)) || ""}">Remove</button>
          </div>
        `;
        connList.appendChild(wrap);
      });

      showConn(connList);
    } catch (_) {
      if (connEmpty) {
        connEmpty.textContent = "Unable to load connections.";
        showConn(connEmpty);
      }
    }
  }

  async function connect() {
    if (!requireAuth()) return;

    const handle = handleEl ? String(handleEl.value || "").trim() : "";
    const targetUserId = targetUserIdEl ? String(targetUserIdEl.value || "").trim() : "";

    if (!handle && !targetUserId) {
      setText(connectStatusEl, "Enter a handle or user id.");
      return;
    }

    if (connectBtn) {
      connectBtn.disabled = true;
      connectBtn.textContent = "Sending...";
    }

    setText(connectStatusEl, "");

    try {
      const res = await window.authFetch("/api/social/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: targetUserId || undefined,
          handle: handle || undefined
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data && data.message) ? data.message : "Connect failed");

      const st = String(data.status || "");
      if (st) setText(connectStatusEl, "Status: " + st);
      else setText(connectStatusEl, "Request sent.");

      await loadRequests();
      await loadConnections();
    } catch (e) {
      setText(connectStatusEl, (e && e.message) ? e.message : "Connect failed");
    } finally {
      if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.textContent = "Connect";
      }
    }
  }

  async function onConnectionsClick(e) {
    const btn = e && e.target ? e.target.closest("button[data-action]") : null;
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const userId = btn.getAttribute("data-userid");
    if (!action || !userId) return;

    try {
      if (action === "remove") {
        if (!confirm("Remove this connection?")) return;
        await post("/api/social/connections/" + encodeURIComponent(userId) + "/remove");
        await loadConnections();
      }
    } catch (err) {
      alert((err && err.message) ? err.message : "Action failed");
    }
  }

  async function onRequestsClick(e) {
    const btn = e && e.target ? e.target.closest("button[data-action]") : null;
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (!action || !id) return;

    try {
      if (action === "accept") await post("/api/social/requests/" + encodeURIComponent(id) + "/accept");
      if (action === "reject") await post("/api/social/requests/" + encodeURIComponent(id) + "/reject");
      if (action === "block") {
        if (!confirm("Block this user?")) return;
        await post("/api/social/requests/" + encodeURIComponent(id) + "/block");
      }
      await loadRequests();
      await loadConnections();
    } catch (err) {
      alert((err && err.message) ? err.message : "Action failed");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!requireAuth()) return;

    if (connectBtn) connectBtn.addEventListener("click", connect);
    if (reqRefresh) reqRefresh.addEventListener("click", loadRequests);
    if (connRefresh) connRefresh.addEventListener("click", loadConnections);
    if (reqList) reqList.addEventListener("click", onRequestsClick);
    if (connList) connList.addEventListener("click", onConnectionsClick);

    loadRequests();
    loadConnections();
  });
})();
