/* ExcelMovies — site experience engine.
 * Progressive enhancement only: every feature is guarded, nothing here is
 * required for ads or navigation to work. No ad slots are moved, floated
 * or repositioned — ads stay exactly where the HTML puts them. */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- scroll progress bar ---------- */
  var bar = $("#progressBar");
  function paintProgress() {
    if (!bar) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
  }

  /* ---------- header state ---------- */
  var head = $("#siteHead");

  /* ---------- back to top ---------- */
  var toTop = $("#toTop");
  function paintChrome() {
    var y = window.scrollY;
    if (head) head.classList.toggle("is-scrolled", y > 8);
    if (toTop) toTop.classList.toggle("is-visible", y > 620);
    paintProgress();
  }
  window.addEventListener("scroll", function () { window.requestAnimationFrame(paintChrome); }, { passive: true });
  paintChrome();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- mobile menu ---------- */
  var burger = $("#burger");
  var nav = $("#navMenu");
  function closeMenu() {
    if (!burger || !nav) return;
    burger.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
    document.body.classList.remove("no-scroll");
  }
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("no-scroll", open);
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", closeMenu); });
  }

  /* ---------- active nav highlight ---------- */
  (function () {
    if (!nav) return;
    var path = location.pathname.replace(/\.html?$/, "").replace(/\/index$/, "/");
    var map = {
      "/": "home", "/index": "home",
      "/ads": "ads", "/all-ads": "ads",
      "/sponsored": "sponsored", "/click": "sponsored",
      "/tasks": "tasks", "/offerwall": "tasks", "/earn": "tasks",
      "/go": "go", "/premium": "go", "/continue": "go"
    };
    var key = map[path];
    if (!key) return;
    $$("a", nav).forEach(function (a) {
      if (a.getAttribute("data-nav") === key) a.classList.add("is-active");
    });
  })();

  /* ---------- scroll reveals ---------- */
  var revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-revealed");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    revealEls.forEach(function (el, i) {
      el.style.setProperty("--reveal-delay", (Math.min(i % 8, 7) * 60) + "ms");
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-revealed"); });
  }

  /* ---------- search overlay ---------- */
  var overlay = $("#searchOverlay");
  var input = $("#searchInput");
  var results = $("#searchResults");
  var searchBtn = $("#searchBtn");
  var items = [];
  var selected = 0;

  function buildIndex() {
    items = [];
    $$(".tile").forEach(function (t) {
      var strong = t.querySelector(".t-body strong");
      var em = t.querySelector(".t-body em");
      items.push({
        badge: (t.querySelector(".badge") || {}).textContent || "Ad",
        title: strong ? strong.textContent : "Sponsor",
        sub: em ? em.textContent : "",
        el: t
      });
    });
  }

  function render(q) {
    if (!results) return;
    q = (q || "").trim().toLowerCase();
    var hits = items.filter(function (it) {
      return !q || (it.title + " " + it.sub + " " + it.badge).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 8);
    if (!hits.length) {
      results.innerHTML = '<div class="search-empty">No sponsors match "' + q.replace(/[<>&]/g, "") + '" — yet.</div>';
      selected = 0;
      return;
    }
    results.innerHTML = "";
    hits.forEach(function (it, i) {
      var a = document.createElement("a");
      a.className = "search-hit" + (i === selected ? " is-selected" : "");
      a.href = "#";
      a.innerHTML = '<span class="hit-badge">' + it.badge + "</span>" +
        "<span><span>" + it.title + "</span><small>" + it.sub + "</small></span>";
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        closeSearch();
        it.el.scrollIntoView({ behavior: "smooth", block: "center" });
        it.el.style.transition = "box-shadow .4s";
        it.el.style.boxShadow = "0 0 0 3px rgba(247,201,72,.8), 0 20px 60px rgba(229,9,20,.4)";
        setTimeout(function () { it.el.style.boxShadow = ""; }, 1600);
      });
      results.appendChild(a);
    });
  }

  function openSearch() {
    if (!overlay) return;
    buildIndex();
    overlay.hidden = false;
    document.body.classList.add("no-scroll");
    selected = 0;
    input.value = "";
    render("");
    setTimeout(function () { input.focus(); }, 30);
  }
  function closeSearch() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove("no-scroll");
    if (searchBtn) searchBtn.focus();
  }
  function moveSel(delta) {
    var hits = $$(".search-hit", results);
    if (!hits.length) return;
    hits[selected] && hits[selected].classList.remove("is-selected");
    selected = (selected + delta + hits.length) % hits.length;
    hits[selected].classList.add("is-selected");
    hits[selected].scrollIntoView({ block: "nearest" });
  }

  if (overlay) {
    searchBtn && searchBtn.addEventListener("click", openSearch);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeSearch(); });
    input && input.addEventListener("input", function () { selected = 0; render(input.value); });
    document.addEventListener("keydown", function (e) {
      if (overlay.hidden) {
        if (e.key === "/" && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
          e.preventDefault();
          openSearch();
        }
        return;
      }
      if (e.key === "Escape") { closeSearch(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); moveSel(1); }
      if (e.key === "ArrowUp") { e.preventDefault(); moveSel(-1); }
      if (e.key === "Enter") {
        var hit = $$(".search-hit", results)[selected];
        hit && hit.click();
      }
    });
  }
})();
