(function () {
  const form = document.getElementById("report-form");
  const alertEl = document.getElementById("alert");
  const submitBtn = document.getElementById("submit-btn");

  const targetTypeEl = document.getElementById("targetType");
  const targetIdEl = document.getElementById("targetId");
  const categoryEl = document.getElementById("category");
  const messageEl = document.getElementById("message");

  function token() {
    return (window.getAuthToken && window.getAuthToken()) || "";
  }

  function requireAuth() {
    if (token()) return true;
    const returnTo = encodeURIComponent("report.html");
    location.href = "login.html?returnTo=" + returnTo;
    return false;
  }

  function setAlert(type, msg) {
    if (!alertEl) return;
    alertEl.classList.remove("hidden");
    alertEl.classList.remove("border-red-200", "bg-red-50", "text-red-700");
    alertEl.classList.remove("border-emerald-200", "bg-emerald-50", "text-emerald-700");
    const t = String(type || "error");
    if (t === "success") alertEl.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-700");
    else alertEl.classList.add("border-red-200", "bg-red-50", "text-red-700");
    alertEl.textContent = String(msg || "");
  }

  function fillFromUrl() {
    try {
      const q = new URLSearchParams(location.search);
      const tt = q.get("targetType");
      const tid = q.get("targetId");
      if (tt && targetTypeEl) targetTypeEl.value = String(tt);
      if (tid && targetIdEl) targetIdEl.value = String(tid);
    } catch (_) {}
  }

  async function submit(e) {
    e.preventDefault();
    if (!requireAuth()) return;

    const payload = {
      targetType: targetTypeEl ? String(targetTypeEl.value || "").trim() : "",
      targetId: targetIdEl ? String(targetIdEl.value || "").trim() : "",
      category: categoryEl ? String(categoryEl.value || "").trim() : "",
      message: messageEl ? String(messageEl.value || "").trim() : ""
    };

    if (!payload.targetType || !payload.targetId || !payload.category) {
      setAlert("error", "Please fill the required fields.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }

    try {
      const res = await window.authFetch("/api/moderation/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data && data.message) ? data.message : "Report failed");

      setAlert("success", "Report submitted. Thank you.");
      if (form) form.reset();
    } catch (err) {
      setAlert("error", (err && err.message) ? err.message : "Report failed");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit report";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!requireAuth()) return;
    fillFromUrl();
    if (form) form.addEventListener("submit", submit);
  });
})();
