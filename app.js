(() => {
  'use strict';

  const body = document.body;
  const dialog = document.getElementById('portfolio-dialog');
  const content = document.getElementById('panel-content');
  const kicker = document.getElementById('panel-kicker');
  const closeButton = document.getElementById('close-dialog');
  const panelNav = document.getElementById('panel-nav');
  const scrollArea = document.getElementById('panel-scroll');
  const motionButton = document.getElementById('motion-toggle');
  const motionLabel = document.getElementById('motion-label');
  const motionSymbol = document.querySelector('.motion-symbol');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Routes. `nav` is the section tab a panel belongs to. */
  const panels = {
    work: { kicker: 'Work', nav: 'work' },
    rig: { kicker: 'Work · On the workbench', nav: 'work' },
    podcast: { kicker: 'Podcast', nav: 'podcast' },
    writing: { kicker: 'Writing', nav: 'writing' },
    talks: { kicker: 'Talks & videos', nav: 'talks' },
    skills: { kicker: 'Skills', nav: 'skills' },
    career: { kicker: 'My career', nav: 'career' },
    contact: { kicker: 'Contact', nav: 'contact' }
  };
  /* Older links keep working. */
  const aliases = { projects: 'work', conversations: 'podcast', about: 'career', story: 'career', connect: 'contact' };
  const shortcuts = { 1: 'work', 2: 'podcast', 3: 'writing', 4: 'talks', 5: 'career', 6: 'skills', 7: 'contact' };

  function resolve(value) {
    let name = String(value || '').replace(/^#/, '');
    try { name = decodeURIComponent(name); } catch (_) { /* Keep the raw value. */ }
    name = name.toLowerCase();
    if (Object.hasOwn(aliases, name)) name = aliases[name];
    return Object.hasOwn(panels, name) ? name : null;
  }

  let returnFocus = null;
  let activePanel = null;

  /* ---------- Intro: one screen before you step in ---------- */

  const intro = document.getElementById('intro');
  const stage = document.querySelectorAll('.site-header, .studio-home, .studio-footer');
  let entered = false;
  try { entered = sessionStorage.getItem('idea-studio-entered') === '1'; } catch (_) { /* Storage is optional. */ }

  function enterStudio() {
    if (!body.classList.contains('intro')) return;
    body.classList.remove('intro');
    body.classList.add('entering');
    intro.classList.add('is-leaving');
    stage.forEach(node => { node.inert = false; });
    try { sessionStorage.setItem('idea-studio-entered', '1'); } catch (_) { /* Storage is optional. */ }
    window.dispatchEvent(new CustomEvent('studio:enter'));
    setTimeout(() => { intro.hidden = true; body.classList.remove('entering'); }, 2600);
  }

  /* Direct links to a section, and return visits in the same tab, skip it. */
  if (intro && !entered && !resolve(location.hash)) {
    body.classList.add('intro');
    intro.hidden = false;
    stage.forEach(node => { node.inert = true; });
    intro.addEventListener('click', enterStudio);
    document.addEventListener('keydown', event => {
      if (!body.classList.contains('intro') || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') { event.preventDefault(); enterStudio(); }
    });
    document.getElementById('intro-enter').focus({ preventScroll: true });
  }

  /* ---------- Exploration tracker ---------- */

  const questKeys = ['work', 'rig', 'podcast', 'writing', 'talks', 'career', 'skills', 'contact'];
  const found = new Set();
  try {
    for (const key of JSON.parse(localStorage.getItem('idea-studio-found') || '[]')) if (questKeys.includes(key)) found.add(key);
  } catch (_) { /* Storage is optional. */ }

  function syncQuest() {
    const quest = document.getElementById('quest');
    if (!quest) return;
    document.getElementById('quest-pips').replaceChildren(...questKeys.map(key => {
      const pip = document.createElement('i');
      if (found.has(key)) pip.className = 'is-found';
      return pip;
    }));
    document.getElementById('quest-label').textContent = found.size === questKeys.length
      ? 'Desk explored'
      : `Explored ${found.size} of ${questKeys.length}`;
    quest.hidden = false;
    document.querySelectorAll('.collection-button').forEach(button => button.classList.toggle('is-found', found.has(button.dataset.open)));
  }

  function markFound(name) {
    if (found.has(name) || !questKeys.includes(name)) return;
    found.add(name);
    try { localStorage.setItem('idea-studio-found', JSON.stringify([...found])); } catch (_) { /* Storage is optional. */ }
    syncQuest();
  }
  syncQuest();

  /* ---------- Motion preference ---------- */

  let motionPreference = null;
  try { motionPreference = localStorage.getItem('idea-studio-motion'); } catch (_) { /* Storage is optional. */ }
  let paused = reducedMotion.matches || motionPreference === 'paused';

  function syncMotion() {
    body.classList.toggle('motion-paused', paused);
    body.classList.toggle('motion-opt-in', reducedMotion.matches && !paused);
    motionButton.setAttribute('aria-label', paused ? 'Resume studio motion' : 'Pause studio motion');
    motionLabel.textContent = paused ? 'Motion paused' : 'Pause motion';
    motionSymbol.textContent = paused ? '▷' : 'Ⅱ';
    window.dispatchEvent(new CustomEvent('studio:motion', { detail: { paused } }));
  }
  syncMotion();
  motionButton.addEventListener('click', () => {
    paused = !paused;
    motionPreference = paused ? 'paused' : 'playing';
    try { localStorage.setItem('idea-studio-motion', motionPreference); } catch (_) { /* Storage is optional. */ }
    syncMotion();
  });
  reducedMotion.addEventListener('change', event => {
    paused = event.matches || motionPreference === 'paused';
    syncMotion();
  });

  /* ---------- Small DOM helper ---------- */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---------- Counts (from the library module, when it is there) ---------- */

  function libraryCounts() {
    try {
      const counts = window.StudioLibrary?.counts?.();
      if (counts && typeof counts === 'object') return counts;
    } catch (_) { /* Fall through to the data file. */ }
    const items = window.PORTFOLIO?.items;
    if (!Array.isArray(items)) return {};
    const sections = { project: 'work', integration: 'work', podcast: 'podcast', writing: 'writing', talk: 'talks', video: 'talks' };
    const counts = {};
    for (const item of items) {
      const section = sections[item?.type];
      if (section) counts[section] = (counts[section] || 0) + 1;
    }
    return counts;
  }

  function syncCounts() {
    const counts = libraryCounts();
    document.querySelectorAll('[data-count]').forEach(node => {
      const value = Number(counts[node.dataset.count]);
      const known = Number.isFinite(value) && value > 0;
      node.hidden = !known;
      if (!known) { node.replaceChildren(); return; }
      node.replaceChildren(document.createTextNode(String(value)), el('span', 'sr-only', value === 1 ? ' item' : ' items'));
    });
  }

  /* ---------- Library containers ---------- */

  function mountLibraries(root) {
    root.querySelectorAll('[data-library]').forEach(slot => {
      const fallback = slot.parentElement?.querySelector('[data-library-fallback]');
      let mounted = false;
      if (typeof window.StudioLibrary?.mount === 'function' && window.PORTFOLIO?.items?.length) {
        try {
          window.StudioLibrary.mount(slot, slot.dataset.library);
          mounted = true;
        } catch (error) {
          console.error('Library failed to mount:', error);
          slot.replaceChildren();
        }
      }
      slot.hidden = !mounted;
      if (fallback) fallback.hidden = mounted;
    });
  }

  /* ---------- Story: stats and the journey, from content.js ---------- */

  function formatFact(fact) {
    const value = typeof fact.value === 'number' ? fact.value.toLocaleString('en-US') : String(fact.value ?? '');
    return `${fact.prefix || ''}${value}${fact.suffix || ''}`;
  }

  function renderStats(root) {
    const list = root.querySelector('[data-stats]');
    const stats = window.PORTFOLIO?.stats;
    if (!list || !Array.isArray(stats) || !stats.length) return;
    list.replaceChildren(...stats.map(stat => {
      const item = el('div');
      item.append(el('dt', null, stat.value), el('dd', null, stat.label));
      return item;
    }));
    list.hidden = false;
  }

  function renderJourney(root) {
    const list = root.querySelector('[data-journey]');
    const journey = window.PORTFOLIO?.journey;
    if (!list || !Array.isArray(journey) || !journey.length) return;
    const chapters = [...journey].sort((a, b) => (b.year || 0) - (a.year || 0));
    list.replaceChildren(...chapters.map(chapter => {
      const item = el('li');

      const when = el('p', 'timeline-when');
      when.append(el('span', 'timeline-year', chapter.year));
      if (chapter.place) when.append(el('span', 'timeline-place', chapter.place));
      item.append(when, el('h4', null, chapter.title));

      for (const paragraph of chapter.body || []) item.append(el('p', null, paragraph));

      if (chapter.facts?.length) {
        const facts = el('dl', 'timeline-facts');
        for (const fact of chapter.facts) {
          const row = el('div');
          row.append(el('dt', null, formatFact(fact)), el('dd', null, fact.label));
          facts.append(row);
        }
        item.append(facts);
      }

      const links = (chapter.links || []).filter(link => link?.url);
      if (links.length) {
        const linkList = el('ul', 'timeline-links');
        for (const link of links) {
          const anchor = el('a', null, `${link.label} `);
          anchor.href = link.url;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          const arrow = el('span', null, '↗');
          arrow.setAttribute('aria-hidden', 'true');
          anchor.append(arrow);
          const row = el('li');
          row.append(anchor);
          linkList.append(row);
        }
        item.append(linkList);
      }
      return item;
    }));
  }

  /* ---------- Career: a flow you scroll through ---------- */

  let flowObserver = null;

  function renderCareer(root) {
    const track = root.querySelector('[data-flow-track]');
    const rail = root.querySelector('[data-flow-rail]');
    const career = window.PORTFOLIO?.career;
    if (flowObserver) { flowObserver.disconnect(); flowObserver = null; }
    if (!track || !rail || !Array.isArray(career) || !career.length) return;

    const chips = [];
    track.replaceChildren(...career.map((company, index) => {
      const stop = el('li', 'flow-stop');
      stop.id = `career-${index}`;
      if (company.to === 'Present') stop.classList.add('is-current');

      stop.append(el('p', 'flow-dates', `${company.from} – ${company.to}`), el('h3', 'flow-org', company.org));
      if (company.place) stop.append(el('p', 'flow-place', company.place));
      if (company.note) stop.append(el('p', 'flow-note', company.note));

      (company.roles || []).forEach((role, roleIndex) => {
        if (roleIndex > 0) stop.append(el('p', 'flow-step', 'Promoted from'));
        const card = el('div', 'flow-role');
        const head = el('div', 'flow-role-head');
        head.append(el('h4', 'flow-role-title', role.title));
        if (role.from) head.append(el('p', 'flow-role-dates', `${role.from} – ${role.to}`));
        card.append(head);
        if (role.points?.length) {
          const list = el('ul', 'plain-list');
          for (const point of role.points) list.append(el('li', null, point));
          card.append(list);
        }
        stop.append(card);
      });

      const chip = el('button', 'flow-chip', company.short || company.org);
      chip.type = 'button';
      chip.addEventListener('click', () => stop.scrollIntoView({ block: 'start', behavior: paused ? 'instant' : 'smooth' }));
      chips.push(chip);
      return stop;
    }));
    rail.replaceChildren(...chips);

    const stops = [...track.children];
    function setActive(index) {
      chips.forEach((chip, i) => {
        chip.classList.toggle('is-active', i === index);
        if (i === index) chip.setAttribute('aria-current', 'true'); else chip.removeAttribute('aria-current');
      });
    }
    setActive(0);

    /* Stops fade in as they arrive; the chip for the one nearest the top lights up. */
    if ('IntersectionObserver' in window && !paused) {
      flowObserver = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) entry.target.classList.add('is-in');
      }, { root: scrollArea, threshold: .12 });
      stops.forEach(stop => flowObserver.observe(stop));
    } else {
      stops.forEach(stop => stop.classList.add('is-in'));
    }
    track._sync = () => {
      const top = scrollArea.getBoundingClientRect().top + 96;
      let current = 0;
      stops.forEach((stop, i) => { if (stop.getBoundingClientRect().top <= top) current = i; });
      setActive(current);
      const box = track.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (top + 40 - box.top) / Math.max(box.height, 1)));
      track.style.setProperty('--progress', progress.toFixed(3));
    };
    track._sync();
    requestAnimationFrame(() => track._sync());

    const list = root.querySelector('[data-education]');
    const education = window.PORTFOLIO?.education;
    if (list && Array.isArray(education) && education.length) {
      list.replaceChildren(...education.map(entry => {
        const item = el('li');
        item.append(el('p', 'career-years', entry.years), el('p', 'career-org', entry.school), el('p', 'career-role', entry.degree));
        return item;
      }));
      list.closest('[data-education-block]')?.removeAttribute('hidden');
    }
  }
  scrollArea.addEventListener('scroll', () => content.querySelector('[data-flow-track]')?._sync?.(), { passive: true });

  /* ---------- Panels ---------- */

  function syncNav(name) {
    const section = panels[name].nav;
    panelNav.querySelectorAll('[data-open]').forEach(button => {
      const selected = button.dataset.open === section;
      button.classList.toggle('is-active', selected);
      if (selected) {
        button.setAttribute('aria-current', 'page');
        button.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' });
      } else {
        button.removeAttribute('aria-current');
      }
    });
  }

  function openPanel(requested, trigger, updateUrl = true) {
    const name = resolve(requested);
    if (!name) return;
    enterStudio();
    markFound(name);
    const wasOpen = dialog.open;
    if (!wasOpen) returnFocus = trigger || document.activeElement;

    if (!wasOpen || name !== activePanel) {
      activePanel = name;
      content.classList.add('is-swapping');
      content.replaceChildren(document.getElementById(`${name}-template`).content.cloneNode(true));
      renderStats(content);
      renderJourney(content);
      renderCareer(content);
      mountLibraries(content);
      kicker.textContent = panels[name].kicker;
      dialog.dataset.panel = name;
      if (!dialog.open) dialog.showModal();
      body.classList.add('panel-open');
      scrollArea.scrollTop = 0;
      /* Restart the content fade for the new section. */
      void content.offsetWidth;
      content.classList.remove('is-swapping');
      syncNav(name);
      syncCounts();
      window.dispatchEvent(new CustomEvent('studio:panel', { detail: { open: true, section: name } }));

      /* Keep focus on a section tab that was just used; otherwise move it to the new heading. */
      const keepFocus = wasOpen && trigger instanceof Element && panelNav.contains(trigger);
      if (!keepFocus) {
        const title = content.querySelector('#panel-title');
        if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
        else closeButton.focus({ preventScroll: true });
      }
    }
    if (updateUrl && location.hash !== `#${name}`) {
      if (wasOpen) history.replaceState({ studioPanel: name }, '', `#${name}`);
      else { history.pushState({ studioPanel: name }, '', `#${name}`); pushedEntry = true; }
    }
  }

  let pushedEntry = false;
  let pressStartedOnBackdrop = false;

  function afterClose(updateUrl) {
    if (activePanel === null) return;
    activePanel = null;
    body.classList.remove('panel-open');
    window.dispatchEvent(new CustomEvent('studio:panel', { detail: { open: false } }));
    /* Closing a panel we opened steps back over its history entry, so Back never lands on a duplicate. */
    const stepBack = pushedEntry;
    pushedEntry = false;
    if (updateUrl) {
      if (stepBack) history.back();
      else history.replaceState(null, '', `${location.pathname}${location.search}`);
    }
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  function closePanel(updateUrl = true) {
    if (dialog.open) dialog.close();
    afterClose(updateUrl);
  }

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open]');
    if (opener) { event.preventDefault(); openPanel(opener.dataset.open, opener); return; }
    if (event.target.closest('[data-close]')) closePanel();
  });
  window.addEventListener('studio:open', event => {
    const section = event.detail?.section;
    openPanel(section, document.querySelector(`.scene-hotspot[data-open="${CSS.escape(String(section))}"]`));
  });
  closeButton.addEventListener('click', () => closePanel());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closePanel(); });
  /* A click on the backdrop lands on the dialog element itself, outside its box. */
  dialog.addEventListener('pointerdown', event => { pressStartedOnBackdrop = event.target === dialog; });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog || !pressStartedOnBackdrop) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePanel();
  });
  /* Covers any close the browser performs on its own. */
  dialog.addEventListener('close', () => { if (!dialog.open) afterClose(true); });

  window.addEventListener('popstate', () => {
    const name = resolve(location.hash);
    if (name) openPanel(name, null, false);
    else closePanel(false);
  });
  document.querySelector('.monogram').addEventListener('click', event => {
    event.preventDefault();
    closePanel();
    window.scrollTo({ top: 0, behavior: paused ? 'instant' : 'smooth' });
  });

  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.repeat) return;
    if (event.target instanceof Element && event.target.matches('input,textarea,select,[contenteditable="true"]')) return;
    if (!Object.hasOwn(shortcuts, event.key)) return;
    event.preventDefault();
    openPanel(shortcuts[event.key], document.activeElement);
  });
  document.addEventListener('visibilitychange', () => body.classList.toggle('tab-inactive', document.hidden));

  syncCounts();
  const initialPanel = resolve(location.hash);
  if (initialPanel) {
    openPanel(initialPanel, null, false);
    /* Rewrite an old alias (#projects, #conversations) to its current route. */
    if (location.hash !== `#${initialPanel}`) history.replaceState({ studioPanel: initialPanel }, '', `#${initialPanel}`);
  }

  /* ---------- Dallas clock ---------- */

  const clock = document.getElementById('dallas-time');
  const introClock = document.getElementById('intro-time');
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
  function updateClock() {
    const now = new Date();
    clock.textContent = formatter.format(now);
    clock.dateTime = now.toISOString();
    if (introClock) { introClock.textContent = clock.textContent; introClock.dateTime = clock.dateTime; }
  }
  updateClock();
  setInterval(updateClock, 30000);
})();
