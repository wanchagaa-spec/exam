/**
 * หลังบ้านเว็บไซต์ "ข้อสอบ" — Google Apps Script
 *
 * รองรับ: สมัคร/ล็อกอินสมาชิกด้วยอีเมล, สุ่มข้อสอบจากคลังใหญ่ + จับเวลา + ตรวจให้คะแนน,
 *          ฟอร์มติดต่อ (ส่งอีเมล), บอร์ดความคิดเห็นแบบโพส/ถูกใจ/คอมเมนต์ (คล้าย Facebook),
 *          หน้าแอดมิน (admin.html) สำหรับเพิ่ม/ลบข้อสอบพร้อมเฉลยเต็มในคลัง
 *
 * ⚠ ไฟล์นี้คือที่เก็บเฉลยข้อสอบ ห้ามคัดลอกคอลัมน์ "answer" ไปไว้ในหน้าเว็บเด็ดขาด
 *   หน้าเว็บขอชุดคำถามจากที่นี่ (ไม่มีเฉลยติดไปด้วย) แล้วส่งคำตอบกลับมาให้เซิร์ฟเวอร์ตรวจ
 *
 * วิธีตั้งค่า (ดูรายละเอียดเต็มใน README.md):
 *   1. สร้าง Google Sheet ใหม่ ตั้งชื่อ Sheet ตามหัวข้อ "โครงสร้างชีตที่ต้องมี" ด้านล่าง
 *   2. เปิด Extensions → Apps Script วางไฟล์นี้ทับ
 *   3. แก้ TOKEN ให้ตรงกับ APP.token ใน assets/site.js
 *   4. แก้ ADMIN_PASSWORD เป็นรหัสผ่านของผู้ดูแลเว็บไซต์ (ใช้เข้าหน้า admin.html)
 *   5. แก้ CONTACT_EMAIL เป็นอีเมลที่จะรับข้อความจากฟอร์มติดต่อ
 *   6. Deploy → New deployment → Web app → Execute as: Me / Who has access: Anyone
 *   7. เอา URL ที่ได้ไปใส่ใน APP.endpoint (assets/site.js) แล้วตั้ง APP.demoMode = false
 *
 * โครงสร้างชีตที่ต้องมี (สร้างเองใน Google Sheet เดียวกัน):
 *   Users      : timestamp | email | name | age | school | passHash | avatar
 *               ── ล็อกอินด้วยอีเมล (ไม่มี username แล้ว), avatar = data URL รูปย่อขนาดแล้วจากฝั่งเว็บ (เก็บตรงในเซลล์)
 *   Contact    : timestamp | name | email | message
 *   Posts      : id | timestamp | email | name | subject | text | likeCount | commentCount
 *               ── โพสของบอร์ดความคิดเห็น (แสดงในหน้า news.html) subject ต้องตรงกับ slug ใน assets/demo-data.js
 *                  likeCount/commentCount เก็บตัวเลขสรุปตรงในแถวเลย ไม่ต้องนับจากชีต Likes/Comments ทุกครั้งที่โหลดฟีด
 *   Likes      : postId | email
 *               ── 1 แถวต่อ 1 คนที่กดถูกใจ 1 โพส (ใช้เช็คว่าคนนี้เคยกดหรือยัง และลบแถวเมื่อกดยกเลิก)
 *   Comments   : id | postId | timestamp | email | name | text
 *   Notifications : id | recipientEmail | type | postId | actorName | timestamp | read
 *               ── แจ้งเตือนเมื่อมีคนกดถูกใจ/คอมเมนต์โพสต์ของเรา (เช็กยอดตอนโหลดหน้าเว็บ ไม่ใช่ real-time)
 *   Results    : timestamp | subject | email | name | score | total | percent | passed | usedSeconds | auto
 *   Blueprint  : subject | configName | active | order | strand | count
 *               ── "โครงสร้างชุดข้อสอบ" ของแต่ละวิชา แต่ละวิชามีได้หลายชุด (configName ตั้งชื่อเอง)
 *                  ชุดที่ active = TRUE คือชุดที่ระบบใช้สุ่มข้อสอบจริงตอนนักเรียนทำข้อสอบ (มีได้ทีละ 1 ชุดต่อวิชา)
 *                  จัดการผ่านหน้า admin.html ได้เลย ไม่ต้องพิมพ์ในชีตเอง (ระบบสร้าง/แก้ให้อัตโนมัติ)
 *   Q_<slug>   : id | type | text | options | answer | score | note | strand
 *               ── หนึ่งชีตต่อหนึ่งวิชา ชื่อชีตต้องขึ้นต้นด้วย Q_ แล้วตามด้วย slug ของวิชา
 *                  เช่น Q_math1, Q_physics (slug ต้องตรงกับใน assets/demo-data.js)
 *               type    : "mc" (ปรนัย) / "tf" (ถูก/ผิด) / "fill" (เติมคำตอบ พิมพ์เอง)
 *               options : ตัวเลือกคั่นด้วย | เช่น  60–80 ครั้ง/นาที|80–100 ครั้ง/นาที|100–120 ครั้ง/นาที
 *                         type เป็น tf หรือ fill ปล่อยว่างได้ (tf ใช้ ถูก|ผิด ให้อัตโนมัติ, fill ไม่มีตัวเลือก)
 *               answer  : ข้อความคำตอบที่ถูก ต้องตรงกับหนึ่งใน options เป๊ะ ๆ (type mc/tf)
 *                         type fill ใส่คำตอบที่ยอมรับได้หลายแบบ คั่นด้วย | เช่น 10|๑๐|สิบ — ตอบถูกถ้าตรงแบบใดแบบหนึ่ง
 *               score   : คะแนนของข้อนั้น (ปล่อยว่าง = 1 คะแนน)
 *               note    : คำอธิบายเฉลย (ไม่บังคับ) พิมพ์สมการคณิตศาสตร์แบบ LaTeX ได้ เช่น $x^2+1$
 *               strand  : สาระ/หมวดเนื้อหาของข้อนี้ ต้องตรงกับชื่อใน SUBJECT_STRANDS (assets/demo-data.js) เป๊ะ ๆ
 *                         ใช้ตอนสุ่มข้อสอบแยกตามโครงสร้างชุดข้อสอบ (Blueprint)
 */

