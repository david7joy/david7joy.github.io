/* Renders the page from window.PORTFOLIO (see content.js). No build step. */
(function () {
  "use strict";
  var data = window.PORTFOLIO || {};
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };
  var TYPES = [
    { key: "project", label: "Projects" }, { key: "integration", label: "Integrations" },
    { key: "writing", label: "Writing" }, { key: "video", label: "Video" },
    { key: "podcast", label: "Podcast" }, { key: "talk", label: "Talks" }
  ];
  var TYPE_LABEL = { project: "Project", integration: "Integration", writing: "Writing", video: "Video", podcast: "Podcast", talk: "Talk" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  function fmtDate(iso) {
    if (!iso) return "";
    var parts = String(iso).split("-"), m = MONTHS[Number(parts[1]) - 1];
    return parts.length === 1 || !m ? parts[0] : m + " " + parts[0];
  }
  function dayDate(iso) {
    var parts = String(iso).split("-");
    return MONTHS[Number(parts[1]) - 1] + " " + Number(parts[2]) + ", " + parts[0];
  }
  function thumb(item) {
    return item.image || (item.youtubeId ? "https://i.ytimg.com/vi/" + item.youtubeId + "/hqdefault.jpg" : null);
  }
  function fullDated(i) { return String(i.date || "").length === 10; }
  var all = data.items || [];

  /* ---------- Top bar and hero ---------- */
  var p = data.profile || {};
  $("brandName").textContent = p.name || "";
  $("heroEyebrow").textContent = p.eyebrow || "";
  $("heroLede").textContent = p.lede || "";
  $("footText").textContent = p.footer || "";
  // The headline may mark one phrase for emphasis with *asterisks*.
  String(p.headline || p.name || "").split("*").forEach(function (part, i) {
    $("heroTitle").appendChild(i % 2 ? el("em", { text: part }) : document.createTextNode(part));
  });
  (p.links || []).forEach(function (l) {
    $("topLinks").appendChild(el("a", { href: l.url, text: l.label, rel: "me noopener", target: "_blank" }));
  });
  (p.card || []).forEach(function (row) {
    $("idcard").appendChild(el("div", {}, [el("dt", { text: row.label }), el("dd", { text: row.value })]));
  });

  /* ---------- Talk tile: the next upcoming talk, or the most recent one ---------- */
  (function () {
    var todayIso = new Date().toISOString().slice(0, 10);
    var talks = all.filter(function (i) { return i.type === "talk" && fullDated(i); });
    var upcoming = talks.filter(function (i) { return i.date >= todayIso; }).sort(function (a, b) { return a.date.localeCompare(b.date); });
    var isUpcoming = upcoming.length > 0;
    var t = isUpcoming ? upcoming[0] : talks.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0];
    var tile = $("talkTile");
    if (!t) { tile.hidden = true; return; }
    tile.appendChild(el("h2", { class: "tile-label", text: isUpcoming ? "Next talk" : "Latest talk" }));
    tile.appendChild(el("span", { class: "talk-date", text: dayDate(t.date) }));
    tile.appendChild(el("strong", { text: t.title }));
    tile.appendChild(el("p", { text: t.description || "" }));
    if (upcoming.length > 1) tile.appendChild(el("span", { class: "talk-more", text: "+ " + (upcoming.length - 1) + " more coming up" }));
    tile.appendChild(el("a", { class: "btn", href: t.url, target: "_blank", rel: "noopener", text: isUpcoming ? "Register →" : "Watch →" }));
  })();

  /* ---------- Stats (count up once) ---------- */
  (data.stats || []).forEach(function (s) {
    var b = el("b", { text: s.value });
    $("stats").appendChild(el("div", { class: "stat" }, [b, el("span", { text: s.label })]));
    var m = /^(\d+)(\D*)$/.exec(String(s.value));
    if (!m || reduceMotion) return;
    var target = Number(m[1]), suffix = m[2], start = null;
    b.textContent = "0" + suffix;
    requestAnimationFrame(function step(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / 1100);
      b.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
      if (k < 1) requestAnimationFrame(step);
    });
  });

  /* ---------- Media tiles: latest podcast episode and a featured video ---------- */
  function mediaTile(node, label, item) {
    if (!item) { node.hidden = true; return; }
    node.setAttribute("href", item.url);
    var src = thumb(item);
    if (src) node.appendChild(el("img", { src: src, alt: "", loading: "lazy" }));
    node.appendChild(el("div", { class: "media-body" }, [
      el("span", { class: "tile-label", text: label }),
      el("strong", { text: item.title }),
      el("span", { text: [item.description, fmtDate(item.date)].filter(Boolean).join(" · ") })
    ]));
  }
  var newest = function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); };
  var episodes = all.filter(function (i) { return i.type === "podcast" && i.source !== "Cockroach Labs"; }).sort(newest);
  mediaTile($("podcastTile"), "Latest podcast episode", episodes.filter(thumb)[0] || episodes[0]);
  var videos = all.filter(function (i) { return i.type === "video"; });
  mediaTile($("videoTile"), "Featured video", videos.filter(function (v) { return v.featured; })[0] || videos.sort(newest)[0]);

  (data.now || []).forEach(function (n) {
    $("nowList").appendChild(el("li", {}, [el("strong", { text: n.title }), el("span", { text: n.text })]));
  });

  all.filter(function (i) { return (i.type === "writing" || i.type === "integration") && fullDated(i); })
    .sort(newest).slice(0, 4).forEach(function (i) {
      $("latest").appendChild(el("a", { class: "latest-item", href: i.url, target: "_blank", rel: "noopener", "data-type": i.type }, [
        el("span", { class: "tag", text: (TYPE_LABEL[i.type] || i.type) + " · " + fmtDate(i.date) }),
        el("strong", { text: i.title })
      ]));
    });

  /* ---------- Journey: a stepped timeline ---------- */
  var chapters = data.journey || [];
  var current = 0;
  var tabs = chapters.map(function (c, i) {
    var b = el("button", { class: "year-tab", type: "button", role: "tab", id: "year-" + i, "aria-controls": "chapter", text: String(c.year) });
    b.style.setProperty("--tone", c.tone || "");
    b.addEventListener("click", function () { show(i, false); });
    $("years").appendChild(b);
    return b;
  });

  function show(i, focusTab) {
    if (!chapters.length) return;
    current = Math.max(0, Math.min(chapters.length - 1, i));
    var c = chapters[current], panel = $("chapter"), strip = $("years"), tab = tabs[current];
    tabs.forEach(function (t, n) {
      t.setAttribute("aria-selected", String(n === current));
      t.setAttribute("tabindex", n === current ? "0" : "-1");
    });
    if (focusTab) tab.focus({ preventScroll: true });
    // Keep the selected year visible inside the strip without scrolling the page.
    strip.scrollLeft = tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2;
    $("prevBtn").disabled = current === 0;
    $("nextBtn").disabled = current === chapters.length - 1;
    panel.style.setProperty("--tone", c.tone || "");
    panel.setAttribute("aria-labelledby", "year-" + current);
    panel.textContent = "";
    panel.appendChild(el("div", { class: "chapter-side" }, [
      el("span", { class: "chapter-year", text: String(c.year) }),
      el("span", { class: "chapter-place", text: c.place || "" }),
      el("span", { class: "chapter-count", text: (current + 1) + " of " + chapters.length })
    ]));
    var main = el("div", { class: "chapter-main" }, [el("h3", { text: c.title })]
      .concat((c.body || []).map(function (t) { return el("p", { text: t }); })));
    if ((c.facts || []).length) {
      main.appendChild(el("ul", { class: "facts" }, c.facts.map(function (f) {
        var v = typeof f.value === "number" ? f.value.toLocaleString("en-US") : f.value;
        return el("li", {}, [el("b", { text: (f.prefix || "") + v + (f.suffix || "") }), el("span", { text: f.label })]);
      })));
    }
    if ((c.links || []).length) {
      main.appendChild(el("div", { class: "proof" }, c.links.map(function (l) {
        return el("a", { href: l.url, target: "_blank", rel: "noopener", text: l.label });
      })));
    }
    panel.appendChild(main);
  }
  $("prevBtn").addEventListener("click", function () { show(current - 1, false); });
  $("nextBtn").addEventListener("click", function () { show(current + 1, false); });
  $("years").addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { show(current + 1, true); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { show(current - 1, true); e.preventDefault(); }
    else if (e.key === "Home") { show(0, true); e.preventDefault(); }
    else if (e.key === "End") { show(chapters.length - 1, true); e.preventDefault(); }
  });
  show(0, false);

  /* ---------- Library ---------- */
  ((data.library || {}).profiles || []).forEach(function (l) {
    if (l.url) $("profiles").appendChild(el("a", { href: l.url, target: "_blank", rel: "me noopener", text: l.label }));
  });

  // Year-only dates sort as mid-year so they are not pushed below every dated item.
  function sortKey(i) { var d = String(i.date || ""); return d.length === 4 ? d + "-07" : d; }
  var items = all.slice().sort(function (a, b) {
    if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
    return sortKey(b).localeCompare(sortKey(a));
  });
  var state = { type: "all", q: "" };

  function card(item) {
    var src = thumb(item);
    return el("article", { class: "card", "data-type": item.type }, [
      src ? el("img", { class: "thumb", src: src, alt: "", loading: "lazy" }) : null,
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
