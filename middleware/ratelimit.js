// Simple in-memory rate limiter to stop scripted abuse of actions (POSTs).
// Keyed by IP + route. Stores hit timestamps and rejects when over the limit
// within the window. Not distributed (single process) — sufficient for VDS.

const buckets = new Map();

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '127.0.0.1';
}

// opts: { windowMs, max, keySuffix }
function rateLimit(opts) {
  const windowMs = opts && opts.windowMs ? opts.windowMs : 15000; // 15s
  const max = opts && opts.max ? opts.max : 10;
  const suffix = opts && opts.keySuffix ? opts.keySuffix : '';

  return function (req, res, next) {
    const ip = getClientIp(req);
    const key = ip + ':' + (suffix || req.path);
    const now = Date.now();
    let entry = buckets.get(key);
    if (!entry) {
      entry = { hits: [], blockedUntil: 0 };
      buckets.set(key, entry);
    }
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return res.status(429).json
        ? res.status(429).json({ error: 'Too many requests, slow down.' })
        : res.status(429).send('Too many requests, slow down.');
    }
    entry.hits = entry.hits.filter(function (t) { return now - t < windowMs; });
    entry.hits.push(now);
    if (entry.hits.length > max) {
      entry.blockedUntil = now + windowMs;
      entry.hits = [];
      return res.status(429).json
        ? res.status(429).json({ error: 'Too many requests, slow down.' })
        : res.status(429).send('Too many requests, slow down.');
    }
    next();
  };
}

module.exports = rateLimit;
