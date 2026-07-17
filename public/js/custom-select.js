(function () {
  'use strict';

    function flagEmoji(code) {
      if (!code || code.length !== 2) return '';
      var A = 0x1F1E6;
      var base = 'A'.charCodeAt(0);
      var c1 = code.toUpperCase().charCodeAt(0) - base;
      var c2 = code.toUpperCase().charCodeAt(1) - base;
      if (c1 < 0 || c1 > 25 || c2 < 0 || c2 > 25) return '';
      return String.fromCodePoint(A + c1) + String.fromCodePoint(A + c2);
    }

  function initCustomSelect(el) {
    if (el.dataset.initialized === '1') return;
    el.dataset.initialized = '1';

    var options = JSON.parse(el.getAttribute('data-options') || '[]');
    var name = el.getAttribute('data-name') || 'country';
    var current = el.getAttribute('data-current') || '';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'usl-select__trigger';
    trigger.innerHTML =
      '<span class="usl-select__flag"></span>' +
      '<span class="usl-select__value"></span>' +
      '<svg class="usl-select__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>';

    var panel = document.createElement('div');
    panel.className = 'usl-select__panel';

    var search = document.createElement('input');
    search.type = 'text';
    search.className = 'usl-select__search';
    search.placeholder = 'Search…';

    var list = document.createElement('div');
    list.className = 'usl-select__list';

    panel.appendChild(search);
    panel.appendChild(list);

    // hidden input for form submit
    var hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = name;
    hidden.value = current;

    function render(filter) {
      list.innerHTML = '';
      var f = (filter || '').toLowerCase();
      var visible = 0;
      options.forEach(function (opt) {
        if (f && opt.name.toLowerCase().indexOf(f) === -1) return;
        visible++;
        var o = document.createElement('div');
        o.className = 'usl-select__opt' + (opt.name === current ? ' selected' : '');
        o.dataset.value = opt.name;
        var fe = flagEmoji(opt.code);
        o.innerHTML = (fe ? '<span class="usl-select__flag">' + fe + '</span>' : '') + '<span>' + opt.name + '</span>';
        o.addEventListener('click', function () {
          current = opt.name;
          hidden.value = opt.name;
          updateTrigger();
          close();
        });
        list.appendChild(o);
      });
      if (visible === 0) {
        var empty = document.createElement('div');
        empty.className = 'usl-select__empty';
        empty.textContent = 'No matches';
        list.appendChild(empty);
      }
    }

    function updateTrigger() {
      var flag = trigger.querySelector('.usl-select__flag');
      var val = trigger.querySelector('.usl-select__value');
      if (current) {
        var found = options.filter(function (o) { return o.name === current; })[0];
        var fe = flagEmoji(found ? found.code : '');
        flag.textContent = fe;
        flag.style.display = fe ? '' : 'none';
        val.textContent = current;
      } else {
        flag.textContent = '';
        flag.style.display = 'none';
        val.textContent = '—';
      }
    }

    function open() {
      el.classList.add('open');
      render('');
      search.value = '';
      search.focus();
    }
    function close() {
      el.classList.remove('open');
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (el.classList.contains('open')) close();
      else open();
    });
    search.addEventListener('input', function () { render(search.value); });
    search.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function (e) {
      if (!el.contains(e.target)) close();
    });

    el.appendChild(trigger);
    el.appendChild(panel);
    el.appendChild(hidden);
    updateTrigger();
  }

  function initAll() {
    document.querySelectorAll('.usl-select').forEach(initCustomSelect);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.initCustomSelects = initAll;
})();
