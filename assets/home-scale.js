(() => {
  const page = document.getElementById('hm');

  if (!page) return;

  const stageWidth = 1920;
  const stageHeight = 1024;

  const isPhonePortrait = () =>
    window.matchMedia('(orientation: portrait) and (max-width: 900px)').matches;

  const isPhoneLandscape = () =>
    window.matchMedia('(orientation: landscape) and (max-width: 1180px) and (max-height: 820px)').matches;

  const fitHome = () => {
    if (isPhonePortrait() || isPhoneLandscape()) {
      page.classList.remove('scaled-home');
      page.style.removeProperty('--home-scale');
      return;
    }

    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const scale = Math.min(width / stageWidth, height / stageHeight);

    page.style.setProperty('--home-scale', scale.toFixed(4));
    page.classList.add('scaled-home');
  };

  fitHome();
  window.addEventListener('resize', fitHome, { passive: true });
})();