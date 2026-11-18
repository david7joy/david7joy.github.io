/* Renders the journey and the dashboard from window.PORTFOLIO (see content.js). No build step. */
(function () {
  "use strict";
  var data = window.PORTFOLIO || {};
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] == null || attrs[k] === false) return;
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  /* ---------- Snapshot and HUD ---------- */
  var p = data.profile || {};
  $("snapEyebrow").textContent = p.eyebrow || "";
  $("snapLede").textContent = p.lede || "";
  $("footText").textContent = p.footer || "";
  // The headline may mark one phrase for emphasis with *asterisks*.
  String(p.headline || p.name || "").split("*").forEach(function (part, i) {
    $("snapTitle").appendChild(i % 2 ? el("em", { text: part }) : document.createTextNode(part));
  });
  (p.card || []).forEach(function (row) {
    $("idcard").appendChild(el("div", {}, [el("dt", { text: row.label }), el("dd", { text: row.value })]));
  });
  (p.links || []).forEach(function (l) {
    $("hudLinks").appendChild(el("a", { href: l.url, text: l.label, rel: "me noopener", target: "_blank" }));
  });

  /* ---------- Journey ---------- */
  var chapters = data.journey || [];
  var chapterNodes = [];
  var counters = [];

  chapters.forEach(function (c, i) {
    var facts = el("ul", { class: "facts" }, (c.facts || []).map(function (f) {
      var b = el("b", { text: (f.prefix || "") + (typeof f.value === "number" ? f.value.toLocaleString("en-US") : f.value) + (f.suffix || "") });
      if (typeof f.value === "number") counters.push({ node: b, fact: f, done: false, chapter: i });
      return el("li", {}, [b, el("span", { text: f.label })]);
    }));
    var proof = el("div", { class: "proof" }, (c.links || []).map(function (l) {
      return el("a", { href: l.url, target: "_blank", rel: "noopener", text: l.label });
    }));
    var story = el("div", { class: "story" }, [
      el("p", { class: "coords", text: c.coords || "" }),
      el("div", { class: "year", text: String(c.year), "aria-hidden": "true" }),
      el("h2", { text: c.title })
    ].concat((c.body || []).map(function (t) { return el("p", { class: "body", text: t }); }))
     .concat([(c.facts || []).length ? facts : null, (c.links || []).length ? proof : null]));
    var orb = el("div", { class: "orb-wrap", "aria-hidden": "true" }, [
      el("div", { class: "orb" }, [el("span", { class: "orb-label", text: c.world || "" })])
    ]);
    var section = el("section", { class: "chapter", id: "ch-" + i, "aria-label": c.year + ": " + c.title }, [
      el("div", { class: "chapter-inner" }, [story, orb])
    ]);
    section.style.setProperty("--tone", c.tone || "#6ee7f0");
    $("chapters").appendChild(section);
    chapterNodes.push(section);

    $("route").appendChild(el("a", { href: "#ch-" + i, text: String(c.year), "aria-label": c.year + ", " + c.title }));
  });
  $("route").appendChild(el("a", { href: "#library", text: "LIBRARY", "aria-label": "Content library" }));
  var routeLinks = $("route").children;

  function runCounter(c) {
    if (c.done) return;
    c.done = true;
    var f = c.fact, target = f.value;
    if (reduceMotion) return;
    var start = null, dur = 1100;
    function step(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - k, 3);
      var whole = target % 1 === 0;
      var shown = k < 1 ? (whole ? Math.round(target * eased) : (target * eased).toFixed(1)) : target;
      c.node.textContent = (f.prefix || "") + shown.toLocaleString("en-US") + (f.suffix || "");
      if (k < 1) requestAnimationFrame(step);
    }
    c.node.textContent = (f.prefix || "") + "0" + (f.suffix || "");
    requestAnimationFrame(step);
  }

  function reveal(i) {
    chapterNodes[i].classList.add("in");
    counters.forEach(function (c) { if (c.chapter === i) runCounter(c); });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) reveal(chapterNodes.indexOf(e.target));
      });
    }, { threshold: 0.3 });
    chapterNodes.forEach(function (n) { io.observe(n); });
  } else {
    chapterNodes.forEach(function (n, i) { reveal(i); });
  }

  /* HUD year: follows whichever chapter is nearest the middle of the screen. */
  var hudYear = $("hudYear"), hudPlace = $("hudPlace");
  var endYear = p.endYear || new Date().getFullYear();
  var shownYear = endYear;
  var targetYear = shownYear;

  function locate() {
    var mid = window.innerHeight / 2, current = -1;
    chapterNodes.forEach(function (n, i) { if (n.getBoundingClientRect().top <= mid) current = i; });
    var inControl = $("library").getBoundingClientRect().top <= mid;
    if (inControl) { targetYear = endYear; hudPlace.textContent = "Content library"; }
    else if (current >= 0) { targetYear = chapters[current].year; hudPlace.textContent = chapters[current].place || ""; }
    else { targetYear = endYear; hudPlace.textContent = p.place || ""; }
    Array.prototype.forEach.call(routeLinks, function (a, i) {
      var on = inControl ? i === routeLinks.length - 1 : i === current;
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
  }
  function tickYear() {
    if (shownYear !== targetYear) {
      shownYear += shownYear < targetYear ? 1 : -1;
      hudYear.textContent = String(shownYear);
    }
  }
  setInterval(tickYear, reduceMotion ? 1 : 55);
  hudYear.textContent = String(shownYear);

  /* ---------- Starfield: speeds up as you scroll ---------- */
  var canvas = $("sky"), ctx = canvas.getContext && canvas.getContext("2d");
  var stars = [], W = 0, H = 0, dpr = 1, velocity = 0, lastY = window.scrollY, running = true;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.min(420, Math.round(W * H / 3600));
    stars = [];
    for (var i = 0; i < count; i++) stars.push(newStar(true));
    if (reduceMotion) draw(0);
  }
  function newStar(anywhere) {
    return { x: Math.random() * W, y: anywhere ? Math.random() * H : (velocity >= 0 ? H + 4 : -4), z: 0.2 + Math.random() * 0.8, tw: Math.random() * Math.PI * 2 };
  }
  function draw(v) {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    var streak = Math.min(Math.abs(v) * 1.2, 42);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.y -= (0.12 + v * 0.9) * s.z;
      s.tw += 0.02;
      if (s.y < -6 || s.y > H + 6) { stars[i] = s = newStar(false); if (v < 0) s.y = -4; }
      var alpha = (0.35 + 0.65 * s.z) * (0.75 + 0.25 * Math.sin(s.tw));
      ctx.strokeStyle = "rgba(214, 232, 255," + alpha.toFixed(3) + ")";
      ctx.lineWidth = s.z * 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y + (v >= 0 ? 1 : -1) * (0.6 + streak * s.z));
      ctx.stroke();
    }
  }
  function frame() {
    if (!running) return;
    var y = window.scrollY;
    velocity += ((y - lastY) * 0.35 - velocity) * 0.12;
    lastY = y;
    draw(velocity);
    requestAnimationFrame(frame);
  }
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", function () {
    var was = running;
    running = !document.hidden && !reduceMotion;
    if (running && !was) { lastY = window.scrollY; requestAnimationFrame(frame); }
  });
  resize();
  if (reduceMotion) running = false; else requestAnimationFrame(frame);

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { locate(); ticking = false; });
  }, { passive: true });
  locate();

  /* ---------- Mission control ---------- */
  var TYPES = [
    { key: "project", label: "Projects" }, { key: "integration", label: "Integrations" },
    { key: "writing", label: "Writing" }, { key: "video", label: "Video" },
    { key: "podcast", label: "Podcast" }, { key: "talk", label: "Talks" }
  ];
  var TYPE_LABEL = { project: "Project", integration: "Integration", writing: "Writing", video: "Video", podcast: "Podcast", talk: "Talk" };

  (data.stats || []).forEach(function (s) {
    $("stats").appendChild(el("div", { class: "stat" }, [el("b", { text: s.value }), el("span", { text: s.label })]));
  });

  function fmtDate(iso) {
    if (!iso) return "";
    var parts = String(iso).split("-");
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var m = months[Number(parts[1]) - 1];
    return parts.length === 1 || !m ? parts[0] : m + " " + parts[0];
  }

  // Year-only dates sort as mid-year so they are not pushed below every dated item.
  function sortKey(i) { var d = String(i.date || ""); return d.length === 4 ? d + "-07" : d; }
  var items = (data.items || []).slice().sort(function (a, b) {
    if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
    return sortKey(b).localeCompare(sortKey(a));
  });
  /* Board: upcoming talks (by date) and the newest library items. */
  var todayIso = new Date().toISOString().slice(0, 10);
  var talks = (data.items || []).filter(function (i) { return i.type === "talk" && String(i.date || "").length === 10; });
  var upcoming = talks.filter(function (i) { return i.date >= todayIso; }).sort(function (a, b) { return a.date.localeCompare(b.date); });
  var showTalks = upcoming;
  if (!upcoming.length) {
    $("talksTitle").textContent = "Recent talks";
    showTalks = talks.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 2);
  }
  function longDate(iso) {
    var d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  showTalks.slice(0, 3).forEach(function (t) {
    $("talks").appendChild(el("a", { class: "talk", href: t.url, target: "_blank", rel: "noopener" }, [
      el("span", { class: "talk-date", text: longDate(t.date) }),
      el("strong", { text: t.title }),
      el("span", { class: "talk-desc", text: t.description || "" }),
      el("span", { class: "talk-cta", text: upcoming.length ? "Register →" : "Watch →" })
    ]));
  });
  (data.items || []).filter(function (i) { return i.type !== "talk" && i.type !== "project" && String(i.date || "").length === 10; })
    .sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 3).forEach(function (i) {
      $("latest").appendChild(el("a", { class: "latest-item", href: i.url, target: "_blank", rel: "noopener", "data-type": i.type }, [
        el("span", { class: "tag", text: (TYPE_LABEL[i.type] || i.type) + " · " + fmtDate(i.date) }),
        el("strong", { text: i.title })
      ]));
    });
  ((data.library || {}).profiles || []).forEach(function (l) {
    if (l.url) $("profiles").appendChild(el("a", { href: l.url, target: "_blank", rel: "me noopener", text: l.label }));
  });

  var state = { type: "all", q: "" };

  function card(item) {
    var thumbUrl = item.image || (item.youtubeId ? "https://i.ytimg.com/vi/" + item.youtubeId + "/hqdefault.jpg" : null);
    return el("article", { class: "card", "data-type": item.type }, [
      thumbUrl ? el("img", { class: "thumb", src: thumbUrl, alt: "", loading: "lazy" }) : null,
      el("div", { class: "card-body" }, [
        el("span", { class: "tag", text: TYPE_LABEL[item.type] || item.type }),
        el("h3", {}, [item.url
          ? el("a", { href: item.url, target: "_blank", rel: "noopener", text: item.title })
          : document.createTextNode(item.title)]),
        item.description ? el("p", { text: item.description }) : null,
        el("div", { class: "meta" }, [
          item.featured ? el("span", { class: "star", text: "Featured" }) : null,
          item.date ? el("span", { text: fmtDate(item.date) }) : null,
          item.source ? el("span", { text: item.source }) : null,
          item.role ? el("span", { text: item.role }) : null
        ])
      ])
    ]);
  }
  function matches(item) {
    if (state.type !== "all" && item.type !== state.type) return false;
    if (!state.q) return true;
    var hay = [item.title, item.description, item.source, item.role, item.type, TYPE_LABEL[item.type], (item.tags || []).join(" ")].join(" ").toLowerCase();
    return state.q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }
  function render() {
    var grid = $("grid");
    grid.textContent = "";
    var shown = items.filter(matches);
    shown.forEach(function (i) { grid.appendChild(card(i)); });
    $("empty").hidden = shown.length > 0;
    $("count").textContent = shown.length + (shown.length === 1 ? " item" : " items");
    Array.prototype.forEach.call($("filters").children, function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.type === state.type));
    });
  }
  function chip(key, label, n) {
    var b = el("button", { class: "chip", type: "button", "data-type": key, "aria-label": label + ", " + n + (n === 1 ? " item" : " items") }, [
      document.createTextNode(label), el("i", { text: String(n) })
    ]);
    b.addEventListener("click", function () { state.type = key; render(); });
    return b;
  }
  $("filters").appendChild(chip("all", "All", items.length));
  TYPES.forEach(function (t) {
    var n = items.filter(function (i) { return i.type === t.key; }).length;
    if (n) $("filters").appendChild(chip(t.key, t.label, n));
  });
  $("search").addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); render(); });
  render();
})();
