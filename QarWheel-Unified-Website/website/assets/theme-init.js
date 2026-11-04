// Run before first paint; blocked storage still leaves a usable light theme.
try {
  const preference = localStorage.getItem('qw-theme');
  if (preference === 'light' || preference === 'dark') document.documentElement.dataset.theme = preference;
} catch (_) { /* Storage is optional. */ }
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', document.documentElement.dataset.theme === 'dark' ? '#101114' : '#F4F5F7');
