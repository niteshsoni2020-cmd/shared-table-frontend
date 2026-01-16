(function () {
  const form = document.getElementById("reset-form");
  const emailEl = document.getElementById("email");
  const tokenEl = document.getElementById("token");
  const newPasswordEl = document.getElementById("newPassword");
  const confirmPasswordEl = document.getElementById("confirmPassword");
  const submitBtn = document.getElementById("submit-btn");
  const alertEl = document.getElementById("alert");

  function setAlert(type, msg) {
    if (!alertEl) return;
    alertEl.classList.remove("hidden");
    alertEl.classList.remove("border-red-200", "bg-red-50", "text-red-700");
    alertEl.classList.remove("border-emerald-200", "bg-emerald-50", "text-emerald-700");
    const t = String(type || "info");
    if (t === "success") {
      alertEl.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-700");
    } else {
      alertEl.classList.add("border-red-200", "bg-red-50", "text-red-700");
    }
    alertEl.textContent = String(msg || "");
  }

  function fillFromUrl() {
    try {
      const q = new URLSearchParams(location.search);
      const email = q.get("email");
      const token = q.get("token");
      if (email && emailEl) emailEl.value = String(email);
      if (token && tokenEl) tokenEl.value = String(token);
    } catch (_) {}
  }

  async function submit(e) {
    e.preventDefault();

    const email = (emailEl && emailEl.value) ? String(emailEl.value).trim() : "";
    const token = (tokenEl && tokenEl.value) ? String(tokenEl.value).trim() : "";
    const newPassword = (newPasswordEl && newPasswordEl.value) ? String(newPasswordEl.value) : "";
    const confirmPassword = (confirmPasswordEl && confirmPasswordEl.value) ? String(confirmPasswordEl.value) : "";

    if (!email || !token || !newPassword || !confirmPassword) {
      setAlert("error", "All fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setAlert("error", "Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlert("error", "Passwords do not match.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Resetting...";
    }

    try {
      const res = await window.authFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAlert("error", (data && data.message) ? data.message : "Password reset failed.");
        return;
      }

      setAlert("success", "Password updated. Redirecting to login...");
      try { if (window.clearAuth) window.clearAuth(); } catch (_) {}
      setTimeout(() => { location.href = "login.html"; }, 900);
    } catch (_) {
      setAlert("error", "Network error. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Reset Password";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    fillFromUrl();
    if (form) form.addEventListener("submit", submit);
  });
})();
