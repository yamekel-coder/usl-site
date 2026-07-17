(function () {
  'use strict';

  var modal = document.getElementById('auth-modal');
  if (!modal) return;

  var tabs = modal.querySelectorAll('.auth-tab');
  var forms = {
    login: modal.querySelector('[data-auth-form="login"]'),
    register: modal.querySelector('[data-auth-form="register"]')
  };

  function openModal(tab) {
    tab = tab === 'register' ? 'register' : 'login';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    switchTab(tab);
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }

  function switchTab(tab) {
    tabs.forEach(function (t) {
      var active = t.getAttribute('data-auth-tab') === tab;
      t.classList.toggle('bg-white', active);
      t.classList.toggle('text-dark', active);
      t.classList.toggle('text-white/50', !active);
      t.classList.toggle('hover:text-white', !active);
    });
    Object.keys(forms).forEach(function (k) {
      if (forms[k]) forms[k].classList.toggle('hidden', k !== tab);
    });
  }

  document.querySelectorAll('[data-auth-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openModal(btn.getAttribute('data-auth-open'));
    });
  });

  modal.querySelectorAll('[data-auth-switch]').forEach(function (b) {
    b.addEventListener('click', function () {
      switchTab(b.getAttribute('data-auth-switch'));
    });
  });

  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      switchTab(t.getAttribute('data-auth-tab'));
    });
  });

  var closeBtn = document.getElementById('auth-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  function handleSubmit(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errBox = form.querySelector('.auth-error');
      errBox.classList.add('hidden');
      errBox.textContent = '';
      var data = new URLSearchParams(new FormData(form));
      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'X-Requested-With': 'fetch' },
        body: data
      }).then(function (res) {
        return res.json().then(function (json) {
          if (json.ok) {
            window.location.href = json.redirect || '/';
            return;
          }
          errBox.textContent = json.error || 'Something went wrong';
          errBox.classList.remove('hidden');
        });
      }).catch(function () {
        errBox.textContent = 'Network error, please try again';
        errBox.classList.remove('hidden');
      });
    });
  }

  Object.keys(forms).forEach(function (k) {
    if (forms[k]) handleSubmit(forms[k]);
  });
})();