const TOKEN          = 'ai75jg8f3d9g7k3';         // ★ ต้องตรงกับ APP.token ใน assets/site.js
const ADMIN_PASSWORD = 'b31208d89d';              // ★ ต้องเปลี่ยนก่อนใช้งานจริง — รหัสผ่านเข้าหน้า admin.html
const SHEET_ID       = '';                        // ★ เว้นว่างได้ถ้าผูกกับชีตอยู่แล้ว
const CONTACT_EMAIL  = 'contact@example.com';     // ★ อีเมลที่จะรับข้อความจากฟอร์มติดต่อ
const CACHE_SECONDS  = 7200;                       // อายุเซสชันข้อสอบ (วินาที) สูงสุด 21600

function ss_() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#26123f').setFontColor('#FFFFFF');
  }
  return sh;
}

/* ══════════════════════════ doGet ══════════════════════════ */
function doGet(e) {
  const p = (e && e.parameter) || {};

  if (p.action === 'exam') {
    if (p.token !== TOKEN) return json({ ok: false, error: 'unauthorized' });
    return json(serveExam(p.subject));
  }

  if (p.action === 'blueprint') {
    if (p.token !== TOKEN) return json({ ok: false, error: 'unauthorized' });
    return json({ ok: true, sections: getBlueprint_(p.subject) });
  }

  return json({ ok: true, msg: 'exam site endpoint' });
}

/* action ที่แค่อ่านข้อมูล ไม่แก้ไขอะไร — ข้ามการล็อกได้ ไม่ต้องรอคิวหลังไมค์การเขียนของคนอื่น
   (ช่วยให้การโหลดบอร์ด/รายการต่าง ๆ เร็วขึ้น โดยเฉพาะเวลามีคนใช้งานพร้อมกันหลายคน) */
const READ_ONLY_ACTIONS = new Set([
  'login', 'blueprint', 'listPosts', 'listComments', 'listNotifications',
  'adminLogin', 'adminListQuestions', 'adminListBlueprintConfigs'
]);

