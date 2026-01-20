(function () {
  // Auth guard: redirect to login if not authenticated
  var token = (window.getAuthToken && window.getAuthToken()) || "";
  if (!token) {
    var returnTo = encodeURIComponent(location.pathname + location.search);
    location.href = "login.html?returnTo=" + returnTo;
    return;
  }

  const form = document.getElementById("create-experience-form");
  const titleInput = document.getElementById("title");
  const descriptionInput = document.getElementById("description");
  const priceInput = document.getElementById("price");
  const dateInput = document.getElementById("startDate");
  const timeInput = document.getElementById("startTime");
  const locationInput = document.getElementById("city");
  const imageInput = document.getElementById("imageInput");
  const uploadPreview = document.getElementById("upload-preview");
  const uploadPlaceholder = document.getElementById("upload-placeholder");
  const submitBtn = document.getElementById("submit-btn");

  const CLOUDINARY_URL = (window.CLOUDINARY_URL || "");

  let isEditing = false;
  let editId = null;
  let existingImageUrl = null;

  function ensureInlineNotice() {
    let el = document.getElementById("host-inline-notice");
    if (el) return el;

    if (!form) return null;
    el = window.tstsEl("div", {
      id: "host-inline-notice",
      className: "hidden mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
    }, "");
    form.prepend(el);
    return el;
  }

  function showNotice(kind, msg) {
    const el = ensureInlineNotice();
    if (!el) return;
    el.classList.remove("hidden");
    el.textContent = msg;

    el.classList.remove("border-red-200", "bg-red-50", "text-red-700", "border-green-200", "bg-green-50", "text-green-700", "border-gray-200", "bg-gray-50", "text-gray-700");

    if (kind === "error") el.classList.add("border-red-200", "bg-red-50", "text-red-700");
    else if (kind === "success") el.classList.add("border-green-200", "bg-green-50", "text-green-700");
    else el.classList.add("border-gray-200", "bg-gray-50", "text-gray-700");
  }

  function hideNotice() {
    const el = document.getElementById("host-inline-notice");
    if (el) el.classList.add("hidden");
  }

  function requireAuth() {
    const token = (window.getAuthToken && window.getAuthToken()) || "";
    if (!token) {
      showNotice("error", "Please log in to host an experience.");
      return false;
    }
    return true;
  }

  function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function setPreview(url) {
    if (uploadPreview) uploadPreview.classList.remove("hidden");
    if (uploadPlaceholder) uploadPlaceholder.classList.add("hidden");
    if (uploadPreview) window.tstsSafeImg(uploadPreview, url, "/assets/experience-default.jpg");
  }

  async function getSignature() {
    const res = await window.authFetch("/api/uploads/cloudinary-signature", { method: "POST" });
    if (!res.ok) throw new Error("signature_failed");
    const data = await res.json();
    const need = ["timestamp", "signature", "apiKey", "cloudName", "folder"];
    for (const k of need) {
      if (!data || !data[k]) throw new Error("signature_bad_shape");
    }
    return data;
  }

  async function uploadImage(file) {
    if (!CLOUDINARY_URL) throw new Error("upload_not_configured");

    const sig = await getSignature();

    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", CLOUDINARY_URL, true);
      xhr.onload = () => {
        try {
          const r = JSON.parse(xhr.responseText || "{}");
          const url = r.secure_url || r.url || "";
          if (!url) return reject(new Error("upload_no_url"));
          resolve(url);
        } catch (e) {
          reject(new Error("upload_parse_error"));
        }
      };
      xhr.onerror = () => reject(new Error("upload_network_error"));

      const fd = new FormData();
      fd.append("file", file);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("signature", String(sig.signature));
      fd.append("api_key", String(sig.apiKey));
      fd.append("folder", String(sig.folder));
      xhr.send(fd);
    });
  }

  async function loadEditMode() {
    try {
      const params = new URLSearchParams(location.search || "");
      const id = params.get("edit");
      if (!id) return;

      isEditing = true;
      editId = id;

      const res = await window.authFetch("/api/experiences/" + encodeURIComponent(id), { method: "GET" });
      if (!res.ok) return;

      const payload = await res.json();
      const exp = payload && (payload.experience || payload.data || payload) ? (payload.experience || payload.data || payload) : {};
      existingImageUrl = exp.imageUrl || (Array.isArray(exp.images) ? exp.images[0] : "") || "";

      if (titleInput) titleInput.value = exp.title || "";
      if (descriptionInput) descriptionInput.value = exp.description || "";
      if (priceInput) priceInput.value = exp.price != null ? String(exp.price) : "";
      if (dateInput) dateInput.value = (exp.date || exp.experienceDate || "").slice(0, 10);
      if (timeInput) timeInput.value = exp.time || "";
      if (locationInput) locationInput.value = exp.city || exp.location || "";

      if (existingImageUrl) setPreview(existingImageUrl);

      if (submitBtn) submitBtn.textContent = "Update Experience";
    } catch (_) {}
  }

  if (imageInput) {
    imageInput.addEventListener("change", function () {
      hideNotice();
      try {
        const f = imageInput.files && imageInput.files[0];
        if (!f) return;
        const localUrl = URL.createObjectURL(f);
        setPreview(localUrl);
      } catch (_) {}
    });
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      hideNotice();

      if (!requireAuth()) return;

      if (submitBtn) submitBtn.disabled = true;

      try {
        const title = titleInput ? String(titleInput.value || "").trim() : "";
        const description = descriptionInput ? String(descriptionInput.value || "").trim() : "";
        const price = priceInput ? safeNum(priceInput.value) : null;
        const date = dateInput ? String(dateInput.value || "").trim() : "";
        const time = timeInput ? String(timeInput.value || "").trim() : "";
        const city = locationInput ? String(locationInput.value || "").trim() : "";

        if (!title || !description || price == null || !date || !time || !city) {
          showNotice("error", "Please fill all required fields.");
          return;
        }

        let imageUrl = existingImageUrl || "";

        // If user selected a new image, try upload. If upload fails, do NOT break the entire flow.
        if (imageInput && imageInput.files && imageInput.files.length > 0) {
          const file = imageInput.files[0];
          try {
            showNotice("info", "Uploading image…");
            imageUrl = await uploadImage(file);
            showNotice("success", "Image uploaded.");
          } catch (err) {
            // Accept-and-move-on behavior: keep existing image, allow save to proceed.
            showNotice("error", "Image upload is temporarily unavailable. Your experience will be saved without changing the image.");
            imageUrl = existingImageUrl || "";
          }
        }

        const body = {
          title,
          description,
          price,
          date,
          time,
          city
        };
        if (imageUrl) body.imageUrl = imageUrl;

        const url = isEditing ? ("/api/experiences/" + encodeURIComponent(editId)) : "/api/experiences";
        const method = isEditing ? "PUT" : "POST";

        const res = await window.authFetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          showNotice("error", "Failed to save experience. Please try again.");
          return;
        }

        showNotice("success", isEditing ? "Experience updated." : "Experience created.");
        setTimeout(() => {
          location.href = "my-bookings.html";
        }, 450);
      } catch (_) {
        showNotice("error", "Something went wrong. Please try again.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  loadEditMode();
})();
