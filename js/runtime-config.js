/* Global runtime configuration for static frontend.
   Deployment should overwrite window.__TSTS_RUNTIME_CONFIG__ values using environment variables. */
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

  var apiBase = cleanBase(cfg.API_BASE || cfg.apiBase || readMeta("tsts-api-base"));
if (apiBase && /\/api$/.test(apiBase)) apiBase = apiBase.replace(/\/api$/, "");
if (!apiBase || apiBase.charAt(0) === "/") apiBase = "https://shared-table-api.onrender.com";
  var cloudinaryUrl = cleanUrl(cfg.CLOUDINARY_URL || cfg.cloudinaryUrl || readMeta("tsts-cloudinary-url"));

  window.__TSTS_RUNTIME__ = Object.freeze({
    apiBase: apiBase,
    cloudinaryUrl: cloudinaryUrl
  });
})();
