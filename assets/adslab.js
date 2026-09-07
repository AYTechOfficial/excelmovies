/* ExcelMovies — AdsLab integration + Adsterra fallback system.
 *
 * Every AdsLab unit self-checks: if it hasn't filled within GRACE ms, the slot
 * is swapped for an Adsterra banner (same or nearest size), so an ad ALWAYS
 * renders. Rewarded buttons route to the Adsterra smartlink when the AdsLab
 * SDK is absent. If AdsLab starts serving again (domain registered in their
 * dashboard), it simply wins the race and no fallback fires.
 *
 * No server secrets here — public placement IDs only, per the integration spec.
 */
(function () {
  "use strict";

  /* ---------- config (public placement IDs from the spec) ---------- */
  var INT = "int-euZL0Ewr9Fql";
  var REW = "rew-wlWIoORtfsDg";
  var TASK = "task-qhgx1qTcI5gH";
  var SMARTLINK = "https://www.profitableratecpmnetwork.com/rdpxzj6ms4?key=eb56481bdb2b3fd568a2dc96e16e13c6";

  /* How long to wait for an AdsLab banner to fill before swapping to Adsterra. */
  var GRACE = 4000;

  /* ---------- Adsterra fallback per AdsLab size: [wrapper file, w, h] ----------
   * Uses the exact Adsterra format we have wrappers for (nearest size). */
  var ADSTERRA = {
    "728x90":  ["ads/728x90.html", 728, 90],
    "468x60":  ["ads/468x60.html", 468, 60],
    "320x50":  ["ads/320x50.html", 320, 50],
    "320x100": ["ads/320x50.html", 320, 50],
    "300x250": ["ads/300x250.html", 300, 250],
    "336x280": ["ads/300x250.html", 300, 250],
    "160x600": ["ads/160x600.html", 160, 600],
    "300x600": ["ads/160x600.html", 160, 600]
  };

  /* ---------- attribution id (session-stable) ---------- */
  var USER;
  try {
    USER = sessionStorage.getItem("adslab_uid");
    if (!USER) {
      USER = "em-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem("adslab_uid", USER);
    }
  } catch (e) {
    USER = "em-anon";
  }

  /* Config MUST execute before sdk.js loads, or the SDK reads undefined IDs. */
  window.ADSLAB_INT = INT;
  window.ADSLAB_REW = REW;
  window.ADSLAB_USER = USER;

  /* ---------- shared helpers ---------- */
  function adsterraIframe(src, w, h, host) {
    var f = document.createElement("iframe");
    f.src = src;
    f.setAttribute("scrolling", "no");
    f.style.border = "0";
    f.style.display = "block";
    f.style.margin = "0 auto";
    f.style.width = w + "px";
    f.style.height = h + "px";
    f.style.maxWidth = "100%";
    host.appendChild(f);
    return f;
  }

  /* An AdsLab slot counts as filled once the serve script put real content in it. */
  function slotFilled(box) {
    if (box.childElementCount > 0) return true;
    var bg = box.currentStyle ? box.currentStyle.backgroundImage
                              : getComputedStyle(box).backgroundImage;
    if (bg && bg !== "none") return true;
    return box.innerHTML.trim().length > 0;
  }

  /* ---------- SDK triggers: feature-detect both documented API generations ---------- */
  window.emAdslabLive = function () {
    return !!(window.adslabShowInterstitial || window.showint_adslab ||
              window.adslabShowRewarded || window.showrew_adslab);
  };
  window.emShowInterstitial = function () {
    var fn = window.adslabShowInterstitial || window.showint_adslab;
    if (!fn) return Promise.resolve(false);
    try { return Promise.resolve(fn()); } catch (e) { return Promise.resolve(false); }
  };
  window.emShowRewarded = function () {
    var fn = window.adslabShowRewarded || window.showrew_adslab;
    if (!fn) return Promise.resolve(false);
    try { return Promise.resolve(fn()); } catch (e) { return Promise.resolve(false); }
  };

  /* Interstitial on first interaction, max 1 per 60s (spec fraud warning).
   * When AdsLab is down, the Adsterra popunder already covers the first click,
   * so nothing extra fires here. */
  var LAST_INT = "em_lastint";
  window.emFireInterstitial = function () {
    var now = Date.now();
    try {
      if (Number(sessionStorage.getItem(LAST_INT)) > now - 60000) return;
      sessionStorage.setItem(LAST_INT, now);
    } catch (e) { /* storage blocked: fire anyway */ }
    if (window.emAdslabLive()) window.emShowInterstitial();
  };

  /* ---------- banner loader with Adsterra auto-fallback (spec §7) ---------- */
  var SIZES = {
    "728x90": "unit-r4zdvttw8",
    "468x60": "unit-38tbyqp5y",
    "320x50": "unit-52ou5j53t",
    "320x100": "unit-n2cnjps79",
    "300x250": "unit-go1fidksi",
    "336x280": "unit-ii5t4os4x",
    "160x600": "unit-xg5uzzqbx",
    "300x600": "unit-4xxc94u58"
  };
  var mounted = {};
  window.emAdslabUnit = function (size) {
    var unit = SIZES[size];
    if (!unit) return;
    /* Spec §7: "Do not mount the same unit ID twice on one page." */
    if (mounted[unit]) return;
    mounted[unit] = true;

    /* Responsive gating: 728x90 & 468x60 desktop only; 320x50 & 320x100 mobile
     * only — skip registration on the wrong viewport (no invisible impressions). */
    var vw = window.innerWidth || document.documentElement.clientWidth;
    if ((size === "728x90" || size === "468x60") && vw < 728) return;
    if ((size === "320x50" || size === "320x100") && vw >= 728) return;

    var host = document.currentScript && document.currentScript.parentElement;
    var wrap = host || document.body;
    var box = document.createElement("div");
    box.className = "adslab-slot";
    var wh = size.split("x");
    box.style.width = wh[0] + "px";
    box.style.height = wh[1] + "px";
    box.id = "adslab-b-" + unit;
    wrap.appendChild(box);

    /* The fallback system: if AdsLab hasn't filled the slot by GRACE ms, swap
     * in the matching Adsterra banner so no ad box is ever left empty. */
    setTimeout(function () {
      if (slotFilled(box)) return;               /* AdsLab won — keep it. */
      var fb = ADSTERRA[size];
      if (!fb) return;
      var holder = document.createElement("div");
      holder.className = "ad";
      wrap.replaceChild(holder, box);
      adsterraIframe(fb[0], fb[1], fb[2], holder);
    }, GRACE);

    window.adslab_banners = window.adslab_banners || [];
    window.adslab_banners.push({ id: unit, container: box.id });

    if (!document.getElementById("adslab-banner-js")) {
      var s = document.createElement("script");
      s.id = "adslab-banner-js";
      s.src = "https://serve.adslab.me/api/banner/js";
      s.async = true;
      document.head.appendChild(s);
    }
  };

  /* ---------- rewarded buttons: AdsLab rewarded, else Adsterra smartlink ---------- */
  document.addEventListener("click", function (ev) {
    var el = ev.target instanceof Element ? ev.target.closest("[data-em-rew]") : null;
    if (!el) return;
    ev.preventDefault();
    if (window.emAdslabLive()) {
      el.dataset.state = "pending";
      el.textContent = "Reward pending…";
      window.emShowRewarded().then(function () {
        el.dataset.state = "done";
        el.textContent = "Thanks for watching! ↺ Watch again";
      });
    } else {
      /* Never a dead button — click goes straight to the sponsor. */
      window.open(SMARTLINK, "_blank", "noopener");
    }
  });

  /* ---------- interstitial on first interaction ---------- */
  var firedEntry = false;
  function entry() {
    if (firedEntry) return;
    firedEntry = true;
    window.emFireInterstitial();
  }
  ["click", "keydown", "touchstart"].forEach(function (t) {
    document.addEventListener(t, entry, { once: true, passive: true });
  });

  /* ---------- offerwall ---------- */
  window.emTaskUrl = function () {
    return "https://adslab.me/" + TASK + "/" + USER;
  };
  /* Hide an offerwall iframe that rendered nothing (about:blank = blocked),
   * letting the Adsterra content below it take over the space. Cross-origin
   * frames mean it DID load a real page, so they are left alone. */
  window.emOfferwallWatch = function (frame) {
    setTimeout(function () {
      try {
        var doc = frame.contentDocument;
        var body = doc && doc.body;
        if (body && body.childElementCount === 0 && body.innerHTML.trim() === "") {
          frame.style.display = "none";
        }
      } catch (e) { /* cross-origin: loaded fine */ }
    }, GRACE);
  };
})();
