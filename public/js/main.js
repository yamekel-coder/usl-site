(function () {
  'use strict';

  var hiddenSelectors = '#hero-badge, #hero-sub, #hero-cta, .stat-card, .reveal, .feature-card, .change-item';

  function showAll() {
    document.querySelectorAll(hiddenSelectors).forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  // --- Language toggle (always active, independent of GSAP) ---
  function setupLanguageToggle() {
    var langBtn = document.getElementById('lang-toggle');
    if (!langBtn || !window.i18n) return;
    function updateLangBtn() {
      var cur = i18n.getLang();
      langBtn.textContent = cur === 'en' ? 'RU' : 'EN';
    }
    updateLangBtn();
    langBtn.addEventListener('click', function () {
      i18n.toggle();
      updateLangBtn();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLanguageToggle);
  } else {
    setupLanguageToggle();
  }

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    showAll();
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    showAll();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  gsap.from('#navbar', {
    y: -100,
    opacity: 0,
    duration: 1,
    ease: 'power4.out',
  });

  var heroTl = gsap.timeline({ delay: 0.3 });

  heroTl
    .to('#hero-badge', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
    .from('#hero-title .block', {
      opacity: 0,
      y: 80,
      rotateX: -15,
      stagger: 0.15,
      duration: 1,
      ease: 'power4.out',
    }, '-=0.4')
    .to('#hero-sub', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
    .to('#hero-cta', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.4')
    .to('.stat-card', {
      opacity: 1,
      y: 0,
      scale: 1,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power4.out',
    }, '-=0.6');

  gsap.utils.toArray('.reveal').forEach(function (el) {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power4.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  gsap.utils.toArray('.change-item').forEach(function (item, i) {
    gsap.fromTo(item, {
      opacity: 0,
      x: -30,
    }, {
      opacity: 1,
      x: 0,
      duration: 0.6,
      delay: i * 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: item,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
    });
  });

  gsap.utils.toArray('.feature-card').forEach(function (card, i) {
    gsap.fromTo(card, {
      opacity: 0,
      y: 60,
      scale: 0.95,
    }, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      delay: i * 0.12,
      ease: 'power4.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  var counters = document.querySelectorAll('.counter');
  counters.forEach(function (counter) {
    var target = parseInt(counter.getAttribute('data-target'), 10);
    if (isNaN(target)) return;

    var animated = false;

    function animateCounter() {
      if (animated) return;
      animated = true;

      var duration = 2000;
      var startTime = performance.now();

      function update(currentTime) {
        var elapsed = currentTime - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.floor(eased * target);
        counter.textContent = current.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          counter.textContent = target.toLocaleString();
        }
      }
      requestAnimationFrame(update);
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(counter);
  });

  var navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(function (link) {
    link.addEventListener('mouseenter', function () {
      gsap.to(link, { scale: 1.05, duration: 0.3, ease: 'power2.out' });
    });
    link.addEventListener('mouseleave', function () {
      gsap.to(link, { scale: 1, duration: 0.3, ease: 'power2.out' });
    });
  });

  // --- GD prank button (Shitty) ---
  var gdBtn = document.getElementById('gd-prank-btn');
  var prankOverlay = document.getElementById('prank-overlay');
  var prankClose = document.getElementById('prank-close');
  if (gdBtn && prankOverlay) {
    var openPrank = function () {
      prankOverlay.classList.remove('hidden');
      prankOverlay.classList.add('flex');
      document.body.style.overflow = 'hidden';
    };
    var closePrank = function () {
      prankOverlay.classList.add('hidden');
      prankOverlay.classList.remove('flex');
      document.body.style.overflow = '';
    };
    gdBtn.addEventListener('click', openPrank);
    if (prankClose) prankClose.addEventListener('click', closePrank);
    prankOverlay.addEventListener('click', function (e) {
      if (e.target === prankOverlay) closePrank();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !prankOverlay.classList.contains('hidden')) closePrank();
    });
  }
})();
