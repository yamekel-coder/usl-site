const auth = require('../middleware/auth');

function adminRequired(req, res, next) {
  const user = auth.getUserFromToken(req.cookies[auth.SESSION_COOKIE]);
  if (!user) {
    return res.redirect('/auth/login');
  }
  if (user.role !== 'admin') {
    return res.status(403).render('admin/forbidden', { user: null });
  }
  req.user = user;
  next();
}

function modRequired(req, res, next) {
  const user = auth.getUserFromToken(req.cookies[auth.SESSION_COOKIE]);
  if (!user) {
    return res.redirect('/auth/login');
  }
  if (user.role !== 'moderator' && user.role !== 'admin') {
    return res.status(403).render('admin/forbidden', { user: null });
  }
  req.user = user;
  next();
}

module.exports = { adminRequired, modRequired };
