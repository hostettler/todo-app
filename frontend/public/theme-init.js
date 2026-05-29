(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
