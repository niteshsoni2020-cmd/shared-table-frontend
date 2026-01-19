(function () {
  function getToken() {
    return (window.getAuthToken && window.getAuthToken()) || "";
  }

  function redirectToLogin() {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    location.href = "login.html?returnTo=" + returnTo;
  }

  function getStoredUser() {
    try { return (window.getAuthUser && window.getAuthUser()) || {}; } catch (_) { return {}; }
  }

  function setStoredUser(nextUser) {
    try {
      const token = getToken();
      if (window.setAuth) window.setAuth(token || "", nextUser || {});
      /* enforced via common.js only */
    } catch (_) {}
  }

  function syncNavAvatar(url) {
    try {
      const img = document.getElementById("nav-user-pic");
      if (img && url) window.tstsSafeImg(img, url, "/assets/avatar-default.svg");
    } catch (_) {}
  }

  const CLOUDINARY_URL = (window.CLOUDINARY_URL || "");

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
  const publicProfileToggle = document.getElementById("public-profile-toggle");
  const handleInput = document.getElementById("handle");
  const allowHandleSearchToggle = document.getElementById("allow-handle-search");
  const shareToFriendsToggle = document.getElementById("share-to-friends");

  function setHostSectionEnabled(enabled) {
    if (!hostPaymentSection) return;
    if (enabled) {
      hostPaymentSection.classList.remove("hidden");
      return;
    }
    hostPaymentSection.classList.add("hidden");
    if (bsbInput) bsbInput.value = "";
    if (accountInput) accountInput.value = "";
    if (vacationToggle) vacationToggle.checked = false;
  }

  async function loadProfile() {
    const token = getToken();
    if (!token) return redirectToLogin();

    try {
      const res = await window.authFetch("/api/auth/me", { method: "GET" });

      if (res.status === 401 || res.status === 403) {
        try {
          if (window.clearAuth) window.clearAuth();
          else { localStorage.removeItem("token"); localStorage.removeItem("user"); }
        } catch (_) {}
        return redirectToLogin();
      }

      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      const user = (data && data.user) ? data.user : data;

      if (nameInput) nameInput.value = user.name || "";
      if (emailInput) emailInput.value = user.email || "";
      if (bioInput) bioInput.value = user.bio || "";
      try { if (publicProfileToggle) publicProfileToggle.checked = !!user.publicProfile; } catch (_) {}
      try { if (handleInput) handleInput.value = user.handle || ""; } catch (_) {}
      try { if (allowHandleSearchToggle) allowHandleSearchToggle.checked = !!user.allowHandleSearch; } catch (_) {}
      try { if (shareToFriendsToggle) shareToFriendsToggle.checked = !!user.showExperiencesToFriends; } catch (_) {}
      if (profilePicPreview && user.profilePic) window.tstsSafeImg(profilePicPreview, user.profilePic, "/assets/avatar-default.svg");

      // keep localStorage user in sync so navbar can reflect it everywhere
      const prev = getStoredUser();
      setStoredUser(Object.assign({}, prev, {
        name: user.name || prev.name,
        email: user.email || prev.email,
        bio: user.bio || prev.bio,
        handle: (typeof user.handle === "string") ? user.handle : prev.handle,
        allowHandleSearch: !!user.allowHandleSearch,
        showExperiencesToFriends: !!user.showExperiencesToFriends,
        publicProfile: !!user.publicProfile,
        profilePic: user.profilePic || prev.profilePic
      }));
      if (user.profilePic) syncNavAvatar(user.profilePic);

      setHostSectionEnabled(!!user.isHost);
    } catch (_) {
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
    try {
      if (publicProfileToggle) updateData.publicProfile = !!publicProfileToggle.checked;
    } catch (_) {}

    try {
      if (handleInput) {
        const raw = String(handleInput.value || "").trim().toLowerCase();
        // allow blank to clear
        if (raw.length === 0) updateData.handle = "";
        else updateData.handle = raw.slice(0, 32);
      }
    } catch (_) {}
    try { if (allowHandleSearchToggle) updateData.allowHandleSearch = !!allowHandleSearchToggle.checked; } catch (_) {}
    try { if (shareToFriendsToggle) updateData.showExperiencesToFriends = !!shareToFriendsToggle.checked; } catch (_) {}
    if (newProfilePicUrl) updateData.profilePic = newProfilePicUrl;

    const res = await window.authFetch("/api/auth/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData)
    });

    if (res.status === 401 || res.status === 403) {
      try {
        if (window.clearAuth) window.clearAuth();
        else { localStorage.removeItem("token"); localStorage.removeItem("user"); }
      } catch (_) {}
      return redirectToLogin();
    }


    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      let msg = "Failed to save settings.";
      try { msg = (data && data.message) || msg; } catch (_) {}
      throw new Error(msg);
    }
    const user = (data && data.user) ? data.user : data;

    // update stored user so navbar + other pages get fresh avatar/name without refresh
    const prev = getStoredUser();
    const merged = Object.assign({}, prev, {
      name: updateData.name || prev.name,
      bio: updateData.bio || prev.bio,
      handle: (typeof updateData.handle === "string") ? updateData.handle : prev.handle,
      allowHandleSearch: (typeof updateData.allowHandleSearch === "undefined") ? prev.allowHandleSearch : !!updateData.allowHandleSearch,
      showExperiencesToFriends: (typeof updateData.showExperiencesToFriends === "undefined") ? prev.showExperiencesToFriends : !!updateData.showExperiencesToFriends,
      publicProfile: (typeof updateData.publicProfile === "undefined") ? prev.publicProfile : !!updateData.publicProfile
    });
    if (user && user.profilePic) merged.profilePic = user.profilePic;
    else if (newProfilePicUrl) merged.profilePic = newProfilePicUrl;

    setStoredUser(merged);
    if (merged.profilePic) syncNavAvatar(merged.profilePic);

    return data;
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
      if (uploadStatus) {
        uploadStatus.textContent = "Click 'Upload & Save' to confirm.";
        uploadStatus.className = "text-xs text-gray-500 mt-1";
      }
    });
  }

  if (uploadBtn) {
    uploadBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) return;

      if (uploadSpinner) uploadSpinner.classList.remove("hidden");
      uploadBtn.disabled = true;

      try {
        if (!CLOUDINARY_URL) throw new Error("Upload not configured");

        // G3: Get signed upload parameters from backend
        const sigRes = await window.authFetch("/api/uploads/cloudinary-signature", { method: "POST" });
        if (!sigRes.ok) throw new Error("Failed to get upload signature");
        const sigData = await sigRes.json();

        const secureUrl = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", CLOUDINARY_URL, true);

          xhr.onload = () => {
            try {
              if (xhr.status < 200 || xhr.status >= 300) return reject(new Error("Image upload failed"));
              const data = JSON.parse(xhr.responseText || "{}");
              if (!data || !data.secure_url) return reject(new Error("Image upload failed"));
              return resolve(data.secure_url);
            } catch (_) {
              return reject(new Error("Image upload failed"));
            }
          };

          xhr.onerror = () => reject(new Error("Image upload failed"));

          const formData = new FormData();
          formData.append("file", file);
          formData.append("timestamp", sigData.timestamp);
          formData.append("signature", sigData.signature);
          formData.append("api_key", sigData.apiKey);
          formData.append("folder", sigData.folder);
          xhr.send(formData);
        });

        await saveProfile(secureUrl);

        if (uploadStatus) {
          uploadStatus.textContent = "Profile picture updated!";
          uploadStatus.className = "text-xs text-green-600 mt-1 font-bold";
        }

        // ensure preview matches final secure URL and nav sync happens even if API returns old shape
        if (profilePicPreview) window.tstsSafeImg(profilePicPreview, secureUrl, "/assets/avatar-default.svg");
        syncNavAvatar(secureUrl);

        uploadBtn.classList.add("hidden");
      } catch (err) {
        if (uploadStatus) {
          uploadStatus.textContent = (err && err.message) || "Upload failed.";
          uploadStatus.className = "text-xs text-red-600 mt-1 font-bold";
        }
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
