(function () {
  var log = document.getElementById('chat-log');
  if (!log) return;

  var form = document.getElementById('chat-form');
  var input = form ? form.querySelector('input[name="message"]') : null;

  var lastId = 0;
  var ids = {};
  var msgs = log.querySelectorAll('.chat-msg');
  for (var i = 0; i < msgs.length; i++) {
    var id = parseInt(msgs[i].getAttribute('data-id'), 10);
    ids[id] = true;
    if (id > lastId) lastId = id;
  }
  var emptyEl = document.getElementById('chat-empty');

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatTime(utc) {
    if (!utc) return '';
    var d = new Date(utc.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return utc.substring(11, 16);
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  function scrollToBottom() {
    log.scrollTop = log.scrollHeight;
  }

  function render(m) {
    if (ids[m.id]) return; // avoid duplicates
    ids[m.id] = true;
    if (emptyEl) { emptyEl.remove(); emptyEl = null; }
    var div = document.createElement('div');
    div.setAttribute('data-id', m.id);
    div.className = 'chat-msg flex items-start gap-3';
    var initial = (m.username || '?').charAt(0).toUpperCase();
    var avatar = m.avatar_url
      ? '<img src="' + escapeHtml(m.avatar_url) + '" alt="' + escapeHtml(m.username) + '" class="w-8 h-8 rounded-full bg-white/10 border border-white/10 object-cover shrink-0">'
      : '<div class="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-xs font-bold text-white/60">' + escapeHtml(initial) + '</div>';
    div.innerHTML =
      avatar +
      '<div class="min-w-0">' +
        '<div class="text-xs text-white/40"><span class="font-medium text-white/70">' + escapeHtml(m.username) + '</span><span class="ml-1 text-white/20 chat-time" data-time="' + escapeHtml(m.created_at) + '">' + escapeHtml(formatTime(m.created_at)) + '</span></div>' +
        '<div class="text-sm text-white/90 break-words">' + escapeHtml(m.message) + '</div>' +
      '</div>';
    log.appendChild(div);
    if (m.id > lastId) lastId = m.id;
    scrollToBottom();
  }

  // WebSocket live updates
  var proto = location.protocol === 'https:' ? 'wss' : 'ws';
  var wsUrl = proto + '://' + location.host + '/ws/chat';
  var ws = null;
  var wsReady = false;

  function connect() {
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = function () { wsReady = true; };
      ws.onmessage = function (ev) {
        try {
          var data = JSON.parse(ev.data);
          if (data.type === 'message' && data.message) render(data.message);
        } catch (e) {}
      };
      ws.onclose = function () { wsReady = false; setTimeout(connect, 2000); };
      ws.onerror = function () { try { ws.close(); } catch (e) {} };
    } catch (e) {
      setTimeout(connect, 2000);
    }
  }
  connect();

  if (form && input) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ message: text })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.error === 'no-links') {
            alert('Links are not allowed in chat.');
          }
          // message will arrive via WebSocket broadcast (no local append to avoid dup)
        })
        .catch(function () {});
    });
  }

  scrollToBottom();
})();
