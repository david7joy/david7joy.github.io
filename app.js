(() => {
  'use strict';
  const body = document.body;
  const dialog = document.getElementById('portfolio-dialog');
  const content = document.getElementById('panel-content');
  const kicker = document.getElementById('panel-kicker');
  const closeButton = document.getElementById('close-dialog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.getElementById('motion-toggle');
  const motionLabel = document.getElementById('motion-label');
  const scrollArea = document.getElementById('panel-scroll');
  const panels = {
    projects: '01 / Selected work',
    rig: '01 / On the workbench',
    conversations: '02 / Conversations & ideas',
    story: '03 / The story so far',
    contact: '04 / Make a connection'
  };
  let returnFocus = null;
  let activePanel = null;
  let motionPreference = null;
  try { motionPreference = localStorage.getItem('idea-studio-motion'); } catch (_) { /* Storage is optional. */ }
  let paused = reducedMotion.matches || motionPreference === 'paused';

  function syncMotion() {
    body.classList.toggle('motion-paused', paused);
    body.classList.toggle('motion-opt-in', reducedMotion.matches && !paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused ? 'Resume studio motion' : 'Pause studio motion');
    motionLabel.textContent = paused ? 'Motion paused' : 'Pause motion';
    document.querySelector('.motion-symbol').textContent = paused ? '▷' : 'Ⅱ';
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

  function openPanel(name, trigger, updateUrl = true) {
    if (!Object.hasOwn(panels, name)) return;
    const wasOpen = dialog.open;
    if (!wasOpen) returnFocus = trigger || document.activeElement;
    activePanel = name;
    content.replaceChildren(document.getElementById(`${name}-template`).content.cloneNode(true));
    kicker.textContent = panels[name];
    dialog.dataset.panel = name;
    if (!dialog.open) dialog.showModal();
    body.classList.add('panel-open');
    scrollArea.scrollTop = 0;
    const section = name === 'rig' ? 'projects' : name;
    document.querySelectorAll('.hud-nav [data-open]').forEach(button => {
      const selected = button.dataset.open === section;
      button.classList.toggle('is-active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    window.dispatchEvent(new CustomEvent('studio:panel', { detail: { open: true, section: name } }));
    closeButton.focus({ preventScroll: true });
    if (updateUrl) history[wasOpen ? 'replaceState' : 'pushState']({ studioPanel: name }, '', `#${name}`);
  }

  function closePanel(updateUrl = true) {
    if (dialog.open) dialog.close();
    body.classList.remove('panel-open');
    activePanel = null;
    window.dispatchEvent(new CustomEvent('studio:panel', { detail: { open: false } }));
    if (updateUrl) history.replaceState(null, '', `${location.pathname}${location.search}`);
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open]');
    if (opener) { event.preventDefault(); openPanel(opener.dataset.open, opener); return; }
    if (event.target.closest('[data-close]')) closePanel();
  });
  window.addEventListener('studio:open', event => {
    openPanel(event.detail.section, document.querySelector(`.scene-hotspot[data-open="${event.detail.section}"]`));
  });
  closeButton.addEventListener('click', () => closePanel());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closePanel(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePanel();
  });
  dialog.addEventListener('close', () => body.classList.remove('panel-open'));
  window.addEventListener('popstate', () => {
    const name = location.hash.slice(1);
    if (Object.hasOwn(panels, name)) openPanel(name, null, false);
    else closePanel(false);
  });
  document.querySelector('.monogram').addEventListener('click', event => {
    event.preventDefault(); closePanel(); window.scrollTo({ top: 0, behavior: paused ? 'instant' : 'smooth' });
  });
  const initialPanel = location.hash.slice(1);
  if (Object.hasOwn(panels, initialPanel)) openPanel(initialPanel, null, false);

  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.repeat) return;
    if (event.target.matches('input,textarea,select,[contenteditable="true"]')) return;
    const section = { '1': 'projects', '2': 'conversations', '3': 'story', '4': 'contact' }[event.key];
    if (section) { event.preventDefault(); openPanel(section, document.activeElement); }
  });
  document.addEventListener('visibilitychange', () => body.classList.toggle('tab-inactive', document.hidden));

  const clock = document.getElementById('dallas-time');
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
  function updateClock() { const now = new Date(); clock.textContent = formatter.format(now); clock.dateTime = now.toISOString(); }
  updateClock(); setInterval(updateClock, 30000);
})();