/* ══════════════════════════ doPost ══════════════════════════ */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return json({ ok: false, error: 'unauthorized' });

    if (READ_ONLY_ACTIONS.has(body.action)) {
      return json(routeAction_(body));
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      return json(routeAction_(body));
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function routeAction_(body) {
  switch (body.action) {
    case 'register':            return register(body);
    case 'login':                return login(body);
    case 'blueprint':            return { ok: true, sections: getBlueprint_(body.subject) };
    case 'updateAvatar':         return updateAvatar(body);
    case 'contact':              return contact(body);
    case 'submitExam':           return submitExam(body);
    case 'createPost':           return createPost(body);
    case 'listPosts':            return listPosts(body);
    case 'deletePost':           return deletePost(body);
    case 'toggleLike':           return toggleLike(body);
    case 'addComment':           return addComment(body);
    case 'listComments':         return listComments(body);
    case 'deleteComment':        return deleteComment(body);
    case 'listNotifications':    return listNotifications(body);
    case 'markNotificationsRead': return markNotificationsRead(body);
    case 'adminLogin':           return adminLogin(body);
    case 'adminListQuestions':   return adminListQuestions(body);
    case 'adminAddQuestion':     return adminAddQuestion(body);
    case 'adminDeleteQuestion':  return adminDeleteQuestion(body);
    case 'adminListBlueprintConfigs':  return adminListBlueprintConfigs(body);
    case 'adminSaveBlueprintConfig':   return adminSaveBlueprintConfig(body);
    case 'adminDeleteBlueprintConfig': return adminDeleteBlueprintConfig(body);
    case 'adminSetActiveBlueprintConfig': return adminSetActiveBlueprintConfig(body);
    default:                     return { ok: false, error: 'unknown action' };
  }
}

/* ══════════════════════════ สมาชิก (ล็อกอินด้วยอีเมล) ══════════════════════════ */
function hashPass_(email, password) {
  const raw = String(email).toLowerCase() + ':' + password + ':' + TOKEN;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(b => (b + 256).toString(16).slice(-2)).join('');
}

function looksLikeEmail_(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')); }

function usersSheet_() { return sheet_('Users', ['timestamp', 'email', 'name', 'age', 'school', 'passHash', 'avatar']); }

function register(body) {
  const email    = clean(String(body.email || '').trim().toLowerCase());
  const name     = clean(String(body.name || '').trim());
  const age      = Number(body.age) || 0;
  const school   = clean(String(body.school || '').trim());
  const password = String(body.password || '');
  if (!email || !looksLikeEmail_(email)) return { ok: false, error: 'อีเมลไม่ถูกต้อง' };
  if (!name || !school || age < 1 || age > 120 || password.length < 6)
    return { ok: false, error: 'ข้อมูลไม่ครบ หรือรหัสผ่านสั้นเกินไป' };

  const sh = usersSheet_();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === email) return { ok: false, error: 'มีอีเมลนี้สมัครไว้แล้ว' };
  }
  sh.appendRow([new Date(), email, name, age, school, hashPass_(email, password), '']);
  return { ok: true, email, name, age, school, avatar: '' };
}

function login(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const sh = usersSheet_();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === email) {
      if (rows[i][5] === hashPass_(email, password)) {
        return { ok: true, email, name: rows[i][2], age: rows[i][3], school: rows[i][4], avatar: rows[i][6] || '' };
      }
      return { ok: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
    }
  }
  return { ok: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
}

/** อัปเดตรูปโปรไฟล์ (data URL ที่ย่อขนาดแล้วจากฝั่งเว็บ) — เก็บตรง ๆ ในเซลล์ชีต ไม่มีระบบเก็บไฟล์แยก */
function updateAvatar(body) {
  const email  = String(body.email || '').trim().toLowerCase();
  const avatar = String(body.avatar || '');
  if (!email) return { ok: false, error: 'ไม่ได้ระบุอีเมล' };
  if (avatar.length > 45000) return { ok: false, error: 'ไฟล์รูปใหญ่เกินไป' };

  const sh = usersSheet_();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === email) {
      sh.getRange(i + 1, 7).setValue(avatar);
      return { ok: true, avatar };
    }
  }
  return { ok: false, error: 'ไม่พบบัญชีนี้' };
}

/* ══════════════════════════ ติดต่อ ══════════════════════════ */
function contact(body) {
  const name = clean(body.name), email = clean(body.email), text = clean(body.text);
  if (!name || !email || !text) return { ok: false, error: 'กรอกข้อมูลไม่ครบ' };

  sheet_('Contact', ['timestamp', 'name', 'email', 'message']).appendRow([new Date(), name, email, text]);

  try {
    MailApp.sendEmail(CONTACT_EMAIL, 'ข้อความติดต่อใหม่จากเว็บไซต์ข้อสอบ',
      'จาก: ' + name + ' <' + email + '>\n\n' + text);
  } catch (err) { /* ส่งอีเมลไม่สำเร็จก็ยังบันทึกลงชีตไว้แล้ว ไม่ทำให้ทั้งคำขอ error */ }

  return { ok: true };
}

/* ══════════════════════════ บอร์ดความคิดเห็น (โพส/ถูกใจ/คอมเมนต์) ══════════════════════════ */
/** commentCount เก็บตรงในแถวโพสต์เลย (เหมือน likeCount) กันไม่ต้องสแกนทั้งชีต Comments ทุกครั้งที่ดึงฟีด
    คอลัมน์ใหม่ต่อท้ายชีตเดิม แถวเก่าที่ยังไม่มีค่านี้จะอ่านได้ค่าว่าง ตีความเป็น 0 ให้อัตโนมัติ ไม่ต้อง migrate */
function postsSheet_()    { return sheet_('Posts', ['id', 'timestamp', 'email', 'name', 'subject', 'text', 'likeCount', 'commentCount']); }
function likesSheet_()    { return sheet_('Likes', ['postId', 'email']); }
function commentsSheet_() { return sheet_('Comments', ['id', 'postId', 'timestamp', 'email', 'name', 'text']); }

