(function () {
  'use strict';

  var navbar = document.getElementById('navbar');
  var progress = document.getElementById('scroll-progress');
  if (!navbar) return;

  var ticking = false;
  var lastScrollY = 0;

  function updateNavbar() {
    var scrollY = lastScrollY;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var progressWidth = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;

    if (scrollY > 50) {
      navbar.style.background = 'rgba(10, 10, 10, 0.8)';
      navbar.style.backdropFilter = 'blur(32px)';
      navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.04)';
      navbar.style.boxShadow = '0 1px 0 rgba(255, 255, 255, 0.02)';
    } else {
      navbar.style.background = 'transparent';
      navbar.style.backdropFilter = 'none';
      navbar.style.borderBottom = 'none';
      navbar.style.boxShadow = 'none';
    }

    if (progress) {
      progress.style.width = progressWidth + '%';
    }

    ticking = false;
  }

  function onScroll() {
    lastScrollY = window.scrollY;
    if (!ticking) {
      requestAnimationFrame(updateNavbar);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateNavbar();
})();
