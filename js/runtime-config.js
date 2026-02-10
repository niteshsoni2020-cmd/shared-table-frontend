/* Global runtime configuration for static frontend.
   In production this should be set explicitly (no secrets) via a build/deploy step. */
(function () {
  var cfg = (window.__TSTS_RUNTIME_CONFIG__ && typeof window.__TSTS_RUNTIME_CONFIG__ === "object")
    ? window.__TSTS_RUNTIME_CONFIG__
    : {};

  function readMeta(name) {
    try {
      var el = document.querySelector('meta[name="' + name + '"]');
      if (!el) return "";
      return String(el.getAttribute("content") || "").trim();
    } catch (_) {
      return "";
    }
  }

  function cleanBase(v) {
    return String(v || "").trim().replace(/\/$/, "");
  }

  function cleanUrl(v) {
    return String(v || "").trim();
  }

  // Allow either window.__TSTS_RUNTIME_CONFIG__ or meta tags to define public runtime endpoints.
  var apiBase = cleanBase(cfg.API_BASE || cfg.apiBase || readMeta("tsts-api-base"));
  if (apiBase && /\/api$/i.test(apiBase)) apiBase = apiBase.replace(/\/api$/i, "");

  // Legacy safety fallback: only apply on the production hostname.
  // This keeps the site functional even if runtime config isn't injected yet.
  if (!apiBase || apiBase.charAt(0) === "/") {
    if (String(location.hostname || "").toLowerCase().endsWith("thesharedtablestory.com")) {
      apiBase = "https://shared-table-api.onrender.com";
    } else {
      apiBase = "";
    }
  }

  var cloudinaryUrl = cleanUrl(cfg.CLOUDINARY_URL || cfg.cloudinaryUrl || readMeta("tsts-cloudinary-url"));

  window.__TSTS_RUNTIME__ = Object.freeze({
    apiBase: apiBase,
    cloudinaryUrl: cloudinaryUrl
  });
})();
