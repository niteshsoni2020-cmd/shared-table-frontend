// Frontend/js/host.js
// Uses common.js single-truth: window.authFetch, window.getAuthToken

const form = document.getElementById("create-experience-form");
const imageInput = document.getElementById("imageInput");
const uploadPreview = document.getElementById("upload-preview");
const uploadPlaceholder = document.getElementById("upload-placeholder");
const submitBtn = document.getElementById("submit-btn");

// Cloudinary Config (Unsigned)
const CLOUDINARY_URL = (window.CLOUDINARY_URL || "");
const CLOUDINARY_UPLOAD_PRESET = (window.CLOUDINARY_PRESET || "");

let isEditing = false;
let editId = null;

function getToken() {
  return (window.getAuthToken && window.getAuthToken()) || "";
}

document.addEventListener("DOMContentLoaded", () => {
  const token = getToken();
  if (!token) {
    location.href = "login.html?returnTo=" + encodeURIComponent(location.pathname + location.search);
    return;
  }

  const params = new URLSearchParams(location.search);
  const id = params.get("edit");
  if (id) {
    isEditing = true;
    editId = id;
    loadExperienceForEdit(id);
  }
});

// IMAGE PREVIEW HANDLER
if (imageInput) {
  imageInput.addEventListener("change", () => {
    if (imageInput.files && imageInput.files.length > 0) {
      if (uploadPreview) uploadPreview.classList.remove("hidden");
      if (uploadPlaceholder) uploadPlaceholder.classList.add("hidden");
    }
  });
}

