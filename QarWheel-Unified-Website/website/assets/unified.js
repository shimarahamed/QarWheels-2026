(() => {
  'use strict';
  const root = document.documentElement;
  const ar = root.lang === 'ar';
  const nav = document.querySelector('.nav-links');
  const menu = document.querySelector('.menu-button');
  const header = document.querySelector('.header');
  const dialog = document.querySelector('.modal');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const precisePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const activeAnimations = new Set();
  const elementAnimations = new WeakMap();
  const easeOut = 'cubic-bezier(.16, 1, .3, 1)';
  function animate(element, frames, options = {}) {
    if (!element || motionPreference.matches || !element.animate) return;
    elementAnimations.get(element)?.cancel();
    const animation = element.animate(frames, { duration: 600, easing: easeOut, ...options });
    elementAnimations.set(element, animation);
    activeAnimations.add(animation);
    const cleanup = () => activeAnimations.delete(animation);
    animation.addEventListener('finish', cleanup, { once: true });
    animation.addEventListener('cancel', cleanup, { once: true });
    return animation;
  }
  motionPreference.addEventListener('change', e => {
    if (e.matches) activeAnimations.forEach(animation => animation.cancel());
  });
  let opener;
  const words = (en, arabic) => ar ? arabic : en;
  const themeButton = document.querySelector('[data-theme-toggle]');
  const paintTheme = () => {
    const dark = root.dataset.theme === 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101114' : '#F4F5F7');
    themeButton.textContent = dark ? '☀' : '☾';
    themeButton.setAttribute('aria-label', dark ? words('Use light appearance', 'استخدام المظهر الفاتح') : words('Use dark appearance', 'استخدام المظهر الداكن'));
    themeButton.title = themeButton.getAttribute('aria-label');
  };
  if (themeButton) {
    paintTheme();
    themeButton.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('qw-theme', root.dataset.theme); } catch (_) { /* Optional. */ }
      paintTheme();
    });
  }
  function closeMenu(restoreFocus = false) {
    const wasOpen = menu?.getAttribute('aria-expanded') === 'true';
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', words('Open navigation', 'فتح القائمة'));
    nav?.classList.remove('open');
    if (wasOpen && restoreFocus) menu.focus();
  }
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? words('Close navigation', 'إغلاق القائمة') : words('Open navigation', 'فتح القائمة'));
    nav.classList.toggle('open', open);
  });
  nav?.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(true); });
  document.addEventListener('click', e => { if (!header?.contains(e.target)) closeMenu(); });
  header?.addEventListener('focusout', e => { if (!header.contains(e.relatedTarget)) closeMenu(); });
  matchMedia('(min-width: 1051px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  document.querySelectorAll('[data-open-download]').forEach(button => button.addEventListener('click', () => {
    closeMenu();
    opener = button;
    if (dialog && !dialog.open) dialog.showModal();
  }));
  dialog?.querySelector('[data-close-dialog]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', e => {
    const box = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)) dialog.close();
  });
  dialog?.addEventListener('close', () => opener?.focus());
  // Reusable keyboard behavior for both the new experience and retained journey.
  document.querySelectorAll('[role="tablist"]').forEach(list => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    tabs.forEach((tab, index) => {
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (!tab.id) tab.id = `journey-tab-${index}`;
      const select = () => {
        const changed = tab.getAttribute('aria-selected') !== 'true';
        tabs.forEach(other => {
          other.setAttribute('aria-selected', String(other === tab));
          other.tabIndex = other === tab ? 0 : -1;
          const otherPanel = document.getElementById(other.getAttribute('aria-controls'));
          if (otherPanel && otherPanel !== panel) otherPanel.hidden = true;
        });
        if (!panel) return;
        panel.hidden = false;
        panel.setAttribute('aria-labelledby', tab.id);
        if (panel.dataset.steps) {
          const step = JSON.parse(panel.dataset.steps)[index];
          if (!step) return;
          panel.querySelector('h3').textContent = step.title;
          panel.querySelector('p').textContent = step.body;
          panel.querySelector('.journey-no').textContent = `${String(index + 1).padStart(2, '0')} / 04 — QARWHEEL`;
          panel.querySelector('.journey-mark').textContent = String(index + 1).padStart(2, '0');
        }
        if (changed) animate(panel, [{ opacity: .25, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320 });
      };
      tab.addEventListener('click', select);
      tab.addEventListener('keydown', e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const direction = (e.key === 'ArrowRight' ? 1 : -1) * (ar ? -1 : 1);
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + direction + tabs.length) % tabs.length;
        tabs[next].focus(); tabs[next].click();
      });
      if (tab.getAttribute('aria-selected') === 'true' && panel) panel.setAttribute('aria-labelledby', tab.id);
    });
  });
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Scroll only changes the glass material; the capsule keeps a stable size.
  let scrollFrame = 0;
  function updateHeader() {
    header?.classList.toggle('scrolled', scrollY > 36);
    scrollFrame = 0;
  }
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
  }, { passive: true });
  updateHeader();

  // Content is visible without JS. Animations begin only as it enters view.
  animate(header, [{ opacity: .4, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 550 });
  document.querySelectorAll('.u-hero-copy > :not(.u-hero-bottom)').forEach((el, index) => {
    animate(el, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 750, delay: 80 + index * 75, fill: 'backwards' });
  });
  animate(document.querySelector('.u-hero-visual'), [{ opacity: 0, transform: 'translateY(20px) scale(.985)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 950, delay: 120, fill: 'backwards' });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const base = getComputedStyle(entry.target).transform;
      const resting = base === 'none' ? '' : base + ' ';
      animate(entry.target, [{ opacity: 0, transform: resting + 'translateY(22px)' }, { opacity: 1, transform: base }], { duration: 720 });
    }), { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    document.querySelectorAll('.u-pillar-strip a, .u-intro-section > div, .u-section-head, .u-experience-card, .u-services > div, .u-business-copy, .u-workspace, .faq-layout > div, .page-hero .shell > *, .editorial-list article, .feature-card, .steps-list article, .partner-body, .partner-image').forEach(el => observer.observe(el));
    // Keyboard users never have to wait for an entrance to complete.
    document.addEventListener('focusin', e => {
      let el = e.target;
      while (el && el !== document.body) {
        elementAnimations.get(el)?.finish();
        el = el.parentElement;
      }
    });
  }
  document.querySelectorAll('.faq details').forEach(details => details.addEventListener('toggle', () => {
    if (details.open) animate(details.querySelector('p'), [{ opacity: 0, transform: 'translateY(-5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 280 });
  }));

  // A small pointer-driven depth shift; no animation loop while idle.
  const scene = document.querySelector('.u-hero-visual');
  let sceneFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  function resetScene() {
    cancelAnimationFrame(sceneFrame);
    sceneFrame = 0;
    scene?.style.removeProperty('--scene-x');
    scene?.style.removeProperty('--scene-y');
    scene?.style.removeProperty('--scene-turn');
  }
  scene?.addEventListener('pointermove', e => {
    if (motionPreference.matches || !precisePointer.matches || e.pointerType === 'touch') return;
    const box = scene.getBoundingClientRect();
    pointerX = (e.clientX - box.left) / box.width - .5;
    pointerY = (e.clientY - box.top) / box.height - .5;
    if (!sceneFrame) sceneFrame = requestAnimationFrame(() => {
      scene.style.setProperty('--scene-x', `${pointerX * 10}px`);
      scene.style.setProperty('--scene-y', `${pointerY * 8}px`);
      scene.style.setProperty('--scene-turn', `${pointerX * 1.5}deg`);
      sceneFrame = 0;
    });
  });
  scene?.addEventListener('pointerleave', resetScene);
  motionPreference.addEventListener('change', resetScene);
  precisePointer.addEventListener('change', resetScene);
})();
