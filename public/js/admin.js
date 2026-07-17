(function () {
  'use strict';

  // ---------- Modals ----------
  function openModal(name) {
    var m = document.querySelector('.usl-modal[data-modal="' + name + '"]');
    if (!m) return;
    closeAllModals();
    m.classList.remove('hidden');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(m) {
    if (!m) return;
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.usl-modal:not(.hidden)')) document.body.style.overflow = '';
  }
  function closeAllModals() {
    document.querySelectorAll('.usl-modal').forEach(function (m) { closeModal(m); });
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-modal-open]');
    if (opener) {
      e.preventDefault();
      e.stopPropagation();
      openModal(opener.getAttribute('data-modal-open'));
      return;
    }
    if (e.target.closest('.usl-modal-close')) {
      e.preventDefault();
      closeAllModals();
      return;
    }
    if (e.target.classList.contains('usl-modal')) {
      closeAllModals();
      return;
    }
    var toggler = e.target.closest('[data-toggle]');
    if (toggler) {
      var id = toggler.getAttribute('data-toggle');
      var box = document.getElementById(id);
      if (box) {
        if (box.style.display === 'none' || box.classList.contains('hidden')) {
          box.classList.remove('hidden');
          box.style.display = 'block';
        } else {
          box.classList.add('hidden');
          box.style.display = 'none';
        }
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllModals();
  });

  // ---------- Level picker ----------
  function initPicker(row) {
    var picker = row.querySelector('[data-picker]');
    if (!picker || picker.dataset.init) return;
    picker.dataset.init = '1';
    var toggle = picker.querySelector('[data-picker-toggle]');
    var dropdown = picker.querySelector('[data-picker-dropdown]');
    var search = picker.querySelector('[data-picker-search]');
    var list = picker.querySelector('[data-picker-list]');
    var hidden = picker.querySelector('[data-picker-value]');

    function render(filter) {
      var q = (filter || '').toLowerCase();
      list.innerHTML = '';
      (window.USL_DEMONS || []).forEach(function (d) {
        if (q && d.name.toLowerCase().indexOf(q) === -1) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-full text-left px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2';
        btn.innerHTML = '<span class="text-[10px] text-white/30 font-bold">#' + (d.position || '?') + '</span><span class="truncate">' + d.name + '</span>';
        btn.addEventListener('click', function () {
          hidden.value = d.id;
          toggle.textContent = '#' + (d.position || '?') + ' ' + d.name;
          toggle.classList.remove('text-white/40');
          toggle.classList.add('text-white');
          var pct = row.querySelector('[data-requirement]');
          if (pct && !pct.value) pct.value = d.requirement || 100;
          dropdown.classList.add('hidden');
        });
        list.appendChild(btn);
      });
      if (!list.children.length) {
        var empty = document.createElement('div');
        empty.className = 'px-3 py-2 text-sm text-white/30';
        empty.textContent = 'No levels found';
        list.appendChild(empty);
      }
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasHidden = dropdown.classList.contains('hidden');
      closeAllDropdowns();
      if (wasHidden) {
        render(search.value);
        dropdown.classList.remove('hidden');
      }
    });
    search.addEventListener('click', function (e) { e.stopPropagation(); });
    search.addEventListener('input', function () { render(search.value); });
    dropdown.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  function closeAllDropdowns() {
    document.querySelectorAll('[data-picker-dropdown]').forEach(function (d) { d.classList.add('hidden'); });
  }
  document.addEventListener('click', closeAllDropdowns);

  // ---------- Multi-level record rows ----------
  var rowTemplate = null;
  function buildRowHTML() {
    if (rowTemplate) return rowTemplate;
    rowTemplate = '' +
      '<div class="record-row rounded-2xl border border-white/10 p-4" style="background:rgba(255,255,255,0.02)">' +
        '<div class="flex items-center justify-between mb-3">' +
          '<span class="text-xs text-white/40 uppercase tracking-wider">Level</span>' +
          '<button type="button" class="text-white/40 hover:text-white text-sm" data-remove-row>✕</button>' +
        '</div>' +
        '<div class="level-picker" data-picker>' +
          '<button type="button" data-picker-toggle class="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-left text-sm text-white/40 hover:border-white/20 transition-all duration-300">Select a level…</button>' +
          '<input type="hidden" name="level[]" data-picker-value>' +
          '<div data-picker-dropdown class="hidden" style="position:absolute;z-index:20;margin-top:6px;width:100%;max-height:240px;overflow-y:auto;border-radius:0.75rem;border:1px solid rgba(255,255,255,0.1);background:#111;padding:6px">' +
            '<input type="text" data-picker-search placeholder="Search…" data-i18n-placeholder="submit.searchPlaceholder" class="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 mb-2 focus:outline-none focus:border-white/20">' +
            '<div data-picker-list class="flex flex-col gap-1"></div>' +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">' +
          '<input type="url" name="youtube[]" required placeholder="YouTube completion link" class="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20">' +
          '<input type="url" name="raw[]" required placeholder="Raw footage link (Drive/Disk)" class="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20">' +
        '</div>' +
        '<input type="number" name="percent[]" min="0" max="100" placeholder="Percent (auto)" data-requirement class="mt-3 h-11 w-40 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20">' +
      '</div>';
    return rowTemplate;
  }

  function addRecordRow() {
    var wrap = document.getElementById('record-rows');
    if (!wrap) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = buildRowHTML();
    var row = tmp.firstElementChild;
    wrap.appendChild(row);
    initPicker(row);
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#add-record-row')) {
      addRecordRow();
      return;
    }
    if (e.target.closest('[data-remove-row]')) {
      var row = e.target.closest('.record-row');
      if (row && document.querySelectorAll('.record-row').length > 1) row.remove();
    }
  });

  // init existing rows
  document.querySelectorAll('.record-row').forEach(initPicker);

  // ---------- Toast ----------
  function showToast(msg) {
    var t = document.getElementById('usl-toast');
    if (!t || !msg) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    t.style.display = 'block';
    setTimeout(function () { t.style.display = 'none'; t.classList.add('hidden'); }, 3500);
  }

  function readParam(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }

  var toast = readParam('toast');
  if (toast) showToast(toast);
  if (readParam('record') === 'success') showToast('Record submitted — pending review');

  // clean query params after showing toast
  if (toast || readParam('record')) {
    var url = window.location.pathname;
    window.history.replaceState(null, '', url);
  }
})();
