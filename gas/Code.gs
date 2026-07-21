/**
 * หลังบ้านเว็บไซต์ "ข้อสอบ" — Google Apps Script
 *
 * รองรับ: สมัคร/ล็อกอินสมาชิก, สุ่มข้อสอบจากคลังใหญ่ + จับเวลา + ตรวจให้คะแนน,
 *          ฟอร์มติดต่อ (ส่งอีเมล), พื้นที่แสดงความเห็น,
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
 *   Users      : timestamp | username | name | passHash
 *   Contact    : timestamp | name | email | message
 *   Feedback   : timestamp | name | text
 *   Results    : timestamp | subject | username | name | score | total | percent | passed | usedSeconds | auto
 *   Blueprint  : subject | order | strand | count
 *               ── "โครงสร้างชุดข้อสอบ" ของแต่ละวิชา กำหนดว่าส่วนที่เท่าไร สุ่มกี่ข้อจากสาระไหน
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

/* ══════════════════════════ doPost ══════════════════════════ */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return json({ ok: false, error: 'unauthorized' });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      switch (body.action) {
        case 'register':            return json(register(body));
        case 'login':                return json(login(body));
        case 'contact':              return json(contact(body));
        case 'feedback':             return json(feedback(body));
        case 'submitExam':           return json(submitExam(body));
        case 'adminLogin':           return json(adminLogin(body));
        case 'adminListQuestions':   return json(adminListQuestions(body));
        case 'adminAddQuestion':     return json(adminAddQuestion(body));
        case 'adminDeleteQuestion':  return json(adminDeleteQuestion(body));
        case 'adminSaveBlueprint':   return json(adminSaveBlueprint(body));
        default:                     return json({ ok: false, error: 'unknown action' });
      }
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* ══════════════════════════ สมาชิก ══════════════════════════ */
function hashPass_(username, password) {
  const raw = String(username).toLowerCase() + ':' + password + ':' + TOKEN;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(b => (b + 256).toString(16).slice(-2)).join('');
}

function register(body) {
  const username = clean(String(body.username || '').trim().toLowerCase());
  const name     = clean(String(body.name || '').trim());
  const password = String(body.password || '');
  if (!username || !name || password.length < 6) return { ok: false, error: 'ข้อมูลไม่ครบ หรือรหัสผ่านสั้นเกินไป' };

  const sh = sheet_('Users', ['timestamp', 'username', 'name', 'passHash']);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === username) return { ok: false, error: 'มีชื่อผู้ใช้นี้อยู่แล้ว' };
  }
  sh.appendRow([new Date(), username, name, hashPass_(username, password)]);
  return { ok: true, username, name };
}

function login(body) {
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const sh = sheet_('Users', ['timestamp', 'username', 'name', 'passHash']);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === username) {
      if (rows[i][3] === hashPass_(username, password)) {
        return { ok: true, username, name: rows[i][2] };
      }
      return { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
    }
  }
  return { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}

/* ══════════════════════════ ติดต่อ / ความเห็น ══════════════════════════ */
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

function feedback(body) {
  const name = clean(body.name), text = clean(body.text);
  if (!name || !text) return { ok: false, error: 'กรอกข้อมูลไม่ครบ' };
  sheet_('Feedback', ['timestamp', 'name', 'text']).appendRow([new Date(), name, text]);
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

/** โครงสร้างชุดข้อสอบ (Blueprint sheet: subject | order | strand | count) เรียงตาม order */
function getBlueprint_(subject) {
  subject = String(subject || '').slice(0, 50);
  const sh = ss_().getSheetByName('Blueprint');
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]) !== subject) continue;
    out.push({ order: Number(r[1]) || 0, strand: String(r[2] || ''), count: Number(r[3]) || 0 });
  }
  out.sort((a, b) => a.order - b.order);
  return out;
}

function adminSaveBlueprint(body) {
  if (!requireAdmin_(body)) return { ok: false, error: 'unauthorized' };
  const subject = String(body.subject || '').slice(0, 50);
  const sections = Array.isArray(body.sections) ? body.sections : [];
  if (!subject) return { ok: false, error: 'ไม่ได้ระบุวิชา' };

  const sh = sheet_('Blueprint', ['subject', 'order', 'strand', 'count']);
  const rows = sh.getDataRange().getValues();
  const keep = [rows[0]]; // หัวตาราง
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) !== subject) keep.push(rows[i]);
  }
  sections.forEach((s, i) => {
    keep.push([subject, i, clean(s.strand), Number(s.count) || 0]);
  });

  sh.clearContents();
  if (keep.length) sh.getRange(1, 1, keep.length, 4).setValues(keep);
  sh.setFrozenRows(1);

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

  sheet_('Results', ['timestamp', 'subject', 'username', 'name', 'score', 'total', 'percent', 'passed', 'usedSeconds', 'auto'])
    .appendRow([new Date(), body.subject, clean(id.username), clean(id.name), score, total, percent,
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
