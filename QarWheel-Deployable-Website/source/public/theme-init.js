try {
  document.documentElement.dataset.theme = localStorage.getItem('qarwheel-theme') === 'light' ? 'light' : 'dark';
} catch {
  document.documentElement.dataset.theme = 'dark';
}
