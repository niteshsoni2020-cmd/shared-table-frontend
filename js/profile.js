(function () {
  function getToken() {
    return (window.getAuthToken && window.getAuthToken()) || "";
  }

  function redirectToLogin() {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    location.href = "login.html?returnTo=" + returnTo;
  }

  const CLOUDINARY_URL = (window.CLOUDINARY_URL || "");
  const CLOUDINARY_UPLOAD_PRESET = (window.CLOUDINARY_PRESET || "");

  const form = document.getElementById("profile-form");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const bioInput = document.getElementById("bio");
  const profilePicPreview = document.getElementById("profile-pic-preview");
  const fileInput = document.getElementById("file-upload");
  const uploadBtn = document.getElementById("upload-btn");
  const uploadStatus = document.getElementById("upload-status");
  const uploadSpinner = document.getElementById("upload-spinner");

  const hostPaymentSection = document.getElementById("host-payment-section");
  const bsbInput = document.getElementById("bsb");
  const accountInput = document.getElementById("account-number");
  const vacationToggle = document.getElementById("vacation-mode");

  function setHostSectionEnabled(enabled) {
    if (!hostPaymentSection) return;
    if (!enabled) {
      hostPaymentSection.classList.add("hidden");
      if (bsbInput) bsbInput.value = "";
      if (accountInput) accountInput.value = "";
      if (vacationToggle) vacationToggle.checked = false;
    }
  }

  async function loadProfile() {
    const token = getToken();
    if (!token) return redirectToLogin();

    try {
      const res = await window.authFetch("/api/auth/me");
      if (!res.ok) throw new Error("Failed to load profile");
      const user = await res.json();

      if (nameInput) nameInput.value = user.name || "";
      if (emailInput) emailInput.value = user.email || "";
      if (bioInput) bioInput.value = user.bio || "";
      if (profilePicPreview && user.profilePic) profilePicPreview.src = user.profilePic;

      setHostSectionEnabled(false);
    } catch (e) {
      setHostSectionEnabled(false);
    }
  }

  async function saveProfile(newProfilePicUrl) {
    const token = getToken();
    if (!token) return redirectToLogin();

    const updateData = {
      name: (nameInput && nameInput.value) || "",
      bio: (bioInput && bioInput.value) || ""
    };

    if (newProfilePicUrl) updateData.profilePic = newProfilePicUrl;

    const res = await window.authFetch("/api/auth/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData)
    });

    if (!res.ok) {
      let msg = "Failed to save settings.";
      try {
        const data = await res.json();
        msg = data.message || msg;
      } catch (_) {}
      throw new Error(msg);
    }

    return res.json();
  }

  if (!getToken()) {
    redirectToLogin();
    return;
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
  });

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target && e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        if (profilePicPreview) profilePicPreview.src = ev.target.result;
      };
      reader.readAsDataURL(file);

      if (uploadBtn) uploadBtn.classList.remove("hidden");
      if (uploadStatus) uploadStatus.textContent = "Click 'Upload & Save' to confirm.";
    });
  }

  if (uploadBtn) {
    uploadBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) return;

      if (uploadSpinner) uploadSpinner.classList.remove("hidden");
      uploadBtn.disabled = true;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      try {
        if (!CLOUDINARY_URL || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Upload not configured");
        const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        if (!res.ok) throw new Error("Image upload failed");

        const data = await res.json();
        if (!data || !data.secure_url) throw new Error("Image upload failed");

        await saveProfile(data.secure_url);

        if (uploadStatus) {
          uploadStatus.textContent = "Profile picture updated!";
          uploadStatus.className = "text-xs text-green-600 mt-1 font-bold";
        }
        uploadBtn.classList.add("hidden");
      } catch (err) {
        if (uploadStatus) uploadStatus.textContent = (err && err.message) || "Upload failed.";
      } finally {
        if (uploadSpinner) uploadSpinner.classList.add("hidden");
        uploadBtn.disabled = false;
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : "";

      if (btn) {
        btn.textContent = "Saving...";
        btn.disabled = true;
      }

      try {
        await saveProfile();
        alert("Profile settings saved!");
      } catch (err) {
        alert((err && err.message) || "Failed to save settings.");
      } finally {
        if (btn) {
          btn.textContent = originalText || "Save Changes";
          btn.disabled = false;
        }
      }
    });
  }
})();