function createPost(body) {
  const email   = clean(String(body.email || '').trim().toLowerCase());
  const name    = clean(String(body.name || '').trim());
  const subject = clean(String(body.subject || '').trim());
  const text    = clean(String(body.text || '').trim());
  if (!email || !name || !subject || !text) return { ok: false, error: 'กรอกข้อมูลไม่ครบ' };

  const id = 'p_' + Utilities.getUuid().slice(0, 10);
  const timestamp = new Date();
  postsSheet_().appendRow([id, timestamp, email, name, subject, text, 0, 0]);
  return { ok: true, post: { id, timestamp: timestamp.toISOString(), email, name, subject, text, likeCount: 0, commentCount: 0, likedByMe: false } };
}

function listPosts(body) {
  const subject     = String(body.subject || '').trim();
  const authorEmail = String(body.authorEmail || '').trim().toLowerCase();
  const sort        = body.sort === 'likes' ? 'likes' : 'new';
  const viewerEmail = String(body.viewerEmail || '').trim().toLowerCase();

  const rows = postsSheet_().getDataRange().getValues();
  const likedSet = new Set();
  if (viewerEmail) {
    likesSheet_().getDataRange().getValues().slice(1).forEach(r => {
      if (String(r[1] || '').toLowerCase() === viewerEmail) likedSet.add(String(r[0]));
    });
  }

  const posts = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    if (subject && String(r[4]) !== subject) continue;
    if (authorEmail && String(r[2]).toLowerCase() !== authorEmail) continue;
    posts.push({
      id: String(r[0]),
      timestamp: (r[1] instanceof Date ? r[1] : new Date(r[1])).toISOString(),
      email: String(r[2] || ''),
      name: String(r[3] || ''),
      subject: String(r[4] || ''),
      text: String(r[5] || ''),
      likeCount: Number(r[6]) || 0,
      commentCount: Number(r[7]) || 0,
      likedByMe: likedSet.has(String(r[0]))
    });
  }

  posts.sort((a, b) => sort === 'likes'
    ? (b.likeCount - a.likeCount) || (new Date(b.timestamp) - new Date(a.timestamp))
    : (new Date(b.timestamp) - new Date(a.timestamp)));

  return { ok: true, posts };
}

/** หาแถวของโพสต์จาก id คืน { sheet, rowIndex (1-based), row } หรือ null ถ้าไม่เจอ */
function findPostRow_(postId) {
  const sh = postsSheet_();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === postId) return { sheet: sh, rowIndex: i + 1, row: rows[i] };
  }
  return null;
}

/** ปรับ commentCount ของแถวโพสต์ที่หาไว้แล้ว (จาก findPostRow_) ไม่อ่านชีตซ้ำ */
function bumpCommentCount_(found, delta) {
  const current = Number(found.row[7]) || 0;
  found.sheet.getRange(found.rowIndex, 8).setValue(Math.max(0, current + delta));
}

/** ลบโพสต์ (เจ้าของเท่านั้น) พร้อมล้างคอมเมนต์/ถูกใจของโพสต์นั้นทิ้งด้วย */
function deletePost(body) {
  const postId = String(body.postId || '').trim();
  const email  = String(body.email || '').trim().toLowerCase();
  if (!postId || !email) return { ok: false, error: 'ข้อมูลไม่ครบ' };

  const postSh = postsSheet_();
  const postRows = postSh.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < postRows.length; i++) {
    if (String(postRows[i][0]) === postId) { rowIndex = i + 1; break; }
  }
  if (rowIndex < 0) return { ok: false, error: 'ไม่พบโพสต์นี้' };
  if (String(postRows[rowIndex - 1][2]).toLowerCase() !== email) return { ok: false, error: 'ลบได้เฉพาะโพสต์ของตัวเอง' };
  postSh.deleteRow(rowIndex);

  const commentSh = commentsSheet_();
  const commentRows = commentSh.getDataRange().getValues();
  for (let i = commentRows.length - 1; i >= 1; i--) {
    if (String(commentRows[i][1]) === postId) commentSh.deleteRow(i + 1);
  }

  const likeSh = likesSheet_();
  const likeRows = likeSh.getDataRange().getValues();
  for (let i = likeRows.length - 1; i >= 1; i--) {
    if (String(likeRows[i][0]) === postId) likeSh.deleteRow(i + 1);
  }

  return { ok: true };
}

/** ลบคอมเมนต์ (เจ้าของคอมเมนต์เท่านั้น ไม่ว่าจะไปคอมเมนต์ที่โพสต์ใคร) */
function deleteComment(body) {
  const commentId = String(body.commentId || '').trim();
  const email     = String(body.email || '').trim().toLowerCase();
  if (!commentId || !email) return { ok: false, error: 'ข้อมูลไม่ครบ' };

  const sh = commentsSheet_();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === commentId) {
      if (String(rows[i][3]).toLowerCase() !== email) return { ok: false, error: 'ลบได้เฉพาะความคิดเห็นของตัวเอง' };
      const postId = String(rows[i][1]);
      sh.deleteRow(i + 1);
      const found = findPostRow_(postId);
      if (found) bumpCommentCount_(found, -1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'ไม่พบความคิดเห็นนี้' };
}

