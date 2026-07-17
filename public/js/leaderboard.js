(function () {
  'use strict';

  var boards = document.querySelectorAll('[data-leaderboard]');
  boards.forEach(function (board) {
    var api = board.getAttribute('data-api');
    var detail = board.querySelector('[data-detail]');
    var searchInput = board.querySelector('[data-search-players]');

    function getRows() {
      return board.querySelectorAll('[data-select-id]');
    }

    function setActive(active) {
      getRows().forEach(function (r) {
        r.classList.remove('bg-white/10');
        r.classList.add('hover:bg-white/5');
      });
      active.classList.add('bg-white/10');
      active.classList.remove('hover:bg-white/5');
    }

    function bindClicks() {
      getRows().forEach(function (row) {
        row.addEventListener('click', function () {
          var id = row.getAttribute('data-select-id');
          fetch(api + '/' + encodeURIComponent(id), {
            headers: { 'X-Requested-With': 'fetch' }
          }).then(function (res) {
            return res.text();
          }).then(function (html) {
            detail.innerHTML = html;
            if (window.i18n && i18n.translate) i18n.translate(i18n.getLang());
            if (window.applyFlags) applyFlags(detail);
            setActive(row);
          }).catch(function () {});
        });
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var q = searchInput.value.toLowerCase().trim();
        getRows().forEach(function (row) {
          var name = (row.getAttribute('data-name') || row.textContent).toLowerCase();
          row.style.display = !q || name.indexOf(q) !== -1 ? '' : 'none';
        });
      });
    }

    bindClicks();
    if (window.applyFlags) applyFlags(board);
  });
})();