async function loadExperienceForEdit(id) {
  if (submitBtn) submitBtn.textContent = "Loading...";

  try {
    // authFetch so it works for protected endpoints too
    const res = await window.authFetch("/api/experiences/" + encodeURIComponent(id), { method: "GET" });
    if (!res.ok) {
      let msg = "Failed to load experience details.";
      try {
        const err = await res.json();
        if (err && err.message) msg = err.message;
      } catch (_) {}
      throw new Error(msg);
    }

    const exp = await res.json();

    const titleEl = document.getElementById("title");
    const cityEl = document.getElementById("city");
    const descEl = document.getElementById("description");
    const priceEl = document.getElementById("price");
    const maxGuestsEl = document.getElementById("maxGuests");
    const daysEl = document.getElementById("availableDays");
    const startEl = document.getElementById("startDate");
    const endEl = document.getElementById("endDate");

    if (titleEl) titleEl.value = exp.title || "";
    if (cityEl) cityEl.value = exp.city || "";
    if (descEl) descEl.value = exp.description || "";
    if (priceEl) priceEl.value = exp.price ?? "";
    if (maxGuestsEl) maxGuestsEl.value = exp.maxGuests ?? "";
    if (daysEl) {
      const ad = Array.isArray(exp.availableDays) ? exp.availableDays : [];
      daysEl.value = ad.join(", ");
    }
    if (startEl) startEl.value = (exp.startDate || "").slice(0, 10);
    if (endEl) endEl.value = (exp.endDate || "").slice(0, 10);

    // Apply tags (CULTURE / FOOD / NATURE)
    if (Array.isArray(exp.tags)) {
      exp.tags.forEach((tag) => {
        const cb = document.querySelector('input[name="tags"][value="' + tag + '"]');
        if (cb) cb.checked = true;
      });
    }

    // Show preview if existing image present
    if (exp.imageUrl || (Array.isArray(exp.images) && exp.images[0])) {
      if (uploadPreview) uploadPreview.classList.remove("hidden");
      if (uploadPlaceholder) uploadPlaceholder.classList.add("hidden");
    }

    if (submitBtn) submitBtn.textContent = "Update Experience";
  } catch (err) {
    alert((err && err.message) ? err.message : "Failed to load experience details.");
    if (submitBtn) submitBtn.textContent = "Update Experience";
  }
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      location.href = "login.html?returnTo=" + encodeURIComponent(location.pathname + location.search);
      return;
    }

    if (submitBtn) {
      submitBtn.textContent = isEditing ? "Updating..." : "Publishing...";
      submitBtn.disabled = true;
    }

    try {
      // 1) IMAGE UPLOAD (only when new file chosen)
      let imageUrl = null;

      if (imageInput && imageInput.files && imageInput.files.length > 0) {
        const file = imageInput.files[0];
        if (!CLOUDINARY_URL || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Upload not configured");
        imageUrl = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", CLOUDINARY_URL, true);

          xhr.onload = () => {
            try {
              if (xhr.status < 200 || xhr.status >= 300) return reject(new Error("Image upload failed."));
              const uploadData = JSON.parse(xhr.responseText || "{}");
              const url = uploadData && uploadData.secure_url ? uploadData.secure_url : null;
              if (!url) return reject(new Error("Image upload failed."));
              return resolve(url);
            } catch (_) {
              return reject(new Error("Image upload failed."));
            }
          };

          xhr.onerror = () => reject(new Error("Image upload failed."));

          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
          xhr.send(formData);
        });
      }

      // 2) COLLECT TAGS
      const selectedTags = [];
      const checkboxes = document.querySelectorAll('input[name="tags"]:checked');
      checkboxes.forEach((cb) => selectedTags.push(cb.value));

      if (!selectedTags.length) {
        throw new Error("Please select at least one Category (Culture, Food, or Nature).");
      }

      // 3) BUILD PAYLOAD WITH VALIDATION
      const title = document.getElementById("title")?.value || "";
      const city = document.getElementById("city")?.value || "";
      const description = document.getElementById("description")?.value || "";
      const price = Number(document.getElementById("price")?.value || 0);
      const maxGuests = Number(document.getElementById("maxGuests")?.value || 0);
      const availableDaysRaw = document.getElementById("availableDays")?.value || "";
      const startDate = document.getElementById("startDate")?.value || "";
      const endDate = document.getElementById("endDate")?.value || "";

      // Required field validation
      if (!title.trim()) throw new Error("Experience title is required");
      if (!city.trim()) throw new Error("City is required");
      if (!description.trim()) throw new Error("Description is required");
      if (!price || price <= 0) throw new Error("Price must be greater than 0");
      if (!maxGuests || maxGuests <= 0) throw new Error("Max guests must be greater than 0");
      if (!startDate) throw new Error("Start date is required");
      if (!endDate) throw new Error("End date is required");
      if (new Date(startDate) > new Date(endDate)) throw new Error("End date must be after start date");

      const experienceData = {
        title,
        tags: selectedTags,
        city,
        description,
        price,
        maxGuests,
        availableDays: availableDaysRaw.split(",").map((s) => s.trim()).filter(Boolean),
        startDate,
        endDate
      };

      if (imageUrl) {
        experienceData.images = [imageUrl];
        experienceData.imageUrl = imageUrl;
      }

      // 4) API REQUEST – CREATE OR UPDATE
      const path = isEditing ? ("/api/experiences/" + encodeURIComponent(editId)) : "/api/experiences";
      const method = isEditing ? "PUT" : "POST";

      const res = await window.authFetch(path, {
        method,
        body: JSON.stringify(experienceData)
      });

      if (!res.ok) {
        let msg = "Failed to save experience";
        try {
          const errData = await res.json();
          if (errData && errData.message) msg = errData.message;
        } catch (_) {}
        throw new Error(msg);
      }

      alert(isEditing ? "Experience Updated!" : "Experience Published!");
      location.href = "explore.html";
    } catch (err) {
      alert((err && err.message) ? err.message : "Failed to save experience.");
      if (submitBtn) {
        submitBtn.textContent = isEditing ? "Update Experience" : "Publish Experience";
        submitBtn.disabled = false;
      }
    }
  });
}