function toggleLike(body) {
  const postId = String(body.postId || '').trim();
  const email  = String(body.email || '').trim().toLowerCase();
  if (!postId || !email) return { ok: false, error: 'ข้อมูลไม่ครบ' };

  const likeSh = likesSheet_();
  const likeRows = likeSh.getDataRange().getValues();
  let likeRowIndex = -1;
  for (let i = 1; i < likeRows.length; i++) {
    if (String(likeRows[i][0]) === postId && String(likeRows[i][1]).toLowerCase() === email) { likeRowIndex = i + 1; break; }
  }

  const found = findPostRow_(postId);
  if (!found) return { ok: false, error: 'ไม่พบโพสต์นี้' };

  const currentCount = Number(found.row[6]) || 0;
  const postOwnerEmail = String(found.row[2] || '').toLowerCase();
  let liked, newCount;
  if (likeRowIndex > 0) {
    likeSh.deleteRow(likeRowIndex);
    liked = false;
    newCount = Math.max(0, currentCount - 1);
  } else {
    likeSh.appendRow([postId, email]);
    liked = true;
    newCount = currentCount + 1;
    if (postOwnerEmail && postOwnerEmail !== email) {
      notify_(postOwnerEmail, 'like', postId, body.name || email);
    }
  }
  found.sheet.getRange(found.rowIndex, 7).setValue(newCount);

  return { ok: true, liked, likeCount: newCount };
}

function addComment(body) {
  const postId = String(body.postId || '').trim();
  const email  = clean(String(body.email || '').trim().toLowerCase());
  const name   = clean(String(body.name || '').trim());
  const text   = clean(String(body.text || '').trim());
  if (!postId || !email || !name || !text) return { ok: false, error: 'กรอกข้อมูลไม่ครบ' };

  const id = 'c_' + Utilities.getUuid().slice(0, 10);
  const timestamp = new Date();
  commentsSheet_().appendRow([id, postId, timestamp, email, name, text]);

  const found = findPostRow_(postId);
  if (found) {
    bumpCommentCount_(found, 1);
    const postOwnerEmail = String(found.row[2] || '').toLowerCase();
    if (postOwnerEmail && postOwnerEmail !== email) {
      notify_(postOwnerEmail, 'comment', postId, name);
    }
  }

  return { ok: true, comment: { id, timestamp: timestamp.toISOString(), email, name, text } };
}

function listComments(body) {
  const postId = String(body.postId || '').trim();
  const rows = commentsSheet_().getDataRange().getValues();
  const comments = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] || String(r[1]) !== postId) continue;
    comments.push({
      id: String(r[0]),
      timestamp: (r[2] instanceof Date ? r[2] : new Date(r[2])).toISOString(),
      email: String(r[3] || ''),
      name: String(r[4] || ''),
      text: String(r[5] || '')
    });
  }
  comments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return { ok: true, comments };
}

/* ══════════════════════════ แจ้งเตือน (ถูกใจ/คอมเมนต์บนโพสต์ของฉัน) ══════════════════════════
   ⚠ เป็น static site ไม่มี push/real-time จริง ๆ ได้ — เช็กยอดใหม่ตอนโหลดหน้าเว็บเท่านั้น */
function notificationsSheet_() { return sheet_('Notifications', ['id', 'recipientEmail', 'type', 'postId', 'actorName', 'timestamp', 'read']); }

function notify_(recipientEmail, type, postId, actorName) {
  const id = 'n_' + Utilities.getUuid().slice(0, 10);
  notificationsSheet_().appendRow([id, recipientEmail, type, postId, actorName, new Date(), false]);
}

function listNotifications(body) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return { ok: false, error: 'ไม่ได้ระบุอีเมล' };

  const rows = notificationsSheet_().getDataRange().getValues();
  const list = [];
  let unreadCount = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] || String(r[1]).toLowerCase() !== email) continue;
    const isRead = !!r[6];
    if (!isRead) unreadCount++;
    list.push({
      id: String(r[0]),
      type: String(r[2] || ''),
      postId: String(r[3] || ''),
      actorName: String(r[4] || ''),
      timestamp: (r[5] instanceof Date ? r[5] : new Date(r[5])).toISOString(),
      read: isRead
    });
  }
  list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return { ok: true, notifications: list.slice(0, 30), unreadCount };
}

function markNotificationsRead(body) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return { ok: false, error: 'ไม่ได้ระบุอีเมล' };

  const sh = notificationsSheet_();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === email && !rows[i][6]) {
      sh.getRange(i + 1, 7).setValue(true);
    }
  }
  return { ok: true };
}

