/*
  Content library: renders the items in content.js (window.PORTFOLIO.items) as a
  searchable, filterable view. Load after content.js.

  window.StudioLibrary.mount(el, section)  section: "work" | "podcast" | "writing" | "talks" ("all" also works)
  window.StudioLibrary.counts()            -> { work, podcast, writing, talks }
  window.StudioLibrary.latest(n)           -> newest n items, each a copy with a `section` key
*/
(function () {
  'use strict';

  var SECTIONS = {
    work: {
      types: ['project', 'integration'], layout: 'grid', noun: ['item', 'items'],
      searchLabel: 'Search projects and integrations', restLabel: 'More work',
      chips: [['all', 'All'], ['project', 'Projects'], ['integration', 'Integrations']]
    },
    podcast: {
      types: ['podcast'], layout: 'list', noun: ['entry', 'entries'],
      searchLabel: 'Search episodes and guests', restLabel: 'Episodes', chips: null
    },
    writing: {
      types: ['writing'], layout: 'list', noun: ['post', 'posts'],
      searchLabel: 'Search writing', restLabel: 'More writing', chips: null
    },
    talks: {
      types: ['talk', 'video'], layout: 'grid', noun: ['item', 'items'],
      searchLabel: 'Search talks and videos', restLabel: 'More talks and videos',
      chips: [['all', 'All'], ['talk', 'Talks'], ['video', 'Videos']]
    },
    all: {
      types: ['project', 'integration', 'writing', 'podcast', 'talk', 'video'], layout: 'grid', noun: ['item', 'items'],
      searchLabel: 'Search everything', restLabel: 'Everything else',
      chips: [['all', 'All'], ['project', 'Projects'], ['integration', 'Integrations'], ['writing', 'Writing'],
        ['podcast', 'Podcast'], ['talk', 'Talks'], ['video', 'Videos']]
    }
  };
  var PUBLIC_SECTIONS = ['work', 'podcast', 'writing', 'talks'];
  var TYPE_LABEL = { project: 'Project', integration: 'Integration', writing: 'Writing', podcast: 'Episode', video: 'Video', talk: 'Talk' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var HIDDEN_TAGS = { upcoming: 1, show: 1 };
  var MAX_TAG_CHIPS = 6;
  var uid = 0;

  /* ---------- data ---------- */

  function allItems() {
    var p = window.PORTFOLIO;
    return p && Array.isArray(p.items) ? p.items : [];
  }

  function sectionOf(item) {
    for (var i = 0; i < PUBLIC_SECTIONS.length; i++) {
      if (SECTIONS[PUBLIC_SECTIONS[i]].types.indexOf(item.type) !== -1) return PUBLIC_SECTIONS[i];
    }
    return null;
  }

  function parseDate(s) {
    var m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(s || ''));
    if (!m) return null;
    return { y: +m[1], m: m[2] ? +m[2] : 0, d: m[3] ? +m[3] : 0 };
  }

  function dateKey(item) {
    var d = parseDate(item.date);
    return d ? d.y * 10000 + d.m * 100 + d.d : 0;
  }

  function formatDate(s) {
    var d = parseDate(s);
    if (!d) return '';
    if (!d.m || d.m > 12) return String(d.y);
    if (!d.d) return MONTHS[d.m - 1] + ' ' + d.y;
    return MONTHS[d.m - 1] + ' ' + d.d + ', ' + d.y;
  }

  function todayString() {
    var n = new Date();
    var mm = n.getMonth() + 1, dd = n.getDate();
    return n.getFullYear() + '-' + (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd;
  }

  /* A talk is upcoming when its date is after today (compared at the date's own precision). */
  function isUpcoming(item, today) {
    if (item.type !== 'talk' || !parseDate(item.date)) return false;
    var d = String(item.date);
    return d > (today || todayString()).slice(0, d.length);
  }

  /* Upcoming talks first (soonest first), then newest first; ties keep content.js order. */
  function sortItems(items) {
    var today = todayString();
    return items
      .map(function (it, i) { return { it: it, i: i, up: isUpcoming(it, today), k: dateKey(it) }; })
      .sort(function (a, b) {
        if (a.up !== b.up) return a.up ? -1 : 1;
        if (a.k !== b.k) return a.up ? a.k - b.k : b.k - a.k;
        return a.i - b.i;
      })
      .map(function (x) { return x.it; });
  }

  function itemsFor(section) {
    var types = SECTIONS[section].types;
    return sortItems(allItems().filter(function (it) { return it && types.indexOf(it.type) !== -1; }));
  }

  function tagsOf(item) {
    return Array.isArray(item.tags) ? item.tags : [];
  }

  function haystack(item) {
    return [item.title, item.description, item.source, item.role, TYPE_LABEL[item.type] || item.type, tagsOf(item).join(' ')]
      .join(' ').toLowerCase();
  }

  function filterItems(items, state) {
    var terms = String(state.q || '').toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter(function (it) {
      if (state.type && state.type !== 'all' && it.type !== state.type) return false;
      if (state.tag && tagsOf(it).indexOf(state.tag) === -1) return false;
      if (!terms.length) return true;
      var h = haystack(it);
      return terms.every(function (t) { return h.indexOf(t) !== -1; });
    });
  }

  /* Most common tags in a section: used by 2+ items, tags covering identical items collapsed. */
  function topTags(items) {
    var map = {};
    items.forEach(function (it, i) {
      tagsOf(it).forEach(function (t) {
        if (HIDDEN_TAGS[t]) return;
        (map[t] = map[t] || []).push(i);
      });
    });
    var seen = {};
    return Object.keys(map)
      .map(function (t) { return { tag: t, count: map[t].length, sig: map[t].join(',') }; })
      .filter(function (t) { return t.count >= 2 && t.count < items.length; })
      .sort(function (a, b) { return b.count - a.count || (a.tag < b.tag ? -1 : 1); })
      .filter(function (t) { if (seen[t.sig]) return false; seen[t.sig] = 1; return true; })
      .slice(0, MAX_TAG_CHIPS);
  }

  function safeUrl(u, allowRelative) {
    u = String(u || '').trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (allowRelative && u && !/^[a-z][a-z0-9+.-]*:/i.test(u) && u.slice(0, 2) !== '//') return u;
    return '';
  }

  function thumbFor(item) {
    var explicit = safeUrl(item.thumbnail || item.image, true);
    if (explicit) return explicit;
    if (item.youtubeId && /^[\w-]{6,20}$/.test(item.youtubeId)) {
      return 'https://i.ytimg.com/vi/' + item.youtubeId + '/hqdefault.jpg';
    }
    return '';
  }

  /* ---------- DOM helpers ---------- */

  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function typeLabel(item) {
    if (item.type === 'podcast' && tagsOf(item).indexOf('show') !== -1) return 'Podcast';
    return TYPE_LABEL[item.type] || String(item.type || '');
  }

  function buildMeta(item, featured) {
    var meta = h('div', 'lib-meta');
    if (isUpcoming(item)) meta.appendChild(h('span', 'lib-badge', 'Upcoming'));
    else if (featured) meta.appendChild(h('span', 'lib-flag', 'Featured'));
    meta.appendChild(h('span', 'lib-type', typeLabel(item)));
    var label = formatDate(item.date);
    if (label) {
      var t = h('time', 'lib-date', label);
      t.setAttribute('datetime', String(item.date));
      meta.appendChild(t);
    }
    return meta;
  }

  function buildMedia(item, host) {
    var src = thumbFor(item);
    if (!src) return null;
    var box = h('div', 'lib-media' + (item.youtubeId ? ' lib-media--play' : ''));
    var img = h('img', 'lib-img');
    img.setAttribute('alt', '');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.setAttribute('width', '480');
    img.setAttribute('height', '270');
    var drop = function () {
      if (box.parentNode) box.parentNode.removeChild(box);
      host.className = host.className.replace(' lib-has-media', '');
    };
    img.addEventListener('error', drop);
    /* YouTube answers a missing thumbnail with a 120px grey placeholder rather than an error. */
    img.addEventListener('load', function () {
      if (item.youtubeId && img.naturalWidth && img.naturalWidth <= 120) drop();
    });
    img.setAttribute('src', src);
    box.appendChild(img);
    host.className += ' lib-has-media';
    return box;
  }

  function buildTitle(item, cls) {
    var title = h('h3', cls, item.title || '');
    title.appendChild(h('span', 'lib-sr', ' (opens in a new tab)'));
    return title;
  }

  function buildFoot(item) {
    var foot = h('div', 'lib-foot');
    var by = [item.source, item.role].filter(Boolean).join(' · ');
    foot.appendChild(h('span', 'lib-source', by));
    var go = h('span', 'lib-go', '↗');
    go.setAttribute('aria-hidden', 'true');
    foot.appendChild(go);
    return foot;
  }

  function linkShell(item, cls) {
    var url = safeUrl(item.url);
    var a = h(url ? 'a' : 'div', cls);
    if (url) {
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
    return a;
  }

  function buildCard(item, featured) {
    var a = linkShell(item, 'lib-card' + (featured ? ' lib-card--featured' : '') + (isUpcoming(item) ? ' lib-card--upcoming' : ''));
    var media = buildMedia(item, a);
    if (media) a.appendChild(media);
    var body = h('div', 'lib-card-body');
    body.appendChild(buildMeta(item, featured));
    body.appendChild(buildTitle(item, 'lib-title'));
    if (item.description) body.appendChild(h('p', 'lib-desc', item.description));
    var tags = tagsOf(item).filter(function (t) { return !HIDDEN_TAGS[t]; }).slice(0, 4);
    if (tags.length) body.appendChild(h('p', 'lib-tags', tags.join(' · ')));
    body.appendChild(buildFoot(item));
    a.appendChild(body);
    return a;
  }

  function buildRow(item) {
    var a = linkShell(item, 'lib-row' + (isUpcoming(item) ? ' lib-row--upcoming' : ''));
    a.appendChild(buildMeta(item, false));
    var body = h('div', 'lib-row-body');
    body.appendChild(buildTitle(item, 'lib-title'));
    if (item.description) body.appendChild(h('p', 'lib-desc', item.description));
    var by = [item.source, item.role].filter(Boolean).join(' · ');
    if (by) body.appendChild(h('p', 'lib-source', by));
    a.appendChild(body);
    var media = buildMedia(item, a);
    if (media) a.appendChild(media);
    var go = h('span', 'lib-go', '↗');
    go.setAttribute('aria-hidden', 'true');
    a.appendChild(go);
    return a;
  }

  function buildCollection(items, layout, featured) {
    var list = h('ul', layout === 'list' && !featured ? 'lib-list' : 'lib-grid' + (featured ? ' lib-grid--featured' : ''));
    list.setAttribute('role', 'list');
    items.forEach(function (it) {
      var li = h('li', 'lib-cell');
      li.appendChild(layout === 'list' && !featured ? buildRow(it) : buildCard(it, featured));
      list.appendChild(li);
    });
    return list;
  }

  function buildChip(label, count) {
    var b = h('button', 'lib-chip');
    b.setAttribute('type', 'button');
    b.setAttribute('aria-pressed', 'false');
    b.appendChild(h('span', 'lib-chip-label', label));
    b.appendChild(h('span', 'lib-chip-count', String(count)));
    return b;
  }

  /* ---------- mount ---------- */

  function mount(el, section) {
    if (!el) return null;
    if (!SECTIONS[section]) section = 'work';
    var cfg = SECTIONS[section];
    var items = itemsFor(section);
    var state = { type: 'all', tag: null, q: '' };
    var id = 'lib-' + (++uid);

    clear(el);
    var root = h('div', 'lib lib--' + section + ' lib--' + cfg.layout);
    root.setAttribute('data-section', section);

    /* toolbar: search + count */
    var bar = h('div', 'lib-bar');
    var field = h('div', 'lib-search');
    var label = h('label', 'lib-sr', cfg.searchLabel);
    label.setAttribute('for', id + '-q');
    var input = h('input', 'lib-input');
    input.setAttribute('type', 'search');
    input.setAttribute('id', id + '-q');
    input.setAttribute('placeholder', cfg.searchLabel);
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('enterkeyhint', 'search');
    field.appendChild(label);
    field.appendChild(input);
    var count = h('p', 'lib-count');
    count.setAttribute('role', 'status');
    count.setAttribute('aria-live', 'polite');
    bar.appendChild(field);
    bar.appendChild(count);
    root.appendChild(bar);

    /* chips */
    var typeChips = [], tagChips = [];
    var chipBar = h('div', 'lib-filters');
    if (cfg.chips) {
      var typeGroup = h('div', 'lib-chips');
      typeGroup.setAttribute('role', 'group');
      typeGroup.setAttribute('aria-label', 'Filter by type');
      cfg.chips.forEach(function (c) {
        var n = c[0] === 'all' ? items.length : items.filter(function (it) { return it.type === c[0]; }).length;
        if (!n) return;
        var b = buildChip(c[1], n);
        b.addEventListener('click', function () { state.type = c[0]; render(); });
        typeChips.push({ key: c[0], node: b });
        typeGroup.appendChild(b);
      });
      if (typeChips.length > 2) chipBar.appendChild(typeGroup); else typeChips = [];
    }
    var tags = topTags(items);
    if (tags.length >= 2) {
      var tagGroup = h('div', 'lib-chips lib-chips--tags');
      tagGroup.setAttribute('role', 'group');
      tagGroup.setAttribute('aria-label', 'Filter by topic');
      tagGroup.appendChild(h('span', 'lib-chips-label', 'Topics'));
      tags.forEach(function (t) {
        var b = buildChip(t.tag, t.count);
        b.addEventListener('click', function () { state.tag = state.tag === t.tag ? null : t.tag; render(); });
        tagChips.push({ key: t.tag, node: b });
        tagGroup.appendChild(b);
      });
      chipBar.appendChild(tagGroup);
    }
    if (chipBar.firstChild) root.appendChild(chipBar);

    var results = h('div', 'lib-results');
    root.appendChild(results);

    function groupLabel(text) {
      return h('p', 'lib-group', text);
    }

    function reset() {
      state.type = 'all'; state.tag = null; state.q = '';
      input.value = '';
      render();
      if (input.focus) input.focus();
    }

    function render() {
      var filtering = state.type !== 'all' || !!state.tag || !!String(state.q).trim();
      var shown = filterItems(items, state);

      typeChips.forEach(function (c) { c.node.setAttribute('aria-pressed', String(c.key === state.type)); });
      tagChips.forEach(function (c) { c.node.setAttribute('aria-pressed', String(c.key === state.tag)); });

      var noun = cfg.noun[items.length === 1 ? 0 : 1];
      count.textContent = filtering
        ? shown.length + ' of ' + items.length + ' ' + noun
        : items.length + ' ' + noun;

      clear(results);

      if (!shown.length) {
        var empty = h('div', 'lib-empty');
        empty.appendChild(h('p', 'lib-empty-title', items.length ? 'Nothing matches that.' : 'Nothing here yet.'));
        if (items.length) {
          empty.appendChild(h('p', 'lib-empty-text', 'Try a different word, or clear the search and filters.'));
          var btn = h('button', 'lib-chip lib-empty-btn', 'Clear search and filters');
          btn.setAttribute('type', 'button');
          btn.addEventListener('click', reset);
          empty.appendChild(btn);
        }
        results.appendChild(empty);
        return;
      }

      if (filtering) {
        results.appendChild(buildCollection(shown, cfg.layout, false));
        return;
      }

      var featured = shown.filter(function (it) { return it.featured === true; });
      if (!featured.length) featured = shown.slice(0, Math.min(2, shown.length));
      var rest = shown.filter(function (it) { return featured.indexOf(it) === -1; });
      if (!rest.length) {
        results.appendChild(buildCollection(shown, cfg.layout, false));
        return;
      }
      results.appendChild(groupLabel('Featured'));
      results.appendChild(buildCollection(featured, cfg.layout, true));
      results.appendChild(groupLabel(cfg.restLabel));
      results.appendChild(buildCollection(rest, cfg.layout, false));
    }

    input.addEventListener('input', function () { state.q = input.value; render(); });

    render();
    el.appendChild(root);

    return {
      section: section,
      /* Programmatic control for the shell, e.g. deep links: set({ q, type, tag }). */
      set: function (next) {
        next = next || {};
        if (typeof next.q === 'string') { state.q = next.q; input.value = next.q; }
        if (typeof next.type === 'string') state.type = next.type;
        if ('tag' in next) state.tag = next.tag || null;
        render();
      },
      destroy: function () { clear(el); }
    };
  }

  /* ---------- public API ---------- */

  function counts() {
    var out = { work: 0, podcast: 0, writing: 0, talks: 0 };
    allItems().forEach(function (it) {
      var s = it && sectionOf(it);
      if (s) out[s] += 1;
    });
    return out;
  }

  function latest(n) {
    n = n === undefined ? 5 : Math.max(0, n | 0);
    return allItems()
      .map(function (it, i) { return { it: it, i: i, k: dateKey(it) }; })
      .filter(function (x) { return x.it && sectionOf(x.it); })
      .sort(function (a, b) { return b.k - a.k || a.i - b.i; })
      .slice(0, n)
      .map(function (x) {
        var copy = {};
        Object.keys(x.it).forEach(function (key) { copy[key] = x.it[key]; });
        copy.section = sectionOf(x.it);
        return copy;
      });
  }

  window.StudioLibrary = {
    mount: mount,
    counts: counts,
    latest: latest,
    /* Exposed for tests and for shell code that wants the same rules. */
    _util: { itemsFor: itemsFor, filterItems: filterItems, topTags: topTags, isUpcoming: isUpcoming, formatDate: formatDate, thumbFor: thumbFor }
  };
})();
