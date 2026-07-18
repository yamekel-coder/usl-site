const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { adminRequired, modRequired } = require('../middleware/admin');
const audit = require('../lib/audit');
const rateLimit = require('../middleware/ratelimit');

const BANNER_DIR = path.join(__dirname, '..', 'public', 'uploads', 'banners');
if (!fs.existsSync(BANNER_DIR)) {
  fs.mkdirSync(BANNER_DIR, { recursive: true });
}

const bannerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, BANNER_DIR);
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, 'demon_' + Date.now() + '_' + Math.floor(Math.random() * 1e6) + ext);
  },
});

const bannerFilter = function (req, file, cb) {
  var allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  var ext = path.extname(file.originalname).toLowerCase();
  if (allowed.indexOf(ext) !== -1) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (png, jpg, gif, webp) are allowed'));
  }
};

const uploadBanner = multer({
  storage: bannerStorage,
  fileFilter: bannerFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Resolve banner_url: uploaded file takes priority, else keep provided URL
function resolveBanner(req, previous) {
  if (req.file) {
    return '/uploads/banners/' + req.file.filename;
  }
  if (typeof req.body.banner_url === 'string' && req.body.banner_url.trim()) {
    return req.body.banner_url.trim();
  }
  return previous || '';
}

function back(res, msg, path) {
  const q = msg ? '?toast=' + encodeURIComponent(msg) : '';
  res.redirect((path || '/admin') + q);
}

function sanitizeStr(v, maxLen) {
  if (typeof v !== 'string') return '';
  var s = v.trim();
  if (maxLen && s.length > maxLen) s = s.substring(0, maxLen);
  return s;
}

router.get('/', modRequired, function (req, res) {
  const section = req.query.section || 'dashboard';
  const type = req.query.type || '';
  const status = Object.prototype.hasOwnProperty.call(req.query, 'status') ? req.query.status : 'pending';

  if (section === 'applications' && req.user.role !== 'admin') {
    return res.status(403).render('admin/forbidden', { user: req.user });
  }
  if (section === 'activity' && req.user.role !== 'admin') {
    return res.status(403).render('admin/forbidden', { user: req.user });
  }

  const stats = db.getStats();
  const submissions = db.getSubmissions(type || null, status || null);
  const applicationStatus = Object.prototype.hasOwnProperty.call(req.query, 'applicationStatus') ? req.query.applicationStatus : 'pending';
  const moderatorApplications = db.getSubmissions('moderator', applicationStatus || null);
  const allUsers = db.getUsers();
  const USER_PAGE_SIZE = 25;
  const userPage = Math.max(1, parseInt(req.query.page, 10) || 1);
  const userTotalPages = Math.max(1, Math.ceil(allUsers.length / USER_PAGE_SIZE));
  const safeUserPage = Math.min(userPage, userTotalPages);
  const users = allUsers.slice((safeUserPage - 1) * USER_PAGE_SIZE, safeUserPage * USER_PAGE_SIZE);
  const team = db.getTeamMembers();
  const demons = db.getDemons();
  const records = db.getRecords(50);
  const news = db.getNews(20);

  // Get pending counts
  let pendingRecords = [];
  let levelRequests = [];
  try { pendingRecords = db.getPendingRecords(); } catch (e) {}
  try { levelRequests = db.getLevelRequests('pending'); } catch (e) {}

  // Format submissions for the template
  const formattedSubmissions = submissions.map(function (s) {
    let data;
    try {
      data = typeof s.data === 'string' ? JSON.parse(s.data) : (s.data || {});
    } catch (e) {
      data = {};
    }
    const fields = [];
    if (s.type === 'level-request' || s.type === 'level') {
      fields.push({ label: 'Name', value: data.name });
      fields.push({ label: 'Creator', value: data.creators });
      fields.push({ label: 'Verifier', value: data.verifier });
      fields.push({ label: 'Difficulty', value: data.difficulty });
      fields.push({ label: 'Video', value: data.video_url });
    } else if (s.type === 'moderator') {
      fields.push({ label: 'Age', value: data.age });
      fields.push({ label: 'Timezone', value: data.timezone });
      fields.push({ label: 'Hardest', value: data.hardest_level });
    }
    return {
      id: s.id,
      type: s.type,
      status: s.status,
      username: s.username,
      title: data.name || ('Application #' + s.id),
      fields: fields,
      data: data,
      created_at: s.created_at
    };
  });

  res.render('admin/index', {
    stats: stats,
    submissions: formattedSubmissions,
    moderatorApplications: moderatorApplications.map(formatSubmission),
    applicationStatus: applicationStatus,
    users: users,
    userPage: safeUserPage,
    userTotalPages: userTotalPages,
    allUsersCount: allUsers.length,
    team: team,
    demons: demons,
    records: records,
    news: news,
    pendingRecords: pendingRecords,
    levelRequests: levelRequests,
    activityLog: section === 'activity' ? db.getActivityLog(300) : [],
    section: section,
    flash: req.query.toast || null
  });
});

function parseSubmissionData(value) {
  try {
    return typeof value === 'string' ? JSON.parse(value) : (value || {});
  } catch (e) {
    return {};
  }
}

function formatSubmission(s) {
  const data = parseSubmissionData(s.data);
  return {
    id: s.id,
    type: s.type,
    status: s.status,
    username: s.username,
    user_id: s.user_id,
    created_at: s.created_at,
    updated_at: s.updated_at,
    data: data
  };
}

// ---- Level management (mod + admin) ----

router.post('/levels', modRequired, function (req, res) {
  const name = sanitizeStr(req.body.name, 100);
  if (!name) {
    return back(res, 'Level name is required', '/admin');
  }
  db.addDemon({
    name: name,
    creator: sanitizeStr(req.body.creator, 100),
    verifier: sanitizeStr(req.body.verifier, 100),
    level_id: sanitizeStr(req.body.level_id, 50),
    video_url: sanitizeStr(req.body.video_url, 500),
    banner_url: sanitizeStr(req.body.banner_url, 500),
    difficulty: ['Easy','Medium','Hard','Insane','Extreme'].includes(req.body.difficulty) ? req.body.difficulty : 'Insane',
    requirement: Math.min(100, Math.max(1, parseInt(req.body.requirement, 10) || 100)),
    position: req.body.position ? parseInt(req.body.position, 10) || null : null
  });
  back(res, 'Level added', '/admin');
});

router.post('/levels/:id', modRequired, uploadBanner.single('banner_file'), function (req, res) {
  const id = parseInt(req.params.id, 10);
  const fields = {};
  ['name', 'creator', 'verifier', 'level_id', 'video_url'].forEach(function (k) {
    if (req.body[k] !== undefined) fields[k] = sanitizeStr(req.body[k], k === 'name' ? 100 : 500);
  });
  if (req.file || (typeof req.body.banner_url === 'string' && req.body.banner_url.trim())) {
    fields.banner_url = resolveBanner(req);
  }
  if (req.body.difficulty !== undefined) {
    fields.difficulty = ['Easy','Medium','Hard','Insane','Extreme'].includes(req.body.difficulty) ? req.body.difficulty : 'Insane';
  }
  if (req.body.requirement !== undefined) {
    fields.requirement = Math.min(100, Math.max(1, parseInt(req.body.requirement, 10) || 100));
  }
  if (req.body.position !== undefined) {
    fields.position = req.body.position === '' ? null : (parseInt(req.body.position, 10) || null);
  }
  db.updateDemon(id, fields);
  back(res, 'Level updated', '/admin');
});

router.post('/levels/:id/delete', modRequired, function (req, res) {
  db.deleteDemon(parseInt(req.params.id, 10));
  back(res, 'Level deleted', '/admin');
});

// ---- Record review (mod + admin) ----

router.post('/records/:id/approve', modRequired, rateLimit({ keySuffix: 'rec-appr', max: 20, windowMs: 15000 }), function (req, res) {
  const id = parseInt(req.params.id, 10);
  const rec = db.getRecordById(id);
  const info = db.approveRecord(id);
  audit.log(req, 'record_approve', rec ? (rec.username + ' / ' + (rec.demon_name || rec.demon_id)) : ('#' + id), 'progress=' + (rec && rec.progress));
  back(res, info.changes ? 'Record approved' : 'Record already processed', '/admin');
});

router.post('/records/:id/reject', modRequired, rateLimit({ keySuffix: 'rec-rej', max: 20, windowMs: 15000 }), function (req, res) {
  const id = parseInt(req.params.id, 10);
  const rec = db.getRecordById(id);
  const info = db.rejectRecord(id);
  audit.log(req, 'record_reject', rec ? (rec.username + ' / ' + (rec.demon_name || rec.demon_id)) : ('#' + id), 'progress=' + (rec && rec.progress));
  back(res, info.changes ? 'Record rejected' : 'Record already processed', '/admin');
});

// ---- Record edit (mod + admin) ----

router.post('/records/:id/edit', modRequired, rateLimit({ keySuffix: 'rec-edit', max: 20, windowMs: 15000 }), function (req, res) {
  const id = parseInt(req.params.id, 10);
  const progress = parseInt(req.body.progress, 10);
  const status = ['pending', 'verified', 'rejected'].includes(req.body.status) ? req.body.status : 'pending';
  const youtube_url = (req.body.youtube_url || '').trim().slice(0, 500);
  const platform = (req.body.platform || '').trim().slice(0, 50);
  const rec = db.getRecordById(id);
  if (!rec) {
    return back(res, 'Record not found', '/admin');
  }
  if (isNaN(progress) || progress < 0 || progress > 100) {
    return back(res, 'Progress must be 0-100', '/admin');
  }
  db.updateRecord(id, progress, status, youtube_url, platform);
  audit.log(req, 'record_edit', rec.username + ' / ' + (rec.demon_name || rec.demon_id), 'progress=' + progress + ' status=' + status);
  back(res, 'Record updated', '/admin');
});

// ---- Submissions approve/reject ----

router.post('/submissions/:id/approve', modRequired, function (req, res) {
  const id = parseInt(req.params.id, 10);
  const sub = db.getSubmissions(null, null).find(function (s) { return s.id === id; });
  if (!sub) {
    return back(res, 'Submission not found', '/admin');
  }
  if (sub.type === 'moderator') {
    db.setUserRole(sub.user_id, 'moderator');
  } else if (sub.type === 'level-request') {
    let data;
    try { data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data; } catch (e) { data = {}; }
    db.addDemon({
      name: data.name || 'Unknown',
      creator: data.creators || null,
      verifier: data.verifier || null,
      level_id: data.level_id || null,
      video_url: data.video_url || null,
      banner_url: data.banner_url || null,
      difficulty: data.difficulty || 'Insane',
      requirement: data.requirement || 100,
      position: null
    });
  }
  db.updateSubmissionStatus(id, 'approved');
  back(res, 'Submission approved', '/admin');
});

router.post('/submissions/:id/reject', modRequired, function (req, res) {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().substring(0, 500) : '';
  db.updateSubmissionStatus(parseInt(req.params.id, 10), 'rejected', reason);
  back(res, 'Submission rejected', '/admin');
});

// ---- Level requests (mod + admin) ----

router.get('/publish/:requestId', modRequired, function (req, res) {
  const requestId = parseInt(req.params.requestId, 10);
  const sub = db.getSubmissions('level-request', null).find(function (s) { return s.id === requestId; });
  if (!sub) {
    return back(res, 'Level request not found', '/admin');
  }
  let data;
  try { data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data; } catch (e) { data = {}; }

  const demons = db.getDemons();
  const maxPos = demons.reduce(function (m, d) { return d.position && d.position > m ? d.position : m; }, 0);

  res.render('admin/publish', {
    user: req.user,
    request: sub,
    data: data,
    nextPosition: maxPos + 1,
    demons: demons,
    mode: 'request'
  });
});

router.get('/publish-new', modRequired, function (req, res) {
  const demons = db.getDemons();
  const maxPos = demons.reduce(function (m, d) { return d.position && d.position > m ? d.position : m; }, 0);

  res.render('admin/publish', {
    user: req.user,
    request: null,
    data: {},
    nextPosition: maxPos + 1,
    demons: demons,
    mode: 'new'
  });
});

router.post('/publish-new', modRequired, uploadBanner.single('banner_file'), function (req, res) {
  const name = sanitizeStr(req.body.name, 100);
  if (!name) {
    return back(res, 'Level name is required', '/admin/publish-new');
  }

  db.addDemon({
    name: name,
    creator: sanitizeStr(req.body.creator, 100),
    verifier: sanitizeStr(req.body.verifier, 100),
    level_id: sanitizeStr(req.body.level_id, 50),
    video_url: sanitizeStr(req.body.video_url, 500),
    banner_url: resolveBanner(req),
    difficulty: ['Easy','Medium','Hard','Insane','Extreme'].includes(req.body.difficulty) ? req.body.difficulty : 'Insane',
    requirement: Math.min(100, Math.max(1, parseInt(req.body.requirement, 10) || 100)),
    position: req.body.position ? parseInt(req.body.position, 10) : null
  });
  back(res, 'Level created and published', '/admin?section=publish');
});

router.post('/publish/:requestId', modRequired, uploadBanner.single('banner_file'), function (req, res) {
  const requestId = parseInt(req.params.requestId, 10);
  const sub = db.getSubmissions('level-request', null).find(function (s) { return s.id === requestId; });
  if (!sub) {
    return back(res, 'Level request not found', '/admin');
  }

  const name = sanitizeStr(req.body.name, 100);
  if (!name) {
    return back(res, 'Level name is required', '/admin?section=publish');
  }

  db.addDemon({
    name: name,
    creator: sanitizeStr(req.body.creator, 100),
    verifier: sanitizeStr(req.body.verifier, 100),
    level_id: sanitizeStr(req.body.level_id, 50),
    video_url: sanitizeStr(req.body.video_url, 500),
    banner_url: resolveBanner(req),
    difficulty: ['Easy','Medium','Hard','Insane','Extreme'].includes(req.body.difficulty) ? req.body.difficulty : 'Insane',
    requirement: Math.min(100, Math.max(1, parseInt(req.body.requirement, 10) || 100)),
    position: req.body.position ? parseInt(req.body.position, 10) : null
  });
  db.updateSubmissionStatus(requestId, 'approved');
  back(res, 'Level published to the list', '/admin?section=publish');
});

router.post('/level-requests/:id/approve', modRequired, function (req, res) {
  const ok = db.approveLevelRequest(parseInt(req.params.id, 10));
  back(res, ok ? 'Level request approved — added to list' : 'Request already processed', '/admin');
});

router.post('/level-requests/:id/reject', modRequired, function (req, res) {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().substring(0, 500) : '';
  db.updateSubmissionStatus(parseInt(req.params.id, 10), 'rejected', reason);
  back(res, 'Level request rejected', '/admin');
});

// ---- News (mod + admin) ----

router.post('/news', modRequired, function (req, res) {
  const title = sanitizeStr(req.body.title, 200);
  const description = sanitizeStr(req.body.description, 5000);
  if (!title || !description) {
    return back(res, 'Title and description are required', '/admin');
  }
  db.createNews(req.user.id, title, description);
  back(res, 'News published', '/admin');
});

router.post('/news/:id/delete', modRequired, function (req, res) {
  db.get().prepare('DELETE FROM news WHERE id = ?').run(parseInt(req.params.id, 10));
  back(res, 'News deleted', '/admin');
});

// ---- Moderator applications (admin only) ----

router.post('/mod-applications/:id/approve', adminRequired, function (req, res) {
  const sub = db.getSubmissions('moderator', 'pending').find(function (s) { return s.id === parseInt(req.params.id, 10); });
  if (sub) {
    db.setUserRole(sub.user_id, 'moderator');
    db.updateSubmissionStatus(sub.id, 'approved');
    return back(res, 'Moderator application approved', '/admin');
  }
  back(res, 'Application not found', '/admin');
});

router.post('/mod-applications/:id/reject', adminRequired, function (req, res) {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().substring(0, 500) : '';
  db.updateSubmissionStatus(parseInt(req.params.id, 10), 'rejected', reason);
  back(res, 'Moderator application rejected', '/admin');
});

router.post('/mod-applications/:id/close', adminRequired, function (req, res) {
  const info = db.updateSubmissionStatus(parseInt(req.params.id, 10), 'rejected');
  back(res, info.changes ? 'Moderator application closed' : 'Application already closed', '/admin?section=applications');
});

// ---- User management (admin only) ----

router.post('/users/:id/role', adminRequired, function (req, res) {
  const id = parseInt(req.params.id, 10);
  const role = sanitizeStr(req.body.role, 20);
  if (id === req.user.id) {
    return back(res, 'You cannot change your own role', '/admin');
  }
  if (role !== 'user' && role !== 'moderator' && role !== 'admin') {
    return back(res, 'Invalid role', '/admin');
  }
  db.setUserRole(id, role);
  back(res, 'User role updated', '/admin');
});

router.post('/users/:id/country', adminRequired, function (req, res) {
  db.setUserCountry(parseInt(req.params.id, 10), sanitizeStr(req.body.country, 100));
  back(res, 'User country updated', '/admin');
});

router.post('/users/:id/ban', adminRequired, rateLimit({ keySuffix: 'ban', max: 15, windowMs: 15000 }), function (req, res) {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) {
    return back(res, 'You cannot ban yourself', '/admin');
  }
  const target = db.getUserById ? db.getUserById(id) : null;
  db.banUser(id);
  db.purgeUserContent(id);
  audit.log(req, 'ban', target ? (target.username + ' (id#' + id + ')') : ('id#' + id), 'email=' + (target && target.email));
  back(res, 'User banned and all their submissions, records and sessions removed', '/admin?section=users');
});

router.post('/users/:id/unban', adminRequired, function (req, res) {
  const id = parseInt(req.params.id, 10);
  db.unbanUser(id);
  back(res, 'User unbanned', '/admin?section=users');
});

router.post('/users/:id/delete', adminRequired, function (req, res) {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) {
    return back(res, 'You cannot delete yourself', '/admin');
  }
  db.deleteUser(id);
  back(res, 'User deleted', '/admin?section=users');
});

// ---- Manual record granting (mod + admin) ----
router.post('/users/:id/add-record', modRequired, function (req, res) {
  const userId = parseInt(req.params.id, 10);
  const demonId = parseInt(req.body.demon_id, 10);
  const percent = parseInt(req.body.percent, 10);
  const youtube = sanitizeStr(req.body.youtube_url, 500);
  const raw = sanitizeStr(req.body.raw_footage_url, 500);
  const platform = sanitizeStr(req.body.platform, 50);
  const comment = sanitizeStr(req.body.comment, 500);

  const user = db.getUserById(userId);
  if (!user) return back(res, 'User not found', '/admin?section=users');
  const demon = db.getDemonById(demonId);
  if (!demon) return back(res, 'Level not found', '/admin?section=users');

  const progress = isNaN(percent) ? (demon.requirement || 100) : Math.max(0, Math.min(100, percent));
  const recordId = db.createRecord(userId, {
    demon_id: demon.id,
    progress: progress,
    youtube_url: youtube || null,
    raw_footage_url: raw || null,
    platform: platform || null,
    comment: comment || null
  });
  db.approveRecord(recordId);
  back(res, 'Record granted to ' + user.username, '/admin?section=users');
});

module.exports = router;