/* ══════════════════════════ ข้อสอบ: สุ่มจากคลัง ══════════════════════════ */
function readBank_(subject) {
  const sh = ss_().getSheetByName('Q_' + subject);
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    const type = String(r[1] || 'mc').trim();
    let options = [];
    if (type === 'tf') options = ['ถูก', 'ผิด'];
    else if (type === 'mc') options = String(r[3] || '').split('|').map(s => s.trim()).filter(Boolean);
    out.push({
      id: String(r[0]),
      type: type,
      text: String(r[2] || ''),
      options: options,
      answer: String(r[4] || '').trim(),
      score: Number(r[5]) || 1,
      note: String(r[6] || ''),
      strand: String(r[7] || '').trim()
    });
  }
  return out;
}

/**
 * เปิดชีต Blueprint (สร้างใหม่ถ้ายังไม่มี) — ถ้าเจอโครงสร้างเก่าแบบ 4 คอลัมน์
 * (subject|order|strand|count จากเวอร์ชันก่อนที่จะรองรับหลายชุด) จะแปลงเป็น
 * โครงสร้างใหม่ 6 คอลัมน์อัตโนมัติ โดยตั้งเป็นชุด "ค่าเริ่มต้น" และ active ทันที
 */
function blueprintSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName('Blueprint');
  if (!sh) {
    sh = ss.insertSheet('Blueprint');
    sh.appendRow(['subject', 'configName', 'active', 'order', 'strand', 'count']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#26123f').setFontColor('#FFFFFF');
    return sh;
  }
  if (sh.getLastColumn() > 0 && sh.getLastColumn() <= 4) {
    const rows = sh.getDataRange().getValues();
    const migrated = [['subject', 'configName', 'active', 'order', 'strand', 'count']];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[0]) continue;
      migrated.push([r[0], 'ค่าเริ่มต้น', true, r[1], r[2], r[3]]);
    }
    sh.clearContents();
    sh.getRange(1, 1, migrated.length, 6).setValues(migrated);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** ส่วนต่าง ๆ ของ "ชุดที่ active อยู่" ของวิชานั้น (ใช้ตอนสุ่มข้อสอบจริง และแสดงตัวอย่างหน้าเว็บ) เรียงตาม order */
function getBlueprint_(subject) {
  subject = String(subject || '').slice(0, 50);
  const sh = ss_().getSheetByName('Blueprint');
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  if (sh.getLastColumn() <= 4) return []; // ยังไม่แปลงโครงสร้าง (ยังไม่เคยเรียก blueprintSheet_ เลย) — ไม่มีชุด active ให้ใช้
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]) !== subject || !r[2]) continue; // ต้องเป็นชุดที่ active
    out.push({ order: Number(r[3]) || 0, strand: String(r[4] || ''), count: Number(r[5]) || 0 });
  }
  out.sort((a, b) => a.order - b.order);
  return out;
}

/** รายชื่อโครงสร้างชุดข้อสอบทั้งหมดของวิชาหนึ่ง (พร้อมส่วนของแต่ละชุด และชุดไหน active อยู่) */
function adminListBlueprintConfigs(body) {
  if (!requireAdmin_(body)) return { ok: false, error: 'unauthorized' };
  const subject = String(body.subject || '').slice(0, 50);
  const sh = blueprintSheet_();
  const rows = sh.getDataRange().getValues();
  const byName = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]) !== subject) continue;
    const name = String(r[1] || 'ค่าเริ่มต้น');
    if (!byName[name]) byName[name] = { name: name, active: false, sections: [] };
    if (r[2]) byName[name].active = true;
    byName[name].sections.push({ order: Number(r[3]) || 0, strand: String(r[4] || ''), count: Number(r[5]) || 0 });
  }
  const configs = Object.keys(byName).map(k => byName[k]);
  configs.forEach(c => c.sections.sort((a, b) => a.order - b.order));
  configs.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  return { ok: true, configs: configs };
}

/** สร้างชุดใหม่ หรือแก้ไขชุดที่มีชื่อนี้อยู่แล้วของวิชานี้ (แทนที่ทุกส่วนของชุดนั้นทั้งหมด) */
function adminSaveBlueprintConfig(body) {
  if (!requireAdmin_(body)) return { ok: false, error: 'unauthorized' };
  const subject = String(body.subject || '').slice(0, 50);
  const configName = clean(String(body.configName || '').trim()) || 'ค่าเริ่มต้น';
  const sections = Array.isArray(body.sections) ? body.sections : [];
  if (!subject) return { ok: false, error: 'ไม่ได้ระบุวิชา' };
  if (!sections.length) return { ok: false, error: 'ยังไม่ได้กำหนดส่วนใด ๆ ในโครงสร้าง' };

  const sh = blueprintSheet_();
  const rows = sh.getDataRange().getValues();
  const keep = [rows[0]];
  let hadAnyForSubject = false;
  let wasActive = false;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]) === subject) {
      hadAnyForSubject = true;
      if (String(r[1] || 'ค่าเริ่มต้น') === configName) {
        if (r[2]) wasActive = true;
        continue; // แทนที่ทุกแถวของชุดนี้ด้วยข้อมูลใหม่ด้านล่าง
      }
    }
    keep.push(r);
  }
  const active = wasActive || !hadAnyForSubject; // ชุดแรกของวิชาจะ active ให้อัตโนมัติ
  sections.forEach((s, i) => {
    keep.push([subject, configName, active, i, clean(s.strand), Number(s.count) || 0]);
  });

  sh.clearContents();
  sh.getRange(1, 1, keep.length, 6).setValues(keep);
  sh.setFrozenRows(1);

  return { ok: true, active: active };
}

