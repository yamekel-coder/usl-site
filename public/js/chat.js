(function () {
  var log = document.getElementById('chat-log');
  if (!log) return;

  var form = document.querySelector('#chat-log').closest('div').querySelector('form');
  var input = form ? form.querySelector('input[name="message"]') : null;

  var lastId = 0;
  var msgs = log.querySelectorAll('.chat-msg');
  for (var i = 0; i < msgs.length; i++) {
    var id = parseInt(msgs[i].getAttribute('data-id'), 10);
    if (id > lastId) lastId = id;
  }
  var emptyEl = document.getElementById('chat-empty');

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Convert UTC "YYYY-MM-DD HH:MM:SS" → local HH:MM
  function formatTime(utc) {
    if (!utc) return '';
    var d = new Date(utc.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return utc.substring(11, 16);
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  function refreshTimes() {
    var spans = log.querySelectorAll('.chat-time');
    for (var i = 0; i < spans.length; i++) {
      var t = spans[i].getAttribute('data-time');
      if (t) spans[i].textContent = formatTime(t);
    }
  }

  function scrollToBottom() {
    log.scrollTop = log.scrollHeight;
  }

  function render(m) {
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
    lastId = m.id;
  }

  function appendLocal(m) {
    render(m);
    scrollToBottom();
  }

  function poll() {
    fetch('/chat/messages?since=' + lastId, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = (data.messages || []);
        if (list.length) {
          list.forEach(appendLocal);
        }
      })
      .catch(function () {});
  }

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
          if (data && data.ok && data.message) {
            appendLocal(data.message);
          } else if (data && data.error === 'no-links') {
            alert('Links are not allowed in chat.');
          }
        })
        .catch(function () {});
    });
  }

  scrollToBottom();
  refreshTimes();
  setInterval(poll, 1500);
  setInterval(refreshTimes, 30000);
})();