/** ลบโครงสร้างชุดหนึ่งทิ้ง ถ้าชุดที่ลบเป็นชุด active อยู่ จะตั้งชุดแรกที่เหลือของวิชานี้เป็น active แทนอัตโนมัติ */
function adminDeleteBlueprintConfig(body) {
  if (!requireAdmin_(body)) return { ok: false, error: 'unauthorized' };
  const subject = String(body.subject || '').slice(0, 50);
  const configName = String(body.configName || '').trim();
  if (!subject || !configName) return { ok: false, error: 'ข้อมูลไม่ครบ' };

  const sh = blueprintSheet_();
  const rows = sh.getDataRange().getValues();
  const keep = [rows[0]];
  let wasActive = false;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]) === subject && String(r[1] || 'ค่าเริ่มต้น') === configName) {
      if (r[2]) wasActive = true;
      continue;
    }
    keep.push(r);
  }
  if (wasActive) {
    for (let i = 1; i < keep.length; i++) {
      if (String(keep[i][0]) === subject) { keep[i] = keep[i].slice(); keep[i][2] = true; break; }
    }
  }

  sh.clearContents();
  sh.getRange(1, 1, keep.length, 6).setValues(keep);
  sh.setFrozenRows(1);

  return { ok: true };
}

/** ตั้งชุดที่ระบุเป็นชุด active ของวิชานี้ (ปิด active ของชุดอื่นในวิชาเดียวกันทั้งหมด) */
function adminSetActiveBlueprintConfig(body) {
  if (!requireAdmin_(body)) return { ok: false, error: 'unauthorized' };
  const subject = String(body.subject || '').slice(0, 50);
  const configName = String(body.configName || '').trim();
  if (!subject || !configName) return { ok: false, error: 'ข้อมูลไม่ครบ' };

  const sh = blueprintSheet_();
  const rows = sh.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) !== subject) continue;
    const isThis = String(rows[i][1] || 'ค่าเริ่มต้น') === configName;
    if (isThis) found = true;
    rows[i][2] = isThis;
  }
  if (!found) return { ok: false, error: 'ไม่พบโครงสร้างชุดนี้' };
  sh.getRange(1, 1, rows.length, 6).setValues(rows);

  return { ok: true };
}

function serveExam(subject) {
  subject = String(subject || '').slice(0, 50);
  const bank = readBank_(subject);
  if (!bank.length) return { ok: false, error: 'ยังไม่มีคลังข้อสอบวิชานี้ (สร้างชีต Q_' + subject + ' ก่อน)' };

  const blueprint = getBlueprint_(subject);
  const sections = blueprint.length ? blueprint : [{ order: 0, strand: '', count: Math.min(10, bank.length) }];

  const picked = [];
  const warnings = [];
  sections.forEach((sec, i) => {
    const pool = sec.strand ? bank.filter(q => q.strand === sec.strand) : bank.slice();
    shuffle_(pool);
    const take = pool.slice(0, Math.min(sec.count, pool.length));
    if (take.length < sec.count) {
      warnings.push('ส่วนที่ ' + (i + 1) + (sec.strand ? ' (' + sec.strand + ')' : '') +
        ' มีข้อสอบในคลังไม่พอ (ต้องการ ' + sec.count + ' มีจริง ' + take.length + ')');
    }
    take.forEach(q => picked.push(Object.assign({ sectionLabel: 'ส่วนที่ ' + (i + 1) + (sec.strand ? ': ' + sec.strand : '') }, q)));
  });

  if (!picked.length) return { ok: false, error: 'ยังไม่มีข้อสอบในคลังที่ตรงกับโครงสร้างชุดข้อสอบที่ตั้งไว้' };

  const sessionId = Utilities.getUuid();
  const key = {};
  picked.forEach(q => { key[q.id] = { type: q.type, answer: q.answer, score: q.score, note: q.note }; });
  CacheService.getScriptCache().put(sessionId, JSON.stringify({ subject, key }), CACHE_SECONDS);

  const questions = picked.map(q => ({ id: q.id, type: q.type, text: q.text, options: q.options, section: q.sectionLabel }));

  return { ok: true, sessionId, questions, warnings };
}

function submitExam(body) {
  const cached = CacheService.getScriptCache().get(body.sessionId || '');
  if (!cached) return { ok: false, error: 'หมดเวลาเซสชัน กรุณาเริ่มทำแบบทดสอบใหม่' };

  const session = JSON.parse(cached);
  if (session.subject !== body.subject) return { ok: false, error: 'ข้อมูลวิชาไม่ตรงกัน' };

  const key = session.key;
  const ansIn = body.answers || {};
  const id = body.identity || {};
  const meta = body.meta || {};

  let score = 0, total = 0;
  const detail = {};
  Object.keys(key).forEach(qid => {
    const k = key[qid];
    const pt = k.score || 1;
    total += pt;
    const right = isCorrect_(k.type, ansIn[qid], k.answer);
    if (right) score += pt;
    detail[qid] = { correct: right, answer: k.answer, note: k.note || '' };
  });

  const percent = total ? Math.round(score / total * 100) : 0;
  const passed = percent >= 60;

  sheet_('Results', ['timestamp', 'subject', 'email', 'name', 'score', 'total', 'percent', 'passed', 'usedSeconds', 'auto'])
    .appendRow([new Date(), body.subject, clean(id.email), clean(id.name), score, total, percent,
                passed ? 'ผ่าน' : 'ไม่ผ่าน', meta.used || '', meta.auto ? 'ใช่' : '']);

  CacheService.getScriptCache().remove(body.sessionId);

  return { ok: true, score, total, percent, passed, detail };
}

/* ══════════════════════════ แอดมิน: จัดการคลังข้อสอบ ══════════════════════════ */
/**
 * ⚠ ระบบตรวจ ADMIN_PASSWORD ใหม่ทุกคำขอ (ไม่มีการออก session token)
 *   ง่ายและพอเหมาะกับเว็บฝึกทำข้อสอบขนาดเล็ก แต่ไม่ใช่ระบบความปลอดภัยระดับองค์กร
 *   อย่าใช้รหัสผ่านเดียวกับบัญชีอื่นที่สำคัญ และเปลี่ยน ADMIN_PASSWORD ก่อนใช้งานจริงเสมอ
 */
function requireAdmin_(body) {
  return !!(body && body.adminPassword && body.adminPassword === ADMIN_PASSWORD);
}

function adminLogin(body) {
  return requireAdmin_(body) ? { ok: true } : { ok: false, error: 'รหัสผ่านผู้ดูแลไม่ถูกต้อง' };
}

function adminListQuestions(body) {
  if (!requireAdmin_(body)) return { ok: false, error: 'unauthorized' };
  const subject = String(body.subject || '').slice(0, 50);
  return { ok: true, questions: readBank_(subject) };
}

function adminAddQuestion(body) {
  if (!requireAdmin_(body)) return { ok: false, error: 'unauthorized' };

  const subject = String(body.subject || '').slice(0, 50);
  const type    = (body.type === 'tf' || body.type === 'fill') ? body.type : 'mc';
  const text    = clean(body.text);
  const options = type === 'mc' ? (Array.isArray(body.options) ? body.options.map(clean).filter(Boolean) : []) : [];
  const answer  = clean(body.answer);
  const score   = Number(body.score) || 1;
  const note    = clean(body.note);
  const strand  = clean(body.strand);

  if (!subject || !text || !answer) return { ok: false, error: 'กรอกข้อมูลไม่ครบ' };
  if (type === 'mc' && options.length < 2) return { ok: false, error: 'ต้องมีตัวเลือกอย่างน้อย 2 ข้อ' };

  const sh = sheet_('Q_' + subject, ['id', 'type', 'text', 'options', 'answer', 'score', 'note', 'strand']);
  const id = body.id && String(body.id).trim() ? String(body.id).trim() : 'q_' + Utilities.getUuid().slice(0, 8);

  const rows = sh.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) { rowIndex = i + 1; break; }
  }

  const rowData = [id, type, text, options.join('|'), answer, score, note, strand];
  if (rowIndex > 0) sh.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  else sh.appendRow(rowData);

  return { ok: true, id: id };
}

function adminDeleteQuestion(body) {
  if (!requireAdmin_(body)) return { ok: false, error: 'unauthorized' };
  const subject = String(body.subject || '').slice(0, 50);
  const sh = ss_().getSheetByName('Q_' + subject);
  if (!sh) return { ok: true };

  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(body.id)) { sh.deleteRow(i + 1); break; }
  }
  return { ok: true };
}

/* ══════════════════════════ ยูทิลิตี ══════════════════════════ */
function shuffle_(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } }
function norm_(v) { return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' '); }

/** type "fill" เก็บคำตอบที่ยอมรับได้หลายแบบ คั่นด้วย | (เหมือน options) — ตอบถูกถ้าตรงแบบใดแบบหนึ่ง */
function isCorrect_(type, given, answerStored) {
  if (type === 'fill') {
    return String(answerStored || '').split('|').map(norm_).filter(Boolean).indexOf(norm_(given)) !== -1;
  }
  return norm_(given) === norm_(answerStored);
}

/** กัน formula injection ในชีต */
function clean(v) {
  if (v === undefined || v === null) return '';
  let s = String(v).slice(0, 1000);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
